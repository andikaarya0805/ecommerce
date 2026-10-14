import path from 'path';
import fs from 'fs';
import { createRequire } from 'node:module';
import bcrypt from 'bcryptjs';
import {
  INITIAL_PRODUCTS,
  INITIAL_VOUCHERS,
  CATEGORY_ITEMS,
  POPULAR_USER_BIKES,
} from '../src/data/products.ts';

// Dynamic loader for node:sqlite to support Node 20 and serverless safely
let DatabaseSync: any = null;
try {
  const req = createRequire(import.meta.url);
  const sqlite = req('node:sqlite');
  DatabaseSync = sqlite.DatabaseSync;
} catch (err) {
  console.warn('[DB] node:sqlite is not available in current runtime. Falling back to in-memory resilient engine.');
}

function createInMemoryDb() {
  const categories = CATEGORY_ITEMS.map((c) => ({ ...c }));
  const vouchers = INITIAL_VOUCHERS.map((v) => ({
    ...v,
    discount_type: v.discount_type || 'FIXED',
    discount_value: v.discount_value || 0,
    quota: v.quota || 100,
    used_count: 0,
    is_active: 1,
    claimed: v.claimed ? 1 : 0,
  }));
  const products = INITIAL_PRODUCTS.map((p) => {
    const slug = p.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return {
      ...p,
      slug,
      specs: JSON.stringify(p.specs || {}),
      isPromo: p.isPromo ? 1 : 0,
      isPaketUpgrade: p.isPaketUpgrade ? 1 : 0,
      variation_groups: p.variationGroups ? JSON.stringify(p.variationGroups) : null,
      bike_variants: p.bikeVariants ? JSON.stringify(p.bikeVariants) : null,
      weight_grams: p.weight_grams || 500,
      is_active: 1,
      created_at: new Date().toISOString(),
    };
  });
  const product_bike_compat: Array<{ product_id: string; bike_type: string }> = [];
  for (const p of INITIAL_PRODUCTS) {
    if (p.bikeCompatibility) {
      for (const b of p.bikeCompatibility) {
        product_bike_compat.push({ product_id: p.id, bike_type: b });
      }
    }
  }
  const bikes = POPULAR_USER_BIKES.map((b) => ({ ...b }));
  const users: any[] = [
    { id: 'u-admin', username: 'admin', password_hash: bcrypt.hashSync('admin123', 10), role: 'admin' },
    { id: 'u-agus', username: 'agus', password_hash: bcrypt.hashSync('password123', 10), role: 'user' },
    { id: 'u-member', username: 'member', password_hash: bcrypt.hashSync('member123', 10), role: 'user' },
  ];
  const orders: any[] = [];
  const order_items: any[] = [];

  return {
    isInMemory: true,
    exec(sql: string) {
      return;
    },
    prepare(sql: string) {
      const cleanSql = sql.trim().replace(/\s+/g, ' ');

      return {
        all(...params: any[]) {
          if (cleanSql.includes('FROM categories')) {
            return categories;
          }
          if (cleanSql.includes('FROM vouchers')) {
            if (cleanSql.includes('is_active = 1')) {
              return vouchers.filter((v: any) => v.is_active === 1);
            }
            return vouchers;
          }
          if (cleanSql.includes('FROM product_bike_compatibility')) {
            const prodId = params[0];
            return product_bike_compat
              .filter((c) => c.product_id === prodId)
              .map((c) => ({ bike_type: c.bike_type }));
          }
          if (cleanSql.includes('FROM bikes')) {
            return bikes;
          }
          if (cleanSql.includes('FROM order_items')) {
            const orderId = params[0];
            return order_items.filter((it: any) => it.order_id === orderId);
          }
          if (cleanSql.includes('FROM orders')) {
            if (cleanSql.includes('user_id = ? OR customer_name = ?')) {
              const [uId, cName] = params;
              return orders.filter((o: any) => o.user_id === uId || o.customer_name === cName);
            }
            if (cleanSql.includes('status = ?')) {
              const status = params[0];
              return orders.filter((o: any) => o.status === status);
            }
            return orders;
          }
          if (cleanSql.includes('FROM products')) {
            if (cleanSql.includes('stock < 5')) {
              return products.filter((p: any) => p.stock < 5 && p.is_active === 1);
            }
            return products;
          }
          return [];
        },
        get(...params: any[]) {
          if (cleanSql.includes('FROM users WHERE username = ?')) {
            const uName = params[0];
            return users.find((u: any) => u.username === uName);
          }
          if (cleanSql.includes('FROM users WHERE id = ?')) {
            const uId = params[0];
            return users.find((u: any) => u.id === uId);
          }
          if (cleanSql.includes('FROM vouchers WHERE code = ?')) {
            const code = params[0];
            return vouchers.find((v: any) => v.code === code && v.is_active === 1);
          }
          if (cleanSql.includes('FROM vouchers WHERE id = ?')) {
            const id = params[0];
            return vouchers.find((v: any) => v.id === id);
          }
          if (cleanSql.includes('FROM products WHERE (slug = ? OR id = ?)')) {
            const [param1, param2] = params;
            return products.find(
              (p: any) => (p.slug === param1 || p.id === param2) && p.is_active === 1
            );
          }
          if (cleanSql.includes('FROM products WHERE id = ?')) {
            const id = params[0];
            return products.find((p: any) => p.id === id);
          }
          if (cleanSql.includes('SELECT is_active FROM products WHERE id = ?')) {
            const id = params[0];
            const p = products.find((pr: any) => pr.id === id);
            return p ? { is_active: p.is_active } : undefined;
          }
          if (cleanSql.includes('SELECT is_active FROM vouchers WHERE id = ?')) {
            const id = params[0];
            const v = vouchers.find((vr: any) => vr.id === id);
            return v ? { is_active: v.is_active } : undefined;
          }
          if (cleanSql.includes('SELECT COUNT(*) as count FROM products')) {
            return { count: products.length };
          }
          if (cleanSql.includes('SELECT COUNT(*) as count FROM orders')) {
            if (cleanSql.includes("status = 'PAID'")) {
              return { count: orders.filter((o: any) => o.status === 'PAID').length };
            }
            return { count: orders.length };
          }
          if (cleanSql.includes('SELECT SUM(grand_total) as total FROM orders')) {
            const paid = orders.filter((o: any) =>
              ['PAID', 'SHIPPED', 'COMPLETED'].includes(o.status)
            );
            const sum = paid.reduce((acc: number, curr: any) => acc + (curr.grand_total || 0), 0);
            return { total: sum };
          }
          if (cleanSql.includes('FROM orders WHERE invoice_number = ?')) {
            const inv = params[0];
            return orders.find((o: any) => o.invoice_number === inv);
          }
          if (cleanSql.includes('FROM orders WHERE id = ?')) {
            const id = params[0];
            return orders.find((o: any) => o.id === id);
          }
          return undefined;
        },
        run(...params: any[]) {
          if (cleanSql.includes('INSERT INTO users')) {
            const [id, username, password_hash, role] = params;
            users.push({ id, username, password_hash, role: role || 'user' });
            return { changes: 1, lastInsertRowid: users.length };
          }
          if (cleanSql.includes('INSERT INTO orders')) {
            const [
              id,
              invoice_number,
              user_id,
              customer_name,
              customer_email,
              customer_phone,
              shipping_address,
              customer_notes,
              shipping_province,
              shipping_city,
              shipping_district,
              courier_name,
              courier_service,
              subtotal_amount,
              shipping_cost,
              voucher_id,
              voucher_code,
              discount_amount,
              grand_total,
              status,
              payment_method,
              expired_at,
            ] = params;
            orders.unshift({
              id,
              invoice_number,
              user_id,
              customer_name,
              customer_email,
              customer_phone,
              shipping_address,
              customer_notes: customer_notes || null,
              shipping_province,
              shipping_city,
              shipping_district,
              courier_name,
              courier_service,
              subtotal_amount,
              shipping_cost,
              voucher_id,
              voucher_code,
              discount_amount,
              grand_total,
              status: status || 'PENDING',
              payment_method,
              payment_url: null,
              expired_at,
              created_at: new Date().toISOString(),
            });
            return { changes: 1, lastInsertRowid: orders.length };
          }
          if (cleanSql.includes('INSERT INTO order_items')) {
            const [
              id,
              order_id,
              product_id,
              product_name_snapshot,
              price_snapshot,
              quantity,
              subtotal,
            ] = params;
            order_items.push({
              id,
              order_id,
              product_id,
              product_name_snapshot,
              price_snapshot,
              quantity,
              subtotal,
            });
            return { changes: 1, lastInsertRowid: order_items.length };
          }
          if (cleanSql.includes('UPDATE orders SET')) {
            if (cleanSql.includes('snap_token = ?') && cleanSql.includes('payment_url = ?')) {
              const [snapToken, paymentUrl, orderId] = params;
              const ord = orders.find((o: any) => o.id === orderId);
              if (ord) {
                ord.snap_token = snapToken;
                ord.payment_url = paymentUrl;
              }
            } else if (cleanSql.includes("status = 'PAID'")) {
              const orderId = params[params.length - 1];
              const ord = orders.find((o: any) => o.id === orderId);
              if (ord) {
                ord.status = 'PAID';
                ord.paid_at = new Date().toISOString();
                if (params.length > 1 && typeof params[0] === 'string') {
                  ord.payment_method = params[0];
                }
              }
            } else if (cleanSql.includes("status = 'CANCELLED'")) {
              const orderId = params[0];
              const ord = orders.find((o: any) => o.id === orderId);
              if (ord) ord.status = 'CANCELLED';
            } else if (cleanSql.includes("status = 'COMPLETED'")) {
              const orderId = params[0];
              const ord = orders.find((o: any) => o.id === orderId);
              if (ord) ord.status = 'COMPLETED';
            } else if (cleanSql.includes('status = ?')) {
              const [newStatus, orderId] = params;
              const ord = orders.find((o: any) => o.id === orderId);
              if (ord) ord.status = newStatus;
            }
            return { changes: 1, lastInsertRowid: 0 };
          }
          if (cleanSql.includes('UPDATE products SET stock = stock - ?')) {
            const [qty, prodId] = params;
            const p = products.find((pr: any) => pr.id === prodId);
            if (p) p.stock = Math.max(0, p.stock - qty);
            return { changes: 1, lastInsertRowid: 0 };
          }
          if (cleanSql.includes('UPDATE products SET stock = stock + ?')) {
            const [qty, prodId] = params;
            const p = products.find((pr: any) => pr.id === prodId);
            if (p) p.stock += qty;
            return { changes: 1, lastInsertRowid: 0 };
          }
          if (cleanSql.includes('UPDATE products SET is_active = ? WHERE id = ?')) {
            const [st, id] = params;
            const p = products.find((pr: any) => pr.id === id);
            if (p) p.is_active = st;
            return { changes: 1, lastInsertRowid: 0 };
          }
          if (cleanSql.includes('INSERT INTO products')) {
            const [
              id, name, slug, category, compatibilityText, fitmentTag, price, originalPrice,
              discountPercent, promoTag, rating, soldCount, image, description, specs,
              isPromo, isPaketUpgrade, stock, weight_grams, originCity, variation_groups, is_active
            ] = params;
            products.unshift({
              id, name, slug, category, compatibilityText, fitmentTag, price, originalPrice,
              discountPercent, promoTag, rating: rating || 5.0, soldCount: soldCount || 0,
              image, description, specs, isPromo, isPaketUpgrade, stock, weight_grams,
              originCity: originCity || 'Jakarta Timur',
              variation_groups, is_active: is_active ?? 1,
              created_at: new Date().toISOString()
            });
            return { changes: 1, lastInsertRowid: products.length };
          }
          if (cleanSql.includes('UPDATE products SET') && cleanSql.includes('name = ?')) {
            const [
              name, category, compatibilityText, fitmentTag, price, originalPrice,
              discountPercent, promoTag, image, description, specs, isPromo, isPaketUpgrade,
              stock, weight_grams, originCity, variation_groups, is_active, id
            ] = params;
            const p = products.find((pr: any) => pr.id === id);
            if (p) {
              Object.assign(p, {
                name, category, compatibilityText, fitmentTag, price, originalPrice,
                discountPercent, promoTag, image, description, specs, isPromo, isPaketUpgrade,
                stock, weight_grams, originCity, variation_groups, is_active
              });
            }
            return { changes: 1, lastInsertRowid: 0 };
          }
          if (cleanSql.includes('DELETE FROM products WHERE id = ?')) {
            const [id] = params;
            const idx = products.findIndex((pr: any) => pr.id === id);
            if (idx !== -1) products.splice(idx, 1);
            return { changes: 1, lastInsertRowid: 0 };
          }
          if (cleanSql.includes('product_bike_compatibility') && cleanSql.includes('INSERT')) {
            const [product_id, bike_type] = params;
            product_bike_compat.push({ product_id, bike_type });
            return { changes: 1, lastInsertRowid: product_bike_compat.length };
          }
          if (cleanSql.includes('DELETE FROM product_bike_compatibility WHERE product_id = ?')) {
            const [product_id] = params;
            for (let i = product_bike_compat.length - 1; i >= 0; i--) {
              if (product_bike_compat[i].product_id === product_id) {
                product_bike_compat.splice(i, 1);
              }
            }
            return { changes: 1, lastInsertRowid: 0 };
          }
          if (cleanSql.includes('UPDATE vouchers SET used_count = used_count + 1')) {
            const id = params[0];
            const v = vouchers.find((vr: any) => vr.id === id);
            if (v) v.used_count = (v.used_count || 0) + 1;
            return { changes: 1, lastInsertRowid: 0 };
          }
          if (cleanSql.includes('UPDATE vouchers SET is_active = ? WHERE id = ?')) {
            const [st, id] = params;
            const v = vouchers.find((vr: any) => vr.id === id);
            if (v) v.is_active = st;
            return { changes: 1, lastInsertRowid: 0 };
          }
          return { changes: 0, lastInsertRowid: 0 };
        },
      };
    },
  };
}

let db: any = null;

if (DatabaseSync) {
  try {
    const isVercel = Boolean(process.env.VERCEL);
    const dataDir = isVercel ? '/tmp/ecommerce_data' : path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const nativeDb = new DatabaseSync(path.join(dataDir, 'ecommerce.db'));
    nativeDb.exec('CREATE TABLE IF NOT EXISTS _test_probe (id INT);');
    db = nativeDb;
    console.log('[DB] Native SQLite initialized at:', path.join(dataDir, 'ecommerce.db'));
  } catch (nativeErr) {
    console.warn('[DB] Could not initialize native SQLite file, switching to in-memory store:', nativeErr);
    db = null;
  }
}

if (!db) {
  console.log('[DB] Running with high-resilience in-memory SQLite store.');
  db = createInMemoryDb();
}

function ensureColumn(tableName: string, colName: string, colDef: string) {
  if (db.isInMemory) return;
  try {
    const cols = db.prepare(`PRAGMA table_info(${tableName})`).all() as any[];
    const exists = cols.some((c) => c.name === colName);
    if (!exists) {
      db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${colName} ${colDef}`);
    }
  } catch (err) {
    // Ignore error if table doesn't exist yet
  }
}

export function seedDatabase(targetDb: any = db) {
  if (targetDb.isInMemory) return;
  try {
    const insertCategory = targetDb.prepare(`
      INSERT OR IGNORE INTO categories (id, title, subtitle, bikeFilter, categoryFilter, badgeText, count, icon, tagline)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const cat of CATEGORY_ITEMS) {
      insertCategory.run(
        cat.id,
        cat.title,
        cat.subtitle,
        cat.bikeFilter || null,
        cat.categoryFilter || null,
        cat.badgeText,
        cat.count,
        cat.icon,
        cat.tagline
      );
    }

    const insertVoucher = targetDb.prepare(`
      INSERT OR IGNORE INTO vouchers (
        id, code, title, subtitle, discount_type, discount_value, minSpend,
        max_discount_amount, discountAmount, quota, used_count, expiryText, badge, claimed, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 1)
    `);
    for (const v of INITIAL_VOUCHERS) {
      insertVoucher.run(
        v.id,
        v.code,
        v.title,
        v.subtitle,
        v.discount_type || 'FIXED',
        v.discount_value || 0,
        v.minSpend,
        v.max_discount_amount || null,
        v.discountAmount,
        v.quota || 100,
        v.expiryText,
        v.badge,
        v.claimed ? 1 : 0
      );
    }

    const insertProduct = targetDb.prepare(`
      INSERT OR IGNORE INTO products (
        id, name, slug, category, compatibilityText, fitmentTag, price, originalPrice,
        discountPercent, promoTag, rating, soldCount, image, description, specs,
        isPromo, isPaketUpgrade, stock, weight_grams, originCity, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    const insertCompatibility = targetDb.prepare(`
      INSERT OR IGNORE INTO product_bike_compatibility (product_id, bike_type)
      VALUES (?, ?)
    `);

    for (const p of INITIAL_PRODUCTS) {
      const slug = p.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      insertProduct.run(
        p.id,
        p.name,
        slug,
        p.category,
        p.compatibilityText,
        p.fitmentTag,
        p.price,
        p.originalPrice || null,
        p.discountPercent || null,
        p.promoTag || null,
        p.rating,
        p.soldCount,
        p.image,
        p.description,
        JSON.stringify(p.specs),
        p.isPromo ? 1 : 0,
        p.isPaketUpgrade ? 1 : 0,
        p.stock,
        p.weight_grams || 500,
        p.originCity
      );

      if (p.bikeCompatibility) {
        for (const bike of p.bikeCompatibility) {
          insertCompatibility.run(p.id, bike);
        }
      }
    }

    const insertBike = targetDb.prepare(`
      INSERT OR IGNORE INTO bikes (id, name, type, year, cc)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const b of POPULAR_USER_BIKES) {
      insertBike.run(b.id, b.name, b.type, b.year, b.cc);
    }

    console.log('[DB] Database auto-seeded successfully!');
  } catch (seedErr) {
    console.warn('[DB] Auto-seed warning:', seedErr);
  }
}

export function initDb() {
  if (db.isInMemory) return;

  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        subtitle TEXT NOT NULL,
        bikeFilter TEXT,
        categoryFilter TEXT,
        badgeText TEXT,
        count INTEGER NOT NULL,
        icon TEXT NOT NULL,
        tagline TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS vouchers (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        title TEXT NOT NULL,
        subtitle TEXT NOT NULL,
        minSpend INTEGER NOT NULL DEFAULT 0,
        discountAmount INTEGER NOT NULL DEFAULT 0,
        expiryText TEXT NOT NULL DEFAULT '',
        badge TEXT NOT NULL DEFAULT '',
        claimed BOOLEAN NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        compatibilityText TEXT NOT NULL,
        fitmentTag TEXT NOT NULL,
        price INTEGER NOT NULL,
        originalPrice INTEGER,
        discountPercent INTEGER,
        promoTag TEXT,
        rating REAL NOT NULL DEFAULT 5.0,
        soldCount INTEGER NOT NULL DEFAULT 0,
        image TEXT NOT NULL,
        description TEXT NOT NULL,
        specs TEXT NOT NULL,
        isPromo BOOLEAN NOT NULL DEFAULT 0,
        isPaketUpgrade BOOLEAN NOT NULL DEFAULT 0,
        stock INTEGER NOT NULL DEFAULT 0,
        originCity TEXT NOT NULL DEFAULT 'Jakarta Timur',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS product_bike_compatibility (
        product_id TEXT NOT NULL,
        bike_type TEXT NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        PRIMARY KEY (product_id, bike_type)
      );

      CREATE TABLE IF NOT EXISTS bikes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        year TEXT NOT NULL,
        cc TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user'
      );

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        invoice_number TEXT UNIQUE NOT NULL,
        user_id TEXT,
        customer_name TEXT NOT NULL,
        customer_email TEXT,
        customer_phone TEXT NOT NULL,
        shipping_address TEXT NOT NULL,
        shipping_province TEXT,
        shipping_city TEXT,
        shipping_district TEXT,
        courier_name TEXT NOT NULL,
        courier_service TEXT NOT NULL,
        tracking_number TEXT,
        subtotal_amount INTEGER NOT NULL,
        shipping_cost INTEGER NOT NULL,
        voucher_id TEXT,
        voucher_code TEXT,
        discount_amount INTEGER NOT NULL DEFAULT 0,
        grand_total INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        payment_method TEXT NOT NULL DEFAULT 'qris',
        payment_url TEXT,
        expired_at TEXT NOT NULL,
        paid_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        product_id TEXT,
        product_name_snapshot TEXT NOT NULL,
        price_snapshot INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        subtotal INTEGER NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      );
    `);

    ensureColumn('products', 'slug', 'TEXT');
    ensureColumn('products', 'weight_grams', 'INTEGER DEFAULT 500');
    ensureColumn('products', 'is_active', 'INTEGER DEFAULT 1');
    ensureColumn('products', 'created_at', 'TEXT');
    try {
      db.exec("UPDATE products SET created_at = datetime('now') WHERE created_at IS NULL;");
    } catch (e) {
      // ignore
    }

    ensureColumn('vouchers', 'discount_type', "TEXT DEFAULT 'FIXED'");
    ensureColumn('vouchers', 'discount_value', 'INTEGER DEFAULT 0');
    ensureColumn('vouchers', 'max_discount_amount', 'INTEGER');
    ensureColumn('vouchers', 'quota', 'INTEGER DEFAULT 100');
    ensureColumn('vouchers', 'used_count', 'INTEGER DEFAULT 0');
    ensureColumn('vouchers', 'valid_until', 'TEXT');
    ensureColumn('vouchers', 'is_active', 'INTEGER DEFAULT 1');

    ensureColumn('orders', 'snap_token', 'TEXT');
    ensureColumn('orders', 'biteship_order_id', 'TEXT');
    ensureColumn('orders', 'biteship_tracking_id', 'TEXT');
    ensureColumn('orders', 'destination_area_id', 'TEXT');
    ensureColumn('orders', 'customer_notes', 'TEXT');
    ensureColumn('products', 'variation_groups', 'TEXT');
    ensureColumn('products', 'bike_variants', 'TEXT');

    try {
      const prods = db.prepare('SELECT id, name, slug FROM products').all() as any[];
      const updateSlug = db.prepare(
        'UPDATE products SET slug = ?, weight_grams = 500, is_active = 1 WHERE id = ?'
      );
      for (const p of prods) {
        if (!p.slug) {
          const slug = p.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
          updateSlug.run(slug, p.id);
        }
      }
      const updateVariants = db.prepare(
        'UPDATE products SET bike_variants = ? WHERE id = ? AND (bike_variants IS NULL OR bike_variants = "[]")'
      );
      for (const p of INITIAL_PRODUCTS) {
        if (p.bikeVariants) {
          updateVariants.run(JSON.stringify(p.bikeVariants), p.id);
        }
      }
    } catch (e) {
      // ignore
    }

    try {
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
        CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
        CREATE INDEX IF NOT EXISTS idx_orders_invoice ON orders(invoice_number);
        CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
        CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);
      `);
    } catch (err) {
      console.warn('[DB] Index creation warning:', err);
    }

    // Default admin user
    const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
    if (!adminExists) {
      const adminHash = bcrypt.hashSync('admin123', 10);
      db.prepare('INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)').run(
        'u-admin',
        'admin',
        adminHash,
        'admin'
      );
    }

    // Default member user 'agus'
    const agusExists = db.prepare('SELECT id FROM users WHERE username = ?').get('agus');
    if (!agusExists) {
      const agusHash = bcrypt.hashSync('password123', 10);
      db.prepare('INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)').run(
        'u-agus',
        'agus',
        agusHash,
        'user'
      );
    }

    // Default demo member user
    const memberExists = db.prepare('SELECT id FROM users WHERE username = ?').get('member');
    if (!memberExists) {
      const memberHash = bcrypt.hashSync('member123', 10);
      db.prepare('INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)').run(
        'u-member',
        'member',
        memberHash,
        'user'
      );
    }

    const prodCount = db.prepare('SELECT COUNT(*) as count FROM products').get() as any;
    if (!prodCount || prodCount.count === 0) {
      console.log('[DB] Fresh database detected. Running auto-seed...');
      seedDatabase(db);
    }
  } catch (initErr) {
    console.warn('[DB] initDb warning:', initErr);
  }
}

export default db;
