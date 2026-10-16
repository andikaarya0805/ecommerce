import db from './db.js';

export interface BotResponse {
  reply: string;
  productPayload?: any | null;
  needsAdminAttention?: boolean;
}

function formatIDR(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Intelligent Rule-Based Chatbot for Jawir Garage E-Commerce
 * Automatically queries product database, order records, and mechanic wisdom.
 */
export function generateChatbotReply(
  userMessage: string,
  context: {
    userName?: string;
    userId?: string | null;
    attachedProduct?: any | null;
  }
): BotResponse {
  const msg = (userMessage || '').trim().toLowerCase();
  const userName = context.userName || 'Kak';

  // 1. Check if user attached a specific product (e.g. clicked "Chat Sekarang" from Product Detail)
  if (context.attachedProduct) {
    const prod = context.attachedProduct;
    const isReady = (prod.stock ?? 0) > 0;
    const stockMsg = isReady
      ? `✅ **Produk READY STOK (${prod.stock} pcs)**`
      : `⚠️ **Stok Saat Ini Sedang Kosong (Pre-Order / Restock)**`;

    return {
      reply: `Halo ${userName}! Terima kasih sudah tertarik dengan **${prod.name}**.\n\n${stockMsg}\n• Harga: **${formatIDR(prod.price)}**${prod.discountPercent ? ` (Diskon ${prod.discountPercent}%)` : ''}\n• Kompatibilitas: ${prod.compatibilityText || 'Berbagai matic'}\n\nProduk ini 100% Original Jawir Garage dengan garansi presisi & bubble wrap tebal. Ada yang ingin ditanyakan seputar ukuran roller atau pasang di motor Kakak?`,
      productPayload: {
        id: prod.id,
        name: prod.name,
        slug: prod.slug,
        price: prod.price,
        originalPrice: prod.originalPrice,
        discountPercent: prod.discountPercent,
        image: prod.image,
        stock: prod.stock,
        rating: prod.rating || 5.0,
        soldCount: prod.soldCount || 0,
      },
    };
  }

  // 2. Human Admin / CS Handover
  const adminKeywords = ['admin', 'mekanik', 'manusia', 'orang', 'operator', 'cs', 'customer service', 'hubungi orang', 'bicara admin'];
  if (adminKeywords.some((k) => msg.includes(k))) {
    return {
      reply: `👨‍🔧 **Permintaan Diteruskan ke Admin & Mekanik!**\n\nPesan ${userName} sudah masuk ke prioritas tim admin Jawir Garage. Mekanik kami akan segera merespons chat ini secara langsung.\n\nMohon ditunggu sebentar ya Kak! Jika mendesak, Kakak juga bisa hubungi WhatsApp darurat mekanik kami via tombol di layar.`,
      needsAdminAttention: true,
    };
  }

  // 3. Order Tracking / Cek Resi / Status Pesanan
  const invoiceMatch = userMessage.match(/JWR-[A-Za-z0-9-]+/i);
  if (invoiceMatch) {
    const invNumber = invoiceMatch[0].toUpperCase();
    try {
      const order = db.prepare('SELECT * FROM orders WHERE invoice_number = ?').get(invNumber) as any;
      if (order) {
        let statusIndo = 'Menunggu Pembayaran';
        if (order.status === 'PAID') statusIndo = 'Pembayaran Berhasil / Sedang Diproses Gudang';
        if (order.status === 'SHIPPED') statusIndo = 'Pesanan Sedang Dikirim';
        if (order.status === 'COMPLETED') statusIndo = 'Pesanan Telah Selesai';
        if (order.status === 'CANCELLED') statusIndo = 'Pesanan Dibatalkan';

        return {
          reply: `📦 **Status Pesanan #${order.invoice_number}:**\n\n• Penerima: **${order.customer_name}**\n• Status: **${statusIndo}** (${order.status})\n• Kurir: **${order.courier_name}** - ${order.courier_service}\n• No. Resi: **${order.tracking_number || 'Sedang dipacking & menunggu pickup kurir'}**\n• Total Pembayaran: **${formatIDR(order.grand_total)}**\n\nKakak bisa melihat rincian lengkapnya di menu **Lacak Pesanan** ya!`,
        };
      } else {
        return {
          reply: `⚠️ Maaf ${userName}, nomor invoice **${invNumber}** tidak ditemukan di sistem kami. Mohon pastikan kode invoice sudah benar (contoh: JWR-2026xxxxxx).`,
        };
      }
    } catch (e) {
      // ignore
    }
  }

  if (['pesanan', 'order', 'resi', 'lacak', 'paket saya', 'status pesanan'].some((k) => msg.includes(k))) {
    if (context.userId) {
      try {
        const latestOrder = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(context.userId) as any;
        if (latestOrder) {
          return {
            reply: `📦 **Pesanan Terakhir Kakak (${latestOrder.invoice_number}):**\n• Status: **${latestOrder.status}**\n• Kurir: ${latestOrder.courier_name} (${latestOrder.courier_service})\n• No. Resi: **${latestOrder.tracking_number || 'Sedang diproses gudang'}**\n• Total: ${formatIDR(latestOrder.grand_total)}\n\nApakah pesanan ini yang ingin Kakak tanyakan? Jika pesanan lain, silakan ketik nomor invoicenya ya!`,
          };
        }
      } catch (e) {}
    }
    return {
      reply: `📦 **Lacak Pesanan Kamu:**\nUntuk mengecek status pengiriman dan no. resi, silakan ketikkan **Nomor Invoice** pesanan Kakak (contoh: *JWR-123456*), atau buka menu **Pesanan Saya** di pojok kanan atas!`,
    };
  }

  // 4. Shipping & Delivery Schedule
  const shippingKeywords = ['kirim', 'ongkir', 'kapan sampai', 'ekspedisi', 'biteship', 'jne', 'j&t', 'sicepat', 'gosend', 'grab', 'jadwal kirim'];
  if (shippingKeywords.some((k) => msg.includes(k))) {
    return {
      reply: `🚚 **Informasi Pengiriman & Jadwal Gudang:**\n\n• **Lokasi Gudang:** Jakarta Timur.\n• **Jadwal Pickup:** Senin – Sabtu.\n• **Same-day Delivery:** Pesanan yang masuk & terverifikasi sebelum **pukul 16.00 WIB** langsung dikirim di hari yang sama!\n• **Ekspedisi Tersedia:** J&T, JNE, SiCepat, AnterAja, GoSend & Grab (Instant/SameDay).\n• **Garansi Pengiriman:** Semua part dibungkus bubble wrap ekstra tebal + dus pengaman gratis, aman sampai tujuan!`,
    };
  }

  // 5. Query Products Availability from Database
  let allProducts: any[] = [];
  try {
    allProducts = db.prepare('SELECT * FROM products WHERE is_active = 1').all() as any[];
  } catch (e) {
    allProducts = [];
  }

  // Check if user is asking about specific bike racikan / recommendation
  const bikeTerms = [
    { key: 'nmax', label: 'Yamaha NMAX (Old/New)' },
    { key: 'aerox', label: 'Yamaha Aerox 155' },
    { key: 'vario 160', label: 'Honda Vario 160' },
    { key: 'vario 150', label: 'Honda Vario 150' },
    { key: 'vario 125', label: 'Honda Vario 125' },
    { key: 'vario', label: 'Honda Vario Series' },
    { key: 'beat', label: 'Honda Beat (Karbu/FI/ESP/Deluxe)' },
    { key: 'scoopy', label: 'Honda Scoopy' },
    { key: 'pcx', label: 'Honda PCX 150/160' },
    { key: 'mio', label: 'Yamaha Mio Series' },
    { key: 'fazzio', label: 'Yamaha Fazzio / Grand Filano' },
    { key: 'adv', label: 'Honda ADV 150/160' },
  ];

  const matchedBike = bikeTerms.find((b) => msg.includes(b.key));
  const isAskingRecommendation = ['racikan', 'saran', 'cocok', 'rekomen', 'bagus', 'enak', 'upgrade', 'gredek', 'anti gredek', 'tarikan'].some((w) => msg.includes(w));

  if (matchedBike && (isAskingRecommendation || msg.includes('buat') || msg.includes('untuk'))) {
    // Find matching upgrade packages or products for this bike
    const matchedProducts = allProducts.filter((p) => {
      const nameLower = (p.name || '').toLowerCase();
      const compatLower = (p.compatibilityText || '').toLowerCase();
      const bikeCompat = (p.bikeCompatibility || '').toLowerCase();
      return (
        nameLower.includes(matchedBike.key) ||
        compatLower.includes(matchedBike.key) ||
        bikeCompat.includes(matchedBike.key)
      );
    });

    const bestProduct = matchedProducts.find((p) => p.isPaketUpgrade || p.category === 'paket-upgrade') || matchedProducts[0];

    let advice = `🏍️ **Rekomendasi Racikan Mekanik Jawir untuk ${matchedBike.label}:**\n\n`;
    if (matchedBike.key.includes('beat') || matchedBike.key.includes('scoopy')) {
      advice += `• **Roller:** 9 - 10 gram (akselerasi responsif, tanjakan enteng)\n• **Pulley:** Bubut derajat 13.8° jalur roller dikerok halus\n• **Per CVT:** 1000 - 1500 RPM + Kampas Ganda Daytona Carbon (bebas gredek 100%!)`;
    } else if (matchedBike.key.includes('nmax') || matchedBike.key.includes('aerox')) {
      advice += `• **Roller:** 11 - 12 gram rata (nafas panjang & akselerasi padat)\n• **Pulley:** Bubut derajat 13.5° interlock presisi\n• **Per CVT:** 1500 RPM + Mangkok Ganda Custom Kartel Spiral`;
    } else if (matchedBike.key.includes('vario') || matchedBike.key.includes('pcx')) {
      advice += `• **Roller:** 11 - 13 gram silang (hilangkan lemot putaran bawah)\n• **Pulley:** Sudut 13.8° custom CNC\n• **Mangkok Ganda:** Anti gredek bolong pembuangan debu`;
    } else {
      advice += `• **Roller:** Turun 1-2 gram dari bobot standar pabrik\n• **Per CVT:** 1000 - 1500 RPM untuk torsi lebih padat\n• **Kampas Ganda:** Carbon kevlar anti selip`;
    }

    if (bestProduct) {
      advice += `\n\nKami punya paket siap pasang Plug & Play yang cocok banget Kak: **${bestProduct.name}** seharga **${formatIDR(bestProduct.price)}** (Stok Ready ${bestProduct.stock} pcs).`;
      return {
        reply: advice,
        productPayload: {
          id: bestProduct.id,
          name: bestProduct.name,
          slug: bestProduct.slug,
          price: bestProduct.price,
          originalPrice: bestProduct.originalPrice,
          discountPercent: bestProduct.discountPercent,
          image: bestProduct.image,
          stock: bestProduct.stock,
          rating: bestProduct.rating || 5.0,
          soldCount: bestProduct.soldCount || 0,
        },
      };
    }

    return { reply: advice };
  }

  // 6. Direct Product Stock / Price Search in Database
  // Search keywords: pulley, roller, kampas, mangkok, per cvt, v-belt, oli, paket, knalpot, busi, master rem, kaliper
  const productKeywords = [
    'pulley', 'roller', 'kampas', 'mangkok', 'per cvt', 'v-belt', 'vanbelt', 'vbelt',
    'oli', 'paket', 'knalpot', 'busi', 'master rem', 'kaliper', 'selang rem', 'filter',
    'injektor', 'ecu', 'intercooler', 'shock', 'nissin', 'daytona', 'brt', 'kawahara', 'tdr'
  ];

  // Also extract any potential search terms
  const searchTerms = productKeywords.filter((k) => msg.includes(k));
  const isAskingAvailability = ['ready', 'ada', 'stok', 'harga', 'berapa', 'jual', 'punya', 'beli', 'order'].some((w) => msg.includes(w));

  if (searchTerms.length > 0 || (isAskingAvailability && allProducts.length > 0)) {
    // Find matching products
    const matches = allProducts.filter((p) => {
      const pName = (p.name || '').toLowerCase();
      const pCat = (p.category || '').toLowerCase();
      const pDesc = (p.description || '').toLowerCase();
      const pCompat = (p.compatibilityText || '').toLowerCase();

      // Check if matches any extracted search term
      if (searchTerms.length > 0) {
        return searchTerms.some((st) => pName.includes(st) || pCat.includes(st) || pDesc.includes(st));
      }

      // Check if message words match product name words
      const words = msg.split(/\s+/).filter((w) => w.length > 3);
      return words.some((w) => pName.includes(w) || pCompat.includes(w));
    });

    if (matches.length > 0) {
      const topMatch = matches[0];
      const isReady = (topMatch.stock || 0) > 0;
      const stockStatus = isReady
        ? `✅ **READY STOK** (${topMatch.stock} pcs tersedia di gudang)`
        : `⚠️ **STOK HABIS (Pre-Order)**`;

      let replyText = `Halo ${userName}! Ketersediaan produk di database kami:\n\n`;
      replyText += `Produk: **${topMatch.name}**\n`;
      replyText += `• Status: ${stockStatus}\n`;
      replyText += `• Harga: **${formatIDR(topMatch.price)}**`;
      if (topMatch.discountPercent) {
        replyText += ` (Hemat ${topMatch.discountPercent}% dari ${formatIDR(topMatch.originalPrice)})`;
      }
      replyText += `\n• Rating: ⭐ ${topMatch.rating || 5.0} | Terjual: ${topMatch.soldCount || 0}+ pcs`;
      replyText += `\n• Cocok untuk: ${topMatch.compatibilityText || 'Berbagai matic'}\n\n`;

      if (isReady) {
        replyText += `Barang siap kami kirim hari ini Kak! Klik kartu produk di bawah untuk detail atau langsung masukkan ke keranjang belanja ya! 🚀`;
      } else {
        replyText += `Stok sedang dalam perjalanan restock dari pabrik. Kakak mau kami bantu carikan produk alternatif sejenis?`;
      }

      return {
        reply: replyText,
        productPayload: {
          id: topMatch.id,
          name: topMatch.name,
          slug: topMatch.slug,
          price: topMatch.price,
          originalPrice: topMatch.originalPrice,
          discountPercent: topMatch.discountPercent,
          image: topMatch.image,
          stock: topMatch.stock,
          rating: topMatch.rating || 5.0,
          soldCount: topMatch.soldCount || 0,
        },
      };
    }
  }

  // 7. General Greetings
  const greetings = ['halo', 'hai', 'hi', 'p', 'siang', 'malam', 'pagi', 'sore', 'assalamualaikum', 'permisi', 'test', 'tes'];
  if (greetings.some((g) => msg === g || msg.startsWith(g + ' ') || msg.endsWith(' ' + g))) {
    return {
      reply: `Halo ${userName}! 👋 Selamat datang di Official Store **Jawir Garage**.\n\nSaya asisten chatbot Jawir 🤖 siap membantu Kakak 24/7. Ada yang bisa kami bantu seputar part motor matic hari ini?\n\nKakak bisa:\n1. 🔍 **Tanya stok & harga** (contoh: *'apakah roller beat ready?'*)\n2. 🏍️ **Konsultasi racikan motor** (contoh: *'racikan kirian nmax'*)\n3. 📦 **Cek status order** (ketik nomor invoice *JWR-xxx*)\n4. 🚚 **Jadwal pengiriman & ongkir**\n5. 👨‍🔧 **Bicara langsung dengan mekanik/admin**`,
    };
  }

  // 8. Polite Default / Fallback
  return {
    reply: `Terima kasih pesannya Kak ${userName}! 🙏\n\nUntuk info lebih akurat, Kakak bisa ketikkan nama part yang dicari (misal: *'roller vario 125'*, *'pulley nmax'*, *'paket upgrade beat'*) atau ketik *'hubungi admin'* jika ingin langsung berkonsultasi dengan mekanik kami.\n\nTim Jawir Garage siap membantu racikan terbaik motor Kakak!`,
  };
}
