import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatIDR } from '../components/ProductCard';
import {
  ShoppingBag,
  Store,
  Trash2,
  Plus,
  Minus,
  Ticket,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Truck,
  Check,
  AlertCircle
} from 'lucide-react';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    appliedVoucher,
    setAppliedVoucher,
    subtotal,
  } = useCart();

  const getItemKey = (item: { product: { id: string }; selectedVariant?: string }) =>
    `${item.product.id}__${item.selectedVariant || ''}`;

  // Selected items state for checkout (Shopee style allows partial checkout)
  const [selectedIds, setSelectedIds] = useState<string[]>(() => items.map(getItemKey));

  // Sync selectedIds with items
  const allSelected = items.length > 0 && selectedIds.length === items.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map(getItemKey));
    }
  };

  const toggleSelectItem = (key: string) => {
    if (selectedIds.includes(key)) {
      setSelectedIds(selectedIds.filter((k) => k !== key));
    } else {
      setSelectedIds([...selectedIds, key]);
    }
  };

  // Selected items subtotal
  const selectedItems = items.filter((i) => selectedIds.includes(getItemKey(i)));
  const selectedSubtotal = selectedItems.reduce((s, i) => s + (i.customPrice ?? i.product.price) * i.quantity, 0);

  // Voucher discount
  let voucherDiscount = 0;
  if (appliedVoucher) {
    if (appliedVoucher.discount_type === 'PERCENT') {
      voucherDiscount = Math.floor((selectedSubtotal * (appliedVoucher.discount_value || 10)) / 100);
      if (appliedVoucher.max_discount_amount && voucherDiscount > appliedVoucher.max_discount_amount) {
        voucherDiscount = appliedVoucher.max_discount_amount;
      }
    } else {
      voucherDiscount = appliedVoucher.discountAmount || appliedVoucher.discount_value || 0;
    }
    if (voucherDiscount > selectedSubtotal) voucherDiscount = selectedSubtotal;
  }

  const grandTotal = Math.max(0, selectedSubtotal - voucherDiscount);

  const handleProceedCheckout = () => {
    if (selectedItems.length === 0) {
      alert('Pilih minimal 1 produk untuk di-checkout.');
      return;
    }
    if (!user) {
      navigate('/login?redirect=/checkout');
      return;
    }
    navigate('/checkout');
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] dark:bg-[#0D0D0D] text-neutral-800 dark:text-neutral-100 flex flex-col font-sans">
      {/* Shopee Style Top Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-[#141414] border-b border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <span className="font-racing font-black text-xl sm:text-2xl tracking-wider text-[#EE4D2D]">
                JAWIR SPEEDSHOP
              </span>
            </Link>
            <div className="h-5 w-[1px] bg-neutral-300 dark:bg-neutral-700 hidden sm:block" />
            <h1 className="text-base sm:text-lg font-bold text-neutral-800 dark:text-white hidden sm:block">
              Keranjang Belanja
            </h1>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <Link
              to="/"
              className="flex items-center gap-1 text-[#EE4D2D] font-bold hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Lanjut Belanja</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-4 py-4 space-y-3.5 pb-24">
        {/* Shopee Free Shipping XTRA Banner */}
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-lg flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>
              <strong>Gratis Ongkir XTRA:</strong> Klaim voucher diskon toko untuk potongan pengiriman hingga Rp 20.000 ke seluruh Indonesia.
            </span>
          </div>
        </div>

        {/* Empty State */}
        {items.length === 0 ? (
          <div className="bg-white dark:bg-[#141414] rounded-lg border border-neutral-200 dark:border-neutral-800 py-16 px-4 text-center space-y-4 shadow-sm">
            <div className="w-20 h-20 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
              <ShoppingBag className="w-10 h-10 stroke-[1.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-1">
                Keranjang Belanja Anda Kosong
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto">
                Tidak ada produk di keranjang belanja. Yuk jelajahi katalog part racing pilihan kami!
              </p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2.5 rounded bg-[#EE4D2D] hover:bg-[#D73211] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              Mulai Belanja Sekarang
            </button>
          </div>
        ) : (
          <>
            {/* Table Header Card (Shopee Style) */}
            <div className="bg-white dark:bg-[#141414] rounded-lg border border-neutral-200 dark:border-neutral-800 p-3.5 shadow-sm hidden sm:flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
              <div className="flex items-center gap-3 w-5/12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 accent-[#EE4D2D] rounded cursor-pointer"
                />
                <span className="font-bold text-neutral-800 dark:text-white">Produk</span>
              </div>
              <div className="w-2/12 text-center">Harga Satuan</div>
              <div className="w-2/12 text-center">Kuantitas</div>
              <div className="w-2/12 text-right">Total Harga</div>
              <div className="w-1/12 text-right">Aksi</div>
            </div>

            {/* Store Products Section */}
            <div className="bg-white dark:bg-[#141414] rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
              {/* Store Name Header */}
              <div className="p-3.5 sm:p-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 accent-[#EE4D2D] rounded cursor-pointer"
                />
                <span className="bg-[#EE4D2D] text-white text-[9px] font-black px-1.5 py-0.2 rounded uppercase tracking-wider">
                  Mall
                </span>
                <Store className="w-4 h-4 text-[#EE4D2D]" />
                <span className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-white">
                  JAWIR RACING SPEEDSHOP OFFICIAL
                </span>
              </div>

              {/* Items List */}
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800/70 p-3 sm:p-4 space-y-4">
                {items.map((item, index) => {
                  const itemKey = getItemKey(item);
                  const isSelected = selectedIds.includes(itemKey);
                  return (
                    <div
                      key={`${itemKey}-${index}`}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 first:pt-0"
                    >
                      {/* Product Checkbox + Image + Title */}
                      <div className="flex items-center gap-3 sm:w-5/12">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectItem(itemKey)}
                          className="w-4 h-4 accent-[#EE4D2D] rounded cursor-pointer flex-shrink-0"
                        />
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 flex-shrink-0"
                        />
                        <div className="space-y-1 min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white line-clamp-2">
                            {item.product.name}
                          </h4>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-block text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-1.5 py-0.5 rounded">
                              Fitment: {item.product.fitmentTag || 'Universal'}
                            </span>
                            {item.selectedVariant && (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-red-500/10 dark:bg-red-950/70 border border-red-500/30 dark:border-red-800 text-[#EE4D2D] dark:text-red-300 px-2 py-0.5 rounded font-medium">
                                <span className="font-bold">Variasi:</span>
                                <span className="truncate max-w-[160px]">{item.selectedVariant}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Price Satuan */}
                      <div className="sm:w-2/12 text-left sm:text-center text-xs">
                        <span className="text-neutral-400 sm:hidden block text-[10px]">Harga:</span>
                        <span className="font-medium text-neutral-800 dark:text-neutral-200">
                          {formatIDR(item.customPrice ?? item.product.price)}
                        </span>
                        {item.product.originalPrice > (item.customPrice ?? item.product.price) && (
                          <span className="text-[10px] text-neutral-400 line-through block">
                            {formatIDR(item.product.originalPrice)}
                          </span>
                        )}
                      </div>

                      {/* Quantity Counter (Shopee Style: [-] [input] [+]) */}
                      <div className="sm:w-2/12 flex items-center sm:justify-center gap-1">
                        <span className="text-neutral-400 sm:hidden text-[10px] mr-2">Jumlah:</span>
                        <div className="flex items-center border border-neutral-300 dark:border-neutral-700 rounded overflow-hidden">
                          <button
                            onClick={() => updateQuantity(item.product.id, -1, item.selectedVariant)}
                            className="px-2 py-1 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                          >
                            <Minus className="w-3 h-3 text-neutral-600 dark:text-neutral-400" />
                          </button>
                          <span className="w-10 text-center text-xs font-bold text-neutral-900 dark:text-white">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.product.id, 1, item.selectedVariant)}
                            className="px-2 py-1 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3 text-neutral-600 dark:text-neutral-400" />
                          </button>
                        </div>
                      </div>

                      {/* Subtotal */}
                      <div className="sm:w-2/12 text-left sm:text-right text-xs">
                        <span className="text-neutral-400 sm:hidden block text-[10px]">Subtotal:</span>
                        <span className="font-bold text-[#EE4D2D] text-sm">
                          {formatIDR((item.customPrice ?? item.product.price) * item.quantity)}
                        </span>
                      </div>

                      {/* Delete */}
                      <div className="sm:w-1/12 text-right">
                        <button
                          onClick={() => removeItem(item.product.id, item.selectedVariant)}
                          className="p-1.5 text-neutral-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                          title="Hapus Produk"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Voucher Card */}
            <div className="bg-white dark:bg-[#141414] rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <Ticket className="w-5 h-5 text-[#EE4D2D]" />
                <div>
                  <span className="font-bold text-neutral-900 dark:text-white block text-sm">
                    Voucher Diskon Toko
                  </span>
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Gunakan voucher untuk potongan harga otomatis saat checkout
                  </span>
                </div>
              </div>

              {appliedVoucher ? (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded bg-[#EE4D2D]/10 text-[#EE4D2D] border border-[#EE4D2D]/30 font-bold text-xs flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    {appliedVoucher.code} (-{formatIDR(voucherDiscount)})
                  </span>
                  <button
                    onClick={() => setAppliedVoucher(null)}
                    className="text-xs text-neutral-400 hover:text-red-500 font-bold"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <span className="text-xs text-neutral-400">
                  Voucher dapat dipilih di halaman Checkout
                </span>
              )}
            </div>
          </>
        )}
      </main>

      {/* Shopee Bottom Sticky Checkout Bar */}
      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#141414] border-t border-neutral-200 dark:border-neutral-800 shadow-2xl">
          <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 accent-[#EE4D2D] rounded cursor-pointer"
                />
                <span className="font-medium text-neutral-700 dark:text-neutral-300">
                  Pilih Semua ({items.length})
                </span>
              </label>
              <button
                onClick={clearCart}
                className="text-neutral-400 hover:text-red-500 font-medium transition-colors"
              >
                Hapus Semua
              </button>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-5">
              <div className="text-right">
                <div className="flex items-baseline gap-1.5 justify-end">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    Total ({selectedItems.length} produk):
                  </span>
                  <span className="font-racing font-black text-lg sm:text-xl text-[#EE4D2D]">
                    {formatIDR(grandTotal)}
                  </span>
                </div>
                {voucherDiscount > 0 && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-medium">
                    Hemat {formatIDR(voucherDiscount)}
                  </span>
                )}
              </div>

              <button
                onClick={handleProceedCheckout}
                disabled={selectedItems.length === 0}
                className="py-3 px-8 rounded bg-[#EE4D2D] hover:bg-[#D73211] active:scale-95 text-white font-bold text-sm sm:text-base shadow-lg shadow-orange-950/20 cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <span>Checkout ({selectedItems.length})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
