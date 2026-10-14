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
    <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 text-xs bg-[#171717] border-y border-neutral-800 select-none">
      {/* Product count */}
      <div className="flex items-center gap-1.5 text-neutral-400 font-medium text-xs">
        <span>Menampilkan <strong className="text-white">{totalProducts}</strong> produk</span>
      </div>

      {/* Shopee Style Sort Buttons */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <span className="text-neutral-400 text-xs hidden sm:inline mr-1">Urutkan:</span>

        <button
          id="sort-populer"
          onClick={() => onSelectSort('populer')}
          className={`px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
            sortOption === 'populer'
              ? 'bg-[#D0011B] text-white shadow-sm'
              : 'bg-neutral-850 hover:bg-neutral-800 text-neutral-300 border border-neutral-750'
          }`}
        >
          Terkait
        </button>

        <button
          id="sort-terbaru"
          onClick={() => onSelectSort('terbaru')}
          className={`px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
            sortOption === 'terbaru'
              ? 'bg-[#D0011B] text-white shadow-sm'
              : 'bg-neutral-850 hover:bg-neutral-800 text-neutral-300 border border-neutral-750'
          }`}
        >
          Terbaru
        </button>

        <button
          id="sort-terlaris"
          onClick={() => onSelectSort('terlaris')}
          className={`px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
            sortOption === 'terlaris'
              ? 'bg-[#D0011B] text-white shadow-sm'
              : 'bg-neutral-850 hover:bg-neutral-800 text-neutral-300 border border-neutral-750'
          }`}
        >
          Terlaris
        </button>

        {/* Shopee Price Sort Toggle */}
        <button
          id="sort-harga"
          onClick={togglePriceSort}
          className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
            isPriceSort
              ? 'bg-[#D0011B] text-white shadow-sm'
              : 'bg-neutral-850 hover:bg-neutral-800 text-neutral-300 border border-neutral-750'
          }`}
        >
          <span>Harga</span>
          {sortOption === 'harga-asc' ? (
            <ArrowUp className="w-3.5 h-3.5 text-white" />
          ) : sortOption === 'harga-desc' ? (
            <ArrowDown className="w-3.5 h-3.5 text-white" />
          ) : (
            <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400" />
          )}
        </button>
      </div>
    </div>
  );
};
