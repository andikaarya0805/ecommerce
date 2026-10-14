import React, { useState, useEffect } from 'react';
import { CartItem, Voucher } from '../types';
import { formatIDR } from './ProductCard';
import {
  X,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Ticket,
  Sparkles,
  Truck,
  MapPin,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { INDONESIA_DESTINATIONS } from '../data/destinations';
import { safeFetchJson } from '../config/api';

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Customer Form
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [customerName, setCustomerName] = useState(user?.username || '');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'qris' | 'bca' | 'gopay' | 'cod'>('qris');

  useEffect(() => {
    if (user?.username) {
      setCustomerName(user.username);
    }
  }, [user]);

  // Shipping & Logistics State (Fallback-enabled)
  const [destinations, setDestinations] = useState<any[]>(INDONESIA_DESTINATIONS);
  const [selectedProvince, setSelectedProvince] = useState('DKI Jakarta');
  const [selectedCity, setSelectedCity] = useState('Jakarta Timur');
  const [selectedDistrict, setSelectedDistrict] = useState('Cakung');
  const [availableCouriers, setAvailableCouriers] = useState<any[]>([
    { courierName: 'JNE', courierService: 'REG (Reguler)', etd: '1-2 Hari', cost: 9000 },
    { courierName: 'SiCepat', courierService: 'GOKIL (Hemat)', etd: '2-3 Hari', cost: 8000 },
  ]);
  const [selectedCourier, setSelectedCourier] = useState<any | null>({
    courierName: 'JNE',
    courierService: 'REG (Reguler)',
    etd: '1-2 Hari',
    cost: 9000,
  });
  const [isLoadingShipping, setIsLoadingShipping] = useState(false);

  // Fetch Shipping destinations
  useEffect(() => {
    safeFetchJson<any[]>('/api/shipping/destinations')
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setDestinations(data);
          const defaultProv = data.find((d) => d.province === selectedProvince) || data[0];
          setSelectedProvince(defaultProv.province);
          if (defaultProv.cities?.length > 0) {
            setSelectedCity(defaultProv.cities[0].name);
            if (defaultProv.cities[0].districts?.length > 0) {
              setSelectedDistrict(defaultProv.cities[0].districts[0]);
            }
          }
        }
      })
      .catch((err) => {
        console.warn('CartDrawer: Menggunakan data destinasi offline:', err.message);
      });
  }, []);

  // Total weight
  const totalWeightGrams = items.reduce(
    (sum, item) => sum + (item.product.weight_grams || 500) * item.quantity,
    0
  );

  // Recalculate shipping options when destination or weight changes
  useEffect(() => {
    if (!selectedProvince || !selectedCity) return;
    setIsLoadingShipping(true);

    safeFetchJson<any>('/api/shipping/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        province: selectedProvince,
        city: selectedCity,
        district: selectedDistrict,
        weightGrams: totalWeightGrams,
      }),
    })
      .then((data) => {
        if (data.services && data.services.length > 0) {
          setAvailableCouriers(data.services);
          setSelectedCourier(data.services[0]);
        }
      })
      .catch((err) => {
        console.warn('CartDrawer kalkulasi ongkir offline:', err.message);
        const provData = destinations.find((d) => d.province === selectedProvince);
        const cityData = provData?.cities?.find((c: any) => c.name === selectedCity);
        const base = cityData?.baseRate || 10000;
        const weightKg = Math.ceil(Math.max(500, totalWeightGrams) / 1000);
        const fallback = [
          { courierName: 'JNE', courierService: 'REG (Reguler)', etd: '1-2 Hari', cost: base * weightKg },
          { courierName: 'SiCepat', courierService: 'GOKIL (Hemat)', etd: '2-3 Hari', cost: Math.max(8000, (base - 1000) * weightKg) },
        ];
        setAvailableCouriers(fallback);
        setSelectedCourier(fallback[0]);
      })
      .finally(() => setIsLoadingShipping(false));
  }, [selectedProvince, selectedCity, selectedDistrict, totalWeightGrams, destinations]);

  if (!isOpen) return null;

  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  let discount = 0;
  if (appliedVoucher) {
    if (appliedVoucher.discount_type === 'PERCENT' && appliedVoucher.discount_value) {
      discount = Math.floor((subtotal * appliedVoucher.discount_value) / 100);
      if (appliedVoucher.max_discount_amount && discount > appliedVoucher.max_discount_amount) {
        discount = appliedVoucher.max_discount_amount;
      }
    } else {
      discount = appliedVoucher.discountAmount || appliedVoucher.discount_value || 0;
    }
  }

  const shippingCost = selectedCourier ? selectedCourier.cost : 12000;
  const grandTotal = Math.max(0, subtotal - discount + shippingCost);

  // Available cities for selected province
  const currentProvinceData = destinations.find((d) => d.province === selectedProvince);
  const currentCities = currentProvinceData?.cities || [];
  const currentCityData = currentCities.find((c: any) => c.name === selectedCity);
  const currentDistricts = currentCityData?.districts || [];

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return; // Prevent double click

    setErrorMessage(null);

    if (!user) {
      setErrorMessage('Silakan login terlebih dahulu untuk checkout.');
      return;
    }

    setIsProcessing(true);

    try {
      const checkoutItems = items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      }));

      const payload = {
        items: checkoutItems,
        voucherCode: appliedVoucher?.code || null,
        customer: {
          name: customerName.trim(),
          phone: customerPhone.trim(),
          email: customerEmail.trim() || undefined,
        },
        shipping: {
          province: selectedProvince,
          city: selectedCity,
          district: selectedDistrict,
          address: customerAddress.trim(),
          courierName: selectedCourier?.courierName || 'JNE Express',
          courierService: selectedCourier?.courierService || 'REG',
          shippingCost,
        },
        paymentMethod,
      };

      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const resData = await safeFetchJson<any>('/api/checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      onClearCart();
      if (onCheckoutSuccess) onCheckoutSuccess();
      onClose();

      // Redirect directly to the generated invoice page!
      navigate(`/orders/${resData.invoiceNumber}`);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Gagal memproses pesanan.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
      />

      {/* Drawer Container */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div className="w-screen max-w-md bg-[#141414] border-l border-neutral-800 shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#E50914]" />
              <h3 className="font-racing font-bold text-base uppercase tracking-wider text-white">
                {isCheckingOut ? 'Pengiriman & Pembayaran' : `Keranjang Belanja (${items.reduce((s, i) => s + i.quantity, 0)})`}
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
            {isCheckingOut ? (
              !user ? (
                <div className="py-12 px-4 text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                    <AlertCircle className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white mb-1">Login Diperlukan</h4>
                    <p className="text-xs text-neutral-400 max-w-xs mx-auto leading-relaxed">
                      Mode guest tidak dapat melakukan checkout. Silakan login terlebih dahulu untuk melanjutkan ke pembayaran dan mengamankan stok pesanan Anda.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      onClick={() => {
                        onClose();
                        navigate('/login');
                      }}
                      className="w-full py-2.5 rounded-lg bg-[#E50914] hover:bg-red-700 text-white font-bold text-xs shadow-lg shadow-red-950/40 cursor-pointer transition-all"
                    >
                      Login Sekarang
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCheckingOut(false)}
                      className="w-full py-2 text-xs text-neutral-400 hover:text-white"
                    >
                      ← Kembali ke Keranjang
                    </button>
                  </div>
                </div>
              ) : (
                /* Checkout Form (Authenticated) */
                <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                    <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                      Akun: <span className="text-white font-semibold">{user.username}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCheckingOut(false)}
                      className="text-xs text-[#E50914] font-bold hover:underline"
                    >
                      ← Kembali ke Keranjang
                    </button>
                  </div>

                {errorMessage && (
                  <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Recipient Details */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-300 mb-1">
                      Nama Penerima <span className="text-[#E50914]">*</span>
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

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-300 mb-1">
                        No. WhatsApp <span className="text-[#E50914]">*</span>
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
                      <label className="block text-[11px] font-bold text-neutral-300 mb-1">
                        Email (Opsional)
                      </label>
                      <input
                        type="email"
                        placeholder="budi@example.com"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-[#E50914]"
                      />
                    </div>
                  </div>
                </div>

                {/* Destination Dropdowns */}
                <div className="p-3 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-[#E50914]" />
                      Tujuan & Kalkulasi Ongkir
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      Total Berat: <strong>{(totalWeightGrams / 1000).toFixed(1)} Kg</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] text-neutral-400 mb-0.5">Provinsi</label>
                      <select
                        value={selectedProvince}
                        onChange={(e) => {
                          const prov = e.target.value;
                          setSelectedProvince(prov);
                          const pData = destinations.find((d) => d.province === prov);
                          if (pData?.cities?.length > 0) {
                            setSelectedCity(pData.cities[0].name);
                            setSelectedDistrict(pData.cities[0].districts[0] || '');
                          }
                        }}
                        className="w-full px-2 py-1.5 rounded bg-black border border-neutral-700 text-white focus:outline-none focus:border-[#E50914]"
                      >
                        {destinations.map((d) => (
                          <option key={d.province} value={d.province}>
                            {d.province}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-neutral-400 mb-0.5">Kota / Kab</label>
                      <select
                        value={selectedCity}
                        onChange={(e) => {
                          const c = e.target.value;
                          setSelectedCity(c);
                          const cData = currentCities.find((item: any) => item.name === c);
                          if (cData?.districts?.length > 0) {
                            setSelectedDistrict(cData.districts[0]);
                          }
                        }}
                        className="w-full px-2 py-1.5 rounded bg-black border border-neutral-700 text-white focus:outline-none focus:border-[#E50914]"
                      >
                        {currentCities.map((c: any) => (
                          <option key={c.name} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-0.5">Kecamatan</label>
                    <select
                      value={selectedDistrict}
                      onChange={(e) => setSelectedDistrict(e.target.value)}
                      className="w-full px-2 py-1.5 rounded bg-black border border-neutral-700 text-white focus:outline-none focus:border-[#E50914]"
                    >
                      {currentDistricts.map((dist: string) => (
                        <option key={dist} value={dist}>
                          {dist}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Courier Selection */}
                  <div className="pt-2">
                    <label className="block text-[10px] font-bold text-neutral-300 mb-1">
                      Pilihan Layanan Ekspedisi
                    </label>

                    {isLoadingShipping ? (
                      <div className="p-3 text-center text-xs text-neutral-500 flex items-center justify-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Menghitung ongkir...</span>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {availableCouriers.map((c, idx) => {
                          const isSelected =
                            selectedCourier?.courierName === c.courierName &&
                            selectedCourier?.courierService === c.courierService;
                          return (
                            <button
                              type="button"
                              key={idx}
                              onClick={() => setSelectedCourier(c)}
                              className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between text-xs transition-all ${
                                isSelected
                                  ? 'bg-neutral-800 border-[#E50914] text-white'
                                  : 'bg-black/60 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                              }`}
                            >
                              <div>
                                <span className="font-bold text-white block">
                                  {c.courierName} ({c.courierService})
                                </span>
                                <span className="text-[10px] text-neutral-400">
                                  Estimasi: {c.etd}
                                </span>
                              </div>
                              <span className="font-racing font-bold text-[#E50914]">
                                {formatIDR(c.cost)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-300 mb-1">
                      Alamat Jalan & Nomor Rumah <span className="text-[#E50914]">*</span>
                    </label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Nama jalan, gang, nomor rumah, RT/RW, patokan..."
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-black border border-neutral-700 text-xs text-white focus:outline-none focus:border-[#E50914]"
                    />
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                    Metode Pembayaran
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'qris', label: 'QRIS Instant', desc: 'BCA, Mandiri, GoPay, ShopeePay' },
                      { id: 'bca', label: 'BCA Virtual Account', desc: 'Verifikasi Otomatis' },
                      { id: 'gopay', label: 'GoPay / OVO', desc: 'E-Wallet' },
                      { id: 'cod', label: 'COD (Bayar di Tempat)', desc: 'Jabodetabek Saja' },
                    ].map((m) => (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => setPaymentMethod(m.id as any)}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          paymentMethod === m.id
                            ? 'bg-neutral-800 border-[#E50914] text-white'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        <div className="text-xs font-bold text-neutral-100">{m.label}</div>
                        <div className="text-[10px] text-neutral-500 mt-0.5">{m.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Final Breakdown */}
                <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 text-xs space-y-1">
                  <div className="flex justify-between text-neutral-400">
                    <span>Subtotal Barang:</span>
                    <span className="text-neutral-200">{formatIDR(subtotal)}</span>
                  </div>
                  {appliedVoucher && (
                    <div className="flex justify-between text-emerald-400 font-medium">
                      <span>Voucher ({appliedVoucher.code}):</span>
                      <span>-{formatIDR(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-neutral-400">
                    <span>Ongkir ({selectedCourier?.courierName || 'Ekspedisi'}):</span>
                    <span className="text-neutral-200">{formatIDR(shippingCost)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-white pt-1.5 border-t border-neutral-800">
                    <span>Total Pembayaran:</span>
                    <span className="text-[#E50914] font-racing text-base">{formatIDR(grandTotal)}</span>
                  </div>
                </div>

                {/* Submit Checkout Button */}
                <button
                  id="checkout-submit-btn"
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-3 rounded-lg bg-[#E50914] hover:bg-red-700 active:scale-95 text-white font-bold text-sm shadow-lg shadow-red-950/40 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Memproses Pesanan & Kunci Stok...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Bayar Sekarang ({formatIDR(grandTotal)})</span>
                    </>
                  )}
                </button>
              </form>
            )) : items.length === 0 ? (
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
                  className="bg-[#E50914] hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-lg cursor-pointer"
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
                            className="p-1 text-neutral-500 hover:text-red-400 cursor-pointer"
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

          {/* Bottom Summary & Checkout Button */}
          {items.length > 0 && !isCheckingOut && (
            <div className="p-4 border-t border-neutral-800 bg-[#121212]">
              {!user && (
                <div className="mb-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-bold block text-amber-200">Wajib Login untuk Checkout</span>
                    <span className="text-[11px] text-neutral-300 leading-snug block">
                      Anda harus login ke akun Anda terlebih dahulu sebelum dapat melanjutkan checkout.
                    </span>
                  </div>
                </div>
              )}

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
                  <span>Estimasi Ongkir:</span>
                  <span className="text-neutral-200">{formatIDR(shippingCost)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-white pt-1.5 border-t border-neutral-800">
                  <span>Total Sementara:</span>
                  <span className="text-base font-racing text-[#E50914]">{formatIDR(grandTotal)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  id="view-full-cart-btn"
                  onClick={() => {
                    onClose();
                    navigate('/cart');
                  }}
                  className="w-full py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all border border-neutral-700"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-[#EE4D2D]" />
                  <span>Buka Keranjang Shopee (Lihat Semua)</span>
                </button>

                {user ? (
                  <button
                    id="cart-checkout-btn"
                    onClick={() => {
                      onClose();
                      navigate('/checkout');
                    }}
                    className="w-full py-3 rounded-lg bg-[#EE4D2D] hover:bg-[#d73211] active:scale-95 text-white font-bold text-sm shadow-md shadow-orange-950/40 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <span>Lanjut Checkout ({formatIDR(grandTotal)})</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    id="cart-login-checkout-btn"
                    onClick={() => {
                      onClose();
                      navigate('/login?redirect=/checkout');
                    }}
                    className="w-full py-3 rounded-lg bg-[#EE4D2D] hover:bg-[#d73211] active:scale-95 text-white font-bold text-sm shadow-md shadow-orange-950/40 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <span>Login untuk Checkout ({formatIDR(grandTotal)})</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
