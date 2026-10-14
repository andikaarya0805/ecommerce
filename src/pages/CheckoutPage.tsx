import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatIDR } from '../components/ProductCard';
import {
  MapPin,
  ShoppingBag,
  Truck,
  Ticket,
  ShieldCheck,
  CreditCard,
  QrCode,
  Building2,
  Wallet,
  Coins,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  HelpCircle,
  Store,
  Sparkles,
} from 'lucide-react';

import { INDONESIA_DESTINATIONS } from '../data/destinations';
import { getApiUrl, safeFetchJson } from '../config/api';

interface CourierOption {
  courierName: string;
  courierService: string;
  courierCode?: string;
  etd: string;
  cost: number;
}

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { items, appliedVoucher, setAppliedVoucher, clearCart } = useCart();

  // If not logged in, prompt login
  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=/checkout');
    }
  }, [user, navigate]);

  // Customer & Shipping State
  const [customerName, setCustomerName] = useState(user?.username || '');
  const [customerPhone, setCustomerPhone] = useState('081298765432');
  const [customerEmail, setCustomerEmail] = useState(user?.username ? `${user.username}@gmail.com` : '');
  const [customerAddress, setCustomerAddress] = useState('Jl. Raya Bekasi KM 21, Ruko Otomotif No. 8, RT 03/RW 04, Cakung Barat');
  const [orderNote, setOrderNote] = useState('');
  const [isEditingAddress, setIsEditingAddress] = useState(false);

  // Destinations & Logistics (Initialized with fallback data so dropdown is never empty)
  const [destinations, setDestinations] = useState<any[]>(INDONESIA_DESTINATIONS);
  const [selectedProvince, setSelectedProvince] = useState('DKI Jakarta');
  const [selectedCity, setSelectedCity] = useState('Jakarta Timur');
  const [selectedDistrict, setSelectedDistrict] = useState('Cakung');
  const [availableCouriers, setAvailableCouriers] = useState<CourierOption[]>([
    { courierName: 'JNE', courierService: 'REG (Reguler)', etd: '1-2 Hari', cost: 9000 },
    { courierName: 'SiCepat', courierService: 'GOKIL (Hemat)', etd: '2-3 Hari', cost: 8000 },
    { courierName: 'J&T', courierService: 'EZ (Express)', etd: '1-2 Hari', cost: 10000 },
  ]);
  const [selectedCourier, setSelectedCourier] = useState<CourierOption | null>({
    courierName: 'JNE',
    courierService: 'REG (Reguler)',
    etd: '1-2 Hari',
    cost: 9000,
  });
  const [isLoadingShipping, setIsLoadingShipping] = useState(false);

  // Payment Method Selection (Shopee Style)
  // Options: bca_va | mandiri_va | bni_va | bri_va | permata_va | qris | gopay | shopeepay | credit_card | cod
  const [selectedPayment, setSelectedPayment] = useState<string>('qris');

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Voucher input state
  const [voucherInput, setVoucherInput] = useState('');
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);

  // Load Midtrans Snap.js script dynamically
  useEffect(() => {
    safeFetchJson<any>('/api/payment/config')
      .then((cfg) => {
        if (cfg?.midtransClientKey) {
          const scriptId = 'midtrans-snap-script';
          if (!document.getElementById(scriptId)) {
            const script = document.createElement('script');
            script.id = scriptId;
            script.src = cfg.isProduction
              ? 'https://app.midtrans.com/snap/snap.js'
              : 'https://app.sandbox.midtrans.com/snap/snap.js';
            script.setAttribute('data-client-key', cfg.midtransClientKey);
            document.body.appendChild(script);
          }
        }
      })
      .catch((e) => console.log('Payment config load notice:', e.message));
  }, []);

  // Fetch Shipping destinations (updates dynamically if backend is available)
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
        console.warn('Menggunakan data destinasi offline:', err.message);
      });
  }, []);

  const totalWeightGrams = items.reduce(
    (sum, item) => sum + (item.product.weight_grams || 500) * item.quantity,
    0
  );

  // Fetch available couriers whenever province or city changes
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
        weightGrams: Math.max(500, totalWeightGrams),
      }),
    })
      .then((data) => {
        setIsLoadingShipping(false);
        if (data.services && data.services.length > 0) {
          setAvailableCouriers(data.services);
          setSelectedCourier(data.services[0]);
        }
      })
      .catch((err) => {
        console.warn('Kalkulasi ongkir offline:', err.message);
        setIsLoadingShipping(false);
        // Fallback calculation using destination base rate
        const provData = destinations.find((d) => d.province === selectedProvince);
        const cityData = provData?.cities?.find((c: any) => c.name === selectedCity);
        const base = cityData?.baseRate || 10000;
        const weightKg = Math.ceil(Math.max(500, totalWeightGrams) / 1000);
        const fallbackServices: CourierOption[] = [
          { courierName: 'JNE', courierService: 'REG (Reguler)', etd: '1-2 Hari', cost: base * weightKg },
          { courierName: 'SiCepat', courierService: 'GOKIL (Hemat)', etd: '2-3 Hari', cost: Math.max(8000, (base - 1000) * weightKg) },
          { courierName: 'J&T', courierService: 'EZ (Express)', etd: '1-2 Hari', cost: (base + 1000) * weightKg },
        ];
        setAvailableCouriers(fallbackServices);
        setSelectedCourier(fallbackServices[0]);
      });
  }, [selectedProvince, selectedCity, selectedDistrict, totalWeightGrams, destinations]);

  // Subtotal, Discount & Grand Total Calculations
  const subtotal = items.reduce((s, i) => s + i.product.price * i.quantity, 0);

  let discountAmount = 0;
  if (appliedVoucher) {
    if (appliedVoucher.discount_type === 'PERCENT') {
      const val = appliedVoucher.discount_value || 0;
      discountAmount = Math.floor((subtotal * val) / 100);
      if (appliedVoucher.max_discount_amount && discountAmount > appliedVoucher.max_discount_amount) {
        discountAmount = appliedVoucher.max_discount_amount;
      }
    } else {
      discountAmount = appliedVoucher.discountAmount || appliedVoucher.discount_value || 0;
    }
  }

  const shippingCost = selectedCourier ? selectedCourier.cost : 12000;
  const grandTotal = Math.max(0, subtotal - discountAmount + shippingCost);

  // Apply voucher by code
  const handleApplyVoucherCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherInput.trim()) return;

    setIsValidatingVoucher(true);
    setVoucherError(null);

    try {
      const data = await safeFetchJson<any>('/api/voucher/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: voucherInput.trim(), subtotal }),
      });
      setAppliedVoucher(data.voucher);
      setVoucherInput('');
    } catch (err: any) {
      setVoucherError(err.message || 'Gagal menggunakan voucher');
    } finally {
      setIsValidatingVoucher(false);
    }
  };

  // Shopee Payment Options List
  const paymentMethodsList = [
    {
      id: 'qris',
      category: 'QRIS & E-Wallet Instant',
      name: 'QRIS Instant (BCA Mobile, ShopeePay, GoPay, OVO, Dana)',
      desc: 'Bebas biaya penanganan. Scan langsung terverifikasi otomatis.',
      icon: <QrCode className="w-5 h-5 text-emerald-500" />,
      badge: 'Paling Populer',
      isCod: false,
    },
    {
      id: 'bca_va',
      category: 'Transfer Bank (Virtual Account)',
      name: 'BCA Virtual Account',
      desc: 'Bayar via BCA Mobile, KlikBCA, atau ATM BCA 24 jam.',
      icon: <Building2 className="w-5 h-5 text-blue-500" />,
      badge: 'Dicek Otomatis',
      isCod: false,
    },
    {
      id: 'mandiri_va',
      category: 'Transfer Bank (Virtual Account)',
      name: 'Mandiri Virtual Account (Livin\' by Mandiri)',
      desc: 'Bayar via Livin\' by Mandiri atau ATM Mandiri dengan mudah.',
      icon: <Building2 className="w-5 h-5 text-amber-500" />,
      badge: 'Dicek Otomatis',
      isCod: false,
    },
    {
      id: 'bni_va',
      category: 'Transfer Bank (Virtual Account)',
      name: 'BNI Virtual Account',
      desc: 'Bayar via BNI Mobile Banking, Internet Banking, atau ATM BNI.',
      icon: <Building2 className="w-5 h-5 text-orange-500" />,
      badge: 'Dicek Otomatis',
      isCod: false,
    },
    {
      id: 'bri_va',
      category: 'Transfer Bank (Virtual Account)',
      name: 'BRI Virtual Account (BRIMO)',
      desc: 'Bayar via aplikasi BRImo atau ATM Bank BRI.',
      icon: <Building2 className="w-5 h-5 text-blue-600" />,
      badge: 'Dicek Otomatis',
      isCod: false,
    },
    {
      id: 'permata_va',
      category: 'Transfer Bank (Virtual Account)',
      name: 'Permata Virtual Account',
      desc: 'Bayar via PermataMobile X atau ATM Permata/Bank Lain.',
      icon: <Building2 className="w-5 h-5 text-teal-500" />,
      badge: 'Dicek Otomatis',
      isCod: false,
    },
    {
      id: 'gopay',
      category: 'E-Wallet',
      name: 'GoPay / GoPay Later',
      desc: 'Buka aplikasi Gojek atau scan kode GoPay.',
      icon: <Wallet className="w-5 h-5 text-sky-500" />,
      badge: 'Cashback Ready',
      isCod: false,
    },
    {
      id: 'credit_card',
      category: 'Kartu Kredit / Debit',
      name: 'Kartu Kredit / Debit Online (Visa, Mastercard, JCB)',
      desc: 'Pembayaran aman berstandar 3D-Secure langsung lewat Midtrans.',
      icon: <CreditCard className="w-5 h-5 text-purple-500" />,
      badge: '3D Secure',
      isCod: false,
    },
    {
      id: 'cod',
      category: 'Bayar di Tempat',
      name: 'COD (Bayar di Tempat)',
      desc: 'Bayar tunai ke kurir saat paket pesanan tiba di alamat Anda.',
      icon: <Coins className="w-5 h-5 text-amber-400" />,
      badge: 'Bebas Admin',
      isCod: true,
    },
  ];

  // Submit Order Handle (Direct Midtrans Redirect / Snap Popup or COD)
  const handlePlaceOrder = async () => {
    if (isSubmitting) return;
    if (items.length === 0) {
      alert('Keranjang belanja kosong');
      navigate('/');
      return;
    }

    if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
      setErrorMessage('Harap lengkapi nama penerima, nomor WhatsApp, dan alamat jalan.');
      setIsEditingAddress(true);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        items: items.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
        })),
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
          address: `${customerAddress.trim()}${orderNote ? ` (Catatan: ${orderNote})` : ''}`,
          courierName: selectedCourier?.courierName || 'JNE Express',
          courierService: selectedCourier?.courierService || 'REG',
          shippingCost,
        },
        paymentMethod: selectedPayment,
      };

      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const data = await safeFetchJson<any>('/api/checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      // Order created successfully! Clear Cart.
      clearCart();

      const invoiceNumber = data.invoiceNumber;
      const snapToken = data.snapToken;
      const paymentUrl = data.paymentUrl;
      const isCod = selectedPayment === 'cod';

      // =================================================================
      // MIDTRANS DIRECT REDIRECT / SNAP POPUP HANDLING (KECUALI COD)
      // =================================================================
      if (!isCod && snapToken && (window as any).snap) {
        // Direct Snap popup pre-locked to the chosen payment method!
        (window as any).snap.pay(snapToken, {
          onSuccess: (result: any) => {
            console.log('[Snap Success]', result);
            navigate(`/orders/${invoiceNumber}`);
          },
          onPending: (result: any) => {
            console.log('[Snap Pending]', result);
            navigate(`/orders/${invoiceNumber}`);
          },
          onError: (err: any) => {
            console.error('[Snap Error]', err);
            navigate(`/orders/${invoiceNumber}`);
          },
          onClose: () => {
            navigate(`/orders/${invoiceNumber}`);
          },
        });
      } else if (!isCod && paymentUrl) {
        // Fallback: direct redirect to Midtrans hosted payment page
        window.location.href = paymentUrl;
      } else {
        // COD or Direct navigation to Invoice Page
        navigate(`/orders/${invoiceNumber}`);
      }
    } catch (err: any) {
      console.error('[Checkout Error]', err);
      setErrorMessage(err.message || 'Terjadi kesalahan saat memproses pesanan.');
      setIsSubmitting(false);
    }
  };

  const currentProvinceData = destinations.find((d) => d.province === selectedProvince);
  const currentCities = currentProvinceData?.cities || [];
  const currentCityData = currentCities.find((c: any) => c.name === selectedCity);
  const currentDistricts = currentCityData?.districts || [];

  return (
    <div className="min-h-screen bg-[#F5F5F5] dark:bg-[#0D0D0D] text-neutral-800 dark:text-neutral-100 flex flex-col font-sans">
      {/* Shopee-style Header */}
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
              Checkout Pesanan
            </h1>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="hidden md:flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
              <ShieldCheck className="w-4 h-4 text-[#EE4D2D]" />
              <span>100% Produk Original & Terverifikasi</span>
            </div>
            <Link
              to="/"
              className="flex items-center gap-1 text-[#EE4D2D] font-bold hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali Belanja</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2.5 shadow-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {/* 1. Shopee Iconic Envelope Delivery Address Card */}
        <div className="bg-white dark:bg-[#141414] rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          {/* Top Airmail Colored Stripe (Shopee signature) */}
          <div className="h-1.5 w-full bg-[repeating-linear-gradient(45deg,#EE4D2D_0,#EE4D2D_32px,#FFFFFF_32px,#FFFFFF_44px,#005BAA_44px,#005BAA_76px,#FFFFFF_76px,#FFFFFF_88px)]" />

          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800/80">
              <div className="flex items-center gap-2 text-[#EE4D2D] font-bold text-sm sm:text-base">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span>Alamat Pengiriman</span>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingAddress(!isEditingAddress)}
                className="text-xs text-[#EE4D2D] font-bold hover:underline cursor-pointer"
              >
                {isEditingAddress ? 'Tutup Formulir Alamat' : 'Ubah Alamat'}
              </button>
            </div>

            {/* Address Display / Inline Editor */}
            {isEditingAddress ? (
              <div className="pt-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-300 mb-1">
                      Nama Lengkap Penerima <span className="text-[#EE4D2D]">*</span>
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Contoh: Budi Santoso"
                      className="w-full px-3 py-2 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-[#EE4D2D]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-300 mb-1">
                      No. WhatsApp / Telepon <span className="text-[#EE4D2D]">*</span>
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="0812-xxxx-xxxx"
                      className="w-full px-3 py-2 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-[#EE4D2D]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                      Provinsi
                    </label>
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
                      className="w-full px-2.5 py-2 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-[#EE4D2D]"
                    >
                      {destinations.map((d) => (
                        <option key={d.province} value={d.province}>
                          {d.province}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                      Kota / Kabupaten
                    </label>
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
                      className="w-full px-2.5 py-2 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-[#EE4D2D]"
                    >
                      {currentCities.map((c: any) => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                      Kecamatan
                    </label>
                    <select
                      value={selectedDistrict}
                      onChange={(e) => setSelectedDistrict(e.target.value)}
                      className="w-full px-2.5 py-2 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-[#EE4D2D]"
                    >
                      {currentDistricts.map((dist: string) => (
                        <option key={dist} value={dist}>
                          {dist}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-300 mb-1">
                    Alamat Lengkap & Patokan Rumah <span className="text-[#EE4D2D]">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="Nama jalan, RT/RW, nomor rumah, blok, patokan spesifik..."
                    className="w-full px-3 py-2 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-[#EE4D2D]"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingAddress(false)}
                    className="px-4 py-1.5 rounded bg-[#EE4D2D] text-white font-bold text-xs hover:bg-[#D73211]"
                  >
                    Simpan & Pakai Alamat Ini
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-neutral-900 dark:text-white text-sm">
                      {customerName || 'Belum diisi'}
                    </span>
                    <span className="text-neutral-500 dark:text-neutral-400">
                      ({customerPhone || '-'})
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#EE4D2D]/10 text-[#EE4D2D] border border-[#EE4D2D]/30">
                      Utama
                    </span>
                  </div>
                  <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-2xl">
                    {customerAddress}, Kec. {selectedDistrict}, {selectedCity}, {selectedProvince}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. Shopee Products Ordered Section */}
        <div className="bg-white dark:bg-[#141414] rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          {/* Store Name Header */}
          <div className="p-4 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="bg-[#EE4D2D] text-white text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                Mall
              </span>
              <Store className="w-4 h-4 text-[#EE4D2D]" />
              <span className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-white">
                JAWIR RACING SPEEDSHOP OFFICIAL STORE
              </span>
            </div>
            <span className="text-[11px] text-neutral-400 hidden sm:inline">
              Pengiriman dari Jakarta Timur (Origin Biteship)
            </span>
          </div>

          {/* Product Items Table */}
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60 p-4 space-y-4">
            {items.map((item) => (
              <div
                key={item.product.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 first:pt-0"
              >
                <div className="flex items-center gap-3 flex-1">
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-16 h-16 sm:w-18 sm:h-18 object-cover rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 flex-shrink-0"
                  />
                  <div className="space-y-1">
                    <h4 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white line-clamp-2">
                      {item.product.name}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-neutral-500 dark:text-neutral-400">
                      <span className="bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded font-mono">
                        {item.product.category}
                      </span>
                      <span>Fitment: {item.product.fitmentTag || 'Universal'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 text-xs pl-19 sm:pl-0">
                  <div className="text-right">
                    <span className="text-neutral-500 dark:text-neutral-400 block text-[11px]">
                      Harga Satuan
                    </span>
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">
                      {formatIDR(item.product.price)}
                    </span>
                  </div>

                  <div className="text-center">
                    <span className="text-neutral-500 dark:text-neutral-400 block text-[11px]">
                      Jumlah
                    </span>
                    <span className="font-bold text-neutral-900 dark:text-white">
                      x{item.quantity}
                    </span>
                  </div>

                  <div className="text-right min-w-[90px]">
                    <span className="text-neutral-500 dark:text-neutral-400 block text-[11px]">
                      Subtotal
                    </span>
                    <span className="font-bold text-[#EE4D2D]">
                      {formatIDR(item.product.price * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 3. Opsi Pengiriman & Pesan Penjual (Shopee Style footer in product card) */}
          <div className="bg-neutral-50 dark:bg-neutral-900/60 p-4 border-t border-neutral-200 dark:border-neutral-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Note to Seller */}
            <div className="flex items-center gap-2">
              <span className="text-neutral-600 dark:text-neutral-400 whitespace-nowrap font-medium text-xs">
                Pesan untuk Penjual:
              </span>
              <input
                type="text"
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                placeholder="Tinggalkan pesan (misal: minta stiker, bubble wrap ekstra)"
                className="flex-1 px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-[#EE4D2D]"
              />
            </div>

            {/* Courier Selection */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t md:border-t-0 pt-2 md:pt-0">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <div>
                  <span className="font-bold text-neutral-800 dark:text-white block">
                    Opsi Pengiriman: {selectedCourier?.courierName || 'JNE'} ({selectedCourier?.courierService || 'REG'})
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">
                    Garansi Tiba: {selectedCourier?.etd || '2 - 3 Hari'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={selectedCourier ? `${selectedCourier.courierName}-${selectedCourier.courierService}` : ''}
                  onChange={(e) => {
                    const found = availableCouriers.find(
                      (c) => `${c.courierName}-${c.courierService}` === e.target.value
                    );
                    if (found) setSelectedCourier(found);
                  }}
                  className="px-2.5 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-xs font-bold text-neutral-900 dark:text-white focus:outline-none focus:border-[#EE4D2D]"
                >
                  {availableCouriers.map((c, idx) => (
                    <option key={idx} value={`${c.courierName}-${c.courierService}`}>
                      {c.courierName} ({c.courierService}) - {formatIDR(c.cost)}
                    </option>
                  ))}
                </select>

                <span className="font-bold text-[#EE4D2D] whitespace-nowrap text-sm">
                  {formatIDR(shippingCost)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Shopee Voucher Card */}
        <div className="bg-white dark:bg-[#141414] rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Ticket className="w-5 h-5 text-[#EE4D2D]" />
            <div>
              <span className="font-bold text-neutral-900 dark:text-white block text-sm">
                Voucher Diskon Toko
              </span>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Gunakan kode voucher promo untuk potongan harga langsung
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {appliedVoucher ? (
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded bg-[#EE4D2D]/10 border border-[#EE4D2D]/30 text-[#EE4D2D] font-bold text-xs flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  {appliedVoucher.code} (-{formatIDR(discountAmount)})
                </span>
                <button
                  type="button"
                  onClick={() => setAppliedVoucher(null)}
                  className="text-neutral-400 hover:text-red-500 text-xs font-bold"
                >
                  Hapus
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyVoucherCode} className="flex items-center gap-2">
                <input
                  type="text"
                  value={voucherInput}
                  onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                  placeholder="Ketik kode voucher"
                  className="px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-xs text-neutral-900 dark:text-white uppercase font-mono focus:outline-none focus:border-[#EE4D2D]"
                />
                <button
                  type="submit"
                  disabled={isValidatingVoucher || !voucherInput.trim()}
                  className="px-3 py-1.5 rounded bg-neutral-900 dark:bg-neutral-700 text-white font-bold text-xs hover:bg-[#EE4D2D] transition-colors disabled:opacity-50"
                >
                  {isValidatingVoucher ? 'Memeriksa...' : 'Terapkan'}
                </button>
              </form>
            )}
          </div>
          {voucherError && <p className="text-red-500 text-[11px] sm:hidden">{voucherError}</p>}
        </div>

        {/* 5. Shopee-Style Payment Method Selection */}
        <div className="bg-white dark:bg-[#141414] rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-neutral-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#EE4D2D]" />
                Metode Pembayaran
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                Pilih metode pembayaran yang Anda inginkan. Sistem otomatis mengarahkan ke opsi pembayaran Midtrans sesuai pilihan Anda (kecuali COD).
              </p>
            </div>
          </div>

          {/* Payment Method Radio Cards */}
          <div className="p-4 space-y-2.5">
            {paymentMethodsList.map((m) => {
              const isSelected = selectedPayment === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedPayment(m.id)}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-[#EE4D2D] bg-[#EE4D2D]/5 dark:bg-[#EE4D2D]/10 shadow-sm'
                      : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-black/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Radio Button */}
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                        isSelected
                          ? 'border-[#EE4D2D] bg-[#EE4D2D]'
                          : 'border-neutral-400 dark:border-neutral-600'
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>

                    <div className="p-2 rounded bg-neutral-100 dark:bg-neutral-800 flex-shrink-0">
                      {m.icon}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-white">
                          {m.name}
                        </span>
                        {m.badge && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                              m.isCod
                                ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 text-amber-700 dark:text-amber-400'
                                : 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 text-emerald-700 dark:text-emerald-400'
                            }`}
                          >
                            {m.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block mt-0.5">
                        {m.desc}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <CheckCircle2 className="w-5 h-5 text-[#EE4D2D] flex-shrink-0 hidden sm:block" />
                  )}
                </div>
              );
            })}
          </div>

          {/* COD Notice Box */}
          {selectedPayment === 'cod' && (
            <div className="mx-4 mb-4 p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2.5">
              <Coins className="w-5 h-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <strong className="block font-bold">Metode COD (Bayar di Tempat) Terpilih</strong>
                <span>
                  Tidak dialihkan ke Midtrans. Siapkan uang tunai pas sebesar <strong>{formatIDR(grandTotal)}</strong> saat kurir mengantar barang.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 6. Shopee Payment Summary Breakdown Card */}
        <div className="bg-white dark:bg-[#141414] rounded-lg border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm space-y-3">
          <h4 className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-white uppercase tracking-wider border-b border-neutral-100 dark:border-neutral-800 pb-2">
            Rincian Pembayaran
          </h4>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
              <span>Subtotal untuk Produk:</span>
              <span className="text-neutral-900 dark:text-neutral-200 font-medium">
                {formatIDR(subtotal)}
              </span>
            </div>

            <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
              <span>Total Ongkos Kirim ({selectedCourier?.courierName || 'Ekspedisi'}):</span>
              <span className="text-neutral-900 dark:text-neutral-200 font-medium">
                {formatIDR(shippingCost)}
              </span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                <span>Total Diskon Voucher ({appliedVoucher?.code}):</span>
                <span>-{formatIDR(discountAmount)}</span>
              </div>
            )}

            <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
              <span>Biaya Penanganan / Layanan:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                Rp 0 (GRATIS)
              </span>
            </div>

            <div className="pt-3 border-t border-dashed border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-sm sm:text-base">
              <span className="font-bold text-neutral-900 dark:text-white">
                Total Pembayaran:
              </span>
              <span className="font-racing font-black text-xl sm:text-2xl text-[#EE4D2D]">
                {formatIDR(grandTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* 7. Shopee-style Bottom Sticky Checkout Bar */}
        <div className="bg-white dark:bg-[#141414] rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 max-w-md">
            Dengan mengklik <strong>"Buat Pesanan"</strong>, Anda menyetujui Ketentuan Pembelian Jawir Speedshop. Sistem otomatis memproses pesanan dan mengunci stok.
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-5">
            <div className="text-right">
              <span className="text-[10px] text-neutral-400 block uppercase tracking-wider">
                Total Pembayaran
              </span>
              <span className="font-racing font-black text-lg sm:text-2xl text-[#EE4D2D]">
                {formatIDR(grandTotal)}
              </span>
            </div>

            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={isSubmitting || items.length === 0}
              className="py-3 px-8 rounded bg-[#EE4D2D] hover:bg-[#D73211] active:scale-95 text-white font-bold text-sm sm:text-base shadow-lg shadow-orange-950/20 cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Memproses Pesanan...</span>
                </>
              ) : (
                <span>Buat Pesanan</span>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
