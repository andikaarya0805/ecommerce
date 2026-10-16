import React, { useState } from 'react';
import {
  Flame,
  CheckCircle2,
  Plus,
  Check,
  MessageCircle,
  Star,
  Package,
  Clock,
  Users,
  ShieldCheck,
  Bike,
} from 'lucide-react';
import { UserBike } from '../types';

interface ShopeeStoreHeaderProps {
  totalProducts: number;
  selectedBike: UserBike | null;
  onOpenGarage: () => void;
  activeStoreTab: string;
  onSelectStoreTab: (tab: string) => void;
}

export const ShopeeStoreHeader: React.FC<ShopeeStoreHeaderProps> = ({
  totalProducts,
  selectedBike,
  onOpenGarage,
  activeStoreTab,
  onSelectStoreTab,
}) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(48820);

  const handleToggleFollow = () => {
    if (isFollowing) {
      setIsFollowing(false);
      setFollowerCount((prev) => prev - 1);
    } else {
      setIsFollowing(true);
      setFollowerCount((prev) => prev + 1);
    }
  };

  const handleOpenLiveChat = () => {
    window.dispatchEvent(
      new CustomEvent('open-jawir-chat', {
        detail: {
          initialMessage: 'Halo Admin Jawir Garage, saya mau konsultasi part motor!',
        },
      })
    );
  };

  return (
    <div className="bg-[#121212] border-b border-neutral-800 text-white select-none">
      {/* Top Banner / Store Cover (Shopee Store Profile Banner) */}
      <div className="relative bg-gradient-to-r from-neutral-950 via-[#1c0f0f] to-neutral-950 px-3 sm:px-6 py-4 sm:py-6 border-b border-neutral-850 overflow-hidden">
        {/* Decorative background grid and red glow */}
        <div className="absolute inset-0 bg-[radial-gradient(#E50914_1px,transparent_1px)] [background-size:16px_16px] opacity-15" />
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-[#E50914]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
          {/* Left: Store Avatar, Name, Mall Badge & Actions */}
          <div className="flex items-start sm:items-center gap-3.5 sm:gap-4">
            {/* Store Avatar with MALL badge */}
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gradient-to-br from-red-600 via-neutral-900 to-black p-0.5 shadow-xl shadow-red-950/40">
                <div className="w-full h-full bg-[#141414] rounded-[10px] flex items-center justify-center overflow-hidden relative">
                  <Flame className="w-9 h-9 sm:w-11 sm:h-11 text-[#E50914] fill-[#E50914]/30" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
              </div>
              {/* Iconic Shopee Mall Tag */}
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-[#D0011B] text-white text-[9px] font-black px-2 py-0.5 rounded shadow tracking-wider uppercase whitespace-nowrap">
                MALL
              </div>
            </div>

            {/* Store Identity */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="font-racing font-extrabold text-base sm:text-xl text-white tracking-wide uppercase truncate">
                  Jawir Garage Official Store
                </h1>
                <span className="inline-flex items-center gap-0.5 bg-[#D0011B]/20 text-red-400 border border-[#D0011B]/50 text-[10px] font-bold px-1.5 py-0.2 rounded">
                  <CheckCircle2 className="w-3 h-3 text-[#D0011B] fill-[#D0011B]/20" />
                  <span>Official</span>
                </span>
              </div>

              <p className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Aktif beberapa menit lalu</span>
                </span>
                <span>•</span>
                <span>Kota Jakarta Timur</span>
              </p>

              {/* Action Buttons: Ikuti & Chat Penjual */}
              <div className="flex items-center gap-2 mt-2.5">
                <button
                  onClick={handleToggleFollow}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer shadow-sm ${
                    isFollowing
                      ? 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                      : 'bg-[#D0011B] hover:bg-red-700 active:scale-95 text-white'
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Mengikuti</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Ikuti</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleOpenLiveChat}
                  className="flex items-center gap-1 px-3 py-1.5 rounded bg-neutral-900 border border-neutral-700 hover:border-neutral-500 text-neutral-200 text-xs font-bold transition-all cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-[#E50914]" />
                  <span>Chat Penjual</span>
                </button>

                {/* Garasi Motor shortcut */}
                <button
                  onClick={onOpenGarage}
                  className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded bg-neutral-900/80 border border-neutral-800 hover:border-red-600/60 text-neutral-300 text-xs font-medium transition-all"
                >
                  <Bike className="w-3.5 h-3.5 text-[#E50914]" />
                  <span>{selectedBike ? selectedBike.name : 'Pilih Motor Garasi'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right: Shopee Store Statistics Panel */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 sm:gap-x-6 gap-y-2 bg-neutral-900/60 p-3 rounded-lg border border-neutral-800 text-xs">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-neutral-400 flex-shrink-0" />
              <div>
                <span className="text-[10px] text-neutral-400 block">Produk:</span>
                <span className="font-bold text-white text-xs">{totalProducts}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-neutral-400 flex-shrink-0" />
              <div>
                <span className="text-[10px] text-neutral-400 block">Pengikut:</span>
                <span className="font-bold text-[#E50914] text-xs">
                  {(followerCount / 1000).toFixed(1)}RB
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400 flex-shrink-0" />
              <div>
                <span className="text-[10px] text-neutral-400 block">Penilaian:</span>
                <span className="font-bold text-white text-xs">4.9 (15.4RB)</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-neutral-400 flex-shrink-0" />
              <div>
                <span className="text-[10px] text-neutral-400 block">Performa Chat:</span>
                <span className="font-bold text-emerald-400 text-xs">99% (Hitungan Menit)</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-neutral-400 flex-shrink-0" />
              <div>
                <span className="text-[10px] text-neutral-400 block">Waktu Kirim:</span>
                <span className="font-bold text-white text-xs">Dalam 24 Jam</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-neutral-400 flex-shrink-0" />
              <div>
                <span className="text-[10px] text-neutral-400 block">Bergabung:</span>
                <span className="font-bold text-white text-xs">3 Tahun Lalu</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shopee Store Tab Navigation Bar */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 flex items-center justify-between overflow-x-auto no-scrollbar border-b border-neutral-800 bg-[#0d0d0d]">
        <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider">
          {[
            { id: 'semua', label: 'Semua Produk' },
            { id: 'paket-upgrade', label: 'Paket Upgrade CVT' },
            { id: 'promo', label: 'Promo Spesial' },
            { id: 'kategori', label: 'Kategori Toko' },
          ].map((tab) => {
            const isActive = activeStoreTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectStoreTab(tab.id)}
                className={`py-3 px-3 sm:px-4 border-b-2 font-racing transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'border-[#D0011B] text-[#D0011B] bg-red-950/20'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Free Shipping Highlight Badge */}
        <div className="hidden md:flex items-center gap-1.5 text-[11px] text-neutral-300 bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded">
          <span className="bg-[#D0011B] text-white text-[9px] font-black px-1 rounded">XTRA</span>
          <span>Gratis Ongkir s/d 20RB ke Seluruh Indonesia</span>
        </div>
      </div>
    </div>
  );
};
