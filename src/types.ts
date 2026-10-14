export type BikeType =
  | 'all'
  | 'vario-pcx'
  | 'nmax-aerox'
  | 'beat-scoopy'
  | 'mio-series'
  | 'sport-bebek';

export type MainTabType = 'semua' | 'paket-upgrade' | 'kategori' | 'promo';

export type SortOption = 'populer' | 'terbaru' | 'terlaris' | 'harga-asc' | 'harga-desc';

export interface Product {
  id: string;
  name: string;
  category: 'paket-upgrade' | 'cvt' | 'pengereman' | 'kaki-kaki' | 'mesin' | 'aksesoris';
  bikeCompatibility: BikeType[];
  compatibilityText: string;
  fitmentTag: string; // e.g. "Plug & Play", "100% PnP Presisi"
  price: number;
  originalPrice: number;
  discountPercent: number;
  promoTag: string; // e.g. "Promo 35%", "Paket Hemat", "Best Seller"
  rating: number;
  soldCount: number;
  image: string;
  description: string;
  specs: { [key: string]: string };
  isPaketUpgrade?: boolean;
  isPromo?: boolean;
  stock: number;
  originCity: string;
}

export interface Voucher {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  minSpend: number;
  discountAmount: number;
  expiryText: string;
  badge: string;
  claimed: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariant?: string;
}

export interface UserBike {
  id: string;
  name: string;
  type: BikeType;
  year: string;
  cc: string;
}
