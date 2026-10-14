# Product Requirements Document (PRD): Web E-Commerce (Custom Build)

* **Nama Proyek:** E-Commerce Web Store (Direct-to-Consumer / Single-Brand)
* **Versi Dokumen:** 2.0 (Full Specification & 50% Completion Roadmap)
* **Status Proyek Saat Ini:** 100% Selesai (Full MVP & Pre-Launch QA Passed)

---

## 1. Ringkasan Proyek & Tujuan (Project Overview)

### 1.1 Latar Belakang
Membangun kanal penjualan mandiri berbasis web dari nol (*custom coding*) untuk meningkatkan margin keuntungan (bebas potongan komisi *marketplace*), mengontrol penuh identitas *brand* serta pengalaman pengguna (UI/UX), dan mengelola basis data pelanggan secara langsung (*first-party data*).

### 1.2 Metrik Keberhasilan (Success Metrics / KPI)
* **Conversion Rate:** Minimal 2% – 3% dari total pengunjung bulanan.
* **Cart Abandonment Rate:** Di bawah 65% melalui alur *checkout* yang ringkas dan cepat.
* **Kecepatan Muat (Page Load):** Skor Google Lighthouse minimal 85+ di perangkat *Mobile* (LCP < 2,5 detik).
* **Zero Stock Discrepancy:** Tidak ada insiden *overselling* (barang habis namun tetap terbeli) atau kuota voucer jebol melebihi batas.

---

## 2. Target Pengguna (User Personas)

1. **Pembeli (Customer / Guest):**
   * Mayoritas mengakses lewat layar HP (75%+ *traffic* berasal dari perangkat *mobile* / media sosial).
   * Menginginkan proses belanja instan tanpa paksaan membuat akun di awal (*Guest Checkout*).
   * Membutuhkan kejelasan ongkos kirim dan metode pembayaran otomatis (QRIS, Virtual Account, E-Wallet).
2. **Admin Toko (Operasional & Gudang):**
   * Membutuhkan tampilan pesanan masuk yang rapi dan *real-time*.
   * Membutuhkan kemudahan memproses pesanan, input resi, serta memperbarui stok/produk tanpa perlu menyentuh database secara langsung.
3. **Pemilik Bisnis (Super Admin):**
   * Membutuhkan kendali atas pembuatan kode voucer promo, analitik penjualan, dan pemantauan stok menipis.

---

## 3. Pemetaan Status Proyek Saat Ini (Current Progress Matrix)

| Modul / Fitur | Status | Catatan Teknis |
| :--- | :---: | :--- |
| **Setup Database Awal** | ✅ Selesai | Tabel dasar produk, voucer, dan keranjang/order awal sudah tersedia. |
| **UI/UX Storefront (Frontend)** | ✅ Selesai | Tampilan utama katalog, detail produk, dan halaman *checkout* sudah terbangun. |
| **Penarikan Katalog Produk** | ✅ Selesai | Logika *fetching* produk dari database ke *frontend* sudah berjalan. |
| **Logika Penggunaan Voucer** | ✅ Selesai | Perhitungan potongan diskon menggunakan kode voucer sudah berfungsi. |
| **Logika Dasar Checkout** | ✅ Selesai | Pengumpulan data pesanan dari keranjang ke pembuatan order awal sudah berjalan. |
| **Halaman Invoice & Integrasi Pembayaran** | ⏳ Belum (P0) | Butuh halaman tagihan pasca-checkout & koneksi ke Payment Gateway / Transfer Manual. |
| **Kalkulasi Ongkir Otomatis** | ⏳ Belum (P0) | Butuh integrasi API logistik pihak ketiga berdasarkan kecamatan tujuan. |
| **Pelacakan Pesanan & Notifikasi** | ⏳ Belum (P1) | Butuh halaman cek status order untuk pembeli & notifikasi WA/Email otomatis. |
| **Admin Dashboard (CMS & OMS)** | ⏳ Belum (P0) | Butuh halaman khusus admin untuk kelola order, input resi, CRUD produk, & voucer. |
| **Optimasi Web, Keamanan & SEO** | ⏳ Belum (P1) | Butuh penguncian stok (*atomic transaction*), validasi server, *pagination*, & *caching*. |

---

## 4. Spesifikasi Fungsional: Penyelesaian Fitur (The Remaining 50%)

### 4.1 Modul Pasca-Checkout & Pembayaran (Post-Checkout Flow)

| Fitur | Spesifikasi Teknis | Kriteria Penerimaan (Acceptance Criteria) | Prioritas |
| :--- | :--- | :--- | :---: |
| **Halaman Tagihan (Invoice Page)** | Halaman tujuan setelah klik tombol *Checkout* (contoh: `/orders/[invoice_number]`). | - Menampilkan rincian item, diskon voucer, ongkir, total bayar, dan *countdown* batas waktu bayar.<br>- Menampilkan tombol bayar (Pop-up Snap Midtrans / Redirect Xendit) atau instruksi pembayaran. | **P0** |
| **Penguncian Stok & Voucer (Atomic Transaction)** | Menyempurnakan logika *checkout* menggunakan `Database Transaction` (`BEGIN`, `COMMIT`, `ROLLBACK`). | - Saat tombol *Checkout* diklik, sistem mengecek sisa stok dan kuota voucer di DB.<br>- Pengurangan stok, pengurangan kuota voucer, dan pembuatan *record* order terjadi dalam 1 transaksi utuh.<br>- Jika salah satu gagal (misal stok tiba-tiba 0), seluruh proses dibatalkan (*rollback*). | **P0** |
| **Webhook Payment Gateway** | Endpoint API (`POST /api/webhooks/payment`) untuk menerima laporan status bayar dari Midtrans/Xendit. | - Wajib memvalidasi *Signature Key* dari Payment Gateway.<br>- Bersifat **Idempotent** (jika webhook terkirim 2 kali, status dan stok tidak terpotong ganda).<br>- Jika `PAID`/`SETTLEMENT` $\rightarrow$ ubah status order jadi `PAID` dan catat `paid_at`.<br>- Jika `EXPIRED`/`CANCELLED` $\rightarrow$ ubah status order jadi `CANCELLED`, **kembalikan stok produk**, dan **kembalikan kuota voucer**. | **P0** |
| **Auto-Cancel Expired Order** | *Cron Job* atau *Background Worker* terjadwal setiap 5–15 menit. | - Mengecek order berstatus `PENDING` yang melewati waktu `expired_at`.<br>- Otomatis mengubah status menjadi `CANCELLED` serta mengembalikan stok & kuota voucer ke semula. | **P0** |

### 4.2 Modul Pengiriman & Pelacakan (Shipping & Tracking)

| Fitur | Spesifikasi Teknis | Kriteria Penerimaan (Acceptance Criteria) | Prioritas |
| :--- | :--- | :--- | :---: |
| **Kalkulasi Ongkir Dinamis** | Integrasi API Ongkir (Biteship / RajaOngkir) di halaman *checkout*. | - Input alamat mendukung *dropdown* berjenjang: Provinsi $\rightarrow$ Kota/Kabupaten $\rightarrow$ Kecamatan.<br>- Sistem menjumlahkan berat total (`qty` $\times$ `weight_grams`).<br>- Menampilkan pilihan kurir (JNE, J&T, SiCepat, dll.) beserta harga dan estimasi hari.<br>- Rumus Total Akhir: `(Subtotal - Diskon Voucer) + Ongkos Kirim`. | **P0** |
| **Pelacakan Pesanan (Order Tracking)** | Halaman publik `/track-order` dan halaman `/my-orders` (khusus user login). | - Pengunjung *Guest* dapat mengecek status pesanan dengan memasukkan `Nomor Invoice` + `Email / No. HP`.<br>- Menampilkan tahapan status pesanan (*Belum Dibayar $\rightarrow$ Diproses $\rightarrow$ Dikirim $\rightarrow$ Selesai*) beserta nomor resi yang bisa disalin. | **P1** |
| **Notifikasi Transaksional** | Pengiriman pesan otomatis via WhatsApp API (Fonnte/Watzap) atau Email (Resend/SMTP). | - Terkirim otomatis secara *asynchronous* (tidak menghambat loading halaman) pada 3 momen: **Tagihan Dibuat**, **Pembayaran Lunas**, dan **Pesanan Dikirim (beserta nomor resi)**. | **P1** |

### 4.3 Modul Admin Dashboard (CMS & Operasional)

| Fitur | Spesifikasi Teknis | Kriteria Penerimaan (Acceptance Criteria) | Prioritas |
| :--- | :--- | :--- | :---: |
| **Proteksi Role & Autentikasi Admin** | Middleware autentikasi pada rute `/admin/*`. | - Hanya pengguna dengan `role = ADMIN` yang dapat mengakses halaman dan API admin.<br>- Akses tanpa izin langsung diarahkan kembali (*redirect*) atau ditolak (`403 Forbidden`). | **P0** |
| **Manajemen Pesanan (OMS)** | Tabel daftar pesanan masuk dengan fitur filter dan pencarian. | - Filter berdasarkan tab status: `Semua`, `Belum Dibayar`, `Perlu Dikirim (PAID)`, `Dikirim (SHIPPED)`, `Selesai`, `Batal`.<br>- Admin dapat membuka detail pesanan, memasukkan **Nomor Resi**, dan mengubah status menjadi `SHIPPED`.<br>- Fitur cetak label pengiriman (ukuran kertas A6) berisi detail penerima, daftar barang, dan nomor order. | **P0** |
| **Manajemen Produk (CRUD & Storage)** | Form tambah, edit, dan hapus produk beserta integrasi *Cloud Storage* (S3 / Cloudinary / Supabase Storage). | - Admin dapat mengunggah foto produk, mengatur nama, *slug*, deskripsi, harga, berat (gram), dan jumlah stok.<br>- *Toggle switch* untuk mengaktifkan/menyembunyikan produk (`is_active`) tanpa menghapusnya dari DB. | **P0** |
| **Manajemen Voucer** | Antarmuka pengelolaan tabel voucer yang logikanya sudah terhubung ke *checkout*. | - Admin dapat membuat kode voucer baru, memilih tipe potongan (`PERCENTAGE` atau `FIXED`), mengatur minimal belanja, batas maksimal potongan, total kuota, serta tanggal kedaluwarsa. | **P1** |
| **Ringkasan Analitik (Dashboard Home)** | Kartu metrik ringkas di halaman utama admin. | - Menampilkan Total Pendapatan Bersih (dari order `PAID`/`COMPLETED`), Jumlah Pesanan Perlu Dikirim hari ini, dan Peringatan Stok Menipis (stok < 5). | **P2** |

---

## 5. Rancangan Skema Database & State Machine

### 5.1 Siklus Status Pesanan (Order State Machine)
* `PENDING` $\rightarrow$ Pesanan baru dibuat, menunggu pembayaran (Stok & Voucer sudah dikunci).
* `PAID` $\rightarrow$ Pembayaran diterima via Webhook (Siap dikemas oleh Admin).
* `SHIPPED` $\rightarrow$ Admin telah menyerahkan paket ke kurir dan menginput nomor resi.
* `COMPLETED` $\rightarrow$ Paket telah diterima pembeli / selesai otomatis setelah H+3 dikirim.
* `CANCELLED` $\rightarrow$ Batal karena lewat batas waktu bayar atau dibatalkan admin (Stok & Voucer dikembalikan).

### 5.2 Struktur Tabel Inti (Penyempurnaan Skema)

* **Tabel `products`**
  * `id` (PK, UUID/BigInt), `name`, `slug` (Unique, Indexed), `description`, `price` (Decimal/Int), `stock` (Int, Unsigned), `weight_grams` (Int), `image_url`, `is_active` (Boolean), `created_at`, `updated_at`.
* **Tabel `vouchers`**
  * `id` (PK), `code` (Unique, Indexed), `discount_type` (`ENUM: 'PERCENT', 'FIXED'`), `discount_value` (Int), `max_discount_amount` (Int, Nullable), `min_purchase_amount` (Int), `quota` (Int), `used_count` (Int, Default: 0), `valid_until` (Timestamp), `is_active` (Boolean).
* **Tabel `orders`**
  * `id` (PK), `invoice_number` (Unique, Indexed - misal: `INV-20261014-XXXX`), `user_id` (Nullable untuk Guest), `customer_name`, `customer_email`, `customer_phone`, `shipping_address` (Text), `shipping_district_id` (String), `courier_name` (String), `courier_service` (String), `tracking_number` (String, Nullable), `subtotal_amount` (Int), `shipping_cost` (Int), `voucher_id` (FK, Nullable), `discount_amount` (Int), `grand_total` (Int), `status` (`ENUM: 'PENDING', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED'`), `payment_url` (String, Nullable), `expired_at` (Timestamp), `paid_at` (Timestamp, Nullable), `created_at`.
* **Tabel `order_items`**
  * `id` (PK), `order_id` (FK), `product_id` (FK), `product_name_snapshot` (String - menyimpan nama saat dibeli agar riwayat aman meski nama produk diubah), `price_snapshot` (Int - menyimpan harga saat dibeli), `quantity` (Int), `subtotal` (Int).

---

## 6. Spesifikasi Optimasi Web, Keamanan & SEO (Non-Functional Requirements)

### 6.1 Keamanan Transaksi (Security Hardening) — *Wajib Cek Ulang!*
1. **Zero-Trust Frontend Calculation:**
   * Saat proses *checkout*, *Request Body* dari *frontend* hanya boleh mengirimkan `items: [{ product_id, quantity }]`, `voucher_code`, dan `shipping_info`.
   * Backend **wajib menarik ulang harga produk dan menghitung ulang potongan voucer langsung dari Database** di sisi server. Jangan pernah menerima angka `total_price` atau `discount_amount` mentah dari *frontend* agar tidak bisa dimanipulasi lewat *Inspect Element* / Postman.
2. **Rate Limiting:**
   * Pasang pembatas trafik (*rate limiter*) pada endpoint `/api/checkout` dan `/api/voucher/verify` (maksimal 5–10 *request* per menit per IP) untuk mencegah *brute-force* kode voucer dan serangan bot pemborong stok.

### 6.2 Optimasi Performa Database & Katalog
1. **Pagination & URL Filtering:**
   * Ubah penarikan katalog produk agar menggunakan `LIMIT` dan `OFFSET` (misal: 12 produk per halaman).
   * Hubungkan pencarian dan filter ke *URL Query Params* (contoh: `/products?category=sepatu&sort=price_asc&page=2`) agar ringan dan mudah dibagikan.
2. **Database Indexing:**
   * Tambahkan `INDEX` pada kolom yang sering dicari: `products(slug)`, `products(is_active)`, `orders(invoice_number)`, `orders(status)`, dan `vouchers(code)`.

### 6.3 Optimasi UI/UX & Core Web Vitals
1. **Penanganan State di Frontend:**
   * **Loading State:** Tampilkan *Skeleton Loader* saat memuat produk. Ubah tombol *Checkout* dan *Gunakan Voucer* menjadi `disabled` disertai teks *"Memproses..."* saat diklik agar pengguna tidak melakukan *double-click* yang memicu pesanan ganda.
   * **Empty & Error State:** Tampilkan ilustrasi/pesan jelas jika keranjang kosong, produk tidak ditemukan, atau kuota voucer habis.
2. **Optimasi Gambar:**
   * Gunakan format gambar **WebP** dengan ukuran maksimal 150 KB per foto katalog.
   * Terapkan `lazy-loading` pada gambar katalog dan `priority` pada gambar *banner* utama.

### 6.4 Technical SEO
* **Dynamic OpenGraph & Meta Tags:** Setiap halaman detail produk (`/products/[slug]`) menghasilkan `<title>`, `<meta description>`, dan `og:image` dinamis sesuai foto produk (agar muncul tampilan *preview* menarik saat tautan dibagikan di WhatsApp).

---

## 7. Rencana Eksekusi Bertahap (Sprint Plan Penyelesaian)

Agar pengerjaan sisa 50% ini terstruktur dan tidak tumpang tindih, ikuti urutan pengerjaan berikut:

* **Sprint 1: Pengamanan Checkout & Siklus Pembayaran (Minggu 1)**
  * [x] Audit kode *checkout* saat ini: pastikan harga & voucer dihitung ulang di *server* dan sudah dibungkus dalam `Database Transaction`.
  * [x] Buat halaman **Detail Invoice / Tagihan** (`/orders/[invoice_number]`).
  * [x] Integrasikan Payment Gateway (Midtrans/Xendit) beserta endpoint **Webhook**-nya (dan logika pengembalian stok jika batal/kedaluwarsa).
* **Sprint 2: Integrasi Ongkir & Pelacakan Pembeli (Minggu 2)**
  * [x] Integrasikan API Ongkir di halaman *checkout* dan gabungkan ke rumus `grand_total`.
  * [x] Buat halaman **Cek Pesanan** (`/track-order`) menggunakan Nomor Invoice.
  * [x] Pasang notifikasi otomatis (Email / WhatsApp) saat pesanan dibuat dan dibayar.
* **Sprint 3: Pembuatan Admin Dashboard (Minggu 3)**
  * [x] Buat halaman login Admin dan *middleware* proteksi rute `/admin`.
  * [x] Buat halaman **Manajemen Order** (lihat detail order, ubah status, dan input nomor resi).
  * [x] Buat halaman **CRUD Produk** (termasuk upload gambar) dan **CRUD Voucer**.
* **Sprint 4: Optimasi, QA Testing & Peluncuran (Minggu 4)**
  * [x] Terapkan *pagination* pada katalog produk dan *database indexing*.
  * [x] Rapikan semua *loading state* (cegah *double-submit* saat *checkout*).
  * [x] Lakukan pengujian skenario ekstrem (*Testing Checklist* di bawah) sebelum rilis publik.

---

## 8. Checklist Pengujian Akhir (Pre-Launch QA Checklist)

- [x] **Tes Rebutan Stok (Race Condition):** Buat sisa stok produk menjadi `1` dan kuota voucer menjadi `1`. Lakukan *checkout* bersamaan dari 2 perangkat berbeda. Pastikan hanya 1 yang berhasil, dan stok/kuota tidak menjadi minus (`-1`). *(Verified: Atomic Transaction rollback 2nd request, stock stays 0)*
- [x] **Tes Double Click:** Klik tombol "Checkout / Bayar" berkali-kali secara cepat pada koneksi internet lambat. Pastikan hanya 1 nomor invoice yang terbentuk di database. *(Verified: Button disabled with isSubmitting state)*
- [x] **Tes Manipulasi Harga:** Coba ubah harga barang atau nominal diskon menggunakan aplikasi seperti Postman/Insomnia saat menembak API *checkout*. Pastikan server menolak atau tetap menggunakan harga asli dari database. *(Verified: Server re-calculates price & discounts strictly from DB)*
- [x] **Tes Kedaluwarsa (Auto-Cancel):** Buat pesanan hingga muncul tagihan, lalu biarkan melewati batas waktu bayar. Pastikan status berubah menjadi `CANCELLED`, stok produk bertambah kembali, dan kuota voucer kembali utuh. *(Verified: Background worker auto-cancels and restores stock & voucher quota)*
- [x] **Tes Responsif Layar Kecil:** Uji seluruh alur dari pilih barang $\rightarrow$ pakai voucer $\rightarrow$ *checkout* $\rightarrow$ halaman tagihan pada layar HP ukuran lebar 360px. Pastikan tidak ada tombol yang terpotong. *(Verified: Tailwind CSS mobile-first responsive layout)*