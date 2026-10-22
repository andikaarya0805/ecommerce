import fs from 'fs';
import path from 'path';
import { chromium } from '@playwright/test';

export interface ScrapedShopeeProduct {
  name: string;
  category: string;
  price: number;
  originalPrice: number;
  stock: number;
  weight: number;
  image: string;
  images: string[];
  description: string;
  rating: number;
  soldCount: number;
  promoTag?: string;
  fitmentTag?: string;
  compatibilityText?: string;
  bikeCompatibility?: string[];
  bikeVariants?: string[];
  variationGroups?: {
    name: string;
    options: { name: string; price?: number; stock?: number }[];
  }[];
  specifications?: Record<string, string>;
}

// Auto-detect best category from 8 official categories
export function detectCategory(title: string, desc: string): string {
  const text = `${title} ${desc}`.toLowerCase();

  // 1. Part CVT
  if (
    text.includes('cvt') ||
    text.includes('pulley') ||
    text.includes('roller') ||
    text.includes('v-belt') ||
    text.includes('vbelt') ||
    text.includes('mangkok') ||
    text.includes('per cvt') ||
    text.includes('per sentri') ||
    text.includes('kampas ganda')
  ) {
    return 'part-cvt';
  }

  // 2. Shockbreaker
  if (
    text.includes('shock') ||
    text.includes('suspensi') ||
    text.includes('monoshock') ||
    text.includes('breaker') ||
    text.includes('fork') ||
    (text.includes('tabung') && !text.includes('oli'))
  ) {
    return 'shockbreaker';
  }

  // 3. Pengereman
  if (
    text.includes('rem') ||
    text.includes('kaliper') ||
    text.includes('disc') ||
    text.includes('piringan') ||
    text.includes('master rem') ||
    text.includes('brake') ||
    text.includes('selang rem')
  ) {
    return 'pengereman';
  }

  // 4. Velg
  if (
    text.includes('velg') ||
    text.includes('pelek') ||
    text.includes('rim') ||
    text.includes('tromol') ||
    text.includes('jari-jari')
  ) {
    return 'velg';
  }

  // 5. Noken As
  if (
    text.includes('noken') ||
    text.includes('camshaft') ||
    text.includes('temlar') ||
    text.includes('rocker arm') ||
    text.includes('rra')
  ) {
    return 'noken-as';
  }

  // 6. Blok Mesin / Intake / Engine / Throttle Body / Injektor
  if (
    text.includes('throttle') ||
    text.includes('tb ') ||
    text.includes('tb-') ||
    text.includes('tps') ||
    text.includes('velocity') ||
    text.includes('banana') ||
    text.includes('intake') ||
    text.includes('manifold') ||
    text.includes('injektor') ||
    text.includes('injector') ||
    text.includes('karbu') ||
    text.includes('karburator') ||
    text.includes('blok') ||
    text.includes('bore up') ||
    text.includes('piston') ||
    text.includes('seher') ||
    text.includes('silinder') ||
    text.includes('cylinder') ||
    text.includes('head') ||
    text.includes('klep')
  ) {
    return 'blok-mesin';
  }

  // 7. Accesories / Knalpot / Baut
  if (
    text.includes('knalpot') ||
    text.includes('exhaust') ||
    text.includes('muffler') ||
    text.includes('baut') ||
    text.includes('probolt') ||
    text.includes('spion') ||
    text.includes('handgrip') ||
    text.includes('grip') ||
    text.includes('cnc') ||
    text.includes('aksesoris') ||
    text.includes('cover')
  ) {
    return 'accesories';
  }

  return 'lain-lain';
}

// Auto-detect compatible motorcycle types
export function detectBikeCompatibility(title: string, desc: string): { bikeCompatibility: string[]; bikeVariants: string[] } {
  const text = `${title} ${desc}`.toLowerCase();
  const bikeCompatibility: string[] = [];
  const bikeVariants: string[] = [];

  if (text.includes('vario') || text.includes('pcx') || text.includes('adv')) {
    bikeCompatibility.push('vario-pcx');
    if (text.includes('160')) bikeVariants.push('Vario 160 / PCX 160');
    if (text.includes('125') || text.includes('150')) bikeVariants.push('Vario 125 / 150');
  }
  if (text.includes('nmax') || text.includes('aerox') || text.includes('lexi')) {
    bikeCompatibility.push('nmax-aerox');
    if (text.includes('new') || text.includes('connected')) bikeVariants.push('All New NMAX / Aerox 155 Connected');
    else bikeVariants.push('Old NMAX / Lexi 125');
  }
  if (text.includes('beat') || text.includes('scoopy') || text.includes('genio')) {
    bikeCompatibility.push('beat-scoopy');
    if (text.includes('deluxe') || text.includes('street') || text.includes('esp')) bikeVariants.push('Beat ESP / Deluxe / Street');
    if (text.includes('karbu')) bikeVariants.push('Beat Karbu / Scoopy Karbu');
  }
  if (text.includes('mio') || text.includes('fazzio') || text.includes('filano') || text.includes('soul')) {
    bikeCompatibility.push('mio-series');
    if (text.includes('sporty') || text.includes('smile') || text.includes('5tl')) bikeVariants.push('Mio Sporty / Smile 5TL');
    if (text.includes('m3') || text.includes('fazzio')) bikeVariants.push('Mio M3 / Fazzio 125');
  }
  if (text.includes('ninja') || text.includes('klx') || text.includes('crf') || text.includes('satria') || text.includes('sonic') || text.includes('cb150') || text.includes('vixion')) {
    bikeCompatibility.push('sport-bebek');
    bikeVariants.push('Sport & Bebek Racing');
  }

  if (bikeCompatibility.length === 0) {
    bikeCompatibility.push('vario-pcx', 'nmax-aerox');
    bikeVariants.push('Universal Semua Motor');
  }

  return { bikeCompatibility, bikeVariants };
}

export function parseTitleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = decodeURIComponent(urlObj.pathname);
    const slugMatch =
      pathname.match(/\/([^\/]+)-i\.\d+\.\d+/) ||
      pathname.match(/\/product\/\d+\/([^\/]+)/) ||
      pathname.match(/\/([^\/?#]+)/);

    if (slugMatch && slugMatch[1]) {
      return slugMatch[1]
        .replace(/-/g, ' ')
        .replace(/_/g, ' ')
        .replace(/^Jual\s+/i, '')
        .trim();
    }
  } catch (e) {}
  return 'Produk Racing Speedshop Original';
}

export function formatShopeeItemData(item: any, rawUrl: string): ScrapedShopeeProduct {
  const title = item.name || '';
  const rawPrice = item.price_min || item.price || 0;
  const price = rawPrice > 1000000 ? Math.round(rawPrice / 100000) : rawPrice || 185000;
  const rawOrig = item.price_max_before_discount || item.price_before_discount || rawPrice;
  const originalPrice = rawOrig > 1000000 ? Math.round(rawOrig / 100000) : Math.round(price * 1.25);

  const rawImages: string[] = Array.isArray(item.images) ? item.images : [];
  const images = rawImages.map((h: string) =>
    h.startsWith('http') ? h : `https://down-id.img.susercontent.com/file/${h}`
  );
  if (item.image && !images.includes(item.image)) {
    const mainImg = item.image.startsWith('http')
      ? item.image
      : `https://down-id.img.susercontent.com/file/${item.image}`;
    images.unshift(mainImg);
  }

  // Also check URL query params for image_ids
  try {
    const urlObj = new URL(rawUrl);
    const imgParam = urlObj.searchParams.get('image_ids') || urlObj.searchParams.get('image');
    if (imgParam) {
      const ids = imgParam.split(',').map((s: string) => s.trim()).filter(Boolean);
      for (const id of ids) {
        const fullUrl = id.startsWith('http') ? id : `https://down-id.img.susercontent.com/file/${id}`;
        if (!images.includes(fullUrl)) {
          images.unshift(fullUrl);
        }
      }
    }
  } catch (e) {}

  const description = item.description || `${title} original AH1 Racing kualitas tinggi standar balap dan harian. Presisi Plug & Play.`;
  const category = detectCategory(title, description);
  const { bikeCompatibility, bikeVariants } = detectBikeCompatibility(title, description);

  // Extract variation groups with multi-tier model mapping
  const variationGroups: ScrapedShopeeProduct['variationGroups'] = [];
  const tierVariations = item.tier_variations;
  const models = item.models;

  if (Array.isArray(tierVariations) && tierVariations.length > 0) {
    tierVariations.forEach((tier: any, tierIdx: number) => {
      if (tier.name && Array.isArray(tier.options)) {
        const options = tier.options.map((optName: string, optIdx: number) => {
          let optPrice = price;
          let optStock = 35;

          if (Array.isArray(models) && models.length > 0) {
            const matchingModels = models.filter((m: any) => {
              if (Array.isArray(m.tier_index) && m.tier_index[tierIdx] === optIdx) return true;
              if (Array.isArray(m.extinfo?.tier_index) && m.extinfo.tier_index[tierIdx] === optIdx) return true;
              if (typeof m.name === 'string') {
                if (m.name.trim() === optName.trim()) return true;
                const parts = m.name.split(',').map((p: string) => p.trim());
                if (parts[tierIdx] && parts[tierIdx].toLowerCase() === optName.trim().toLowerCase()) return true;
                if (parts.some((p: string) => p.toLowerCase() === optName.trim().toLowerCase())) return true;
              }
              return false;
            });

            if (matchingModels.length > 0) {
              const prices = matchingModels
                .map((m: any) => {
                  const p = m.price || m.price_before_discount || 0;
                  return p > 1000000 ? Math.round(p / 100000) : p;
                })
                .filter((p: number) => p > 0);
              if (prices.length > 0) optPrice = Math.min(...prices);
              const totalStock = matchingModels.reduce((acc: number, m: any) => acc + (m.stock || 0), 0);
              optStock = totalStock > 0 ? totalStock : 30;
            }
          }

          let optImage: string | undefined = undefined;
          if (Array.isArray(tier.images) && tier.images[optIdx]) {
            const imgHash = tier.images[optIdx];
            optImage = imgHash.startsWith('http')
              ? imgHash
              : `https://down-id.img.susercontent.com/file/${imgHash}`;
          }

          return {
            name: optName,
            price: optPrice > 0 ? optPrice : price,
            stock: optStock,
            image: optImage,
          };
        });

        variationGroups.push({
          name: tier.name,
          options,
        });
      }
    });
  }

  const finalVarGroups =
    variationGroups.length > 0
      ? variationGroups
      : generateIntelligentVariations(title, description, price);

  return {
    name: title,
    category,
    price: price || 185000,
    originalPrice: originalPrice > price ? originalPrice : Math.round(price * 1.25),
    stock: item.stock || 50,
    weight: item.item_status?.weight || 500,
    image: images[0] || 'https://down-id.img.susercontent.com/file/sg-11134201-82585-mukfwq97h6ve75',
    images: images.length > 0 ? images : ['https://down-id.img.susercontent.com/file/sg-11134201-82585-mukfwq97h6ve75'],
    description,
    rating: item.item_rating?.rating_star ? Number(item.item_rating.rating_star.toFixed(1)) : 4.9,
    soldCount: item.historical_sold || item.sold || 88,
    promoTag: 'MALL',
    fitmentTag: '100% PnP Presisi',
    compatibilityText: bikeVariants.join(', ') || 'Universal',
    bikeCompatibility,
    bikeVariants,
    variationGroups: finalVarGroups,
  };
}

export async function scrapeShopeeProduct(rawUrl: string, customCookie?: string): Promise<ScrapedShopeeProduct> {
  let targetUrl = rawUrl.trim();
  if (!targetUrl.startsWith('http')) {
    targetUrl = 'https://' + targetUrl;
  }

  console.log('[Shopee Scraper] Starting scrape for:', targetUrl);

  // Normalize cookie (support customCookie, .shopee_cookie.txt, or auto-wrap raw token)
  let cleanCookie = (customCookie || '').replace(/^Cookie:\s*/i, '').trim();
  if (!cleanCookie) {
    const cookieFilePath = path.join(process.cwd(), '.shopee_cookie.txt');
    if (fs.existsSync(cookieFilePath)) {
      try {
        cleanCookie = fs.readFileSync(cookieFilePath, 'utf-8').replace(/^Cookie:\s*/i, '').trim();
      } catch (e) {}
    }
  }
  if (cleanCookie && !cleanCookie.includes('=')) {
    cleanCookie = `SPC_ST=${cleanCookie}; SPC_U=10670125;`;
  }

  // Attempt direct Shopee Item API fetch if shopid & itemid exist in URL
  try {
    const match = targetUrl.match(/-i\.(\d+)\.(\d+)/) || targetUrl.match(/product\/(\d+)\/(\d+)/);
    if (match) {
      const shopid = match[1];
      const itemid = match[2];
      const headers: Record<string, string> = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
        Referer: targetUrl,
        'X-Requested-With': 'XMLHttpRequest',
      };
      if (cleanCookie) {
        headers['Cookie'] = cleanCookie;
      }

      // 1. Try modern pdp/get_pc endpoint first (much faster and avoids browser overhead)
      try {
        const pdpRes = await fetch(`https://shopee.co.id/api/v4/pdp/get_pc?item_id=${itemid}&shop_id=${shopid}`, {
          headers,
        });
        if (pdpRes.ok) {
          const json = await pdpRes.json();
          const itemObj = json?.data?.item || json?.data;
          if (itemObj && (itemObj.name || itemObj.title)) {
            console.log('[Shopee Scraper] Successfully fetched data via direct Shopee PDP API (pdp/get_pc)!');
            return formatShopeeItemData(itemObj, targetUrl);
          }
        }
      } catch (e) {}

      // 2. Try legacy item/get endpoint
      try {
        const apiRes = await fetch(`https://shopee.co.id/api/v4/item/get?shopid=${shopid}&itemid=${itemid}`, {
          headers,
        });
        if (apiRes.ok) {
          const json = await apiRes.json();
          const itemObj = json?.data?.item || json?.data;
          if (itemObj && (itemObj.name || itemObj.title)) {
            console.log('[Shopee Scraper] Successfully fetched data via direct Shopee Item API!');
            return formatShopeeItemData(itemObj, targetUrl);
          }
        }
      } catch (e) {}
    }
  } catch (e) {}

  // Launch Playwright with persistent context to preserve session tokens and bypass CAPTCHA repeats
  let context: any = null;
  let browser: any = null;
  let page: any = null;
  const userDataDir = path.join(process.cwd(), '.shopee_server_profile');

  try {
    try {
      context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
        ],
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        viewport: { width: 1366, height: 768 },
        locale: 'id-ID',
        timezoneId: 'Asia/Jakarta',
        extraHTTPHeaders: {
          'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
          ...(cleanCookie ? { Cookie: cleanCookie } : {}),
        },
      });
      page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
    } catch (persistentErr: any) {
      console.warn('[Shopee Scraper] Persistent context fallback:', persistentErr.message);
      browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
        ],
      });
      context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        viewport: { width: 1366, height: 768 },
        locale: 'id-ID',
        timezoneId: 'Asia/Jakarta',
        extraHTTPHeaders: {
          'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
          ...(cleanCookie ? { Cookie: cleanCookie } : {}),
        },
      });
      page = await context.newPage();
    }

    // Inject cookies into context for client-side API requests
    if (cleanCookie) {
      try {
        const cookiePairs = cleanCookie
          .split(';')
          .map((pair: string) => {
            const idx = pair.indexOf('=');
            if (idx === -1) return null;
            return {
              name: pair.slice(0, idx).trim(),
              value: pair.slice(idx + 1).trim(),
              domain: '.shopee.co.id',
              path: '/',
            };
          })
          .filter(Boolean);
        if (cookiePairs.length > 0) {
          await context.addCookies(cookiePairs);
        }
      } catch (e) {}
    }

    // Prevent esbuild __name ReferenceError & hide webdriver
    await page.addInitScript(() => {
      (window as any).__name = (target: any) => target;
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    let capturedApiData: any = null;

    // Listen to Shopee's internal network responses
    page.on('response', async (response) => {
      const u = response.url();
      if (
        (u.includes('/api/v4/item/get') ||
          u.includes('/api/v4/pdp/get_pc') ||
          u.includes('/api/v4/item/get_pdp_summary') ||
          u.includes('/api/v4/product/get_pc') ||
          u.includes('/api/v4/pdp/get') ||
          u.includes('/api/v2/item/get')) &&
        response.status() === 200
      ) {
        try {
          const json = await response.json();
          if (json?.data) {
            capturedApiData = json.data;
            console.log('[Shopee Scraper] Successfully intercepted API response!');
          }
        } catch (e) {}
      }
    });

    // Navigate to page
    try {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    } catch (e: any) {
      console.warn('[Shopee Scraper] Goto warning (continuing):', e.message);
    }

    // Give Shopee 3 seconds to complete client-side hydration & API calls
    await page.waitForTimeout(3500);

    // 1. Process from intercepted Shopee API data if available
    if (capturedApiData) {
      const item = capturedApiData.item || capturedApiData;
      const slugTitle = parseTitleFromUrl(targetUrl);
      const title = item.name || item.title || item.item_name || slugTitle;
      const rawPrice = item.price_min || item.price || 0;
      const price = rawPrice > 1000000 ? Math.round(rawPrice / 100000) : rawPrice;
      const rawOrig = item.price_max_before_discount || item.price_before_discount || rawPrice;
      const originalPrice = rawOrig > 1000000 ? Math.round(rawOrig / 100000) : rawOrig;

      const rawImages: string[] = Array.isArray(item.images)
        ? item.images
        : Array.isArray(item.image_list)
        ? item.image_list
        : item.image
        ? [item.image]
        : [];
      const images = rawImages.map((h: string) =>
        h.startsWith('http') ? h : `https://down-id.img.susercontent.com/file/${h}`
      );
      if (item.image) {
        const mainImg = item.image.startsWith('http')
          ? item.image
          : `https://down-id.img.susercontent.com/file/${item.image}`;
        if (!images.includes(mainImg)) {
          images.unshift(mainImg);
        }
      }

      // If intercepted API only yielded 1 image, complement from DOM thumbnails
      if (images.length < 2 && page) {
        try {
          const domImgs = await page.evaluate(() => {
            const clean = (s: string) => s.trim().replace(/_(tn|m|s|b|xs|xxs)$/i, '').replace(/@.*$/, '');
            const found: string[] = [];
            const banned = ['alfamart', 'indomaret', 'spaylater', 'shopeepay', 'bca', 'mandiri', 'voucher', 'logo', 'avatar', 'badge'];
            document.querySelectorAll('img, [style*="background"]').forEach((el: any) => {
              let src = el.tagName === 'IMG' ? (el.currentSrc || el.src || '') : '';
              if (!src) {
                const m = (el.getAttribute('style') || '').match(/url\(["']?(https?:\/\/[^"')]+)["']?\)/);
                if (m) src = m[1];
              }
              if (src && src.includes('susercontent.com/file/') && !banned.some((b) => src.toLowerCase().includes(b))) {
                const c = clean(src);
                if (!found.includes(c)) found.push(c);
              }
            });
            return found;
          });
          for (const u of domImgs) {
            if (!images.includes(u)) images.push(u);
          }
        } catch (e) {}
      }

      const description = item.description || '';
      const category = detectCategory(title, description);
      const { bikeCompatibility, bikeVariants } = detectBikeCompatibility(title, description);

      // Extract variation groups with multi-tier model mapping
      const variationGroups: ScrapedShopeeProduct['variationGroups'] = [];
      const tierVariations = item.tier_variations || capturedApiData.tier_variations;
      const models = item.models || capturedApiData.models;

      if (Array.isArray(tierVariations) && tierVariations.length > 0) {
        tierVariations.forEach((tier: any, tierIdx: number) => {
          if (tier.name && Array.isArray(tier.options)) {
            const options = tier.options.map((optName: string, optIdx: number) => {
              let optPrice = price;
              let optStock = 35;

              // Cross-reference with item models for exact price & stock per variant
              if (Array.isArray(models) && models.length > 0) {
                const matchingModels = models.filter((m: any) => {
                  if (Array.isArray(m.tier_index) && m.tier_index[tierIdx] === optIdx) {
                    return true;
                  }
                  if (Array.isArray(m.extinfo?.tier_index) && m.extinfo.tier_index[tierIdx] === optIdx) {
                    return true;
                  }
                  if (typeof m.name === 'string') {
                    if (m.name.trim() === optName.trim()) return true;
                    const parts = m.name.split(',').map((p: string) => p.trim());
                    if (parts[tierIdx] && parts[tierIdx].toLowerCase() === optName.trim().toLowerCase()) return true;
                    if (parts.some((p: string) => p.toLowerCase() === optName.trim().toLowerCase())) return true;
                  }
                  return false;
                });

                if (matchingModels.length > 0) {
                  const prices = matchingModels
                    .map((m: any) => {
                      const p = m.price || m.price_before_discount || 0;
                      return p > 1000000 ? Math.round(p / 100000) : p;
                    })
                    .filter((p: number) => p > 0);

                  if (prices.length > 0) {
                    optPrice = Math.min(...prices);
                  }
                  const totalStock = matchingModels.reduce((acc: number, m: any) => acc + (m.stock || 0), 0);
                  optStock = totalStock > 0 ? totalStock : 25;
                }
              }

              // Extract option image if provided
              let optImage: string | undefined = undefined;
              if (Array.isArray(tier.images) && tier.images[optIdx]) {
                const imgHash = tier.images[optIdx];
                optImage = imgHash.startsWith('http')
                  ? imgHash
                  : `https://down-id.img.susercontent.com/file/${imgHash}`;
              }

              return {
                name: optName,
                price: optPrice > 0 ? optPrice : price,
                stock: optStock,
                image: optImage,
              };
            });

            variationGroups.push({
              name: tier.name,
              options,
            });
          }
        });
      }

      const finalVarGroups =
        variationGroups.length > 0
          ? variationGroups
          : generateIntelligentVariations(title, description, price);

      if (page) await page.close().catch(() => {});
      if (context) await context.close().catch(() => {});
      if (browser) await browser.close().catch(() => {});

      return {
        name: title,
        category,
        price: price || 150000,
        originalPrice: originalPrice > price ? originalPrice : Math.round(price * 1.2),
        stock: item.stock || 50,
        weight: item.item_status?.weight || 500,
        image: images[0] || 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80',
        images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80'],
        description,
        rating: item.item_rating?.rating_star ? Number(item.item_rating.rating_star.toFixed(1)) : 4.9,
        soldCount: item.historical_sold || item.sold || 88,
        promoTag: 'MALL',
        fitmentTag: '100% PnP Presisi',
        compatibilityText: bikeVariants.join(', ') || 'Universal',
        bikeCompatibility,
        bikeVariants,
        variationGroups: finalVarGroups,
      };
    }

    // 2. Fallback: Parse DOM elements & Meta Tags
    console.log('[Shopee Scraper] Falling back to DOM & OpenGraph parsing with strict product image filter...');
    const domData = await page.evaluate(() => {
      // 1. Title
      const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
      const docTitle = document.title || '';
      const h1Text = document.querySelector('h1')?.textContent || '';
      const name = (h1Text || ogTitle || docTitle).replace(/\|.*Shopee.*/i, '').trim();

      // 2. Strict Product Image Extraction
      const isBlacklisted = (url: string, alt: string = '') => {
        const u = `${url} ${alt}`.toLowerCase();
        const banned = [
          'alfamart', 'alfamidi', 'indomaret', 'spaylater', 'shopeepay',
          'bca', 'mandiri', 'bri', 'bni', 'cimb', 'permata',
          'payment', 'pembayaran', 'metode', 'bank',
          'voucher', 'cashback', 'gratis_ongkir', 'ongkir', 'free_shipping',
          'avatar', 'logo', 'seller', 'rating', 'star', 'badge', 'banner',
          'mall_badge', 'star_seller', 'guarantee', 'garansi', 'official_store',
          'chat', 'icon', 'arrow', 'placeholder', 'blank.gif'
        ];
        return banned.some((k) => u.includes(k));
      };

      const cleanUrl = (raw: string) => {
        if (!raw) return '';
        let s = raw.trim();
        if (s.startsWith('//')) s = 'https:' + s;
        return s.replace(/_(tn|m|s|b|xs|xxs)$/i, '').replace(/@.*$/, '');
      };

      const productImages: string[] = [];
      const seen = new Set<string>();

      // A. Schema.org Product (ld+json)
      document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
        try {
          const parsed = JSON.parse(s.textContent || '{}');
          const imgField = parsed.image || (parsed['@graph'] && parsed['@graph'].find((g: any) => g.image)?.image);
          if (Array.isArray(imgField)) {
            imgField.forEach((u: any) => {
              if (typeof u === 'string') {
                const c = cleanUrl(u);
                if (c && c.includes('susercontent.com/file/') && !isBlacklisted(c) && !seen.has(c)) {
                  seen.add(c);
                  productImages.push(c);
                }
              }
            });
          } else if (typeof imgField === 'string') {
            const c = cleanUrl(imgField);
            if (c && c.includes('susercontent.com/file/') && !isBlacklisted(c) && !seen.has(c)) {
              seen.add(c);
              productImages.push(c);
            }
          }
        } catch (e) {}
      });

      // B. Gallery elements (carousel thumbnails, img, background-image)
      const galleryEls = Array.from(
        document.querySelectorAll(
          '[role="tablist"] img, [role="tablist"] div, .product-briefing img, .product-briefing [style*="background"], div[tabindex] img, .pdp-image-slider img, img, [style*="background"]'
        )
      );

      for (const el of galleryEls) {
        let rawSrc = '';
        if (el.tagName === 'IMG') {
          const img = el as HTMLImageElement;
          rawSrc = cleanUrl(img.currentSrc || img.src || img.getAttribute('data-src') || '');
          if (img.naturalWidth > 0 && img.naturalHeight > 0) {
            const ratio = img.naturalWidth / img.naturalHeight;
            if (ratio > 1.6 || ratio < 0.6) continue; // Skip non-square banners
          }
        } else {
          const style = el.getAttribute('style') || '';
          const match = style.match(/url\(["']?(https?:\/\/[^"')]+)["']?\)/);
          if (match) rawSrc = cleanUrl(match[1]);
        }

        if (!rawSrc || !rawSrc.includes('susercontent.com/file/')) continue;
        if (isBlacklisted(rawSrc)) continue;

        if (!seen.has(rawSrc)) {
          seen.add(rawSrc);
          productImages.push(rawSrc);
        }
      }

      // C. Include meta og:image as primary if valid
      const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
      if (ogImage && !isBlacklisted(ogImage)) {
        const cleanOg = cleanUrl(ogImage);
        if (!seen.has(cleanOg)) {
          productImages.unshift(cleanOg);
          seen.add(cleanOg);
        }
      }

      // 3. Description
      const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
      const descEl =
        document.querySelector('.e8duaM') ||
        document.querySelector('._3y7v0j') ||
        document.querySelector('[data-testid="pdp-description"]');
      const description = descEl?.textContent || ogDesc || '';

      // 4. Price
      const ogPrice = document.querySelector('meta[property="product:price:amount"]')?.getAttribute('content');
      let price = ogPrice ? parseFloat(ogPrice) : 0;
      if (!price) {
        const priceText = document.body.innerText.match(/Rp\s*([\d\.,]+)/i);
        if (priceText && priceText[1]) {
          price = parseInt(priceText[1].replace(/[\.,]/g, ''), 10);
        }
      }

      // 5. Extract Variation Groups from DOM elements (buttons & labels)
      const domVariationGroups: { name: string; options: { name: string; price?: number; stock?: number }[] }[] = [];
      const varButtons = Array.from(
        document.querySelectorAll('button.product-variation, [class*="product-variation"]')
      ) as HTMLButtonElement[];

      if (varButtons.length > 0) {
        // Group buttons by their immediate flex container row
        const rowMap = new Map<HTMLElement, HTMLButtonElement[]>();
        for (const btn of varButtons) {
          const btnText = (btn.textContent || btn.getAttribute('aria-label') || '').trim();
          if (
            !btnText ||
            btnText.length > 40 ||
            btnText.includes('Keranjang') ||
            btnText.includes('Beli Sekarang') ||
            btnText.includes('Chat')
          ) {
            continue;
          }

          const container = (btn.closest('.flex') || btn.parentElement) as HTMLElement;
          if (container) {
            const rowKey =
              container.parentElement && container.parentElement.children.length > 1
                ? (container.parentElement as HTMLElement)
                : container;
            if (!rowMap.has(rowKey)) {
              rowMap.set(rowKey, []);
            }
            rowMap.get(rowKey)!.push(btn);
          }
        }

        let groupIdx = 1;
        for (const [rowEl, btns] of rowMap.entries()) {
          let groupName = '';
          const labelEl = rowEl.querySelector('label, h2, h3, ._2J7wAZ, [class*="label"]');
          if (labelEl && labelEl.textContent && labelEl.textContent.trim().length < 25) {
            groupName = labelEl.textContent.trim();
          } else {
            const firstText = Array.from(rowEl.querySelectorAll('*')).find((el) => {
              if (el.tagName === 'BUTTON' || el.closest('button')) return false;
              const t = el.textContent?.trim() || '';
              return t.length > 1 && t.length < 20 && !t.includes('Rp') && !t.includes('Stok');
            });
            if (firstText && firstText.textContent) {
              groupName = firstText.textContent.trim();
            }
          }

          if (!groupName) {
            groupName = groupIdx === 1 ? 'Pilihan Varian' : `Varian ${groupIdx}`;
          }

          const seenOpts = new Set<string>();
          const options: { name: string; price?: number; stock?: number }[] = [];

          for (const b of btns) {
            const optName = (b.textContent || b.getAttribute('aria-label') || '').trim();
            if (optName && !seenOpts.has(optName)) {
              seenOpts.add(optName);
              options.push({
                name: optName,
                price: price || 150000,
                stock: 35,
              });
            }
          }

          if (options.length > 0) {
            domVariationGroups.push({
              name: groupName,
              options,
            });
            groupIdx++;
          }
        }
      }

      return {
        name,
        images: productImages.slice(0, 8),
        image: productImages[0] || ogImage || '',
        description,
        price,
        variationGroups: domVariationGroups.length > 0 ? domVariationGroups : undefined,
      };
    });

    if (page) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});

    const slugTitle = parseTitleFromUrl(targetUrl);
    let title = domData.name || '';
    if (!title || title.toLowerCase().includes('shopee indonesia') || title.length < 5) {
      title = slugTitle;
    }

    const description = domData.description || `${title} kualitas tinggi standar balap dan harian. Presisi Plug & Play (PnP).`;
    const category = detectCategory(title, description);
    const { bikeCompatibility, bikeVariants } = detectBikeCompatibility(title, description);

    let price = domData.price && domData.price > 1000 ? domData.price : 185000;
    const titleLower = title.toLowerCase();
    if (category === 'noken-as' && (!domData.price || domData.price === 185000)) {
      price = 95000;
    } else if ((titleLower.includes('throttle') || titleLower.includes('tb ')) && (!domData.price || domData.price === 185000)) {
      price = 215000;
    } else if ((titleLower.includes('injektor') || titleLower.includes('injector')) && (!domData.price || domData.price === 185000)) {
      price = 135000;
    } else if (titleLower.includes('roller') && (!domData.price || domData.price === 185000)) {
      price = 95000;
    } else if ((titleLower.includes('knalpot') || titleLower.includes('exhaust')) && (!domData.price || domData.price === 185000)) {
      price = 350000;
    } else if ((titleLower.includes('head') || titleLower.includes('blok')) && (!domData.price || domData.price === 185000)) {
      price = 450000;
    }

    const images: string[] = [...domData.images];

    // Ensure images from URL query params (image_ids / image) are included
    try {
      const urlObj = new URL(targetUrl);
      const imgParam = urlObj.searchParams.get('image_ids') || urlObj.searchParams.get('image');
      if (imgParam) {
        const ids = imgParam.split(',').map((s: string) => s.trim()).filter(Boolean);
        for (const id of ids) {
          const fullUrl = id.startsWith('http') ? id : `https://down-id.img.susercontent.com/file/${id}`;
          if (!images.includes(fullUrl)) {
            images.unshift(fullUrl);
          }
        }
      }
    } catch (e) {}

    if (images.length === 0) {
      images.push('https://down-id.img.susercontent.com/file/sg-11134201-82585-mukfwq97h6ve75');
    }

    const finalVarGroups =
      domData.variationGroups && domData.variationGroups.length > 0
        ? domData.variationGroups
        : generateIntelligentVariations(title, description, price);

    return {
      name: title,
      category,
      price,
      originalPrice: Math.round(price * 1.25),
      stock: 45,
      weight: 600,
      image: domData.image || images[0],
      images,
      description,
      rating: 4.9,
      soldCount: 95,
      promoTag: 'MALL',
      fitmentTag: '100% PnP Presisi',
      compatibilityText: bikeVariants.join(', ') || 'Universal',
      bikeCompatibility,
      bikeVariants,
      variationGroups: finalVarGroups,
    };
  } catch (err: any) {
    if (page) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    console.error('[Shopee Scraper Error]:', err);
    console.log('[Shopee Scraper] Falling back to HTTP parser...');
    return await scrapeShopeeViaHttpFallback(targetUrl);
  }
}

export async function scrapeShopeeViaHttpFallback(url: string): Promise<ScrapedShopeeProduct> {
  let parsedName = '';
  let imageIdFromUrl = '';
  const images: string[] = [];

  try {
    const urlObj = new URL(url);
    const pathname = decodeURIComponent(urlObj.pathname);
    const slugMatch =
      pathname.match(/\/([^\/]+)-i\.\d+\.\d+/) ||
      pathname.match(/\/product\/\d+\/([^\/]+)/) ||
      pathname.match(/\/([^\/?#]+)/);

    if (slugMatch && slugMatch[1]) {
      parsedName = slugMatch[1]
        .replace(/-/g, ' ')
        .replace(/_/g, ' ')
        .replace(/^Jual\s+/i, '')
        .trim();
    }

    const imgParam = urlObj.searchParams.get('image_ids') || urlObj.searchParams.get('image');
    if (imgParam) {
      const ids = imgParam.split(',').map((s: string) => s.trim()).filter(Boolean);
      for (const id of ids) {
        const fullUrl = id.startsWith('http') ? id : `https://down-id.img.susercontent.com/file/${id}`;
        if (!images.includes(fullUrl)) {
          images.push(fullUrl);
        }
      }
      if (images.length > 0) {
        imageIdFromUrl = images[0];
      }
    }
  } catch (e) {}

  let title = parsedName || 'Produk Racing Speedshop Original';
  let description = `${title} kualitas tinggi standar balap dan harian. Presisi Plug & Play (PnP).`;
  let image = imageIdFromUrl || 'https://down-id.img.susercontent.com/file/sg-11134201-82585-mukfwq97h6ve75';

  // Try lightweight HTTP fetch
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    if (res.ok) {
      const html = await res.text();
      const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1];
      const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1];
      const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1];

      if (ogTitle) {
        title = ogTitle.replace(/\|.*Shopee.*/i, '').replace(/^Jual\s+/i, '').trim();
      }
      if (ogImage && !ogImage.includes('favicon') && !ogImage.includes('logo')) {
        image = ogImage;
        if (!images.includes(ogImage)) {
          images.unshift(ogImage);
        }
      }
      if (ogDesc) {
        description = ogDesc.trim();
      }
    }
  } catch (fetchErr) {
    console.warn('[Shopee HTTP Fallback Notice]:', fetchErr);
  }

  const category = detectCategory(title, description);
  const { bikeCompatibility, bikeVariants } = detectBikeCompatibility(title, description);

  let price = 185000;
  const titleLower = title.toLowerCase();
  if (titleLower.includes('throttle') || titleLower.includes('tb ')) price = 215000;
  else if (category === 'noken-as') price = 95000;
  else if (titleLower.includes('injektor') || titleLower.includes('injector')) price = 135000;
  else if (titleLower.includes('roller')) price = 95000;
  else if (titleLower.includes('knalpot') || titleLower.includes('exhaust')) price = 350000;
  else if (category === 'part-cvt') price = 185000;
  else if (category === 'shockbreaker') price = 450000;
  else if (category === 'pengereman') price = 350000;
  else if (category === 'velg') price = 1250000;
  else if (category === 'blok-mesin') price = 450000;
  else price = 135000;

  if (images.length === 0) {
    images.push(image);
  }

  const variationGroups = generateIntelligentVariations(title, description, price);

  return {
    name: title,
    category,
    price,
    originalPrice: Math.round(price * 1.25),
    stock: 50,
    weight: 600,
    image,
    images,
    description,
    rating: 4.9,
    soldCount: 115,
    promoTag: 'MALL',
    fitmentTag: '100% PnP Presisi',
    compatibilityText: bikeVariants.join(', ') || 'Universal',
    bikeCompatibility,
    bikeVariants,
    variationGroups,
  };
}

// Generate intelligent variation groups based on product title, category, and automotive part spec
export function generateIntelligentVariations(
  title: string,
  desc: string,
  basePrice: number
): ScrapedShopeeProduct['variationGroups'] {
  const text = `${title} ${desc}`.toLowerCase();

  // Helper to extract valve sizes from title (e.g. "24-28 26-30 27-31 23-27")
  const extractValveSizes = () => {
    const valveMatches = title.match(/\b\d{2}[\-\/]\d{2}\b/g);
    if (valveMatches && valveMatches.length > 0) {
      return Array.from(new Set(valveMatches.map((v) => v.replace('-', ' / ') + ' mm')));
    }
    return ['23 / 27 mm', '24 / 28 mm', '26 / 30 mm', '27 / 31 mm'];
  };

  // Helper to extract diameter sizes from title (e.g. "26 28 30 32 34")
  const extractDiameterSizes = () => {
    const numMatches = title.match(/\b(24|26|28|30|32|34|36|38|40)\b/g);
    if (numMatches && numMatches.length > 1) {
      return Array.from(new Set(numMatches.map((n) => `${n} mm`)));
    }
    return ['26 mm', '28 mm', '30 mm', '32 mm', '34 mm'];
  };

  // 1. Throttle Body (TB) & Intake System (Matches AH1 Racing: UKURAN + ISI)
  if (
    text.includes('throttle') ||
    text.includes('tb ') ||
    text.includes('tb-') ||
    text.includes('tps') ||
    text.includes('banana') ||
    (text.includes('velocity') && !text.includes('shock'))
  ) {
    const p = basePrice > 0 ? basePrice : 215000;
    const sizes = extractDiameterSizes();

    return [
      {
        name: 'UKURAN',
        options: sizes.map((sizeName, idx) => {
          const num = parseInt(sizeName.replace(/\D/g, ''), 10);
          let extra = 0;
          if (num >= 30 && num < 32) extra = 20000;
          else if (num >= 32 && num < 34) extra = 40000;
          else if (num >= 34) extra = 60000;
          return {
            name: sizeName,
            price: p + extra,
            stock: 35 - idx * 2 > 10 ? 35 - idx * 2 : 20,
          };
        }),
      },
      {
        name: 'ISI',
        options: [
          { name: 'TB ONLY', price: p, stock: 45 },
          { name: 'TB + TPS SENSOR', price: p + 70000, stock: 35 },
          { name: 'TB + VELOCITY CORONG', price: p + 80000, stock: 30 },
          { name: 'TB + TPS + BANANA VELOCITY', price: p + 150000, stock: 25 },
        ],
      },
    ];
  }

  // 2. Cylinder Block / Head / Klep (Matches AH1 Racing: UKURAN KLEP + ISI)
  if (
    (text.includes('head') && (text.includes('klep') || text.includes('cylinder') || text.includes('blok') || text.includes('porting'))) ||
    text.includes('blok head') ||
    text.includes('super head')
  ) {
    const p = basePrice > 0 ? basePrice : 450000;
    const valveSizes = extractValveSizes();

    return [
      {
        name: 'UKURAN KLEP',
        options: valveSizes.map((vSize, idx) => ({
          name: vSize,
          price: p + idx * 35000,
          stock: 30 - idx * 2,
        })),
      },
      {
        name: 'ISI',
        options: [
          { name: 'HEAD ONLY', price: p, stock: 40 },
          { name: 'HEAD + KLEP CARBON', price: p + 135000, stock: 30 },
          { name: 'HEAD + KLEP + PER KLEP RACING', price: p + 235000, stock: 25 },
          { name: 'FULLSET PORTING CNC', price: p + 400000, stock: 15 },
        ],
      },
    ];
  }

  // 3. Noken As / Camshaft (Matches AH1 Racing: MERK + ISI)
  if (text.includes('noken') || text.includes('camshaft') || text.includes('temlar') || text.includes('rocker arm')) {
    return [
      {
        name: 'MERK',
        options: [
          { name: 'KVY (KARBURATOR)', price: 95000, stock: 50 },
          { name: 'K71 (STARTER KASAR)', price: 95000, stock: 45 },
          { name: 'K-44 (STATER HALUS)', price: 95000, stock: 50 },
          { name: 'GENIO NEW BEAT (KOJ)', price: 95000, stock: 40 },
          { name: 'VARIO 125/150 SMALL', price: 115000, stock: 35 },
          { name: 'VARIO 125 150 BIG', price: 125000, stock: 35 },
          { name: 'PCX 150/ADV 150 SMALL', price: 320000, stock: 25 },
          { name: 'PCX 150/ADV 150 BIG', price: 350000, stock: 20 },
          { name: 'MIO M3 / FINO 125', price: 95000, stock: 30 },
          { name: 'NMAX / AEROX 155', price: 145000, stock: 30 },
          { name: 'MX KING / R15 / VIXION', price: 135000, stock: 30 },
          { name: 'CRF 150 / KLX 150', price: 145000, stock: 25 },
        ],
      },
      {
        name: 'ISI',
        options: [
          { name: 'NOKEN AS MENTAH', price: 95000, stock: 100 },
          { name: 'NOKEN AS + PER KLEP RACING', price: 175000, stock: 40 },
        ],
      },
    ];
  }

  // 4. Injektor Racing (Flow Rate CC + Tipe Soket)
  if (text.includes('injektor') || text.includes('injector')) {
    const p = basePrice > 0 ? basePrice : 135000;
    return [
      {
        name: 'FLOW RATE (CC)',
        options: [
          { name: '120 CC (Standar / Porting)', price: p, stock: 40 },
          { name: '140 CC (Bore Up 130-150cc)', price: p, stock: 45 },
          { name: '160 CC (Bore Up 155-170cc)', price: p + 10000, stock: 40 },
          { name: '180 CC (Bore Up 180-200cc)', price: p + 20000, stock: 35 },
          { name: '200 CC (Spek Balap FFA)', price: p + 30000, stock: 25 },
        ],
      },
      {
        name: 'TIPE SOKET',
        options: [
          { name: 'Keihin Soket Besar (Beat FI/Vario 125/150)', price: p, stock: 50 },
          { name: 'Keihin Soket Kecil (Genio/Beat New K1A)', price: p, stock: 40 },
          { name: 'Yamaha Soket (NMAX/Aerox/Mio M3)', price: p, stock: 40 },
        ],
      },
    ];
  }

  // 5. Knalpot Racing (Inlet + Finishing)
  if (text.includes('knalpot') || text.includes('exhaust') || text.includes('muffler') || text.includes('silincer')) {
    const p = basePrice > 0 ? basePrice : 350000;
    return [
      {
        name: 'UKURAN INLET',
        options: [
          { name: 'Inlet 38 mm (Standar Porting / Harian)', price: p, stock: 35 },
          { name: 'Inlet 50 mm (Bore Up / FFA Balap)', price: p + 35000, stock: 30 },
        ],
      },
      {
        name: 'FINISHING',
        options: [
          { name: 'Black Doff Coating', price: p, stock: 40 },
          { name: 'Silver Stainless Steel', price: p + 20000, stock: 35 },
          { name: 'Titanium Look Blue', price: p + 65000, stock: 20 },
        ],
      },
    ];
  }

  // 6. Roller CVT
  if (text.includes('roller')) {
    const p = basePrice > 0 ? basePrice : 95000;
    return [
      {
        name: 'Ukuran Berat Roller',
        options: [
          { name: '7 Gram (Tarikan Enteng)', price: p, stock: 40 },
          { name: '8 Gram (Akselerasi Spontan)', price: p, stock: 45 },
          { name: '9 Gram (Harian Responsif)', price: p, stock: 50 },
          { name: '10 Gram (All Round)', price: p, stock: 50 },
          { name: '11 Gram (Standar Ngacir)', price: p, stock: 50 },
          { name: '12 Gram (Nafas Panjang)', price: p, stock: 45 },
          { name: '13 Gram (Top Speed Tol)', price: p, stock: 35 },
          { name: 'Mix Silang (9g + 11g)', price: p + 5000, stock: 30 },
        ],
      },
      {
        name: 'Tipe Motor',
        options: [
          { name: 'Vario 125 / 150 / 160', price: p, stock: 50 },
          { name: 'Beat ESP / Scoopy / Genio', price: p, stock: 50 },
          { name: 'All New NMAX / Aerox 155', price: p, stock: 45 },
          { name: 'Mio Sporty / Smile / M3', price: p, stock: 35 },
        ],
      },
    ];
  }

  // 7. Shockbreaker
  if (text.includes('shock') || text.includes('suspensi') || text.includes('breaker') || text.includes('monoshock')) {
    const p = basePrice > 0 ? basePrice : 450000;
    return [
      {
        name: 'Ukuran Shock',
        options: [
          { name: '305mm (Beat / Scoopy / Mio)', price: p, stock: 30 },
          { name: '330mm (Vario 125 / 150 / 160)', price: p + 25000, stock: 35 },
          { name: '305mm Tabung Atas (Aerox 155)', price: p + 50000, stock: 25 },
          { name: '335mm Tabung Atas (NMAX 155)', price: p + 50000, stock: 25 },
        ],
      },
      {
        name: 'Pilihan Warna Tabung',
        options: [
          { name: 'Black / Gold Series', price: p, stock: 40 },
          { name: 'Titanium Grey / Red', price: p, stock: 30 },
          { name: 'Yellow / Silver Edition', price: p, stock: 30 },
        ],
      },
    ];
  }

  // 8. Pengereman / Kaliper / Disc
  if (text.includes('kaliper') || text.includes('disc') || text.includes('piringan') || text.includes('rem')) {
    const p = basePrice > 0 ? basePrice : 350000;
    return [
      {
        name: 'Tipe & Model Kaliper',
        options: [
          { name: '2 Piston Samurai Original', price: p, stock: 25 },
          { name: '4 Piston Radial Big Pot', price: p + 150000, stock: 20 },
        ],
      },
      {
        name: 'Pilihan Warna',
        options: [
          { name: 'Titanium Grey', price: p, stock: 30 },
          { name: 'Glossy Black', price: p, stock: 30 },
          { name: 'Racing Gold', price: p, stock: 25 },
          { name: 'Candy Red', price: p, stock: 20 },
        ],
      },
    ];
  }

  // 9. Pulley / Rumah Roller Bubut
  if (text.includes('pulley') || text.includes('rumah roller') || text.includes('face comp')) {
    const p = basePrice > 0 ? basePrice : 185000;
    return [
      {
        name: 'DERAJAT BUBUT',
        options: [
          { name: '13.5 Derajat (Akselerasi Spontan)', price: p, stock: 35 },
          { name: '13.8 Derajat (All-Round Harian)', price: p, stock: 40 },
          { name: '14.0 Derajat (Top Speed Jalan Panjang)', price: p, stock: 30 },
        ],
      },
      {
        name: 'ISI PAKET',
        options: [
          { name: 'PULLEY ONLY (RUMAH ROLLER + KIPAS)', price: p, stock: 50 },
          { name: 'PAKET FULL (PULLEY + INTERLOCK + ROLLER)', price: p + 95000, stock: 30 },
        ],
      },
    ];
  }

  // 10. Mangkok & Kampas Ganda CVT
  if (text.includes('mangkok') || text.includes('kampas ganda') || text.includes('clutch')) {
    const p = basePrice > 0 ? basePrice : 165000;
    return [
      {
        name: 'MODEL & TIPE',
        options: [
          { name: 'MANGKOK KARTEL ANTI GREDEK', price: p, stock: 40 },
          { name: 'MANGKOK LUBANG SPIRAL EXTREME', price: p + 10000, stock: 35 },
          { name: 'KAMPAS GANDA CARBON KEVLAR', price: p + 30000, stock: 30 },
          { name: 'FULLSET MANGKOK + KAMPAS GANDA', price: p + 175000, stock: 25 },
        ],
      },
      {
        name: 'TIPE MOTOR',
        options: [
          { name: 'Vario 125 / 150 / 160 / PCX', price: p, stock: 45 },
          { name: 'Beat ESP / Street / Scoopy / Genio', price: p, stock: 45 },
          { name: 'All New NMAX / Aerox 155', price: p, stock: 35 },
          { name: 'Mio Sporty / Smile / M3', price: p, stock: 30 },
        ],
      },
    ];
  }

  // 11. Per CVT & Per Sentri
  if (text.includes('per cvt') || text.includes('per sentri') || text.includes('per kopling')) {
    const p = basePrice > 0 ? basePrice : 75000;
    return [
      {
        name: 'KEKERASAN RPM',
        options: [
          { name: '1000 RPM (Harian Enteng)', price: p, stock: 50 },
          { name: '1500 RPM (Akselerasi Stop & Go)', price: p, stock: 50 },
          { name: '2000 RPM (Bore Up / Balap)', price: p + 5000, stock: 40 },
        ],
      },
      {
        name: 'ISI PAKET',
        options: [
          { name: 'PER CVT SAJA', price: p, stock: 50 },
          { name: 'FULLSET (PER CVT + PER SENTRI 3 PCS)', price: p + 40000, stock: 35 },
        ],
      },
    ];
  }

  // 12. Velg Racing
  if (text.includes('velg') || text.includes('pelek') || text.includes('rim')) {
    const p = basePrice > 0 ? basePrice : 1250000;
    return [
      {
        name: 'UKURAN VELG',
        options: [
          { name: 'Ring 14 Lebar 1.40 - 1.60 (Matic)', price: p, stock: 20 },
          { name: 'Ring 17 Lebar 1.40 - 1.60 (Bebek/Sport)', price: p + 50000, stock: 15 },
        ],
      },
      {
        name: 'PILIHAN WARNA',
        options: [
          { name: 'Matte Gold Series', price: p, stock: 25 },
          { name: 'Glossy Black Racing', price: p, stock: 25 },
          { name: 'Candy Orange', price: p, stock: 15 },
          { name: 'Silver Polish CNC', price: p + 25000, stock: 15 },
        ],
      },
    ];
  }

  // 13. Blok Silinder / Bore Up
  if (text.includes('blok') || text.includes('bore up') || text.includes('piston') || text.includes('silinder')) {
    const p = basePrice > 0 ? basePrice : 450000;
    return [
      {
        name: 'UKURAN PISTON',
        options: [
          { name: '58.5 mm (Harian / Touring)', price: p, stock: 25 },
          { name: '62 mm (Spek 180cc)', price: p + 50000, stock: 20 },
          { name: '63 mm (Spek 200cc Balap)', price: p + 75000, stock: 15 },
          { name: '65 mm (Kompetisi FFA)', price: p + 110000, stock: 10 },
        ],
      },
      {
        name: 'TIPE MOTOR',
        options: [
          { name: 'Vario 125 / 150', price: p, stock: 30 },
          { name: 'Beat FI / Scoopy FI', price: p, stock: 30 },
          { name: 'NMAX / Aerox 155', price: p, stock: 25 },
          { name: 'Mio Sporty / Smile 5TL', price: p, stock: 20 },
        ],
      },
    ];
  }

  // 14. Generic fallback based on bikeVariants
  const { bikeVariants } = detectBikeCompatibility(title, desc);
  return [
    {
      name: 'Tipe Motor / Varian',
      options: bikeVariants.map((b) => ({
        name: b,
        price: basePrice > 0 ? basePrice : 150000,
        stock: 35,
      })),
    },
  ];
}

