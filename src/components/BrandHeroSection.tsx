import React, { useState, useEffect } from 'react';
import {
  Flame,
  ShieldCheck,
  Zap,
  Bike,
  MessageCircle,
  ArrowRight,
  Star,
  Truck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Wrench,
  Package,
} from 'lucide-react';
import { UserBike } from '../types';

interface BrandHeroSectionProps {
  totalProducts: number;
  selectedBike: UserBike | null;
  onOpenGarage: () => void;
  activeStoreTab: string;
  onSelectStoreTab: (tab: string) => void;
}

const HERO_SLIDES = [
  {
    tag: 'SPESIALIS MATIC UPGRADE',
    title: 'PAKET KIRIAN RACIKAN',
    highlight: 'ANTI GREDEK & RESPONSIF',
    description: 'Racikan pulley bubut derajat presisi, interlock CVT, roller BRT & per racikan khusus Vario, NMAX, Aerox, Beat & PCX.',
    image: '/images/tdr_cvt_kit_1789096476924.jpg',
    tabTarget: 'paket-upgrade',
    badge: 'Garansi 100% PnP',
  },
  {
    tag: 'BILLET CNC RACING SERIES',
    title: 'PENGEREMAN RADIAL',
    highlight: 'MASTER REM & KALIPER CNC',
    description: 'Master rem radial KTC Corsa Corta & kaliper 4 piston billet aluminium anodized. Pengereman empuk, pakem sirkuit.',
    image: '/images/ktc_master_rem_1789096462600.jpg',
    tabTarget: 'kategori',
    badge: 'High Performance',
  },
  {
    tag: '9.9 FLASH SPEED DEALS',
    title: 'PROMO BULAN INI',
    highlight: 'DISKON S/D 90% + VOUCHER',
    description: 'Klaim voucher cashback dan potongan langsung part kirian, roller, mangkok ganda, dan knalpot racing.',
    image: '/images/racing_scooter_hero_1789096506709.jpg',
    tabTarget: 'promo',
    badge: 'Stok Terbatas',
  },
];

export const BrandHeroSection: React.FC<BrandHeroSectionProps> = ({
  totalProducts,
  selectedBike,
  onOpenGarage,
  activeStoreTab,
  onSelectStoreTab,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleOpenWhatsApp = () => {
    const phone = '6281234567890';
    const bikeText = selectedBike ? ` untuk motor ${selectedBike.name}` : '';
    const msg = encodeURIComponent(
      `Halo Mekanik Jawir Garage, saya mau konsultasi rekomendasi upgrade part${bikeText}...`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  const handleScrollToCatalog = () => {
    onSelectStoreTab('semua');
    const catalogEl = document.getElementById('product-catalog-section');
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 480, behavior: 'smooth' });
    }
  };

  const activeSlide = HERO_SLIDES[currentSlide];

  return (
    <div className="bg-[#121212] border-b border-neutral-800 text-white select-none">
      {/* 1. Main Hero Content Showcase */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#180909] via-[#121212] to-[#0d0d0d] px-3 sm:px-6 py-6 sm:py-10 border-b border-neutral-850">
        {/* Subtle decorative background effects */}
        <div className="absolute inset-0 bg-[radial-gradient(#E50914_1px,transparent_1px)] [background-size:20px_20px] opacity-15 pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#E50914]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Left Column: Brand Statement, Value Proposition & Quick CTAs */}
          <div className="md:col-span-7 space-y-3.5 sm:space-y-4">
            {/* Tagline Badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 bg-[#D0011B] text-white text-[11px] font-black px-2.5 py-1 rounded-md shadow-md shadow-red-950/50 uppercase tracking-wider">
                <Flame className="w-3.5 h-3.5 fill-white" />
                <span>OFFICIAL SPEEDSHOP</span>
              </span>
              <span className="text-[11px] font-bold text-neutral-300 bg-neutral-900/90 border border-neutral-800 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Garansi Presisi 100% PnP</span>
              </span>
              <span className="text-[11px] text-neutral-400 hidden sm:inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Jakarta Timur Workshop</span>
              </span>
            </div>

            {/* Main Headline */}
            <div>
              <h1 className="font-racing font-black text-2xl sm:text-4xl md:text-5xl text-white tracking-wide uppercase leading-tight sm:leading-none">
                JAWIR GARAGE <span className="text-[#E50914]">SPEEDSHOP</span>
              </h1>
              <p className="font-racing font-bold text-lg sm:text-2xl text-neutral-200 uppercase tracking-wider mt-1 sm:mt-1.5">
                Pusat Upgrade Performa Matic & Part Balap Premium
              </p>
            </div>

            {/* Description */}
            <p className="text-xs sm:text-sm text-neutral-300 max-w-2xl leading-relaxed font-normal">
              Spesialis racikan kirian CVT anti-gredek, paket bore up harian & sirkuit, kaliper rem billet CNC radial, serta knalpot racing bergaransi presisi 100% Plug & Play (PnP) untuk Vario, NMAX, Aerox, Beat, dan PCX.
            </p>

            {/* Key Trust Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 text-xs text-neutral-300">
              <div className="flex items-center gap-2 bg-neutral-900/80 border border-neutral-800/80 p-2 rounded-lg">
                <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span className="text-[11px] font-medium leading-tight">Racikan Teruji Dyno & Sirkuit</span>
              </div>
              <div className="flex items-center gap-2 bg-neutral-900/80 border border-neutral-800/80 p-2 rounded-lg">
                <Truck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="text-[11px] font-medium leading-tight">Kirim Aman se-Indonesia</span>
              </div>
              <div className="flex items-center gap-2 bg-neutral-900/80 border border-neutral-800/80 p-2 rounded-lg col-span-2 sm:col-span-1">
                <Wrench className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="text-[11px] font-medium leading-tight">Konsultasi Mekanik Gratis</span>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handleScrollToCatalog}
                className="inline-flex items-center gap-2 bg-[#D0011B] hover:bg-red-700 active:scale-95 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-lg shadow-lg shadow-red-950/60 transition-all cursor-pointer"
              >
                <span>Eksplor Katalog Part</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Garasi Motor Shortcut */}
              <button
                onClick={onOpenGarage}
                className={`inline-flex items-center gap-2 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-lg border transition-all cursor-pointer ${
                  selectedBike
                    ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900/50'
                    : 'bg-neutral-900 border-neutral-700 hover:border-red-500 text-neutral-200'
                }`}
              >
                <Bike className="w-4 h-4 text-[#E50914]" />
                <span>{selectedBike ? `Motor: ${selectedBike.name}` : 'Pilih Motor di Garasi'}</span>
              </button>

              <button
                onClick={handleOpenWhatsApp}
                className="inline-flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-lg border border-neutral-800 hover:border-neutral-700 transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span>Tanya Mekanik</span>
              </button>
            </div>
          </div>

          {/* Right Column: Featured Upgrade Showcase Card with Auto-Slide */}
          <div className="md:col-span-5">
            <div className="relative rounded-2xl border border-neutral-800 bg-[#161616] p-4 sm:p-5 shadow-2xl overflow-hidden group">
              {/* Slide image backdrop */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-all duration-700 opacity-25 scale-105"
                style={{ backgroundImage: `url(${activeSlide.image})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/90 to-transparent" />

              {/* Slide Content */}
              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-red-600/30 border border-red-500/40 text-red-300 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>{activeSlide.tag}</span>
                  </span>

                  <span className="text-[10px] font-bold text-neutral-400">
                    {currentSlide + 1} / {HERO_SLIDES.length}
                  </span>
                </div>

                <div>
                  <h3 className="font-racing font-extrabold text-lg sm:text-xl text-white uppercase tracking-wide">
                    {activeSlide.title}
                  </h3>
                  <p className="font-racing font-black text-xl sm:text-2xl text-[#E50914] uppercase tracking-wide leading-none mt-0.5">
                    {activeSlide.highlight}
                  </p>
                </div>

                <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed">
                  {activeSlide.description}
                </p>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    onClick={() => onSelectStoreTab(activeSlide.tabTarget)}
                    className="inline-flex items-center gap-1.5 bg-white text-black hover:bg-neutral-200 active:scale-95 text-xs font-bold px-3.5 py-1.5 rounded-md transition-all cursor-pointer"
                  >
                    <span>Lihat Koleksi</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  {/* Slide Indicators */}
                  <div className="flex items-center gap-1.5">
                    {HERO_SLIDES.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentSlide(idx)}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          idx === currentSlide
                            ? 'w-6 bg-[#E50914]'
                            : 'w-2 bg-neutral-700 hover:bg-neutral-500'
                        }`}
                        aria-label={`Slide ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Real Brand Trust Metrics */}
                <div className="pt-3 border-t border-neutral-800 grid grid-cols-3 gap-2 text-center text-[10px] text-neutral-400">
                  <div className="bg-neutral-900/60 p-1.5 rounded border border-neutral-850">
                    <strong className="block text-white font-racing font-bold text-xs sm:text-sm">
                      {totalProducts}+ Part
                    </strong>
                    <span>Stok Ready PnP</span>
                  </div>
                  <div className="bg-neutral-900/60 p-1.5 rounded border border-neutral-850">
                    <strong className="block text-[#E50914] font-racing font-bold text-xs sm:text-sm flex items-center justify-center gap-0.5">
                      <Star className="w-3 h-3 fill-[#E50914]" />
                      4.9 / 5.0
                    </strong>
                    <span>Kepuasan Pelanggan</span>
                  </div>
                  <div className="bg-neutral-900/60 p-1.5 rounded border border-neutral-850">
                    <strong className="block text-emerald-400 font-racing font-bold text-xs sm:text-sm">
                      100% PnP
                    </strong>
                    <span>Garansi Presisi</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Seamless Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 flex items-center justify-between overflow-x-auto no-scrollbar border-b border-neutral-800 bg-[#0d0d0d]">
        <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider">
          {[
            { id: 'semua', label: 'Semua Produk' },
            { id: 'paket-upgrade', label: 'Paket Upgrade CVT' },
            { id: 'promo', label: 'Promo Spesial' },
            { id: 'kategori', label: 'Kategori Part' },
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
