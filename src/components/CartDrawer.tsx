import React, { useState } from 'react';
import { CartItem, Voucher } from '../types';
import { formatIDR } from './ProductCard';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, ShieldCheck, QrCode, Check, Ticket, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  vouchers: Voucher[];
  appliedVoucher: Voucher | null;
  onApplyVoucher: (voucher: Voucher | null) => void;
  onClearCart: () => void;
  onCheckoutSuccess?: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  vouchers,
  appliedVoucher,
  onApplyVoucher,
  onClearCart,
  onCheckoutSuccess,
}) => {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'qris' | 'bca' | 'gopay' | 'cod'>('qris');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [orderComplete, setOrderComplete] = useState(false);
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!isOpen) return null;

  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const discount = appliedVoucher ? appliedVoucher.discountAmount : 0;
  const shippingFee = subtotal > 150000 ? 0 : 15000;
  const total = Math.max(0, subtotal - discount + shippingFee);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    try {
      const checkoutItems = items.map(item => ({
        productId: item.product.id,
        quantity: item.quantity
      }));
      
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ items: checkoutItems })
      });
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Checkout failed');
      }
      
      setOrderComplete(true);
      if (onCheckoutSuccess) {
        onCheckoutSuccess();
      }
    } catch (err: any) {
      console.error(err);
      alert('Gagal memproses checkout: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetAfterOrder = () => {
    setOrderComplete(false);
    setIsCheckingOut(false);
    onClearCart();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
      />

      {/* Drawer Container */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#141414] border-l border-neutral-800 shadow-2xl flex flex-col justify-between">
          {/* Top Header */}
          <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#E50914]" />
              <h3 className="font-racing font-bold text-base uppercase tracking-wider text-white">
                Keranjang Belanja ({items.reduce((s, i) => s + i.quantity, 0)})
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
            {orderComplete ? (
              /* Order Success Screen */
              <div className="py-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mb-3">
                  <Check className="w-8 h-8 text-emerald-400 stroke-[3]" />
                </div>
                <h4 className="font-racing font-black text-xl text-white uppercase tracking-wide">
                  PESANAN BERHASIL DIBUAT!
                </h4>
                <p className="text-xs text-neutral-300 mt-1 max-w-xs">
                  Nomor Pesanan: <strong className="text-white font-mono">PLT-{(Date.now() % 1000000).toString().padStart(6, '0')}</strong>
                </p>

                {paymentMethod === 'qris' && (
                  <div className="my-4 p-4 rounded-xl bg-white text-black max-w-[220px]">
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-2 text-center text-neutral-600">
                      Scan QRIS Platinum Speedshop
                    </p>
                    <div className="w-40 h-40 mx-auto bg-neutral-100 border border-neutral-300 rounded flex items-center justify-center relative">
                      <QrCode className="w-32 h-32 text-neutral-900" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-[#E50914] text-white text-[8px] font-black px-1.5 py-0.5 rounded">
                          JAWIR
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] font-bold text-center mt-2 text-[#E50914]">
                      Total: {formatIDR(total)}
                    </p>
                  </div>
                )}

                <p className="text-[11px] text-neutral-400 max-w-xs">
                  Mekanik Jawir Garage akan segera mengonfirmasi pesanan dan nomor resi via WhatsApp ({customerPhone || '0812xxxx'}).
                </p>

                <div className="mt-6 flex flex-col gap-2 w-full">
                  <a
                    href={`https://wa.me/6281234567890?text=Halo%20Jawir%20Garage,%20saya%20sudah%20order%20part%20dengan%20total%20${encodeURIComponent(
                      formatIDR(total)
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <span>Konfirmasi ke WhatsApp Mekanik</span>
                  </a>

                  <button
                    onClick={handleResetAfterOrder}
                    className="w-full py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold"
                  >
                    Lanjut Belanja Part Lainnya
                  </button>
                </div>
              </div>
            ) : isCheckingOut ? (
              /* Checkout Form */
              <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                  <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                    Informasi Pengiriman
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCheckingOut(false)}
                    className="text-xs text-[#E50914] font-bold hover:underline"
                  >
                    ← Kembali ke Keranjang
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-[#E50914]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">
                    No. WhatsApp (Untuk Info Resi)
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="0812-xxxx-xxxx"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-[#E50914]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">
                    Alamat Pengiriman Lengkap
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Nama jalan, nomor rumah, RT/RW, kecamatan, kota, kode pos"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-[#E50914]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                    Pilih Metode Pembayaran
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'qris', label: 'QRIS Instant', desc: 'BCA, Mandiri, GoPay, ShopeePay' },
                      { id: 'bca', label: 'BCA Virtual Account', desc: 'Verifikasi Otomatis' },
                      { id: 'gopay', label: 'GoPay / OVO', desc: 'E-Wallet' },
                      { id: 'cod', label: 'COD (Bayar di Tempat)', desc: 'Khusus JABODETABEK' },
                    ].map((m) => (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => setPaymentMethod(m.id as any)}
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          paymentMethod === m.id
                            ? 'bg-neutral-800 border-[#E50914] text-white'
                            : 'bg-neutral-900/90 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        <div className="text-xs font-bold text-neutral-100">{m.label}</div>
                        <div className="text-[10px] text-neutral-500 mt-0.5">{m.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 text-xs space-y-1">
                  <div className="flex justify-between text-neutral-400">
                    <span>Subtotal Produk:</span>
                    <span className="text-neutral-200">{formatIDR(subtotal)}</span>
                  </div>
                  {appliedVoucher && (
                    <div className="flex justify-between text-emerald-400 font-medium">
                      <span>Voucher ({appliedVoucher.code}):</span>
                      <span>-{formatIDR(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-neutral-400">
                    <span>Ongkos Kirim:</span>
                    <span className="text-neutral-200">{shippingFee === 0 ? 'GRATIS' : formatIDR(shippingFee)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-white pt-1.5 border-t border-neutral-800">
                    <span>Total Pembayaran:</span>
                    <span className="text-[#E50914] font-racing text-base">{formatIDR(total)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-3 rounded-lg bg-[#E50914] hover:bg-red-700 active:scale-95 text-white font-bold text-sm shadow-lg shadow-red-950/40 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isProcessing ? 'Memproses...' : `Proses Bayar (${formatIDR(total)})`}</span>
                </button>
              </form>
            ) : items.length === 0 ? (
              /* Empty Cart State */
              <div className="py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto mb-3">
                  <ShoppingBag className="w-8 h-8 text-neutral-600" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">
                  Keranjangmu Masih Kosong
                </h4>
                <p className="text-xs text-neutral-400 max-w-xs mx-auto mb-4">
                  Yuk jelajahi part racing, CVT upgrade kit, atau pengereman buat motor kamu!
                </p>
                <button
                  onClick={onClose}
                  className="bg-[#E50914] hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-lg"
                >
                  Mulai Belanja Part
                </button>
              </div>
            ) : (
              /* Cart Items List */
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex gap-3 p-2.5 rounded-lg bg-neutral-900 border border-neutral-800"
                  >
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded object-cover flex-shrink-0 bg-black"
                    />

                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h5 className="text-xs font-bold text-neutral-100 line-clamp-1">
                          {item.product.name}
                        </h5>
                        <div className="text-[10px] text-neutral-400">
                          {item.product.fitmentTag}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs font-bold text-[#E50914] font-racing">
                          {formatIDR(item.product.price)}
                        </span>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center border border-neutral-700 rounded bg-black/50">
                            <button
                              onClick={() => onUpdateQuantity(item.product.id, -1)}
                              className="px-2 py-0.5 text-xs text-neutral-400 hover:text-white"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2 text-xs font-bold text-white min-w-[20px] text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => onUpdateQuantity(item.product.id, 1)}
                              className="px-2 py-0.5 text-xs text-neutral-400 hover:text-white"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <button
                            onClick={() => onRemoveItem(item.product.id)}
                            className="p-1 text-neutral-500 hover:text-red-400"
                            aria-label="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Voucher Application Box */}
                <div className="p-3 rounded-lg bg-neutral-900/80 border border-neutral-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                      <Ticket className="w-3.5 h-3.5 text-[#E50914]" />
                      Pakai Voucher Toko
                    </span>
                    {appliedVoucher && (
                      <button
                        onClick={() => onApplyVoucher(null)}
                        className="text-[10px] text-red-400 hover:underline"
                      >
                        Batal
                      </button>
                    )}
                  </div>

                  {vouchers.filter((v) => v.claimed).length === 0 ? (
                    <p className="text-[11px] text-neutral-500">
                      Kamu belum klaim voucher. Klaim voucher di beranda untuk diskon tambahan!
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {vouchers
                        .filter((v) => v.claimed)
                        .map((v) => {
                          const isEligible = subtotal >= v.minSpend;
                          const isSelected = appliedVoucher?.id === v.id;
                          return (
                            <button
                              key={v.id}
                              disabled={!isEligible}
                              onClick={() => onApplyVoucher(isSelected ? null : v)}
                              className={`w-full p-2 rounded text-left border flex items-center justify-between text-xs transition-all ${
                                !isEligible
                                  ? 'opacity-40 border-neutral-800 text-neutral-500'
                                  : isSelected
                                  ? 'bg-red-950/60 border-[#E50914] text-white'
                                  : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                              }`}
                            >
                              <div>
                                <span className="font-bold text-[11px]">{v.title}</span>
                                <span className="text-[10px] text-neutral-400 block">{v.subtitle}</span>
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-800">
                                {isSelected ? 'Dipakai ✓' : 'Pilih'}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Summary & Checkout Button (Only when not empty and not in order complete) */}
          {items.length > 0 && !orderComplete && !isCheckingOut && (
            <div className="p-4 border-t border-neutral-800 bg-[#121212]">
              <div className="space-y-1.5 text-xs text-neutral-400 mb-3">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="text-neutral-200">{formatIDR(subtotal)}</span>
                </div>
                {appliedVoucher && (
                  <div className="flex justify-between text-emerald-400">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Diskon Voucher:
                    </span>
                    <span>-{formatIDR(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Ongkir:</span>
                  <span className="text-neutral-200">{shippingFee === 0 ? 'GRATIS' : formatIDR(shippingFee)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-white pt-1.5 border-t border-neutral-800">
                  <span>Total Belanja:</span>
                  <span className="text-base font-racing text-[#E50914]">{formatIDR(total)}</span>
                </div>
              </div>

              <button
                id="cart-checkout-btn"
                onClick={() => {
                  if (!user) {
                    onClose();
                    navigate('/login', { state: { from: location } });
                  } else {
                    setIsCheckingOut(true);
                  }
                }}
                className="w-full py-3 rounded-lg bg-[#E50914] hover:bg-red-700 active:scale-95 text-white font-bold text-sm shadow-lg shadow-red-950/40 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span>Checkout Sekarang ({formatIDR(total)})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
