import React, { useState, useEffect, useMemo } from 'react';
import { Product, UserBike } from '../types';
import {
  getProductVariationGroups,
  getOptionName,
  getProductPriceRange,
  calculateSelectedPrice,
} from '../data/productVariations';
import { formatIDR } from './ProductCard';
import { X, Check, ShoppingBag, Zap, AlertCircle, Minus, Plus } from 'lucide-react';

interface ShopeeVariationModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number, selectedVariant: string, customPrice?: number) => void;
  onBuyNow?: (product: Product, quantity: number, selectedVariant: string, customPrice?: number) => void;
  userBike?: UserBike | null;
}

export const ShopeeVariationModal: React.FC<ShopeeVariationModalProps> = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
  onBuyNow,
  userBike,
}) => {
  const [selectedOptions, setSelectedOptions] = useState<{ [groupName: string]: string }>({});
  const [quantity, setQuantity] = useState(1);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Get variation groups for the current product
  const variationGroups = useMemo(() => {
    if (!product) return [];
    return getProductVariationGroups(product);
  }, [product]);

  // Price range helper
  const priceRange = useMemo(() => {
    if (!product) return { minPrice: 0, maxPrice: 0, hasRange: false };
    return getProductPriceRange(product);
  }, [product]);

  // Initialize or reset selected options on open
  useEffect(() => {
    if (product && isOpen) {
      const initial: { [groupName: string]: string } = {};
      const groups = getProductVariationGroups(product);

      // If user has a bike in garage, match motor group if available
      groups.forEach((group, index) => {
        if (index === 0 && userBike) {
          const matchingOpt = group.options.find((opt) => {
            const name = getOptionName(opt).toLowerCase();
            const bikeName = userBike.name.toLowerCase();
            return (
              (bikeName.includes('vario') && name.includes('vario')) ||
              (bikeName.includes('pcx') && name.includes('pcx')) ||
              (bikeName.includes('nmax') && name.includes('nmax')) ||
              (bikeName.includes('aerox') && name.includes('aerox')) ||
              (bikeName.includes('beat') && name.includes('beat')) ||
              (bikeName.includes('scoopy') && name.includes('scoopy')) ||
              (bikeName.includes('mio') && name.includes('mio'))
            );
          });

          if (matchingOpt) {
            initial[group.name] = getOptionName(matchingOpt);
          }
        }
      });

      // If there's only 1 group with varying prices (like Shopee video), leave it unselected so the customer sees the range and clicks to choose!
      if (!priceRange.hasRange && groups.length > 0) {
        groups.forEach((g) => {
          if (!initial[g.name] && g.options.length > 0) {
            initial[g.name] = getOptionName(g.options[0]);
          }
        });
      }

      setSelectedOptions(initial);
      setQuantity(1);
      setValidationError(null);
    }
  }, [product, isOpen, userBike, priceRange.hasRange]);

  if (!isOpen || !product) return null;

  // Calculate dynamic price based on selected options
  const { dynamicPrice, dynamicOriginalPrice } = calculateSelectedPrice(product, selectedOptions);

  // Check if any option is selected
  const hasAnySelection = Object.keys(selectedOptions).length > 0;

  // Check if all variation groups are chosen
  const unselectedGroups = variationGroups.filter((g) => !selectedOptions[g.name]);
  const isAllSelected = unselectedGroups.length === 0;

  // Summary string
  const variantString = Object.values(selectedOptions).filter(Boolean).join(' • ');

  const handleSelectOption = (groupName: string, optionName: string) => {
    setSelectedOptions((prev) => {
      if (prev[groupName] === optionName) {
        // Toggle off if already selected
        const copy = { ...prev };
        delete copy[groupName];
        return copy;
      }
      return {
        ...prev,
        [groupName]: optionName,
      };
    });
    setValidationError(null);
  };

  const validateAndProceed = (action: 'cart' | 'buy') => {
    if (!isAllSelected) {
      setValidationError(`Silakan pilih: ${unselectedGroups.map((g) => g.name).join(', ')}`);
      return;
    }

    if (action === 'cart') {
      onAddToCart(product, quantity, variantString, dynamicPrice);
      onClose();
    } else if (action === 'buy') {
      if (onBuyNow) {
        onBuyNow(product, quantity, variantString, dynamicPrice);
      } else {
        onAddToCart(product, quantity, variantString, dynamicPrice);
      }
      onClose();
    }
  };

  const availableStock = product.stock || 25;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      />

      {/* Modal Card / Bottom Sheet */}
      <div
        id="shopee-variation-modal"
        className="relative w-full max-w-lg bg-[#141414] border-t sm:border border-neutral-800 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] z-10 animate-in slide-in-from-bottom-6 duration-200"
      >
        {/* Header: Product Preview (Shopee Style) */}
        <div className="p-4 border-b border-neutral-800 flex gap-3 relative bg-[#181818]/80">
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="absolute top-3 right-3 p-1.5 rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Thumbnail */}
          <div className="relative w-20 h-20 sm:w-22 sm:h-22 rounded-lg overflow-hidden border border-neutral-700 bg-neutral-900 flex-shrink-0">
            <img
              src={product.image}
              alt={product.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-0 left-0 bg-[#D0011B] text-white text-[8px] font-black px-1 py-0.2 rounded-br uppercase">
              MALL
            </div>
          </div>

          {/* Product Price & Stock Preview (Shopee Style Dynamic Switching) */}
          <div className="flex-1 pr-6 flex flex-col justify-between">
            <div>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-xs text-[#D0011B] font-bold">Rp</span>
                {priceRange.hasRange && !hasAnySelection ? (
                  <span className="font-racing font-black text-lg sm:text-xl text-[#D0011B] tracking-tight animate-in fade-in duration-150">
                    {priceRange.minPrice.toLocaleString('id-ID')} - {priceRange.maxPrice.toLocaleString('id-ID')}
                  </span>
                ) : (
                  <span className="font-racing font-black text-xl sm:text-2xl text-[#D0011B] tracking-tight animate-in zoom-in-95 duration-150">
                    {dynamicPrice.toLocaleString('id-ID')}
                  </span>
                )}

                {hasAnySelection && dynamicOriginalPrice > dynamicPrice && (
                  <span className="text-xs text-neutral-500 line-through">
                    {formatIDR(dynamicOriginalPrice)}
                  </span>
                )}
              </div>

              <div className="text-[11px] text-neutral-400 mt-0.5">
                Stok:{' '}
                <span className="text-neutral-200 font-bold">{availableStock}</span>
              </div>
            </div>

            <div className="text-[11px] truncate mt-1">
              {variantString ? (
                <span className="text-neutral-400">
                  Pilihan:{' '}
                  <span className="text-neutral-100 font-bold">{variantString}</span>
                </span>
              ) : (
                <span className="text-amber-400 font-medium">Pilih Variasi Produk di Bawah</span>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Variation Options Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {validationError && (
            <div className="p-2.5 rounded bg-red-950/70 border border-red-800 text-red-200 text-xs flex items-center gap-2 animate-bounce">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {variationGroups.map((group) => {
            const currentSelected = selectedOptions[group.name];
            return (
              <div key={group.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                    {group.name}
                  </h4>
                  {currentSelected && (
                    <span className="text-[10px] text-red-400 font-medium">
                      Terpilih: {currentSelected}
                    </span>
                  )}
                </div>

                {/* Chips Grid */}
                <div className="flex flex-wrap gap-2">
                  {group.options.map((opt) => {
                    const optName = getOptionName(opt);
                    const isSelected = currentSelected === optName;

                    return (
                      <button
                        key={optName}
                        type="button"
                        onClick={() => handleSelectOption(group.name, optName)}
                        className={`group relative px-3 py-2 rounded text-xs transition-all cursor-pointer text-left ${
                          isSelected
                            ? 'bg-[#D0011B]/15 border-2 border-[#D0011B] text-[#D0011B] font-bold shadow-md shadow-red-950/20'
                            : 'bg-[#1e1e1e] border border-neutral-700 hover:border-neutral-500 text-neutral-300 font-normal hover:text-white'
                        }`}
                      >
                        <span>{optName}</span>

                        {/* Signature Shopee Corner Triangle Checkmark */}
                        {isSelected && (
                          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#D0011B] rounded-tl flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white stroke-[3.5]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Stepper Quantity Row (Shopee Style) */}
          <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
            <div>
              <span className="text-xs text-neutral-300 font-medium block">Jumlah Pembelian</span>
              <span className="text-[10px] text-neutral-500">Maks. {availableStock} per transaksi</span>
            </div>

            <div className="flex items-center border border-neutral-700 rounded bg-[#202020] overflow-hidden">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3 py-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="px-3 py-1 text-xs font-bold text-white min-w-[36px] text-center">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(availableStock, q + 1))}
                className="px-3 py-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions (Shopee Style Dual Buttons) */}
        <div className="p-3 border-t border-neutral-800 bg-[#161616] flex gap-2">
          <button
            type="button"
            onClick={() => validateAndProceed('cart')}
            className="flex-1 py-3 px-3 rounded-lg border border-[#D0011B] bg-[#D0011B]/15 hover:bg-[#D0011B]/25 text-[#D0011B] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Masukkan Keranjang</span>
          </button>

          <button
            type="button"
            onClick={() => validateAndProceed('buy')}
            className="flex-1 py-3 px-3 rounded-lg bg-[#D0011B] hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-red-950/40 transition-colors cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>Beli Sekarang</span>
          </button>
        </div>
      </div>
    </div>
  );
};
