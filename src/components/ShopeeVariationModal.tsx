import React, { useState, useEffect, useMemo } from 'react';
import { Product, UserBike } from '../types';
import {
  getProductVariationGroups,
  getOptionName,
  getOptionPriceModifier,
} from '../data/productVariations';
import { formatIDR } from './ProductCard';
import { X, Check, ShoppingBag, Zap, AlertCircle } from 'lucide-react';

interface ShopeeVariationModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number, selectedVariant: string) => void;
  onBuyNow?: (product: Product, quantity: number, selectedVariant: string) => void;
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

  // Pre-select options on open (e.g. auto-pick garage bike or default 1st option)
  useEffect(() => {
    if (product && isOpen) {
      const initial: { [groupName: string]: string } = {};
      const groups = getProductVariationGroups(product);

      groups.forEach((group, index) => {
        // For the first group (Tipe Motor), check if userBike matches any option
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
            return;
          }
        }

        // Auto select first option by default for slick Shopee UX
        if (group.options.length > 0) {
          initial[group.name] = getOptionName(group.options[0]);
        }
      });

      setSelectedOptions(initial);
      setQuantity(1);
      setValidationError(null);
    }
  }, [product, isOpen, userBike]);

  if (!isOpen || !product) return null;

  // Calculate dynamic price based on modifiers
  let dynamicPrice = product.price;
  let dynamicOriginalPrice = product.originalPrice || product.price;

  variationGroups.forEach((group) => {
    const selected = selectedOptions[group.name];
    if (selected) {
      const opt = group.options.find((o) => getOptionName(o) === selected);
      if (opt) {
        const mod = getOptionPriceModifier(opt);
        dynamicPrice += mod;
        dynamicOriginalPrice += mod;
      }
    }
  });

  // Check if all variation groups are chosen
  const unselectedGroups = variationGroups.filter((g) => !selectedOptions[g.name]);
  const isAllSelected = unselectedGroups.length === 0;

  // Summary string
  const variantString = Object.values(selectedOptions).filter(Boolean).join(' • ');

  const handleSelectOption = (groupName: string, optionName: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [groupName]: optionName,
    }));
    setValidationError(null);
  };

  const validateAndProceed = (action: 'cart' | 'buy') => {
    if (!isAllSelected) {
      setValidationError(`Silakan pilih: ${unselectedGroups.map((g) => g.name).join(', ')}`);
      return;
    }

    if (action === 'cart') {
      onAddToCart(product, quantity, variantString);
      onClose();
    } else if (action === 'buy') {
      if (onBuyNow) {
        onBuyNow(product, quantity, variantString);
      } else {
        onAddToCart(product, quantity, variantString);
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

          {/* Product Price & Stock Preview */}
          <div className="flex-1 pr-6 flex flex-col justify-between">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-[#D0011B] font-bold">Rp</span>
                <span className="font-racing font-black text-xl sm:text-2xl text-[#D0011B]">
                  {dynamicPrice.toLocaleString('id-ID')}
                </span>
                {dynamicOriginalPrice > dynamicPrice && (
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

            <div className="text-[11px] truncate">
              {variantString ? (
                <span className="text-neutral-400">
                  Pilihan:{' '}
                  <span className="text-neutral-100 font-bold">{variantString}</span>
                </span>
              ) : (
                <span className="text-red-400 font-medium">Pilih Variasi Produk</span>
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
                    const optMod = getOptionPriceModifier(opt);
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
                        <div className="flex items-center gap-1.5">
                          <span>{optName}</span>
                          {optMod > 0 && (
                            <span className="text-[10px] opacity-75">
                              (+{formatIDR(optMod)})
                            </span>
                          )}
                        </div>

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
              <span className="text-xs font-bold text-neutral-200 block">Jumlah Pembelian</span>
              <span className="text-[10px] text-neutral-500">Maks. {availableStock} pcs</span>
            </div>

            <div className="flex items-center border border-neutral-700 rounded-lg bg-[#181818] overflow-hidden">
              <button
                type="button"
                disabled={quantity <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-10 h-10 flex items-center justify-center text-neutral-300 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer font-bold text-base transition-colors"
              >
                -
              </button>
              <input
                type="number"
                min={1}
                max={availableStock}
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  setQuantity(Math.min(availableStock, Math.max(1, val)));
                }}
                className="w-14 h-10 text-center text-sm font-bold text-white bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-x border-neutral-700"
              />
              <button
                type="button"
                disabled={quantity >= availableStock}
                onClick={() => setQuantity((q) => Math.min(availableStock, q + 1))}
                className="w-10 h-10 flex items-center justify-center text-neutral-300 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer font-bold text-base transition-colors"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Sticky Action Buttons (Shopee Style: Dual Buttons) */}
        <div className="p-3.5 bg-[#181818] border-t border-neutral-800 flex items-center gap-3">
          {/* Button 1: Masukkan Keranjang */}
          <button
            type="button"
            id="shopee-modal-add-cart-btn"
            onClick={() => validateAndProceed('cart')}
            className="flex-1 min-h-[46px] bg-[#D0011B]/15 hover:bg-[#D0011B]/25 active:scale-95 text-[#D0011B] border border-[#D0011B] font-bold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Masukkan Keranjang</span>
          </button>

          {/* Button 2: Beli Sekarang */}
          <button
            type="button"
            id="shopee-modal-buy-now-btn"
            onClick={() => validateAndProceed('buy')}
            className="flex-1 min-h-[46px] bg-[#D0011B] hover:bg-red-700 active:scale-95 text-white font-extrabold text-sm py-3 px-4 rounded-xl shadow-lg shadow-red-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Beli Sekarang</span>
          </button>
        </div>
      </div>
    </div>
  );
};
