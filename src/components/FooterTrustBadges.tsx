import React from 'react';
import { ShieldCheck, Truck, CreditCard, MessageSquare, Clock, MapPin, Award, CheckCircle } from 'lucide-react';

export const FooterTrustBadges: React.FC = () => {
  return (
    <footer className="mt-8 bg-[#0d0d0d] border-t border-neutral-800 text-neutral-300">
      {/* 4 Trust Badges Section */}
      <div className="max-w-7xl mx-auto px-4 py-6 border-b border-neutral-800">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Badge 1: Direct Store Guarantee */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
            <div className="w-9 h-9 rounded-lg bg-[#E50914]/15 border border-[#E50914]/40 flex items-center justify-center flex-shrink-0 text-[#E50914]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-heading">
                Direct Store Guarantee
              </h4>
              <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug">
                100% Original Brand & Garansi PnP Anti Gredek tuntas.
              </p>
            </div>
          </div>

          {/* Badge 2: Fast Shipping */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-center flex-shrink-0 text-amber-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-heading">
                Pengiriman Cepat
              </h4>
              <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug">
                GoSend, Grab, SiCepat & J&T. Order sebelum 16:00 kirim hari ini.
              </p>
            </div>
          </div>

          {/* Badge 3: Secure Payment */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center flex-shrink-0 text-emerald-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-heading">
                Metode Bayar Lengkap
              </h4>
              <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug">
                QRIS, Transfer BCA/BRI/Mandiri, E-Wallet, & PayLater.
              </p>
            </div>
          </div>

          {/* Badge 4: Direct Live Chat Support */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
            <div className="w-9 h-9 rounded-lg bg-red-600/15 border border-red-500/40 flex items-center justify-center flex-shrink-0 text-[#E50914]">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-heading">
                Tanya Mekanik Langsung
              </h4>
              <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug">
                Konsultasi settingan kirian CVT gratis via Live Chat & Bot 24 Jam.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Chat Support Banner CTA */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="p-4 rounded-xl bg-gradient-to-r from-neutral-900 via-neutral-850 to-neutral-900 border border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center flex-shrink-0 text-[#E50914]">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white font-heading">
                Bingung Pilih Roller atau Derajat Pulley Buat Motormu?
              </h4>
              <p className="text-xs text-neutral-400 mt-0.5">
                Mekanik Jawir Garage siap bantu hitung racikan ideal harian / touring tanpa biaya.
              </p>
            </div>
          </div>

          <button
            id="footer-live-chat-btn"
            type="button"
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent('open-jawir-chat', {
                  detail: {
                    initialMessage: 'Halo Jawir Garage, saya mau konsultasi racikan upgrade kirian motor!',
                  },
                })
              );
            }}
            className="inline-flex items-center gap-2 bg-[#E50914] hover:bg-[#ff1a25] active:scale-95 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-lg shadow-md transition-all whitespace-nowrap cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 fill-current" />
            <span>Chat Mekanik & Admin</span>
          </button>
        </div>
      </div>

      {/* Speedshop Details & Payment Icons */}
      <div className="max-w-7xl mx-auto px-4 py-6 text-xs text-neutral-400 flex flex-col md:flex-row justify-between gap-6 border-t border-neutral-800/80">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-racing font-black text-white text-base tracking-wider uppercase">
              JAWIR GARAGE SPEEDSHOP
            </span>
            <span className="text-[10px] bg-[#E50914] text-white px-1.5 py-0.2 rounded font-black">
              PLATINUM RACING
            </span>
          </div>
          <p className="text-neutral-400 max-w-sm leading-relaxed text-[11px]">
            Toko online dan workshop spesialis upgrade performa matic, racikan kirian CVT anti-gredek, pengereman billet racing, dan part aftermarket plug-and-play berkualitas tinggi.
          </p>

          <div className="flex flex-col gap-1 text-[11px] text-neutral-400 mt-3">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#E50914]" />
              Jl. Raya Otomotif No. 88, Duren Sawit, Jakarta Timur
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-neutral-500" />
              Senin - Minggu: 09:00 - 21:00 WIB
            </span>
          </div>
        </div>

        {/* Accepted Payment badges */}
        <div className="flex flex-col md:items-end">
          <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider mb-2">
            Metode Pembayaran Terverifikasi
          </span>
          <div className="flex flex-wrap gap-1.5 max-w-xs md:justify-end">
            <span className="px-2 py-1 bg-neutral-900 border border-neutral-800 rounded text-[10px] font-bold text-neutral-300">
              QRIS Instant
            </span>
            <span className="px-2 py-1 bg-neutral-900 border border-neutral-800 rounded text-[10px] font-bold text-neutral-300">
              BCA VA
            </span>
            <span className="px-2 py-1 bg-neutral-900 border border-neutral-800 rounded text-[10px] font-bold text-neutral-300">
              Mandiri
            </span>
            <span className="px-2 py-1 bg-neutral-900 border border-neutral-800 rounded text-[10px] font-bold text-neutral-300">
              BRI
            </span>
            <span className="px-2 py-1 bg-neutral-900 border border-neutral-800 rounded text-[10px] font-bold text-neutral-300">
              GoPay
            </span>
            <span className="px-2 py-1 bg-neutral-900 border border-neutral-800 rounded text-[10px] font-bold text-neutral-300">
              ShopeePay
            </span>
            <span className="px-2 py-1 bg-neutral-900 border border-neutral-800 rounded text-[10px] font-bold text-neutral-300">
              SpayLater
            </span>
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-neutral-500">
            <Award className="w-3.5 h-3.5 text-[#E50914]" />
            <span>Official Platinum Racing D2C Store</span>
          </div>
        </div>
      </div>

      {/* Copyright & Quick Links Bar */}
      <div className="border-t border-neutral-800/80 bg-black py-4 px-4 text-center text-[11px] text-neutral-500 space-y-2">
        <div className="flex flex-wrap items-center justify-center gap-4 text-neutral-400 font-semibold">
          <a href="/track-order" className="hover:text-white transition-colors">Lacak Status Pesanan</a>
          <span>•</span>
          <a href="/login" className="hover:text-white transition-colors">Portal Member / Admin</a>
          <span>•</span>
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent('open-jawir-chat', {
                  detail: {
                    initialMessage: 'Halo Tim Bantuan Jawir Garage, saya butuh bantuan!',
                  },
                })
              );
            }}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Bantuan Customer Service
          </button>
        </div>
        <p>© 2026 Platinum Racing by Jawir Garage Speedshop. D2C Architecture & Database Atomic Transaction.</p>
      </div>
    </footer>
  );
};
