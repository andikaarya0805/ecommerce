import type { Voucher, Product } from '../types.ts';

export const CATEGORY_ITEMS = [
  {
    id: 'cat-nmax',
    title: 'Upgrade NMAX / AEROX / LEXI',
    subtitle: 'Maxi Yamaha Performance Center',
    bikeFilter: 'nmax-aerox',
    categoryFilter: null,
    badgeText: 'Paling Laris',
    count: 24,
    icon: 'Flame',
    tagline: 'Koleksi lengkap CVT, rem, knalpot dan suspensi Yamaha 155cc'
  },
  {
    id: 'cat-vario',
    title: 'Upgrade VARIO / PCX / ADV',
    subtitle: 'Honda eSP+ Performance Specialist',
    bikeFilter: 'vario-pcx',
    categoryFilter: null,
    badgeText: 'Official PnP',
    count: 36,
    icon: 'Zap',
    tagline: 'Solusi anti gredek, pulley 13.8 derajat, dan rem radial KTC'
  },
  {
    id: 'cat-beat',
    title: 'Upgrade BEAT / SCOOPY / GENIO',
    subtitle: 'Harian Ngacir & Tanjakan Enteng',
    bikeFilter: 'beat-scoopy',
    categoryFilter: null,
    badgeText: 'Paket Hemat',
    count: 28,
    icon: 'Sparkles',
    tagline: 'Racikan kirian roller BRT & mangkok bolong motor sejuta umat'
  },
  {
    id: 'cat-paket-cvt',
    title: 'Paket Komplit Upgrade CVT',
    subtitle: 'Full Set Kirian Tinggal Pasang',
    bikeFilter: null,
    categoryFilter: 'paket-upgrade',
    badgeText: 'Garansi 6 Bulan',
    count: 16,
    icon: 'PackageCheck',
    tagline: 'Pulley + Mangkok + Roller BRT + Per CVT racikan dyno test TDR'
  },
  {
    id: 'cat-mangkok-pulley',
    title: 'Mangkok + Pulley Set',
    subtitle: 'Bahan OEM Bubut CNC Presisi',
    bikeFilter: null,
    categoryFilter: 'cvt',
    badgeText: 'Presisi CNC',
    count: 22,
    icon: 'Disc',
    tagline: 'Sudut derajat 13.5° - 13.8° dengan interlock anti selip'
  },
  {
    id: 'cat-kaki-pengereman',
    title: 'Kaki-Kaki & Pengereman (Shock, Master Rem, Velg)',
    subtitle: 'Safety & Visual Ganteng Maksimal',
    bikeFilter: null,
    categoryFilter: 'pengereman',
    badgeText: 'Billet CNC',
    count: 19,
    icon: 'ShieldCheck',
    tagline: 'Master rem KTC Corsa Corta 16mm, disc floating, shock klik rebound'
  }
];

export const INITIAL_VOUCHERS: any[] = [
  {
    id: 'vouch-1',
    code: 'JAWIR20K',
    title: 'Potongan Rp20.000',
    subtitle: 'Min. Belanja Rp200RB',
    discount_type: 'FIXED',
    discount_value: 20000,
    minSpend: 200000,
    discountAmount: 20000,
    expiryText: 'Berakhir 2 hari lagi',
    badge: 'Spesial D2C',
    claimed: false
  },
  {
    id: 'vouch-2',
    code: 'ONGKIRFREE',
    title: 'Gratis Ongkir Rp15.000',
    subtitle: 'Min. Belanja Rp150RB',
    discount_type: 'FIXED',
    discount_value: 15000,
    minSpend: 150000,
    discountAmount: 15000,
    expiryText: 'Klaim Hari Ini',
    badge: 'Se-Nusantara',
    claimed: false
  },
  {
    id: 'vouch-3',
    code: 'CVTRACING50K',
    title: 'Potongan Rp50.000',
    subtitle: 'Khusus Paket Upgrade CVT',
    discount_type: 'FIXED',
    discount_value: 50000,
    minSpend: 500000,
    discountAmount: 50000,
    expiryText: 'Kuota Terbatas',
    badge: 'Spesial Kirian',
    claimed: false
  },
  {
    id: 'vouch-4',
    code: 'JAWIR99',
    title: 'Diskon Ekstra 10%',
    subtitle: 'Maks. Rp30.000 Tanpa Min. Belanja',
    discount_type: 'PERCENT',
    discount_value: 10,
    minSpend: 0,
    max_discount_amount: 30000,
    discountAmount: 30000,
    expiryText: 'Flash Promo 9.9',
    badge: '9.9 Sale',
    claimed: false
  }
];

export const POPULAR_USER_BIKES = [
  {
    id: 'b-1',
    name: 'Honda Vario 160 eSP+',
    type: 'vario-pcx',
    year: '2023',
    cc: '160cc'
  },
  {
    id: 'b-2',
    name: 'Yamaha All New NMAX Connected',
    type: 'nmax-aerox',
    year: '2022',
    cc: '155cc'
  },
  {
    id: 'b-3',
    name: 'Honda Beat Deluxe LED',
    type: 'beat-scoopy',
    year: '2024',
    cc: '110cc'
  },
  {
    id: 'b-4',
    name: 'Yamaha Aerox 155 Cyber City',
    type: 'nmax-aerox',
    year: '2023',
    cc: '155cc'
  },
  {
    id: 'b-5',
    name: 'Honda Scoopy Prestige Smartkey',
    type: 'beat-scoopy',
    year: '2023',
    cc: '110cc'
  },
  {
    id: 'b-6',
    name: 'Yamaha Mio Sporty 5TL',
    type: 'mio-series',
    year: '2008',
    cc: '115cc'
  }
];

export const INITIAL_PRODUCTS: any[] = [
  {
    id: 'prod-1',
    name: 'Super Roller BRT Black Diamond - Vario 125 / PCX / Beat Deluxe',
    category: 'cvt',
    compatibilityText: 'Vario 125/150/160, PCX 150/160, Beat Deluxe/ESP',
    fitmentTag: 'Plug & Play (PnP)',
    price: 95000,
    originalPrice: 135000,
    discountPercent: 30,
    promoTag: 'Promo 30%',
    rating: 4.9,
    soldCount: 4210,
    image: '/images/brt_super_roller_1789096443716.jpg',
    description: 'Roller performa tinggi BRT Black Diamond dengan material teflon komposit anti-aus hingga 20.000 KM. Akselerasi spontan tanpa merusak pulley rumah roller.',
    specs: {
      Material: 'Black Diamond High-Grade Composite Teflon',
      Ukuran: '20x15 mm (Tersedia 9g, 10g, 11g, 12g, 13g)',
      'Ketahanan Suhu': 'Hingga 300°C',
      Kelengkapan: '1 Set (6 Pcs Roller Presisi BRT Original + Kemasan Merah BRT)'
    },
    isPromo: true,
    isPaketUpgrade: false,
    stock: 44,
    originCity: 'Jakarta Timur',
    bikeCompatibility: ['vario-pcx', 'beat-scoopy']
  },
  {
    id: 'prod-2',
    name: 'Master Rem KTC Corsa Corta 16mm Radial - Handle Billet CNC + Tabung Minyak Rem',
    category: 'pengereman',
    compatibilityText: 'Universal Matic & Sport (Vario, NMAX, Aerox, PCX, Ninja)',
    fitmentTag: 'Plug & Play (PnP)',
    price: 780000,
    originalPrice: 1050000,
    discountPercent: 26,
    promoTag: 'Best Seller',
    rating: 5,
    soldCount: 1250,
    image: '/images/ktc_master_rem_1789096462600.jpg',
    description: 'Master rem radial KTC Corsa Corta diameter piston 16mm dengan tuas rem CNC adjustable dan tabung minyak rem smoke transparan. Gigitan rem sangat pakem, progresif, dan anti-fading.',
    specs: {
      'Tipe Master': 'Radial Piston 16mm Hard Anodized',
      'Tuas / Lever': 'Billet CNC Foldable Adjustable Crimson Red',
      'Tabung Minyak': 'Smoke Transparent Reservoir + Breket Stainless & Selang',
      Kelengkapan: 'Master rem kanan, switch rem, tabung minyak, baut banjo'
    },
    isPromo: true,
    isPaketUpgrade: false,
    stock: 16,
    originCity: 'Jakarta Timur',
    bikeCompatibility: ['vario-pcx', 'nmax-aerox', 'beat-scoopy', 'sport-bebek']
  },
  {
    id: 'prod-3',
    name: 'TDR CVT Full Upgrade Pack - Pulley, Mangkok Bolong, Per CVT & Roller Racing',
    category: 'paket-upgrade',
    compatibilityText: 'Vario 125/150/160, PCX 150/160, NMAX, Aerox 155',
    fitmentTag: 'Plug & Play (PnP)',
    price: 685000,
    originalPrice: 920000,
    discountPercent: 26,
    promoTag: 'Paket Hemat',
    rating: 4.9,
    soldCount: 2310,
    image: '/images/tdr_cvt_kit_1789096476924.jpg',
    description: 'Paket komplit kirian performa tinggi TDR Racing. Terdiri dari variator pulley bubut interlock, mangkok ganda bolong anti-gredek, roller teflon, dan per CVT racing dalam kemasan box kuning khas TDR.',
    specs: {
      'Isi Box TDR': 'Pulley Rumah Roller, Kipas Pulley 13.8°, Mangkok Bolong Kartel, Per CVT 1500 RPM, Roller Set',
      Garansi: 'Anti Gredek 6 Bulan / Uang Kembali',
      'Hasil Dyno': 'Tenaga naik +1.8 HP, nafas panjang tanpa loyo'
    },
    isPromo: true,
    isPaketUpgrade: true,
    stock: 25,
    originCity: 'Jakarta Timur',
    bikeCompatibility: ['vario-pcx', 'nmax-aerox']
  },
  {
    id: 'prod-4',
    name: 'Akrapovič Racing Exhaust Full System - Titanium Megaphone Header Stainless 304',
    category: 'mesin',
    compatibilityText: 'Vario 160, PCX 160, NMAX All New 2020-2024, Aerox Connected',
    fitmentTag: 'Plug & Play (PnP)',
    price: 1850000,
    originalPrice: 2450000,
    discountPercent: 24,
    promoTag: 'Promo 24%',
    rating: 5,
    soldCount: 680,
    image: '/images/akrapovic_exhaust_1789096491594.jpg',
    description: 'Knalpot racing full system dengan pipa header titanium las cacing las argon rapi dan silencer titanium hexagonal bertutup carbon fiber asli. Suara bass padat, adem di RPM rendah, gahar bertenaga di RPM atas.',
    specs: {
      'Material Header': 'Titanium Pie-Cut Welded Header Pipe',
      'Material Silencer': 'Titanium Alloy Shell dengan Real Matte Carbon End Cap',
      'Karakter Suara': 'Bass Adem Bulat Padat (Dilengkapi DB Killer Lepas-Pasang)',
      Fitment: '100% PnP Presisi Dudukan Knalpot Standar'
    },
    isPromo: true,
    isPaketUpgrade: false,
    stock: 10,
    originCity: 'Jakarta Timur',
    bikeCompatibility: ['vario-pcx', 'nmax-aerox']
  },
  {
    id: 'prod-5',
    name: 'Mangkok Kampas Ganda Racing Custom Bolong CNC Anti Gredek - Beat / Scoopy / Vario',
    category: 'cvt',
    compatibilityText: 'Honda Beat Karbu/ESP/Deluxe, Scoopy, Genio, Vario 125/150',
    fitmentTag: 'Plug & Play (PnP)',
    price: 195000,
    originalPrice: 260000,
    discountPercent: 25,
    promoTag: 'Paket Hemat',
    rating: 4.9,
    soldCount: 3840,
    image: '/images/mangkok_ganda_cnc_1789096538694.jpg',
    description: 'Mangkok kopling ganda bubut presisi CNC dengan pola lubang heksagonal buang debu kampas dan kartel mikro anti-selip. Solusi paten melenyapkan penyakit gredek matic saat tarikan awal.',
    specs: {
      Material: 'Baja Tempa OEM Bubut CNC Presisi Jawir Garage',
      Fitur: 'Lubang Buang Debu Hexagonal + Kartel Halus Anti Selip',
      Garansi: 'Bebas Gredek 100% PnP'
    },
    isPromo: false,
    isPaketUpgrade: false,
    stock: 38,
    originCity: 'Jakarta Timur',
    bikeCompatibility: ['beat-scoopy', 'vario-pcx']
  },
  {
    id: 'prod-6',
    name: 'Shockbreaker Tabung Atas Racing Click Rebound 330mm / 310mm Jawir Platinum Series',
    category: 'kaki-kaki',
    compatibilityText: 'Vario 125/150/160, Beat, Scoopy, Mio Sporty, Fazzio',
    fitmentTag: 'Plug & Play (PnP)',
    price: 890000,
    originalPrice: 1250000,
    discountPercent: 29,
    promoTag: 'Best Seller',
    rating: 5,
    soldCount: 920,
    image: '/images/racing_rear_shock_1789096521276.jpg',
    description: 'Suspensi belakang tabung gas nitrogen dengan setelan 24 klik rebound adjustable dan preload pegas. Bikin motor anteng di tikungan kencang dan empuk saat boncengan.',
    specs: {
      Tipe: 'Gas Monotube Tabung Atas Billet CNC',
      Fitur: '24 Klik Rebound + Preload Threaded Nut',
      Ukuran: '330mm (Vario/PCX) & 310mm (Beat/Scoopy/Mio)'
    },
    isPromo: true,
    isPaketUpgrade: false,
    stock: 14,
    originCity: 'Jakarta Timur',
    bikeCompatibility: ['vario-pcx', 'beat-scoopy', 'mio-series']
  },
  {
    id: 'prod-7',
    name: 'Paket Kirian Komplit Upgrade NMAX / Aerox / Lexi 155cc - Top Speed & Torsi',
    category: 'paket-upgrade',
    compatibilityText: 'All New NMAX, Old NMAX, Aerox 155 Connected, Lexi',
    fitmentTag: 'Plug & Play (PnP)',
    price: 520000,
    originalPrice: 720000,
    discountPercent: 28,
    promoTag: 'Best Seller',
    rating: 4.9,
    soldCount: 2740,
    image: '/images/tdr_cvt_kit_1789096476924.jpg',
    description: 'Paket khusus Maxi Yamaha dengan sudut kemiringan pulley presisi CNC 13.5° interlock. Meningkatkan top speed hingga +15 km/jam di jalan datar.',
    specs: {
      'Isi Paket': 'Pulley Custom Keruk Jalur CNC, Mangkok Ganda Ringan Anti Selip, Per TDR 1500 RPM, Roller Kawahara Mix',
      Torsi: 'Naik +1.4 Nm pada 6500 RPM',
      Fitment: 'Langsung pasang di kruk as Yamaha 155'
    },
    isPromo: true,
    isPaketUpgrade: true,
    stock: 18,
    originCity: 'Jakarta Timur',
    bikeCompatibility: ['nmax-aerox']
  },
  {
    id: 'prod-8',
    name: 'Paket Upgrade CVT Full Set Jawir Garage - Anti Gredek Vario & PCX Series',
    category: 'paket-upgrade',
    compatibilityText: 'Vario 125 / 150 / 160 & PCX 150 / 160',
    fitmentTag: 'Plug & Play (PnP)',
    price: 485000,
    originalPrice: 650000,
    discountPercent: 25,
    promoTag: 'Paket Hemat',
    rating: 5,
    soldCount: 3120,
    image: '/images/tdr_cvt_kit_1789096476924.jpg',
    description: 'Racikan kirian legendaris Jawir Garage. Melenyapkan getaran gredek 100%, tarikan bawah responsif, dan nafas tengah-atas ngisi terus.',
    specs: {
      'Isi Paket': 'Pulley Bubut 13.8°, Mangkok Ganda Bolong Kartel, Kampas Carbon, Per CVT 1500 RPM, Per Sentri 1000 RPM, Roller BRT',
      Garansi: 'Anti Gredek 6 Bulan / Uang Kembali',
      Pemasangan: '100% PnP tanpa ubah crankcase'
    },
    isPromo: true,
    isPaketUpgrade: true,
    stock: 21,
    originCity: 'Jakarta Timur',
    bikeCompatibility: ['vario-pcx']
  }
];
