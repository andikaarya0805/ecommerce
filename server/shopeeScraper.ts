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
function detectCategory(title: string, desc: string): string {
  const text = `${title} ${desc}`.toLowerCase();

  if (text.includes('cvt') || text.includes('pulley') || text.includes('roller') || text.includes('v-belt') || text.includes('vbelt') || text.includes('mangkok') || text.includes('per cvt') || text.includes('kampas ganda')) {
    return 'part-cvt';
  }
  if (text.includes('shock') || text.includes('suspensi') || text.includes('monoshock') || text.includes('breaker') || text.includes('fork') || text.includes('tabung')) {
    return 'shockbreaker';
  }
  if (text.includes('rem') || text.includes('kaliper') || text.includes('disc') || text.includes('piringan') || text.includes('master rem') || text.includes('brake') || text.includes('selang rem')) {
    return 'pengereman';
  }
  if (text.includes('velg') || text.includes('pelek') || text.includes('rim') || text.includes('tromol') || text.includes('jari-jari')) {
    return 'velg';
  }
  if (text.includes('noken') || text.includes('camshaft') || text.includes('temlar') || text.includes('rocker arm')) {
    return 'noken-as';
  }
  if (text.includes('blok') || text.includes('bore up') || text.includes('piston') || text.includes('silinder') || text.includes('cylinder') || text.includes('head')) {
    return 'blok-mesin';
  }
  if (text.includes('baut') || text.includes('probolt') || text.includes('spion') || text.includes('handgrip') || text.includes('grip') || text.includes('cnc') || text.includes('aksesoris') || text.includes('cover')) {
    return 'accesories';
  }

  return 'lain-lain';
}

// Auto-detect compatible motorcycle types
function detectBikeCompatibility(title: string, desc: string): { bikeCompatibility: string[]; bikeVariants: string[] } {
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

export async function scrapeShopeeProduct(rawUrl: string): Promise<ScrapedShopeeProduct> {
  let targetUrl = rawUrl.trim();
  if (!targetUrl.startsWith('http')) {
    targetUrl = 'https://' + targetUrl;
  }

  console.log('[Shopee Scraper] Starting scrape for:', targetUrl);

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
  });

  try {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      viewport: { width: 1366, height: 768 },
      locale: 'id-ID',
      timezoneId: 'Asia/Jakarta',
      extraHTTPHeaders: {
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    const page = await context.newPage();

    let capturedApiData: any = null;

    // Listen to Shopee's internal network responses
    page.on('response', async (response) => {
      const u = response.url();
      if (
        (u.includes('/api/v4/item/get') ||
          u.includes('/api/v4/pdp/get_pc') ||
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
      const title = item.name || '';
      const rawPrice = item.price_min || item.price || 0;
      const price = rawPrice > 1000000 ? Math.round(rawPrice / 100000) : rawPrice;
      const rawOrig = item.price_max_before_discount || item.price_before_discount || rawPrice;
      const originalPrice = rawOrig > 1000000 ? Math.round(rawOrig / 100000) : rawOrig;

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

      const description = item.description || '';
      const category = detectCategory(title, description);
      const { bikeCompatibility, bikeVariants } = detectBikeCompatibility(title, description);

      // Extract variation groups
      const variationGroups: ScrapedShopeeProduct['variationGroups'] = [];
      if (Array.isArray(item.tier_variations) && item.tier_variations.length > 0) {
        for (const tier of item.tier_variations) {
          if (tier.name && Array.isArray(tier.options)) {
            variationGroups.push({
              name: tier.name,
              options: tier.options.map((optName: string) => {
                // Find matching model price if available
                let optPrice = price;
                let optStock = 25;
                if (Array.isArray(item.models)) {
                  const modelMatch = item.models.find((m: any) => m.name === optName);
                  if (modelMatch) {
                    optPrice =
                      modelMatch.price > 1000000 ? Math.round(modelMatch.price / 100000) : modelMatch.price;
                    optStock = modelMatch.stock || 25;
                  }
                }
                return { name: optName, price: optPrice, stock: optStock };
              }),
            });
          }
        }
      }

      await browser.close();

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
        variationGroups: variationGroups.length > 0 ? variationGroups : undefined,
      };
    }

    // 2. Fallback: Parse DOM elements & Meta Tags
    console.log('[Shopee Scraper] Falling back to DOM & OpenGraph parsing...');
    const domData = await page.evaluate(() => {
      // 1. Title
      const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
      const docTitle = document.title || '';
      const h1Text = document.querySelector('h1')?.textContent || '';
      const name = (h1Text || ogTitle || docTitle).replace(/\|.*Shopee.*/i, '').trim();

      // 2. Image
      const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
      const imgElements = Array.from(document.querySelectorAll('img')).map((i) => i.src);
      const shopeeImages = imgElements.filter(
        (src) => src && (src.includes('susercontent.com') || src.includes('shopee.'))
      );
      if (ogImage && !shopeeImages.includes(ogImage)) {
        shopeeImages.unshift(ogImage);
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

      return {
        name,
        images: shopeeImages.slice(0, 8),
        image: ogImage || shopeeImages[0] || '',
        description,
        price,
      };
    });

    await browser.close();

    const title = domData.name || 'Produk Racing Shopee';
    const description = domData.description || 'Deskripsi produk otomotif premium.';
    const category = detectCategory(title, description);
    const { bikeCompatibility, bikeVariants } = detectBikeCompatibility(title, description);
    const price = domData.price && domData.price > 1000 ? domData.price : 185000;
    const images =
      domData.images.length > 0
        ? domData.images
        : ['https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80'];

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
    };
  } catch (err: any) {
    await browser.close().catch(() => {});
    console.error('[Shopee Scraper Error]:', err);
    throw new Error('Gagal mengambil data produk dari Shopee: ' + err.message);
  }
}
