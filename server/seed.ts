import db, { initDb } from './db.js';
import {
  INITIAL_PRODUCTS,
  INITIAL_VOUCHERS,
  CATEGORY_ITEMS,
  POPULAR_USER_BIKES,
} from '../src/data/products.ts';

// Initialize tables
initDb();

// Seed Categories
const insertCategory = db.prepare(`
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

// Seed Vouchers
const insertVoucher = db.prepare(`
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

// Seed Products and Compatibility
const insertProduct = db.prepare(`
  INSERT OR IGNORE INTO products (
    id, name, slug, category, compatibilityText, fitmentTag, price, originalPrice,
    discountPercent, promoTag, rating, soldCount, image, description, specs,
    isPromo, isPaketUpgrade, stock, weight_grams, originCity, is_active
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
`);

const insertCompatibility = db.prepare(`
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

// Seed Bikes
const insertBike = db.prepare(`
  INSERT OR IGNORE INTO bikes (id, name, type, year, cc)
  VALUES (?, ?, ?, ?, ?)
`);

for (const b of POPULAR_USER_BIKES) {
  insertBike.run(b.id, b.name, b.type, b.year, b.cc);
}

console.log('Database seeded successfully!');
