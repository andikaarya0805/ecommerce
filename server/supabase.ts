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
  const rawSpecs = typeof p.specs === 'string' ? JSON.parse(p.specs || '{}') : p.specs || {};
  
  // Extract variation groups and bike variants whether stored as columns or inside specs json
  const variationGroups = p.variation_groups
    ? (typeof p.variation_groups === 'string' ? JSON.parse(p.variation_groups) : p.variation_groups)
    : (rawSpecs._variationGroups || undefined);

  const bikeVariants = p.bike_variants
    ? (typeof p.bike_variants === 'string' ? JSON.parse(p.bike_variants) : p.bike_variants)
    : (rawSpecs._bikeVariants || undefined);

  // Clean specs to not pollute customer display
  const specs = { ...rawSpecs };
  delete specs._variationGroups;
  delete specs._bikeVariants;

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
    specs,
    isPromo: Boolean(p.is_promo ?? p.isPromo),
    isPaketUpgrade: Boolean(p.is_paket_upgrade ?? p.isPaketUpgrade),
    stock: Number(p.stock || 0),
    weight_grams: Number(p.weight_grams || 500),
    originCity: p.origin_city || p.originCity || 'Jakarta Timur',
    isActive: Boolean(p.is_active ?? p.isActive ?? true),
    created_at: p.created_at,
    variationGroups,
    bikeVariants,
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

/**
 * Fetch all products for admin directly from Supabase, including bike compatibilities
 */
export async function getSupabaseAdminProducts(): Promise<any[] | null> {
  if (!client) return null;
  try {
    const { data: prods, error: pErr } = await client
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (pErr) {
      console.warn('[Supabase] getSupabaseAdminProducts error:', pErr);
      return null;
    }

    const { data: compats } = await client
      .from('product_bike_compatibility')
      .select('*');

    const compatMap = new Map<string, string[]>();
    if (compats) {
      for (const c of compats) {
        const arr = compatMap.get(c.product_id) || [];
        arr.push(c.bike_type);
        compatMap.set(c.product_id, arr);
      }
    }

    return (prods || []).map((p: any) => {
      const mapped = mapSupabaseProduct(p);
      mapped.bikeCompatibility = compatMap.get(p.id) || [];
      return mapped;
    });
  } catch (err) {
    console.warn('[Supabase] getSupabaseAdminProducts exception:', err);
    return null;
  }
}

/**
 * Fetch products for storefront from Supabase with filtering and sorting
 */
export async function getSupabaseProducts(filter: {
  category?: string;
  bikeType?: string;
  search?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}): Promise<any[] | null> {
  if (!client) return null;
  try {
    let query = client.from('products').select('*').eq('is_active', true);

    if (filter.category && filter.category !== 'semua') {
      query = query.eq('category', filter.category);
    }

    if (filter.search && filter.search.trim() !== '') {
      const s = filter.search.trim();
      query = query.or(`name.ilike.%${s}%,compatibility_text.ilike.%${s}%,description.ilike.%${s}%`);
    }

    // Bike Compatibility Filter
    if (filter.bikeType && filter.bikeType !== 'all') {
      const { data: bCompats } = await client
        .from('product_bike_compatibility')
        .select('product_id')
        .eq('bike_type', filter.bikeType);
      const pIds = (bCompats || []).map((b: any) => b.product_id);
      if (pIds.length === 0) return [];
      query = query.in('id', pIds);
    }

    // Sorting
    if (filter.sort === 'terbaru') {
      query = query.order('created_at', { ascending: false });
    } else if (filter.sort === 'terlaris') {
      query = query.order('sold_count', { ascending: false });
    } else if (filter.sort === 'harga-asc') {
      query = query.order('price', { ascending: true });
    } else if (filter.sort === 'harga-desc') {
      query = query.order('price', { ascending: false });
    } else {
      // Populer
      query = query.order('rating', { ascending: false }).order('sold_count', { ascending: false });
    }

    if (filter.limit) {
      const start = filter.offset || 0;
      query = query.range(start, start + filter.limit - 1);
    }

    const { data: prods, error: pErr } = await query;
    if (pErr) return null;

    const prodIds = (prods || []).map((p: any) => p.id);
    let compatMap = new Map<string, string[]>();
    if (prodIds.length > 0) {
      const { data: compats } = await client
        .from('product_bike_compatibility')
        .select('*')
        .in('product_id', prodIds);
      if (compats) {
        for (const c of compats) {
          const arr = compatMap.get(c.product_id) || [];
          arr.push(c.bike_type);
          compatMap.set(c.product_id, arr);
        }
      }
    }

    return (prods || []).map((p: any) => {
      const mapped = mapSupabaseProduct(p);
      mapped.bikeCompatibility = compatMap.get(p.id) || [];
      return mapped;
    });
  } catch (err) {
    console.warn('[Supabase] getSupabaseProducts exception:', err);
    return null;
  }
}

/**
 * Fetch a single product by slug or id from Supabase
 */
export async function getSupabaseProductByIdOrSlug(slugOrId: string): Promise<any | null> {
  if (!client) return null;
  try {
    const { data: p, error } = await client
      .from('products')
      .select('*')
      .or(`slug.eq.${slugOrId},id.eq.${slugOrId}`)
      .limit(1)
      .maybeSingle();

    if (error || !p) return null;

    const { data: compats } = await client
      .from('product_bike_compatibility')
      .select('bike_type')
      .eq('product_id', p.id);

    const mapped = mapSupabaseProduct(p);
    mapped.bikeCompatibility = (compats || []).map((c: any) => c.bike_type);
    return mapped;
  } catch (err) {
    return null;
  }
}

/**
 * Create a new product in Supabase and sync to local db
 */
export async function createSupabaseProduct(p: any, targetDb?: any): Promise<{ success: boolean; id: string }> {
  const id = p.id || 'prod-' + Date.now();
  const slug = (p.name || 'product')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') + '-' + Math.random().toString(36).substring(2, 6);

  const specs = {
    ...(typeof p.specs === 'object' && p.specs ? p.specs : {}),
    _variationGroups: p.variationGroups || [],
    _bikeVariants: p.bikeVariants || [],
  };

  const sbProduct = {
    id,
    name: p.name,
    slug,
    category: p.category || 'cvt',
    compatibility_text: p.compatibilityText || 'Universal',
    fitment_tag: p.fitmentTag || 'Plug & Play (PnP)',
    price: Number(p.price || 0),
    original_price: p.originalPrice != null ? Number(p.originalPrice) : null,
    discount_percent: p.discountPercent != null ? Number(p.discountPercent) : 0,
    promo_tag: p.promoTag || null,
    rating: Number(p.rating || 5.0),
    sold_count: Number(p.soldCount || 0),
    image: p.image || '/images/default.jpg',
    description: p.description || '',
    specs,
    is_promo: Boolean(p.isPromo),
    is_paket_upgrade: Boolean(p.isPaketUpgrade),
    stock: Number(p.stock || 0),
    weight_grams: Number(p.weight_grams || 500),
    origin_city: p.originCity || 'Jakarta Timur',
    is_active: p.isActive !== false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (client) {
    const { error: insErr } = await client.from('products').insert(sbProduct);
    if (insErr) {
      console.warn('[Supabase] create product error:', insErr);
      throw new Error(insErr.message);
    }

    if (p.bikeCompatibility && Array.isArray(p.bikeCompatibility) && p.bikeCompatibility.length > 0) {
      const compatRows = p.bikeCompatibility.map((b: string) => ({
        product_id: id,
        bike_type: b,
      }));
      await client.from('product_bike_compatibility').insert(compatRows);
    }
  }

  // Also sync to targetDb if provided
  if (targetDb) {
    try {
      targetDb.prepare(`
        INSERT INTO products (
          id, name, slug, category, compatibilityText, fitmentTag, price, originalPrice,
          discountPercent, promoTag, rating, soldCount, image, description, specs,
          isPromo, isPaketUpgrade, stock, weight_grams, originCity, variation_groups, bike_variants, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, p.name, slug, p.category || 'cvt', p.compatibilityText || 'Universal',
        p.fitmentTag || 'Plug & Play (PnP)', p.price || 0, p.originalPrice || null,
        p.discountPercent || 0, p.promoTag || null, p.rating || 5.0, p.soldCount || 0,
        p.image || '/images/default.jpg', p.description || '', JSON.stringify(p.specs || {}),
        p.isPromo ? 1 : 0, p.isPaketUpgrade ? 1 : 0, p.stock || 0, p.weight_grams || 500,
        p.originCity || 'Jakarta Timur',
        p.variationGroups ? JSON.stringify(p.variationGroups) : null,
        p.bikeVariants ? JSON.stringify(p.bikeVariants) : null,
        p.isActive !== false ? 1 : 0
      );

      if (p.bikeCompatibility && Array.isArray(p.bikeCompatibility)) {
        const insertCompat = targetDb.prepare('INSERT OR IGNORE INTO product_bike_compatibility (product_id, bike_type) VALUES (?, ?)');
        for (const b of p.bikeCompatibility) {
          insertCompat.run(id, b);
        }
      }
    } catch (e) {}
  }

  return { success: true, id };
}

/**
 * Update an existing product in Supabase and sync to local db
 */
export async function updateSupabaseProduct(id: string, p: any, targetDb?: any): Promise<boolean> {
  const specs = {
    ...(typeof p.specs === 'object' && p.specs ? p.specs : {}),
    _variationGroups: p.variationGroups || [],
    _bikeVariants: p.bikeVariants || [],
  };

  const sbUpdate = {
    name: p.name,
    category: p.category,
    compatibility_text: p.compatibilityText,
    fitment_tag: p.fitmentTag,
    price: Number(p.price || 0),
    original_price: p.originalPrice != null ? Number(p.originalPrice) : null,
    discount_percent: p.discountPercent != null ? Number(p.discountPercent) : 0,
    promo_tag: p.promoTag || null,
    image: p.image,
    description: p.description,
    specs,
    is_promo: Boolean(p.isPromo),
    is_paket_upgrade: Boolean(p.isPaketUpgrade),
    stock: Number(p.stock || 0),
    weight_grams: Number(p.weight_grams || 500),
    origin_city: p.originCity || 'Jakarta Timur',
    is_active: p.isActive !== false,
    updated_at: new Date().toISOString(),
  };

  if (client) {
    const { error: updErr } = await client.from('products').update(sbUpdate).eq('id', id);
    if (updErr) {
      console.warn('[Supabase] update product error:', updErr);
      throw new Error(updErr.message);
    }

    if (p.bikeCompatibility && Array.isArray(p.bikeCompatibility)) {
      await client.from('product_bike_compatibility').delete().eq('product_id', id);
      if (p.bikeCompatibility.length > 0) {
        const compatRows = p.bikeCompatibility.map((b: string) => ({
          product_id: id,
          bike_type: b,
        }));
        await client.from('product_bike_compatibility').insert(compatRows);
      }
    }
  }

  if (targetDb) {
    try {
      targetDb.prepare(`
        UPDATE products SET
          name = ?, category = ?, compatibilityText = ?, fitmentTag = ?,
          price = ?, originalPrice = ?, discountPercent = ?, promoTag = ?,
          image = ?, description = ?, specs = ?, isPromo = ?, isPaketUpgrade = ?,
          stock = ?, weight_grams = ?, originCity = ?, variation_groups = ?, bike_variants = ?, is_active = ?
        WHERE id = ?
      `).run(
        p.name, p.category, p.compatibilityText, p.fitmentTag, p.price,
        p.originalPrice || null, p.discountPercent || null, p.promoTag || null,
        p.image, p.description, JSON.stringify(p.specs || {}),
        p.isPromo ? 1 : 0, p.isPaketUpgrade ? 1 : 0, p.stock,
        p.weight_grams || 500, p.originCity || 'Jakarta Timur',
        p.variationGroups ? JSON.stringify(p.variationGroups) : null,
        p.bikeVariants ? JSON.stringify(p.bikeVariants) : null,
        p.isActive !== false ? 1 : 0,
        id
      );

      if (p.bikeCompatibility && Array.isArray(p.bikeCompatibility)) {
        targetDb.prepare('DELETE FROM product_bike_compatibility WHERE product_id = ?').run(id);
        const insertCompat = targetDb.prepare('INSERT INTO product_bike_compatibility (product_id, bike_type) VALUES (?, ?)');
        for (const b of p.bikeCompatibility) {
          insertCompat.run(id, b);
        }
      }
    } catch (e) {}
  }

  return true;
}

/**
 * Delete a product from Supabase and sync to local db
 */
export async function deleteSupabaseProduct(id: string, targetDb?: any): Promise<boolean> {
  if (client) {
    await client.from('product_bike_compatibility').delete().eq('product_id', id);
    const { error } = await client.from('products').delete().eq('id', id);
    if (error) {
      console.warn('[Supabase] delete product error:', error);
      throw new Error(error.message);
    }
  }

  if (targetDb) {
    try {
      targetDb.prepare('DELETE FROM product_bike_compatibility WHERE product_id = ?').run(id);
      targetDb.prepare('DELETE FROM products WHERE id = ?').run(id);
    } catch (e) {}
  }

  return true;
}

/**
 * Toggle product active status in Supabase and sync to local db
 */
export async function toggleSupabaseProduct(id: string, targetDb?: any): Promise<boolean> {
  let newStatus = true;
  if (client) {
    const { data } = await client.from('products').select('is_active').eq('id', id).maybeSingle();
    newStatus = data ? !data.is_active : true;
    await client.from('products').update({ is_active: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
  } else if (targetDb) {
    const prod = targetDb.prepare('SELECT is_active FROM products WHERE id = ?').get(id) as any;
    newStatus = prod?.is_active === 1 ? false : true;
  }

  if (targetDb) {
    try {
      targetDb.prepare('UPDATE products SET is_active = ? WHERE id = ?').run(newStatus ? 1 : 0, id);
    } catch (e) {}
  }

  return newStatus;
}

/**
 * Fetch all admin orders from Supabase
 */
export async function getSupabaseAdminOrders(status?: string, search?: string): Promise<any[] | null> {
  if (!client) return null;
  try {
    let query = client.from('orders').select('*').order('created_at', { ascending: false });

    if (status && status !== 'ALL') {
      query = query.eq('status', status);
    }

    if (search && search.trim() !== '') {
      const q = search.trim();
      query = query.or(`invoice_number.ilike.%${q}%,customer_name.ilike.%${q}%,customer_phone.ilike.%${q}%`);
    }

    const { data: orders, error: oErr } = await query;
    if (oErr || !orders) return null;

    const orderIds = orders.map((o: any) => o.id);
    let itemsMap = new Map<string, any[]>();
    if (orderIds.length > 0) {
      const { data: items } = await client.from('order_items').select('*').in('order_id', orderIds);
      if (items) {
        for (const it of items) {
          const arr = itemsMap.get(it.order_id) || [];
          arr.push(it);
          itemsMap.set(it.order_id, arr);
        }
      }
    }

    return orders.map((o: any) => {
      let customerNotes = o.customer_notes;
      if (!customerNotes && o.shipping_address) {
        const match = o.shipping_address.match(/\(Catatan:\s*(.+?)\)/i);
        if (match) customerNotes = match[1].trim();
      }
      return {
        ...o,
        customer_notes: customerNotes || null,
        items: itemsMap.get(o.id) || [],
      };
    });
  } catch (err) {
    console.warn('[Supabase] getSupabaseAdminOrders exception:', err);
    return null;
  }
}

/**
 * Fetch admin analytics from Supabase
 */
export async function getSupabaseAnalytics(): Promise<any | null> {
  if (!client) return null;
  try {
    const { data: ords } = await client.from('orders').select('grand_total, status');
    const { data: lowStock } = await client.from('products').select('*').lt('stock', 5).eq('is_active', true);

    if (ords) {
      const paid = ords.filter((o: any) => ['PAID', 'SHIPPED', 'COMPLETED'].includes(o.status));
      const totalRevenue = paid.reduce((sum: number, o: any) => sum + (o.grand_total || 0), 0);
      const needShipping = ords.filter((o: any) => o.status === 'PAID').length;
      return {
        totalRevenue,
        needShipping,
        lowStockCount: lowStock ? lowStock.length : 0,
        lowStockItems: lowStock ? lowStock.map(mapSupabaseProduct) : [],
        totalOrders: ords.length,
      };
    }
    return null;
  } catch (err) {
    return null;
  }
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

