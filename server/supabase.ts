import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  '';

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY ||
  '';

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
    supabaseUrl.trim() !== '' &&
    !supabaseUrl.includes('your-project') &&
    supabaseKey &&
    supabaseKey.trim() !== ''
  );
}

if (isSupabaseConfigured()) {
  try {
    client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    console.log('[Supabase] Initialized client for:', supabaseUrl);
  } catch (err) {
    console.warn('[Supabase] Failed to initialize Supabase client:', err);
  }
} else {
  console.log('[Supabase] Credentials not detected in environment. Running with local resilient storage engine.');
}

export async function checkSupabaseHealth(): Promise<{
  configured: boolean;
  connected: boolean;
  url?: string;
  keyRole?: string;
  error?: string;
  code?: string;
  fixGuide?: string;
  productsCount?: number;
}> {
  if (!isSupabaseConfigured() || !client) {
    return {
      configured: false,
      connected: false,
      error: 'Environment variables for Supabase (NEXT_PUBLIC_SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY) are not set.',
    };
  }

  try {
    // Attempt to query products table
    const { data, error } = await client
      .from('products')
      .select('id')
      .limit(1);

    if (error) {
      const isPermDenied = error.code === '42501' || error.message?.includes('permission denied');
      return {
        configured: true,
        connected: false,
        url: supabaseUrl,
        code: error.code || 'UNKNOWN',
        error: error.message || 'Permission denied or query error',
        fixGuide: isPermDenied
          ? 'Error 42501 (Permission Denied): Buka Supabase Dashboard -> SQL Editor, lalu jalankan script: GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role; GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role; GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;'
          : error.message,
      };
    }

    // Get count if accessible
    const countRes = await client.from('products').select('*', { count: 'exact', head: true });

    return {
      configured: true,
      connected: true,
      url: supabaseUrl,
      productsCount: countRes.count || (data ? data.length : 0),
    };
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      url: supabaseUrl,
      error: err.message || 'Unknown network error',
    };
  }
}

export function mapSupabaseProduct(p: any) {
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    category: p.category,
    compatibilityText: p.compatibility_text || p.compatibilityText || '',
    fitmentTag: p.fitment_tag || p.fitmentTag || 'Plug & Play (PnP)',
    price: Number(p.price || 0),
    originalPrice: p.original_price != null ? Number(p.original_price) : undefined,
    discountPercent: p.discount_percent != null ? Number(p.discount_percent) : 0,
    promoTag: p.promo_tag || p.promoTag || '',
    rating: Number(p.rating || 5.0),
    soldCount: Number(p.sold_count || p.soldCount || 0),
    image: p.image,
    description: p.description,
    specs: typeof p.specs === 'string' ? JSON.parse(p.specs || '{}') : p.specs || {},
    isPromo: Boolean(p.is_promo ?? p.isPromo),
    isPaketUpgrade: Boolean(p.is_paket_upgrade ?? p.isPaketUpgrade),
    stock: Number(p.stock || 0),
    weight_grams: Number(p.weight_grams || 500),
    originCity: p.origin_city || p.originCity || 'Jakarta Timur',
    isActive: Boolean(p.is_active ?? p.isActive ?? true),
    created_at: p.created_at,
    variationGroups: p.variation_groups
      ? typeof p.variation_groups === 'string'
        ? JSON.parse(p.variation_groups)
        : p.variation_groups
      : undefined,
    bikeVariants: p.bike_variants
      ? typeof p.bike_variants === 'string'
        ? JSON.parse(p.bike_variants)
        : p.bike_variants
      : undefined,
    bikeCompatibility: p.bikeCompatibility || [],
  };
}

export function mapSupabaseVoucher(v: any) {
  if (!v) return null;
  return {
    id: v.id,
    code: v.code,
    title: v.title,
    subtitle: v.subtitle,
    discount_type: v.discount_type || 'FIXED',
    discount_value: Number(v.discount_value || 0),
    minSpend: Number(v.min_purchase_amount ?? v.minSpend ?? 0),
    max_discount_amount: v.max_discount_amount != null ? Number(v.max_discount_amount) : undefined,
    discountAmount: Number(v.discount_value || 0),
    quota: Number(v.quota || 100),
    used_count: Number(v.used_count || 0),
    expiryText: v.valid_until ? `Berlaku hingga ${new Date(v.valid_until).toLocaleDateString('id-ID')}` : 'Promo Aktif',
    badge: v.badge || 'Promo Jawir',
    claimed: Boolean(v.claimed),
    is_active: v.is_active ? 1 : 0,
  };
}

export async function syncFromSupabase(targetDb: any) {
  if (!isSupabaseConfigured() || !client) return;

  try {
    // 1. Sync Users from Supabase
    const { data: users, error: uErr } = await client.from('users').select('*');
    if (!uErr && users && users.length > 0) {
      for (const u of users) {
        try {
          const existing = targetDb.prepare('SELECT id FROM users WHERE username = ?').get(u.username);
          if (!existing) {
            targetDb.prepare('INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)').run(
              u.id,
              u.username,
              u.password_hash,
              u.role || 'user'
            );
          }
        } catch (e) {}
      }
      console.log(`[Supabase] Synced ${users.length} users into local engine.`);
    }

    // 2. Sync Products from Supabase
    const { data: prods, error: pErr } = await client.from('products').select('*');
    if (!pErr && prods && prods.length > 0) {
      for (const p of prods) {
        try {
          const mapped = mapSupabaseProduct(p);
          if (!mapped) continue;
          const existing = targetDb.prepare('SELECT id FROM products WHERE id = ?').get(mapped.id);
          if (!existing) {
            targetDb.prepare(`
              INSERT INTO products (
                id, name, slug, category, compatibilityText, fitmentTag, price, originalPrice,
                discountPercent, promoTag, rating, soldCount, image, description, specs,
                isPromo, isPaketUpgrade, stock, weight_grams, originCity, variation_groups, is_active
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              mapped.id, mapped.name, mapped.slug, mapped.category, mapped.compatibilityText,
              mapped.fitmentTag, mapped.price, mapped.originalPrice || null, mapped.discountPercent || null,
              mapped.promoTag || null, mapped.rating, mapped.soldCount, mapped.image, mapped.description,
              JSON.stringify(mapped.specs), mapped.isPromo ? 1 : 0, mapped.isPaketUpgrade ? 1 : 0,
              mapped.stock, mapped.weight_grams, mapped.originCity,
              mapped.variationGroups ? JSON.stringify(mapped.variationGroups) : null,
              mapped.isActive ? 1 : 0
            );
          }
        } catch (e) {}
      }
      console.log(`[Supabase] Synced ${prods.length} products into local engine.`);
    }
  } catch (err) {
    console.warn('[Supabase] Initial sync notice:', err);
  }
}

export const supabase = client;
