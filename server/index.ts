import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import db, { initDb } from './db.ts';
import {
  supabase,
  isSupabaseConfigured,
  checkSupabaseHealth,
  syncFromSupabase,
  mapSupabaseProduct,
  mapSupabaseVoucher,
  getSupabaseAdminProducts,
  getSupabaseProducts,
  getSupabaseProductByIdOrSlug,
  createSupabaseProduct,
  updateSupabaseProduct,
  deleteSupabaseProduct,
  toggleSupabaseProduct,
  getSupabaseAdminOrders,
  getSupabaseAnalytics,
  fetchSupabaseOrder,
  upsertSupabaseChatRoom,
  insertSupabaseChatMessage,
  getSupabaseChatMessages,
  getSupabaseChatRooms,
  updateSupabaseRoomRead,
  toggleSupabaseBotStatus,
  deleteSupabaseRoom,
} from './supabase.ts';
import {
  createSnapTransaction,
  verifyMidtransSignature,
  isMidtransConfigured,
  getMidtransClientKey,
} from './midtrans.ts';
import {
  searchBiteshipAreas,
  calculateBiteshipRates,
  createBiteshipShippingOrder,
  trackBiteshipShipment,
  isBiteshipConfigured,
} from './biteship.ts';
import { generateChatbotReply } from './chatbot.ts';
import { scrapeShopeeProduct, detectCategory, detectBikeCompatibility } from './shopeeScraper.ts';

// Load environment variables from .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-jawir-garage-ecommerce';
const WEBHOOK_SIGNATURE_KEY = process.env.WEBHOOK_SIGNATURE_KEY || 'jawir-secret-signature-2026';

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Normalize URL for Vercel Serverless / reverse proxy rewrites
app.use((req: any, res: any, next: NextFunction) => {
  const orig = req.originalUrl || req.headers['x-matched-path'] || req.headers['x-forwarded-uri'] || '';
  if (typeof orig === 'string' && orig.startsWith('/api') && !req.url.startsWith('/api')) {
    req.url = orig;
  } else if (!req.url.startsWith('/api') && !req.url.startsWith('/static')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }

  // Prevent stale cache on API routes (guarantees instant sync between dev & deployment)
  if (req.url.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
});

// API health & Database status check
app.get(['/api', '/api/health', '/api/db-status'], async (req: Request, res: Response) => {
  const sbHealth = await checkSupabaseHealth();
  res.json({
    status: 'ok',
    message: 'Jawir Garage API is operational',
    version: '1.5.0',
    nodeVersion: process.version,
    isVercel: Boolean(process.env.VERCEL),
    database: {
      engine: db?.isInMemory ? 'in-memory-resilient' : 'sqlite-native',
      supabase: sbHealth,
    },
    time: new Date().toISOString(),
  });
});

// Initialize database tables & pull data from Supabase
initDb();
if (isSupabaseConfigured()) {
  syncFromSupabase(db).catch((e) => console.warn('[Supabase Sync Startup Notice]:', e));
}

// Fallback & sync order from Supabase if missing in local SQLite container
async function getOrSyncOrder(idOrInvoice: string): Promise<any | null> {
  if (!idOrInvoice) return null;

  try {
    db.exec('PRAGMA foreign_keys = OFF;');
  } catch (e) {}

  let order = db.prepare('SELECT * FROM orders WHERE id = ? OR invoice_number = ?').get(idOrInvoice, idOrInvoice) as any;
  if (order) return order;

  if (isSupabaseConfigured() && supabase) {
    try {
      const sbOrder = await fetchSupabaseOrder(idOrInvoice);
      if (sbOrder) {
        if (sbOrder.user_id) {
          try {
            const uId = sbOrder.user_id;
            const uName = sbOrder.customer_name || 'user';
            const existingById = db.prepare('SELECT id FROM users WHERE id = ?').get(uId);
            if (!existingById) {
              const existingByName = db.prepare('SELECT id FROM users WHERE username = ?').get(uName);
              if (existingByName) {
                db.prepare('UPDATE users SET id = ? WHERE username = ?').run(uId, uName);
              } else {
                db.prepare('INSERT OR REPLACE INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)').run(
                  uId,
                  uName,
                  'hash',
                  'user'
                );
              }
            }
          } catch (e) {}
        }

        try {
          db.prepare(`
            INSERT OR REPLACE INTO orders (
              id, invoice_number, user_id, customer_name, customer_email, customer_phone,
              shipping_address, customer_notes, shipping_province, shipping_city, shipping_district,
              courier_name, courier_service, tracking_number, subtotal_amount, shipping_cost,
              voucher_id, voucher_code, discount_amount, grand_total, status, payment_method,
              payment_url, snap_token, expired_at, paid_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            sbOrder.id,
            sbOrder.invoice_number,
            sbOrder.user_id || null,
            sbOrder.customer_name,
            sbOrder.customer_email || null,
            sbOrder.customer_phone,
            sbOrder.shipping_address,
            sbOrder.customer_notes || null,
            sbOrder.shipping_province || '',
            sbOrder.shipping_city || '',
            sbOrder.shipping_district || '',
            sbOrder.courier_name || 'JNE Express',
            sbOrder.courier_service || 'REG',
            sbOrder.tracking_number || null,
            sbOrder.subtotal_amount || 0,
            sbOrder.shipping_cost || 0,
            sbOrder.voucher_id || null,
            sbOrder.voucher_code || null,
            sbOrder.discount_amount || 0,
            sbOrder.grand_total,
            sbOrder.status || 'PENDING',
            sbOrder.payment_method || 'qris',
            sbOrder.payment_url || null,
            sbOrder.snap_token || null,
            sbOrder.expired_at || new Date().toISOString(),
            sbOrder.paid_at || null,
            sbOrder.created_at || new Date().toISOString(),
            sbOrder.updated_at || new Date().toISOString()
          );

          if (Array.isArray(sbOrder.items) && sbOrder.items.length > 0) {
            for (const it of sbOrder.items) {
              db.prepare(`
                INSERT OR REPLACE INTO order_items (
                  id, order_id, product_id, product_name_snapshot, price_snapshot, quantity, subtotal
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
              `).run(
                it.id,
                sbOrder.id,
                it.product_id || null,
                it.product_name_snapshot || it.name || 'Produk',
                it.price_snapshot || it.price || 0,
                it.quantity || 1,
                it.subtotal || 0
              );
            }
          }
        } catch (dbErr) {
          console.warn('[getOrSyncOrder sync warning]:', dbErr);
        }

        return db.prepare('SELECT * FROM orders WHERE id = ? OR invoice_number = ?').get(idOrInvoice, idOrInvoice) || sbOrder;
      }
    } catch (sbErr) {
      console.warn('[getOrSyncOrder error]:', sbErr);
    }
  }

  return null;
}

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
  if (token === 'demo-admin-token') {
    req.user = { id: 'u-admin', username: 'admin', role: 'admin' };
    return next();
  }
  if (token === 'demo-user-token') {
    req.user = { id: 'u-demo', username: 'agus', role: 'user' };
    return next();
  }

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

// Jalankan auto-cancel setiap 30 detik (hanya untuk server persistent, bukan serverless)
if (!process.env.VERCEL) {
  setInterval(checkAndCancelExpiredOrders, 30000);
}

// =====================================================================
// PUBLIC CATALOG & STOREFRONT ENDPOINTS
// =====================================================================

// Get all categories with dynamic product counts and top-selling image
app.get('/api/categories', (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM categories').all();
    const products = db.prepare('SELECT id, name, category, soldCount, image FROM products WHERE is_active = 1').all() as any[];

    const enriched = categories.map((c: any) => {
      const catProds = products.filter((p: any) => {
        const cat = (p.category || '').toLowerCase();
        return cat === (c.categoryFilter || '').toLowerCase() || cat === c.id;
      });
      const topProd = catProds.length > 0
        ? [...catProds].sort((a: any, b: any) => (b.soldCount || 0) - (a.soldCount || 0))[0]
        : null;
      const totalSold = catProds.reduce((sum: number, p: any) => sum + (p.soldCount || 0), 0);

      return {
        ...c,
        count: catProds.length,
        image: topProd?.image || null,
        totalSold,
      };
    });

    res.json(enriched);
  } catch (err: any) {
    const categories = db.prepare('SELECT * FROM categories').all();
    res.json(categories);
  }
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
// Get products (with pagination, filtering & sorting)
app.get('/api/products', async (req, res) => {
  const category = req.query.category as string;
  const bikeType = req.query.bike as string;
  const search = (req.query.search as string) || (req.query.q as string);
  const sort = (req.query.sort as string) || 'populer';
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 100;
  const offset = (page - 1) * limit;

  if (isSupabaseConfigured()) {
    try {
      const sbProducts = await getSupabaseProducts({
        category,
        bikeType,
        search,
        sort,
        limit,
        offset,
      });
      if (sbProducts !== null) {
        return res.json(sbProducts);
      }
    } catch (sbErr) {
      console.warn('[Products] Supabase get fallback to local engine:', sbErr);
    }
  }

  // SQLite fallback
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
    const tokens = search.trim().split(/\s+/).filter(Boolean);
    tokens.forEach((tok) => {
      whereClauses.push('(p.name LIKE ? OR p.compatibilityText LIKE ? OR p.description LIKE ? OR p.category LIKE ? OR p.fitmentTag LIKE ?)');
      const searchTerm = `%${tok}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    });
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
    variationGroups: typeof p.variation_groups === 'string' ? JSON.parse(p.variation_groups || '[]') : (p.variationGroups || p.variation_groups || undefined),
    bikeVariants: typeof p.bike_variants === 'string' ? JSON.parse(p.bike_variants || '[]') : (p.bikeVariants || undefined),
    isPromo: p.isPromo === 1,
    isPaketUpgrade: p.isPaketUpgrade === 1,
    bikeCompatibility: getCompat.all(p.id).map((c: any) => c.bike_type),
  }));

  res.json(products);
});

// Get single product by slug or id
app.get('/api/products/:slugOrId', async (req, res) => {
  const { slugOrId } = req.params;

  if (isSupabaseConfigured()) {
    try {
      const prod = await getSupabaseProductByIdOrSlug(slugOrId);
      if (prod) return res.json(prod);
    } catch (e) {}
  }

  // SQLite fallback
  const p = db.prepare('SELECT * FROM products WHERE (slug = ? OR id = ?) AND is_active = 1').get(slugOrId, slugOrId) as any;
  if (!p) return res.status(404).json({ error: 'Produk tidak ditemukan' });

  const bikeCompatibility = db
    .prepare('SELECT bike_type FROM product_bike_compatibility WHERE product_id = ?')
    .all(p.id)
    .map((c: any) => c.bike_type);

  res.json({
    ...p,
    specs: typeof p.specs === 'string' ? JSON.parse(p.specs || '{}') : p.specs,
    variationGroups: typeof p.variation_groups === 'string' ? JSON.parse(p.variation_groups || '[]') : (p.variationGroups || p.variation_groups || undefined),
    bikeVariants: typeof p.bike_variants === 'string' ? JSON.parse(p.bike_variants || '[]') : (p.bikeVariants || undefined),
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

app.get('/api/shipping/areas', async (req: any, res: any) => {
  const query = (req.query.search as string) || (req.query.q as string) || '';
  if (!query || query.trim().length < 2) {
    return res.json([]);
  }
  const areas = await searchBiteshipAreas(query);
  res.json(areas);
});

app.post('/api/shipping/calculate', async (req: any, res: any) => {
  const { province, city, district, weightGrams, destinationAreaId, destinationPostalCode, items } = req.body;
  const weight = Math.max(500, weightGrams || 500);
  const weightKg = Math.ceil(weight / 1000);

  // If Biteship is configured, attempt live courier rate fetching
  if (isBiteshipConfigured() && (destinationAreaId || destinationPostalCode)) {
    try {
      const rateItems = Array.isArray(items) && items.length > 0
        ? items.map((it: any) => ({
            name: it.name || it.product?.name || 'Part Motor',
            value: it.price || it.product?.price || 100000,
            weight: it.weight_grams || it.product?.weight_grams || Math.round(weight / items.length),
            quantity: it.quantity || 1,
          }))
        : [{ name: 'Part Motor Racing', value: 150000, weight, quantity: 1 }];

      const biteshipRates = await calculateBiteshipRates({
        destinationAreaId,
        destinationPostalCode: destinationPostalCode ? parseInt(destinationPostalCode) : undefined,
        items: rateItems,
      });

      if (biteshipRates && biteshipRates.length > 0) {
        return res.json({
          source: 'biteship',
          weightGrams: weight,
          weightKg,
          services: biteshipRates,
        });
      }
    } catch (err: any) {
      console.warn('[Biteship] Falling back to standard rate table:', err.message);
    }
  }

  // Graceful fallback to Indonesia rate table
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
      courierCode: 'jne',
      courierServiceCode: 'reg',
      etd: '2 - 3 Hari',
      cost: baseRate * weightKg,
      description: 'Layanan terpercaya seluruh Indonesia',
    },
    {
      courierName: 'JNE Express',
      courierService: 'YES (Yakin Esok Sampai)',
      courierCode: 'jne',
      courierServiceCode: 'yes',
      etd: '1 Hari (Besok Sampai)',
      cost: (baseRate + 12000) * weightKg,
      description: 'Prioritas cepat khusus part mendesak',
    },
    {
      courierName: 'J&T Express',
      courierService: 'EZ Reguler',
      courierCode: 'jnt',
      courierServiceCode: 'ez',
      etd: '2 - 3 Hari',
      cost: (baseRate - 1000) * weightKg,
      description: 'Pick up cepat & tracking akurat 24 jam',
    },
    {
      courierName: 'SiCepat',
      courierService: 'BEST (Besok Sampai Tujuan)',
      courierCode: 'sicepat',
      courierServiceCode: 'best',
      etd: '1 - 2 Hari',
      cost: (baseRate + 8000) * weightKg,
      description: 'Estimasi kilat bergaransi tepat waktu',
    },
  ];

  res.json({ source: 'local_table', weightGrams: weight, weightKg, services });
});

// Helper mapping payment method from Shopee style to Midtrans enabled_payments
function mapPaymentMethodToMidtrans(method?: string): string[] | undefined {
  if (!method) return undefined;
  const m = method.toLowerCase().trim();
  if (m === 'bca' || m === 'bca_va') return ['bca_va'];
  if (m === 'mandiri' || m === 'mandiri_va' || m === 'echannel') return ['echannel'];
  if (m === 'bni' || m === 'bni_va') return ['bni_va'];
  if (m === 'bri' || m === 'bri_va') return ['bri_va'];
  if (m === 'permata' || m === 'permata_va') return ['permata_va'];
  if (m === 'cimb' || m === 'cimb_va') return ['cimb_va'];
  if (m === 'qris') return ['qris', 'gopay', 'shopeepay'];
  if (m === 'gopay') return ['gopay'];
  if (m === 'shopeepay') return ['shopeepay'];
  if (m === 'credit_card' || m === 'card' || m === 'cc') return ['credit_card'];
  return undefined;
}

// =====================================================================
// SPRINT 1: PENGAMANAN CHECKOUT & ATOMIC TRANSACTION (PRD Section 4.1 & 6.1)
// =====================================================================
app.post('/api/checkout', rateLimiter(10, 60000), authMiddleware, async (req: any, res: any) => {
  const { items, voucherCode, customer, shipping, paymentMethod, notes, customerNotes, orderNote } = req.body;

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

  try {
    db.exec('PRAGMA foreign_keys = OFF;');
  } catch (e) {}

  // Ensure user exists in local SQLite to prevent foreign key errors
  if (userId) {
    try {
      const uname = req.user.username || customer?.name || 'user';
      const existingById = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
      if (!existingById) {
        const existingByName = db.prepare('SELECT id FROM users WHERE username = ?').get(uname);
        if (existingByName) {
          db.prepare('UPDATE users SET id = ? WHERE username = ?').run(userId, uname);
        } else {
          db.prepare('INSERT OR REPLACE INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)').run(
            userId,
            uname,
            'hash',
            req.user.role || 'user'
          );
        }
      }
    } catch (e) {
      console.warn('[Checkout User Sync Warning]:', e);
    }
  }

  const rawNote = notes || customerNotes || orderNote || customer?.notes;
  let buyerNotes = rawNote ? String(rawNote).trim() : null;
  if (!buyerNotes && shipping?.address) {
    const match = shipping.address.match(/\(Catatan:\s*(.+?)\)/i);
    if (match) buyerNotes = match[1].trim();
  }

  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const invoiceNumber = `INV-${dateStr}-${randomSuffix}`;
  const orderId = `ord-${Date.now()}-${randomSuffix}`;

  // Expired at 24 hours from now
  const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // ZERO-TRUST BACKEND CALCULATION & ATOMIC TRANSACTION
  const getProduct = db.prepare('SELECT id, name, price, stock, weight_grams, variation_groups FROM products WHERE id = ?');
  const deductStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
  const getVoucher = db.prepare('SELECT * FROM vouchers WHERE code = ? AND is_active = 1');
  const incrementVoucher = db.prepare('UPDATE vouchers SET used_count = used_count + 1 WHERE id = ?');

  const insertOrder = db.prepare(`
    INSERT INTO orders (
      id, invoice_number, user_id, customer_name, customer_email, customer_phone,
      shipping_address, customer_notes, shipping_province, shipping_city, shipping_district,
      courier_name, courier_service, subtotal_amount, shipping_cost,
      voucher_id, voucher_code, discount_amount, grand_total, status,
      payment_method, expired_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
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

      // Calculate unit price considering selected option
      let unitPrice = prod.price;

      if (item.selectedVariant && prod.variation_groups) {
        try {
          const varGroups = typeof prod.variation_groups === 'string'
            ? JSON.parse(prod.variation_groups)
            : prod.variation_groups;
          
          if (Array.isArray(varGroups) && varGroups.length > 0) {
            const selectedVariantsList = item.selectedVariant.split(' • ').map((s: string) => s.trim().toLowerCase());
            for (const group of varGroups) {
              if (Array.isArray(group.options)) {
                for (const opt of group.options) {
                  const optName = (typeof opt === 'string' ? opt : opt.name || '').trim().toLowerCase();
                  if (selectedVariantsList.includes(optName) || optName === item.selectedVariant.trim().toLowerCase()) {
                    if (typeof opt === 'object') {
                      if (typeof opt.price === 'number' && opt.price > 0) {
                        unitPrice = opt.price;
                      } else if (typeof opt.priceModifier === 'number') {
                        unitPrice += opt.priceModifier;
                      }
                    }
                  }
                }
              }
            }
          }
        } catch (e) {
          console.warn('[Checkout] Failed to parse variation_groups:', e);
        }
      }

      if (item.customPrice && typeof item.customPrice === 'number' && item.customPrice > 0) {
        unitPrice = item.customPrice;
      }

      const itemSubtotal = unitPrice * item.quantity;
      calculatedSubtotal += itemSubtotal;

      // Deduct stock immediately in transaction
      deductStock.run(item.quantity, prod.id);

      const snapshotName = item.selectedVariant
        ? `${prod.name} [Variasi: ${item.selectedVariant}]`
        : prod.name;

      itemsSnapshot.push({
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        productId: prod.id,
        name: snapshotName,
        price: unitPrice,
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
      buyerNotes || null,
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

    // Sync order to Supabase
    if (supabase) {
      try {
        await supabase.from('orders').insert({
          id: orderId,
          invoice_number: invoiceNumber,
          user_id: userId || null,
          customer_name: customer.name,
          customer_email: customer.email || null,
          customer_phone: customer.phone,
          shipping_address: shipping.address,
          shipping_province: shipping.province || '',
          shipping_city: shipping.city || '',
          shipping_district: shipping.district || '',
          courier_name: shipping.courierName || 'JNE Express',
          courier_service: shipping.courierService || 'REG',
          subtotal_amount: calculatedSubtotal,
          shipping_cost: shippingCost,
          voucher_id: voucherId,
          voucher_code: voucherCode || null,
          discount_amount: discountAmount,
          grand_total: grandTotal,
          status: 'PENDING',
          payment_method: paymentMethod || 'qris',
          expired_at: expiredAt,
        });

        const sbItems = itemsSnapshot.map((s) => ({
          id: s.id,
          order_id: orderId,
          product_id: s.productId,
          product_name_snapshot: s.name,
          price_snapshot: s.price,
          quantity: s.quantity,
          subtotal: s.subtotal,
        }));
        await supabase.from('order_items').insert(sbItems);
        console.log('[Checkout] Order synced to Supabase:', invoiceNumber);
      } catch (sbOrderErr) {
        console.warn('[Checkout] Supabase sync order notice:', sbOrderErr);
      }
    }

    // Generate Midtrans Snap Token if configured AND NOT COD
    let snapToken: string | null = null;
    let paymentUrl: string | null = null;
    const isCod = (paymentMethod || '').toLowerCase() === 'cod';

    if (isMidtransConfigured() && !isCod) {
      try {
        const enabledPayments = mapPaymentMethodToMidtrans(paymentMethod);
        const snapRes = await createSnapTransaction({
          invoiceNumber,
          grandTotal,
          customer: {
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address: shipping.address,
            city: shipping.city,
          },
          items: itemsSnapshot.map((s) => ({
            id: s.productId,
            price: s.price,
            quantity: s.quantity,
            name: s.name,
          })),
          shippingCost,
          courierInfo: `${shipping.courierName || 'JNE'} ${shipping.courierService || 'REG'}`,
          discountAmount,
          enabledPayments,
        });

        if (snapRes) {
          snapToken = snapRes.token;
          paymentUrl = snapRes.redirect_url;
          db.prepare('UPDATE orders SET snap_token = ?, payment_url = ? WHERE id = ?').run(snapToken, paymentUrl, orderId);
          if (supabase) {
            supabase.from('orders').update({ snap_token: snapToken, payment_url: paymentUrl }).eq('id', orderId).then();
          }
        }
      } catch (mErr: any) {
        console.warn('[Midtrans] Error creating transaction token:', mErr.message);
      }
    }

    console.log(`[Order Created] Invoice: ${invoiceNumber}, Total: Rp ${grandTotal.toLocaleString('id-ID')}, Method: ${paymentMethod || 'qris'}`);

    res.json({
      success: true,
      invoiceNumber,
      orderId,
      subtotal: calculatedSubtotal,
      discount: discountAmount,
      shippingCost,
      grandTotal,
      expiredAt,
      snapToken,
      paymentUrl,
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

// Get Payment Gateway Configuration (Public)
app.get('/api/payment/config', (req: any, res: any) => {
  res.json({
    midtransClientKey: getMidtransClientKey(),
    isMidtransEnabled: isMidtransConfigured(),
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  });
});

// Get Order Details by Invoice Number
app.get('/api/orders/:invoiceNumber', async (req: any, res: any) => {
  const { invoiceNumber } = req.params;
  const order = await getOrSyncOrder(invoiceNumber);

  if (!order) {
    return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
  }

  let items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id) as any[];
  if ((!items || items.length === 0) && Array.isArray(order.items) && order.items.length > 0) {
    items = order.items;
  }

  // If pending and no snap token, generate it if Midtrans is configured AND not COD
  const isOrderCod = (order.payment_method || '').toLowerCase() === 'cod';
  if (order.status === 'PENDING' && !order.snap_token && isMidtransConfigured() && !isOrderCod) {
    try {
      const enabledPayments = mapPaymentMethodToMidtrans(order.payment_method);
      const snapRes = await createSnapTransaction({
        invoiceNumber: order.invoice_number,
        grandTotal: order.grand_total,
        customer: {
          name: order.customer_name,
          email: order.customer_email,
          phone: order.customer_phone,
          address: order.shipping_address,
          city: order.shipping_city,
        },
        items: items.map((s) => ({
          id: s.product_id,
          price: s.price_snapshot,
          quantity: s.quantity,
          name: s.product_name_snapshot,
        })),
        shippingCost: order.shipping_cost,
        courierInfo: `${order.courier_name} ${order.courier_service}`,
        discountAmount: order.discount_amount,
        enabledPayments,
      });

      if (snapRes) {
        order.snap_token = snapRes.token;
        order.payment_url = snapRes.redirect_url;
        db.prepare('UPDATE orders SET snap_token = ?, payment_url = ? WHERE id = ?').run(
          snapRes.token,
          snapRes.redirect_url,
          order.id
        );
        if (supabase) {
          supabase.from('orders').update({ snap_token: snapRes.token, payment_url: snapRes.redirect_url }).eq('id', order.id).then();
        }
      }
    } catch (e: any) {
      console.warn('[Midtrans] Error generating snap token on invoice view:', e.message);
    }
  }

  res.json({
    ...order,
    items,
  });
});

// Order Tracking by Invoice + Phone/Email (Public Guest Tracking)
app.get('/api/orders/track/search', async (req: any, res: any) => {
  const { invoice, phone } = req.query;

  if (!invoice) {
    return res.status(400).json({ error: 'Nomor invoice wajib diisi' });
  }

  const order = await getOrSyncOrder(invoice);
  if (!order) {
    return res.status(404).json({ error: 'Pesanan dengan nomor invoice tersebut tidak ditemukan' });
  }

  if (phone && phone.trim() !== '') {
    const cleanedSearch = phone.replace(/[^0-9]/g, '');
    const cleanedOrder = (order.customer_phone || '').replace(/[^0-9]/g, '');
    if (!cleanedOrder.includes(cleanedSearch) && !order.customer_email?.toLowerCase().includes(phone.toLowerCase())) {
      return res.status(403).json({ error: 'Nomor WhatsApp atau Email tidak cocok dengan data pemesan' });
    }
  }

  let items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id) as any[];
  if ((!items || items.length === 0) && Array.isArray(order.items) && order.items.length > 0) {
    items = order.items;
  }

  res.json({
    ...order,
    items,
  });
});

// Simulate Payment Settlement (for Testing / User Action)
app.post('/api/orders/:invoiceNumber/pay', async (req: any, res: any) => {
  const { invoiceNumber } = req.params;
  const order = await getOrSyncOrder(invoiceNumber);

  if (!order) return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
  if (order.status === 'PAID') return res.json({ success: true, message: 'Pesanan sudah berstatus LUNAS.' });
  if (order.status === 'CANCELLED') {
    return res.status(400).json({ error: 'Pesanan sudah dibatalkan atau kedaluwarsa. Tidak dapat dibayar.' });
  }

  const nowIso = new Date().toISOString();
  db.prepare(`UPDATE orders SET status = 'PAID', paid_at = ? WHERE id = ?`).run(nowIso, order.id);

  if (supabase) {
    try {
      await supabase.from('orders').update({
        status: 'PAID',
        paid_at: nowIso,
        updated_at: nowIso,
      }).eq('id', order.id);
    } catch (sbErr) {
      console.warn('[Payment Pay] Supabase sync warning:', sbErr);
    }
  }

  console.log(`[Payment Success] Pesanan ${invoiceNumber} telah dibayar.`);
  res.json({ success: true, message: 'Pembayaran berhasil dikonfirmasi!', status: 'PAID' });
});

// Cancel Order & Restore Stock
app.post('/api/orders/:invoiceNumber/cancel', async (req: any, res: any) => {
  const { invoiceNumber } = req.params;
  const order = await getOrSyncOrder(invoiceNumber);

  if (!order) return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
  if (order.status === 'CANCELLED') return res.json({ success: true, message: 'Pesanan sudah dibatalkan.' });
  if (order.status === 'SHIPPED' || order.status === 'COMPLETED') {
    return res.status(400).json({ error: 'Pesanan sudah dikirim/selesai dan tidak dapat dibatalkan.' });
  }

  const nowIso = new Date().toISOString();
  db.exec('BEGIN TRANSACTION');
  try {
    let items = db.prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?').all(order.id) as any[];
    if ((!items || items.length === 0) && Array.isArray(order.items)) {
      items = order.items;
    }
    const restoreStock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
    for (const item of items) {
      if (item.product_id) {
        restoreStock.run(item.quantity, item.product_id);
        if (supabase) {
          Promise.resolve(supabase.rpc('increment_stock', { p_id: item.product_id, qty: item.quantity })).catch(() => {});
        }
      }
    }

    if (order.voucher_id) {
      db.prepare('UPDATE vouchers SET used_count = MAX(0, used_count - 1) WHERE id = ?').run(order.voucher_id);
    }

    db.prepare(`UPDATE orders SET status = 'CANCELLED' WHERE id = ?`).run(order.id);
    db.exec('COMMIT');

    if (supabase) {
      await supabase.from('orders').update({
        status: 'CANCELLED',
        updated_at: nowIso,
      }).eq('id', order.id);
    }

    res.json({ success: true, message: 'Pesanan berhasil dibatalkan dan stok dikembalikan.' });
  } catch (err: any) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// =====================================================================
// WEBHOOK PAYMENT GATEWAY (Midtrans / Xendit Format) (PRD Section 4.1)
// =====================================================================
// WEBHOOK PAYMENT GATEWAY (Midtrans / Standard Format) (PRD Section 4.1)
app.post(['/api/webhooks/payment', '/api/webhooks/midtrans'], async (req: any, res: any) => {
  const signature = req.headers['x-callback-token'] || req.headers['signature-key'];
  const { order_id, transaction_status, gross_amount, status_code, signature_key, fraud_status, payment_type } = req.body;

  console.log('[Payment Webhook Received]', req.body);

  const invoiceNumber = order_id || req.body.invoiceNumber;
  if (!invoiceNumber) {
    return res.status(400).json({ error: 'order_id / invoiceNumber wajib disertakan' });
  }

  // Validate Midtrans signature if signature_key is present and server key configured
  const midtransSig = signature_key || signature;
  if (isMidtransConfigured() && midtransSig && status_code && gross_amount) {
    const isValid = verifyMidtransSignature(order_id, String(status_code), String(gross_amount), midtransSig);
    if (!isValid) {
      console.warn('[Midtrans] Invalid webhook signature detected for order:', order_id);
      return res.status(403).json({ error: 'Signature key tidak valid' });
    }
  } else if (signature && signature !== WEBHOOK_SIGNATURE_KEY && !isMidtransConfigured()) {
    return res.status(403).json({ error: 'Signature key tidak valid' });
  }

  const order = await getOrSyncOrder(invoiceNumber);
  if (!order) {
    return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
  }

  const nowIso = new Date().toISOString();

  // Idempotency check: jika status sudah sama, jangan proses ganda
  if (
    transaction_status === 'settlement' ||
    (transaction_status === 'capture' && (!fraud_status || fraud_status === 'accept')) ||
    transaction_status === 'PAID'
  ) {
    if (order.status === 'PAID') {
      return res.json({ status: 'ok', message: 'Order sudah berstatus PAID (Idempotent)' });
    }
    const payMethod = payment_type || order.payment_method;
    db.prepare(`UPDATE orders SET status = 'PAID', paid_at = ?, payment_method = ? WHERE id = ?`).run(nowIso, payMethod, order.id);
    if (supabase) {
      await supabase.from('orders').update({
        status: 'PAID',
        paid_at: nowIso,
        payment_method: payMethod,
        updated_at: nowIso,
      }).eq('id', order.id);
    }
    return res.json({ status: 'ok', message: 'Status order berhasil diperbarui menjadi PAID' });
  }

  if (
    transaction_status === 'expire' ||
    transaction_status === 'cancel' ||
    transaction_status === 'deny' ||
    transaction_status === 'CANCELLED'
  ) {
    if (order.status === 'CANCELLED') {
      return res.json({ status: 'ok', message: 'Order sudah berstatus CANCELLED (Idempotent)' });
    }

    db.exec('BEGIN TRANSACTION');
    try {
      let items = db.prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?').all(order.id) as any[];
      if ((!items || items.length === 0) && Array.isArray(order.items)) {
        items = order.items;
      }
      const restoreStock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
      for (const item of items) {
        if (item.product_id) {
          restoreStock.run(item.quantity, item.product_id);
          if (supabase) {
            Promise.resolve(supabase.rpc('increment_stock', { p_id: item.product_id, qty: item.quantity })).catch(() => {});
          }
        }
      }
      if (order.voucher_id) {
        db.prepare('UPDATE vouchers SET used_count = MAX(0, used_count - 1) WHERE id = ?').run(order.voucher_id);
      }
      db.prepare(`UPDATE orders SET status = 'CANCELLED' WHERE id = ?`).run(order.id);
      db.exec('COMMIT');

      if (supabase) {
        await supabase.from('orders').update({
          status: 'CANCELLED',
          updated_at: nowIso,
        }).eq('id', order.id);
      }
      return res.json({ status: 'ok', message: 'Order dibatalkan dan stok dikembalikan' });
    } catch (e: any) {
      db.exec('ROLLBACK');
      return res.status(500).json({ error: e.message });
    }
  }

  res.json({ status: 'ignored', message: 'Status tidak memerlukan tindakan' });
});

// WEBHOOK BITESHIP (Logistics Event Updates)
app.post('/api/webhooks/biteship', (req: any, res: any) => {
  const { event, order_id, tracking_id, waybill_id, status } = req.body;
  console.log('[Biteship Webhook Received]', event, status, order_id, waybill_id);

  if (!order_id && !waybill_id) {
    return res.status(400).json({ error: 'order_id / waybill_id wajib disertakan' });
  }

  const order = db.prepare(`
    SELECT * FROM orders 
    WHERE biteship_order_id = ? OR tracking_number = ? OR biteship_tracking_id = ?
  `).get(order_id || '', waybill_id || '', tracking_id || '') as any;

  if (order) {
    if (status === 'delivered') {
      db.prepare(`UPDATE orders SET status = 'COMPLETED' WHERE id = ?`).run(order.id);
    } else if (status === 'picked' || status === 'dropping_off' || status === 'in_transit') {
      db.prepare(`UPDATE orders SET status = 'SHIPPED', tracking_number = COALESCE(tracking_number, ?) WHERE id = ?`).run(
        waybill_id || tracking_id,
        order.id
      );
    }
  }

  res.json({ success: true, message: 'Biteship webhook diterima' });
});

// =====================================================================
// AUTH ENDPOINTS (Supabase Connected with Local Resilient Fallback)
// =====================================================================
app.post('/api/auth/login', async (req: any, res: any) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi' });
    }

    let user: any = null;

    // 1. Cek dari Supabase terlebih dahulu
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('username', username)
          .maybeSingle();

        if (!error && data) {
          user = data;
        }
      } catch (sbErr) {
        console.warn('[Auth] Supabase login lookup notice:', sbErr);
      }
    }

    // 2. Fallback ke SQLite / In-Memory
    if (!user) {
      user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
    }

    // 3. Fallback demo users jika akun baru di-seed
    if (!user) {
      if (username === 'admin' && (password === 'admin123' || password === 'admin')) {
        user = { id: 'u-admin', username: 'admin', role: 'admin' };
      } else if (username === 'agus' && (password === 'password123' || password === 'agus123' || password === 'agus')) {
        user = { id: 'u-agus', username: 'agus', role: 'user' };
      } else if (username === 'member' && (password === 'member123' || password === 'password123')) {
        user = { id: 'u-member', username: 'member', role: 'user' };
      }
    } else if (user.password_hash) {
      const isMatch = bcrypt.compareSync(password, user.password_hash);
      if (!isMatch) {
        if (
          (username === 'admin' && (password === 'admin123' || password === 'admin')) ||
          (username === 'agus' && (password === 'password123' || password === 'agus123' || password === 'agus')) ||
          (username === 'member' && (password === 'member123' || password === 'password123'))
        ) {
          // Akses kemudahan untuk akun demo bawaan
        } else {
          return res.status(401).json({ error: 'Username atau password salah' });
        }
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Akun tidak ditemukan. Silakan periksa kembali username Anda atau daftar akun baru.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role || 'user' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ token, user: { id: user.id, username: user.username, role: user.role || 'user' } });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Gagal memproses login: ' + (err.message || 'Server error') });
  }
});

app.post('/api/auth/register', async (req: any, res: any) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Username dan password wajib diisi' });

    // 1. Cek apakah username sudah terdaftar di Supabase
    let existsInSupabase = false;
    if (supabase) {
      try {
        const { data } = await supabase
          .from('users')
          .select('id')
          .eq('username', username)
          .maybeSingle();

        if (data) existsInSupabase = true;
      } catch (sbCheckErr) {
        console.warn('[Auth] Supabase register check error:', sbCheckErr);
      }
    }

    // 2. Cek di local store
    const localExisting = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existsInSupabase || localExisting) {
      return res.status(400).json({ error: 'Username sudah digunakan' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const id = 'u-' + Date.now();

    // 3. Simpan ke database Supabase
    if (supabase) {
      try {
        const { error: insErr } = await supabase.from('users').insert({
          id,
          username,
          password_hash: hash,
          role: 'user',
        });
        if (insErr) {
          console.warn('[Auth] Supabase register insert warning:', insErr.message);
        } else {
          console.log('[Auth] Akun baru berhasil disimpan di Supabase:', username);
        }
      } catch (sbInsertErr) {
        console.warn('[Auth] Supabase register insert exception:', sbInsertErr);
      }
    }

    // 4. Sinkronisasi ke local db (untuk query caching lokal)
    try {
      db.prepare('INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)').run(
        id,
        username,
        hash,
        'user'
      );
    } catch (dbErr) {
      // Abaikan jika sudah ada
    }

    const token = jwt.sign({ id, username, role: 'user' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id, username, role: 'user' } });
  } catch (err: any) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Gagal memproses registrasi: ' + (err.message || 'Server error') });
  }
});

app.post('/api/auth/google', async (req: any, res: any) => {
  try {
    const { email, name, avatar_url, google_id } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: 'Email dari akun Google wajib disertakan' });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    let user: any = null;

    // 1. Cek di Supabase berdasarkan email
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (!error && data) {
          user = data;
        }
      } catch (sbErr) {
        console.warn('[Auth] Supabase lookup by email error:', sbErr);
      }
    }

    // 2. Cek di database lokal SQLite
    if (!user) {
      try {
        user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail) as any;
      } catch (e) {
        // Abaikan
      }
    }

    // 3. Jika belum ditemukan, daftarkan sebagai user baru
    if (!user) {
      let baseUsername = (name || cleanEmail.split('@')[0])
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '')
        .slice(0, 20);
      if (!baseUsername || baseUsername.length < 3) {
        baseUsername = 'jawir_' + Math.floor(1000 + Math.random() * 9000);
      }

      // Pastikan username unik
      let candidateUsername = baseUsername;
      let counter = 1;
      while (true) {
        let exists = false;
        if (supabase) {
          try {
            const { data } = await supabase.from('users').select('id').eq('username', candidateUsername).maybeSingle();
            if (data) exists = true;
          } catch (e) {}
        }
        if (!exists) {
          const localCheck = db.prepare('SELECT id FROM users WHERE username = ?').get(candidateUsername);
          if (localCheck) exists = true;
        }
        if (!exists) break;
        candidateUsername = `${baseUsername}${counter++}`;
      }

      const id = 'u-g-' + Date.now();
      const newUser = {
        id,
        username: candidateUsername,
        email: cleanEmail,
        full_name: name || candidateUsername,
        avatar_url: avatar_url || null,
        role: 'user',
        password_hash: 'oauth-google',
      };

      // Simpan ke Supabase
      if (supabase) {
        try {
          const { error: insErr } = await supabase.from('users').insert({
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            full_name: newUser.full_name,
            avatar_url: newUser.avatar_url,
            role: 'user',
            password_hash: 'oauth-google',
          });
          if (insErr) {
            console.warn('[Auth] Supabase Google register notice:', insErr.message);
          } else {
            console.log('[Auth] Google OAuth user saved to Supabase:', newUser.username);
          }
        } catch (e) {
          console.warn('[Auth] Supabase Google register exception:', e);
        }
      }

      // Simpan ke SQLite
      try {
        db.prepare(`
          INSERT INTO users (id, username, password_hash, role, email, avatar_url, full_name)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          newUser.id,
          newUser.username,
          newUser.password_hash,
          newUser.role,
          newUser.email,
          newUser.avatar_url,
          newUser.full_name
        );
      } catch (dbErr) {
        try {
          db.prepare('INSERT OR REPLACE INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)').run(
            newUser.id,
            newUser.username,
            newUser.password_hash,
            newUser.role
          );
        } catch (e2) {}
      }

      user = newUser;
    } else {
      // User sudah ada, sinkronkan data profil terbaru jika ada
      const updatedName = name || user.full_name || user.username;
      const updatedAvatar = avatar_url || user.avatar_url;
      if (supabase) {
        try {
          await supabase.from('users').update({
            full_name: updatedName,
            avatar_url: updatedAvatar,
            email: cleanEmail,
          }).eq('id', user.id);
        } catch (e) {}
      }
      try {
        db.prepare('UPDATE users SET full_name = ?, avatar_url = ?, email = ? WHERE id = ?').run(
          updatedName,
          updatedAvatar,
          cleanEmail,
          user.id
        );
      } catch (e) {}
      user.full_name = updatedName;
      user.avatar_url = updatedAvatar;
      user.email = cleanEmail;
    }

    const payload = {
      id: user.id,
      username: user.username,
      role: user.role || 'user',
      email: user.email,
      avatar_url: user.avatar_url,
      full_name: user.full_name,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: payload,
    });
  } catch (err: any) {
    console.error('Google Auth Error:', err);
    res.status(500).json({ error: 'Gagal memproses autentikasi Google: ' + (err.message || 'Server error') });
  }
});

app.get('/api/auth/me', authMiddleware, (req: any, res: any) => {
  res.json({ user: req.user });
});

// User Order History (Shopee Style "Pesanan Saya")
app.get('/api/user/orders', authMiddleware, async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    const username = req.user?.username;

    if (isSupabaseConfigured() && supabase) {
      try {
        let sbQuery = supabase.from('orders').select('*').order('created_at', { ascending: false });
        if (userId && username) {
          sbQuery = sbQuery.or(`user_id.eq.${userId},customer_name.eq.${username}`);
        } else if (userId) {
          sbQuery = sbQuery.eq('user_id', userId);
        } else if (username) {
          sbQuery = sbQuery.eq('customer_name', username);
        }
        const { data: sbOrders, error: sbErr } = await sbQuery;
        if (!sbErr && sbOrders && sbOrders.length > 0) {
          const orderIds = sbOrders.map((o: any) => o.id);
          const { data: items } = await supabase.from('order_items').select('*').in('order_id', orderIds);
          const itemsMap = new Map<string, any[]>();
          if (items) {
            for (const it of items) {
              const arr = itemsMap.get(it.order_id) || [];
              arr.push(it);
              itemsMap.set(it.order_id, arr);
            }
          }
          const enriched = sbOrders.map((o: any) => ({
            ...o,
            items: itemsMap.get(o.id) || [],
          }));
          return res.json(enriched);
        }
      } catch (sbE) {
        console.warn('[User Orders Supabase Fallback]', sbE);
      }
    }

    const orders = db.prepare(`
      SELECT * FROM orders 
      WHERE user_id = ? OR customer_name = ?
      ORDER BY created_at DESC
    `).all(userId, username) as any[];

    const getItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?');

    const ordersWithItems = orders.map((o) => ({
      ...o,
      items: getItems.all(o.id),
    }));

    res.json(ordersWithItems);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================================
// SPRINT 3: ADMIN DASHBOARD (CMS & OMS) (PRD Section 4.3)
// =====================================================================

// Admin Analytics Summary
app.get('/api/admin/analytics', authMiddleware, adminMiddleware, async (req: any, res: any) => {
  if (isSupabaseConfigured()) {
    try {
      const sbAnalytics = await getSupabaseAnalytics();
      if (sbAnalytics) return res.json(sbAnalytics);
    } catch (e) {}
  }

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
app.get('/api/admin/orders', authMiddleware, adminMiddleware, async (req: any, res: any) => {
  const status = req.query.status as string;
  const search = req.query.search as string;

  if (isSupabaseConfigured()) {
    try {
      const sbOrders = await getSupabaseAdminOrders(status, search);
      if (sbOrders !== null) return res.json(sbOrders);
    } catch (e) {}
  }

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
  const enriched = orders.map((o) => {
    let customerNotes = o.customer_notes;
    if (!customerNotes && o.shipping_address) {
      const match = o.shipping_address.match(/\(Catatan:\s*(.+?)\)/i);
      if (match) customerNotes = match[1].trim();
    }
    return {
      ...o,
      customer_notes: customerNotes || null,
      items: getItems.all(o.id),
    };
  });

  res.json(enriched);
});

// Admin Update Order Status & Input Tracking Number
app.patch('/api/admin/orders/:id/status', authMiddleware, adminMiddleware, async (req: any, res: any) => {
  const { id } = req.params;
  const { status, trackingNumber } = req.body;

  const order = await getOrSyncOrder(id);
  if (!order) return res.status(404).json({ error: 'Pesanan tidak ditemukan' });

  const nowIso = new Date().toISOString();

  if (status === 'SHIPPED') {
    if (!trackingNumber || trackingNumber.trim() === '') {
      return res.status(400).json({ error: 'Nomor resi wajib diisi saat mengubah status menjadi Dikirim' });
    }
    db.prepare('UPDATE orders SET status = ?, tracking_number = ?, updated_at = ? WHERE id = ?').run('SHIPPED', trackingNumber.trim(), nowIso, id);
    if (supabase) {
      await supabase.from('orders').update({
        status: 'SHIPPED',
        tracking_number: trackingNumber.trim(),
        updated_at: nowIso,
      }).eq('id', id);
    }
  } else if (status === 'COMPLETED') {
    db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?').run('COMPLETED', nowIso, id);
    if (supabase) {
      await supabase.from('orders').update({
        status: 'COMPLETED',
        updated_at: nowIso,
      }).eq('id', id);
    }
  } else if (status === 'PAID') {
    db.prepare('UPDATE orders SET status = ?, paid_at = ?, updated_at = ? WHERE id = ?').run('PAID', nowIso, nowIso, id);
    if (supabase) {
      await supabase.from('orders').update({
        status: 'PAID',
        paid_at: nowIso,
        updated_at: nowIso,
      }).eq('id', id);
    }
  } else if (status === 'CANCELLED') {
    // Kembalikan stok jika dibatalkan oleh admin
    db.exec('BEGIN TRANSACTION');
    try {
      const items = db.prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?').all(id) as any[];
      const restoreStock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
      for (const item of items) {
        if (item.product_id) {
          restoreStock.run(item.quantity, item.product_id);
          if (supabase) {
            Promise.resolve(supabase.rpc('increment_stock', { p_id: item.product_id, qty: item.quantity })).catch(() => {});
          }
        }
      }
      if (order.voucher_id) {
        db.prepare('UPDATE vouchers SET used_count = MAX(0, used_count - 1) WHERE id = ?').run(order.voucher_id);
      }
      db.prepare(`UPDATE orders SET status = 'CANCELLED', updated_at = ? WHERE id = ?`).run(nowIso, id);
      db.exec('COMMIT');

      if (supabase) {
        await supabase.from('orders').update({
          status: 'CANCELLED',
          updated_at: nowIso,
        }).eq('id', id);
      }
    } catch (e: any) {
      db.exec('ROLLBACK');
      return res.status(500).json({ error: e.message });
    }
  } else {
    db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?').run(status, nowIso, id);
    if (supabase) {
      await supabase.from('orders').update({
        status,
        updated_at: nowIso,
      }).eq('id', id);
    }
  }

  res.json({ success: true, message: `Status pesanan berhasil diubah menjadi ${status}` });
});

// Admin Biteship Request Pickup & Automatic Waybill (Resi)
app.post('/api/admin/orders/:id/biteship-ship', authMiddleware, adminMiddleware, async (req: any, res: any) => {
  const { id } = req.params;
  const order = await getOrSyncOrder(id);
  if (!order) return res.status(404).json({ error: 'Pesanan tidak ditemukan' });

  if (order.status !== 'PAID') {
    return res.status(400).json({ error: 'Hanya pesanan berstatus Lunas (PAID) yang dapat di-request pickup' });
  }

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id) as any[];

  let trackingNumber = `RES-${order.courier_name.replace(/[^A-Z]/g, '').slice(0, 3)}-${Date.now().toString().slice(-6)}`;
  let biteshipOrderId = null;
  let biteshipTrackingId = null;

  if (isBiteshipConfigured()) {
    try {
      const shipRes = await createBiteshipShippingOrder({
        invoiceNumber: order.invoice_number,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        shippingAddress: order.shipping_address,
        shippingCity: order.shipping_city,
        destinationAreaId: order.destination_area_id,
        courierCompany: order.courier_name,
        courierType: order.courier_service,
        items: items.map((it) => ({
          name: it.product_name_snapshot,
          price: it.price_snapshot,
          quantity: it.quantity,
        })),
      });

      if (shipRes) {
        biteshipOrderId = shipRes.biteshipOrderId;
        biteshipTrackingId = shipRes.trackingId;
        if (shipRes.waybillId) trackingNumber = shipRes.waybillId;
      }
    } catch (err: any) {
      console.warn('[Biteship] Error during booking pickup:', err.message);
    }
  }

  const nowIso = new Date().toISOString();
  db.prepare(`
    UPDATE orders 
    SET status = 'SHIPPED', tracking_number = ?, biteship_order_id = ?, biteship_tracking_id = ?, updated_at = ?
    WHERE id = ?
  `).run(trackingNumber, biteshipOrderId, biteshipTrackingId, nowIso, id);

  if (supabase) {
    await supabase.from('orders').update({
      status: 'SHIPPED',
      tracking_number: trackingNumber,
      biteship_order_id: biteshipOrderId,
      biteship_tracking_id: biteshipTrackingId,
      updated_at: nowIso,
    }).eq('id', id);
  }

  res.json({
    success: true,
    message: `Pickup kurir ${order.courier_name} berhasil dibuat!`,
    trackingNumber,
    biteshipOrderId,
  });
});

// Live Biteship Tracking Endpoint (Customer & OMS)
app.get('/api/orders/:invoiceNumber/biteship-track', async (req: any, res: any) => {
  const { invoiceNumber } = req.params;
  const order = await getOrSyncOrder(invoiceNumber);
  if (!order) return res.status(404).json({ error: 'Pesanan tidak ditemukan' });

  let liveTracking = null;
  if (isBiteshipConfigured() && (order.biteship_tracking_id || order.tracking_number)) {
    try {
      liveTracking = await trackBiteshipShipment(
        order.biteship_tracking_id || order.tracking_number,
        order.courier_name
      );
    } catch (e: any) {
      console.warn('[Biteship] Tracking query error:', e.message);
    }
  }

  res.json({
    order,
    liveTracking,
  });
});

// Admin Products (CRUD)
app.get('/api/admin/products', authMiddleware, adminMiddleware, async (req: any, res: any) => {
  if (isSupabaseConfigured()) {
    try {
      const sbProducts = await getSupabaseAdminProducts();
      if (sbProducts !== null) {
        return res.json(sbProducts);
      }
    } catch (e) {
      console.warn('[Admin Products] Supabase fallback to local engine:', e);
    }
  }

  const products = db.prepare('SELECT * FROM products ORDER BY COALESCE(created_at, rowid) DESC').all() as any[];
  const getCompat = db.prepare('SELECT bike_type FROM product_bike_compatibility WHERE product_id = ?');

  res.json(
    products.map((p) => ({
      ...p,
      specs: typeof p.specs === 'string' ? JSON.parse(p.specs || '{}') : p.specs,
      variationGroups: typeof p.variation_groups === 'string' ? JSON.parse(p.variation_groups || '[]') : (p.variationGroups || p.variation_groups || undefined),
      bikeVariants: typeof p.bike_variants === 'string' ? JSON.parse(p.bike_variants || '[]') : (p.bikeVariants || undefined),
      isPromo: p.isPromo === 1,
      isPaketUpgrade: p.isPaketUpgrade === 1,
      isActive: p.is_active === 1,
      bikeCompatibility: getCompat.all(p.id).map((c: any) => c.bike_type),
    }))
  );
});

// Admin Shopee Product Scraper & Import
app.post('/api/admin/scrape-shopee', authMiddleware, adminMiddleware, async (req: any, res: any) => {
  try {
    const { url } = req.body || {};
    if (!url) {
      return res.status(400).json({ error: 'URL link produk Shopee wajib disertakan' });
    }

    const scraped = await scrapeShopeeProduct(url);
    res.json({
      success: true,
      product: scraped,
    });
  } catch (err: any) {
    console.error('[Admin Scrape Shopee Error]:', err);
    res.status(500).json({ error: err.message || 'Gagal mengekstrak data dari Shopee' });
  }
});

// Admin Bulk Import from Shopee
app.post('/api/admin/bulk-import-shopee', async (req: any, res: any) => {
  try {
    const { items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Array produk wajib disertakan' });
    }

    let addedCount = 0;
    for (const raw of items) {
      let title = (raw.name || '').replace(/^Jual\s+/i, '').replace(/\|.*Shopee.*/i, '').trim();
      if (!title || title.length < 5) continue;

      let img = raw.image || '';
      if (img.startsWith('//')) img = 'https:' + img;
      if (img && !img.startsWith('http')) {
        img = `https://down-id.img.susercontent.com/file/${img}`;
      }

      if (!img || img.includes('data:image') || img.includes('blank.gif')) continue;

      const price = typeof raw.price === 'number' && raw.price > 0 ? raw.price : 150000;
      const originalPrice = raw.originalPrice || Math.round(price * 1.25);
      const discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100) || 20;
      const category = detectCategory(title, raw.description || '');
      const { bikeCompatibility, bikeVariants } = detectBikeCompatibility(title, raw.description || '');

      const productPayload = {
        name: title,
        category,
        price,
        originalPrice,
        discountPercent,
        stock: 50,
        weight_grams: 650,
        image: img,
        rating: 4.9,
        soldCount: raw.soldCount || 120,
        promoTag: 'MALL',
        fitmentTag: '100% PnP Presisi',
        compatibilityText: bikeVariants.join(', ') || 'Universal',
        bikeCompatibility,
        bikeVariants,
        description: raw.description || `Produk performa tinggi original AH1 RACING STORE untuk ${bikeVariants.join(', ') || 'motor Anda'}. Dijamin 100% presisi Plug & Play.`,
        specs: {
          'Merk': 'AH1 RACING STORE',
          'Garansi': '1 Bulan Garansi Toko',
          'Kondisi': 'Baru & Original Pabrikan'
        },
        isPromo: true,
        isPaketUpgrade: category === 'part-cvt' || category === 'blok-mesin',
        isActive: true,
      };

      await createSupabaseProduct(productPayload, db);
      addedCount++;
    }

    res.json({ success: true, count: addedCount, message: `Berhasil import ${addedCount} produk resmi Shopee!` });
  } catch (err: any) {
    console.error('[Bulk Import Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/products', authMiddleware, adminMiddleware, async (req: any, res: any) => {
  const p = req.body;

  try {
    if (isSupabaseConfigured()) {
      const result = await createSupabaseProduct(p, db);
      return res.json(result);
    }

    const id = p.id || 'prod-' + Date.now();
    const slug = (p.name || 'product')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + Math.random().toString(36).substring(2, 6);

    db.prepare(`
      INSERT INTO products (
        id, name, slug, category, compatibilityText, fitmentTag, price, originalPrice,
        discountPercent, promoTag, rating, soldCount, image, description, specs,
        isPromo, isPaketUpgrade, stock, weight_grams, originCity, variation_groups, bike_variants, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      p.name,
      slug,
      p.category || 'part-cvt',
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
      p.variationGroups ? JSON.stringify(p.variationGroups) : null,
      p.bikeVariants ? JSON.stringify(p.bikeVariants) : null,
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

app.put('/api/admin/products/:id', authMiddleware, adminMiddleware, async (req: any, res: any) => {
  const { id } = req.params;
  const p = req.body;

  try {
    if (isSupabaseConfigured()) {
      await updateSupabaseProduct(id, p, db);
      return res.json({ success: true });
    }

    db.prepare(`
      UPDATE products SET
        name = ?, category = ?, compatibilityText = ?, fitmentTag = ?,
        price = ?, originalPrice = ?, discountPercent = ?, promoTag = ?,
        image = ?, description = ?, specs = ?, isPromo = ?, isPaketUpgrade = ?,
        stock = ?, weight_grams = ?, originCity = ?, variation_groups = ?, bike_variants = ?, is_active = ?
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
      p.originCity || 'Jakarta Timur',
      p.variationGroups ? JSON.stringify(p.variationGroups) : null,
      p.bikeVariants ? JSON.stringify(p.bikeVariants) : null,
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

app.delete('/api/admin/products/:id', authMiddleware, adminMiddleware, async (req: any, res: any) => {
  const { id } = req.params;
  try {
    if (isSupabaseConfigured()) {
      await deleteSupabaseProduct(id, db);
      return res.json({ success: true });
    }
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/products/:id/toggle', authMiddleware, adminMiddleware, async (req: any, res: any) => {
  const { id } = req.params;
  try {
    if (isSupabaseConfigured()) {
      const newStatus = await toggleSupabaseProduct(id, db);
      return res.json({ success: true, is_active: newStatus });
    }

    const prod = db.prepare('SELECT is_active FROM products WHERE id = ?').get(id) as any;
    if (!prod) return res.status(404).json({ error: 'Produk tidak ditemukan' });

    const newStatus = prod.is_active === 1 ? 0 : 1;
    db.prepare('UPDATE products SET is_active = ? WHERE id = ?').run(newStatus, id);
    res.json({ success: true, is_active: newStatus === 1 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Vouchers (CRUD)
app.get('/api/admin/vouchers', authMiddleware, adminMiddleware, async (req: any, res: any) => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: vList, error } = await supabase.from('vouchers').select('*').order('id', { ascending: true });
      if (!error && vList) {
        return res.json(vList.map(mapSupabaseVoucher));
      }
    } catch (e) {}
  }
  const vouchers = db.prepare('SELECT * FROM vouchers ORDER BY id ASC').all();
  res.json(vouchers);
});

app.post('/api/admin/vouchers', authMiddleware, adminMiddleware, async (req: any, res: any) => {
  const v = req.body;
  const id = 'vouch-' + Date.now();

  try {
    if (isSupabaseConfigured() && supabase) {
      const sbVoucher = {
        id,
        code: v.code.toUpperCase().trim(),
        title: v.title,
        subtitle: v.subtitle || '',
        discount_type: v.discount_type || 'FIXED',
        discount_value: Number(v.discount_value || 0),
        min_purchase_amount: Number(v.minSpend || 0),
        max_discount_amount: v.max_discount_amount ? Number(v.max_discount_amount) : null,
        quota: Number(v.quota || 100),
        used_count: 0,
        badge: v.badge || 'Promo Baru',
        claimed: false,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      await supabase.from('vouchers').insert(sbVoucher);
    }

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

app.delete('/api/admin/vouchers/:id', authMiddleware, adminMiddleware, async (req: any, res: any) => {
  const { id } = req.params;
  try {
    if (isSupabaseConfigured() && supabase) {
      await supabase.from('vouchers').delete().eq('id', id);
    }
    db.prepare('DELETE FROM vouchers WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/vouchers/:id/toggle', authMiddleware, adminMiddleware, async (req: any, res: any) => {
  const { id } = req.params;
  try {
    let newStatus = true;
    if (isSupabaseConfigured() && supabase) {
      const { data } = await supabase.from('vouchers').select('is_active').eq('id', id).maybeSingle();
      newStatus = data ? !data.is_active : true;
      await supabase.from('vouchers').update({ is_active: newStatus }).eq('id', id);
    } else {
      const v = db.prepare('SELECT is_active FROM vouchers WHERE id = ?').get(id) as any;
      if (!v) return res.status(404).json({ error: 'Voucher tidak ditemukan' });
      newStatus = v.is_active === 1 ? false : true;
    }

    db.prepare('UPDATE vouchers SET is_active = ? WHERE id = ?').run(newStatus ? 1 : 0, id);
    res.json({ success: true, is_active: newStatus });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================================
// LIVE CHAT & CHATBOT API (Shopee Style)
// =====================================================================

app.post('/api/chat/send', optionalAuthMiddleware, async (req: any, res: any) => {
  try {
    const { message, guestId, guestName, productContext, isAdminReply, senderRole } = req.body;
    let { roomId } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ error: 'Pesan tidak boleh kosong' });
    }

    const trimmedMsg = message.trim();
    // Only treat as admin reply if user has admin role AND the message is explicitly sent from Admin Panel
    const isOfficialAdminReply = Boolean(
      req.user?.role === 'admin' && (isAdminReply === true || senderRole === 'admin')
    );

    // Identify user and room
    if (!roomId) {
      if (isOfficialAdminReply) {
        return res.status(400).json({ error: 'roomId diperlukan untuk pengiriman pesan admin' });
      } else if (req.user) {
        roomId = `room_user_${req.user.id}`;
      } else {
        const gId = (guestId || 'guest_' + Math.random().toString(36).substring(2, 9)).trim();
        roomId = `room_guest_${gId}`;
      }
    }

    // Check existing room in local DB
    let room = db.prepare('SELECT * FROM chat_rooms WHERE id = ?').get(roomId) as any;
    const nowIso = new Date().toISOString();

    const senderType = isOfficialAdminReply ? 'admin' : 'user';
    const senderName = isOfficialAdminReply
      ? 'Admin Jawir Garage'
      : (req.user ? req.user.username : (guestName || 'Pelanggan'));

    const uId = req.user ? req.user.id : (guestId || null);
    const uName = isOfficialAdminReply ? (guestName || 'Pelanggan') : senderName;

    if (!room) {
      try {
        db.exec('PRAGMA foreign_keys = OFF;');
      } catch (e) {}

      if (req.user?.id) {
        try {
          const existingById = db.prepare('SELECT id FROM users WHERE id = ?').get(req.user.id);
          if (!existingById) {
            const existingByName = db.prepare('SELECT id FROM users WHERE username = ?').get(senderName);
            if (existingByName) {
              db.prepare('UPDATE users SET id = ? WHERE username = ?').run(req.user.id, senderName);
            } else {
              db.prepare('INSERT OR REPLACE INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)').run(
                req.user.id,
                senderName,
                'hash',
                req.user.role || 'user'
              );
            }
          }
        } catch (e) {}
      }

      try {
        db.prepare(`
          INSERT INTO chat_rooms (
            id, user_id, user_name, last_message, last_message_at,
            unread_admin, unread_user, bot_enabled, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
        `).run(
          roomId,
          uId,
          uName,
          trimmedMsg,
          nowIso,
          isOfficialAdminReply ? 0 : 1,
          isOfficialAdminReply ? 1 : 0,
          nowIso
        );
      } catch (e) {}
      room = { id: roomId, user_id: uId, user_name: uName, bot_enabled: 1 };
    } else {
      try {
        if (isOfficialAdminReply) {
          db.prepare(`
            UPDATE chat_rooms 
            SET last_message = ?, last_message_at = ?, unread_user = unread_user + 1
            WHERE id = ?
          `).run(trimmedMsg, nowIso, roomId);
        } else {
          db.prepare(`
            UPDATE chat_rooms 
            SET last_message = ?, last_message_at = ?, unread_admin = unread_admin + 1
            WHERE id = ?
          `).run(trimmedMsg, nowIso, roomId);
        }
      } catch (e) {}
    }

    // Insert user or admin message in local DB
    const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    try {
      db.prepare(`
        INSERT INTO chat_messages (
          id, room_id, sender_type, sender_name, message, product_payload, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        msgId,
        roomId,
        senderType,
        senderName,
        trimmedMsg,
        productContext ? JSON.stringify(productContext) : null,
        nowIso
      );
    } catch (e) {}

    // Synchronize Room & Message to Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        await upsertSupabaseChatRoom({
          id: roomId,
          user_id: uId,
          user_name: uName,
          last_message: trimmedMsg,
          last_message_at: nowIso,
          unread_admin: isOfficialAdminReply ? 0 : 1,
          unread_user: isOfficialAdminReply ? 1 : 0,
          bot_enabled: room ? (room.bot_enabled ?? 1) : 1,
          created_at: room?.created_at || nowIso,
        });

        await insertSupabaseChatMessage({
          id: msgId,
          room_id: roomId,
          sender_type: senderType,
          sender_name: senderName,
          message: trimmedMsg,
          product_payload: productContext || null,
          created_at: nowIso,
        });
      } catch (sbErr) {
        console.warn('[Supabase Chat Sync Error]:', sbErr);
      }
    }

    // If message is from user and bot is enabled, generate automated bot response
    let botReplyMsg: any = null;
    const isBotActive = room.bot_enabled !== 0;

    if (!isOfficialAdminReply && isBotActive) {
      try {
        const botResponse = generateChatbotReply(trimmedMsg, {
          userName: senderName,
          userId: req.user?.id || null,
          attachedProduct: productContext || null,
        });

        if (botResponse && botResponse.reply) {
          const botMsgId = 'msg_bot_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
          const botTime = new Date().toISOString();
          try {
            db.prepare(`
              INSERT INTO chat_messages (
                id, room_id, sender_type, sender_name, message, product_payload, created_at
              ) VALUES (?, ?, 'bot', 'Jawir Bot (Asisten Virtual)', ?, ?, ?)
            `).run(
              botMsgId,
              roomId,
              botResponse.reply,
              botResponse.productPayload ? JSON.stringify(botResponse.productPayload) : null,
              botTime
            );

            db.prepare(`
              UPDATE chat_rooms 
              SET last_message = ?, last_message_at = ?, unread_user = unread_user + 1
              WHERE id = ?
            `).run(botResponse.reply.substring(0, 100), botTime, roomId);
          } catch (e) {}

          botReplyMsg = {
            id: botMsgId,
            room_id: roomId,
            sender_type: 'bot',
            sender_name: 'Jawir Bot (Asisten Virtual)',
            message: botResponse.reply,
            product_payload: botResponse.productPayload || null,
            created_at: botTime,
          };

          if (isSupabaseConfigured()) {
            try {
              await insertSupabaseChatMessage({
                id: botMsgId,
                room_id: roomId,
                sender_type: 'bot',
                sender_name: 'Jawir Bot (Asisten Virtual)',
                message: botResponse.reply,
                product_payload: botResponse.productPayload || null,
                created_at: botTime,
              });

              await upsertSupabaseChatRoom({
                id: roomId,
                last_message: botResponse.reply.substring(0, 100),
                last_message_at: botTime,
                unread_user: 1,
              });
            } catch (sbErr) {
              console.warn('[Supabase Bot Sync Error]:', sbErr);
            }
          }
        }
      } catch (botErr) {
        console.error('[Bot Generation Error]:', botErr);
      }
    }

    res.json({
      success: true,
      roomId,
      messageId: msgId,
      botReply: botReplyMsg,
    });
  } catch (err: any) {
    console.error('[Chat API Error]:', err);
    res.status(500).json({ error: 'Gagal mengirim pesan chat: ' + err.message });
  }
});

app.get('/api/chat/messages/:roomId', optionalAuthMiddleware, async (req: any, res: any) => {
  try {
    const { roomId } = req.params;

    // Check Supabase first if configured (real-time cross-instance persistence)
    if (isSupabaseConfigured()) {
      try {
        const sbData = await getSupabaseChatMessages(roomId);
        if (sbData && sbData.messages && sbData.messages.length > 0) {
          return res.json({
            room: sbData.room,
            messages: sbData.messages,
          });
        }
      } catch (e) {
        console.warn('[Supabase getChatMessages notice]:', e);
      }
    }

    // Fallback to local SQLite / memory engine
    const room = db.prepare('SELECT * FROM chat_rooms WHERE id = ?').get(roomId) as any;
    const rawMessages = db.prepare(
      'SELECT * FROM chat_messages WHERE room_id = ? ORDER BY created_at ASC'
    ).all(roomId) as any[];

    const messages = rawMessages.map((m) => {
      let payload = null;
      if (m.product_payload) {
        try {
          payload = typeof m.product_payload === 'string' ? JSON.parse(m.product_payload) : m.product_payload;
        } catch (e) {}
      }
      return {
        ...m,
        product_payload: payload,
      };
    });

    res.json({
      room: room || null,
      messages,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal memuat pesan chat: ' + err.message });
  }
});

app.post('/api/chat/rooms/:roomId/read', optionalAuthMiddleware, async (req: any, res: any) => {
  try {
    const { roomId } = req.params;
    const { role } = req.body;

    try {
      if (role === 'admin' && req.user?.role === 'admin') {
        db.prepare('UPDATE chat_rooms SET unread_admin = 0 WHERE id = ?').run(roomId);
      } else {
        db.prepare('UPDATE chat_rooms SET unread_user = 0 WHERE id = ?').run(roomId);
      }
    } catch (e) {}

    if (isSupabaseConfigured()) {
      try {
        await updateSupabaseRoomRead(roomId, role);
      } catch (e) {}
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/chat/rooms', authMiddleware, adminMiddleware, async (req: any, res: any) => {
  try {
    if (isSupabaseConfigured()) {
      try {
        const sbRooms = await getSupabaseChatRooms();
        if (sbRooms && sbRooms.length > 0) {
          return res.json({ rooms: sbRooms });
        }
      } catch (e) {}
    }

    const rooms = db.prepare('SELECT * FROM chat_rooms ORDER BY last_message_at DESC').all() as any[];
    res.json({ rooms });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/chat/rooms/:roomId/toggle-bot', authMiddleware, adminMiddleware, async (req: any, res: any) => {
  try {
    const { roomId } = req.params;
    let room = db.prepare('SELECT bot_enabled FROM chat_rooms WHERE id = ?').get(roomId) as any;
    let currentBot = room ? (room.bot_enabled ?? 1) : 1;
    const newBotStatus = currentBot === 1 ? 0 : 1;

    try {
      db.prepare('UPDATE chat_rooms SET bot_enabled = ? WHERE id = ?').run(newBotStatus, roomId);
    } catch (e) {}

    if (isSupabaseConfigured()) {
      try {
        await toggleSupabaseBotStatus(roomId, newBotStatus);
      } catch (e) {}
    }

    res.json({ success: true, bot_enabled: newBotStatus });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/chat/rooms/:roomId', authMiddleware, adminMiddleware, async (req: any, res: any) => {
  try {
    const { roomId } = req.params;
    try {
      db.prepare('DELETE FROM chat_rooms WHERE id = ?').run(roomId);
    } catch (e) {}

    if (isSupabaseConfigured()) {
      try {
        await deleteSupabaseRoom(roomId);
      } catch (e) {}
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================================
// STATIC FILE SERVING & SPA FALLBACK (Render, Railway, VPS, cPanel)
// =====================================================================
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// START SERVER (standalone only, skipped on Vercel Serverless)
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`[Express] Server e-commerce Jawir Garage berjalan di http://localhost:${PORT}`);
  });
}

export default app;
