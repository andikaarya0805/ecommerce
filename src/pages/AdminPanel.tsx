import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Product, Order, Voucher } from '../types';
import { formatIDR } from '../components/ProductCard';
import {
  TrendingUp,
  Package,
  AlertTriangle,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  Search,
  Plus,
  Trash2,
  Edit,
  Printer,
  ChevronRight,
  Eye,
  ArrowLeft,
  LogOut,
  RefreshCw,
  Ticket,
  ShoppingBag,
  ExternalLink,
  X
} from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'analytics' | 'orders' | 'products' | 'vouchers'>('orders');

  // Analytics State
  const [analytics, setAnalytics] = useState<any>({
    totalRevenue: 0,
    needShipping: 0,
    lowStockCount: 0,
    lowStockItems: [],
    totalOrders: 0,
  });

  // Orders OMS State
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');
  const [orderSearch, setOrderSearch] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [trackingNumberInput, setTrackingNumberInput] = useState<string>('');
  const [isPrintLabelOpen, setIsPrintLabelOpen] = useState(false);

  // Products CMS State
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState<string>('');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  // Vouchers CMS State
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [newVoucher, setNewVoucher] = useState<any>({
    code: '',
    title: '',
    subtitle: '',
    discount_type: 'FIXED',
    discount_value: 20000,
    minSpend: 150000,
    max_discount_amount: 50000,
    quota: 100,
    expiryText: 'Berlaku 7 Hari',
    badge: 'Spesial D2C',
  });

  const [loading, setLoading] = useState(true);

  // Initial authorization check
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
      return;
    }
    fetchAllAdminData();
  }, [user, navigate]);

  const fetchAllAdminData = async () => {
    setLoading(true);
    try {
      const [resAnalytics, resOrders, resProducts, resVouchers] = await Promise.all([
        fetch('/api/admin/analytics', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
        fetch('/api/admin/orders', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
        fetch('/api/admin/products', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
        fetch('/api/admin/vouchers', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      ]);

      setAnalytics(resAnalytics && typeof resAnalytics === 'object' && !resAnalytics.error ? resAnalytics : { totalRevenue: 0, needShipping: 0, lowStockCount: 0, lowStockItems: [], totalOrders: 0 });
      setOrders(Array.isArray(resOrders) ? resOrders : []);
      setProducts(Array.isArray(resProducts) ? resProducts : []);
      setVouchers(Array.isArray(resVouchers) ? resVouchers : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // OMS Status Handlers
  const handleUpdateOrderStatus = async (orderId: string, status: string, trackingNum?: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status,
          trackingNumber: trackingNum || trackingNumberInput,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengubah status pesanan');

      fetchAllAdminData();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) =>
          prev ? { ...prev, status: status as any, tracking_number: trackingNum || trackingNumberInput } : null
        );
      }
      setTrackingNumberInput('');
      alert(data.message || 'Status berhasil diperbarui!');
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleRequestBiteshipPickup = async (orderId: string) => {
    if (!confirm('Request pickup kurir ke Biteship Sandbox sekarang? Nomor resi akan otomatis terbit.')) return;
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/biteship-ship`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal request pickup Biteship');
      alert(`Berhasil! Nomor Resi Biteship: ${data.trackingNumber}`);
      fetchAllAdminData();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) =>
          prev ? { ...prev, status: 'SHIPPED', tracking_number: data.trackingNumber } : null
        );
      }
    } catch (err: any) {
      alert('Error Biteship: ' + err.message);
    }
  };

  // Product Handlers
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = Boolean(editingProduct?.id);
      const url = isEdit ? `/api/admin/products/${editingProduct.id}` : '/api/admin/products';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingProduct),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menyimpan produk');
      }

      setIsProductModalOpen(false);
      setEditingProduct(null);
      fetchAllAdminData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Yakin ingin menghapus produk ini secara permanen?')) return;
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchAllAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleProduct = async (id: string) => {
    try {
      await fetch(`/api/admin/products/${id}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchAllAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  // Voucher Handlers
  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/vouchers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newVoucher),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal membuat voucer');
      }

      setIsVoucherModalOpen(false);
      setNewVoucher({
        code: '',
        title: '',
        subtitle: '',
        discount_type: 'FIXED',
        discount_value: 20000,
        minSpend: 150000,
        max_discount_amount: 50000,
        quota: 100,
        expiryText: 'Berlaku 7 Hari',
        badge: 'Spesial D2C',
      });
      fetchAllAdminData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleDeleteVoucher = async (id: string) => {
    if (!confirm('Hapus kode voucer ini?')) return;
    try {
      await fetch(`/api/admin/vouchers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchAllAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleVoucher = async (id: string) => {
    try {
      await fetch(`/api/admin/vouchers/${id}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchAllAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered Orders
  const filteredOrders = orders.filter((o) => {
    const matchStatus = orderStatusFilter === 'ALL' || o.status === orderStatusFilter;
    const matchSearch =
      !orderSearch.trim() ||
      o.invoice_number.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.customer_name.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.customer_phone.includes(orderSearch);
    return matchStatus && matchSearch;
  });

  // Filtered Products
  const filteredProducts = products.filter(
    (p) =>
      !productSearch.trim() ||
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-carbon text-neutral-100 flex flex-col selection:bg-[#E50914] selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#121212]/95 backdrop-blur-md border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-1.5 group">
              <span className="font-racing font-extrabold text-lg tracking-wider text-white uppercase group-hover:text-red-400">
                JAWIR GARAGE
              </span>
              <span className="bg-[#E50914] text-white text-[9px] font-black px-1.5 py-0.5 rounded tracking-widest uppercase">
                ADMIN OMS
              </span>
            </Link>

            <div className="hidden sm:flex items-center gap-1 ml-6 bg-neutral-900 border border-neutral-800 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'orders' ? 'bg-[#E50914] text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Pesanan Masuk (OMS)
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'analytics' ? 'bg-[#E50914] text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Analitik Toko
              </button>
              <button
                onClick={() => setActiveTab('products')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'products' ? 'bg-[#E50914] text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Kelola Produk (CMS)
              </button>
              <button
                onClick={() => setActiveTab('vouchers')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'vouchers' ? 'bg-[#E50914] text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Voucer Promo
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchAllAdminData()}
              className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-3 py-1.5 rounded-lg border border-neutral-800 text-xs font-bold text-neutral-300 hover:bg-neutral-800 hover:text-white"
            >
              Lihat Toko
            </button>
            <button
              onClick={logout}
              className="px-3 py-1.5 rounded-lg bg-red-950/60 border border-red-800/80 text-xs font-bold text-red-400 hover:bg-red-800 hover:text-white flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="sm:hidden flex overflow-x-auto no-scrollbar px-4 py-2 border-t border-neutral-800 gap-2">
          {[
            { id: 'orders', label: 'Pesanan' },
            { id: 'analytics', label: 'Analitik' },
            { id: 'products', label: 'Produk' },
            { id: 'vouchers', label: 'Voucer' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3 py-1 text-xs font-bold rounded-lg whitespace-nowrap ${
                activeTab === t.id ? 'bg-[#E50914] text-white' : 'bg-neutral-900 text-neutral-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* ============================================================== */}
        {/* TAB 1: ANALYTICS DASHBOARD HOME (PRD Section 4.3 P2)           */}
        {/* ============================================================== */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-[#141414] border border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    Total Pendapatan Bersih
                  </span>
                  <h3 className="font-racing font-bold text-2xl text-emerald-400 mt-1">
                    {formatIDR(analytics.totalRevenue || 0)}
                  </h3>
                  <span className="text-[10px] text-neutral-500 mt-0.5 block">
                    Dari pesanan PAID & COMPLETED
                  </span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-950/60 border border-emerald-800/80 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-emerald-400" />
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#141414] border border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    Perlu Dikirim (PAID)
                  </span>
                  <h3 className="font-racing font-bold text-2xl text-amber-400 mt-1">
                    {analytics.needShipping} Pesanan
                  </h3>
                  <span className="text-[10px] text-neutral-500 mt-0.5 block">
                    Menunggu pengemasan & resi
                  </span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-950/60 border border-amber-800/80 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-400" />
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#141414] border border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    Peringatan Stok Menipis
                  </span>
                  <h3 className="font-racing font-bold text-2xl text-[#E50914] mt-1">
                    {analytics.lowStockCount} Part
                  </h3>
                  <span className="text-[10px] text-neutral-500 mt-0.5 block">
                    Stok tersisa di bawah 5 pcs
                  </span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-red-950/60 border border-red-800/80 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-[#E50914]" />
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#141414] border border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    Total Pesanan Masuk
                  </span>
                  <h3 className="font-racing font-bold text-2xl text-white mt-1">
                    {analytics.totalOrders} Order
                  </h3>
                  <span className="text-[10px] text-neutral-500 mt-0.5 block">
                    Seluruh status pesanan
                  </span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-neutral-300" />
                </div>
              </div>
            </div>

            {/* Low Stock Warning Table */}
            <div className="bg-[#141414] border border-neutral-800 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-racing font-bold text-base text-white uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#E50914]" />
                  Daftar Part Stok Kritis (&lt; 5 Pcs)
                </h4>
                <button
                  onClick={() => setActiveTab('products')}
                  className="text-xs text-[#E50914] font-bold hover:underline"
                >
                  Kelola di Katalog →
                </button>
              </div>

              {analytics.lowStockItems?.length === 0 ? (
                <p className="text-xs text-neutral-500 py-4 text-center">
                  Semua stok produk dalam kondisi aman (tidak ada yang &lt; 5 pcs).
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-900 text-neutral-400 border-b border-neutral-800">
                      <tr>
                        <th className="p-3">Nama Produk</th>
                        <th className="p-3">Kategori</th>
                        <th className="p-3">Harga</th>
                        <th className="p-3">Sisa Stok</th>
                        <th className="p-3 text-right">Aksi Cepat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {analytics.lowStockItems.map((p: any) => (
                        <tr key={p.id} className="hover:bg-neutral-900/50">
                          <td className="p-3 font-semibold text-white">{p.name}</td>
                          <td className="p-3 text-neutral-400 uppercase">{p.category}</td>
                          <td className="p-3 font-racing text-[#E50914]">{formatIDR(p.price)}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded bg-red-950 text-red-300 font-bold border border-red-800">
                              {p.stock} pcs
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => {
                                setEditingProduct(p);
                                setIsProductModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-white font-bold"
                            >
                              Restock
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: ORDER MANAGEMENT SYSTEM (OMS) (PRD Section 4.3 P0)      */}
        {/* ============================================================== */}
        {activeTab === 'orders' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Filter Controls & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#141414] border border-neutral-800 p-3.5 rounded-2xl">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                {[
                  { id: 'ALL', label: 'Semua' },
                  { id: 'PENDING', label: 'Belum Dibayar' },
                  { id: 'PAID', label: 'Perlu Dikirim' },
                  { id: 'SHIPPED', label: 'Dikirim' },
                  { id: 'COMPLETED', label: 'Selesai' },
                  { id: 'CANCELLED', label: 'Batal' },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setOrderStatusFilter(st.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                      orderStatusFilter === st.id
                        ? 'bg-[#E50914] text-white'
                        : 'bg-neutral-900 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Cari invoice, nama, no HP..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="w-full sm:w-64 pl-8 pr-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-[#E50914]"
                />
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-[#141414] border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-900 text-neutral-400 border-b border-neutral-800 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3.5">Invoice</th>
                      <th className="p-3.5">Customer</th>
                      <th className="p-3.5">Kurir</th>
                      <th className="p-3.5">Total Bayar</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Waktu</th>
                      <th className="p-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/80">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-neutral-500">
                          Tidak ada pesanan yang sesuai dengan filter.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-neutral-900/40">
                          <td className="p-3.5 font-racing font-bold text-white tracking-wide">
                            {ord.invoice_number}
                          </td>
                          <td className="p-3.5">
                            <span className="font-bold text-white block">{ord.customer_name}</span>
                            <span className="text-neutral-400 text-[11px]">{ord.customer_phone}</span>
                          </td>
                          <td className="p-3.5">
                            <span className="text-neutral-200 block font-medium">
                              {ord.courier_name}
                            </span>
                            <span className="text-neutral-400 text-[10px]">{ord.courier_service}</span>
                          </td>
                          <td className="p-3.5 font-racing text-sm text-[#E50914] font-bold">
                            {formatIDR(ord.grand_total)}
                          </td>
                          <td className="p-3.5">
                            {ord.status === 'PENDING' && (
                              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-600/60">
                                Belum Bayar
                              </span>
                            )}
                            {ord.status === 'PAID' && (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-600/60">
                                Perlu Dikirim
                              </span>
                            )}
                            {ord.status === 'SHIPPED' && (
                              <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold border border-sky-600/60">
                                Dikirim
                              </span>
                            )}
                            {ord.status === 'COMPLETED' && (
                              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-600/60">
                                Selesai
                              </span>
                            )}
                            {ord.status === 'CANCELLED' && (
                              <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-bold border border-red-600/60">
                                Batal
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-neutral-400 text-[11px]">
                            {new Date(ord.created_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => {
                                setSelectedOrder(ord);
                                setTrackingNumberInput(ord.tracking_number || '');
                              }}
                              className="px-3 py-1.5 bg-neutral-800 hover:bg-[#E50914] hover:text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Kelola</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: PRODUCT MANAGEMENT (CMS) (PRD Section 4.3 P0)           */}
        {/* ============================================================== */}
        {activeTab === 'products' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#141414] border border-neutral-800 p-4 rounded-2xl">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Cari part racing, kategori..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-[#E50914]"
                />
              </div>

              <button
                onClick={() => {
                  setEditingProduct({
                    name: '',
                    category: 'cvt',
                    compatibilityText: 'Universal Matic',
                    fitmentTag: 'Plug & Play (PnP)',
                    price: 150000,
                    originalPrice: 200000,
                    discountPercent: 25,
                    promoTag: 'Promo Baru',
                    rating: 5.0,
                    soldCount: 0,
                    stock: 20,
                    weight_grams: 500,
                    originCity: 'Jakarta Timur',
                    image: '/images/default.jpg',
                    description: '',
                    specs: {},
                    isPromo: true,
                    isPaketUpgrade: false,
                    isActive: true,
                  });
                  setIsProductModalOpen(true);
                }}
                className="px-4 py-2 bg-[#E50914] hover:bg-red-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-md shadow-red-950/40 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Produk Baru</span>
              </button>
            </div>

            {/* Products Table */}
            <div className="bg-[#141414] border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-900 text-neutral-400 border-b border-neutral-800 uppercase text-[10px]">
                    <tr>
                      <th className="p-3.5">Produk</th>
                      <th className="p-3.5">Kategori</th>
                      <th className="p-3.5">Harga</th>
                      <th className="p-3.5">Stok</th>
                      <th className="p-3.5">Status Aktif</th>
                      <th className="p-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/80">
                    {filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-neutral-900/40">
                        <td className="p-3.5 flex items-center gap-3">
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-10 h-10 rounded object-cover bg-black flex-shrink-0"
                          />
                          <div>
                            <span className="font-bold text-white block max-w-xs truncate">{p.name}</span>
                            <span className="text-[10px] text-neutral-400">{p.fitmentTag}</span>
                          </div>
                        </td>
                        <td className="p-3.5 uppercase text-neutral-300 font-semibold">{p.category}</td>
                        <td className="p-3.5 font-racing text-sm text-[#E50914] font-bold">
                          {formatIDR(p.price)}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded font-bold ${
                              p.stock < 5
                                ? 'bg-red-950 text-red-300 border border-red-800'
                                : 'bg-neutral-800 text-neutral-200'
                            }`}
                          >
                            {p.stock} pcs
                          </span>
                        </td>
                        <td className="p-3.5">
                          <button
                            onClick={() => handleToggleProduct(p.id)}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                              p.is_active !== false
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/60'
                                : 'bg-neutral-800 text-neutral-500 border border-neutral-700'
                            }`}
                          >
                            {p.is_active !== false ? 'Aktif (Tayang)' : 'Nonaktif (Draft)'}
                          </button>
                        </td>
                        <td className="p-3.5 text-right space-x-1.5">
                          <button
                            onClick={() => {
                              setEditingProduct(p);
                              setIsProductModalOpen(true);
                            }}
                            className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            className="p-1.5 rounded bg-red-950/60 hover:bg-red-900 text-red-400"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: VOUCHER MANAGEMENT (PRD Section 4.3 P1)                  */}
        {/* ============================================================== */}
        {activeTab === 'vouchers' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between bg-[#141414] border border-neutral-800 p-4 rounded-2xl">
              <div>
                <h3 className="font-racing font-bold text-base text-white uppercase tracking-wider">
                  Daftar Voucer Promo Toko
                </h3>
                <p className="text-xs text-neutral-400">
                  Kelola kode voucer, minimal belanja, dan batas kuota pemakaian pelanggan.
                </p>
              </div>

              <button
                onClick={() => setIsVoucherModalOpen(true)}
                className="px-4 py-2 bg-[#E50914] hover:bg-red-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md shadow-red-950/40 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Kode Voucer</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vouchers.map((v) => (
                <div
                  key={v.id}
                  className="bg-[#141414] border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between space-y-3 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono font-bold text-sm text-[#E50914] bg-red-950/60 border border-red-800 px-2 py-0.5 rounded">
                        {v.code}
                      </span>
                      <h4 className="font-bold text-white text-sm mt-2">{v.title}</h4>
                      <p className="text-[11px] text-neutral-400">{v.subtitle}</p>
                    </div>

                    <button
                      onClick={() => handleToggleVoucher(v.id)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        v.is_active !== 0
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500'
                          : 'bg-neutral-800 text-neutral-500'
                      }`}
                    >
                      {v.is_active !== 0 ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </div>

                  <div className="text-xs space-y-1 text-neutral-300 pt-2 border-t border-neutral-800">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Min. Belanja:</span>
                      <span>{formatIDR(v.minSpend || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Kuota Terpakai:</span>
                      <span className="font-bold text-white">
                        {v.used_count || 0} / {v.quota || 100}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[10px] text-neutral-500">{v.expiryText}</span>
                    <button
                      onClick={() => handleDeleteVoucher(v.id)}
                      className="text-neutral-500 hover:text-red-400 p-1"
                      title="Hapus Voucer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* MODAL: ORDER DETAILS & SHIPPED ACTION (OMS)                    */}
      {/* ============================================================== */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-[#141414] border border-neutral-800 rounded-2xl shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto no-scrollbar">
            <button
              onClick={() => setSelectedOrder(null)}
              className="absolute top-4 right-4 p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                  Detail Pesanan OMS
                </span>
                <h3 className="font-racing font-bold text-xl text-white">
                  {selectedOrder.invoice_number}
                </h3>
              </div>
              <div className="mr-8">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-neutral-900 border border-neutral-700 text-white">
                  Status: {selectedOrder.status}
                </span>
              </div>
            </div>

            {/* Customer & Shipping info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
                <span className="text-[10px] font-bold uppercase text-neutral-400 block">
                  Penerima
                </span>
                <p className="font-bold text-white text-sm">{selectedOrder.customer_name}</p>
                <p className="text-neutral-300">{selectedOrder.customer_phone}</p>
                {selectedOrder.customer_email && (
                  <p className="text-neutral-500">{selectedOrder.customer_email}</p>
                )}
              </div>

              <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
                <span className="text-[10px] font-bold uppercase text-neutral-400 block">
                  Kurir & Pengiriman
                </span>
                <p className="font-bold text-white">
                  {selectedOrder.courier_name} ({selectedOrder.courier_service})
                </p>
                <p className="text-neutral-300 text-[11px] leading-relaxed">
                  {selectedOrder.shipping_address}
                </p>
              </div>
            </div>

            {/* Items list */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider block">
                Item Pesanan
              </span>
              <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2 text-xs">
                {selectedOrder.items?.map((it) => (
                  <div key={it.id} className="flex justify-between items-center py-1 border-b border-neutral-800/60 last:border-0">
                    <span className="text-white">
                      {it.quantity}x {it.product_name_snapshot}
                    </span>
                    <span className="font-racing text-neutral-200">{formatIDR(it.subtotal)}</span>
                  </div>
                ))}
                <div className="pt-2 flex justify-between font-bold text-sm text-white">
                  <span>Grand Total:</span>
                  <span className="font-racing text-base text-[#E50914]">
                    {formatIDR(selectedOrder.grand_total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Resi & Status Update Controls */}
            <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-3">
              <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider block">
                Tindakan Operasional & Pengiriman
              </span>

              {selectedOrder.status === 'PAID' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-orange-950/40 border border-orange-900/50 space-y-2">
                    <span className="text-[10px] text-orange-400 font-bold uppercase tracking-wider block flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-orange-400" />
                      Biteship Sandbox Logistics
                    </span>
                    <button
                      onClick={() => handleRequestBiteshipPickup(selectedOrder.id)}
                      className="w-full py-2.5 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-orange-950/40 cursor-pointer transition-all"
                    >
                      <Package className="w-4 h-4" />
                      <span>Request Pickup Biteship (Resi Otomatis)</span>
                    </button>
                    <span className="text-[10px] text-neutral-400 block text-center">
                      Booking kurir {selectedOrder.courier_name} langsung ke Biteship API
                    </span>
                  </div>

                  <div className="pt-1 border-t border-neutral-800">
                    <label className="block text-[11px] font-bold text-neutral-300 mb-1">
                      Atau Input Nomor Resi Manual ({selectedOrder.courier_name})
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: JNE89823984210"
                      value={trackingNumberInput}
                      onChange={(e) => setTrackingNumberInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-black border border-neutral-700 text-xs text-white focus:outline-none focus:border-[#E50914]"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'SHIPPED')}
                      className="flex-1 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Truck className="w-4 h-4" />
                      <span>Kirim Pesanan (SHIPPED)</span>
                    </button>
                    <button
                      onClick={() => setIsPrintLabelOpen(true)}
                      className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Cetak Label A6</span>
                    </button>
                  </div>
                </div>
              )}

              {selectedOrder.status === 'SHIPPED' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'COMPLETED')}
                    className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Tandai Selesai (COMPLETED)</span>
                  </button>
                  <button
                    onClick={() => setIsPrintLabelOpen(true)}
                    className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Cetak Label A6</span>
                  </button>
                </div>
              )}

              {selectedOrder.status === 'PENDING' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'PAID')}
                    className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                  >
                    Konfirmasi Pembayaran Manual (PAID)
                  </button>
                  <button
                    onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'CANCELLED')}
                    className="px-4 py-2 rounded-lg bg-red-950 border border-red-800 text-red-400 text-xs font-bold"
                  >
                    Batalkan Order
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CETAK LABEL PENGIRIMAN A6 (PRD Section 4.3 P0)          */}
      {/* ============================================================== */}
      {isPrintLabelOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="relative w-full max-w-md bg-white text-black rounded-2xl shadow-2xl p-6 space-y-4">
            <button
              onClick={() => setIsPrintLabelOpen(false)}
              className="absolute top-3 right-3 p-1 rounded-full text-neutral-500 hover:text-black hover:bg-neutral-200"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Printable Label Sheet */}
            <div id="shipping-label-a6" className="border-2 border-dashed border-neutral-400 p-4 rounded-xl space-y-3 font-sans">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <h2 className="font-black text-sm uppercase tracking-wider">JAWIR GARAGE SPEEDSHOP</h2>
                  <p className="text-[10px] text-neutral-600">Jakarta Timur • 0812-3456-7890</p>
                </div>
                <div className="text-right">
                  <span className="font-black text-base uppercase bg-black text-white px-2 py-0.5 rounded">
                    {selectedOrder.courier_name.slice(0, 3)}
                  </span>
                  <p className="text-[9px] font-bold text-neutral-600 mt-0.5">{selectedOrder.courier_service}</p>
                </div>
              </div>

              {/* Barcode Mock */}
              <div className="text-center py-1 border-b">
                <div className="font-mono text-[9px] tracking-widest text-neutral-500">NO. INVOICE</div>
                <div className="font-mono font-black text-sm tracking-widest">{selectedOrder.invoice_number}</div>
                {selectedOrder.tracking_number && (
                  <div className="font-mono text-xs font-bold text-neutral-800 mt-1">
                    RESI: {selectedOrder.tracking_number}
                  </div>
                )}
              </div>

              {/* Receiver Info */}
              <div className="text-xs space-y-1 border-b pb-2">
                <span className="text-[10px] font-black uppercase text-neutral-500">PENERIMA:</span>
                <p className="font-bold text-sm text-black">{selectedOrder.customer_name}</p>
                <p className="text-neutral-700 leading-snug">{selectedOrder.shipping_address}</p>
                <p className="font-bold text-neutral-800">Telp: {selectedOrder.customer_phone}</p>
              </div>

              {/* Items List */}
              <div className="text-[10px] space-y-1">
                <span className="font-black uppercase text-neutral-500">ISI PAKET:</span>
                <ul className="list-disc pl-4 space-y-0.5">
                  {selectedOrder.items?.map((it) => (
                    <li key={it.id}>
                      {it.quantity}x {it.product_name_snapshot}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-lg bg-[#E50914] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Sekarang (Print)</span>
              </button>
              <button
                onClick={() => setIsPrintLabelOpen(false)}
                className="px-4 py-2.5 rounded-lg bg-neutral-200 text-neutral-700 font-bold text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: TAMBAH / EDIT PRODUK (CMS)                              */}
      {/* ============================================================== */}
      {isProductModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-[#141414] border border-neutral-800 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar">
            <button
              onClick={() => {
                setIsProductModalOpen(false);
                setEditingProduct(null);
              }}
              className="absolute top-4 right-4 p-1 rounded-lg text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-racing font-bold text-lg text-white uppercase tracking-wider">
              {editingProduct.id ? 'Edit Part Racing' : 'Tambah Part Racing Baru'}
            </h3>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-300 font-bold mb-1">Nama Produk</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-white focus:outline-none focus:border-[#E50914]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-300 font-bold mb-1">Kategori</label>
                  <select
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-white focus:outline-none focus:border-[#E50914]"
                  >
                    <option value="paket-upgrade">Paket Upgrade</option>
                    <option value="cvt">CVT Part</option>
                    <option value="pengereman">Pengereman</option>
                    <option value="kaki-kaki">Kaki-Kaki & Shock</option>
                    <option value="mesin">Mesin & Knalpot</option>
                    <option value="aksesoris">Aksesoris</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-300 font-bold mb-1">Fitment Tag</label>
                  <input
                    type="text"
                    value={editingProduct.fitmentTag}
                    onChange={(e) => setEditingProduct({ ...editingProduct, fitmentTag: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-white focus:outline-none focus:border-[#E50914]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-neutral-300 font-bold mb-1">Harga (Rp)</label>
                  <input
                    type="number"
                    required
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-white focus:outline-none focus:border-[#E50914]"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 font-bold mb-1">Stok Pcs</label>
                  <input
                    type="number"
                    required
                    value={editingProduct.stock}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-white focus:outline-none focus:border-[#E50914]"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 font-bold mb-1">Berat (Gram)</label>
                  <input
                    type="number"
                    required
                    value={editingProduct.weight_grams || 500}
                    onChange={(e) => setEditingProduct({ ...editingProduct, weight_grams: parseInt(e.target.value) || 500 })}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-white focus:outline-none focus:border-[#E50914]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-300 font-bold mb-1">URL Foto Produk</label>
                <input
                  type="text"
                  value={editingProduct.image}
                  onChange={(e) => setEditingProduct({ ...editingProduct, image: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-white focus:outline-none focus:border-[#E50914]"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-bold mb-1">Deskripsi Lengkap</label>
                <textarea
                  rows={3}
                  value={editingProduct.description}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-white focus:outline-none focus:border-[#E50914]"
                />
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.isPromo}
                    onChange={(e) => setEditingProduct({ ...editingProduct, isPromo: e.target.checked })}
                    className="rounded text-[#E50914]"
                  />
                  <span>Tampilkan di Promo Flash</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.isActive !== false}
                    onChange={(e) => setEditingProduct({ ...editingProduct, isActive: e.target.checked })}
                    className="rounded text-[#E50914]"
                  />
                  <span>Status Aktif di Katalog</span>
                </label>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-[#E50914] hover:bg-red-700 text-white font-bold cursor-pointer"
                >
                  Simpan Produk
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsProductModalOpen(false);
                    setEditingProduct(null);
                  }}
                  className="px-4 py-2.5 rounded-lg bg-neutral-800 text-neutral-300 font-bold"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: BUAT VOUCER BARU                                        */}
      {/* ============================================================== */}
      {isVoucherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-[#141414] border border-neutral-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <button
              onClick={() => setIsVoucherModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-racing font-bold text-lg text-white uppercase tracking-wider">
              Buat Kode Voucer Baru
            </h3>

            <form onSubmit={handleCreateVoucher} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-300 font-bold mb-1">Kode Voucer (KAPITAL)</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: SPEEDSHOP50"
                  value={newVoucher.code}
                  onChange={(e) => setNewVoucher({ ...newVoucher, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-white font-mono uppercase focus:outline-none focus:border-[#E50914]"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-bold mb-1">Judul Promo</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Potongan Rp50.000"
                  value={newVoucher.title}
                  onChange={(e) => setNewVoucher({ ...newVoucher, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-white focus:outline-none focus:border-[#E50914]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-300 font-bold mb-1">Tipe Diskon</label>
                  <select
                    value={newVoucher.discount_type}
                    onChange={(e) => setNewVoucher({ ...newVoucher, discount_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-white focus:outline-none focus:border-[#E50914]"
                  >
                    <option value="FIXED">Nominal Tetap (Rp)</option>
                    <option value="PERCENT">Persentase (%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-300 font-bold mb-1">Nilai Diskon</label>
                  <input
                    type="number"
                    required
                    value={newVoucher.discount_value}
                    onChange={(e) =>
                      setNewVoucher({ ...newVoucher, discount_value: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-white focus:outline-none focus:border-[#E50914]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-300 font-bold mb-1">Min. Belanja (Rp)</label>
                  <input
                    type="number"
                    value={newVoucher.minSpend}
                    onChange={(e) => setNewVoucher({ ...newVoucher, minSpend: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-white focus:outline-none focus:border-[#E50914]"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 font-bold mb-1">Batas Kuota Pemakaian</label>
                  <input
                    type="number"
                    value={newVoucher.quota}
                    onChange={(e) => setNewVoucher({ ...newVoucher, quota: parseInt(e.target.value) || 100 })}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-white focus:outline-none focus:border-[#E50914]"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-[#E50914] hover:bg-red-700 text-white font-bold cursor-pointer"
                >
                  Aktifkan Voucer
                </button>
                <button
                  type="button"
                  onClick={() => setIsVoucherModalOpen(false)}
                  className="px-4 py-2.5 rounded-lg bg-neutral-800 text-neutral-300 font-bold"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
