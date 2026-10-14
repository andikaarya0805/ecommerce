import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const dataDir = path.resolve(process.cwd(), 'data');
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
}

export default db;
