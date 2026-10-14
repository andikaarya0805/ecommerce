import React from 'react';
import { MainTabType } from '../types';
import { Grid, Flame, Layers, Tag } from 'lucide-react';

interface CategoryNavTabsProps {
  activeTab: MainTabType;
  onSelectTab: (tab: MainTabType) => void;
  paketCount?: number;
  promoCount?: number;
}

export const CategoryNavTabs: React.FC<CategoryNavTabsProps> = ({
  activeTab,
  onSelectTab,
  paketCount = 4,
  promoCount = 8,
}) => {
  const tabs: { id: MainTabType; label: string; icon: React.ReactNode; badge?: number | string }[] = [
    {
      id: 'semua',
      label: 'Semua Produk',
      icon: <Grid className="w-3.5 h-3.5" />,
    },
    {
      id: 'paket-upgrade',
      label: 'Paket Upgrade',
      icon: <Flame className="w-3.5 h-3.5" />,
      badge: paketCount,
    },
    {
      id: 'kategori',
      label: 'Kategori Part',
      icon: <Layers className="w-3.5 h-3.5" />,
    },
    {
      id: 'promo',
      label: 'Promo',
      icon: <Tag className="w-3.5 h-3.5" />,
      badge: '9.9',
    },
  ];

  return (
    <nav aria-label="Kategori Utama" className="sticky top-[95px] z-30 bg-[#121212]/95 backdrop-blur-md border-b border-neutral-800 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-4">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                onClick={() => onSelectTab(tab.id)}
                className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-all select-none cursor-pointer flex-1 sm:flex-initial justify-center ${
                  isActive
                    ? 'bg-[#E50914] text-white shadow-md shadow-red-950/40'
                    : 'bg-neutral-900/90 text-neutral-400 hover:text-white hover:bg-neutral-800/90 border border-neutral-800'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-neutral-400'}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? 'bg-black/40 text-white'
                        : 'bg-red-950 text-red-400 border border-red-800/50'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
