export type BikeType =
  | 'all'
  | 'vario-pcx'
  | 'nmax-aerox'
  | 'beat-scoopy'
  | 'mio-series'
  | 'sport-bebek';

export type MainTabType = 'semua' | 'paket-upgrade' | 'kategori' | 'promo';

export type SortOption = 'populer' | 'terbaru' | 'terlaris' | 'harga-asc' | 'harga-desc';

export interface ProductVariationOption {
  name: string;
  price?: number;
  priceModifier?: number;
  stock?: number;
}

export interface ProductVariationGroup {
  name: string;
  options: (string | ProductVariationOption)[];
}

export interface Product {
  id: string;
  name: string;
  slug?: string;
  category: 'paket-upgrade' | 'cvt' | 'pengereman' | 'kaki-kaki' | 'mesin' | 'aksesoris';
  bikeCompatibility: BikeType[];
  compatibilityText: string;
  fitmentTag: string;
  price: number;
  originalPrice: number;
  discountPercent: number;
  promoTag: string;
  rating: number;
  soldCount: number;
  image: string;
  description: string;
  specs: { [key: string]: string };
  isPaketUpgrade?: boolean;
  isPromo?: boolean;
  stock: number;
  weight_grams?: number;
  originCity: string;
  is_active?: boolean;
  created_at?: string;
  variationGroups?: ProductVariationGroup[];
  bikeVariants?: string[];
}

export interface Voucher {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  discount_type?: 'PERCENT' | 'FIXED';
  discount_value?: number;
  minSpend: number;
  max_discount_amount?: number;
  discountAmount: number;
  quota?: number;
  used_count?: number;
  expiryText: string;
  badge: string;
  claimed: boolean;
  is_active?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariant?: string;
  customPrice?: number;
}

export interface UserBike {
  id: string;
  name: string;
  type: BikeType;
  year: string;
  cc: string;
}

export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id?: string;
  product_name_snapshot: string;
  price_snapshot: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: string;
  invoice_number: string;
  user_id?: string | null;
  customer_name: string;
  customer_email?: string | null;
  customer_phone: string;
  shipping_address: string;
  customer_notes?: string | null;
  shipping_province?: string;
  shipping_city?: string;
  shipping_district?: string;
  courier_name: string;
  courier_service: string;
  tracking_number?: string | null;
  subtotal_amount: number;
  shipping_cost: number;
  voucher_id?: string | null;
  voucher_code?: string | null;
  discount_amount: number;
  grand_total: number;
  status: OrderStatus;
  payment_method: string;
  payment_url?: string | null;
  snap_token?: string | null;
  biteship_order_id?: string | null;
  expired_at: string;
  paid_at?: string | null;
  created_at: string;
  items: OrderItem[];
}

export interface ChatProductPayload {
  id: string;
  name: string;
  slug?: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  image: string;
  stock: number;
  rating?: number;
  soldCount?: number;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_type: 'user' | 'admin' | 'bot';
  sender_name: string;
  message: string;
  product_payload?: ChatProductPayload | null;
  created_at: string;
}

export interface ChatRoom {
  id: string;
  user_id?: string | null;
  user_name: string;
  last_message?: string;
  last_message_at: string;
  unread_admin: number;
  unread_user: number;
  bot_enabled: boolean | number;
  created_at: string;
}
