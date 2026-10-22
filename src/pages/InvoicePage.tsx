import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Order } from '../types';
import { formatIDR } from '../components/ProductCard';
import {
  CheckCircle,
  Clock,
  Copy,
  Check,
  Truck,
  AlertCircle,
  ShieldCheck,
  QrCode,
  ArrowLeft,
  XCircle,
  MessageCircle,
  RefreshCw,
  ShoppingBag,
  Package,
  ExternalLink,
  CreditCard,
  Coins,
  MapPin,
  ChevronRight,
  Store,
  FileText,
  BadgePercent,
  CheckCircle2,
} from 'lucide-react';
import { safeFetchJson } from '../config/api';
import { toast, confirmModal } from '../context/ToastContext';

export const InvoicePage: React.FC = () => {
  const { invoiceNumber } = useParams<{ invoiceNumber: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedInvoice, setCopiedInvoice] = useState(false);
  const [copiedResi, setCopiedResi] = useState(false);
  const [copiedVA, setCopiedVA] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isProcessingPay, setIsProcessingPay] = useState(false);
  const [isProcessingCancel, setIsProcessingCancel] = useState(false);

  const fetchOrder = async () => {
    if (!invoiceNumber) return;
    try {
      const data = await safeFetchJson<any>(`/api/orders/${invoiceNumber}`);
      setOrder(data);
    } catch (err: any) {
      setError(err.message || 'Gagal mengambil rincian pesanan');
    } finally {
      setLoading(false);
    }
  };

  // Load Midtrans Snap Script
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

  const handleMidtransPay = () => {
    if (!order) return;
    if ((window as any).snap && order.snap_token) {
      (window as any).snap.pay(order.snap_token, {
        onSuccess: (result: any) => {
          console.log('[Snap Success]', result);
          fetchOrder();
        },
        onPending: (result: any) => {
          console.log('[Snap Pending]', result);
          fetchOrder();
        },
        onError: (err: any) => {
          console.error('[Snap Error]', err);
          toast.warning('Pembayaran Dibatalkan', 'Transaksi pembayaran belum berhasil diselesaikan.');
        },
        onClose: () => {
          fetchOrder();
        },
      });
    } else if (order.payment_url) {
      window.open(order.payment_url, '_blank');
    } else {
      toast.info('Menyiapkan Pembayaran', 'Snap token sedang diproses oleh payment gateway.');
    }
  };

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 15000);
    return () => clearInterval(interval);
  }, [invoiceNumber]);

  // Countdown timer calculation for PENDING
  useEffect(() => {
    if (!order || order.status !== 'PENDING') return;

    const timer = setInterval(() => {
      const expiry = new Date(order.expired_at).getTime();
      const now = Date.now();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('Kedaluwarsa');
        clearInterval(timer);
        fetchOrder();
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(
          `${hours.toString().padStart(2, '0')}:${minutes
            .toString()
            .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [order]);

  const copyToClipboard = (text: string, type: 'invoice' | 'resi' | 'va') => {
    navigator.clipboard.writeText(text);
    if (type === 'invoice') {
      setCopiedInvoice(true);
      setTimeout(() => setCopiedInvoice(false), 2000);
      toast.success('Disalin ke Clipboard', `Nomor Invoice ${text} berhasil disalin.`);
    } else if (type === 'resi') {
      setCopiedResi(true);
      setTimeout(() => setCopiedResi(false), 2000);
      toast.success('Disalin ke Clipboard', `Nomor Resi ${text} berhasil disalin.`);
    } else {
      setCopiedVA(true);
      setTimeout(() => setCopiedVA(false), 2000);
      toast.success('Disalin ke Clipboard', `Nomor Pembayaran ${text} berhasil disalin.`);
    }
  };

  // Simulate payment
  const handleSimulatePayment = async () => {
    if (!order) return;
    setIsProcessingPay(true);
    try {
      await safeFetchJson(`/api/orders/${order.invoice_number}/pay`, {
        method: 'POST',
      });
      fetchOrder();
      toast.success('Simulasi Pembayaran Berhasil', 'Status pesanan berhasil diubah menjadi PAID.');
    } catch (err: any) {
      toast.error('Gagal Memproses Pembayaran', err.message);
    } finally {
      setIsProcessingPay(false);
    }
  };

  // Cancel order
  const handleCancelOrder = async () => {
    if (!order) return;
    const confirmed = await confirmModal({
      title: 'Batalkan Pesanan',
      message: 'Yakin ingin membatalkan pesanan ini? Stok produk yang dipesan akan otomatis dikembalikan ke katalog.',
      confirmText: 'Ya, Batalkan Pesanan',
      cancelText: 'Kembali',
      variant: 'danger',
    });
    if (!confirmed) return;
    setIsProcessingCancel(true);
    try {
      await safeFetchJson(`/api/orders/${order.invoice_number}/cancel`, {
        method: 'POST',
      });
      fetchOrder();
      toast.success('Pesanan Dibatalkan', 'Pesanan Anda telah dibatalkan.');
    } catch (err: any) {
      toast.error('Gagal Membatalkan Pesanan', err.message);
    } finally {
      setIsProcessingCancel(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center p-4">
        <RefreshCw className="w-9 h-9 text-[#EE4D2D] animate-spin mb-3" />
        <p className="text-sm font-semibold text-neutral-600">Memuat rincian pesanan...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-500 mb-3">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-neutral-800">Pesanan Tidak Ditemukan</h2>
        <p className="text-xs text-neutral-500 max-w-sm mt-1 mb-5">
          {error || 'Nomor pesanan yang Anda tuju tidak terdaftar atau telah dihapus.'}
        </p>
        <button
          onClick={() => navigate('/orders')}
          className="px-5 py-2.5 bg-[#EE4D2D] hover:bg-[#d73211] text-white rounded-md text-xs font-bold transition-all shadow-sm"
        >
          Lihat Pesanan Saya
        </button>
      </div>
    );
  }

  const isCOD = order.payment_method?.toLowerCase() === 'cod';

  // Stepper helper
  const getStepStatus = (stepIndex: number) => {
    // 0: Pesanan Dibuat
    // 1: Pembayaran / Menunggu Pembayaran
    // 2: Sedang Dikemas
    // 3: Sedang Dikirim
    // 4: Pesanan Selesai
    if (order.status === 'CANCELLED') {
      return stepIndex === 0 ? 'completed' : 'cancelled';
    }
    if (order.status === 'PENDING') {
      if (stepIndex === 0) return 'completed';
      if (stepIndex === 1) return 'current';
      return 'upcoming';
    }
    if (order.status === 'PAID') {
      if (stepIndex <= 1) return 'completed';
      if (stepIndex === 2) return 'current';
      return 'upcoming';
    }
    if (order.status === 'SHIPPED') {
      if (stepIndex <= 2) return 'completed';
      if (stepIndex === 3) return 'current';
      return 'upcoming';
    }
    if (order.status === 'COMPLETED') {
      return 'completed';
    }
    return 'upcoming';
  };

  const steps = [
    { title: 'Pesanan Dibuat', time: new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) },
    {
      title: isCOD ? 'COD Terverifikasi' : 'Pembayaran Terverifikasi',
      time: order.status !== 'PENDING' ? 'Berhasil' : 'Menunggu',
    },
    { title: 'Sedang Dikemas', time: order.status === 'PAID' || order.status === 'SHIPPED' || order.status === 'COMPLETED' ? 'Diproses Toko' : '-' },
    { title: 'Sedang Dikirim', time: order.tracking_number ? `${order.courier_name}` : '-' },
    { title: 'Pesanan Selesai', time: order.status === 'COMPLETED' ? 'Selesai' : '-' },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-neutral-800 flex flex-col font-sans selection:bg-[#EE4D2D] selection:text-white">
      {/* 1. Shopee Top Bar Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-neutral-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <span className="font-racing font-black text-xl sm:text-2xl tracking-wider text-[#EE4D2D]">
                JAWIR SPEEDSHOP
              </span>
            </Link>
            <div className="h-5 w-[1px] bg-neutral-300 hidden sm:block" />
            <h1 className="text-base font-bold text-neutral-800 hidden sm:block">
              Rincian Pesanan
            </h1>
          </div>

          <div className="flex items-center gap-3 text-xs font-medium">
            <Link
              to="/orders"
              className="text-neutral-600 hover:text-[#EE4D2D] transition-colors hidden sm:inline"
            >
              Pesanan Saya
            </Link>
            <span className="text-neutral-300 hidden sm:inline">|</span>
            <Link
              to="/"
              className="flex items-center gap-1 text-[#EE4D2D] font-bold hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali Belanja</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
        {/* 2. Top Order Status Banner & Shopee Horizontal Stepper */}
        <div className="bg-white rounded-lg border border-neutral-200 shadow-sm overflow-hidden">
          {/* Status Header Banner */}
          <div className="bg-gradient-to-r from-[#EE4D2D] to-[#FF5722] text-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-100">
                  No. Pesanan: {order.invoice_number}
                </span>
                <button
                  onClick={() => copyToClipboard(order.invoice_number, 'invoice')}
                  className="p-1 rounded bg-black/20 hover:bg-black/30 text-white transition-all"
                  title="Salin No. Pesanan"
                >
                  {copiedInvoice ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>

              <h2 className="text-lg sm:text-xl font-bold mt-1">
                {order.status === 'PENDING' && (isCOD ? 'Pesanan COD Menunggu Pengiriman' : 'Menunggu Pembayaran')}
                {order.status === 'PAID' && 'Pembayaran Terkonfirmasi (Sedang Dikemas)'}
                {order.status === 'SHIPPED' && 'Pesanan Sedang Dikirim'}
                {order.status === 'COMPLETED' && 'Pesanan Selesai'}
                {order.status === 'CANCELLED' && 'Pesanan Dibatalkan'}
              </h2>

              <p className="text-xs text-orange-100 mt-0.5">
                {order.status === 'PENDING' && (isCOD
                  ? 'Pesanan COD langsung diproses toko. Siapkan uang tunai pas saat kurir tiba.'
                  : 'Selesaikan pembayaran sebelum batas waktu agar pesanan tidak dibatalkan.')}
                {order.status === 'PAID' && 'Penjual sedang menyiapkan dan mengemas barang pesanan Anda.'}
                {order.status === 'SHIPPED' && `Paket sedang diantar oleh kurir ${order.courier_name} (${order.courier_service}).`}
                {order.status === 'COMPLETED' && 'Terima kasih telah berbelanja di Jawir Speedshop Official Store.'}
                {order.status === 'CANCELLED' && 'Pesanan ini telah dibatalkan. Stok barang telah dikembalikan.'}
              </p>
            </div>

            {/* Countdown / Total badge */}
            <div className="sm:text-right flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 border-white/20 pt-2 sm:pt-0">
              <span className="text-[11px] text-orange-100">Total Tagihan</span>
              <span className="text-xl sm:text-2xl font-black font-racing tracking-wide">
                {formatIDR(order.grand_total)}
              </span>
              {order.status === 'PENDING' && !isCOD && timeLeft && (
                <div className="flex items-center gap-1 text-[11px] font-mono bg-black/25 px-2 py-0.5 rounded mt-1">
                  <Clock className="w-3 h-3 text-amber-300" />
                  <span>Sisa Waktu: <strong>{timeLeft}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Shopee 5-Step Stepper */}
          <div className="p-4 sm:p-6 bg-white border-b border-neutral-100">
            <div className="relative flex items-center justify-between max-w-3xl mx-auto">
              {/* Connecting Line */}
              <div className="absolute left-6 right-6 top-4 sm:top-5 h-0.5 bg-neutral-200 -z-0" />

              {steps.map((step, idx) => {
                const status = getStepStatus(idx);
                return (
                  <div key={idx} className="relative z-10 flex flex-col items-center text-center">
                    <div
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all ${
                        status === 'completed'
                          ? 'bg-[#EE4D2D] text-white shadow-sm ring-4 ring-orange-50'
                          : status === 'current'
                          ? 'bg-white border-2 border-[#EE4D2D] text-[#EE4D2D] shadow-sm ring-4 ring-orange-50'
                          : status === 'cancelled'
                          ? 'bg-neutral-200 text-neutral-400'
                          : 'bg-white border-2 border-neutral-300 text-neutral-400'
                      }`}
                    >
                      {status === 'completed' ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </div>
                    <span
                      className={`text-[11px] sm:text-xs font-semibold mt-2 max-w-[70px] sm:max-w-[90px] leading-tight ${
                        status === 'completed' || status === 'current'
                          ? 'text-neutral-900'
                          : 'text-neutral-400'
                      }`}
                    >
                      {step.title}
                    </span>
                    <span className="text-[10px] text-neutral-400 mt-0.5 hidden sm:block">
                      {step.time}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. Shopee Iconic Envelope Delivery Address Card */}
        <div className="bg-white rounded-lg border border-neutral-200 shadow-sm overflow-hidden">
          {/* Top Airmail Colored Stripe (Shopee signature) */}
          <div className="h-1.5 w-full bg-[repeating-linear-gradient(45deg,#EE4D2D_0,#EE4D2D_32px,#FFFFFF_32px,#FFFFFF_44px,#005BAA_44px,#005BAA_76px,#FFFFFF_76px,#FFFFFF_88px)]" />

          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-2 text-[#EE4D2D] font-bold text-sm sm:text-base pb-3 border-b border-neutral-100">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span>Alamat Pengiriman</span>
            </div>

            <div className="pt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="md:col-span-2 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-neutral-900">{order.customer_name}</span>
                  <span className="text-neutral-500 font-mono">({order.customer_phone})</span>
                </div>
                <p className="text-neutral-700 leading-relaxed">{order.shipping_address}</p>
                {(order.shipping_district || order.shipping_city) && (
                  <p className="text-neutral-500">
                    {order.shipping_district}, {order.shipping_city}, {order.shipping_province}
                  </p>
                )}
              </div>

              {/* Courier info box */}
              <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-neutral-500 text-[11px] font-bold uppercase tracking-wider">
                    <Truck className="w-3.5 h-3.5 text-[#EE4D2D]" />
                    <span>Opsi Pengiriman</span>
                  </div>
                  <p className="font-bold text-neutral-800 text-xs mt-1">
                    {order.courier_name} - {order.courier_service}
                  </p>
                  {order.tracking_number ? (
                    <div className="mt-1.5">
                      <span className="text-[10px] text-neutral-500 block">No. Resi Biteship:</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono font-bold text-xs text-neutral-900 bg-white px-1.5 py-0.5 rounded border border-neutral-300">
                          {order.tracking_number}
                        </span>
                        <button
                          onClick={() => copyToClipboard(order.tracking_number!, 'resi')}
                          className="p-1 rounded bg-neutral-200 hover:bg-neutral-300 text-neutral-700"
                          title="Salin Resi"
                        >
                          {copiedResi ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span className="text-[10px] text-amber-600 font-medium mt-1 block">
                      Resi otomatis terbit saat toko serahkan paket ke kurir
                    </span>
                  )}
                </div>

                <Link
                  to={`/track-order?invoice=${order.invoice_number}`}
                  className="mt-3 text-center py-1.5 px-3 rounded bg-white hover:bg-neutral-100 border border-neutral-300 text-[#EE4D2D] font-bold text-[11px] transition-colors"
                >
                  Lacak Pengiriman Real-Time →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Payment Action Box for PENDING */}
        {order.status === 'PENDING' && (
          isCOD ? (
            /* ================= COD (Bayar di Tempat) Shopee Card ================= */
            <div className="bg-white rounded-lg border-2 border-amber-400 p-4 sm:p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-neutral-900 flex items-center gap-2">
                      COD (Bayar di Tempat)
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Tanpa Transfer Bank
                      </span>
                    </h3>
                    <p className="text-xs text-neutral-600">
                      Pesanan Anda langsung diproses toko tanpa perlu transfer Midtrans.
                    </p>
                  </div>
                </div>

                <div className="sm:text-right bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                  <span className="text-[10px] text-neutral-500 uppercase font-semibold block">Siapkan Uang Pas Saat Kurir Tiba:</span>
                  <span className="font-racing font-black text-xl text-[#EE4D2D]">
                    {formatIDR(order.grand_total)}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-amber-50/60 rounded-lg text-xs space-y-1.5 text-neutral-700">
                <p>• Kurir <strong>{order.courier_name} ({order.courier_service})</strong> akan mengantarkan paket ke alamat Anda.</p>
                <p>• Mohon siapkan uang tunai pas sebesar <strong>{formatIDR(order.grand_total)}</strong> saat serah terima paket.</p>
                <p>• Pastikan nomor telepon <strong>{order.customer_phone}</strong> aktif untuk koordinasi dengan kurir.</p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent('open-jawir-chat', {
                        detail: {
                          initialMessage: `Halo Jawir Speedshop, saya konfirmasi pesanan COD No. Pesanan ${order.invoice_number} total ${formatIDR(order.grand_total)}.`,
                        },
                      })
                    );
                  }}
                  className="w-full sm:flex-1 py-2.5 px-4 rounded bg-[#E50914] hover:bg-[#ff1a25] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Konfirmasi Pesanan COD ke Live Chat Admin</span>
                </button>

                <button
                  onClick={handleCancelOrder}
                  disabled={isProcessingCancel}
                  className="w-full sm:w-auto py-2.5 px-4 rounded bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                >
                  <XCircle className="w-3.5 h-3.5 text-red-500" />
                  <span>{isProcessingCancel ? 'Membatalkan...' : 'Batalkan Pesanan'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* ================= Non-COD (Midtrans Payment) Shopee Card ================= */
            <div className="bg-white rounded-lg border-2 border-[#EE4D2D] p-4 sm:p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-[#EE4D2D] flex-shrink-0">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-neutral-900 flex items-center gap-2">
                      Instruksi Pembayaran Instan
                      <span className="bg-orange-100 text-[#EE4D2D] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                        {order.payment_method?.toUpperCase()}
                      </span>
                    </h3>
                    <p className="text-xs text-neutral-600">
                      Klik tombol bayar untuk menyelesaikan transaksi dengan Midtrans Payment Gateway.
                    </p>
                  </div>
                </div>

                <button
                  id="shopee-pay-now-btn"
                  onClick={handleMidtransPay}
                  className="py-3 px-6 rounded-md bg-[#EE4D2D] hover:bg-[#d73211] active:scale-95 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-orange-500/20"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Bayar Sekarang ({formatIDR(order.grand_total)})</span>
                </button>
              </div>

              {/* VA & QRIS display details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center pt-1">
                <div className="p-3.5 rounded-lg bg-neutral-50 border border-neutral-200">
                  <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block mb-1">
                    Nomor Rekening / Virtual Account ({order.payment_method?.toUpperCase()}):
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-base text-neutral-900 tracking-wider">
                      80777 {order.customer_phone.slice(-6).padStart(6, '0')}
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `80777${order.customer_phone.slice(-6).padStart(6, '0')}`,
                          'va'
                        )
                      }
                      className="px-2.5 py-1 rounded bg-white hover:bg-neutral-100 border border-neutral-300 text-xs font-bold text-neutral-700 flex items-center gap-1"
                    >
                      {copiedVA ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Salin</span>
                        </>
                      )}
                    </button>
                  </div>
                  <span className="text-[10px] text-neutral-500 mt-1 block">
                    Atas Nama: Jawir Speedshop Official Midtrans
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-lg bg-neutral-50 border border-neutral-200">
                  <div className="space-y-1">
                    <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">
                      ⚡ Uji Coba Cepat (Simulator PRD)
                    </span>
                    <span className="text-[11px] text-neutral-500 block">
                      Simulasikan status pembayaran lunas seketika
                    </span>
                  </div>
                  <button
                    onClick={handleSimulatePayment}
                    disabled={isProcessingPay}
                    className="py-2 px-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all cursor-pointer"
                  >
                    {isProcessingPay ? 'Memproses...' : 'Simulasi Lunas'}
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={handleCancelOrder}
                  disabled={isProcessingCancel}
                  className="text-xs text-neutral-500 hover:text-red-600 flex items-center gap-1 transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>{isProcessingCancel ? 'Membatalkan...' : 'Batalkan Pesanan Ini'}</span>
                </button>
              </div>
            </div>
          )
        )}

        {/* 5. Shopee Store & Products Ordered Card */}
        <div className="bg-white rounded-lg border border-neutral-200 shadow-sm overflow-hidden">
          {/* Store Header */}
          <div className="p-4 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="bg-[#EE4D2D] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                Mall
              </span>
              <Store className="w-4 h-4 text-neutral-700" />
              <span className="font-bold text-sm text-neutral-900">
                Jawir Speedshop Official Store
              </span>
            </div>

            <button
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent('open-jawir-chat', {
                    detail: {
                      initialMessage: `Halo Admin Jawir Garage, saya mau tanya rincian pesanan invoice ${order.invoice_number}`,
                    },
                  })
                );
              }}
              className="text-xs text-[#EE4D2D] font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Chat Penjual</span>
            </button>
          </div>

          {/* Product Items */}
          <div className="divide-y divide-neutral-100">
            {order.items.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-neutral-100 rounded-md border border-neutral-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    <img
                      src="/images/brt_super_roller_1789096443716.jpg"
                      alt={item.product_name_snapshot}
                      className="w-full h-full object-cover"
                      onError={(e: any) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>

                  <div className="min-w-0 space-y-1">
                    <h4 className="text-sm font-semibold text-neutral-900 line-clamp-1">
                      {item.product_name_snapshot}
                    </h4>
                    <span className="inline-block text-[11px] text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded">
                      Variasi: Original PnP Spec
                    </span>
                    <div className="text-xs text-neutral-500">
                      x{item.quantity}
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="text-sm font-bold text-[#EE4D2D]">
                    {formatIDR(item.subtotal)}
                  </span>
                  <div className="text-[11px] text-neutral-400">
                    @{formatIDR(item.price_snapshot)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Delivery Guarantee Banner */}
          <div className="p-3 bg-neutral-50/70 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-600">
            <div className="flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-emerald-600" />
              <span>Garansi Tiba didukung oleh <strong>Biteship Logistics Hub</strong></span>
            </div>
            <span className="text-[11px] text-neutral-500 font-medium">Pengiriman Reguler</span>
          </div>
        </div>

        {/* 6. Shopee Payment & Billing Details */}
        <div className="bg-white rounded-lg border border-neutral-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-neutral-100 flex items-center gap-2 text-sm font-bold text-neutral-800">
            <FileText className="w-4 h-4 text-[#EE4D2D]" />
            <span>Rincian Pembayaran</span>
          </div>

          <div className="p-4 sm:p-5 space-y-3 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
              <span className="text-neutral-500">Metode Pembayaran:</span>
              <span className="font-bold text-neutral-800 uppercase">
                {isCOD ? 'COD (Bayar di Tempat)' : order.payment_method?.toUpperCase()}
              </span>
            </div>

            <div className="flex justify-between text-neutral-600">
              <span>Subtotal untuk Produk:</span>
              <span className="font-semibold text-neutral-900">{formatIDR(order.subtotal_amount)}</span>
            </div>

            <div className="flex justify-between text-neutral-600">
              <span>Total Ongkos Kirim ({order.courier_name} - {order.courier_service}):</span>
              <span className="font-semibold text-neutral-900">{formatIDR(order.shipping_cost)}</span>
            </div>

            {order.discount_amount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span className="flex items-center gap-1">
                  <BadgePercent className="w-3.5 h-3.5" />
                  Diskon Voucher Toko ({order.voucher_code}):
                </span>
                <span>-{formatIDR(order.discount_amount)}</span>
              </div>
            )}

            <div className="pt-3 border-t border-neutral-200 flex justify-between items-baseline">
              <div>
                <span className="text-sm font-bold text-neutral-900 block">Total Pembayaran:</span>
                <span className="text-[10px] text-neutral-500">Termasuk PPN & Biaya Penanganan</span>
              </div>
              <span className="font-racing font-black text-2xl text-[#EE4D2D]">
                {formatIDR(order.grand_total)}
              </span>
            </div>
          </div>
        </div>

        {/* 7. Bottom Navigation & Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <Link
            to="/orders"
            className="w-full sm:w-auto py-2.5 px-5 rounded-md bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-700 font-bold text-xs text-center transition-colors"
          >
            ← Kembali ke Pesanan Saya
          </Link>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {order.status === 'COMPLETED' && (
              <button
                onClick={() => navigate('/')}
                className="flex-1 sm:flex-initial py-2.5 px-5 rounded-md bg-[#EE4D2D] hover:bg-[#d73211] text-white font-bold text-xs transition-all shadow-sm"
              >
                Beli Lagi
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent('open-jawir-chat', {
                    detail: {
                      initialMessage: `Halo Jawir Speedshop, saya ingin tanya mengenai pesanan No. ${order.invoice_number}`,
                    },
                  })
                );
              }}
              className="flex-1 sm:flex-initial py-2.5 px-5 rounded-md bg-neutral-900 border border-neutral-700 hover:border-red-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-[#E50914]" />
              <span>Bantuan Live Chat</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
