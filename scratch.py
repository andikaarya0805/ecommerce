import json
import os
from playwright.sync_api import sync_playwright

def scrape_shopee_playwright(url):
    print("\n" + "="*60)
    print(" [*] SHOPEE AUTO SCRAPER (STEALTH & PERSISTENT SESSION)")
    print("="*60)
    
    user_data_dir = os.path.join(os.path.dirname(__file__), ".shopee_profile")
    
    with sync_playwright() as p:
        # Gunakan persistent context agar login & cookie tersimpan
        # Jadi gak perlu bolak-balik beresin CAPTCHA tiap run!
        context = p.chromium.launch_persistent_context(
            user_data_dir=user_data_dir,
            headless=False,
            channel="chrome", # Pakai Chrome asli jika ada, fallback Chromium
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-setuid-sandbox",
            ],
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            viewport={"width": 1366, "height": 768},
            locale="id-ID",
            timezone_id="Asia/Jakarta",
        )
        
        cookie_file = os.path.join(os.path.dirname(__file__), ".shopee_cookie.txt")
        if os.path.exists(cookie_file):
            with open(cookie_file, "r", encoding="utf-8") as f:
                cookie_str = f.read().strip()
            cookies = []
            for pair in cookie_str.split(";"):
                if "=" in pair:
                    k, v = pair.split("=", 1)
                    cookies.append({"name": k.strip(), "value": v.strip(), "domain": ".shopee.co.id", "path": "/"})
            if cookies:
                context.add_cookies(cookies)

        page = context.pages[0] if context.pages else context.new_page()
        
        # Samarkan flag bot navigator.webdriver
        page.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            window.__name = (target) => target;
        """)

        product_raw_data = {}

        def handle_response(response):
            u = response.url
            # Shopee modern endpoint: pdp/get_pc atau item/get
            if any(endpoint in u for endpoint in ["/api/v4/pdp/get_pc", "/api/v4/item/get", "/api/v4/item/get_pdp_summary", "/api/v4/product/get_pc"]):
                if response.status == 200:
                    try:
                        res_json = response.json()
                        data = res_json.get("data")
                        if data:
                            print(f"[+] Berhasil menangkap data API Shopee: {u.split('?')[0]}")
                            product_raw_data["payload"] = data
                    except Exception:
                        pass

        page.on("response", handle_response)

        print(f"[*] Mengakses URL: {url}")
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=45000)
        except Exception as e:
            print(f"[!] Goto warning: {e}")

        # Beri jeda sebentar untuk render
        page.wait_for_timeout(3000)

        # Cek apakah terhalang CAPTCHA atau butuh verifikasi
        if not product_raw_data:
            print("\n" + "!"*60)
            print(" [INFO] Jika muncul puzzle/CAPTCHA slider di browser,")
            print(" silakan geser sampai halaman produk terbuka sempurna.")
            print(" (Setelah beres sekali, session akan tersimpan di .shopee_profile)")
            print("!"*60)
            input("Tekan [ENTER] di terminal jika produk sudah tampil di layar...")
            page.wait_for_timeout(3000)

        # Ambil gambar dari DOM (thumbnail carousel, background-image, ld+json) sebelum context ditutup
        dom_images = []
        try:
            dom_images = page.evaluate("""() => {
                const cleanUrl = (raw) => {
                    if (!raw) return '';
                    let s = raw.trim();
                    if (s.startsWith('//')) s = 'https:' + s;
                    return s.replace(/_(tn|m|s|b|xs|xxs)$/i, '').replace(/@.*$/, '');
                };

                const urls = [];
                const seen = new Set();
                const banned = [
                    'alfamart', 'alfamidi', 'indomaret', 'spaylater', 'shopeepay',
                    'bca', 'mandiri', 'bri', 'bni', 'cimb', 'permata',
                    'payment', 'pembayaran', 'metode', 'bank',
                    'voucher', 'cashback', 'gratis_ongkir', 'ongkir', 'free_shipping',
                    'avatar', 'logo', 'seller', 'rating', 'star', 'badge', 'banner',
                    'mall_badge', 'star_seller', 'guarantee', 'garansi', 'official_store',
                    'icon', 'arrow', 'blank.gif'
                ];
                const isBanned = (u) => banned.some(k => u.toLowerCase().includes(k));

                // A. Ambil dari ld+json Schema.org
                document.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
                    try {
                        const parsed = JSON.parse(s.textContent || '{}');
                        const img = parsed.image || (parsed['@graph'] && parsed['@graph'].find(g => g.image)?.image);
                        if (Array.isArray(img)) {
                            img.forEach(u => {
                                const c = cleanUrl(u);
                                if (c && c.includes('susercontent.com/file/') && !isBanned(c) && !seen.has(c)) {
                                    seen.add(c);
                                    urls.push(c);
                                }
                            });
                        } else if (typeof img === 'string') {
                            const c = cleanUrl(img);
                            if (c && c.includes('susercontent.com/file/') && !isBanned(c) && !seen.has(c)) {
                                seen.add(c);
                                urls.push(c);
                            }
                        }
                    } catch(e) {}
                });

                // B. Ambil dari semua elemen gambar & thumbnail background-image galeri
                const els = document.querySelectorAll('img, [style*="background"]');
                els.forEach(el => {
                    let raw = '';
                    if (el.tagName === 'IMG') {
                        raw = el.currentSrc || el.src || el.getAttribute('data-src') || '';
                    } else {
                        const st = el.getAttribute('style') || '';
                        const m = st.match(/url\\(["']?(https?:\\/\\/[^"')]+)["']?\\)/);
                        if (m) raw = m[1];
                    }
                    if (!raw || !raw.includes('susercontent.com/file/')) return;
                    if (isBanned(raw)) return;

                    const c = cleanUrl(raw);
                    if (!seen.has(c)) {
                        seen.add(c);
                        urls.push(c);
                    }
                });

                return urls;
            }""")
        except Exception as e:
            print(f"[!] Warning DOM images extraction: {e}")

        context.close()

        if not product_raw_data or "payload" not in product_raw_data:
            print("\n[!] Data API tidak tertangkap. Coba gunakan fitur 'Tarik Produk' langsung di Admin Panel (localhost:3000/admin).")
            return None

        data = product_raw_data["payload"]
        item = data.get("item", data)

        # Kumpulkan gambar dari API
        raw_images = item.get("images", []) or data.get("images", []) or []
        all_images = []
        for h in raw_images:
            if h and isinstance(h, str):
                u = h if h.startswith("http") else f"https://down-id.img.susercontent.com/file/{h}"
                if u not in all_images:
                    all_images.append(u)

        # Tambahkan gambar utama jika belum ada di list
        main_img = item.get("image")
        if main_img and isinstance(main_img, str):
            main_url = main_img if main_img.startswith("http") else f"https://down-id.img.susercontent.com/file/{main_img}"
            if main_url not in all_images:
                all_images.insert(0, main_url)

        # Gabungkan dengan gambar dari galeri DOM (membersihkan thumbnail _tn menjadi HD)
        for dom_u in dom_images:
            if dom_u not in all_images:
                all_images.append(dom_u)

        raw_price = item.get("price", item.get("price_min", 0))
        price = raw_price / 100000 if raw_price > 1000000 else raw_price

        parsed_data = {
            "nama_produk": item.get("name"),
            "deskripsi": item.get("description"),
            "harga": price,
            "stok_total": item.get("stock", 0),
            "terjual": item.get("historical_sold", item.get("sold", 0)),
            "rating": item.get("item_rating", {}).get("rating_star", 5.0),
            "gambar_utama": all_images[0] if all_images else None,
            "semua_gambar": all_images,
            "variasi_produk": []
        }

        # Parsing variasi multi-tier
        tier_variations = item.get("tier_variations", [])
        models = item.get("models", [])

        if tier_variations and models:
            for model in models:
                tier_indices = model.get("tier_index", [])
                model_name = " - ".join([
                    tier_variations[i]["options"][idx]
                    for i, idx in enumerate(tier_indices)
                    if i < len(tier_variations) and idx < len(tier_variations[i]["options"])
                ])
                m_price = model.get("price", 0)
                parsed_data["variasi_produk"].append({
                    "nama_variasi": model_name or model.get("name"),
                    "harga_variasi": m_price / 100000 if m_price > 1000000 else m_price,
                    "stok_variasi": model.get("stock", 0),
                    "model_id": model.get("modelid")
                })

        return parsed_data

if __name__ == "__main__":
    url_target = "https://shopee.co.id/Cylinder-Block-Blok-Head-Mio-Karbu-Fino-Karbu-Nuovo-Klep-24-28-26-30-27-31-23-27-mm-AH1-Racing-i.1533491129.28690451490"
    hasil = scrape_shopee_playwright(url_target)
    if hasil:
        print("\n[SUKSES] Data Berhasil Diambil:")
        print(json.dumps(hasil, indent=2, ensure_ascii=False))