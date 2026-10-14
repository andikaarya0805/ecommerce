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

export const supabase = client;
