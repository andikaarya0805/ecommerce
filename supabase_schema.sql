-- =====================================================================
-- SUPABASE SCHEMA: Web E-Commerce (Jawir Garage Racing Speedshop)
-- Sesuai Dokumen PRD Web E-Commerce Versi 2.0
-- =====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABEL USERS (Autentikasi & Role)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT ('u-' || replace(uuid_generate_v4()::text, '-', '')),
  username TEXT UNIQUE NOT NULL,3
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABEL CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  bike_filter TEXT,
  category_filter TEXT,
  badge_text TEXT,
  count INTEGER NOT NULL DEFAULT 0,
  icon TEXT NOT NULL,
  tagline TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TABEL BIKES (Garasi Motor Pengguna)
CREATE TABLE IF NOT EXISTS bikes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  year TEXT NOT NULL,
  cc TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TABEL PRODUCTS (Katalog Produk & Stok)
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY DEFAULT ('prod-' || replace(uuid_generate_v4()::text, '-', '')),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('paket-upgrade', 'cvt', 'pengereman', 'kaki-kaki', 'mesin', 'aksesoris')),
  compatibility_text TEXT NOT NULL,
  fitment_tag TEXT NOT NULL DEFAULT 'Plug & Play (PnP)',
  price INTEGER NOT NULL CHECK (price >= 0),
  original_price INTEGER CHECK (original_price >= 0),
  discount_percent INTEGER CHECK (discount_percent >= 0 AND discount_percent <= 100),
  promo_tag TEXT,
  rating NUMERIC(3, 1) NOT NULL DEFAULT 5.0,
  sold_count INTEGER NOT NULL DEFAULT 0,
  image TEXT NOT NULL,
  description TEXT NOT NULL,
  specs JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_promo BOOLEAN NOT NULL DEFAULT false,
  is_paket_upgrade BOOLEAN NOT NULL DEFAULT false,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  weight_grams INTEGER NOT NULL DEFAULT 500 CHECK (weight_grams > 0),
  origin_city TEXT NOT NULL DEFAULT 'Jakarta Timur',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indeks Performa Produk
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- 6. TABEL PRODUCT_BIKE_COMPATIBILITY
CREATE TABLE IF NOT EXISTS product_bike_compatibility (
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  bike_type TEXT NOT NULL,
  PRIMARY KEY (product_id, bike_type)
);

-- 7. TABEL VOUCHERS (Promo & Diskon)
CREATE TABLE IF NOT EXISTS vouchers (
  id TEXT PRIMARY KEY DEFAULT ('vouch-' || replace(uuid_generate_v4()::text, '-', '')),
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('PERCENT', 'FIXED')),
  discount_value INTEGER NOT NULL CHECK (discount_value > 0),
  max_discount_amount INTEGER,
  min_purchase_amount INTEGER NOT NULL DEFAULT 0,
  quota INTEGER NOT NULL DEFAULT 100 CHECK (quota >= 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  valid_until TIMESTAMPTZ,
  badge TEXT,
  claimed BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);

-- 8. TABEL ORDERS (Pesanan, Mendukung Guest & Member)
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY DEFAULT ('ord-' || replace(uuid_generate_v4()::text, '-', '')),
  invoice_number TEXT UNIQUE NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL, -- NULLABLE untuk Guest Checkout
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  shipping_province TEXT,
  shipping_city TEXT,
  shipping_district TEXT,
  courier_name TEXT NOT NULL,
  courier_service TEXT NOT NULL,
  tracking_number TEXT, -- Nomor Resi Kurir
  subtotal_amount INTEGER NOT NULL CHECK (subtotal_amount >= 0),
  shipping_cost INTEGER NOT NULL CHECK (shipping_cost >= 0),
  voucher_id TEXT REFERENCES vouchers(id) ON DELETE SET NULL,
  voucher_code TEXT,
  discount_amount INTEGER NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  grand_total INTEGER NOT NULL CHECK (grand_total >= 0),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED')) DEFAULT 'PENDING',
  payment_method TEXT NOT NULL DEFAULT 'qris',
  payment_url TEXT,
  snap_token TEXT,
  biteship_order_id TEXT,
  biteship_tracking_id TEXT,
  destination_area_id TEXT,
  expired_at TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_invoice ON orders(invoice_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(customer_phone);

-- 9. TABEL ORDER_ITEMS (Snapshot Item Pesanan)
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY DEFAULT ('item-' || replace(uuid_generate_v4()::text, '-', '')),
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  product_name_snapshot TEXT NOT NULL,
  price_snapshot INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  subtotal INTEGER NOT NULL CHECK (subtotal >= 0)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- 10. TABEL CHAT_ROOMS & CHAT_MESSAGES (Live Chat & AI Chatbot Real-Time)
CREATE TABLE IF NOT EXISTS chat_rooms (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  user_name TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  unread_admin INTEGER DEFAULT 0,
  unread_user INTEGER DEFAULT 0,
  bot_enabled INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  sender_type TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  product_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_last_message_at ON chat_rooms(last_message_at DESC);

-- =====================================================================
-- 11. STORED PROCEDURE: CHECKOUT ATOMIK DENGAN ROW-LOCK (Zero Stock Discrepancy)
-- =====================================================================
CREATE OR REPLACE FUNCTION process_checkout_atomic(
  p_order_id TEXT,
  p_invoice_number TEXT,
  p_user_id TEXT,
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_customer_phone TEXT,
  p_shipping_address TEXT,
  p_shipping_province TEXT,
  p_shipping_city TEXT,
  p_shipping_district TEXT,
  p_courier_name TEXT,
  p_courier_service TEXT,
  p_shipping_cost INTEGER,
  p_voucher_code TEXT,
  p_payment_method TEXT,
  p_items JSONB,
  p_expired_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_item JSONB;
  v_prod RECORD;
  v_prod_id TEXT;
  v_qty INTEGER;
  v_subtotal INTEGER := 0;
  v_item_subtotal INTEGER;
  v_voucher RECORD;
  v_discount INTEGER := 0;
  v_grand_total INTEGER;
  v_voucher_id TEXT := NULL;
BEGIN
  -- 1. Validasi & Penguncian Stok Tiap Produk (FOR UPDATE)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_prod_id := v_item->>'productId';
    v_qty := (v_item->>'quantity')::INTEGER;

    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Kuantitas produk tidak valid';
    END IF;

    -- Kunci baris produk
    SELECT * INTO v_prod FROM products WHERE id = v_prod_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produk dengan ID % tidak ditemukan', v_prod_id;
    END IF;

    IF v_prod.stock < v_qty THEN
      RAISE EXCEPTION 'Stok untuk produk "%" tidak mencukupi (sisa: %, diminta: %)', v_prod.name, v_prod.stock, v_qty;
    END IF;

    -- Hitung ulang subtotal server-side (Zero-Trust)
    v_item_subtotal := v_prod.price * v_qty;
    v_subtotal := v_subtotal + v_item_subtotal;

    -- Potong stok produk
    UPDATE products SET stock = stock - v_qty, updated_at = NOW() WHERE id = v_prod_id;
  END LOOP;

  -- 2. Validasi & Penguncian Kuota Voucer (Jika ada)
  IF p_voucher_code IS NOT NULL AND p_voucher_code <> '' THEN
    SELECT * INTO v_voucher FROM vouchers WHERE code = p_voucher_code AND is_active = true FOR UPDATE;
    IF FOUND THEN
      IF v_voucher.valid_until IS NOT NULL AND v_voucher.valid_until < NOW() THEN
        RAISE EXCEPTION 'Kode voucer % sudah kedaluwarsa', p_voucher_code;
      END IF;

      IF v_voucher.used_count >= v_voucher.quota THEN
        RAISE EXCEPTION 'Kuota pemakaian voucer % sudah habis', p_voucher_code;
      END IF;

      IF v_subtotal < v_voucher.min_purchase_amount THEN
        RAISE EXCEPTION 'Minimal belanja untuk voucer % adalah Rp %', p_voucher_code, v_voucher.min_purchase_amount;
      END IF;

      IF v_voucher.discount_type = 'PERCENT' THEN
        v_discount := (v_subtotal * v_voucher.discount_value) / 100;
        IF v_voucher.max_discount_amount IS NOT NULL AND v_discount > v_voucher.max_discount_amount THEN
          v_discount := v_voucher.max_discount_amount;
        END IF;
      ELSE
        v_discount := v_voucher.discount_value;
      END IF;

      IF v_discount > v_subtotal THEN
        v_discount := v_subtotal;
      END IF;

      v_voucher_id := v_voucher.id;
      UPDATE vouchers SET used_count = used_count + 1 WHERE id = v_voucher.id;
    END IF;
  END IF;

  v_grand_total := (v_subtotal - v_discount) + p_shipping_cost;

  -- 3. Simpan Pesanan ke Tabel orders
  INSERT INTO orders (
    id, invoice_number, user_id, customer_name, customer_email, customer_phone,
    shipping_address, shipping_province, shipping_city, shipping_district,
    courier_name, courier_service, subtotal_amount, shipping_cost,
    voucher_id, voucher_code, discount_amount, grand_total, status,
    payment_method, expired_at
  ) VALUES (
    p_order_id, p_invoice_number, p_user_id, p_customer_name, p_customer_email, p_customer_phone,
    p_shipping_address, p_shipping_province, p_shipping_city, p_shipping_district,
    p_courier_name, p_courier_service, v_subtotal, p_shipping_cost,
    v_voucher_id, p_voucher_code, v_discount, v_grand_total, 'PENDING',
    p_payment_method, p_expired_at
  );

  -- 4. Simpan Snapshot Item ke order_items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_prod_id := v_item->>'productId';
    v_qty := (v_item->>'quantity')::INTEGER;
    SELECT * INTO v_prod FROM products WHERE id = v_prod_id;

    INSERT INTO order_items (
      order_id, product_id, product_name_snapshot, price_snapshot, quantity, subtotal
    ) VALUES (
      p_order_id, v_prod_id, v_prod.name, v_prod.price, v_qty, (v_prod.price * v_qty)
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'invoice_number', p_invoice_number,
    'order_id', p_order_id,
    'subtotal', v_subtotal,
    'discount', v_discount,
    'shipping_cost', p_shipping_cost,
    'grand_total', v_grand_total
  );
END;
$$;

-- =====================================================================
-- 11. STORED PROCEDURE: BATALKAN ORDER & KEMBALIKAN STOK & KUOTA VOUCER
-- =====================================================================
CREATE OR REPLACE FUNCTION cancel_order_atomic(p_order_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_ord RECORD;
  v_item RECORD;
BEGIN
  SELECT * INTO v_ord FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_ord.status = 'CANCELLED' THEN
    RETURN TRUE; -- Idempotent
  END IF;

  -- Kembalikan stok produk
  FOR v_item IN SELECT * FROM order_items WHERE order_id = p_order_id
  LOOP
    IF v_item.product_id IS NOT NULL THEN
      UPDATE products SET stock = stock + v_item.quantity WHERE id = v_item.product_id;
    END IF;
  END LOOP;

  -- Kembalikan kuota voucer jika ada
  IF v_ord.voucher_id IS NOT NULL THEN
    UPDATE vouchers SET used_count = GREATEST(0, used_count - 1) WHERE id = v_ord.voucher_id;
  END IF;

  -- Ubah status order menjadi CANCELLED
  UPDATE orders SET status = 'CANCELLED', updated_at = NOW() WHERE id = p_order_id;

  RETURN TRUE;
END;
$$;

-- =====================================================================
-- 12. STORED PROCEDURE: AUTO-CANCEL EXPIRED ORDERS (PENDING lewat batas bayar)
-- =====================================================================
CREATE OR REPLACE FUNCTION auto_cancel_expired_orders()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_ord RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_ord IN SELECT id FROM orders WHERE status = 'PENDING' AND expired_at < NOW()
  LOOP
    PERFORM cancel_order_atomic(v_ord.id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- =====================================================================
-- 13. SEED DATA AWAL (Katalog Produk, Kategori, Motor & Voucer)
-- =====================================================================

-- Seed Admin User (password: admin123)
INSERT INTO users (id, username, password_hash, role)
VALUES ('u-admin', 'admin', '$2b$10$Mt0X45W0S9c338e/cPC1Z.VaFOYsxkCw6ZtiH47gEtS14SXIQqcYe', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Seed Categories
INSERT INTO categories (id, title, subtitle, bike_filter, category_filter, badge_text, count, icon, tagline) VALUES
('cat-nmax', 'Upgrade NMAX / AEROX / LEXI', 'Maxi Yamaha Performance Center', 'nmax-aerox', NULL, 'Paling Laris', 24, 'Flame', 'Koleksi lengkap CVT, rem, knalpot dan suspensi Yamaha 155cc'),
('cat-vario', 'Upgrade VARIO / PCX / ADV', 'Honda eSP+ Performance Specialist', 'vario-pcx', NULL, 'Official PnP', 36, 'Zap', 'Solusi anti gredek, pulley 13.8 derajat, dan rem radial KTC'),
('cat-beat', 'Upgrade BEAT / SCOOPY / GENIO', 'Harian Ngacir & Tanjakan Enteng', 'beat-scoopy', NULL, 'Paket Hemat', 28, 'Sparkles', 'Racikan kirian roller BRT & mangkok bolong motor sejuta umat'),
('cat-paket-cvt', 'Paket Komplit Upgrade CVT', 'Full Set Kirian Tinggal Pasang', NULL, 'paket-upgrade', 'Garansi 6 Bulan', 16, 'PackageCheck', 'Pulley + Mangkok + Roller BRT + Per CVT racikan dyno test TDR'),
('cat-mangkok-pulley', 'Mangkok + Pulley Set', 'Bahan OEM Bubut CNC Presisi', NULL, 'cvt', 'Presisi CNC', 22, 'Disc', 'Sudut derajat 13.5° - 13.8° dengan interlock anti selip'),
('cat-kaki-pengereman', 'Kaki-Kaki & Pengereman (Shock, Master Rem, Velg)', 'Safety & Visual Ganteng Maksimal', NULL, 'pengereman', 'Billet CNC', 19, 'ShieldCheck', 'Master rem KTC Corsa Corta 16mm, disc floating, shock klik rebound')
ON CONFLICT (id) DO NOTHING;

-- Seed Bikes
INSERT INTO bikes (id, name, type, year, cc) VALUES
('b-1', 'Honda Vario 160 eSP+', 'vario-pcx', '2023', '160cc'),
('b-2', 'Yamaha All New NMAX Connected', 'nmax-aerox', '2022', '155cc'),
('b-3', 'Honda Beat Deluxe LED', 'beat-scoopy', '2024', '110cc'),
('b-4', 'Yamaha Aerox 155 Cyber City', 'nmax-aerox', '2023', '155cc'),
('b-5', 'Honda Scoopy Prestige Smartkey', 'beat-scoopy', '2023', '110cc'),
('b-6', 'Yamaha Mio Sporty 5TL', 'mio-series', '2008', '115cc')
ON CONFLICT (id) DO NOTHING;

-- Seed Vouchers
INSERT INTO vouchers (id, code, title, subtitle, discount_type, discount_value, min_purchase_amount, max_discount_amount, quota, used_count, badge, claimed, is_active) VALUES
('vouch-1', 'JAWIR20K', 'Potongan Rp20.000', 'Min. Belanja Rp200RB', 'FIXED', 20000, 200000, 20000, 100, 0, 'Spesial D2C', false, true),
('vouch-2', 'ONGKIRFREE', 'Gratis Ongkir Rp15.000', 'Min. Belanja Rp150RB', 'FIXED', 15000, 150000, 15000, 200, 0, 'Se-Nusantara', false, true),
('vouch-3', 'CVTRACING50K', 'Potongan Rp50.000', 'Khusus Paket Upgrade CVT', 'FIXED', 50000, 500000, 50000, 50, 0, 'Spesial Kirian', false, true),
('vouch-4', 'JAWIR99', 'Diskon Ekstra 10%', 'Maks. Rp30.000 Tanpa Min. Belanja', 'PERCENT', 10, 0, 30000, 500, 0, '9.9 Sale', false, true)
ON CONFLICT (id) DO NOTHING;

-- Seed Products
INSERT INTO products (id, name, slug, category, compatibility_text, fitment_tag, price, original_price, discount_percent, promo_tag, rating, sold_count, image, description, specs, is_promo, is_paket_upgrade, stock, weight_grams, origin_city, is_active) VALUES
('prod-1', 'Super Roller BRT Black Diamond - Vario 125 / PCX / Beat Deluxe', 'super-roller-brt-black-diamond-vario-pcx-beat', 'cvt', 'Vario 125/150/160, PCX 150/160, Beat Deluxe/ESP', 'Plug & Play (PnP)', 95000, 135000, 30, 'Promo 30%', 4.9, 4210, '/images/brt_super_roller_1789096443716.jpg', 'Roller performa tinggi BRT Black Diamond dengan material teflon komposit anti-aus hingga 20.000 KM. Akselerasi spontan tanpa merusak pulley rumah roller.', '{"Material":"Black Diamond High-Grade Composite Teflon","Ukuran":"20x15 mm (Tersedia 9g, 10g, 11g, 12g, 13g)","Ketahanan Suhu":"Hingga 300°C","Kelengkapan":"1 Set (6 Pcs Roller Presisi BRT Original + Kemasan Merah BRT)"}'::jsonb, true, false, 44, 200, 'Jakarta Timur', true),
('prod-2', 'Master Rem KTC Corsa Corta 16mm Radial - Handle Billet CNC + Tabung Minyak Rem', 'master-rem-ktc-corsa-corta-16mm-radial', 'pengereman', 'Universal Matic & Sport (Vario, NMAX, Aerox, PCX, Ninja)', 'Plug & Play (PnP)', 780000, 1050000, 26, 'Best Seller', 5.0, 1250, '/images/ktc_master_rem_1789096462600.jpg', 'Master rem radial KTC Corsa Corta diameter piston 16mm dengan tuas rem CNC adjustable dan tabung minyak rem smoke transparan. Gigitan rem sangat pakem, progresif, dan anti-fading.', '{"Tipe Master":"Radial Piston 16mm Hard Anodized","Tuas / Lever":"Billet CNC Foldable Adjustable Crimson Red","Tabung Minyak":"Smoke Transparent Reservoir + Breket Stainless & Selang","Kelengkapan":"Master rem kanan, switch rem, tabung minyak, baut banjo"}'::jsonb, true, false, 16, 750, 'Jakarta Timur', true),
('prod-3', 'TDR CVT Full Upgrade Pack - Pulley, Mangkok Bolong, Per CVT & Roller Racing', 'tdr-cvt-full-upgrade-pack', 'paket-upgrade', 'Vario 125/150/160, PCX 150/160, NMAX, Aerox 155', 'Plug & Play (PnP)', 685000, 920000, 26, 'Paket Hemat', 4.9, 2310, '/images/tdr_cvt_kit_1789096476924.jpg', 'Paket komplit kirian performa tinggi TDR Racing. Terdiri dari variator pulley bubut interlock, mangkok ganda bolong anti-gredek, roller teflon, dan per CVT racing dalam kemasan box kuning khas TDR.', '{"Isi Box TDR":"Pulley Rumah Roller, Kipas Pulley 13.8°, Mangkok Bolong Kartel, Per CVT 1500 RPM, Roller Set","Garansi":"Anti Gredek 6 Bulan / Uang Kembali","Hasil Dyno":"Tenaga naik +1.8 HP, nafas panjang tanpa loyo"}'::jsonb, true, true, 25, 1800, 'Jakarta Timur', true),
('prod-4', 'Akrapovič Racing Exhaust Full System - Titanium Megaphone Header Stainless 304', 'akrapovic-racing-exhaust-full-system-vario-pcx-nmax', 'mesin', 'Vario 160, PCX 160, NMAX All New 2020-2024, Aerox Connected', 'Plug & Play (PnP)', 1850000, 2450000, 24, 'Promo 24%', 5.0, 680, '/images/akrapovic_exhaust_1789096491594.jpg', 'Knalpot racing full system dengan pipa header titanium las cacing las argon rapi dan silencer titanium hexagonal bertutup carbon fiber asli. Suara bass padat, adem di RPM rendah, gahar bertenaga di RPM atas.', '{"Material Header":"Titanium Pie-Cut Welded Header Pipe","Material Silencer":"Titanium Alloy Shell dengan Real Matte Carbon End Cap","Karakter Suara":"Bass Adem Bulat Padat (Dilengkapi DB Killer Lepas-Pasang)","Fitment":"100% PnP Presisi Dudukan Knalpot Standar"}'::jsonb, true, false, 10, 3200, 'Jakarta Timur', true),
('prod-5', 'Mangkok Kampas Ganda Racing Custom Bolong CNC Anti Gredek - Beat / Scoopy / Vario', 'mangkok-kampas-ganda-racing-custom-cnc-anti-gredek', 'cvt', 'Honda Beat Karbu/ESP/Deluxe, Scoopy, Genio, Vario 125/150', 'Plug & Play (PnP)', 195000, 260000, 25, 'Paket Hemat', 4.9, 3840, '/images/mangkok_ganda_cnc_1789096538694.jpg', 'Mangkok kopling ganda bubut presisi CNC dengan pola lubang heksagonal buang debu kampas dan kartel mikro anti-selip. Solusi paten melenyapkan penyakit gredek matic saat tarikan awal.', '{"Material":"Baja Tempa OEM Bubut CNC Presisi Jawir Garage","Fitur":"Lubang Buang Debu Hexagonal + Kartel Halus Anti Selip","Garansi":"Bebas Gredek 100% PnP"}'::jsonb, false, false, 38, 900, 'Jakarta Timur', true),
('prod-6', 'Shockbreaker Tabung Atas Racing Click Rebound 330mm / 310mm Jawir Platinum Series', 'shockbreaker-tabung-atas-racing-click-rebound', 'kaki-kaki', 'Vario 125/150/160, Beat, Scoopy, Mio Sporty, Fazzio', 'Plug & Play (PnP)', 890000, 1250000, 29, 'Best Seller', 5.0, 920, '/images/racing_rear_shock_1789096521276.jpg', 'Suspensi belakang tabung gas nitrogen dengan setelan 24 klik rebound adjustable dan preload pegas. Bikin motor anteng di tikungan kencang dan empuk saat boncengan.', '{"Tipe":"Gas Monotube Tabung Atas Billet CNC","Fitur":"24 Klik Rebound + Preload Threaded Nut","Ukuran":"330mm (Vario/PCX) & 310mm (Beat/Scoopy/Mio)"}'::jsonb, true, false, 14, 2100, 'Jakarta Timur', true),
('prod-7', 'Paket Kirian Komplit Upgrade NMAX / Aerox / Lexi 155cc - Top Speed & Torsi', 'paket-kirian-komplit-upgrade-nmax-aerox-lexi-155cc', 'paket-upgrade', 'All New NMAX, Old NMAX, Aerox 155 Connected, Lexi', 'Plug & Play (PnP)', 520000, 720000, 28, 'Best Seller', 4.9, 2740, '/images/tdr_cvt_kit_1789096476924.jpg', 'Paket khusus Maxi Yamaha dengan sudut kemiringan pulley presisi CNC 13.5° interlock. Meningkatkan top speed hingga +15 km/jam di jalan datar.', '{"Isi Paket":"Pulley Custom Keruk Jalur CNC, Mangkok Ganda Ringan Anti Selip, Per TDR 1500 RPM, Roller Kawahara Mix","Torsi":"Naik +1.4 Nm pada 6500 RPM","Fitment":"Langsung pasang di kruk as Yamaha 155"}'::jsonb, true, true, 18, 1900, 'Jakarta Timur', true),
('prod-8', 'Paket Upgrade CVT Full Set Jawir Garage - Anti Gredek Vario & PCX Series', 'paket-upgrade-cvt-full-set-jawir-garage-vario-pcx', 'paket-upgrade', 'Vario 125 / 150 / 160 & PCX 150 / 160', 'Plug & Play (PnP)', 485000, 650000, 25, 'Paket Hemat', 5.0, 3120, '/images/tdr_cvt_kit_1789096476924.jpg', 'Racikan kirian legendaris Jawir Garage. Melenyapkan getaran gredek 100%, tarikan bawah responsif, dan nafas tengah-atas ngisi terus.', '{"Isi Paket":"Pulley Bubut 13.8°, Mangkok Ganda Bolong Kartel, Kampas Carbon, Per CVT 1500 RPM, Per Sentri 1000 RPM, Roller BRT","Garansi":"Anti Gredek 6 Bulan / Uang Kembali","Pemasangan":"100% PnP tanpa ubah crankcase"}'::jsonb, true, true, 21, 1850, 'Jakarta Timur', true)
ON CONFLICT (id) DO NOTHING;

-- Seed Compatibility
INSERT INTO product_bike_compatibility (product_id, bike_type) VALUES
('prod-1', 'vario-pcx'), ('prod-1', 'beat-scoopy'),
('prod-2', 'vario-pcx'), ('prod-2', 'nmax-aerox'), ('prod-2', 'beat-scoopy'), ('prod-2', 'sport-bebek'),
('prod-3', 'vario-pcx'), ('prod-3', 'nmax-aerox'),
('prod-4', 'vario-pcx'), ('prod-4', 'nmax-aerox'),
('prod-5', 'beat-scoopy'), ('prod-5', 'vario-pcx'),
('prod-6', 'vario-pcx'), ('prod-6', 'beat-scoopy'), ('prod-6', 'mio-series'),
('prod-7', 'nmax-aerox'),
('prod-8', 'vario-pcx')
ON CONFLICT DO NOTHING;

-- Selesai! Schema Supabase dan Seed Data Siap Digunakan.
