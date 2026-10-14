import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatIDR } from '../components/ProductCard';
import { Order } from '../types';
import {
  ShoppingBag,
  Store,
  Truck,
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  Package,
  Search,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  MessageCircle,
  RotateCcw,
  AlertCircle,
  Copy,
  Check,
  Coins
} from 'lucide-react';
import { safeFetchJson } from '../config/api';

type TabStatus = 'ALL' | 'PENDING' | 'PAID' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';

export const OrderHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, token } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Tab: ALL | PENDING | PAID | SHIPPED | COMPLETED | CANCELLED
  const initialTab = (searchParams.get('tab') as TabStatus) || 'ALL';
  const [activeTab, setActiveTab] = useState<TabStatus>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedResi, setCopiedResi] = useState<string | null>(null);

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
      .catch((e) => console.log('Payment config notice:', e.message));
  }, []);

  const fetchUserOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!user || !token) {
        // If guest, redirect to login or show guest lookup
        setOrders([]);
        setLoading(false);
        return;
      }

      if (token.startsWith('demo-')) {
        // In demo mode without backend, return empty list or mock order
        setOrders([]);
        setLoading(false);
        return;
      }

      const data = await safeFetchJson<any[]>('/api/user/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });

      setOrders(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Terjadi kesalahan saat memuat pesanan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserOrders();
  }, [user, token]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedResi(id);
    setTimeout(() => setCopiedResi(null), 2000);
  };

  // Open Midtrans Snap popup directly for pending order
  const handlePayNow = (ord: Order) => {
    if (ord.payment_method?.toLowerCase() === 'cod') {
      navigate(`/orders/${ord.invoice_number}`);
      return;
    }

    if (ord.snap_token && (window as any).snap) {
      (window as any).snap.pay(ord.snap_token, {
        onSuccess: (result: any) => {
          console.log('[Snap Success]', result);
          fetchUserOrders();
        },
        onPending: (result: any) => {
          console.log('[Snap Pending]', result);
          fetchUserOrders();
        },
        onError: (err: any) => {
          console.error('[Snap Error]', err);
          alert('Pembayaran gagal atau dibatalkan.');
        },
        onClose: () => {
          fetchUserOrders();
        },
      });
    } else {
      navigate(`/orders/${ord.invoice_number}`);
    }
  };

  // Tab definitions matching Shopee's "Pesanan Saya"
  const tabs: { id: TabStatus; label: string; count: number }[] = [
    { id: 'ALL', label: 'Semua', count: orders.length },
    {
      id: 'PENDING',
      label: 'Belum Bayar',
      count: orders.filter((o) => o.status === 'PENDING').length,
    },
    {
      id: 'PAID',
      label: 'Sedang Dikemas',
      count: orders.filter((o) => o.status === 'PAID').length,
    },
    {
      id: 'SHIPPED',
      label: 'Dikirim',
      count: orders.filter((o) => o.status === 'SHIPPED').length,
    },
    {
      id: 'COMPLETED',
      label: 'Selesai',
      count: orders.filter((o) => o.status === 'COMPLETED').length,
    },
    {
      id: 'CANCELLED',
      label: 'Dibatalkan',
      count: orders.filter((o) => o.status === 'CANCELLED').length,
    },
  ];

  // Filtered orders based on active tab & search
  const filteredOrders = orders.filter((ord) => {
    const matchTab = activeTab === 'ALL' || ord.status === activeTab;
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      ord.invoice_number.toLowerCase().includes(q) ||
      ord.items?.some((it) => it.product_name_snapshot.toLowerCase().includes(q)) ||
      (ord.courier_name && ord.courier_name.toLowerCase().includes(q)) ||
      (ord.tracking_number && ord.tracking_number.toLowerCase().includes(q));

    return matchTab && matchSearch;
  });

  return (
    <div className="min-h-screen bg-[#F5F5F5] dark:bg-[#0D0D0D] text-neutral-800 dark:text-neutral-100 flex flex-col font-sans">
      {/* Shopee Style Top Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-[#141414] border-b border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <span className="font-racing font-black text-xl sm:text-2xl tracking-wider text-[#EE4D2D]">
                JAWIR SPEEDSHOP
              </span>
            </Link>
            <div className="h-5 w-[1px] bg-neutral-300 dark:bg-neutral-700 hidden sm:block" />
            <h1 className="text-base sm:text-lg font-bold text-neutral-800 dark:text-white hidden sm:block">
              Pesanan Saya
            </h1>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <Link
              to="/"
              className="flex items-center gap-1 text-[#EE4D2D] font-bold hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali Belanja</span>
            </Link>
          </div>
        </div>

        {/* Shopee 6 Tab Bar */}
        <div className="border-t border-neutral-100 dark:border-neutral-800/80 bg-white dark:bg-[#141414]">
          <div className="max-w-5xl mx-auto px-2 flex items-center justify-between overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative py-3.5 px-3 sm:px-5 text-xs sm:text-sm font-medium whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'text-[#EE4D2D] font-bold'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive
                          ? 'bg-[#EE4D2D] text-white'
                          : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#EE4D2D]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-4 py-4 space-y-4">
        {/* Search In Orders */}
        <div className="bg-white dark:bg-[#141414] rounded-lg border border-neutral-200 dark:border-neutral-800 p-2.5 shadow-sm flex items-center gap-2">
          <Search className="w-4 h-4 text-neutral-400 ml-2 flex-shrink-0" />
          <input
            type="text"
            placeholder="Cari berdasarkan No. Invoice, Nama Produk, atau Kurir..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-transparent text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 mr-2"
            >
              Hapus
            </button>
          )}
        </div>

        {/* Not Logged In State */}
        {!user && (
          <div className="bg-white dark:bg-[#141414] rounded-lg border border-neutral-200 dark:border-neutral-800 p-8 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900 flex items-center justify-center mx-auto text-[#EE4D2D]">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-1">
                Silakan Login Terlebih Dahulu
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md mx-auto leading-relaxed">
                Masuk ke akun Anda untuk melihat seluruh riwayat transaksi, lacak paket pengiriman, dan kelola pembayaran pesanan Anda.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => navigate('/login?redirect=/orders')}
                className="px-6 py-2.5 rounded bg-[#EE4D2D] hover:bg-[#D73211] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Login Sekarang
              </button>
              <button
                onClick={() => navigate('/track-order')}
                className="px-5 py-2.5 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-bold transition-all cursor-pointer"
              >
                Lacak Resi via Nomor Invoice
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {user && loading && (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-[#EE4D2D] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Memuat data pesanan Anda...
            </p>
          </div>
        )}

        {/* Empty State */}
        {user && !loading && filteredOrders.length === 0 && (
          <div className="bg-white dark:bg-[#141414] rounded-lg border border-neutral-200 dark:border-neutral-800 py-16 px-4 text-center space-y-4 shadow-sm">
            <div className="w-20 h-20 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
              <Package className="w-10 h-10 stroke-[1.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-1">
                Belum Ada Pesanan
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto">
                {searchQuery
                  ? `Tidak ada pesanan yang sesuai dengan kata kunci "${searchQuery}".`
                  : 'Anda belum memiliki riwayat transaksi pada kategori ini. Yuk cari part motor impian Anda sekarang!'}
              </p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2.5 rounded bg-[#EE4D2D] hover:bg-[#D73211] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              Mulai Belanja Sekarang
            </button>
          </div>
        )}

        {/* Order Cards List (Shopee Style) */}
        {user && !loading && filteredOrders.length > 0 && (
          <div className="space-y-3.5">
            {filteredOrders.map((ord) => {
              const isCod = ord.payment_method?.toLowerCase() === 'cod';
              const totalItemsCount = ord.items?.reduce((s, i) => s + i.quantity, 0) || 1;

              return (
                <div
                  key={ord.id}
                  className="bg-white dark:bg-[#141414] rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden"
                >
                  {/* Store Header & Status */}
                  <div className="p-3.5 sm:p-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#EE4D2D] text-white text-[9px] font-black px-1.5 py-0.2 rounded uppercase tracking-wider">
                        Mall
                      </span>
                      <Store className="w-3.5 h-3.5 text-[#EE4D2D]" />
                      <span className="font-bold text-xs text-neutral-900 dark:text-white">
                        JAWIR RACING SPEEDSHOP
                      </span>
                      <span className="text-[11px] text-neutral-400 hidden sm:inline">
                        • {ord.invoice_number}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-1.5">
                      {ord.status === 'PENDING' && (
                        <span className="text-[#EE4D2D] font-bold text-xs flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{isCod ? 'Menunggu Pengiriman (COD)' : 'Belum Bayar'}</span>
                        </span>
                      )}
                      {ord.status === 'PAID' && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Sedang Dikemas</span>
                        </span>
                      )}
                      {ord.status === 'SHIPPED' && (
                        <span className="text-sky-600 dark:text-sky-400 font-bold text-xs flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5" />
                          <span>Sedang Dikirim</span>
                        </span>
                      )}
                      {ord.status === 'COMPLETED' && (
                        <span className="text-purple-600 dark:text-purple-400 font-bold text-xs flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Selesai</span>
                        </span>
                      )}
                      {ord.status === 'CANCELLED' && (
                        <span className="text-red-500 font-bold text-xs flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Dibatalkan</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Resi banner if SHIPPED */}
                  {ord.status === 'SHIPPED' && ord.tracking_number && (
                    <div className="px-4 py-2 bg-sky-50 dark:bg-sky-950/30 border-b border-sky-100 dark:border-sky-900/50 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1.5">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-sky-600 dark:text-sky-400 flex-shrink-0" />
                        <span className="text-neutral-700 dark:text-neutral-300">
                          Resi: <strong className="font-mono text-neutral-900 dark:text-white">{ord.tracking_number}</strong> ({ord.courier_name} {ord.courier_service})
                        </span>
                        <button
                          onClick={() => copyToClipboard(ord.tracking_number!, ord.id)}
                          className="p-1 text-sky-600 hover:text-sky-700"
                          title="Salin Resi"
                        >
                          {copiedResi === ord.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      <Link
                        to={`/track-order?invoice=${ord.invoice_number}`}
                        className="text-[#EE4D2D] font-bold hover:underline"
                      >
                        Lacak Pengiriman →
                      </Link>
                    </div>
                  )}

                  {/* Product items in this order */}
                  <div
                    onClick={() => navigate(`/orders/${ord.invoice_number}`)}
                    className="p-4 space-y-3 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition-colors"
                  >
                    {ord.items && ord.items.length > 0 ? (
                      ord.items.map((it) => (
                        <div key={it.id} className="flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-16 h-16 rounded border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center flex-shrink-0 overflow-hidden">
                              <ShoppingBag className="w-6 h-6 text-neutral-400" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-neutral-900 dark:text-white truncate">
                                {it.product_name_snapshot}
                              </h4>
                              <span className="text-[11px] text-neutral-400 block mt-0.5">
                                Jumlah: x{it.quantity}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-medium text-neutral-800 dark:text-neutral-200">
                              {formatIDR(it.price_snapshot)}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-neutral-900 dark:text-white">
                          Pesanan {ord.invoice_number}
                        </span>
                        <span>{formatIDR(ord.grand_total)}</span>
                      </div>
                    )}
                  </div>

                  {/* Order Total Bar */}
                  <div className="p-3.5 sm:p-4 bg-neutral-50 dark:bg-neutral-900/60 border-t border-neutral-100 dark:border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="text-neutral-500 dark:text-neutral-400 text-[11px]">
                      Metode: <strong className="text-neutral-800 dark:text-neutral-200 uppercase">{ord.payment_method}</strong>
                      {isCod && ' (Tunai ke Kurir)'}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 text-sm">
                      <span className="text-neutral-600 dark:text-neutral-400 text-xs">
                        Total Pesanan ({totalItemsCount} Produk):
                      </span>
                      <span className="font-racing font-bold text-base text-[#EE4D2D]">
                        {formatIDR(ord.grand_total)}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons Footer */}
                  <div className="p-3 sm:p-4 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-end gap-2">
                    {/* View Details Button */}
                    <button
                      onClick={() => navigate(`/orders/${ord.invoice_number}`)}
                      className="px-3.5 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-medium transition-colors cursor-pointer"
                    >
                      Rincian Tagihan
                    </button>

                    {/* Pending Actions */}
                    {ord.status === 'PENDING' && (
                      isCod ? (
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-xs font-bold border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                            <Coins className="w-3.5 h-3.5" />
                            <span>Siapkan Tunai ({formatIDR(ord.grand_total)})</span>
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handlePayNow(ord)}
                          className="px-5 py-1.5 rounded bg-[#EE4D2D] hover:bg-[#D73211] active:scale-95 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Bayar Sekarang</span>
                        </button>
                      )
                    )}

                    {/* Paid Actions */}
                    {ord.status === 'PAID' && (
                      <a
                        href={`https://wa.me/6281234567890?text=Halo%20Jawir%20Garage,%20saya%20ingin%20tanya%20status%20pengemasan%20invoice%20${encodeURIComponent(ord.invoice_number)}.`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Chat Penjual</span>
                      </a>
                    )}

                    {/* Shipped Actions */}
                    {ord.status === 'SHIPPED' && (
                      <button
                        onClick={() => navigate(`/track-order?invoice=${ord.invoice_number}`)}
                        className="px-4 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Lacak Pesanan</span>
                      </button>
                    )}

                    {/* Completed / Cancelled Actions */}
                    {(ord.status === 'COMPLETED' || ord.status === 'CANCELLED') && (
                      <button
                        onClick={() => navigate('/')}
                        className="px-4 py-1.5 rounded bg-[#EE4D2D] hover:bg-[#D73211] text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Beli Lagi</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
