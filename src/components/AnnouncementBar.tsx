import React from 'react';
import { ShieldCheck, Zap, Truck, MessageCircle } from 'lucide-react';

export const AnnouncementBar: React.FC = () => {
  return (
    <aside aria-label="Pengumuman Toko" id="announcement-bar" className="bg-[#0f0f0f] border-b border-neutral-800 text-xs text-neutral-300 py-1.5 px-3 select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="flex h-2 w-2 rounded-full bg-[#E50914] animate-pulse" />
          <span className="inline-flex items-center gap-1 font-semibold text-white">
            <ShieldCheck className="w-3.5 h-3.5 text-[#E50914]" />
            Garansi 100% Part Original & Plug and Play (PnP)
          </span>
          <span className="hidden sm:inline text-neutral-500">|</span>
          <span className="hidden sm:inline-flex items-center gap-1 text-neutral-400">
            <Zap className="w-3 h-3 text-amber-400" />
            Spesialis Racikan Kirian & Harian Ngacir
          </span>
        </div>

        <div className="flex items-center gap-4 text-neutral-400 whitespace-nowrap text-[11px] font-medium ml-auto">
          <span className="inline-flex items-center gap-1">
            <Truck className="w-3 h-3 text-[#E50914]" />
            Kirim Hari Ini Sebelum 16:00
          </span>
          <a
            href="https://wa.me/6281234567890?text=Halo%20Jawir%20Garage,%20saya%20mau%20konsultasi%20upgrade%20kirian%20motor"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <MessageCircle className="w-3 h-3" />
            CS Mekanik: Online
          </a>
        </div>
      </div>
    </aside>
  );
};
