import db, { initDb } from './db.js';
import { 
  INITIAL_PRODUCTS, 
  INITIAL_VOUCHERS, 
  CATEGORY_ITEMS, 
  POPULAR_USER_BIKES 
} from '../src/data/products.js';

// Initialize tables
initDb();

// Seed Categories
const insertCategory = db.prepare(`
  INSERT OR IGNORE INTO categories (id, title, subtitle, bikeFilter, categoryFilter, badgeText, count, icon, tagline)
  VALUES (@id, @title, @subtitle, @bikeFilter, @categoryFilter, @badgeText, @count, @icon, @tagline)
`);

for (const cat of CATEGORY_ITEMS) {
  insertCategory.run({
    id: cat.id,
    title: cat.title,
    subtitle: cat.subtitle,
    bikeFilter: cat.bikeFilter || null,
    categoryFilter: cat.categoryFilter || null,
    badgeText: cat.badgeText,
    count: cat.count,
    icon: cat.icon,
    tagline: cat.tagline
  });
}

// Seed Vouchers
const insertVoucher = db.prepare(`
  INSERT OR IGNORE INTO vouchers (id, code, title, subtitle, minSpend, discountAmount, expiryText, badge, claimed)
  VALUES (@id, @code, @title, @subtitle, @minSpend, @discountAmount, @expiryText, @badge, @claimed)
`);

for (const v of INITIAL_VOUCHERS) {
  insertVoucher.run({
    id: v.id,
    code: v.code,
    title: v.title,
    subtitle: v.subtitle,
    minSpend: v.minSpend,
    discountAmount: v.discountAmount,
    expiryText: v.expiryText,
    badge: v.badge,
    claimed: v.claimed ? 1 : 0
  });
}

// Seed Products and Compatibility
const insertProduct = db.prepare(`
  INSERT OR IGNORE INTO products (id, name, category, compatibilityText, fitmentTag, price, originalPrice, discountPercent, promoTag, rating, soldCount, image, description, specs, isPromo, isPaketUpgrade, stock, originCity)
  VALUES (@id, @name, @category, @compatibilityText, @fitmentTag, @price, @originalPrice, @discountPercent, @promoTag, @rating, @soldCount, @image, @description, @specs, @isPromo, @isPaketUpgrade, @stock, @originCity)
`);

const insertCompatibility = db.prepare(`
  INSERT OR IGNORE INTO product_bike_compatibility (product_id, bike_type)
  VALUES (@product_id, @bike_type)
`);

for (const p of INITIAL_PRODUCTS) {
  insertProduct.run({
    id: p.id,
    name: p.name,
    category: p.category,
    compatibilityText: p.compatibilityText,
    fitmentTag: p.fitmentTag,
    price: p.price,
    originalPrice: p.originalPrice || null,
    discountPercent: p.discountPercent || null,
    promoTag: p.promoTag || null,
    rating: p.rating,
    soldCount: p.soldCount,
    image: p.image,
    description: p.description,
    specs: JSON.stringify(p.specs),
    isPromo: p.isPromo ? 1 : 0,
    isPaketUpgrade: p.isPaketUpgrade ? 1 : 0,
    stock: p.stock,
    originCity: p.originCity
  });

  if (p.bikeCompatibility) {
    for (const bike of p.bikeCompatibility) {
      insertCompatibility.run({
        product_id: p.id,
        bike_type: bike
      });
    }
  }
}

// Seed Bikes
const insertBike = db.prepare(`
  INSERT OR IGNORE INTO bikes (id, name, type, year, cc)
  VALUES (@id, @name, @type, @year, @cc)
`);

for (const b of POPULAR_USER_BIKES) {
  insertBike.run({
    id: b.id,
    name: b.name,
    type: b.type,
    year: b.year,
    cc: b.cc
  });
}

console.log('Database seeded successfully!');
