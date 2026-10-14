-- =====================================================================
-- FIX SUPABASE PERMISSIONS (Error 42501: permission denied for table ...)
-- Jalankan seluruh script ini di:
-- Supabase Dashboard -> Project Anda -> SQL Editor -> New Query -> Run
-- =====================================================================

-- 1. Berikan hak akses skema public ke role API Supabase
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- 2. Berikan izin penuh atas semua tabel, sequence, dan function yang sudah ada
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- 3. Atur default privileges agar tabel-tabel baru otomatis memiliki izin yang sama
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 4. Pastikan tabel tidak terblokir oleh Row Level Security (RLS) tanpa policy
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bikes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS products DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS product_bike_compatibility DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS vouchers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS order_items DISABLE ROW LEVEL SECURITY;

-- 5. Berikan kepemilikan tabel ke role postgres
ALTER TABLE IF EXISTS users OWNER TO postgres;
ALTER TABLE IF EXISTS categories OWNER TO postgres;
ALTER TABLE IF EXISTS bikes OWNER TO postgres;
ALTER TABLE IF EXISTS products OWNER TO postgres;
ALTER TABLE IF EXISTS product_bike_compatibility OWNER TO postgres;
ALTER TABLE IF EXISTS vouchers OWNER TO postgres;
ALTER TABLE IF EXISTS orders OWNER TO postgres;
ALTER TABLE IF EXISTS order_items OWNER TO postgres;

-- 6. Verifikasi: Query uji coba
SELECT 'Izin Supabase Berhasil Diperbaiki!' AS status, count(*) AS total_products FROM products;
