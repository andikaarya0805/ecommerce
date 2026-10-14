import React from 'react';
import { Ticket, Check, Sparkles, Clock } from 'lucide-react';
import { Voucher } from '../types';

interface ClaimableVouchersProps {
  vouchers: Voucher[];
  onClaimVoucher: (id: string) => void;
}

export const ClaimableVouchers: React.FC<ClaimableVouchersProps> = ({
  vouchers,
  onClaimVoucher,
}) => {
  return (
    <section aria-labelledby="voucher-heading" className="my-3 px-3 sm:px-4">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-[#E50914]/20 border border-[#E50914]/50 flex items-center justify-center">
            <Ticket className="w-3.5 h-3.5 text-[#E50914]" />
          </div>
          <h2 id="voucher-heading" className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white flex items-center gap-1.5 font-heading">
            <span>Voucher Toko Platinum</span>
            <span className="text-[10px] bg-red-950 text-red-300 font-semibold px-1.5 py-0.5 rounded border border-red-800/60">
              Klaim & Pakai Langsung
            </span>
          </h2>
        </div>
        <span className="text-[11px] text-neutral-400 font-medium">
          Geser ke kanan →
        </span>
      </div>

      {/* Horizontal Scrollable Voucher Cards */}
      <div className="flex items-stretch gap-2.5 overflow-x-auto no-scrollbar pb-1 pt-0.5 snap-x">
        {vouchers.map((v) => {
          const isClaimed = v.claimed;
          return (
            <div
              key={v.id}
              className={`relative snap-start flex-shrink-0 w-[240px] sm:w-[260px] rounded-lg border transition-all overflow-hidden ${
                isClaimed
                  ? 'bg-neutral-900/60 border-neutral-800'
                  : 'bg-gradient-to-r from-neutral-900 to-[#1c1212] border-red-900/40 hover:border-red-600/70 shadow-md shadow-red-950/20'
              }`}
            >
              {/* Top badge */}
              <div className="flex items-center justify-between px-3 pt-2.5 pb-1 text-[10px]">
                <span className="font-bold text-[#E50914] uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  {v.badge}
                </span>
                <span className="text-neutral-400 flex items-center gap-1 text-[9px]">
                  <Clock className="w-2.5 h-2.5" />
                  {v.expiryText}
                </span>
              </div>

              {/* Middle Voucher Content */}
              <div className="px-3 pb-2.5">
                <div className="font-racing font-extrabold text-sm sm:text-base text-white tracking-wide">
                  {v.title}
                </div>
                <div className="text-[11px] text-neutral-400 font-medium mt-0.5">
                  {v.subtitle}
                </div>

                {/* Ticket dashed divider & claim button */}
                <div className="mt-2 pt-2 border-t border-dashed border-neutral-700/60 flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] text-neutral-400 font-semibold bg-black/40 px-1.5 py-0.5 rounded">
                    {v.code}
                  </span>

                  <button
                    id={`claim-voucher-btn-${v.id}`}
                    onClick={() => onClaimVoucher(v.id)}
                    className={`text-xs font-bold px-3 py-1.5 rounded transition-all flex items-center gap-1 cursor-pointer select-none ${
                      isClaimed
                        ? 'bg-neutral-800 text-neutral-400 border border-neutral-700 cursor-default'
                        : 'bg-[#E50914] hover:bg-red-700 active:scale-95 text-white shadow-sm'
                    }`}
                  >
                    {isClaimed ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Terklaim</span>
                      </>
                    ) : (
                      <span>Klaim Voucher</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Decorative side ticket cutouts */}
              <div className="absolute top-[68%] -left-1.5 w-3 h-3 rounded-full bg-[#121212] border-r border-neutral-800" />
              <div className="absolute top-[68%] -right-1.5 w-3 h-3 rounded-full bg-[#121212] border-l border-neutral-800" />
            </div>
          );
        })}
      </div>
    </section>
  );
};
