import React from 'react';
import { ChevronRight, Flame, Zap, Sparkles, PackageCheck, Disc, ShieldCheck } from 'lucide-react';
import { BikeType } from '../types';

export interface CategoryItem {
  id: string;
  title: string;
  subtitle: string;
  bikeFilter?: BikeType;
  categoryFilter?: string;
  badgeText: string;
  count: number;
  icon: string;
  tagline: string;
}

interface VerticalCategoryListProps {
  categories: CategoryItem[];
  onSelectCategoryFilter: (categoryTitle: string, bikeFilter?: BikeType, catFilter?: string) => void;
}

export const VerticalCategoryList: React.FC<VerticalCategoryListProps> = ({
  categories,
  onSelectCategoryFilter,
}) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Flame':
        return <Flame className="w-5 h-5 text-[#E50914]" />;
      case 'Zap':
        return <Zap className="w-5 h-5 text-amber-400" />;
      case 'Sparkles':
        return <Sparkles className="w-5 h-5 text-emerald-400" />;
      case 'PackageCheck':
        return <PackageCheck className="w-5 h-5 text-red-400" />;
      case 'Disc':
        return <Disc className="w-5 h-5 text-blue-400" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-5 h-5 text-purple-400" />;
      default:
        return <Zap className="w-5 h-5 text-[#E50914]" />;
    }
  };

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
      <div className="space-y-2.5">
        {categories.map((cat) => (
          <div
            key={cat.id}
            id={`category-row-${cat.id}`}
            onClick={() => onSelectCategoryFilter(cat.title, cat.bikeFilter, cat.categoryFilter)}
            className="group relative flex items-center justify-between p-3.5 sm:p-4 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-red-600/70 hover:bg-neutral-800/80 transition-all cursor-pointer shadow-sm hover:shadow-lg hover:shadow-red-950/20"
          >
            {/* Left side: Icon & Title & Description */}
            <div className="flex items-center gap-3.5">
              {/* Thumbnail Icon container */}
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-black/80 border border-neutral-700/80 flex items-center justify-center flex-shrink-0 group-hover:border-[#E50914] transition-colors">
                {getIcon(cat.icon)}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-bold text-xs sm:text-sm md:text-base text-white group-hover:text-red-400 transition-colors uppercase tracking-wide">
                    {cat.title}
                  </h3>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-800/40 uppercase tracking-wider hidden sm:inline-block">
                    {cat.badgeText}
                  </span>
                </div>
                
                <p className="text-[11px] sm:text-xs text-neutral-400 font-medium mt-0.5">
                  {cat.tagline}
                </p>

                <div className="flex items-center gap-2 mt-1 sm:hidden">
                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-red-950/80 text-red-300 border border-red-800/40 uppercase">
                    {cat.badgeText}
                  </span>
                  <span className="text-[10px] text-neutral-500 font-semibold">
                    {cat.count} Part Tersedia
                  </span>
                </div>
              </div>
            </div>

            {/* Right side: Count & Chevron */}
            <div className="flex items-center gap-2 flex-shrink-0 pl-2">
              <span className="text-xs font-bold text-neutral-400 hidden sm:block">
                {cat.count} Part
              </span>
              <div className="w-7 h-7 rounded-full bg-neutral-800 group-hover:bg-[#E50914] text-neutral-300 group-hover:text-white flex items-center justify-center transition-colors">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
