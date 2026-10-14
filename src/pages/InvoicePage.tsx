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
  Package
} from 'lucide-react';

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
      const res = await fetch(`/api/orders/${invoiceNumber}`);
      if (!res.ok) {
        throw new Error('Pesanan dengan nomor invoice tersebut tidak ditemukan.');
      }
      const data = await res.json();
      setOrder(data);
    } catch (err: any) {
      setError(err.message || 'Gagal mengambil detail tagihan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 15000);
    return () => clearInterval(interval);
  }, [invoiceNumber]);

  // Countdown timer calculation
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
    } else if (type === 'resi') {
      setCopiedResi(true);
      setTimeout(() => setCopiedResi(false), 2000);
    } else {
      setCopiedVA(true);
      setTimeout(() => setCopiedVA(false), 2000);
    }
  };

  // Simulate payment
  const handleSimulatePayment = async () => {
    if (!order) return;
    setIsProcessingPay(true);
    try {
      const res = await fetch(`/api/orders/${order.invoice_number}/pay`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memproses pembayaran');
      fetchOrder();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsProcessingPay(false);
    }
  };

  // Cancel order
  const handleCancelOrder = async () => {
    if (!order || !confirm('Yakin ingin membatalkan pesanan ini? Stok akan dikembalikan.')) return;
    setIsProcessingCancel(true);
    try {
      const res = await fetch(`/api/orders/${order.invoice_number}/cancel`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membatalkan pesanan');
      fetchOrder();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsProcessingCancel(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-carbon text-white flex flex-col items-center justify-center p-4">
        <RefreshCw className="w-8 h-8 text-[#E50914] animate-spin mb-3" />
        <p className="text-sm font-semibold text-neutral-300">Memuat rincian tagihan...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-carbon text-white flex flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
        <h2 className="text-lg font-bold">Tagihan Tidak Ditemukan</h2>
        <p className="text-xs text-neutral-400 max-w-sm mt-1 mb-4">
          {error || 'Nomor invoice yang Anda masukkan salah atau belum terdaftar di sistem.'}
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-xs font-bold"
        >
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  const getStatusBadge = () => {
    switch (order.status) {
      case 'PENDING':
        return (
          <span className="bg-amber-500/20 border border-amber-500 text-amber-300 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Menunggu Pembayaran
          </span>
        );
      case 'PAID':
        return (
          <span className="bg-emerald-500/20 border border-emerald-500 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" />
            Pembayaran Lunas (Sedang Dikemas)
          </span>
        );
      case 'SHIPPED':
        return (
          <span className="bg-sky-500/20 border border-sky-500 text-sky-300 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5" />
            Dalam Pengiriman
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="bg-purple-500/20 border border-purple-500 text-purple-300 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Pesanan Selesai
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="bg-red-500/20 border border-red-500 text-red-300 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" />
            Pesanan Dibatalkan / Kedaluwarsa
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-carbon text-neutral-100 flex flex-col selection:bg-[#E50914] selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#121212]/95 backdrop-blur-md border-b border-neutral-800">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-xs font-bold text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali Belanja</span>
          </button>

          <Link to="/" className="flex items-center gap-1.5">
            <span className="font-racing font-extrabold text-base tracking-wider text-white uppercase">
              JAWIR GARAGE
            </span>
            <span className="bg-[#E50914] text-white text-[9px] font-black px-1.5 py-0.5 rounded tracking-widest uppercase">
              INVOICE
            </span>
          </Link>

          <Link
            to={`/track-order?invoice=${order.invoice_number}`}
            className="text-xs text-[#E50914] font-bold hover:underline flex items-center gap-1"
          >
            <Truck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lacak Pesanan</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Status Card */}
        <div className="bg-[#141414] border border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
            <div>
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                Rincian Tagihan Pesanan
              </span>
              <div className="flex items-center gap-2 mt-1">
                <h1 className="font-racing font-bold text-xl sm:text-2xl text-white tracking-wide">
                  {order.invoice_number}
                </h1>
                <button
                  onClick={() => copyToClipboard(order.invoice_number, 'invoice')}
                  className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                  title="Salin Nomor Invoice"
                >
                  {copiedInvoice ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <span className="text-[11px] text-neutral-400">
                Waktu Transaksi: {new Date(order.created_at).toLocaleString('id-ID')}
              </span>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-1.5">
              {getStatusBadge()}
              {order.status === 'PENDING' && timeLeft && (
                <div className="flex items-center gap-1.5 text-xs text-amber-400 font-mono">
                  <span>Batas Bayar:</span>
                  <strong className="text-sm font-bold bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded">
                    {timeLeft}
                  </strong>
                </div>
              )}
            </div>
          </div>

          {/* Nomor Resi Banner (Jika sudah SHIPPED) */}
          {order.tracking_number && (
            <div className="mt-4 p-4 rounded-xl bg-sky-950/40 border border-sky-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-sky-900/60 border border-sky-700 flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-sky-300" />
                </div>
                <div>
                  <span className="text-[10px] text-sky-400 uppercase tracking-wider font-bold">
                    Paket Telah Dikirim ({order.courier_name} - {order.courier_service})
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono font-bold text-sm text-white">
                      {order.tracking_number}
                    </span>
                    <button
                      onClick={() => copyToClipboard(order.tracking_number!, 'resi')}
                      className="p-1 rounded bg-sky-900/60 hover:bg-sky-800 text-sky-300 text-xs"
                      title="Salin Resi"
                    >
                      {copiedResi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <Link
                to={`/track-order?invoice=${order.invoice_number}`}
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs self-start sm:self-center"
              >
                Cek Pelacakan Real-Time →
              </Link>
            </div>
          )}

          {/* Payment Section for PENDING status */}
          {order.status === 'PENDING' && (
            <div className="mt-6 p-5 rounded-xl bg-neutral-900/90 border border-neutral-800">
              <h3 className="font-racing font-bold text-base text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#E50914]" />
                Instruksi Pembayaran Instant
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* QRIS / VA Display */}
                <div className="flex flex-col items-center bg-white text-black p-5 rounded-2xl border border-neutral-300 shadow-md">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-2">
                    QRIS Standar Bank Indonesia
                  </p>
                  <div className="relative w-44 h-44 bg-neutral-100 border border-neutral-300 rounded-lg flex items-center justify-center">
                    <QrCode className="w-36 h-36 text-neutral-900" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-[#E50914] text-white text-[9px] font-black px-2 py-0.5 rounded shadow">
                        JAWIR RACING
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-neutral-500 mt-2">
                    Scan via BCA Mobile, GoPay, ShopeePay, OVO, Dana
                  </span>
                  <span className="font-racing font-black text-lg text-[#E50914] mt-1">
                    {formatIDR(order.grand_total)}
                  </span>
                </div>

                {/* Virtual Account & Testing Controls */}
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-black/60 border border-neutral-800">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1">
                      BCA Virtual Account
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-base text-white tracking-widest">
                        80777 {order.customer_phone.slice(-6).padStart(6, '0')}
                      </span>
                      <button
                        onClick={() =>
                          copyToClipboard(
                            `80777${order.customer_phone.slice(-6).padStart(6, '0')}`,
                            'va'
                          )
                        }
                        className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-200 flex items-center gap-1"
                      >
                        {copiedVA ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
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
                      Nama Rekening: Jawir Garage Speedshop
                    </span>
                  </div>

                  {/* Simulator Testing Controls */}
                  <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                      ⚡ Simulator Pembayaran (Pengujian PRD)
                    </span>
                    <button
                      onClick={handleSimulatePayment}
                      disabled={isProcessingPay}
                      className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{isProcessingPay ? 'Memproses...' : 'Simulasikan Pembayaran Lunas'}</span>
                    </button>
                    <button
                      onClick={handleCancelOrder}
                      disabled={isProcessingCancel}
                      className="w-full py-2 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>{isProcessingCancel ? 'Membatalkan...' : 'Batalkan Pesanan Ini'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Order Details & Snapshots */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Items Table */}
          <div className="md:col-span-2 bg-[#141414] border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="font-racing font-bold text-base text-white uppercase tracking-wider flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#E50914]" />
              Daftar Barang ({order.items.reduce((s, i) => s + i.quantity, 0)})
            </h3>

            <div className="space-y-3">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex-1">
                    <h4 className="font-bold text-white line-clamp-1">{item.product_name_snapshot}</h4>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      {item.quantity} x {formatIDR(item.price_snapshot)}
                    </div>
                  </div>
                  <span className="font-racing font-bold text-sm text-neutral-100">
                    {formatIDR(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>

            {/* Price Breakdown */}
            <div className="pt-3 border-t border-neutral-800 space-y-1.5 text-xs text-neutral-400">
              <div className="flex justify-between">
                <span>Subtotal Barang:</span>
                <span className="text-neutral-200">{formatIDR(order.subtotal_amount)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-400 font-medium">
                  <span>Diskon Voucer ({order.voucher_code}):</span>
                  <span>-{formatIDR(order.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Ongkos Kirim ({order.courier_name} - {order.courier_service}):</span>
                <span className="text-neutral-200">{formatIDR(order.shipping_cost)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-neutral-800">
                <span>Total Tagihan:</span>
                <span className="font-racing text-lg text-[#E50914]">
                  {formatIDR(order.grand_total)}
                </span>
              </div>
            </div>
          </div>

          {/* Recipient & Shipping Information */}
          <div className="bg-[#141414] border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="font-racing font-bold text-base text-white uppercase tracking-wider flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#E50914]" />
              Data Pengiriman
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold block">
                  Penerima
                </span>
                <p className="font-bold text-white mt-0.5">{order.customer_name}</p>
                <p className="text-neutral-400">{order.customer_phone}</p>
                {order.customer_email && (
                  <p className="text-neutral-500 text-[11px]">{order.customer_email}</p>
                )}
              </div>

              <div>
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold block">
                  Alamat Lengkap
                </span>
                <p className="text-neutral-300 mt-0.5 leading-relaxed">{order.shipping_address}</p>
                {(order.shipping_district || order.shipping_city) && (
                  <p className="text-neutral-400 text-[11px] mt-0.5">
                    {order.shipping_district}, {order.shipping_city}, {order.shipping_province}
                  </p>
                )}
              </div>

              <div>
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold block">
                  Metode Pengiriman
                </span>
                <p className="font-bold text-white mt-0.5">
                  {order.courier_name} ({order.courier_service})
                </p>
              </div>

              <div className="pt-3 border-t border-neutral-800">
                <a
                  href={`https://wa.me/6281234567890?text=Halo%20Jawir%20Garage,%20saya%20sudah%20membuat%20pesanan%20dengan%20Invoice%20${encodeURIComponent(
                    order.invoice_number
                  )}%20total%20${encodeURIComponent(formatIDR(order.grand_total))}.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Konfirmasi via WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
