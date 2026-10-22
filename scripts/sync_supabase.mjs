import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// We can read products from data/ecommerce.db directly since it has all 16 items!
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('data/ecommerce.db');
const products = db.prepare('SELECT * FROM products').all();
const compat = db.prepare('SELECT * FROM product_bike_compatibility').all();

console.log(`Found ${products.length} products in local SQLite.`);

async function syncAll() {
  for (const p of products) {
    const row = {
      id: p.id,
      name: p.name,
      slug: p.slug,
      category: p.category,
      compatibility_text: p.compatibilityText || '',
      fitment_tag: p.fitmentTag || 'Plug & Play (PnP)',
      price: Number(p.price),
      original_price: p.originalPrice ? Number(p.originalPrice) : null,
      discount_percent: p.discountPercent ? Number(p.discountPercent) : 0,
      promo_tag: p.promoTag || '',
      rating: p.rating ? Number(p.rating) : 5.0,
      sold_count: p.soldCount ? Number(p.soldCount) : 0,
      image: p.image,
      description: p.description,
      specs: typeof p.specs === 'string' ? p.specs : JSON.stringify(p.specs || {}),
      is_promo: p.isPromo === 1 || p.isPromo === true,
      is_paket_upgrade: p.isPaketUpgrade === 1 || p.isPaketUpgrade === true,
      stock: Number(p.stock || 20),
      weight_grams: Number(p.weight_grams || 500),
      origin_city: p.originCity || 'Jakarta Timur',
      is_active: true
    };

    const { error } = await client.from('products').upsert(row);
    if (error) {
      console.error(`Error on ${p.id}:`, error.message);
    } else {
      console.log(`[OK] Upserted ${p.id} (${p.category}) - sold: ${p.soldCount}`);
    }
  }

  for (const c of compat) {
    await client.from('product_bike_compatibility').upsert({
      product_id: c.product_id,
      bike_type: c.bike_type
    });
  }

  console.log('--- ALL PRODUCTS & BIKE COMPATIBILITY SYNCED TO SUPABASE ---');
}

syncAll().catch(console.error);
