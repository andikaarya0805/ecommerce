import React from 'react';
import { Product, UserBike } from '../types';
import { ShoppingBag, Star, CheckCircle, Zap, ShieldCheck } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  userBike: UserBike | null;
  onAddToCart: (product: Product, e: React.MouseEvent) => void;
  onSelectProduct: (product: Product) => void;
}

export const formatIDR = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace('IDR', 'Rp');
};

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  userBike,
  onAddToCart,
  onSelectProduct,
}) => {
  const isCompatibleWithUser =
    userBike && product.bikeCompatibility?.includes(userBike.type);

  // Calculate discount percent if not provided
  const discountPercent =
    product.discountPercent ||
    (product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : null);

  const formattedSold =
    product.soldCount > 1000
      ? `${(product.soldCount / 1000).toFixed(1)}RB`
      : `${product.soldCount}`;

  return (
    <article
      id={`product-card-${product.id}`}
      onClick={() => onSelectProduct(product)}
      className="group relative flex flex-col bg-[#141414] hover:bg-[#1a1a1a] rounded-lg border border-neutral-800 hover:border-[#D0011B] shadow-sm hover:shadow-xl hover:shadow-red-950/30 transition-all duration-200 overflow-hidden cursor-pointer select-none"
    >
      {/* 1:1 Aspect Ratio Image Container */}
      <div className="relative aspect-square w-full bg-[#1e1e1e] overflow-hidden flex items-center justify-center">
        {/* Subtle Checkered Layer */}
        <div className="absolute inset-0 bg-[radial-gradient(#2d2d2d_1px,transparent_1px)] [background-size:12px_12px] opacity-40 group-hover:scale-105 transition-transform duration-500" />

        {/* Product photo */}
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="relative z-10 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
        />

        {/* Shopee Mall Official Red Tag (Pojok Kiri Atas) */}
        <div className="absolute top-0 left-0 z-20 flex flex-col items-start">
          <span className="bg-[#D0011B] text-white text-[10px] font-black px-2 py-0.5 rounded-br shadow-md tracking-wider uppercase flex items-center gap-1">
            MALL
          </span>
          {product.promoTag && (
            <span className="bg-amber-500 text-black text-[9px] font-black px-1.5 py-0.2 rounded-br shadow-sm tracking-tight uppercase mt-0.5">
              {product.promoTag}
            </span>
          )}
        </div>

        {/* Shopee Discount Ribbon (Pojok Kanan Atas) */}
        {discountPercent && discountPercent > 0 && (
          <div className="absolute top-0 right-0 z-20 bg-gradient-to-b from-amber-400 to-amber-500 text-neutral-950 px-1.5 py-1 text-center shadow-md">
            <span className="text-[11px] font-black leading-none block text-[#D0011B]">
              -{discountPercent}%
            </span>
            <span className="text-[8px] font-extrabold uppercase tracking-tighter leading-none block text-neutral-900 mt-0.5">
              DISKON
            </span>
          </div>
        )}

        {/* Garage Bike Compatibility Badge */}
        {isCompatibleWithUser && (
          <div className="absolute bottom-2 right-2 z-20">
            <span className="bg-emerald-950/90 border border-emerald-500/80 text-emerald-300 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm backdrop-blur-xs">
              <CheckCircle className="w-2.5 h-2.5 text-emerald-400" />
              <span>Cocok Motor Kamu</span>
            </span>
          </div>
        )}

        {/* Fitment Tag overlay (bottom-left) */}
        <div className="absolute bottom-2 left-2 z-20">
          <span className="bg-black/85 backdrop-blur-xs text-neutral-200 border border-neutral-700/80 text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wide">
            {product.fitmentTag || 'PnP'}
          </span>
        </div>
      </div>

      {/* Product Content Details (Shopee Layout) */}
      <div className="flex flex-col flex-1 p-2.5 sm:p-3 justify-between">
        <div>
          {/* Shopee Badges: Gratis Ongkir XTRA & COD */}
          <div className="flex items-center gap-1 mb-1.5 flex-wrap">
            <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[9px] font-bold px-1 rounded flex items-center gap-0.5">
              <span>Gratis Ongkir XTRA</span>
            </span>
            <span className="bg-red-950 text-red-300 border border-red-800 text-[9px] font-bold px-1 rounded">
              COD
            </span>
          </div>

          {/* Product Title: 2 lines clamp */}
          <h3 className="font-sans font-medium text-xs sm:text-sm text-neutral-100 line-clamp-2 leading-snug group-hover:text-red-400 transition-colors">
            {product.name}
          </h3>

          <p className="text-[10px] text-neutral-400 font-normal truncate mt-0.5">
            {product.compatibilityText}
          </p>
        </div>

        <div className="mt-2.5 pt-2 border-t border-neutral-800/80">
          {/* Price Row (Shopee Mall Style) */}
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <div className="flex items-baseline text-[#D0011B] font-racing font-black">
              <span className="text-xs mr-0.5">Rp</span>
              <span className="text-base sm:text-lg tracking-tight">
                {product.price.toLocaleString('id-ID')}
              </span>
            </div>

            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-[10px] text-neutral-500 line-through">
                Rp {product.originalPrice.toLocaleString('id-ID')}
              </span>
            )}
          </div>

          {/* Rating, Sold, & City Row */}
          <div className="flex items-center justify-between text-[10px] text-neutral-400 mt-1.5">
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <strong className="text-neutral-200">{product.rating}</strong>
              <span className="text-neutral-500">•</span>
              <span>Terjual {formattedSold}</span>
            </div>
            <span className="text-neutral-500 text-[9px] truncate max-w-[85px]">
              {product.originCity || 'Jakarta Timur'}
            </span>
          </div>

          {/* Add to Cart Button */}
          <button
            id={`add-cart-btn-${product.id}`}
            onClick={(e) => onAddToCart(product, e)}
            className="w-full mt-2.5 bg-[#D0011B] hover:bg-red-700 active:scale-95 text-white font-bold text-xs sm:text-sm py-2.5 px-3 min-h-[38px] rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>+ Keranjang</span>
          </button>
        </div>
      </div>
    </article>
  );
};
