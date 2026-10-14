import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import db, { initDb } from './db.js';
import { supabase, isSupabaseConfigured } from './supabase.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-jawir-garage-ecommerce';
const WEBHOOK_SIGNATURE_KEY = process.env.WEBHOOK_SIGNATURE_KEY || 'jawir-secret-signature-2026';

const app = express();
app.use(cors());
app.use(express.json());

// Initialize database tables
initDb();

// =====================================================================
// RATE LIMITER (PRD Section 6.1)
// =====================================================================
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const rateLimiter = (maxRequests = 10, windowMs = 60000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const key = `${ip}:${req.path}`;
    const now = Date.now();
    const entry = rateLimitMap.get(key);

    if (!entry || now > entry.resetTime) {
      rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (entry.count >= maxRequests) {
      return res.status(429).json({
        error: 'Terlalu banyak permintaan. Silakan tunggu 1 menit sebelum mencoba kembali.',
      });
    }

    entry.count += 1;
    next();
  };
};

// =====================================================================
// AUTH MIDDLEWARE
// =====================================================================
const authMiddleware = (req: any, res: any, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Silakan login terlebih dahulu untuk melanjutkan.' });

  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sesi telah kedaluwarsa atau token tidak valid. Silakan login kembali.' });
  }
};

const optionalAuthMiddleware = (req: any, res: any, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      // Ignore token error for guest
    }
  }
  next();
};

const adminMiddleware = (req: any, res: any, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Akses terlarang. Diperlukan role administrator.' });
  }
  next();
};

// =====================================================================
// AUTO-CANCEL EXPIRED ORDERS BACKGROUND WORKER (PRD Section 4.1 & 6.2)
// =====================================================================
function checkAndCancelExpiredOrders() {
  try {
    const expiredOrders = db
      .prepare(`SELECT id, voucher_id FROM orders WHERE status = 'PENDING' AND expired_at < datetime('now')`)
      .all() as any[];

    if (expiredOrders.length > 0) {
      console.log(`[Auto-Cancel] Menemukan ${expiredOrders.length} pesanan kedaluwarsa. Memulihkan stok...`);

      const restoreStockStmt = db.prepare(`UPDATE products SET stock = stock + ? WHERE id = ?`);
      const restoreVoucherStmt = db.prepare(`UPDATE vouchers SET used_count = MAX(0, used_count - 1) WHERE id = ?`);
      const getItemsStmt = db.prepare(`SELECT product_id, quantity FROM order_items WHERE order_id = ?`);
      const cancelOrderStmt = db.prepare(`UPDATE orders SET status = 'CANCELLED' WHERE id = ?`);

      for (const ord of expiredOrders) {
        db.exec('BEGIN TRANSACTION');
        try {
          const items = getItemsStmt.all(ord.id) as any[];
          for (const item of items) {
            if (item.product_id) {
              restoreStockStmt.run(item.quantity, item.product_id);
            }
          }
          if (ord.voucher_id) {
            restoreVoucherStmt.run(ord.voucher_id);
          }
          cancelOrderStmt.run(ord.id);
          db.exec('COMMIT');
          console.log(`[Auto-Cancel] Berhasil membatalkan pesanan ${ord.id} dan mengembalikan stok.`);
        } catch (txErr) {
          db.exec('ROLLBACK');
          console.error(`[Auto-Cancel Error] Gagal membatalkan order ${ord.id}:`, txErr);
        }
      }
    }
  } catch (err) {
    console.error('[Auto-Cancel Worker Error]', err);
  }
}

// Jalankan auto-cancel setiap 30 detik
setInterval(checkAndCancelExpiredOrders, 30000);

// =====================================================================
// PUBLIC CATALOG & STOREFRONT ENDPOINTS
// =====================================================================

// Get all categories
app.get('/api/categories', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories').all();
  res.json(categories);
});

// Get all active vouchers
app.get('/api/vouchers', (req, res) => {
  const vouchers = db
    .prepare('SELECT * FROM vouchers WHERE is_active = 1')
    .all()
    .map((v: any) => ({
      ...v,
      claimed: v.claimed === 1,
    }));
  res.json(vouchers);
});

// Verify Voucher
app.post('/api/voucher/verify', rateLimiter(15, 60000), (req: any, res: any) => {
  const { code, subtotal } = req.body;
  if (!code) return res.status(400).json({ error: 'Kode voucer wajib diisi' });

  const voucher = db.prepare('SELECT * FROM vouchers WHERE code = ? AND is_active = 1').get(code) as any;
  if (!voucher) {
    return res.status(404).json({ error: 'Kode voucer tidak valid atau tidak ditemukan' });
  }

  if (voucher.used_count >= voucher.quota) {
    return res.status(400).json({ error: 'Maaf, kuota pemakaian voucer ini sudah habis' });
  }

  if (subtotal && subtotal < voucher.minSpend) {
    return res.status(400).json({
      error: `Minimal belanja untuk menggunakan voucer ini adalah Rp ${voucher.minSpend.toLocaleString('id-ID')}`,
    });
  }

  let discount = 0;
  if (voucher.discount_type === 'PERCENT') {
    discount = Math.floor(((subtotal || 0) * voucher.discount_value) / 100);
    if (voucher.max_discount_amount && discount > voucher.max_discount_amount) {
      discount = voucher.max_discount_amount;
    }
  } else {
    discount = voucher.discountAmount || voucher.discount_value;
  }

  res.json({
    valid: true,
    voucher: {
      ...voucher,
      claimed: voucher.claimed === 1,
      calculatedDiscount: discount,
    },
  });
});

// Get products (with pagination, filtering & sorting)
app.get('/api/products', (req, res) => {
  const category = req.query.category as string;
  const bikeType = req.query.bike as string;
  const search = (req.query.search as string) || (req.query.q as string);
  const sort = (req.query.sort as string) || 'populer';
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 24;
  const offset = (page - 1) * limit;

  let query = 'SELECT p.* FROM products p';
  const whereClauses: string[] = ['p.is_active = 1'];
  const params: any[] = [];

  if (bikeType && bikeType !== 'all') {
    query += ' JOIN product_bike_compatibility c ON p.id = c.product_id';
    whereClauses.push('c.bike_type = ?');
    params.push(bikeType);
  }

  if (category && category !== 'semua') {
    whereClauses.push('p.category = ?');
    params.push(category);
  }

  if (search && search.trim() !== '') {
    whereClauses.push('(p.name LIKE ? OR p.compatibilityText LIKE ? OR p.description LIKE ?)');
    const searchTerm = `%${search.trim()}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (whereClauses.length > 0) {
    query += ' WHERE ' + whereClauses.join(' AND ');
  }

  // Sorting
  if (sort === 'terbaru') {
    query += ' ORDER BY p.created_at DESC';
  } else if (sort === 'terlaris') {
    query += ' ORDER BY p.soldCount DESC';
  } else if (sort === 'harga-asc') {
    query += ' ORDER BY p.price ASC';
  } else if (sort === 'harga-desc') {
    query += ' ORDER BY p.price DESC';
  } else {
    // Populer
    query += ' ORDER BY p.rating DESC, p.soldCount DESC';
  }

  // Count total for pagination
  const totalItems = db.prepare(query).all(...params).length;

  query += ` LIMIT ${limit} OFFSET ${offset}`;
  const rawProducts = db.prepare(query).all(...params) as any[];

  const getCompat = db.prepare('SELECT bike_type FROM product_bike_compatibility WHERE product_id = ?');

  const products = rawProducts.map((p: any) => ({
    ...p,
    specs: typeof p.specs === 'string' ? JSON.parse(p.specs || '{}') : p.specs,
    isPromo: p.isPromo === 1,
    isPaketUpgrade: p.isPaketUpgrade === 1,
    bikeCompatibility: getCompat.all(p.id).map((c: any) => c.bike_type),
  }));

  res.json(products);
});

// Get single product by slug or id
app.get('/api/products/:slugOrId', (req, res) => {
  const { slugOrId } = req.params;
  const p = db.prepare('SELECT * FROM products WHERE (slug = ? OR id = ?) AND is_active = 1').get(slugOrId, slugOrId) as any;
  if (!p) return res.status(404).json({ error: 'Produk tidak ditemukan' });

  const bikeCompatibility = db
    .prepare('SELECT bike_type FROM product_bike_compatibility WHERE product_id = ?')
    .all(p.id)
    .map((c: any) => c.bike_type);

  res.json({
    ...p,
    specs: typeof p.specs === 'string' ? JSON.parse(p.specs || '{}') : p.specs,
    isPromo: p.isPromo === 1,
    isPaketUpgrade: p.isPaketUpgrade === 1,
    bikeCompatibility,
  });
});

// Get bikes
app.get('/api/bikes', (req, res) => {
  const bikes = db.prepare('SELECT * FROM bikes').all();
  res.json(bikes);
});

// =====================================================================
// SPRINT 2: LOGISTIK & ONGKIR DINAMIS (PRD Section 4.2)
// =====================================================================
const INDONESIA_DESTINATIONS = [
  {
    province: 'DKI Jakarta',
    cities: [
      { name: 'Jakarta Timur', districts: ['Cakung', 'Ciracas', 'Duren Sawit', 'Jatinegara', 'Kramat Jati', 'Matraman', 'Pasar Rebo', 'Pulo Gadung'], baseRate: 9000 },
      { name: 'Jakarta Selatan', districts: ['Cilandak', 'Jagakarsa', 'Kebayoran Baru', 'Kebayoran Lama', 'Mampang Prapatan', 'Pancoran', 'Pasar Minggu', 'Pesanggrahan', 'Setiabudi', 'Tebet'], baseRate: 10000 },
      { name: 'Jakarta Barat', districts: ['Cengkareng', 'Grogol Petamburan', 'Kalideres', 'Kebon Jeruk', 'Kembangan', 'Palmerah', 'Taman Sari', 'Tambora'], baseRate: 10000 },
      { name: 'Jakarta Pusat', districts: ['Cempaka Putih', 'Gambir', 'Johar Baru', 'Kemayoran', 'Menteng', 'Senen', 'Tanah Abang'], baseRate: 10000 },
      { name: 'Jakarta Utara', districts: ['Cilincing', 'Kelapa Gading', 'Koja', 'Pademangan', 'Penjaringan', 'Tanjung Priok'], baseRate: 11000 }
    ]
  },
  {
    province: 'Jawa Barat',
    cities: [
      { name: 'Kota Bekasi', districts: ['Bekasi Barat', 'Bekasi Timur', 'Bekasi Selatan', 'Bekasi Utara', 'Jatiasih', 'Pondok Gede'], baseRate: 10000 },
      { name: 'Kab. Bekasi', districts: ['Cikarang Barat', 'Cikarang Pusat', 'Cikarang Selatan', 'Cikarang Utara', 'Tambun Selatan'], baseRate: 12000 },
      { name: 'Kota Depok', districts: ['Beji', 'Cimanggis', 'Cinere', 'Pancoran Mas', 'Sawangan', 'Sukmajaya'], baseRate: 11000 },
      { name: 'Kota Bogor', districts: ['Bogor Barat', 'Bogor Selatan', 'Bogor Tengah', 'Bogor Timur', 'Bogor Utara'], baseRate: 12000 },
      { name: 'Kota Bandung', districts: ['Andir', 'Antapani', 'Arcamanik', 'Coblong', 'Lengkong', 'Sukajadi'], baseRate: 15000 }
    ]
  },
  {
    province: 'Banten',
    cities: [
      { name: 'Kota Tangerang', districts: ['Batuceper', 'Benda', 'Cibodas', 'Cipondoh', 'Karawaci', 'Periuk', 'Pinang'], baseRate: 11000 },
      { name: 'Kota Tangerang Selatan', districts: ['Ciputat', 'Pamulang', 'Pondok Aren', 'Serpong', 'Setu'], baseRate: 11000 }
    ]
  },
  {
    province: 'Jawa Tengah',
    cities: [
      { name: 'Kota Semarang', districts: ['Banyumanik', 'Candisari', 'Gajahmungkur', 'Pedurungan', 'Semarang Barat'], baseRate: 18000 },
      { name: 'Kota Surakarta (Solo)', districts: ['Banjarsari', 'Jebres', 'Laweyan', 'Pasar Kliwon', 'Serengan'], baseRate: 18000 }
    ]
  },
  {
    province: 'Jawa Timur',
    cities: [
      { name: 'Kota Surabaya', districts: ['Gubeng', 'Rungkut', 'Sawahan', 'Tegalsari', 'Wonokromo'], baseRate: 20000 },
      { name: 'Kota Malang', districts: ['Blimbing', 'Kedungkandang', 'Klojen', 'Lowokwaru', 'Sukun'], baseRate: 21000 }
    ]
  }
];

app.get('/api/shipping/destinations', (req, res) => {
  res.json(INDONESIA_DESTINATIONS);
});

app.post('/api/shipping/calculate', (req: any, res: any) => {
  const { province, city, district, weightGrams } = req.body;
  const weight = Math.max(500, weightGrams || 500);
  const weightKg = Math.ceil(weight / 1000);

  let baseRate = 12000;
  const provObj = INDONESIA_DESTINATIONS.find((p) => p.province === province);
  if (provObj) {
    const cityObj = provObj.cities.find((c) => c.name === city);
    if (cityObj) {
      baseRate = cityObj.baseRate;
    }
  }

  const services = [
    {
      courierName: 'JNE Express',
      courierService: 'REG (Reguler)',
      etd: '2 - 3 Hari',
      cost: baseRate * weightKg,
      description: 'Layanan terpercaya seluruh Indonesia',
    },
    {
      courierName: 'JNE Express',
      courierService: 'YES (Yakin Esok Sampai)',
      etd: '1 Hari (Besok Sampai)',
      cost: (baseRate + 12000) * weightKg,
      description: 'Prioritas cepat khusus part mendesak',
    },
    {
      courierName: 'J&T Express',
      courierService: 'EZ Reguler',
      etd: '2 - 3 Hari',
      cost: (baseRate - 1000) * weightKg,
      description: 'Pick up cepat & tracking akurat 24 jam',
    },
    {
      courierName: 'SiCepat',
      courierService: 'BEST (Besok Sampai Tujuan)',
      etd: '1 - 2 Hari',
      cost: (baseRate + 8000) * weightKg,
      description: 'Estimasi kilat bergaransi tepat waktu',
    },
  ];

  res.json({ weightGrams: weight, weightKg, services });
});

// =====================================================================
// SPRINT 1: PENGAMANAN CHECKOUT & ATOMIC TRANSACTION (PRD Section 4.1 & 6.1)
// =====================================================================
app.post('/api/checkout', rateLimiter(10, 60000), authMiddleware, (req: any, res: any) => {
  const { items, voucherCode, customer, shipping, paymentMethod } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Keranjang belanja tidak boleh kosong' });
  }

  if (!customer?.name || !customer?.phone || !shipping?.address) {
    return res.status(400).json({ error: 'Nama, nomor WhatsApp, dan alamat pengiriman wajib diisi' });
  }

  const userId = req.user ? req.user.id : null;
  if (!userId) {
    return res.status(401).json({ error: 'Silakan login terlebih dahulu untuk melakukan checkout.' });
  }
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const invoiceNumber = `INV-${dateStr}-${randomSuffix}`;
  const orderId = `ord-${Date.now()}-${randomSuffix}`;

  // Expired at 24 hours from now
  const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // ZERO-TRUST BACKEND CALCULATION & ATOMIC TRANSACTION
  const getProduct = db.prepare('SELECT id, name, price, stock, weight_grams FROM products WHERE id = ?');
  const deductStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
  const getVoucher = db.prepare('SELECT * FROM vouchers WHERE code = ? AND is_active = 1');
  const incrementVoucher = db.prepare('UPDATE vouchers SET used_count = used_count + 1 WHERE id = ?');

  const insertOrder = db.prepare(`
    INSERT INTO orders (
      id, invoice_number, user_id, customer_name, customer_email, customer_phone,
      shipping_address, shipping_province, shipping_city, shipping_district,
      courier_name, courier_service, subtotal_amount, shipping_cost,
      voucher_id, voucher_code, discount_amount, grand_total, status,
      payment_method, expired_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, 'PENDING',
      ?, ?
    )
  `);

  const insertItem = db.prepare(`
    INSERT INTO order_items (
      id, order_id, product_id, product_name_snapshot, price_snapshot, quantity, subtotal
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  try {
    db.exec('BEGIN TRANSACTION');

    let calculatedSubtotal = 0;
    const itemsSnapshot: any[] = [];

    // 1. Verify stocks & calculate real subtotal
    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity <= 0) {
        throw new Error('Data item pesanan tidak valid');
      }

      const prod = getProduct.get(item.productId) as any;
      if (!prod) {
        throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan.`);
      }

      if (prod.stock < item.quantity) {
        throw new Error(`Stok produk "${prod.name}" tidak mencukupi (Sisa: ${prod.stock}, Permintaan: ${item.quantity}).`);
      }

      const itemSubtotal = prod.price * item.quantity;
      calculatedSubtotal += itemSubtotal;

      // Deduct stock immediately in transaction
      deductStock.run(item.quantity, prod.id);

      itemsSnapshot.push({
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        productId: prod.id,
        name: prod.name,
        price: prod.price,
        quantity: item.quantity,
        subtotal: itemSubtotal,
      });
    }

    // 2. Validate voucher & calculate discount
    let voucherId: string | null = null;
    let discountAmount = 0;

    if (voucherCode && voucherCode.trim() !== '') {
      const v = getVoucher.get(voucherCode.trim()) as any;
      if (v) {
        if (v.used_count >= v.quota) {
          throw new Error(`Maaf, kuota pemakaian voucer ${voucherCode} sudah habis.`);
        }
        if (calculatedSubtotal < v.minSpend) {
          throw new Error(`Minimal belanja untuk voucer ${voucherCode} adalah Rp ${v.minSpend.toLocaleString('id-ID')}.`);
        }

        if (v.discount_type === 'PERCENT') {
          discountAmount = Math.floor((calculatedSubtotal * v.discount_value) / 100);
          if (v.max_discount_amount && discountAmount > v.max_discount_amount) {
            discountAmount = v.max_discount_amount;
          }
        } else {
          discountAmount = v.discountAmount || v.discount_value;
        }

        if (discountAmount > calculatedSubtotal) {
          discountAmount = calculatedSubtotal;
        }

        voucherId = v.id;
        incrementVoucher.run(v.id);
      }
    }

    // 3. Final Grand Total Calculation
    const shippingCost = parseInt(shipping?.shippingCost) || 0;
    const grandTotal = Math.max(0, calculatedSubtotal - discountAmount + shippingCost);

    // 4. Insert Order
    insertOrder.run(
      orderId,
      invoiceNumber,
      userId,
      customer.name,
      customer.email || null,
      customer.phone,
      shipping.address,
      shipping.province || '',
      shipping.city || '',
      shipping.district || '',
      shipping.courierName || 'JNE Express',
      shipping.courierService || 'REG',
      calculatedSubtotal,
      shippingCost,
      voucherId,
      voucherCode || null,
      discountAmount,
      grandTotal,
      paymentMethod || 'qris',
      expiredAt
    );

    // 5. Insert Item Snapshots
    for (const snap of itemsSnapshot) {
      insertItem.run(snap.id, orderId, snap.productId, snap.name, snap.price, snap.quantity, snap.subtotal);
    }

    db.exec('COMMIT');

    console.log(`[Order Created] Invoice: ${invoiceNumber}, Total: Rp ${grandTotal.toLocaleString('id-ID')}`);

    res.json({
      success: true,
      invoiceNumber,
      orderId,
      subtotal: calculatedSubtotal,
      discount: discountAmount,
      shippingCost,
      grandTotal,
      expiredAt,
    });
  } catch (error: any) {
    db.exec('ROLLBACK');
    console.error('[Checkout Error]', error.message);
    res.status(400).json({ error: error.message });
  }
});

// =====================================================================
// ORDER DETAILS, SIMULATOR & TRACKING (PRD Section 4.1 & 4.2)
// =====================================================================

// Get Order Details by Invoice Number
app.get('/api/orders/:invoiceNumber', (req: any, res: any) => {
  const { invoiceNumber } = req.params;
  const order = db.prepare('SELECT * FROM orders WHERE invoice_number = ?').get(invoiceNumber) as any;

  if (!order) {
    return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
  }

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id) as any[];

  res.json({
    ...order,
    items,
  });
});

// Order Tracking by Invoice + Phone/Email (Public Guest Tracking)
app.get('/api/orders/track/search', (req: any, res: any) => {
  const { invoice, phone } = req.query;

  if (!invoice) {
    return res.status(400).json({ error: 'Nomor invoice wajib diisi' });
  }

  const order = db.prepare('SELECT * FROM orders WHERE invoice_number = ?').get(invoice) as any;
  if (!order) {
    return res.status(404).json({ error: 'Pesanan dengan nomor invoice tersebut tidak ditemukan' });
  }

  if (phone && phone.trim() !== '') {
    const cleanedSearch = phone.replace(/[^0-9]/g, '');
    const cleanedOrder = order.customer_phone.replace(/[^0-9]/g, '');
    if (!cleanedOrder.includes(cleanedSearch) && !order.customer_email?.toLowerCase().includes(phone.toLowerCase())) {
      return res.status(403).json({ error: 'Nomor WhatsApp atau Email tidak cocok dengan data pemesan' });
    }
  }

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id) as any[];

  res.json({
    ...order,
    items,
  });
});

// Simulate Payment Settlement (for Testing / User Action)
app.post('/api/orders/:invoiceNumber/pay', (req: any, res: any) => {
  const { invoiceNumber } = req.params;
  const order = db.prepare('SELECT * FROM orders WHERE invoice_number = ?').get(invoiceNumber) as any;

  if (!order) return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
  if (order.status === 'PAID') return res.json({ success: true, message: 'Pesanan sudah berstatus LUNAS.' });
  if (order.status === 'CANCELLED') {
    return res.status(400).json({ error: 'Pesanan sudah dibatalkan atau kedaluwarsa. Tidak dapat dibayar.' });
  }

  db.prepare(`UPDATE orders SET status = 'PAID', paid_at = datetime('now') WHERE id = ?`).run(order.id);

  console.log(`[Payment Success] Pesanan ${invoiceNumber} telah dibayar.`);
  res.json({ success: true, message: 'Pembayaran berhasil dikonfirmasi!', status: 'PAID' });
});

// Cancel Order & Restore Stock
app.post('/api/orders/:invoiceNumber/cancel', (req: any, res: any) => {
  const { invoiceNumber } = req.params;
  const order = db.prepare('SELECT * FROM orders WHERE invoice_number = ?').get(invoiceNumber) as any;

  if (!order) return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
  if (order.status === 'CANCELLED') return res.json({ success: true, message: 'Pesanan sudah dibatalkan.' });
  if (order.status === 'SHIPPED' || order.status === 'COMPLETED') {
    return res.status(400).json({ error: 'Pesanan sudah dikirim/selesai dan tidak dapat dibatalkan.' });
  }

  db.exec('BEGIN TRANSACTION');
  try {
    const items = db.prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?').all(order.id) as any[];
    const restoreStock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
    for (const item of items) {
      if (item.product_id) restoreStock.run(item.quantity, item.product_id);
    }

    if (order.voucher_id) {
      db.prepare('UPDATE vouchers SET used_count = MAX(0, used_count - 1) WHERE id = ?').run(order.voucher_id);
    }

    db.prepare(`UPDATE orders SET status = 'CANCELLED' WHERE id = ?`).run(order.id);
    db.exec('COMMIT');

    res.json({ success: true, message: 'Pesanan berhasil dibatalkan dan stok dikembalikan.' });
  } catch (err: any) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// =====================================================================
// WEBHOOK PAYMENT GATEWAY (Midtrans / Xendit Format) (PRD Section 4.1)
// =====================================================================
app.post('/api/webhooks/payment', (req: any, res: any) => {
  const signature = req.headers['x-callback-token'] || req.headers['signature-key'];
  const { order_id, transaction_status, gross_amount, status_code } = req.body;

  console.log('[Webhook Received]', req.body);

  // Validate signature if provided
  if (signature && signature !== WEBHOOK_SIGNATURE_KEY) {
    return res.status(403).json({ error: 'Signature key tidak valid' });
  }

  const invoiceNumber = order_id || req.body.invoiceNumber;
  if (!invoiceNumber) {
    return res.status(400).json({ error: 'order_id / invoiceNumber wajib disertakan' });
  }

  const order = db.prepare('SELECT * FROM orders WHERE invoice_number = ?').get(invoiceNumber) as any;
  if (!order) {
    return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
  }

  // Idempotency check: jika status sudah sama, jangan proses ganda
  if (transaction_status === 'settlement' || transaction_status === 'capture' || transaction_status === 'PAID') {
    if (order.status === 'PAID') {
      return res.json({ status: 'ok', message: 'Order sudah berstatus PAID (Idempotent)' });
    }
    db.prepare(`UPDATE orders SET status = 'PAID', paid_at = datetime('now') WHERE id = ?`).run(order.id);
    return res.json({ status: 'ok', message: 'Status order berhasil diperbarui menjadi PAID' });
  }

  if (transaction_status === 'expire' || transaction_status === 'cancel' || transaction_status === 'CANCELLED') {
    if (order.status === 'CANCELLED') {
      return res.json({ status: 'ok', message: 'Order sudah berstatus CANCELLED (Idempotent)' });
    }

    db.exec('BEGIN TRANSACTION');
    try {
      const items = db.prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?').all(order.id) as any[];
      const restoreStock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
      for (const item of items) {
        if (item.product_id) restoreStock.run(item.quantity, item.product_id);
      }
      if (order.voucher_id) {
        db.prepare('UPDATE vouchers SET used_count = MAX(0, used_count - 1) WHERE id = ?').run(order.voucher_id);
      }
      db.prepare(`UPDATE orders SET status = 'CANCELLED' WHERE id = ?`).run(order.id);
      db.exec('COMMIT');
      return res.json({ status: 'ok', message: 'Order dibatalkan dan stok dikembalikan' });
    } catch (e: any) {
      db.exec('ROLLBACK');
      return res.status(500).json({ error: e.message });
    }
  }

  res.json({ status: 'ignored', message: 'Status tidak memerlukan tindakan' });
});

// =====================================================================
// AUTH ENDPOINTS
// =====================================================================
app.post('/api/auth/login', (req: any, res: any) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Username atau password salah' });
  }

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

app.post('/api/auth/register', (req: any, res: any) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username dan password wajib diisi' });

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) return res.status(400).json({ error: 'Username sudah digunakan' });

  const hash = bcrypt.hashSync(password, 10);
  const id = 'u-' + Date.now();

  db.prepare('INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)').run(id, username, hash, 'user');
  const token = jwt.sign({ id, username, role: 'user' }, JWT_SECRET, { expiresIn: '24h' });

  res.json({ token, user: { id, username, role: 'user' } });
});

app.get('/api/auth/me', authMiddleware, (req: any, res: any) => {
  res.json({ user: req.user });
});

// =====================================================================
// SPRINT 3: ADMIN DASHBOARD (CMS & OMS) (PRD Section 4.3)
// =====================================================================

// Admin Analytics Summary
app.get('/api/admin/analytics', authMiddleware, adminMiddleware, (req: any, res: any) => {
  const revenueRow = db.prepare(`SELECT SUM(grand_total) as total FROM orders WHERE status IN ('PAID', 'SHIPPED', 'COMPLETED')`).get() as any;
  const totalRevenue = revenueRow?.total || 0;

  const needShippingRow = db.prepare(`SELECT COUNT(*) as count FROM orders WHERE status = 'PAID'`).get() as any;
  const needShipping = needShippingRow?.count || 0;

  const lowStockRows = db.prepare(`SELECT * FROM products WHERE stock < 5 AND is_active = 1`).all() as any[];
  const totalOrdersRow = db.prepare(`SELECT COUNT(*) as count FROM orders`).get() as any;

  res.json({
    totalRevenue,
    needShipping,
    lowStockCount: lowStockRows.length,
    lowStockItems: lowStockRows,
    totalOrders: totalOrdersRow?.count || 0,
  });
});

// Admin Orders (OMS) with Filter & Search
app.get('/api/admin/orders', authMiddleware, adminMiddleware, (req: any, res: any) => {
  const status = req.query.status as string;
  const search = req.query.search as string;

  let query = 'SELECT * FROM orders';
  const whereClauses: string[] = [];
  const params: any[] = [];

  if (status && status !== 'ALL') {
    whereClauses.push('status = ?');
    params.push(status);
  }

  if (search && search.trim() !== '') {
    whereClauses.push('(invoice_number LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)');
    const q = `%${search.trim()}%`;
    params.push(q, q, q);
  }

  if (whereClauses.length > 0) {
    query += ' WHERE ' + whereClauses.join(' AND ');
  }

  query += ' ORDER BY created_at DESC';
  const orders = db.prepare(query).all(...params) as any[];

  const getItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
  const enriched = orders.map((o) => ({
    ...o,
    items: getItems.all(o.id),
  }));

  res.json(enriched);
});

// Admin Update Order Status & Input Tracking Number
app.patch('/api/admin/orders/:id/status', authMiddleware, adminMiddleware, (req: any, res: any) => {
  const { id } = req.params;
  const { status, trackingNumber } = req.body;

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any;
  if (!order) return res.status(404).json({ error: 'Pesanan tidak ditemukan' });

  if (status === 'SHIPPED') {
    if (!trackingNumber || trackingNumber.trim() === '') {
      return res.status(400).json({ error: 'Nomor resi wajib diisi saat mengubah status menjadi Dikirim' });
    }
    db.prepare('UPDATE orders SET status = ?, tracking_number = ? WHERE id = ?').run('SHIPPED', trackingNumber.trim(), id);
  } else if (status === 'COMPLETED') {
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('COMPLETED', id);
  } else if (status === 'CANCELLED') {
    // Kembalikan stok jika dibatalkan oleh admin
    db.exec('BEGIN TRANSACTION');
    try {
      const items = db.prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?').all(id) as any[];
      const restoreStock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
      for (const item of items) {
        if (item.product_id) restoreStock.run(item.quantity, item.product_id);
      }
      if (order.voucher_id) {
        db.prepare('UPDATE vouchers SET used_count = MAX(0, used_count - 1) WHERE id = ?').run(order.voucher_id);
      }
      db.prepare(`UPDATE orders SET status = 'CANCELLED' WHERE id = ?`).run(id);
      db.exec('COMMIT');
    } catch (e: any) {
      db.exec('ROLLBACK');
      return res.status(500).json({ error: e.message });
    }
  } else {
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
  }

  res.json({ success: true, message: `Status pesanan berhasil diubah menjadi ${status}` });
});

// Admin Products (CRUD)
app.get('/api/admin/products', authMiddleware, adminMiddleware, (req: any, res: any) => {
  const products = db.prepare('SELECT * FROM products ORDER BY COALESCE(created_at, rowid) DESC').all() as any[];
  const getCompat = db.prepare('SELECT bike_type FROM product_bike_compatibility WHERE product_id = ?');

  res.json(
    products.map((p) => ({
      ...p,
      specs: typeof p.specs === 'string' ? JSON.parse(p.specs || '{}') : p.specs,
      isPromo: p.isPromo === 1,
      isPaketUpgrade: p.isPaketUpgrade === 1,
      isActive: p.is_active === 1,
      bikeCompatibility: getCompat.all(p.id).map((c: any) => c.bike_type),
    }))
  );
});

app.post('/api/admin/products', authMiddleware, adminMiddleware, (req: any, res: any) => {
  const p = req.body;
  const id = p.id || 'prod-' + Date.now();
  const slug = (p.name || 'product')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') + '-' + Math.random().toString(36).substring(2, 6);

  try {
    db.prepare(`
      INSERT INTO products (
        id, name, slug, category, compatibilityText, fitmentTag, price, originalPrice,
        discountPercent, promoTag, rating, soldCount, image, description, specs,
        isPromo, isPaketUpgrade, stock, weight_grams, originCity, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      p.name,
      slug,
      p.category || 'cvt',
      p.compatibilityText || 'Universal',
      p.fitmentTag || 'Plug & Play (PnP)',
      p.price || 0,
      p.originalPrice || null,
      p.discountPercent || 0,
      p.promoTag || null,
      p.rating || 5.0,
      p.soldCount || 0,
      p.image || '/images/default.jpg',
      p.description || '',
      JSON.stringify(p.specs || {}),
      p.isPromo ? 1 : 0,
      p.isPaketUpgrade ? 1 : 0,
      p.stock || 0,
      p.weight_grams || 500,
      p.originCity || 'Jakarta Timur',
      p.isActive !== false ? 1 : 0
    );

    if (p.bikeCompatibility && Array.isArray(p.bikeCompatibility)) {
      const insertCompat = db.prepare('INSERT OR IGNORE INTO product_bike_compatibility (product_id, bike_type) VALUES (?, ?)');
      for (const b of p.bikeCompatibility) {
        insertCompat.run(id, b);
      }
    }

    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/products/:id', authMiddleware, adminMiddleware, (req: any, res: any) => {
  const { id } = req.params;
  const p = req.body;

  try {
    db.prepare(`
      UPDATE products SET
        name = ?, category = ?, compatibilityText = ?, fitmentTag = ?,
        price = ?, originalPrice = ?, discountPercent = ?, promoTag = ?,
        image = ?, description = ?, specs = ?, isPromo = ?, isPaketUpgrade = ?,
        stock = ?, weight_grams = ?, is_active = ?
      WHERE id = ?
    `).run(
      p.name,
      p.category,
      p.compatibilityText,
      p.fitmentTag,
      p.price,
      p.originalPrice || null,
      p.discountPercent || null,
      p.promoTag || null,
      p.image,
      p.description,
      JSON.stringify(p.specs || {}),
      p.isPromo ? 1 : 0,
      p.isPaketUpgrade ? 1 : 0,
      p.stock,
      p.weight_grams || 500,
      p.isActive !== false ? 1 : 0,
      id
    );

    if (p.bikeCompatibility && Array.isArray(p.bikeCompatibility)) {
      db.prepare('DELETE FROM product_bike_compatibility WHERE product_id = ?').run(id);
      const insertCompat = db.prepare('INSERT INTO product_bike_compatibility (product_id, bike_type) VALUES (?, ?)');
      for (const b of p.bikeCompatibility) {
        insertCompat.run(id, b);
      }
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/products/:id', authMiddleware, adminMiddleware, (req: any, res: any) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/products/:id/toggle', authMiddleware, adminMiddleware, (req: any, res: any) => {
  const { id } = req.params;
  const prod = db.prepare('SELECT is_active FROM products WHERE id = ?').get(id) as any;
  if (!prod) return res.status(404).json({ error: 'Produk tidak ditemukan' });

  const newStatus = prod.is_active === 1 ? 0 : 1;
  db.prepare('UPDATE products SET is_active = ? WHERE id = ?').run(newStatus, id);
  res.json({ success: true, is_active: newStatus === 1 });
});

// Admin Vouchers (CRUD)
app.get('/api/admin/vouchers', authMiddleware, adminMiddleware, (req: any, res: any) => {
  const vouchers = db.prepare('SELECT * FROM vouchers ORDER BY id ASC').all();
  res.json(vouchers);
});

app.post('/api/admin/vouchers', authMiddleware, adminMiddleware, (req: any, res: any) => {
  const v = req.body;
  const id = 'vouch-' + Date.now();

  try {
    db.prepare(`
      INSERT INTO vouchers (
        id, code, title, subtitle, discount_type, discount_value, minSpend,
        max_discount_amount, discountAmount, quota, used_count, expiryText, badge, claimed, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 0, 1)
    `).run(
      id,
      v.code.toUpperCase().trim(),
      v.title,
      v.subtitle || '',
      v.discount_type || 'FIXED',
      v.discount_value || 0,
      v.minSpend || 0,
      v.max_discount_amount || null,
      v.discount_type === 'FIXED' ? v.discount_value : 0,
      v.quota || 100,
      v.expiryText || 'Berlaku terbatas',
      v.badge || 'Promo Baru'
    );
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/vouchers/:id', authMiddleware, adminMiddleware, (req: any, res: any) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM vouchers WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/vouchers/:id/toggle', authMiddleware, adminMiddleware, (req: any, res: any) => {
  const { id } = req.params;
  const v = db.prepare('SELECT is_active FROM vouchers WHERE id = ?').get(id) as any;
  if (!v) return res.status(404).json({ error: 'Voucher tidak ditemukan' });

  const newStatus = v.is_active === 1 ? 0 : 1;
  db.prepare('UPDATE vouchers SET is_active = ? WHERE id = ?').run(newStatus, id);
  res.json({ success: true, is_active: newStatus === 1 });
});

// START SERVER
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[Express] Server e-commerce Jawir Garage berjalan di http://localhost:${PORT}`);
});
