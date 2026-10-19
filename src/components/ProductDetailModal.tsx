import React, { useState, useEffect, useMemo } from 'react';
import { Product, UserBike } from '../types';
import { formatIDR } from './ProductCard';
import {
  getProductVariationGroups,
  getOptionName,
  getProductPriceRange,
  calculateSelectedPrice,
} from '../data/productVariations';
import { X, Star, ShoppingBag, CheckCircle, ShieldAlert, Zap, Truck, MessageCircle, Check, AlertCircle } from 'lucide-react';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number, selectedVariant?: string, customPrice?: number) => void;
  onBuyNow?: (product: Product, quantity: number, selectedVariant?: string, customPrice?: number) => void;
  userBike: UserBike | null;
  onOpenGarage: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onAddToCart,
  onBuyNow,
  userBike,
  onOpenGarage,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'deskripsi' | 'spesifikasi'>('deskripsi');
  const [selectedOptions, setSelectedOptions] = useState<{ [groupName: string]: string }>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  const variationGroups = useMemo(() => {
    if (!product) return [];
    return getProductVariationGroups(product);
  }, [product]);

  const priceRange = useMemo(() => {
    if (!product) return { minPrice: 0, maxPrice: 0, hasRange: false };
    return getProductPriceRange(product);
  }, [product]);

  useEffect(() => {
    if (product) {
      const initial: { [groupName: string]: string } = {};
      const groups = getProductVariationGroups(product);

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

      // If no range, select 1st option by default
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
  }, [product, userBike, priceRange.hasRange]);

  if (!product) return null;

  const isCompatibleWithUser =
    userBike && product.bikeCompatibility?.includes(userBike.type);

  const { dynamicPrice, dynamicOriginalPrice } = calculateSelectedPrice(product, selectedOptions);
  const hasAnySelection = Object.keys(selectedOptions).length > 0;
  const unselectedGroups = variationGroups.filter((g) => !selectedOptions[g.name]);
  const isAllSelected = unselectedGroups.length === 0;

  const variantString = Object.values(selectedOptions).filter(Boolean).join(' • ');

  const handleSelectOption = (groupName: string, optionName: string) => {
    setSelectedOptions((prev) => {
      if (prev[groupName] === optionName) {
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

  const handleAdd = () => {
    if (variationGroups.length > 0 && !isAllSelected) {
      setValidationError(`Silakan pilih: ${unselectedGroups.map((g) => g.name).join(', ')}`);
      return;
    }
    onAddToCart(product, quantity, variantString || undefined, dynamicPrice);
    onClose();
  };

  const handleBuy = () => {
    if (variationGroups.length > 0 && !isAllSelected) {
      setValidationError(`Silakan pilih: ${unselectedGroups.map((g) => g.name).join(', ')}`);
      return;
    }
    if (onBuyNow) {
      onBuyNow(product, quantity, variantString || undefined, dynamicPrice);
    } else {
      onAddToCart(product, quantity, variantString || undefined, dynamicPrice);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-[#141414] border border-neutral-800 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header Close button */}
        <button
          onClick={onClose}
          aria-label="Tutup"
          className="absolute top-3 right-3 z-30 w-8 h-8 rounded-full bg-black/70 hover:bg-neutral-800 text-neutral-300 hover:text-white flex items-center justify-center border border-neutral-700"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 no-scrollbar pb-24 sm:pb-4">
          {/* Image Showcase */}
          <div className="relative aspect-video sm:aspect-[4/3] w-full bg-black overflow-hidden flex items-center justify-center">
            <img
              src={product.image}
              alt={product.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-black/40" />

            {/* Promo Tag */}
            {product.promoTag && (
              <div className="absolute top-3 left-3 z-20">
                <span className="bg-[#E50914] text-white text-xs font-black px-2.5 py-1 rounded shadow-md tracking-wider uppercase flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-current" />
                  {product.promoTag}
                </span>
              </div>
            )}

            {/* Fitment Tag */}
            <div className="absolute bottom-3 left-3 z-20">
              <span className="bg-black/90 text-white border border-neutral-700 text-xs font-bold px-2.5 py-1 rounded">
                {product.fitmentTag}
              </span>
            </div>
          </div>

          {/* Product Details Header */}
          <div className="p-4">
            <div className="flex items-center gap-2 text-xs text-neutral-400 mb-1">
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <strong className="text-white">{product.rating}</strong>
                <span>({product.soldCount} terjual)</span>
              </span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <Truck className="w-3.5 h-3.5" />
                Dikirim dari {product.originCity}
              </span>
            </div>

            <h2 className="font-heading font-bold text-base sm:text-lg text-white leading-snug">
              {product.name}
            </h2>

            {/* Price Box */}
            <div className="mt-2.5 flex items-baseline gap-2 flex-wrap">
              {priceRange.hasRange && !hasAnySelection ? (
                <span className="font-racing font-black text-xl sm:text-2xl text-[#E50914] tracking-tight">
                  Rp{priceRange.minPrice.toLocaleString('id-ID')} - Rp{priceRange.maxPrice.toLocaleString('id-ID')}
                </span>
              ) : (
                <span className="font-racing font-black text-xl sm:text-2xl text-[#E50914] tracking-tight">
                  {formatIDR(dynamicPrice)}
                </span>
              )}
              {hasAnySelection && dynamicOriginalPrice > dynamicPrice && (
                <span className="text-xs text-neutral-500 line-through">
                  {formatIDR(dynamicOriginalPrice)}
                </span>
              )}
              {product.discountPercent > 0 && (
                <span className="bg-red-950 text-red-300 text-[11px] font-bold px-1.5 py-0.5 rounded border border-red-800/40">
                  Hemat {product.discountPercent}%
                </span>
              )}
            </div>

            {/* Bike Compatibility Checker Box */}
            <div className="mt-3.5 p-3 rounded-lg bg-neutral-900 border border-neutral-800">
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-neutral-400 uppercase tracking-wider text-[10px]">
                  Cek Kesesuaian Motor
                </span>
                {userBike ? (
                  <button
                    onClick={onOpenGarage}
                    className="text-[#E50914] text-[11px] font-bold hover:underline"
                  >
                    Ganti Motor
                  </button>
                ) : (
                  <button
                    onClick={onOpenGarage}
                    className="text-[#E50914] text-[11px] font-bold hover:underline"
                  >
                    + Pilih Motor Kamu
                  </button>
                )}
              </div>

              {userBike ? (
                <div className="flex items-center gap-2 mt-1">
                  {isCompatibleWithUser ? (
                    <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                      <CheckCircle className="w-4 h-4" />
                      <span>✓ 100% Cocok & PnP untuk {userBike.name}!</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold">
                      <ShieldAlert className="w-4 h-4" />
                      <span>Perhatian: Part ini tidak direkomendasikan untuk {userBike.name}.</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-neutral-400">
                  Kompatibel untuk: <strong className="text-neutral-200">{product.compatibilityText}</strong>
                </p>
              )}
            </div>

            {/* Tabs for Description & Specs */}
            <div className="mt-4 border-b border-neutral-800 flex gap-4 text-xs font-bold">
              <button
                onClick={() => setActiveTab('deskripsi')}
                className={`pb-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'deskripsi'
                    ? 'border-[#E50914] text-white'
                    : 'border-transparent text-neutral-500 hover:text-neutral-300'
                }`}
              >
                Deskripsi Produk
              </button>
              <button
                onClick={() => setActiveTab('spesifikasi')}
                className={`pb-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'spesifikasi'
                    ? 'border-[#E50914] text-white'
                    : 'border-transparent text-neutral-500 hover:text-neutral-300'
                }`}
              >
                Spesifikasi & Racikan
              </button>
            </div>

            <div className="mt-3 text-xs text-neutral-300 leading-relaxed min-h-[80px]">
              {activeTab === 'deskripsi' ? (
                <p>{product.description}</p>
              ) : (
                <div className="space-y-1.5">
                  {Object.entries(product.specs).map(([key, val]) => (
                    <div key={key} className="flex justify-between py-1 border-b border-neutral-800/60">
                      <span className="text-neutral-400">{key}</span>
                      <span className="font-semibold text-white text-right max-w-[65%]">{val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Shopee-style Variations Section */}
            {variationGroups.length > 0 && (
              <div className="mt-4 pt-3 border-t border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
                    Pilihan Variasi Produk
                  </span>
                  {variantString && (
                    <span className="text-[11px] text-red-400 font-semibold truncate max-w-[200px]">
                      {variantString}
                    </span>
                  )}
                </div>

                {validationError && (
                  <div className="p-2 rounded bg-red-950/70 border border-red-800 text-red-200 text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                    <span>{validationError}</span>
                  </div>
                )}

                {variationGroups.map((group) => {
                  const currentSelected = selectedOptions[group.name];
                  return (
                    <div key={group.name} className="space-y-1.5">
                      <div className="text-[11px] font-bold text-neutral-400">
                        {group.name}:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {group.options.map((opt) => {
                          const optName = getOptionName(opt);
                          const isSelected = currentSelected === optName;

                          return (
                            <button
                              key={optName}
                              type="button"
                              onClick={() => handleSelectOption(group.name, optName)}
                              className={`group relative px-2.5 py-1.5 rounded text-xs transition-all cursor-pointer text-left ${
                                isSelected
                                  ? 'bg-[#D0011B]/15 border-2 border-[#D0011B] text-[#D0011B] font-bold shadow-sm'
                                  : 'bg-[#1e1e1e] border border-neutral-700 hover:border-neutral-500 text-neutral-300'
                              }`}
                            >
                              <span>{optName}</span>
                              {isSelected && (
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#D0011B] rounded-tl flex items-center justify-center">
                                  <Check className="w-2 h-2 text-white stroke-[3.5]" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quantity Selector */}
            <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-300">Jumlah Pembelian:</span>
              <div className="flex items-center border border-neutral-700 rounded-lg bg-neutral-900 overflow-hidden">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-1 text-neutral-300 hover:text-white hover:bg-neutral-800 font-bold"
                >
                  -
                </button>
                <span className="px-3 py-1 text-xs font-bold text-white min-w-[32px] text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                  className="px-3 py-1 text-neutral-300 hover:text-white hover:bg-neutral-800 font-bold"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Sticky Action Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-3.5 bg-[#121212]/98 border-t border-neutral-800 backdrop-blur-md flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              window.dispatchEvent(
                new CustomEvent('open-jawir-chat', {
                  detail: {
                    product,
                    initialMessage: `Halo Admin, saya mau tanya part ${product.name}`,
                  },
                })
              );
            }}
            className="w-11 h-11 rounded-xl border border-red-600/60 bg-red-950/40 text-[#E50914] hover:bg-red-900/50 flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors shadow-sm"
            title="Chat Admin & Tanya Part Ini"
          >
            <MessageCircle className="w-5 h-5" />
          </button>

          <button
            onClick={handleAdd}
            className="flex-1 min-h-[44px] bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-white font-bold text-sm py-2.5 px-4 rounded-xl border border-neutral-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-neutral-300" />
            <span>+ Keranjang</span>
          </button>

          <button
            onClick={handleBuy}
            className="flex-1 min-h-[44px] bg-[#E50914] hover:bg-red-700 active:scale-95 text-white font-bold text-sm py-2.5 px-4 rounded-xl shadow-lg shadow-red-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Beli Sekarang</span>
          </button>
        </div>
      </div>
    </div>
  );
};
