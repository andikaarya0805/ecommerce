import React, { useState } from 'react';
import { Product, UserBike } from '../types';
import { formatIDR } from './ProductCard';
import { X, Star, ShoppingBag, CheckCircle, ShieldAlert, Zap, Truck, MessageCircle } from 'lucide-react';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  userBike: UserBike | null;
  onOpenGarage: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onAddToCart,
  userBike,
  onOpenGarage,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'deskripsi' | 'spesifikasi'>('deskripsi');

  if (!product) return null;

  const isCompatibleWithUser =
    userBike && product.bikeCompatibility.includes(userBike.type);

  const handleAdd = () => {
    onAddToCart(product, quantity);
    onClose();
  };

  const handleBuyNow = () => {
    onAddToCart(product, quantity);
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
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="font-racing font-black text-xl sm:text-2xl text-[#E50914]">
                {formatIDR(product.price)}
              </span>
              {product.originalPrice > product.price && (
                <span className="text-xs text-neutral-500 line-through">
                  {formatIDR(product.originalPrice)}
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
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-[#121212]/98 border-t border-neutral-800 backdrop-blur-md flex items-center gap-2">
          <a
            href={`https://wa.me/6281234567890?text=Halo%20Mekanik%20Jawir%20Garage,%20saya%20mau%20order%20part:%20${encodeURIComponent(
              product.name
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-lg border border-emerald-600/60 bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/50 flex items-center justify-center flex-shrink-0"
            title="Tanya ke WhatsApp Mekanik"
          >
            <MessageCircle className="w-5 h-5" />
          </a>

          <button
            onClick={handleAdd}
            className="flex-1 bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-white font-bold text-xs sm:text-sm py-2.5 px-3 rounded-lg border border-neutral-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-neutral-300" />
            <span>+ Keranjang</span>
          </button>

          <button
            onClick={handleBuyNow}
            className="flex-1 bg-[#E50914] hover:bg-red-700 active:scale-95 text-white font-bold text-xs sm:text-sm py-2.5 px-3 rounded-lg shadow-lg shadow-red-950/40 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <span>Beli Sekarang</span>
          </button>
        </div>
      </div>
    </div>
  );
};
