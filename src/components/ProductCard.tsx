import React from 'react';
import { Product, UserBike } from '../types';
import { ShoppingBag, Star, CheckCircle, Zap } from 'lucide-react';

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
  }).format(amount).replace('IDR', 'Rp');
};

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  userBike,
  onAddToCart,
  onSelectProduct,
}) => {
  // Check if compatible with user's garage bike
  const isCompatibleWithUser =
    userBike && product.bikeCompatibility.includes(userBike.type);

  return (
    <article
      id={`product-card-${product.id}`}
      onClick={() => onSelectProduct(product)}
      className="group relative flex flex-col bg-neutral-900/90 rounded-xl border border-neutral-800 hover:border-neutral-700 hover:shadow-xl hover:shadow-red-950/20 transition-all duration-200 overflow-hidden cursor-pointer"
    >
      {/* Image Area with brand-themed racing background */}
      <div className="relative aspect-square w-full bg-[#161616] overflow-hidden flex items-center justify-center">
        {/* Subtle checkered racing background layer */}
        <div className="absolute inset-0 bg-[radial-gradient(#252525_1px,transparent_1px)] [background-size:12px_12px] opacity-40 group-hover:scale-105 transition-transform duration-500" />
        
        {/* Product photo */}
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="relative z-10 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
        />

        {/* Promo tag overlay (top-left) */}
        {product.promoTag && (
          <div className="absolute top-2 left-2 z-20">
            <span className="bg-[#E50914] text-white text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded shadow-md tracking-wider uppercase flex items-center gap-1">
              <Zap className="w-2.5 h-2.5 fill-current" />
              {product.promoTag}
            </span>
          </div>
        )}

        {/* User Bike compatibility match badge (top-right) */}
        {isCompatibleWithUser && (
          <div className="absolute top-2 right-2 z-20">
            <span className="bg-emerald-950/90 border border-emerald-500/80 text-emerald-300 text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm backdrop-blur-xs">
              <CheckCircle className="w-2.5 h-2.5 text-emerald-400" />
              Fit Motor Kamu
            </span>
          </div>
        )}

        {/* Fitment Tag overlay (bottom-left) */}
        <div className="absolute bottom-2 left-2 z-20">
          <span className="bg-black/80 backdrop-blur-xs text-neutral-200 border border-neutral-700/80 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded tracking-wide">
            {product.fitmentTag}
          </span>
        </div>
      </div>

      {/* Product Content Details */}
      <div className="flex flex-col flex-1 p-2.5 sm:p-3 justify-between">
        <div>
          {/* Compatibility subtitle / micro text */}
          <p className="text-[10px] text-neutral-400 font-medium truncate mb-1">
            {product.compatibilityText}
          </p>

          {/* Product Title: Bold, clear product name */}
          <h3 className="font-heading font-bold text-xs sm:text-sm text-neutral-100 line-clamp-2 leading-snug group-hover:text-white transition-colors">
            {product.name}
          </h3>
        </div>

        <div className="mt-2 pt-2 border-t border-neutral-800/80">
          {/* Price Section: Prominent bold red price */}
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1.5">
              <span className="font-racing font-black text-sm sm:text-base md:text-lg text-[#E50914] tracking-tight">
                {formatIDR(product.price)}
              </span>
              {product.originalPrice > product.price && (
                <span className="text-[10px] sm:text-[11px] text-neutral-500 line-through">
                  {formatIDR(product.originalPrice)}
                </span>
              )}
            </div>

            {/* Rating & Sold count */}
            <div className="flex items-center justify-between text-[10px] text-neutral-400 mt-1">
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <strong className="text-neutral-200">{product.rating}</strong>
                <span>({product.soldCount > 1000 ? `${(product.soldCount / 1000).toFixed(1)}k+` : product.soldCount})</span>
              </span>
              <span className="text-neutral-500">{product.originCity}</span>
            </div>
          </div>

          {/* Card Action: Quick "+ Keranjang" / "Beli Sekarang" button */}
          <div className="mt-2.5">
            <button
              id={`add-cart-btn-${product.id}`}
              onClick={(e) => onAddToCart(product, e)}
              className="w-full bg-[#E50914] hover:bg-red-700 active:scale-95 text-white font-bold text-xs py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>+ Keranjang</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
