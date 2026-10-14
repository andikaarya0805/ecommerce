import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

// Ensure the data directory exists
const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'ecommerce.db'));

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
      minSpend INTEGER NOT NULL,
      discountAmount INTEGER NOT NULL,
      expiryText TEXT NOT NULL,
      badge TEXT NOT NULL,
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
      rating REAL NOT NULL,
      soldCount INTEGER NOT NULL,
      image TEXT NOT NULL,
      description TEXT NOT NULL,
      specs TEXT NOT NULL,
      isPromo BOOLEAN NOT NULL DEFAULT 0,
      isPaketUpgrade BOOLEAN NOT NULL DEFAULT 0,
      stock INTEGER NOT NULL,
      originCity TEXT NOT NULL
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
  `);

  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!adminExists) {
    const adminHash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)').run('u-admin', 'admin', adminHash, 'admin');
  }
}

export default db;
