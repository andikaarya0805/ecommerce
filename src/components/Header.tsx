import React, { useState, useEffect } from 'react';
import {
  Search,
  ShoppingBag,
  X,
  Flame,
  User,
  Truck,
  Package,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserBike } from '../types';

interface HeaderProps {
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  cartCount: number;
  onOpenCart: () => void;
  selectedBike?: UserBike | null;
  onOpenGarage?: () => void;
}

const POPULAR_SEARCH_TAGS = [
  'Pulley Bubut NMAX',
  'Mangkok Bolong Vario',
  'Roller BRT Beat',
  'Per CVT 1500 RPM',
  'Master Rem Radial',
  'Shock KTC Rebound',
];

export const Header: React.FC<HeaderProps> = ({
  searchQuery = '',
  onSearchChange,
  cartCount,
  onOpenCart,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [internalQuery, setInternalQuery] = useState(searchQuery);

  useEffect(() => {
    setInternalQuery(searchQuery);
  }, [searchQuery]);

  const handleInputChange = (val: string) => {
    setInternalQuery(val);
    if (onSearchChange) {
      onSearchChange(val);
    }
  };

  const executeSearch = (queryToSearch: string) => {
    const trimmed = queryToSearch.trim();
    if (location.pathname !== '/') {
      navigate(trimmed ? `/?q=${encodeURIComponent(trimmed)}` : '/');
    } else {
      if (onSearchChange) {
        onSearchChange(trimmed);
      }
      const catalogEl = document.getElementById('product-catalog-section');
      if (catalogEl) {
        catalogEl.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(internalQuery);
  };

  const handleClear = () => {
    setInternalQuery('');
    if (onSearchChange) {
      onSearchChange('');
    }
    if (location.pathname === '/' && location.search) {
      navigate('/', { replace: true });
    }
  };

  const handleTagClick = (tag: string) => {
    setInternalQuery(tag);
    executeSearch(tag);
  };

  const handleLogoClick = () => {
    setInternalQuery('');
    if (onSearchChange) {
      onSearchChange('');
    }
    if (location.pathname !== '/') {
      navigate('/');
    } else {
      if (location.search) {
        navigate('/', { replace: true });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0f0f0f] border-b border-neutral-800 transition-all select-none">
      {/* Shopee Style Top Utility Bar */}
      <div className="bg-[#080808] border-b border-neutral-850 text-neutral-400 text-[11px] py-1 px-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Left mini links */}
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="text-neutral-300 font-semibold flex items-center gap-1">
              <span className="bg-[#D0011B] text-white text-[9px] font-black px-1 rounded">MALL</span>
              <span className="hidden sm:inline">Jawir Garage Platinum Speedshop</span>
            </span>
          </div>

          {/* Right mini links */}
          <div className="flex items-center gap-3 sm:gap-4 font-medium">
            <button
              onClick={() => navigate('/orders')}
              className="hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Package className="w-3.5 h-3.5 text-[#D0011B]" />
              <span>Pesanan Saya</span>
            </button>

            <button
              onClick={() => navigate('/track-order')}
              className="hidden sm:flex hover:text-white items-center gap-1 transition-colors cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5 text-neutral-400" />
              <span>Lacak Resi</span>
            </button>

            <span className="text-neutral-600">|</span>

            {/* Auth status */}
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-white font-bold flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-[#D0011B]" />
                  <span>@{user.username}</span>
                </span>
                {user.role === 'admin' && (
                  <button
                    onClick={() => navigate('/admin')}
                    className="text-amber-400 hover:text-amber-300 font-bold ml-1 cursor-pointer"
                  >
                    [Admin]
                  </button>
                )}
                <button
                  onClick={logout}
                  className="text-red-400 hover:text-red-300 ml-1 cursor-pointer"
                >
                  (Logout)
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 font-bold">
                <button
                  onClick={() => navigate('/login')}
                  className="text-white hover:text-red-400 transition-colors cursor-pointer"
                >
                  Daftar
                </button>
                <span className="text-neutral-600">|</span>
                <button
                  onClick={() => navigate('/login')}
                  className="text-white hover:text-red-400 transition-colors cursor-pointer"
                >
                  Login
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Shopee Style Main Header Row */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Brand Logo with MALL Badge */}
          <div
            className="flex items-center gap-2 cursor-pointer select-none group flex-shrink-0"
            onClick={handleLogoClick}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-[#D0011B] via-red-800 to-black flex items-center justify-center shadow-lg shadow-red-950/40">
              <Flame className="w-5 h-5 text-white fill-white/20" />
            </div>

            <div className="flex flex-col leading-none">
              <div className="flex items-center gap-1.5">
                <span className="font-racing font-extrabold text-lg sm:text-xl tracking-wider text-white uppercase group-hover:text-red-400 transition-colors">
                  JAWIR GARAGE
                </span>
                <span className="bg-[#D0011B] text-white text-[9px] font-black px-1.5 py-0.5 rounded tracking-wider uppercase shadow-sm">
                  MALL
                </span>
              </div>
              <span className="text-[10px] tracking-widest text-neutral-400 font-bold uppercase mt-0.5">
                OFFICIAL SPEEDSHOP
              </span>
            </div>
          </div>

          {/* Shopee Style Wide Search Box */}
          <div className="flex-1 max-w-2xl relative">
            <form onSubmit={handleSubmit} className="relative flex items-center bg-white rounded-md p-1 shadow-md">
              <input
                id="smart-search-input"
                type="text"
                value={internalQuery}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Cari part di Jawir Garage Official Mall..."
                className="w-full px-3 py-1.5 text-xs sm:text-sm text-neutral-900 placeholder-neutral-500 bg-transparent focus:outline-none"
              />
              {internalQuery && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-neutral-400 hover:text-neutral-700 p-1 mr-1 cursor-pointer"
                  aria-label="Hapus Pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              {/* Shopee iconic Orange/Red Search Button */}
              <button
                type="submit"
                className="bg-[#D0011B] hover:bg-red-700 active:scale-95 text-white px-4 sm:px-6 py-2 rounded font-bold flex items-center justify-center transition-all cursor-pointer"
                title="Cari"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            {/* Popular Search Tags Underneath Search Bar (Iconic Shopee feature) */}
            <div className="hidden sm:flex items-center gap-2 mt-1.5 overflow-x-auto no-scrollbar text-[11px] text-neutral-400">
              {POPULAR_SEARCH_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagClick(tag)}
                  className="hover:text-red-400 transition-colors truncate whitespace-nowrap cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Shopee Shopping Cart Icon with Badge */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              id="header-cart-btn"
              onClick={onOpenCart}
              className="relative p-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-[#D0011B] text-white transition-all cursor-pointer group"
              aria-label="Keranjang Belanja"
            >
              <ShoppingBag className="w-6 h-6 text-neutral-100 group-hover:text-red-400 transition-colors" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#D0011B] text-white text-[11px] font-black min-w-[20px] h-[20px] px-1 rounded-full flex items-center justify-center border-2 border-[#0f0f0f] shadow-lg animate-bounce">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
