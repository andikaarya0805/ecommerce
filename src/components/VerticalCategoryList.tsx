import React from 'react';
import { ChevronRight, Flame } from 'lucide-react';
import { BikeType, Product } from '../types';
import { normalizeCategory } from '../data/categories';

export interface CategoryItem {
  id: string;
  title: string;
  subtitle: string;
  bikeFilter?: BikeType;
  categoryFilter?: string;
  badgeText: string;
  count?: number;
  icon?: string;
  tagline: string;
  image?: string;
  totalSold?: number;
}

interface VerticalCategoryListProps {
  categories: CategoryItem[];
  products?: Product[];
  onSelectCategoryFilter: (categoryTitle: string, bikeFilter?: BikeType, catFilter?: string) => void;
}

export const formatSold = (num?: number): string => {
  if (!num || num === 0) return '0';
  if (num >= 1000) {
    const k = (num / 1000).toFixed(1).replace('.0', '');
    return `${k}rb`;
  }
  return String(num);
};

export const VerticalCategoryList: React.FC<VerticalCategoryListProps> = ({
  categories,
  products = [],
  onSelectCategoryFilter,
}) => {
  return (
    <section aria-labelledby="vertical-cat-heading" className="p-3 sm:p-4 max-w-3xl mx-auto">
      {/* Header info */}
      <div className="mb-4">
        <h2 id="vertical-cat-heading" className="font-racing font-bold text-lg sm:text-xl uppercase tracking-wider text-white flex items-center gap-2">
          <span className="w-2 h-4 bg-[#E50914] rounded-xs" />
          Kategori Spesialis Platinum Racing
        </h2>
        <p className="text-xs text-neutral-400 mt-1">
          Pilih kategori atau paket upgrade spesifik untuk motor kamu. Semua part terjamin Plug and Play (PnP).
        </p>
      </div>

      {/* Vertical structured category list */}
      <div className="space-y-3">
        {categories.map((cat) => {
          // Dynamic calculation from real products array
          const categoryProducts = products.filter(
            (p) => normalizeCategory(p.category) === cat.categoryFilter
          );
          const realProductCount = categoryProducts.length;
          const totalSold = categoryProducts.reduce((sum, p) => sum + (p.soldCount || 0), 0);

          // Find best-selling product in this category
          const bestProduct = categoryProducts.length > 0
            ? [...categoryProducts].sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0))[0]
            : null;

          const displayImage = bestProduct?.image || cat.image || '/images/racing_scooter_hero_1789096506709.jpg';

          return (
            <div
              key={cat.id}
              id={`category-row-${cat.id}`}
              onClick={() => onSelectCategoryFilter(cat.title, cat.bikeFilter, cat.categoryFilter)}
              className="group relative flex items-center justify-between p-3 sm:p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 hover:border-red-600/70 hover:bg-neutral-800/90 transition-all cursor-pointer shadow-sm hover:shadow-xl hover:shadow-red-950/20"
            >
              {/* Left side: Best-selling Product Photo & Details */}
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Product Thumbnail with Sleek Best Seller Tag */}
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-black border border-neutral-700/80 overflow-hidden flex-shrink-0 group-hover:border-[#E50914] group-hover:shadow-md group-hover:shadow-red-950/40 transition-all relative">
                  <img
                    src={displayImage}
                    alt={bestProduct?.name || cat.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/racing_scooter_hero_1789096506709.jpg';
                    }}
                  />
                  {bestProduct && (
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/70 to-transparent py-0.5 text-center">
                      <span className="text-[7.5px] font-black uppercase text-amber-300 tracking-wider">
                        Terlaris
                      </span>
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-heading font-bold text-xs sm:text-sm md:text-base text-white group-hover:text-red-400 transition-colors uppercase tracking-wide">
                      {cat.title}
                    </h3>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-800/40 uppercase tracking-wider">
                      {cat.badgeText}
                    </span>
                  </div>
                  
                  <p className="text-[11px] sm:text-xs text-neutral-400 font-medium mt-0.5 line-clamp-1">
                    {cat.tagline}
                  </p>

                  {/* Best-selling part info line */}
                  {bestProduct && (
                    <p className="text-[10px] text-neutral-500 truncate max-w-[260px] sm:max-w-md mt-0.5 hidden sm:block">
                      Part Terlaris: <span className="text-neutral-300 font-medium">{bestProduct.name}</span>
                    </p>
                  )}

                  {/* Mobile statistics */}
                  <div className="flex items-center gap-2 mt-1 sm:hidden">
                    <span className="text-[10px] text-white font-bold bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-700">
                      {realProductCount} Part
                    </span>
                    {totalSold > 0 && (
                      <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-0.5">
                        <Flame className="w-3 h-3 text-[#E50914]" />
                        {formatSold(totalSold)} Terjual
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right side: Real Product Count & Sales Statistic (Desktop) */}
              <div className="flex items-center gap-3 flex-shrink-0 pl-3">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-white">
                    {realProductCount} Part Tersedia
                  </div>
                  {totalSold > 0 ? (
                    <div className="text-[11px] font-semibold text-amber-400 flex items-center justify-end gap-1 mt-0.5">
                      <Flame className="w-3 h-3 text-[#E50914]" />
                      <span>{formatSold(totalSold)} Terjual</span>
                    </div>
                  ) : (
                    <div className="text-[10px] text-neutral-500 mt-0.5">Stok Baru</div>
                  )}
                </div>

                <div className="w-8 h-8 rounded-full bg-neutral-800/90 group-hover:bg-[#E50914] text-neutral-300 group-hover:text-white flex items-center justify-center transition-all group-hover:scale-105">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
