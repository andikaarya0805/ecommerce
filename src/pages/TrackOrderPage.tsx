import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Order } from '../types';
import { formatIDR } from '../components/ProductCard';
import {
  Search,
  Package,
  Truck,
  CheckCircle,
  Clock,
  Copy,
  Check,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
  MapPin,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { safeFetchJson } from '../config/api';

export const TrackOrderPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [invoiceInput, setInvoiceInput] = useState(searchParams.get('invoice') || '');
  const [phoneInput, setPhoneInput] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedResi, setCopiedResi] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!invoiceInput.trim()) {
      setError('Masukkan nomor invoice pesanan Anda');
      return;
    }

    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const url = `/api/orders/track/search?invoice=${encodeURIComponent(
        invoiceInput.trim()
      )}&phone=${encodeURIComponent(phoneInput.trim())}`;
      const data = await safeFetchJson<any>(url);
      setOrder(data);
    } catch (err: any) {
      setError(err.message || 'Gagal mencari pesanan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchParams.get('invoice')) {
      handleSearch();
    }
  }, []);

  const copyResi = (resi: string) => {
    navigator.clipboard.writeText(resi);
    setCopiedResi(true);
    setTimeout(() => setCopiedResi(false), 2000);
  };

  // Determine stage index
  const getStageIndex = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 0;
      case 'PAID':
        return 1;
      case 'SHIPPED':
        return 2;
      case 'COMPLETED':
        return 3;
      default:
        return -1;
    }
  };

  const stages = [
    { label: 'Menunggu Pembayaran', desc: 'Tagihan dibuat & stok dikunci', icon: Clock },
    { label: 'Sedang Dikemas (PAID)', desc: 'Pembayaran terverifikasi, mekanik menyiapkan part', icon: Package },
    { label: 'Dalam Pengiriman (SHIPPED)', desc: 'Paket diserahkan ke kurir & nomor resi aktif', icon: Truck },
    { label: 'Pesanan Selesai', desc: 'Part diterima dengan aman di alamat tujuan', icon: ShieldCheck },
  ];

  const currentStage = order ? getStageIndex(order.status) : 0;

  return (
    <div className="min-h-screen bg-carbon text-neutral-100 flex flex-col selection:bg-[#E50914] selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#121212]/95 backdrop-blur-md border-b border-neutral-800">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-xs font-bold text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Toko</span>
          </button>

          <Link to="/" className="flex items-center gap-1.5">
            <span className="font-racing font-extrabold text-base tracking-wider text-white uppercase">
              JAWIR GARAGE
            </span>
            <span className="bg-[#E50914] text-white text-[9px] font-black px-1.5 py-0.5 rounded tracking-widest uppercase">
              TRACKING
            </span>
          </Link>

          <div className="w-16" />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-6">
        {/* Search Header Banner */}
        <div className="bg-[#141414] border border-neutral-800 rounded-2xl p-6 shadow-xl text-center">
          <div className="w-12 h-12 rounded-xl bg-red-950/60 border border-[#E50914]/40 flex items-center justify-center mx-auto mb-3">
            <Truck className="w-6 h-6 text-[#E50914]" />
          </div>
          <h1 className="font-racing font-bold text-xl sm:text-2xl text-white uppercase tracking-wider">
            Lacak Pesanan Sparepart
          </h1>
          <p className="text-xs text-neutral-400 max-w-md mx-auto mt-1 mb-6">
            Pantau status proses upgrade dan pengiriman part racing Anda secara transparan dan akurat.
          </p>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="max-w-xl mx-auto grid grid-cols-1 sm:grid-cols-12 gap-3 text-left">
            <div className="sm:col-span-6">
              <label className="block text-[11px] font-bold text-neutral-300 mb-1">
                Nomor Invoice <span className="text-[#E50914]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: INV-20261014-ABCD"
                value={invoiceInput}
                onChange={(e) => setInvoiceInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white uppercase placeholder-neutral-500 focus:outline-none focus:border-[#E50914]"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-[11px] font-bold text-neutral-300 mb-1">
                No. WhatsApp / Email
              </label>
              <input
                type="text"
                placeholder="0812-xxxx-xxxx"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#E50914]"
              />
            </div>

            <div className="sm:col-span-2 flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-[#E50914] hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-red-950/40"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{loading ? '...' : 'Cari'}</span>
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-950/40 border border-red-800 text-red-300 text-xs flex items-center justify-center gap-2 max-w-xl mx-auto">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Search Results Display */}
        {order && (
          <div className="bg-[#141414] border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-6 animate-in fade-in duration-200">
            {/* Top Order Summary */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
              <div>
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold">
                  Hasil Pelacakan
                </span>
                <h2 className="font-racing font-bold text-xl text-white tracking-wide mt-0.5">
                  {order.invoice_number}
                </h2>
                <span className="text-xs text-neutral-400">
                  Dipesan oleh: <strong className="text-white">{order.customer_name}</strong> •{' '}
                  {new Date(order.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  to={`/orders/${order.invoice_number}`}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Lihat Tagihan</span>
                </Link>
              </div>
            </div>

            {/* Tracking Progress Bar */}
            {order.status === 'CANCELLED' ? (
              <div className="p-4 rounded-xl bg-red-950/40 border border-red-800 text-center">
                <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <h3 className="font-racing font-bold text-base text-red-300 uppercase">
                  PESANAN DIBATALKAN / KEDALUWARSA
                </h3>
                <p className="text-xs text-neutral-400 max-w-md mx-auto mt-1">
                  Pesanan ini telah dibatalkan karena melewati batas waktu pembayaran atau dibatalkan oleh pengguna. Stok produk telah dikembalikan ke katalog.
                </p>
              </div>
            ) : (
              <div className="py-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative">
                  {stages.map((stage, idx) => {
                    const Icon = stage.icon;
                    const isDone = currentStage >= idx;
                    const isCurrent = currentStage === idx;

                    return (
                      <div
                        key={idx}
                        className={`relative p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                          isCurrent
                            ? 'bg-neutral-900 border-[#E50914] shadow-lg shadow-red-950/30'
                            : isDone
                            ? 'bg-neutral-900/60 border-neutral-700'
                            : 'bg-neutral-950/40 border-neutral-800 opacity-40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                              isCurrent
                                ? 'bg-[#E50914] text-white'
                                : isDone
                                ? 'bg-emerald-600 text-white'
                                : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          {isDone && (
                            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5">
                              <CheckCircle className="w-3 h-3" />
                              <span>Selesai</span>
                            </span>
                          )}
                        </div>

                        <div>
                          <h4
                            className={`text-xs font-bold leading-tight ${
                              isCurrent ? 'text-white' : isDone ? 'text-neutral-200' : 'text-neutral-500'
                            }`}
                          >
                            {stage.label}
                          </h4>
                          <p className="text-[10px] text-neutral-400 mt-1 leading-snug">
                            {stage.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Courier & Resi Banner */}
            {order.tracking_number ? (
              <div className="p-4 rounded-xl bg-sky-950/40 border border-sky-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
                    Kurir Pengiriman: {order.courier_name} ({order.courier_service})
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono font-bold text-base text-white">
                      {order.tracking_number}
                    </span>
                    <button
                      onClick={() => copyResi(order.tracking_number!)}
                      className="px-2 py-1 rounded bg-sky-900 hover:bg-sky-800 text-xs text-sky-200 font-bold flex items-center gap-1"
                    >
                      {copiedResi ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Salin Resi</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="text-xs text-sky-300">
                  Estimasi tiba: <strong>1 - 3 Hari Kerja</strong>
                </div>
              </div>
            ) : order.status === 'PAID' ? (
              <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 flex items-center gap-3">
                <Package className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <span>
                  Paket Anda sedang dipersiapkan dan di-packing oleh tim gudang Jawir Garage. Nomor resi kurir akan terbit setelah diserahkan ke kurir ({order.courier_name}).
                </span>
              </div>
            ) : null}

            {/* Items & Shipping Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Ringkasan Part yang Dipesan
                </span>
                <div className="space-y-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-xs">
                      <span className="text-neutral-300 truncate max-w-[70%]">
                        {item.quantity}x {item.product_name_snapshot}
                      </span>
                      <span className="font-bold text-white">{formatIDR(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-neutral-800 flex justify-between text-xs font-bold text-white">
                  <span>Total Tagihan:</span>
                  <span className="font-racing text-sm text-[#E50914]">{formatIDR(order.grand_total)}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2 text-xs">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Tujuan Pengiriman
                </span>
                <div className="flex items-start gap-2 text-neutral-300">
                  <MapPin className="w-4 h-4 text-[#E50914] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-white">{order.customer_name}</p>
                    <p className="text-neutral-400 text-[11px] leading-relaxed mt-0.5">
                      {order.shipping_address}
                    </p>
                    {(order.shipping_district || order.shipping_city) && (
                      <p className="text-neutral-400 text-[10px] mt-0.5">
                        {order.shipping_district}, {order.shipping_city}, {order.shipping_province}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
