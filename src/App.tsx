import React, { useState, useMemo, useEffect } from 'react';
import { Product, Voucher, CartItem, UserBike, BikeType, MainTabType, SortOption } from './types';
import { CategoryItem } from './components/VerticalCategoryList';
import { AnnouncementBar } from './components/AnnouncementBar';
import { Header } from './components/Header';
import { HeroBannerCarousel } from './components/HeroBannerCarousel';
import { ClaimableVouchers } from './components/ClaimableVouchers';
import { CategoryNavTabs } from './components/CategoryNavTabs';
import { VehicleFilterSubBar } from './components/VehicleFilterSubBar';
import { ProductSortBar } from './components/ProductSortBar';
import { ProductGrid } from './components/ProductGrid';
import { VerticalCategoryList } from './components/VerticalCategoryList';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { GarageModal } from './components/GarageModal';
import { FooterTrustBadges } from './components/FooterTrustBadges';
import { WhatsAppFloatingButton } from './components/WhatsAppFloatingButton';
import { ToastContainer, ToastMessage } from './components/Toast';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { AdminPanel } from './pages/AdminPanel';

function StoreFront() {
  // State variables
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<MainTabType>('semua');
  const [selectedBikeType, setSelectedBikeType] = useState<BikeType>('all');
  const [sortOption, setSortOption] = useState<SortOption>('populer');
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  
  const [userBike, setUserBike] = useState<UserBike | null>(null);
  
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [bikes, setBikes] = useState<UserBike[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAllData = () => {
    return Promise.all([
      fetch('/api/products').then(res => res.json()),
      fetch('/api/vouchers').then(res => res.json()),
      fetch('/api/categories').then(res => res.json()),
      fetch('/api/bikes').then(res => res.json())
    ]).then(([productsData, vouchersData, categoriesData, bikesData]) => {
      setProducts(productsData);
      setVouchers(vouchersData);
      setCategories(categoriesData);
      setBikes(bikesData);
      return { productsData, bikesData };
    });
  };

  useEffect(() => {
    fetchAllData()
    .then(({ productsData, bikesData }) => {
      if (productsData.length > 0 && cartItems.length === 0) {
         setCartItems([{ product: productsData[0], quantity: 1 }]);
      }
      if (bikesData.length > 0 && !userBike) {
         setUserBike(bikesData[0]);
      }
      setIsLoading(false);
    }).catch(err => {
      console.error(err);
      setIsLoading(false);
    });
  }, []);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  // Modals state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isGarageModalOpen, setIsGarageModalOpen] = useState<boolean>(false);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (title: string, message?: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Cart Handlers
  const handleAddToCart = (product: Product, e?: React.MouseEvent, quantity = 1) => {
    if (e) e.stopPropagation();
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
    addToast('Ditambahkan ke Keranjang', `${product.name.slice(0, 38)}...`);
  };

  const handleUpdateCartQuantity = (productId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveCartItem = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
    addToast('Item Dihapus', 'Produk dikeluarkan dari keranjang belanja.');
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  // Voucher Handlers
  const handleClaimVoucher = (voucherId: string) => {
    setVouchers((prev) =>
      prev.map((v) => {
        if (v.id === voucherId) {
          const updated = { ...v, claimed: true };
          // Auto apply to cart if eligible
          if (!appliedVoucher) {
            setAppliedVoucher(updated);
          }
          addToast('Voucher Berhasil Diklaim! 🎉', `${v.title} (${v.code})`);
          return updated;
        }
        return v;
      })
    );
  };

  // Category view selection handler
  const handleSelectCategoryFromList = (
    categoryTitle: string,
    bikeFilter?: BikeType,
    catFilter?: string
  ) => {
    if (bikeFilter) {
      setSelectedBikeType(bikeFilter);
      setActiveTab('semua');
      addToast('Filter Tipe Motor Diterapkan', `Menampilkan part untuk ${categoryTitle}`);
    } else if (catFilter) {
      if (catFilter === 'paket-upgrade') {
        setActiveTab('paket-upgrade');
      } else {
        setActiveTab('semua');
        setSearchQuery(catFilter === 'cvt' ? 'CVT' : 'Rem');
      }
      addToast('Kategori Dipilih', categoryTitle);
    }
  };

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Main Tab filtering
    if (activeTab === 'paket-upgrade') {
      list = list.filter((p) => p.isPaketUpgrade || p.category === 'paket-upgrade');
    } else if (activeTab === 'promo') {
      list = list.filter((p) => p.isPromo || p.discountPercent >= 25);
    }

    // Bike type sub-bar filtering
    if (selectedBikeType !== 'all') {
      list = list.filter((p) =>
        p.bikeCompatibility.includes(selectedBikeType)
      );
    }

    // Smart search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.compatibilityText.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.fitmentTag.toLowerCase().includes(q)
      );
    }

    // Sorting
    if (sortOption === 'terbaru') {
      list = [...list].reverse();
    } else if (sortOption === 'terlaris') {
      list = [...list].sort((a, b) => b.soldCount - a.soldCount);
    } else if (sortOption === 'harga-asc') {
      list = [...list].sort((a, b) => a.price - b.price);
    } else if (sortOption === 'harga-desc') {
      list = [...list].sort((a, b) => b.price - a.price);
    }

    return list;
  }, [activeTab, selectedBikeType, searchQuery, sortOption]);

  const totalCartCount = cartItems.reduce((s, i) => s + i.quantity, 0);

  if (isLoading) {
    return <div className="min-h-screen bg-carbon text-slate-100 flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-carbon text-slate-100 flex flex-col selection:bg-[#E50914] selection:text-white">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Top Announcement Bar */}
      <AnnouncementBar />

      {/* Header & Smart Search */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        selectedBike={userBike}
        onOpenGarage={() => setIsGarageModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto">
        {/* Dynamic Promotional Hero Carousel */}
        <HeroBannerCarousel
          onSelectTab={setActiveTab}
        />

        {/* Claimable Store Vouchers Horizontal Section */}
        <ClaimableVouchers
          vouchers={vouchers}
          onClaimVoucher={handleClaimVoucher}
        />

        {/* Main Category Filter Sticky Tabs */}
        <CategoryNavTabs
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          paketCount={products.filter((p) => p.isPaketUpgrade).length}
          promoCount={products.filter((p) => p.isPromo).length}
        />

        {/* Dynamic View: If tab is 'kategori', show VerticalCategoryList; otherwise show products grid */}
        {activeTab === 'kategori' ? (
          <VerticalCategoryList
            categories={categories}
            onSelectCategoryFilter={handleSelectCategoryFromList}
          />
        ) : (
          <>
            {/* Quick Vehicle Filter Sub-Bar */}
            <VehicleFilterSubBar
              selectedBikeType={selectedBikeType}
              onSelectBikeType={setSelectedBikeType}
              userBike={userBike}
              onOpenGarage={() => setIsGarageModalOpen(true)}
            />

            {/* Product Sorting Bar */}
            <ProductSortBar
              sortOption={sortOption}
              onSelectSort={setSortOption}
              totalProducts={filteredProducts.length}
            />

            {/* 2-Column Product Grid (Mobile-First) */}
            <ProductGrid
              products={filteredProducts}
              userBike={userBike}
              onAddToCart={(prod, e) => handleAddToCart(prod, e, 1)}
              onSelectProduct={(prod) => setSelectedProduct(prod)}
              onResetFilters={() => {
                setSelectedBikeType('all');
                setSearchQuery('');
                setActiveTab('semua');
                setSortOption('populer');
              }}
            />
          </>
        )}
      </main>

      {/* Trust Badges & Footer */}
      <FooterTrustBadges />

      {/* WhatsApp Floating Consultation Trigger */}
      <WhatsAppFloatingButton />

      {/* Modals & Drawers */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={(prod, qty) => handleAddToCart(prod, undefined, qty)}
        userBike={userBike}
        onOpenGarage={() => setIsGarageModalOpen(true)}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        vouchers={vouchers}
        appliedVoucher={appliedVoucher}
        onApplyVoucher={setAppliedVoucher}
        onClearCart={handleClearCart}
        onCheckoutSuccess={() => fetchAllData()}
      />

      <GarageModal
        isOpen={isGarageModalOpen}
        onClose={() => setIsGarageModalOpen(false)}
        selectedBike={userBike}
        bikes={bikes}
        onSelectBike={(b) => {
          setUserBike(b);
          if (b) {
            addToast('Garasi Diperbarui', `Motor aktif: ${b.name}`);
          }
        }}
        onFilterToBikeType={setSelectedBikeType}
      />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<StoreFront />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<LoginPage />} />
      <Route path="/admin" element={<AdminPanel />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
