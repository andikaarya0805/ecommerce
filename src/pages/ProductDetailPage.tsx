import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Star,
  Truck,
  ShieldCheck,
  Share2,
  Heart,
  ChevronRight,
  Minus,
  Plus,
  ShoppingCart,
  Zap,
  MessageCircle,
  ThumbsUp,
  Store,
  Clock,
  Award,
  Check,
  AlertCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Product, UserBike } from '../types';
import { INITIAL_PRODUCTS } from '../data/products';
import {
  getProductVariationGroups,
  getOptionName,
  getProductPriceRange,
  calculateSelectedPrice,
} from '../data/productVariations';
import { formatIDR } from '../components/ProductCard';
import { safeFetchJson } from '../config/api';
import { useCart } from '../context/CartContext';
import { Header } from '../components/Header';
import { AnnouncementBar } from '../components/AnnouncementBar';
import { FooterTrustBadges } from '../components/FooterTrustBadges';
import { WhatsAppFloatingButton } from '../components/WhatsAppFloatingButton';
import { ToastContainer, ToastMessage } from '../components/Toast';
import { CartDrawer } from '../components/CartDrawer';
import { GarageModal } from '../components/GarageModal';

// Mock customer reviews for genuine Shopee feel
const MOCK_REVIEWS = [
  {
    id: 1,
    username: 'r***a',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80',
    rating: 5,
    date: '2026-10-12 14:22',
    variant: 'Vario 125 / 150',
    comment: 'Barang original 100%, pnp tanpa rubah apa-apa di Vario 150 saya. Tarikan bawah sampai atas jadi ngisi terus, gredek hilang total! Pengiriman super kilat dari Jakarta Timur.',
    helpfulCount: 14,
    images: [
      'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=200&q=80',
      'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=200&q=80',
    ],
  },
  {
    id: 2,
    username: 'budi_racing88',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=80&q=80',
    rating: 5,
    date: '2026-10-08 09:15',
    variant: 'All New NMAX / Aerox 155',
    comment: 'Mantap polll seller Jawir Garage! Respon chat ramah, packing bubble tebel aman. Dipasang di New NMAX pas banget, finishing part rapih CNC.',
    helpfulCount: 9,
    images: [],
  },
  {
    id: 3,
    username: 'd***k',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80',
    rating: 5,
    date: '2026-09-29 18:40',
    variant: 'Beat ESP / Deluxe / Street',
    comment: 'Kualitas produk sangat baik, produk original. Kecepatan pengiriman sangat baik, respon penjual sangat baik.',
    helpfulCount: 6,
    images: [
      'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=200&q=80',
    ],
  },
];

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    items: cartItems,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    appliedVoucher,
    setAppliedVoucher,
  } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [loading, setLoading] = useState<boolean>(true);
  const [userBike, setUserBike] = useState<UserBike | null>(null);
  const [bikes, setBikes] = useState<UserBike[]>([]);
  const [isGarageModalOpen, setIsGarageModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Gallery state
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Variations & Quantity state
  const [selectedOptions, setSelectedOptions] = useState<{ [groupName: string]: string }>({});
  const [quantity, setQuantity] = useState(1);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reviews filter
  const [reviewFilter, setReviewFilter] = useState<'all' | 'with-media' | '5-star'>('all');

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const addToast = (title: string, message?: string) => {
    const toastId = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id: toastId, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, 3200);
  };
  const dismissToast = (toastId: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
  };

  // Fetch product data
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const loadData = async () => {
      setLoading(true);
      try {
        const [resProds, resBikes] = await Promise.allSettled([
          safeFetchJson<Product[]>('/api/products'),
          safeFetchJson<UserBike[]>('/api/bikes'),
        ]);

        let prodsList = INITIAL_PRODUCTS;
        if (resProds.status === 'fulfilled' && Array.isArray(resProds.value) && resProds.value.length > 0) {
          prodsList = resProds.value;
          setAllProducts(prodsList);
        }

        if (resBikes.status === 'fulfilled' && Array.isArray(resBikes.value) && resBikes.value.length > 0) {
          setBikes(resBikes.value);
        }

        const found = prodsList.find((p) => p.id === id || p.slug === id);
        if (found) {
          setProduct(found);
        } else {
          // fallback to first product if not found
          setProduct(prodsList[0]);
        }
      } catch (err) {
        console.error('Error fetching product detail:', err);
        const fallback = INITIAL_PRODUCTS.find((p) => p.id === id) || INITIAL_PRODUCTS[0];
        setProduct(fallback);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  // Real-time 1-second background sync for product stock and price
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const resProds = await safeFetchJson<Product[]>('/api/products');
        if (Array.isArray(resProds) && resProds.length > 0) {
          setAllProducts(resProds);
          const updated = resProds.find((p) => p.id === id || p.slug === id);
          if (updated) {
            setProduct((prev) => {
              if (prev && (prev.stock !== updated.stock || prev.price !== updated.price)) {
                return updated;
              }
              return prev;
            });
          }
        }
      } catch (e) {}
    }, 1000);
    return () => clearInterval(interval);
  }, [id]);

  // Variations logic
  const variationGroups = useMemo(() => {
    if (!product) return [];
    return getProductVariationGroups(product);
  }, [product]);

  // Price range helper
  const priceRange = useMemo(() => {
    if (!product) return { minPrice: 0, maxPrice: 0, hasRange: false };
    return getProductPriceRange(product);
  }, [product]);

  // Gallery images list (Generate 4 mock variant shots if only 1 image provided)
  const galleryImages = useMemo(() => {
    if (!product) return [];
    const base = product.image;
    // Provide a list of angles/thumbnails
    return [
      base,
      'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=600&q=80',
    ];
  }, [product]);

  // Preselect variation defaults matching user's bike or 1st option
  useEffect(() => {
    if (product) {
      const initial: { [groupName: string]: string } = {};
      const groups = getProductVariationGroups(product);

      groups.forEach((group, index) => {
        if (index === 0 && userBike) {
          const matchingOpt = group.options.find((opt) => {
            const name = getOptionName(opt).toLowerCase();
            const bikeName = userBike.name.toLowerCase();
            return (
              (bikeName.includes('vario') && name.includes('vario')) ||
              (bikeName.includes('pcx') && name.includes('pcx')) ||
              (bikeName.includes('nmax') && name.includes('nmax')) ||
              (bikeName.includes('aerox') && name.includes('aerox')) ||
              (bikeName.includes('beat') && name.includes('beat')) ||
              (bikeName.includes('scoopy') && name.includes('scoopy')) ||
              (bikeName.includes('mio') && name.includes('mio'))
            );
          });
          if (matchingOpt) {
            initial[group.name] = getOptionName(matchingOpt);
          }
        }
      });

      // If product does NOT have varying price range, preselect 1st option
      if (!priceRange.hasRange && groups.length > 0) {
        groups.forEach((g) => {
          if (!initial[g.name] && g.options.length > 0) {
            initial[g.name] = getOptionName(g.options[0]);
          }
        });
      }

      setSelectedOptions(initial);
      setQuantity(1);
      setValidationError(null);
      setSelectedImageIndex(0);
    }
  }, [product, userBike, priceRange.hasRange]);

  // Calculate pricing based on chosen options
  const { dynamicPrice, dynamicOriginalPrice } = useMemo(() => {
    if (!product) return { dynamicPrice: 0, dynamicOriginalPrice: 0 };
    return calculateSelectedPrice(product, selectedOptions);
  }, [product, selectedOptions]);

  const hasAnySelection = Object.keys(selectedOptions).length > 0;
  const unselectedGroups = useMemo(() => {
    return variationGroups.filter((g) => !selectedOptions[g.name]);
  }, [variationGroups, selectedOptions]);
  const isAllSelected = unselectedGroups.length === 0;

  const variantString = Object.values(selectedOptions).filter(Boolean).join(' • ');

  const handleSelectOption = (groupName: string, optionName: string) => {
    setSelectedOptions((prev) => {
      if (prev[groupName] === optionName) {
        const copy = { ...prev };
        delete copy[groupName];
        return copy;
      }
      return {
        ...prev,
        [groupName]: optionName,
      };
    });
    setValidationError(null);
  };

  const handleAddToCartClick = () => {
    if (variationGroups.length > 0 && !isAllSelected) {
      setValidationError(`Silakan pilih variasi: ${unselectedGroups.map((g) => g.name).join(', ')}`);
      return;
    }
    addToCart(product!, quantity, variantString || undefined, dynamicPrice);
    addToast(
      'Berhasil Ditambahkan ke Keranjang! 🛒',
      `${product!.name.slice(0, 30)}... (${quantity}x)`
    );
  };

  const handleBuyNowClick = () => {
    if (variationGroups.length > 0 && !isAllSelected) {
      setValidationError(`Silakan pilih variasi: ${unselectedGroups.map((g) => g.name).join(', ')}`);
      return;
    }
    addToCart(product!, quantity, variantString || undefined, dynamicPrice);
    navigate('/checkout');
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    addToast('Link Produk Disalin!', 'Bagikan link ke teman sesama riders.');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const toggleFavorite = () => {
    if (!product) return;
    setIsFavorite((prev) => !prev);
    addToast(
      !isFavorite ? 'Disimpan ke Favorit ❤️' : 'Dihapus dari Favorit',
      product.name
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#141414] text-slate-100 flex flex-col selection:bg-[#D0011B] selection:text-white">
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        <AnnouncementBar />
        <Header
          cartCount={cartItems.reduce((s, i) => s + i.quantity, 0)}
          onOpenCart={() => setIsCartOpen(true)}
        />
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center min-h-[50vh]">
          <div className="w-12 h-12 border-4 border-[#D0011B] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-neutral-400 text-sm font-medium">Memuat detail part racing Jawir Garage...</p>
        </div>
        <FooterTrustBadges />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#141414] text-slate-100 flex flex-col selection:bg-[#D0011B] selection:text-white">
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        <AnnouncementBar />
        <Header
          cartCount={cartItems.reduce((s, i) => s + i.quantity, 0)}
          onOpenCart={() => setIsCartOpen(true)}
        />
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center min-h-[50vh] space-y-4">
          <p className="text-xl font-bold text-white">Produk Tidak Ditemukan</p>
          <p className="text-neutral-400 text-sm">Part racing yang Anda cari mungkin sudah habis atau dipindahkan.</p>
          <Link
            to="/"
            className="px-4 py-2 bg-[#D0011B] hover:bg-red-700 text-white font-bold rounded-lg transition-colors inline-block"
          >
            Kembali ke Beranda
          </Link>
        </div>
        <FooterTrustBadges />
      </div>
    );
  }

  // Filter reviews
  const filteredReviews = MOCK_REVIEWS.filter((rev) => {
    if (reviewFilter === 'with-media') return rev.images.length > 0;
    if (reviewFilter === '5-star') return rev.rating === 5;
    return true;
  });

  // Related products
  const relatedProducts = allProducts
    .filter((p) => p.id !== product.id)
    .slice(0, 6);

  return (
    <div className="min-h-screen bg-[#141414] text-slate-100 flex flex-col selection:bg-[#D0011B] selection:text-white">
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Top Announcement Bar */}
      <AnnouncementBar />

      {/* Shopee-style Header */}
      <Header
        cartCount={cartItems.reduce((s, i) => s + i.quantity, 0)}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* Breadcrumb Navigation */}
      <div className="bg-[#181818] border-b border-neutral-800 text-xs text-neutral-400 py-2.5 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-1.5 flex-wrap">
          <Link to="/" className="text-neutral-400 hover:text-white transition-colors">
            Beranda
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-600" />
          <Link to="/" className="text-neutral-400 hover:text-white capitalize transition-colors">
            {product.category?.replace('-', ' ') || 'Suku Cadang'}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-600" />
          <span className="text-neutral-200 font-medium truncate max-w-[280px] sm:max-w-md">
            {product.name}
          </span>
        </div>
      </div>

      {/* MAIN CONTENT CONTAINER */}
      <main className="max-w-7xl w-full mx-auto px-2 sm:px-4 py-4 space-y-4">
        {/* TOP SECTION: PHOTO GALLERY (LEFT) + BUY BOX & VARIATIONS (RIGHT) */}
        <section className="bg-[#181818] rounded-xl border border-neutral-800 p-4 sm:p-6 shadow-xl grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8">
          {/* LEFT COLUMN: PRODUCT IMAGES (5 Cols) */}
          <div className="md:col-span-5 flex flex-col gap-3">
            {/* Main Primary Image */}
            <div className="relative aspect-square w-full rounded-lg bg-[#202020] border border-neutral-800 overflow-hidden flex items-center justify-center group">
              <img
                src={galleryImages[selectedImageIndex] || product.image}
                alt={product.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
              />

              {/* Shopee Mall Tag */}
              <div className="absolute top-3 left-3 z-10 flex flex-col gap-1 items-start">
                <span className="bg-[#D0011B] text-white text-[10px] font-black px-2 py-0.5 rounded shadow uppercase tracking-wider">
                  SHOPEE MALL
                </span>
                {product.promoTag && (
                  <span className="bg-amber-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded shadow uppercase">
                    {product.promoTag}
                  </span>
                )}
              </div>

              {/* Fitment badge */}
              <div className="absolute bottom-3 left-3 z-10">
                <span className="bg-black/85 backdrop-blur text-white text-[10px] font-bold px-2.5 py-1 rounded border border-neutral-700">
                  {product.fitmentTag || 'PnP'}
                </span>
              </div>
            </div>

            {/* Thumbnail Carousel (Shopee Style) */}
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {galleryImages.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onMouseEnter={() => setSelectedImageIndex(idx)}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`aspect-square rounded-md overflow-hidden border-2 transition-all cursor-pointer bg-neutral-900 ${
                    selectedImageIndex === idx
                      ? 'border-[#D0011B] shadow-md shadow-red-950/40 ring-1 ring-[#D0011B]'
                      : 'border-neutral-800 hover:border-neutral-600 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={imgUrl}
                    alt={`${product.name} thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>

            {/* Share, Favorite, and Protection Badges */}
            <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
              <div className="flex items-center gap-3">
                <span className="text-neutral-500 font-medium">Bagikan:</span>
                <button
                  onClick={handleShare}
                  className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                  title="Salin Link Produk"
                >
                  <Share2 className="w-4 h-4 text-neutral-400 hover:text-white" />
                  <span>{copiedLink ? 'Tersalin!' : 'Salin Link'}</span>
                </button>
              </div>

              <button
                onClick={toggleFavorite}
                className="flex items-center gap-1.5 hover:text-red-400 transition-colors cursor-pointer"
              >
                <Heart
                  className={`w-4 h-4 ${
                    isFavorite ? 'fill-[#D0011B] text-[#D0011B]' : 'text-neutral-400'
                  }`}
                />
                <span>Favorit ({isFavorite ? '1.2RB+' : '1.2RB'})</span>
              </button>
            </div>

            {/* Shopee Garansi 100% Original Box */}
            <div className="p-3 bg-neutral-900/80 rounded-lg border border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>100% Original & Garansi Pengembalian 7 Hari</span>
              </div>
              <span className="text-neutral-500">Gratis Retur</span>
            </div>
          </div>

          {/* RIGHT COLUMN: PRODUCT INFO, PRICE, VARIATIONS & ACTIONS (7 Cols) */}
          <div className="md:col-span-7 flex flex-col justify-between">
            <div>
              {/* Product Title */}
              <h1 className="font-heading font-extrabold text-lg sm:text-2xl text-white leading-snug">
                <span className="inline-block bg-[#D0011B] text-white text-[11px] font-black px-2 py-0.5 rounded mr-2 align-middle uppercase tracking-wide">
                  Mall
                </span>
                {product.name}
              </h1>

              {/* Ratings, Reviews, and Sold counters */}
              <div className="flex items-center gap-3 sm:gap-6 mt-3 text-xs flex-wrap">
                <div className="flex items-center gap-1.5 pb-0.5 border-b border-[#D0011B]/80 text-[#D0011B]">
                  <span className="font-extrabold text-sm">{product.rating.toFixed(1)}</span>
                  <div className="flex items-center text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < Math.floor(product.rating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-neutral-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="h-3 w-px bg-neutral-700" />

                <div className="flex items-center gap-1 text-neutral-300">
                  <span className="font-bold underline text-white">128</span>
                  <span className="text-neutral-400">Penilaian</span>
                </div>

                <div className="h-3 w-px bg-neutral-700" />

                <div className="flex items-center gap-1 text-neutral-300">
                  <span className="font-bold text-white">{product.soldCount}</span>
                  <span className="text-neutral-400">Terjual</span>
                </div>
              </div>

              {/* SHOPEE PRICE HIGHLIGHT BANNER */}
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-[#221010] via-[#1a1212] to-neutral-900 border border-red-950/70 flex flex-col gap-1">
                <div className="flex items-baseline gap-3 flex-wrap">
                  {/* Strikethrough Original Price */}
                  {hasAnySelection && dynamicOriginalPrice > dynamicPrice && (
                    <span className="text-sm text-neutral-500 line-through">
                      {formatIDR(dynamicOriginalPrice)}
                    </span>
                  )}

                  {/* Main Red Big Price */}
                  <span className="font-racing font-black text-2xl sm:text-3xl text-[#D0011B] tracking-tight animate-in zoom-in-95 duration-150">
                    {priceRange.hasRange && !hasAnySelection
                      ? `Rp${priceRange.minPrice.toLocaleString('id-ID')} - Rp${priceRange.maxPrice.toLocaleString('id-ID')}`
                      : formatIDR(dynamicPrice)}
                  </span>

                  {/* Discount percentage badge */}
                  {product.discountPercent > 0 && (
                    <span className="bg-[#D0011B] text-white text-[11px] font-black px-2 py-0.5 rounded shadow uppercase">
                      {product.discountPercent}% OFF
                    </span>
                  )}
                </div>

                {priceRange.hasRange && (
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    {hasAnySelection ? (
                      <span>Varian Aktif: <strong className="text-white">{variantString}</strong></span>
                    ) : (
                      <span>Rentang Harga Varian: <span className="text-neutral-200 font-semibold">{formatIDR(priceRange.minPrice)} - {formatIDR(priceRange.maxPrice)}</span> (Pilih salah satu variasi di bawah)</span>
                    )}
                  </p>
                )}
              </div>

              {/* SHIPPING & ONGKIR INFO (Shopee Style) */}
              <div className="mt-4 py-3 border-y border-neutral-800/80 space-y-2 text-xs">
                <div className="flex items-start gap-4">
                  <span className="w-24 text-neutral-400 flex-shrink-0">Pengiriman</span>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-neutral-200">
                      <Truck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>
                        Dikirim dari <strong className="text-white">{product.originCity || 'Kota Jakarta Timur'}</strong>
                      </span>
                    </div>
                    <div className="text-neutral-400 text-[11px]">
                      Ongkos Kirim: <strong className="text-emerald-400 font-semibold">Rp0 - Rp18.000</strong> (Tersedia Gratis Ongkir XTRA)
                    </div>
                  </div>
                </div>

                {/* Motor Compatibility Checker */}
                <div className="flex items-start gap-4 pt-2">
                  <span className="w-24 text-neutral-400 flex-shrink-0">Kesesuaian</span>
                  <div className="flex-1">
                    {userBike ? (
                      <div className="flex items-center justify-between bg-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-800 text-xs">
                        <span className="text-neutral-300">
                          Motor Aktif: <strong className="text-white">{userBike.name}</strong>
                        </span>
                        <button
                          onClick={() => setIsGarageModalOpen(true)}
                          className="text-[#D0011B] font-bold hover:underline"
                        >
                          Ganti
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-300 text-xs">{product.compatibilityText}</span>
                        <button
                          onClick={() => setIsGarageModalOpen(true)}
                          className="text-[#D0011B] font-bold text-xs hover:underline"
                        >
                          + Cek Motor Kamu
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* VARIATIONS SELECTOR (Shopee Signature Chip Grid) */}
              <div className="mt-4 space-y-4">
                {validationError && (
                  <div className="p-2.5 rounded bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span>{validationError}</span>
                  </div>
                )}

                {variationGroups.map((group) => {
                  const currentSelected = selectedOptions[group.name];
                  return (
                    <div key={group.name} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                      <span className="w-24 text-xs text-neutral-400 sm:pt-2 flex-shrink-0">
                        {group.name}
                      </span>
                      <div className="flex flex-wrap gap-2 flex-1">
                        {group.options.map((opt) => {
                          const optName = getOptionName(opt);
                          const isSelected = currentSelected === optName;

                          return (
                            <button
                              key={optName}
                              type="button"
                              onClick={() => handleSelectOption(group.name, optName)}
                              className={`relative px-3 py-2 rounded text-xs transition-all cursor-pointer text-left ${
                                isSelected
                                  ? 'bg-[#D0011B]/15 border-2 border-[#D0011B] text-[#D0011B] font-bold shadow-sm'
                                  : 'bg-[#202020] border border-neutral-700 hover:border-neutral-500 text-neutral-300'
                              }`}
                            >
                              <span>{optName}</span>

                              {/* Shopee Checkmark Corner Ribbon */}
                              {isSelected && (
                                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#D0011B] rounded-tl flex items-center justify-center">
                                  <Check className="w-2.5 h-2.5 text-white stroke-[3.5]" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* QUANTITY SELECTOR & STOCK COUNT */}
                <div className="flex items-center gap-4 pt-2">
                  <span className="w-24 text-xs text-neutral-400 flex-shrink-0">Kuantitas</span>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border border-neutral-700 rounded-md bg-[#202020] overflow-hidden">
                      <button
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="px-3 py-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 font-bold transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 py-1.5 text-xs font-bold text-white min-w-[38px] text-center">
                        {quantity}
                      </span>
                      <button
                        onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                        className="px-3 py-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 font-bold transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="text-xs text-neutral-400">
                      Tersisa <strong className="text-white">{product.stock}</strong> buah
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* SHOPEE ACTION BUTTONS (MASUKKAN KERANJANG + BELI SEKARANG) */}
            <div className="mt-8 pt-4 border-t border-neutral-800 flex items-center gap-3.5 flex-wrap">
              {/* Live Chat Mech Consultation */}
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent('open-jawir-chat', {
                      detail: {
                        product,
                        initialMessage: `Halo Mekanik Jawir Garage, saya mau konsultasi part: ${product.name}`,
                      },
                    })
                  );
                }}
                className="w-12 h-12 rounded-xl border border-red-600/60 bg-red-950/40 text-[#E50914] hover:bg-red-900/50 flex items-center justify-center transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95 shrink-0"
                title="Tanya ke Live Chat Mekanik"
              >
                <MessageCircle className="w-5 h-5" />
              </button>

              {/* Shopee style "+ Masukkan Keranjang" Button */}
              <button
                type="button"
                onClick={handleAddToCartClick}
                className="flex-1 min-w-[190px] min-h-[48px] bg-[#D0011B]/15 hover:bg-[#D0011B]/25 active:scale-98 text-[#D0011B] font-bold text-sm py-3.5 px-5 rounded-xl border border-[#D0011B] flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-sm"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Masukkan Keranjang</span>
              </button>

              {/* Shopee style "Beli Sekarang" Full Red Button */}
              <button
                type="button"
                onClick={handleBuyNowClick}
                className="flex-1 min-w-[190px] min-h-[48px] bg-[#D0011B] hover:bg-[#b00117] active:scale-98 text-white font-extrabold text-sm py-3.5 px-5 rounded-xl shadow-lg shadow-red-950/60 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>Beli Sekarang</span>
              </button>
            </div>
          </div>
        </section>

        {/* STORE PROFILE CARD (Shopee Signature Official Store Box) */}
        <section className="bg-[#181818] rounded-xl border border-neutral-800 p-4 sm:p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-neutral-900 border-2 border-[#D0011B] p-0.5 overflow-hidden flex items-center justify-center">
                <Store className="w-8 h-8 text-[#D0011B]" />
              </div>
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#D0011B] text-white text-[9px] font-black px-1.5 py-0.2 rounded uppercase">
                MALL
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-white text-base">
                  Jawir Garage Official Store
                </h3>
                <span className="bg-emerald-950 text-emerald-400 border border-emerald-800/60 text-[10px] font-bold px-1.5 py-0.2 rounded">
                  Online
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Aktif beberapa menit lalu • Kota Jakarta Timur
              </p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent('open-jawir-chat', {
                        detail: {
                          product,
                          initialMessage: `Halo Admin, apakah produk ${product.name} ini ready stok?`,
                        },
                      })
                    );
                  }}
                  className="bg-[#D0011B]/15 border border-[#D0011B] text-[#D0011B] hover:bg-[#D0011B]/25 text-xs font-bold px-3 py-1 rounded flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Chat Sekarang</span>
                </button>
                <Link
                  to="/"
                  className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold px-3 py-1 rounded border border-neutral-700 transition-colors"
                >
                  Kunjungi Toko
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t md:border-t-0 md:border-l border-neutral-800 pt-3 md:pt-0 md:pl-6 text-xs">
            <div>
              <span className="text-neutral-400 block text-[11px]">Penilaian</span>
              <span className="text-[#D0011B] font-bold text-sm">4.9 (48.8RB)</span>
            </div>
            <div>
              <span className="text-neutral-400 block text-[11px]">Produk</span>
              <span className="text-white font-bold text-sm">{allProducts.length} Part</span>
            </div>
            <div>
              <span className="text-neutral-400 block text-[11px]">Waktu Chat Dibalas</span>
              <span className="text-white font-bold text-sm">Hitungan Menit</span>
            </div>
            <div>
              <span className="text-neutral-400 block text-[11px]">Bergabung</span>
              <span className="text-white font-bold text-sm">3 Tahun Lalu</span>
            </div>
            <div>
              <span className="text-neutral-400 block text-[11px]">Pengikut</span>
              <span className="text-white font-bold text-sm">52.4RB</span>
            </div>
          </div>
        </section>

        {/* SPECIFICATIONS & PRODUCT DESCRIPTION SECTION */}
        <section className="bg-[#181818] rounded-xl border border-neutral-800 p-4 sm:p-6 shadow-xl space-y-6">
          {/* Specifications Box */}
          <div>
            <h2 className="font-heading font-extrabold text-base text-white uppercase tracking-wider mb-3 pb-2 border-b border-neutral-800">
              Spesifikasi Produk
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-6 text-xs">
              <div className="flex justify-between py-1.5 border-b border-neutral-800/60">
                <span className="text-neutral-400 w-36">Kategori</span>
                <span className="font-semibold text-white capitalize">{product.category}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-neutral-800/60">
                <span className="text-neutral-400 w-36">Merek / Speedshop</span>
                <span className="font-semibold text-white">Jawir Garage Platinum</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-neutral-800/60">
                <span className="text-neutral-400 w-36">Kondisi</span>
                <span className="font-semibold text-white">100% Baru & Original</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-neutral-800/60">
                <span className="text-neutral-400 w-36">Stok Tersedia</span>
                <span className="font-semibold text-white">{product.stock} Unit</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-neutral-800/60">
                <span className="text-neutral-400 w-36">Kesesuaian Motor</span>
                <span className="font-semibold text-white">{product.compatibilityText}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-neutral-800/60">
                <span className="text-neutral-400 w-36">Dikirim Dari</span>
                <span className="font-semibold text-white">{product.originCity || 'Jakarta Timur'}</span>
              </div>

              {/* Dynamic specs if provided */}
              {product.specs &&
                Object.entries(product.specs).map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1.5 border-b border-neutral-800/60">
                    <span className="text-neutral-400 w-36">{k}</span>
                    <span className="font-semibold text-white text-right">{v}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Detailed Description Box */}
          <div>
            <h2 className="font-heading font-extrabold text-base text-white uppercase tracking-wider mb-3 pb-2 border-b border-neutral-800">
              Deskripsi Produk
            </h2>
            <div className="text-xs sm:text-sm text-neutral-300 leading-relaxed whitespace-pre-line space-y-3 font-sans">
              <p>{product.description}</p>
              <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800 text-xs text-neutral-400 space-y-1">
                <p className="font-bold text-white">CATATAN PENTING MEKANIK JAWIR GARAGE:</p>
                <p>• Pemasangan Plug & Play (PnP) tanpa ubahan rangka atau kabel.</p>
                <p>• Pastikan memilih varian tipe motor yang sesuai dengan kendaraanmu.</p>
                <p>• Bila ragu, gunakan fitur Live Chat mekanik kami untuk konsultasi racikan terbaik.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CUSTOMER REVIEWS / PENILAIAN PRODUK (Shopee Style) */}
        <section className="bg-[#181818] rounded-xl border border-neutral-800 p-4 sm:p-6 shadow-xl space-y-5">
          <h2 className="font-heading font-extrabold text-base text-white uppercase tracking-wider">
            Penilaian Produk
          </h2>

          {/* Rating Summary Box */}
          <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row items-center gap-6">
            <div className="text-center sm:text-left sm:pr-8 sm:border-r border-neutral-800">
              <div className="flex items-baseline justify-center sm:justify-start gap-1">
                <span className="font-racing font-black text-3xl sm:text-4xl text-[#D0011B]">
                  {product.rating.toFixed(1)}
                </span>
                <span className="text-neutral-400 text-sm">dari 5</span>
              </div>
              <div className="flex items-center text-amber-400 my-1 justify-center sm:justify-start">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-[11px] text-neutral-400">Berdasarkan 128 Penilaian</span>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
              <button
                type="button"
                onClick={() => setReviewFilter('all')}
                className={`px-3 py-1.5 rounded text-xs font-semibold border transition-colors cursor-pointer ${
                  reviewFilter === 'all'
                    ? 'border-[#D0011B] text-[#D0011B] bg-[#D0011B]/15'
                    : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-neutral-600'
                }`}
              >
                Semua ({MOCK_REVIEWS.length})
              </button>
              <button
                type="button"
                onClick={() => setReviewFilter('5-star')}
                className={`px-3 py-1.5 rounded text-xs font-semibold border transition-colors cursor-pointer ${
                  reviewFilter === '5-star'
                    ? 'border-[#D0011B] text-[#D0011B] bg-[#D0011B]/15'
                    : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-neutral-600'
                }`}
              >
                5 Bintang (125)
              </button>
              <button
                type="button"
                onClick={() => setReviewFilter('with-media')}
                className={`px-3 py-1.5 rounded text-xs font-semibold border transition-colors cursor-pointer ${
                  reviewFilter === 'with-media'
                    ? 'border-[#D0011B] text-[#D0011B] bg-[#D0011B]/15'
                    : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-neutral-600'
                }`}
              >
                Dengan Foto / Video (48)
              </button>
            </div>
          </div>

          {/* Review List */}
          <div className="divide-y divide-neutral-800/80">
            {filteredReviews.map((rev) => (
              <div key={rev.id} className="py-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={rev.avatar}
                      alt={rev.username}
                      className="w-8 h-8 rounded-full object-cover border border-neutral-700"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">{rev.username}</span>
                      <div className="flex items-center text-amber-400">
                        {[...Array(rev.rating)].map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] text-neutral-500">{rev.date}</span>
                </div>

                <div className="text-[11px] text-neutral-400">
                  Variasi: <span className="text-neutral-300 font-semibold">{rev.variant}</span>
                </div>

                <p className="text-xs text-neutral-200 leading-relaxed">{rev.comment}</p>

                {rev.images.length > 0 && (
                  <div className="flex items-center gap-2 pt-1">
                    {rev.images.map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt="Foto review"
                        className="w-16 h-16 rounded object-cover border border-neutral-700 hover:scale-105 transition-transform cursor-pointer"
                      />
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 pt-1">
                  <ThumbsUp className="w-3 h-3" />
                  <span>{rev.helpfulCount} orang terbantu dengan ulasan ini</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* RELATED / SIMILAR PRODUCTS RECOMMENDATION */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-extrabold text-base text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D0011B]" />
              <span>Produk Lainnya Dari Toko Ini</span>
            </h2>
            <Link to="/" className="text-xs text-[#D0011B] hover:underline font-bold">
              Lihat Semua →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-2.5">
            {relatedProducts.map((rel) => (
              <div
                key={rel.id}
                onClick={() => navigate(`/product/${rel.id}`)}
                className="group bg-[#181818] hover:bg-[#202020] rounded-lg border border-neutral-800 hover:border-[#D0011B] p-2 transition-all duration-200 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-square w-full rounded bg-neutral-900 overflow-hidden mb-2">
                    <img
                      src={rel.image}
                      alt={rel.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <h4 className="text-xs text-neutral-200 font-semibold line-clamp-2 group-hover:text-[#D0011B] transition-colors">
                    {rel.name}
                  </h4>
                </div>
                <div className="mt-2 pt-1 border-t border-neutral-800 flex items-center justify-between">
                  <span className="font-racing font-bold text-xs text-[#D0011B]">
                    {formatIDR(rel.price)}
                  </span>
                  <span className="text-[10px] text-neutral-500">{rel.soldCount} terjual</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Trust Badges & Footer */}
      <FooterTrustBadges />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        vouchers={[]}
        appliedVoucher={appliedVoucher}
        onApplyVoucher={setAppliedVoucher}
        onClearCart={clearCart}
        onCheckoutSuccess={() => {}}
      />

      {/* Garage Modal */}
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
        onFilterToBikeType={() => {}}
      />
    </div>
  );
};
