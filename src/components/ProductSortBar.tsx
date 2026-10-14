import React from 'react';
import { SortOption } from '../types';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface ProductSortBarProps {
  sortOption: SortOption;
  onSelectSort: (option: SortOption) => void;
  totalProducts: number;
}

export const ProductSortBar: React.FC<ProductSortBarProps> = ({
  sortOption,
  onSelectSort,
  totalProducts,
}) => {
  const isPriceSort = sortOption === 'harga-asc' || sortOption === 'harga-desc';

  const togglePriceSort = () => {
    if (sortOption === 'harga-asc') {
      onSelectSort('harga-desc');
    } else {
      onSelectSort('harga-asc');
    }
  };

  return (
    <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 text-xs border-b border-neutral-800/60 bg-[#121212]">
      {/* Product counter */}
      <div className="flex items-center gap-1.5 text-neutral-400 font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-[#E50914]" />
        <span>Menampilkan <strong className="text-white">{totalProducts}</strong> Part</span>
      </div>

      {/* Sorting options */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        <span className="text-neutral-500 font-medium hidden sm:inline mr-1">Urutkan:</span>

        <button
          id="sort-populer"
          onClick={() => onSelectSort('populer')}
          className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
            sortOption === 'populer'
              ? 'bg-neutral-800 text-white border border-neutral-700'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Populer
        </button>

        <button
          id="sort-terbaru"
          onClick={() => onSelectSort('terbaru')}
          className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
            sortOption === 'terbaru'
              ? 'bg-neutral-800 text-white border border-neutral-700'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Terbaru
        </button>

        <button
          id="sort-terlaris"
          onClick={() => onSelectSort('terlaris')}
          className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
            sortOption === 'terlaris'
              ? 'bg-neutral-800 text-white border border-neutral-700'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Terlaris
        </button>

        {/* Price toggle button */}
        <button
          id="sort-harga"
          onClick={togglePriceSort}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
            isPriceSort
              ? 'bg-neutral-800 text-[#E50914] border border-[#E50914]/50'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <span>Harga</span>
          {sortOption === 'harga-asc' ? (
            <ArrowUp className="w-3 h-3 text-[#E50914]" />
          ) : sortOption === 'harga-desc' ? (
            <ArrowDown className="w-3 h-3 text-[#E50914]" />
          ) : (
            <ArrowUpDown className="w-3 h-3 text-neutral-500" />
          )}
        </button>
      </div>
    </div>
  );
};
