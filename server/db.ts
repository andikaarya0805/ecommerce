import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import {
  INITIAL_PRODUCTS,
  INITIAL_VOUCHERS,
  CATEGORY_ITEMS,
  POPULAR_USER_BIKES,
} from '../src/data/products.ts';

const isVercel = Boolean(process.env.VERCEL);
const dataDir = isVercel ? '/tmp/ecommerce_data' : path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new DatabaseSync(path.join(dataDir, 'ecommerce.db'));

function ensureColumn(tableName: string, colName: string, colDef: string) {
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

  // Ensure PRD columns exist in products
  ensureColumn('products', 'slug', 'TEXT');
  ensureColumn('products', 'weight_grams', 'INTEGER DEFAULT 500');
  ensureColumn('products', 'is_active', 'INTEGER DEFAULT 1');
  ensureColumn('products', 'created_at', 'TEXT');
  try {
    db.exec("UPDATE products SET created_at = datetime('now') WHERE created_at IS NULL;");
  } catch (e) {
    // ignore
  }

  // Ensure PRD columns exist in vouchers
  ensureColumn('vouchers', 'discount_type', "TEXT DEFAULT 'FIXED'");
  ensureColumn('vouchers', 'discount_value', 'INTEGER DEFAULT 0');
  ensureColumn('vouchers', 'max_discount_amount', 'INTEGER');
  ensureColumn('vouchers', 'quota', 'INTEGER DEFAULT 100');
  ensureColumn('vouchers', 'used_count', 'INTEGER DEFAULT 0');
  ensureColumn('vouchers', 'valid_until', 'TEXT');
  ensureColumn('vouchers', 'is_active', 'INTEGER DEFAULT 1');

  // Ensure Midtrans and Biteship columns exist in orders
  ensureColumn('orders', 'snap_token', 'TEXT');
  ensureColumn('orders', 'biteship_order_id', 'TEXT');
  ensureColumn('orders', 'biteship_tracking_id', 'TEXT');
  ensureColumn('orders', 'destination_area_id', 'TEXT');

  // Fill slugs and weights for existing products
  try {
    const prods = db.prepare('SELECT id, name, slug FROM products').all() as any[];
    const updateSlug = db.prepare('UPDATE products SET slug = ?, weight_grams = 500, is_active = 1 WHERE id = ?');
    for (const p of prods) {
      if (!p.slug) {
        const slug = p.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        updateSlug.run(slug, p.id);
      }
    }
  } catch (e) {
    // ignore
  }

  // Create indexes now that columns exist
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

  // Ensure default admin user exists
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

  // Auto-seed if database is fresh / products table is empty
  try {
    const prodCount = db.prepare('SELECT COUNT(*) as count FROM products').get() as any;
    if (!prodCount || prodCount.count === 0) {
      console.log('[DB] Fresh database detected. Running auto-seed...');
      seedDatabase(db);
    }
  } catch (err) {
    console.warn('[DB] Auto-seed check warning:', err);
  }
}

export default db;
