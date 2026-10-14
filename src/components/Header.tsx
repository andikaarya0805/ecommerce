import React from 'react';
import { Search, ShoppingBag, X, Bike, Flame, Sparkles, User, Settings, Truck, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { UserBike } from '../types';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  cartCount: number;
  onOpenCart: () => void;
  selectedBike: UserBike | null;
  onOpenGarage: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  cartCount,
  onOpenCart,
  selectedBike,
  onOpenGarage,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-[#121212]/95 backdrop-blur-md border-b border-neutral-800 transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5">
        {/* Main top row */}
        <div className="flex items-center justify-between gap-3">
          {/* Brand Logo & Aggressive Emblem */}
          <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            {/* Aggressive Shield & Piston Emblem */}
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-[#1c1c1c] via-[#0d0d0d] to-black border border-neutral-700 shadow-md shadow-red-950/20 flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:border-[#E50914] transition-colors">
              <div className="absolute inset-0 bg-[radial-gradient(#E50914_1px,transparent_1px)] [background-size:8px_8px] opacity-20" />
              <div className="absolute -top-3 -right-3 w-7 h-7 bg-[#E50914]/20 rounded-full blur-sm" />
              {/* Emblem icon graphic */}
              <div className="relative flex flex-col items-center justify-center">
                <Flame className="w-5 h-5 text-[#E50914] fill-[#E50914]/40" />
              </div>
            </div>

            {/* Typography */}
            <div className="flex flex-col leading-none">
              <div className="flex items-center gap-1.5">
                <span className="font-racing font-extrabold text-base sm:text-lg tracking-wider text-white uppercase group-hover:text-red-400 transition-colors">
                  JAWIR GARAGE
                </span>
                <span className="bg-[#E50914] text-white text-[9px] font-black px-1.5 py-0.5 rounded tracking-widest uppercase shadow-sm">
                  RACING
                </span>
              </div>
              <span className="text-[10px] tracking-widest text-neutral-400 font-bold uppercase mt-0.5 flex items-center gap-1">
                <span>PLATINUM SPEEDSHOP</span>
                <span className="w-1 h-1 rounded-full bg-[#E50914]" />
                <span className="text-neutral-500 font-medium">EST. 2021</span>
              </span>
            </div>
          </div>

          {/* Right quick actions: Garage selector & Cart */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Garage / My Bike selector button */}
            <button
              id="header-garage-btn"
              onClick={onOpenGarage}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                selectedBike
                  ? 'bg-neutral-900 border-[#E50914]/60 text-white hover:bg-neutral-800'
                  : 'bg-neutral-900/80 border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700'
              }`}
              title="Pilih Motor Garasi Kamu"
            >
              <div className="relative">
                <Bike className="w-4 h-4 text-[#E50914]" />
                {selectedBike && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-neutral-900" />
                )}
              </div>
              <div className="hidden sm:flex flex-col text-left leading-tight">
                <span className="text-[10px] text-neutral-400 font-normal">Garasi Saya</span>
                <span className="text-[11px] font-bold truncate max-w-[100px] text-neutral-100">
                  {selectedBike ? selectedBike.name : 'Pilih Motor'}
                </span>
              </div>
              <span className="sm:hidden text-[11px] font-bold">
                {selectedBike ? selectedBike.name.split(' ')[1] || 'Motor' : 'Motor'}
              </span>
            </button>

            {/* Pesanan Saya (Shopee Style Order History) Button */}
            <button
              onClick={() => navigate('/orders')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-[#EE4D2D] text-xs font-semibold transition-all"
              title="Riwayat Pesanan Saya"
            >
              <Package className="w-4 h-4 text-[#EE4D2D]" />
              <span className="hidden md:inline">Pesanan Saya</span>
            </button>

            {/* Track Order Button */}
            <button
              onClick={() => navigate('/track-order')}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-[#EE4D2D] text-xs font-semibold transition-all"
              title="Lacak Status Pesanan & Resi"
            >
              <Truck className="w-4 h-4 text-[#EE4D2D]" />
              <span>Lacak Resi</span>
            </button>

            {/* Auth Buttons */}
            {user ? (
              <div className="flex items-center gap-1.5">
                {user.role === 'admin' && (
                  <button
                    onClick={() => navigate('/admin')}
                    className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 hover:text-white hover:border-[#E50914] transition-all"
                    title="Admin Panel"
                  >
                    <Settings className="w-5 h-5 text-neutral-200" />
                  </button>
                )}
                <button
                  onClick={logout}
                  className="hidden sm:flex px-3 py-1.5 rounded-lg border border-red-500/50 text-xs font-bold text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E50914] text-white text-xs font-bold hover:bg-red-700 transition-colors"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Login</span>
              </button>
            )}

            {/* Cart Button with Counter */}
            <button
              id="header-cart-btn"
              onClick={onOpenCart}
              className="relative p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 hover:text-white hover:border-[#E50914] transition-all"
              aria-label="Keranjang Belanja"
            >
              <ShoppingBag className="w-5 h-5 text-neutral-200" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#E50914] text-white text-[10px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center border-2 border-[#121212] shadow-lg animate-bounce">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Smart Search Input Box */}
        <div className="mt-2.5 relative">
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-neutral-500 pointer-events-none" />
            <input
              id="smart-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari sparepart, CVT, velg, atau tipe motor..."
              className="w-full pl-9 pr-8 py-2 bg-neutral-900/90 border border-neutral-800 rounded-lg text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 text-neutral-400 hover:text-white p-0.5"
                aria-label="Hapus Pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {searchQuery && (
            <div className="absolute right-3 top-2.5 pointer-events-none hidden sm:flex items-center gap-1 text-[10px] text-neutral-400">
              <Sparkles className="w-3 h-3 text-[#E50914]" />
              <span>Filter aktif</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
