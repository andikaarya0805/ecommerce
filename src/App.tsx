import React, { useState, useMemo, useEffect } from 'react';
import { Product, Voucher, CartItem, UserBike, BikeType, MainTabType, SortOption } from './types';
import { CategoryItem } from './components/VerticalCategoryList';
import { INITIAL_PRODUCTS, CATEGORY_ITEMS } from './data/products';
import { AnnouncementBar } from './components/AnnouncementBar';
import { Header } from './components/Header';
import { BrandHeroSection } from './components/BrandHeroSection';
import { ClaimableVouchers } from './components/ClaimableVouchers';
import { CategoryNavTabs } from './components/CategoryNavTabs';
import { VehicleFilterSubBar } from './components/VehicleFilterSubBar';
import { ProductSortBar } from './components/ProductSortBar';
import { ProductGrid } from './components/ProductGrid';
import { VerticalCategoryList } from './components/VerticalCategoryList';
import { ProductDetailModal } from './components/ProductDetailModal';
import { ShopeeVariationModal } from './components/ShopeeVariationModal';
import { CartDrawer } from './components/CartDrawer';
import { GarageModal } from './components/GarageModal';
import { FooterTrustBadges } from './components/FooterTrustBadges';
import { WhatsAppFloatingButton } from './components/WhatsAppFloatingButton';
import { ToastContainer, ToastMessage } from './components/Toast';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { AdminPanel } from './pages/AdminPanel';
import { InvoicePage } from './pages/InvoicePage';
import { TrackOrderPage } from './pages/TrackOrderPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { CartPage } from './pages/CartPage';
import { OrderHistoryPage } from './pages/OrderHistoryPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { useCart } from './context/CartContext';
import { safeFetchJson } from './config/api';

function StoreFront() {
  // Global cart & voucher state from context
  const {
    items: cartItems,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    appliedVoucher,
    setAppliedVoucher,
  } = useCart();
  const navigate = useNavigate();

  // State variables
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<MainTabType>('semua');
  const [selectedBikeType, setSelectedBikeType] = useState<BikeType>('all');
  const [sortOption, setSortOption] = useState<SortOption>('populer');
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  
  const [userBike, setUserBike] = useState<UserBike | null>(null);
  
  // Initialize with INITIAL_PRODUCTS so user dashboard products render immediately on load
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [categories, setCategories] = useState<CategoryItem[]>(CATEGORY_ITEMS);
  const [bikes, setBikes] = useState<UserBike[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAllData = async () => {
    try {
      const [resProd, resVouch, resCat, resBikes] = await Promise.allSettled([
        safeFetchJson<Product[]>('/api/products'),
        safeFetchJson<Voucher[]>('/api/vouchers'),
        safeFetchJson<CategoryItem[]>('/api/categories'),
        safeFetchJson<UserBike[]>('/api/bikes'),
      ]);

      if (resProd.status === 'fulfilled' && Array.isArray(resProd.value) && resProd.value.length > 0) {
        setProducts(resProd.value);
      }
      if (resVouch.status === 'fulfilled' && Array.isArray(resVouch.value) && resVouch.value.length > 0) {
        setVouchers(resVouch.value);
      }
      if (resCat.status === 'fulfilled' && Array.isArray(resCat.value) && resCat.value.length > 0) {
        setCategories(resCat.value);
      }
      if (resBikes.status === 'fulfilled' && Array.isArray(resBikes.value) && resBikes.value.length > 0) {
        setBikes(resBikes.value);
      }
    } catch (e) {
      console.log('Fetch error fallback notice:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  // Modals state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [variationProduct, setVariationProduct] = useState<Product | null>(null);
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
  const handleAddToCart = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    // Open Shopee-style variation selector modal
    setVariationProduct(product);
  };

  const handleConfirmVariationAddToCart = (product: Product, quantity = 1, selectedVariant?: string) => {
    addToCart(product, quantity, selectedVariant);
    const variantTag = selectedVariant ? ` [${selectedVariant}]` : '';
    addToast('Ditambahkan ke Keranjang', `${product.name.slice(0, 32)}...${variantTag}`);
  };

  const handleConfirmVariationBuyNow = (product: Product, quantity = 1, selectedVariant?: string) => {
    addToCart(product, quantity, selectedVariant);
    setIsCartOpen(true);
  };

  const handleUpdateCartQuantity = (productId: string, delta: number, selectedVariant?: string) => {
    updateQuantity(productId, delta, selectedVariant);
  };

  const handleRemoveCartItem = (productId: string, selectedVariant?: string) => {
    removeItem(productId, selectedVariant);
    addToast('Item Dihapus', 'Produk dikeluarkan dari keranjang belanja.');
  };

  const handleClearCart = () => {
    clearCart();
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
        Array.isArray(p.bikeCompatibility) && p.bikeCompatibility.includes(selectedBikeType)
      );
    }

    // Smart search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.compatibilityText?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          p.fitmentTag?.toLowerCase().includes(q)
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
  }, [products, activeTab, selectedBikeType, searchQuery, sortOption]);

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

      {/* Brand Hero Section & Store Tabs */}
      <BrandHeroSection
        totalProducts={products.length}
        selectedBike={userBike}
        onOpenGarage={() => setIsGarageModalOpen(true)}
        activeStoreTab={activeTab}
        onSelectStoreTab={(tab: any) => setActiveTab(tab)}
      />

      {/* Main Content Area */}
      <main id="product-catalog-section" className="flex-1 max-w-7xl w-full mx-auto">

        {/* Claimable Store Vouchers Horizontal Section */}
        <ClaimableVouchers
          vouchers={vouchers}
          onClaimVoucher={handleClaimVoucher}
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
              onAddToCart={(prod, e) => handleAddToCart(prod, e)}
              onSelectProduct={(prod) => {
                navigate(`/product/${prod.id}`);
              }}
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
      <ShopeeVariationModal
        product={variationProduct}
        isOpen={!!variationProduct}
        onClose={() => setVariationProduct(null)}
        onAddToCart={handleConfirmVariationAddToCart}
        onBuyNow={handleConfirmVariationBuyNow}
        userBike={userBike}
      />

      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleConfirmVariationAddToCart}
        onBuyNow={handleConfirmVariationBuyNow}
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
      <Route path="/product/:id" element={<ProductDetailPage />} />
      <Route path="/produk/:id" element={<ProductDetailPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/orders" element={<OrderHistoryPage />} />
      <Route path="/my-orders" element={<OrderHistoryPage />} />
      <Route path="/orders/:invoiceNumber" element={<InvoicePage />} />
      <Route path="/track-order" element={<TrackOrderPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<LoginPage />} />
      <Route path="/admin" element={<AdminPanel />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
