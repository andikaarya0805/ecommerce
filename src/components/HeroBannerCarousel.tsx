import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Flame, ArrowRight, Zap, ShieldCheck } from 'lucide-react';
import { MainTabType } from '../types';
const racingScooterHeroImg = '/images/racing_scooter_hero_1789096506709.jpg';
const tdrCvtKitImg = '/images/tdr_cvt_kit_1789096476924.jpg';
const ktcMasterRemImg = '/images/ktc_master_rem_1789096462600.jpg';

interface HeroBannerCarouselProps {
  onSelectTab: (tab: MainTabType) => void;
  onFilterCategory?: (cat: string) => void;
}

interface BannerSlide {
  id: string;
  tag: string;
  badgeColor: string;
  title: string;
  highlightText: string;
  description: string;
  ctaText: string;
  tabTarget: MainTabType;
  bgGradient: string;
  image: string;
}

const SLIDES: BannerSlide[] = [
  {
    id: 'slide-1',
    tag: '9.9 FLASH SPEED DEALS',
    badgeColor: 'bg-[#E50914] text-white',
    title: '9.9 SPECIAL SALE',
    highlightText: 'DISKON HINGGA 90%',
    description: 'Flash sale part kirian, roller BRT, per CVT, knalpot racing untuk Vario, NMAX & Aerox!',
    ctaText: 'Serbu Promo Sekarang',
    tabTarget: 'promo',
    bgGradient: 'from-black via-[#1c0808]/90 to-[#121212]/95',
    image: racingScooterHeroImg,
  },
  {
    id: 'slide-2',
    tag: 'RACIKAN KIRIAN SPESIALIS',
    badgeColor: 'bg-amber-600 text-white',
    title: 'Paket Upgrade CVT',
    highlightText: 'BEAT, VARIO & NMAX',
    description: 'Anti gredek 100% tuntas, akselerasi ngacir, paket pulley & mangkok bolong Plug & Play (PnP).',
    ctaText: 'Lihat Paket Upgrade',
    tabTarget: 'paket-upgrade',
    bgGradient: 'from-black via-[#141208]/90 to-[#121212]/95',
    image: tdrCvtKitImg,
  },
  {
    id: 'slide-3',
    tag: 'NEW EXCLUSIVE DROP',
    badgeColor: 'bg-neutral-800 border border-red-500/40 text-red-400',
    title: 'Billet CNC Series',
    highlightText: 'MASTER REM & KALIPER RADIAL',
    description: 'Master rem KTC Corsa Corta 16mm & kaliper 4-piston CNC anodized. Pengereman kelas sirkuit.',
    ctaText: 'Cek Kaki-Kaki & Rem',
    tabTarget: 'kategori',
    bgGradient: 'from-black via-[#0d1419]/90 to-[#121212]/95',
    image: ktcMasterRemImg,
  },
];

export const HeroBannerCarousel: React.FC<HeroBannerCarouselProps> = ({ onSelectTab }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 4800);
    return () => clearInterval(interval);
  }, [isPaused]);

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? SLIDES.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
  };

  const active = SLIDES[currentSlide];

  return (
    <section
      aria-label="Promosi Utama"
      className="relative overflow-hidden rounded-xl border border-neutral-800 bg-[#121212] shadow-xl my-2 mx-3 sm:mx-4"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background with image blend */}
      <div className="relative min-h-[170px] sm:min-h-[220px] md:min-h-[250px] flex items-center">
        {/* Slide image backdrop */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700 opacity-25 scale-105"
          style={{ backgroundImage: `url(${active.image})` }}
        />
        <div className={`absolute inset-0 bg-gradient-to-r ${active.bgGradient} opacity-95`} />
        
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 w-full px-4 sm:px-6 py-4 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`inline-flex items-center gap-1 text-[10px] sm:text-xs font-black px-2 py-0.5 rounded tracking-wider uppercase ${active.badgeColor}`}>
              <Flame className="w-3 h-3 fill-current" />
              {active.tag}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-neutral-400">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Official Speedshop Warranty
            </span>
          </div>

          <h2 className="font-racing font-extrabold text-lg sm:text-2xl md:text-3xl text-white tracking-wide uppercase leading-none">
            {active.title}
          </h2>

          <p className="font-racing font-black text-xl sm:text-2xl md:text-3xl text-[#E50914] tracking-wide uppercase leading-tight mt-0.5">
            {active.highlightText}
          </p>

          <p className="text-xs sm:text-sm text-neutral-300 max-w-md line-clamp-2 mt-1 font-medium">
            {active.description}
          </p>

          <div className="mt-3 flex items-center gap-3">
            <button
              id={`banner-cta-${active.id}`}
              onClick={() => onSelectTab(active.tabTarget)}
              className="inline-flex items-center gap-1.5 bg-[#E50914] hover:bg-red-700 active:scale-95 text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-lg shadow-lg shadow-red-950/40 transition-all cursor-pointer"
            >
              <span>{active.ctaText}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <span className="text-[11px] text-neutral-400 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              100% PnP Garansi Pasang
            </span>
          </div>
        </div>

        {/* Left & Right navigation controls */}
        <button
          onClick={prevSlide}
          aria-label="Slide sebelumnya"
          className="absolute left-1.5 sm:left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/60 hover:bg-[#E50914] border border-neutral-700 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={nextSlide}
          aria-label="Slide berikutnya"
          className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/60 hover:bg-[#E50914] border border-neutral-700 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Dots indicator */}
        <div className="absolute bottom-2.5 right-4 z-20 flex items-center gap-1.5">
          {SLIDES.map((slide, idx) => (
            <button
              key={slide.id}
              onClick={() => setCurrentSlide(idx)}
              aria-label={`Lihat promo ${slide.title}`}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentSlide
                  ? 'w-5 bg-[#E50914]'
                  : 'w-1.5 bg-neutral-600 hover:bg-neutral-400'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
