import React from 'react';
import { Product, UserBike } from '../types';
import { ProductCard } from './ProductCard';
import { SearchX, Sparkles } from 'lucide-react';

interface ProductGridProps {
  products: Product[];
  userBike: UserBike | null;
  onAddToCart: (product: Product, e: React.MouseEvent) => void;
  onSelectProduct: (product: Product) => void;
  onResetFilters: () => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  userBike,
  onAddToCart,
  onSelectProduct,
  onResetFilters,
}) => {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-14 h-14 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-3">
          <SearchX className="w-7 h-7 text-neutral-500" />
        </div>
        <h3 className="text-base font-bold text-white mb-1 font-heading">
          Tidak Ada Part yang Cocok
        </h3>
        <p className="text-xs text-neutral-400 max-w-xs mb-4">
          Coba ganti filter tipe motor atau gunakan kata kunci pencarian yang lebih umum (misal: CVT, Roller, Rem).
        </p>
        <button
          onClick={onResetFilters}
          className="inline-flex items-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold px-4 py-2 rounded-lg border border-neutral-700 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#E50914]" />
          <span>Reset Semua Filter</span>
        </button>
      </div>
    );
  }

  return (
    <section aria-label="Daftar Produk" className="p-3 sm:p-4">
      {/* 2-Column Product Grid strictly mobile-first */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            userBike={userBike}
            onAddToCart={onAddToCart}
            onSelectProduct={onSelectProduct}
          />
        ))}
      </div>
    </section>
  );
};
