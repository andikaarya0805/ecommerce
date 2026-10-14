import React from 'react';
import { UserBike, BikeType } from '../types';
import { X, Bike, Check, Sparkles, AlertCircle } from 'lucide-react';

interface GarageModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBike: UserBike | null;
  bikes: UserBike[];
  onSelectBike: (bike: UserBike | null) => void;
  onFilterToBikeType: (type: BikeType) => void;
}

export const GarageModal: React.FC<GarageModalProps> = ({
  isOpen,
  onClose,
  selectedBike,
  bikes,
  onSelectBike,
  onFilterToBikeType,
}) => {
  if (!isOpen) return null;

  const handleChoose = (bike: UserBike) => {
    onSelectBike(bike);
    onFilterToBikeType(bike.type);
    onClose();
  };

  const handleClear = () => {
    onSelectBike(null);
    onFilterToBikeType('all');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-[#141414] border border-neutral-800 rounded-2xl shadow-2xl p-5 overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-lg bg-[#E50914]/20 border border-[#E50914]/50 flex items-center justify-center">
            <Bike className="w-4 h-4 text-[#E50914]" />
          </div>
          <div>
            <h3 className="font-racing font-bold text-lg text-white uppercase tracking-wide">
              Garasi Saya (Pilih Motor)
            </h3>
          </div>
        </div>

        <p className="text-xs text-neutral-400 mt-1 mb-4 leading-relaxed">
          Pilih motormu agar kami bisa secara otomatis menandai part racing yang <strong>100% Plug & Play (PnP)</strong> tanpa perlu ubah crankcase atau coak bodi.
        </p>

        {/* Currently Selected Bike */}
        {selectedBike && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-600/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                  Motor Aktif di Garasi
                </span>
                <span className="text-xs font-bold text-white">
                  {selectedBike.name} ({selectedBike.year})
                </span>
              </div>
            </div>
            <button
              onClick={handleClear}
              className="text-[11px] text-red-400 hover:text-red-300 font-semibold"
            >
              Hapus
            </button>
          </div>
        )}

        {/* Popular Motorcycles Grid List */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
            Pilih Motor Populer:
          </span>

          {bikes.map((bike) => {
            const isSelected = selectedBike?.id === bike.id;
            return (
              <button
                key={bike.id}
                id={`select-garage-bike-${bike.id}`}
                onClick={() => handleChoose(bike)}
                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-neutral-800 border-[#E50914] text-white shadow-md'
                    : 'bg-neutral-900/90 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-800/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-[#E50914] text-white' : 'bg-black/60 text-neutral-400'}`}>
                    <Bike className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">
                      {bike.name}
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      Tahun {bike.year} • Kapasitas {bike.cc}
                    </div>
                  </div>
                </div>

                {isSelected ? (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Aktif
                  </span>
                ) : (
                  <span className="text-xs text-neutral-500 font-semibold">
                    Pilih
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tip Box */}
        <div className="mt-4 pt-3 border-t border-neutral-800 flex items-start gap-2 text-[11px] text-neutral-400">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <span>
            Motormu tidak ada di daftar? Tenang, kamu tetap bisa tanya langsung spek pulley atau roller ke mekanik kami via WhatsApp.
          </span>
        </div>
      </div>
    </div>
  );
};
