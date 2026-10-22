import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Product, Order, Voucher, ChatRoom, ChatMessage } from '../types';
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
  X,
  Layers,
  Tag,
  Percent,
  SlidersHorizontal,
  Info,
  Sparkles,
  Check,
  MessageCircle,
  Bot,
  Send,
  User,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  UploadCloud,
  Image as ImageIcon
} from 'lucide-react';
import { safeFetchJson } from '../config/api';
import { INITIAL_PRODUCTS, INITIAL_VOUCHERS } from '../data/products';
import { getProductPriceRange } from '../data/productVariations';
import { toast, confirmModal } from '../context/ToastContext';
import { OFFICIAL_CATEGORIES, normalizeCategory, getCategoryLabel } from '../data/categories';

export interface AdminVarOption {
  name: string;
  price?: number | '';
  stock?: number | '';
}

export interface AdminVarGroup {
  name: string;
  options: AdminVarOption[];
}

const BIKE_OPTIONS = [
  { id: 'vario-pcx', label: 'Vario & PCX' },
  { id: 'nmax-aerox', label: 'NMAX & Aerox' },
  { id: 'beat-scoopy', label: 'Beat & Scoopy' },
  { id: 'mio-series', label: 'Mio Series' },
  { id: 'sport-bebek', label: 'Sport & Bebek' },
];

const POPULAR_BIKE_VARIANTS_SUGGESTIONS = [
  'Vario 125 / 150',
  'Vario 160 / PCX 160',
  'PCX 150',
  'All New NMAX / Aerox 155 Connected',
  'Old NMAX / Lexi 125',
  'Beat ESP / Deluxe / Street',
  'Beat Karbu / Scoopy Karbu',
  'Scoopy Fi / Genio',
  'Mio Sporty / Smile 5TL',
  'Mio M3 / Fazzio 125',
  'Ninja 150 R/RR',
  'Universal Semua Motor',
];

const PROMO_TAG_PRESETS = [
  'MALL',
  'Best Seller',
  'Promo 30%',
  'Flash Sale',
  'Star Seller',
  'Spesial CVT',
];

export const AdminPanel: React.FC = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'analytics' | 'orders' | 'products' | 'vouchers' | 'chats'>('orders');

  // Live Chat & Bot State
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedChatRoomId, setSelectedChatRoomId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [adminChatInput, setAdminChatInput] = useState<string>('');
  const [adminSending, setAdminSending] = useState<boolean>(false);
  const [chatSearch, setChatSearch] = useState<string>('');
  const [chatFilter, setChatFilter] = useState<'ALL' | 'UNREAD' | 'BOT_ON'>('ALL');
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

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
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('ALL');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [specRows, setSpecRows] = useState<{ key: string; value: string }[]>([]);
  const [varGroups, setVarGroups] = useState<AdminVarGroup[]>([]);
  const [bikeVariantsList, setBikeVariantsList] = useState<string[]>([]);
  const [newBikeVariantInput, setNewBikeVariantInput] = useState<string>('');
  const [imageUploadMode, setImageUploadMode] = useState<'upload' | 'url'>('upload');
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [isDragOverImage, setIsDragOverImage] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      if (token?.startsWith('demo-')) {
        setAnalytics({
          totalRevenue: 3450000,
          needShipping: 1,
          lowStockCount: 1,
          lowStockItems: INITIAL_PRODUCTS.filter((p) => p.stock <= 2),
          totalOrders: 4,
        });
        setOrders([]);
        setProducts(INITIAL_PRODUCTS);
        setVouchers(INITIAL_VOUCHERS);
        setLoading(false);
        return;
      }

      const [resAnalytics, resOrders, resProducts, resVouchers] = await Promise.allSettled([
        safeFetchJson('/api/admin/analytics', { headers: { Authorization: `Bearer ${token}` } }),
        safeFetchJson('/api/admin/orders', { headers: { Authorization: `Bearer ${token}` } }),
        safeFetchJson('/api/admin/products', { headers: { Authorization: `Bearer ${token}` } }),
        safeFetchJson('/api/admin/vouchers', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (resAnalytics.status === 'fulfilled' && resAnalytics.value && typeof resAnalytics.value === 'object') {
        setAnalytics((prev: any) =>
          JSON.stringify(prev) === JSON.stringify(resAnalytics.value) ? prev : resAnalytics.value
        );
      } else {
        setAnalytics({ totalRevenue: 0, needShipping: 0, lowStockCount: 0, lowStockItems: [], totalOrders: 0 });
      }

      if (resOrders.status === 'fulfilled' && Array.isArray(resOrders.value)) {
        setOrders((prev) =>
          JSON.stringify(prev) === JSON.stringify(resOrders.value) ? prev : resOrders.value
        );
      } else {
        setOrders([]);
      }

      if (resProducts.status === 'fulfilled' && Array.isArray(resProducts.value)) {
        const prods = resProducts.value.length > 0 ? resProducts.value : INITIAL_PRODUCTS;
        setProducts((prev) =>
          JSON.stringify(prev) === JSON.stringify(prods) ? prev : prods
        );
      } else {
        setProducts(INITIAL_PRODUCTS);
      }

      if (resVouchers.status === 'fulfilled' && Array.isArray(resVouchers.value)) {
        const vList = resVouchers.value.length > 0 ? resVouchers.value : INITIAL_VOUCHERS;
        setVouchers((prev) =>
          JSON.stringify(prev) === JSON.stringify(vList) ? prev : vList
        );
      } else {
        setVouchers(INITIAL_VOUCHERS);
      }
    } catch (err) {
      console.warn('Admin fetch notice:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductsList = async () => {
    if (!token || token.startsWith('demo-')) return;
    try {
      const res = await safeFetchJson<Product[]>('/api/admin/products', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (Array.isArray(res)) {
        setProducts((prev) =>
          JSON.stringify(prev) === JSON.stringify(res) ? prev : res
        );
      }
    } catch (e) {
      console.warn('Fetch products notice:', e);
    }
  };

  // Immediate fetch when switching to products tab so user never has to refresh
  useEffect(() => {
    if (activeTab === 'products') {
      fetchProductsList();
    }
  }, [activeTab]);

  // Fetch Chat Rooms
  const fetchChatRooms = async () => {
    if (!token) return;
    try {
      const res = await safeFetchJson<{ rooms: ChatRoom[] }>('/api/admin/chat/rooms', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res && Array.isArray(res.rooms)) {
        setChatRooms((prev) => {
          if (res.rooms.length === 0 && prev.length > 0) return prev;
          if (
            prev.length === res.rooms.length &&
            prev.every((r, i) => r.id === res.rooms[i].id && r.last_message === res.rooms[i].last_message && r.unread_admin === res.rooms[i].unread_admin)
          ) {
            return prev;
          }
          return res.rooms;
        });
      }
    } catch (e) {
      // quiet
    }
  };

  // Fetch Messages for a room
  const fetchRoomMessages = async (roomId: string) => {
    if (!token) return;
    try {
      const res = await safeFetchJson<{ room: ChatRoom; messages: ChatMessage[] }>(
        `/api/chat/messages/${roomId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res && Array.isArray(res.messages)) {
        setChatMessages((prev) => {
          if (res.messages.length === 0 && prev.length > 0) return prev;
          const temp = prev.filter((m) => m.id.startsWith('admin_temp_'));
          const existingIds = new Set(res.messages.map((m) => m.id));
          const filteredTemp = temp.filter((t) => !existingIds.has(t.id));
          const next = [...res.messages, ...filteredTemp];
          if (
            prev.length === next.length &&
            prev.every((m, i) => m.id === next[i].id && m.message === next[i].message)
          ) {
            return prev;
          }
          return next;
        });
      }
      // mark as read by admin
      safeFetchJson(`/api/chat/rooms/${roomId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: 'admin' }),
      }).then(() => {
        setChatRooms((prev) =>
          prev.map((r) => (r.id === roomId ? { ...r, unread_admin: 0 } : r))
        );
      });
    } catch (e) {}
  };

  // Live polling for chat rooms and active messages (2-second sync)
  useEffect(() => {
    fetchChatRooms();
    const interval = setInterval(() => {
      fetchChatRooms();
      if (selectedChatRoomId && activeTab === 'chats') {
        fetchRoomMessages(selectedChatRoomId);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [activeTab, selectedChatRoomId, token]);

  // Live background polling for orders, products & analytics in admin panel (smooth 5s sync without flickering)
  useEffect(() => {
    if (!token || token.startsWith('demo-')) return;
    const interval = setInterval(async () => {
      try {
        if (activeTab === 'orders' || activeTab === 'analytics') {
          const [resAnalytics, resOrders] = await Promise.allSettled([
            safeFetchJson('/api/admin/analytics', { headers: { Authorization: `Bearer ${token}` } }),
            safeFetchJson('/api/admin/orders', { headers: { Authorization: `Bearer ${token}` } }),
          ]);
          if (resAnalytics.status === 'fulfilled' && resAnalytics.value) {
            setAnalytics((prev: any) =>
              JSON.stringify(prev) === JSON.stringify(resAnalytics.value) ? prev : resAnalytics.value
            );
          }
          if (resOrders.status === 'fulfilled' && Array.isArray(resOrders.value)) {
            setOrders((prev) =>
              JSON.stringify(prev) === JSON.stringify(resOrders.value) ? prev : resOrders.value
            );
          }
        } else if (activeTab === 'products') {
          // If product editing modal is not open, sync products list from db smoothly
          if (!isProductModalOpen) {
            await fetchProductsList();
          }
        }
      } catch (e) {}
    }, 5000);
    return () => clearInterval(interval);
  }, [activeTab, token, isProductModalOpen]);

  useEffect(() => {
    if (selectedChatRoomId) {
      fetchRoomMessages(selectedChatRoomId);
    }
  }, [selectedChatRoomId]);

  useEffect(() => {
    if (activeTab === 'chats') {
      chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages.length, activeTab]);

  const handleSendAdminReply = async (quickText?: string) => {
    const text = (quickText || adminChatInput).trim();
    if (!text || !selectedChatRoomId || adminSending) return;

    setAdminSending(true);
    setAdminChatInput('');

    const tempMsg: ChatMessage = {
      id: 'admin_temp_' + Date.now(),
      room_id: selectedChatRoomId,
      sender_type: 'admin',
      sender_name: 'Admin Jawir Garage',
      message: text,
      created_at: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, tempMsg]);

    try {
      await safeFetchJson('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          roomId: selectedChatRoomId,
          message: text,
          isAdminReply: true,
        }),
      });
      fetchRoomMessages(selectedChatRoomId);
      fetchChatRooms();
    } catch (err: any) {
      toast.error('Gagal Mengirim Pesan', err.message);
    } finally {
      setAdminSending(false);
    }
  };

  const handleToggleBot = async (roomId: string) => {
    try {
      const res = await safeFetchJson<{ success: boolean; bot_enabled: number }>(
        `/api/admin/chat/rooms/${roomId}/toggle-bot`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res && res.success) {
        setChatRooms((prev) =>
          prev.map((r) => (r.id === roomId ? { ...r, bot_enabled: res.bot_enabled } : r))
        );
        toast.info('Mode Bot Diperbarui', res.bot_enabled === 1 ? 'Jawir Bot telah diaktifkan' : 'Jawir Bot dinonaktifkan (Manual)');
      }
    } catch (e: any) {
      toast.error('Gagal Mengubah Mode Bot', e.message);
    }
  };

  const handleDeleteChatRoom = async (roomId: string) => {
    const confirmed = await confirmModal({
      title: 'Hapus Riwayat Chat',
      message: 'Hapus percakapan pelanggan ini dari riwayat chat secara permanen?',
      confirmText: 'Ya, Hapus Chat',
      cancelText: 'Batal',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await safeFetchJson(`/api/admin/chat/rooms/${roomId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (selectedChatRoomId === roomId) {
        setSelectedChatRoomId(null);
        setChatMessages([]);
      }
      fetchChatRooms();
      toast.success('Chat Dihapus', 'Riwayat percakapan berhasil dihapus.');
    } catch (e: any) {
      toast.error('Gagal Menghapus Percakapan', e.message);
    }
  };

  // OMS Status Handlers
  const handleUpdateOrderStatus = async (orderId: string, status: string, trackingNum?: string) => {
    try {
      const data = await safeFetchJson(`/api/admin/orders/${orderId}/status`, {
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

      fetchAllAdminData();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) =>
          prev ? { ...prev, status: status as any, tracking_number: trackingNum || trackingNumberInput } : null
        );
      }
      setTrackingNumberInput('');
      toast.success('Status Pesanan Diperbarui', data?.message || `Status pesanan berhasil diubah menjadi ${status}`);
    } catch (err: any) {
      toast.error('Gagal Memperbarui Status', err.message);
    }
  };

  const handleRequestBiteshipPickup = async (orderId: string) => {
    const confirmed = await confirmModal({
      title: 'Request Pickup Biteship',
      message: 'Request penjemputan paket kurir ke Biteship sekarang? Nomor resi pengiriman akan langsung terbit.',
      confirmText: 'Ya, Request Pickup',
      cancelText: 'Batal',
      variant: 'primary',
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/biteship-ship`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal request pickup Biteship');
      toast.success('Pickup Berhasil Diajukan!', `Nomor Resi Biteship: ${data.trackingNumber}`);
      fetchAllAdminData();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) =>
          prev ? { ...prev, status: 'SHIPPED', tracking_number: data.trackingNumber } : null
        );
      }
    } catch (err: any) {
      toast.error('Gagal Request Biteship', err.message);
    }
  };

  // Product Handlers
  const openEditProduct = (p: any) => {
    setEditingProduct({
      ...p,
      bikeCompatibility: p.bikeCompatibility || [],
      originCity: p.originCity || 'Jakarta Timur',
      promoTag: p.promoTag || '',
      fitmentTag: p.fitmentTag || 'Plug & Play (PnP)',
      compatibilityText: p.compatibilityText || '',
    });

    const specs = typeof p.specs === 'object' && p.specs ? p.specs : {};
    const entries = Object.entries(specs).map(([k, v]) => ({ key: k, value: String(v) }));
    setSpecRows(entries.length > 0 ? entries : [
      { key: 'Bahan', value: 'Billet Aluminium 6061' },
      { key: 'Merk', value: 'BRT Racing Parts' },
      { key: 'Garansi', value: '1 Bulan Tukar Baru' },
    ]);

    // Extract bikeVariantsList
    let initialBikes: string[] = [];
    if (Array.isArray(p.bikeVariants) && p.bikeVariants.length > 0) {
      initialBikes = [...p.bikeVariants];
    } else if (Array.isArray(p.variationGroups)) {
      const motorGroup = p.variationGroups.find((g: any) =>
        g.name.toLowerCase().includes('motor') || g.name.toLowerCase().includes('tipe')
      );
      if (motorGroup && Array.isArray(motorGroup.options)) {
        initialBikes = motorGroup.options.map((opt: any) => (typeof opt === 'string' ? opt : opt.name));
      }
    }
    if (initialBikes.length === 0 && p.bikeCompatibility) {
      const compat = p.bikeCompatibility || [];
      if (compat.includes('vario-pcx')) initialBikes.push('Vario 125 / 150', 'Vario 160 / PCX 160');
      if (compat.includes('nmax-aerox')) initialBikes.push('All New NMAX / Aerox 155', 'Old NMAX / Lexi 125');
      if (compat.includes('beat-scoopy')) initialBikes.push('Beat ESP / Deluxe / Street', 'Scoopy / Genio');
      if (compat.includes('mio-series')) initialBikes.push('Mio Sporty / Smile 5TL', 'Mio M3 / Fazzio 125');
      if (compat.includes('sport-bebek')) initialBikes.push('Ninja 150/250 / CBR / R15', 'Satria F / Sonic / MX King');
    }
    setBikeVariantsList(Array.from(new Set(initialBikes)));
    setNewBikeVariantInput('');

    // Populate varGroups from p.variationGroups retaining custom prices & stock
    if (Array.isArray(p.variationGroups) && p.variationGroups.length > 0) {
      setVarGroups(
        p.variationGroups.map((g: any) => ({
          name: g.name || '',
          options: Array.isArray(g.options)
            ? g.options.map((opt: any) => {
                if (typeof opt === 'string') {
                  return { name: opt, price: '', stock: '' };
                }
                return {
                  name: opt.name || '',
                  price: typeof opt.price === 'number' && opt.price > 0 ? opt.price : (typeof opt.priceModifier === 'number' ? (p.price || 0) + opt.priceModifier : ''),
                  stock: typeof opt.stock === 'number' ? opt.stock : '',
                };
              })
            : [],
        }))
      );
    } else {
      setVarGroups([]);
    }

    setImageUploadMode(p.image && p.image.startsWith('http') ? 'url' : 'upload');
    setIsProductModalOpen(true);
  };

  const processImageFile = (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
      toast.warning('Format Tidak Didukung', 'Mohon gunakan foto format JPG, JPEG, PNG, atau WEBP.');
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      toast.warning('Ukuran File Terlalu Besar', 'Maksimal ukuran foto adalah 12MB.');
      return;
    }

    setIsUploadingImage(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Resize to max 1200px width/height for razor sharp display with lightweight size
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          const compressedDataUrl = canvas.toDataURL(mime, 0.85);
          setEditingProduct((prev: any) => ({
            ...prev,
            image: compressedDataUrl,
          }));
          toast.success('Foto Berhasil Diproses', 'Gambar produk siap disimpan.');
        }
        setIsUploadingImage(false);
      };
      img.onerror = () => {
        toast.error('Gagal Memproses Gambar', 'File gambar mungkin rusak atau tidak terbaca.');
        setIsUploadingImage(false);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      toast.error('Gagal Membaca File', 'Tidak dapat membaca file dari komputer.');
      setIsUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const openCreateProduct = () => {
    setEditingProduct({
      name: '',
      category: 'part-cvt',
      bikeCompatibility: ['vario-pcx'],
      compatibilityText: 'Vario 125/150/160, PCX 150/160',
      fitmentTag: 'Plug & Play (PnP)',
      price: 150000,
      originalPrice: 200000,
      discountPercent: 25,
      promoTag: 'MALL',
      rating: 5.0,
      soldCount: 0,
      stock: 25,
      weight_grams: 500,
      originCity: 'Jakarta Timur',
      image: '',
      description: 'Part racing performa tinggi standar kompetisi dan harian.',
      isPromo: true,
      isPaketUpgrade: false,
      isActive: true,
    });

    setSpecRows([
      { key: 'Bahan', value: 'Billet Aluminium 6061' },
      { key: 'Merk', value: 'BRT Racing Parts' },
      { key: 'Garansi', value: '1 Bulan Tukar Baru' },
    ]);

    setBikeVariantsList(['Vario 125 / 150', 'Vario 160 / PCX 160']);
    setNewBikeVariantInput('');
    setVarGroups([]);
    setImageUploadMode('upload');

    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = Boolean(editingProduct?.id);
      const url = isEdit ? `/api/admin/products/${editingProduct.id}` : '/api/admin/products';
      const method = isEdit ? 'PUT' : 'POST';

      const specsObj: Record<string, string> = {};
      for (const row of specRows) {
        if (row.key.trim() && row.value.trim()) {
          specsObj[row.key.trim()] = row.value.trim();
        }
      }

      const cleanVariationGroups = varGroups
        .filter((g) => g.name.trim() !== '')
        .map((g) => ({
          name: g.name.trim(),
          options: g.options
            .filter((opt) => opt.name && opt.name.trim() !== '')
            .map((opt) => {
              const pr = opt.price !== '' && opt.price !== undefined && opt.price !== null ? Math.max(0, parseInt(String(opt.price)) || 0) : undefined;
              const stk = opt.stock !== '' && opt.stock !== undefined && opt.stock !== null ? Math.max(0, parseInt(String(opt.stock)) || 0) : undefined;
              if (pr !== undefined || stk !== undefined) {
                return {
                  name: opt.name.trim(),
                  ...(pr !== undefined ? { price: pr } : {}),
                  ...(stk !== undefined ? { stock: stk } : {}),
                };
              }
              return opt.name.trim();
            }),
        }))
        .filter((g) => g.options.length > 0);

      const finalVariationGroups: any[] = [];
      if (cleanVariationGroups.length > 0) {
        finalVariationGroups.push(...cleanVariationGroups);
      } else if (bikeVariantsList.length > 0) {
        finalVariationGroups.push({
          name: 'Tipe Motor / Varian',
          options: [...bikeVariantsList],
        });
      }

      const priceNum = Math.max(0, parseInt(editingProduct.price) || 0);
      const origPriceNum = editingProduct.originalPrice ? Math.max(0, parseInt(editingProduct.originalPrice) || 0) : null;
      let discountPct = editingProduct.discountPercent ? parseInt(editingProduct.discountPercent) || 0 : 0;
      if (origPriceNum && origPriceNum > priceNum) {
        discountPct = Math.round(((origPriceNum - priceNum) / origPriceNum) * 100);
      }

      const cleanPayload = {
        ...editingProduct,
        price: priceNum,
        originalPrice: origPriceNum,
        discountPercent: discountPct,
        stock: Math.max(0, parseInt(editingProduct.stock) || 0),
        weight_grams: Math.max(10, parseInt(editingProduct.weight_grams) || 500),
        originCity: editingProduct.originCity || 'Jakarta Timur',
        bikeCompatibility: editingProduct.bikeCompatibility || [],
        bikeVariants: bikeVariantsList,
        specs: specsObj,
        variationGroups: finalVariationGroups,
      };

      await safeFetchJson(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(cleanPayload),
      });

      setIsProductModalOpen(false);
      setEditingProduct(null);
      await fetchProductsList();
      fetchAllAdminData();
      toast.success('Katalog Berhasil Diperbarui', isEdit ? 'Perubahan produk berhasil disimpan.' : 'Produk baru berhasil ditambahkan ke katalog.');
    } catch (err: any) {
      toast.error('Gagal Menyimpan Produk', err.message);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    const confirmed = await confirmModal({
      title: 'Hapus Produk Permanen',
      message: 'Yakin ingin menghapus produk ini secara permanen dari katalog toko? Tindakan ini tidak dapat dibatalkan.',
      confirmText: 'Ya, Hapus Produk',
      cancelText: 'Batal',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      await safeFetchJson(`/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchProductsList();
      toast.success('Produk Dihapus', 'Produk berhasil dihapus dari katalog toko.');
    } catch (err: any) {
      toast.error('Gagal Menghapus Produk', err.message);
      fetchProductsList();
    }
  };

  const handleToggleProduct = async (id: string) => {
    try {
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p))
      );
      await safeFetchJson(`/api/admin/products/${id}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchProductsList();
      toast.info('Status Produk Diubah', 'Visibilitas produk di katalog berhasil diperbarui.');
    } catch (err) {
      console.error(err);
      fetchProductsList();
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
      toast.success('Voucer Berhasil Dibuat', 'Kode promo voucer baru sudah aktif dan siap digunakan pelanggan.');
    } catch (err: any) {
      toast.error('Gagal Membuat Voucer', err.message);
    }
  };

  const handleDeleteVoucher = async (id: string) => {
    const confirmed = await confirmModal({
      title: 'Hapus Kode Voucer',
      message: 'Hapus kode promo voucer ini dari toko? Pengguna tidak akan bisa menggunakannya lagi.',
      confirmText: 'Ya, Hapus Voucer',
      cancelText: 'Batal',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await fetch(`/api/admin/vouchers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchAllAdminData();
      toast.success('Voucer Dihapus', 'Kode promo voucer berhasil dihapus.');
    } catch (err: any) {
      toast.error('Gagal Menghapus Voucer', err.message);
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
  const filteredProducts = products.filter((p) => {
    const matchCategory =
      productCategoryFilter === 'ALL' || normalizeCategory(p.category) === productCategoryFilter;
    const matchSearch =
      !productSearch.trim() ||
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(productSearch.toLowerCase())) ||
      getCategoryLabel(p.category).toLowerCase().includes(productSearch.toLowerCase());
    return matchCategory && matchSearch;
  });

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
              <button
                onClick={() => setActiveTab('chats')}
                className={`relative px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'chats' ? 'bg-[#E50914] text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Live Chat & Bot</span>
                {chatRooms.reduce((acc, r) => acc + (r.unread_admin || 0), 0) > 0 && (
                  <span className="bg-amber-400 text-neutral-950 font-black text-[10px] px-1.5 py-0.2 rounded-full animate-pulse">
                    {chatRooms.reduce((acc, r) => acc + (r.unread_admin || 0), 0)}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchAllAdminData();
                fetchChatRooms();
              }}
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
            {
              id: 'chats',
              label:
                chatRooms.reduce((acc, r) => acc + (r.unread_admin || 0), 0) > 0
                  ? `Chat (${chatRooms.reduce((acc, r) => acc + (r.unread_admin || 0), 0)})`
                  : 'Chat Pelanggan',
            },
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
                          <td className="p-3 text-neutral-400 uppercase">{getCategoryLabel(p.category)}</td>
                          <td className="p-3 font-racing text-[#E50914]">{formatIDR(p.price)}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded bg-red-950 text-red-300 font-bold border border-red-800">
                              {p.stock} pcs
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => openEditProduct(p)}
                              className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-[#E50914] text-white font-bold transition-colors"
                            >
                              Restock / Edit
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
                            {ord.customer_notes && (
                              <div
                                className="mt-1.5 flex items-center gap-1 text-[10px] text-amber-300 bg-amber-950/60 border border-amber-800/80 rounded px-1.5 py-0.5 max-w-[220px]"
                                title={ord.customer_notes}
                              >
                                <span className="text-amber-400 font-bold shrink-0">📝</span>
                                <span className="truncate">{ord.customer_notes}</span>
                              </div>
                            )}
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
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Cari part racing, kategori..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-[#E50914]"
                  />
                </div>

                <select
                  value={productCategoryFilter}
                  onChange={(e) => setProductCategoryFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white font-medium focus:outline-none focus:border-[#E50914]"
                >
                  <option value="ALL">Semua Kategori (8)</option>
                  {OFFICIAL_CATEGORIES.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={openCreateProduct}
                className="px-4 py-2 bg-[#E50914] hover:bg-red-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-md shadow-red-950/40 cursor-pointer transition-colors"
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
                      <th className="p-3.5">Produk & Kesesuaian Motor</th>
                      <th className="p-3.5">Kategori & Asal</th>
                      <th className="p-3.5">Harga & Diskon</th>
                      <th className="p-3.5">Stok & Berat</th>
                      <th className="p-3.5">Variasi Shopee</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/80">
                    {filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-neutral-900/40 transition-colors">
                        <td className="p-3.5 flex items-start gap-3">
                          <img
                            src={p.image}
                            alt={p.name}
                            referrerPolicy="no-referrer"
                            className="w-12 h-12 rounded-lg object-cover bg-black flex-shrink-0 border border-neutral-800"
                          />
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {p.promoTag && (
                                <span className="bg-[#D0011B] text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm">
                                  {p.promoTag}
                                </span>
                              )}
                              <span className="font-bold text-white text-xs max-w-xs truncate block">{p.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 flex-wrap">
                              <span className="text-emerald-400 font-medium">{p.fitmentTag || 'PnP'}</span>
                              <span>•</span>
                              <span className="text-neutral-400 truncate max-w-[200px]">{p.compatibilityText || 'Universal'}</span>
                            </div>
                            {p.bikeCompatibility && p.bikeCompatibility.length > 0 && (
                              <div className="flex gap-1 flex-wrap pt-0.5">
                                {p.bikeCompatibility.map((bc: string) => {
                                  const opt = BIKE_OPTIONS.find((b) => b.id === bc);
                                  return (
                                    <span key={bc} className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-300">
                                      {opt?.label || bc}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="uppercase text-neutral-200 font-bold block text-[11px]">{getCategoryLabel(p.category)}</span>
                          <span className="text-[10px] text-neutral-400">{p.originCity || 'Jakarta Timur'}</span>
                        </td>
                        <td className="p-3.5">
                          {(() => {
                            const range = getProductPriceRange(p);
                            return (
                              <div>
                                <div className="font-racing text-sm text-[#E50914] font-bold">
                                  {range.hasRange
                                    ? `${formatIDR(range.minPrice)} - ${formatIDR(range.maxPrice)}`
                                    : formatIDR(p.price)}
                                </div>
                                {range.hasRange && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950/70 border border-amber-800 text-amber-300 font-bold inline-block mt-0.5">
                                    Multi Harga Varian
                                  </span>
                                )}
                                {p.originalPrice && p.originalPrice > (range.hasRange ? range.maxPrice : p.price) && (
                                  <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 mt-0.5">
                                    <span className="line-through">{formatIDR(p.originalPrice)}</span>
                                    <span className="text-[#D0011B] font-bold">
                                      -{p.discountPercent || Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)}%
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[11px] block w-fit ${
                              p.stock < 5
                                ? 'bg-red-950 text-red-300 border border-red-800'
                                : 'bg-neutral-800 text-neutral-200'
                            }`}
                          >
                            {p.stock} pcs
                          </span>
                          <span className="text-[10px] text-neutral-400 mt-0.5 block">{p.weight_grams || 500} gram</span>
                        </td>
                        <td className="p-3.5">
                          {p.variationGroups && p.variationGroups.length > 0 ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/60 border border-amber-800/80 text-amber-300 block w-fit">
                                  {p.variationGroups.length} Grup Variasi
                                </span>
                                {p.variationGroups.some((g: any) =>
                                  g.options?.some((opt: any) => typeof opt === 'object' && opt.price)
                                ) && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-950/80 border border-red-700 text-red-300">
                                    Rp Custom
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-neutral-400 truncate max-w-[150px]">
                                {p.variationGroups.map((g: any) => `${g.name} (${g.options?.length || 0})`).join(', ')}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] text-neutral-500 italic">Tanpa Variasi</span>
                          )}
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
                            onClick={() => openEditProduct(p)}
                            className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
                            title="Edit Produk"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            className="p-1.5 rounded bg-red-950/60 hover:bg-red-900 text-red-400 transition-colors"
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

        {/* ============================================================== */}
        {/* TAB 5: LIVE CHAT & CHATBOT MANAGER (Shopee Style CS)           */}
        {/* ============================================================== */}
        {activeTab === 'chats' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-900 border border-neutral-800 p-4 rounded-2xl">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-racing font-bold text-xl text-white tracking-wide flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-[#E50914]" />
                    Live Chat Pelanggan & Chatbot Otomatis
                  </h3>
                  <span className="bg-emerald-950 text-emerald-400 border border-emerald-800/60 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Auto-Responder Aktif
                  </span>
                </div>
                <p className="text-neutral-400 text-xs mt-1">
                  Chatbot menjawab ketersediaan stok & harga produk secara otomatis 24/7. Admin dapat memantau per user dan membalas langsung secara real-time.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    fetchChatRooms();
                    if (selectedChatRoomId) fetchRoomMessages(selectedChatRoomId);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Chat</span>
                </button>
              </div>
            </div>

            {/* Chat Workspace (Two-column layout) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[650px] max-h-[75vh]">
              {/* Left Column: Rooms List (col-span-4) */}
              <div className="lg:col-span-4 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col overflow-hidden">
                {/* Search & Filter Header */}
                <div className="p-3 border-b border-neutral-800 space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="Cari user atau percakapan..."
                      value={chatSearch}
                      onChange={(e) => setChatSearch(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#E50914]"
                    />
                  </div>

                  {/* Filter Badges */}
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <button
                      onClick={() => setChatFilter('ALL')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                        chatFilter === 'ALL'
                          ? 'bg-[#E50914] text-white'
                          : 'bg-neutral-950 text-neutral-400 hover:text-white'
                      }`}
                    >
                      Semua ({chatRooms.length})
                    </button>
                    <button
                      onClick={() => setChatFilter('UNREAD')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                        chatFilter === 'UNREAD'
                          ? 'bg-[#E50914] text-white'
                          : 'bg-neutral-950 text-neutral-400 hover:text-white'
                      }`}
                    >
                      Belum Dibalas ({chatRooms.filter((r) => (r.unread_admin || 0) > 0).length})
                    </button>
                    <button
                      onClick={() => setChatFilter('BOT_ON')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                        chatFilter === 'BOT_ON'
                          ? 'bg-[#E50914] text-white'
                          : 'bg-neutral-950 text-neutral-400 hover:text-white'
                      }`}
                    >
                      Bot Aktif
                    </button>
                  </div>
                </div>

                {/* Rooms Scroll List */}
                <div className="flex-1 overflow-y-auto divide-y divide-neutral-800/60 no-scrollbar">
                  {chatRooms.length === 0 ? (
                    <div className="p-8 text-center text-neutral-500 text-xs">
                      <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      Belum ada percakapan pelanggan masuk.
                    </div>
                  ) : (
                    chatRooms
                      .filter((r) => {
                        const matchesSearch =
                          !chatSearch.trim() ||
                          r.user_name.toLowerCase().includes(chatSearch.toLowerCase()) ||
                          (r.last_message && r.last_message.toLowerCase().includes(chatSearch.toLowerCase()));
                        if (!matchesSearch) return false;
                        if (chatFilter === 'UNREAD') return (r.unread_admin || 0) > 0;
                        if (chatFilter === 'BOT_ON') return r.bot_enabled === 1 || r.bot_enabled === true;
                        return true;
                      })
                      .map((room) => {
                        const isSelected = selectedChatRoomId === room.id;
                        const hasUnread = (room.unread_admin || 0) > 0;

                        return (
                          <div
                            key={room.id}
                            onClick={() => setSelectedChatRoomId(room.id)}
                            className={`p-3.5 transition-all cursor-pointer flex items-start gap-3 ${
                              isSelected
                                ? 'bg-neutral-800/90 border-l-4 border-l-[#E50914]'
                                : 'hover:bg-neutral-850'
                            }`}
                          >
                            <div className="relative w-10 h-10 rounded-full bg-neutral-950 border border-neutral-700 flex items-center justify-center shrink-0 text-white font-bold text-xs uppercase">
                              {room.user_name.substring(0, 2)}
                              <span
                                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-neutral-900 ${
                                  hasUnread ? 'bg-amber-400' : 'bg-emerald-500'
                                }`}
                              />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <h5 className="font-bold text-xs text-white truncate flex items-center gap-1.5">
                                  <span>{room.user_name}</span>
                                  {room.user_id ? (
                                    <span className="text-[9px] bg-neutral-800 text-neutral-400 px-1 py-0.2 rounded">
                                      Member
                                    </span>
                                  ) : (
                                    <span className="text-[9px] bg-neutral-950 text-neutral-500 px-1 py-0.2 rounded border border-neutral-800">
                                      Tamu
                                    </span>
                                  )}
                                </h5>
                                <span className="text-[10px] text-neutral-500 shrink-0">
                                  {new Date(room.last_message_at || room.created_at).toLocaleTimeString('id-ID', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>

                              <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                                {room.last_message || 'Percakapan baru dimulai'}
                              </p>

                              <div className="flex items-center justify-between mt-2 pt-1 border-t border-neutral-800/40 text-[10px]">
                                <span
                                  className={`px-1.5 py-0.5 rounded font-semibold ${
                                    room.bot_enabled
                                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40'
                                      : 'bg-neutral-800 text-neutral-400'
                                  }`}
                                >
                                  {room.bot_enabled ? '🤖 Bot ON' : '👨‍🔧 CS Manual'}
                                </span>

                                {hasUnread && (
                                  <span className="bg-[#E50914] text-white font-black text-[10px] px-2 py-0.5 rounded-full animate-bounce">
                                    {room.unread_admin} Baru
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              {/* Right Column: Chat Box & Messages (col-span-8) */}
              <div className="lg:col-span-8 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col overflow-hidden">
                {!selectedChatRoomId ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-neutral-500">
                    <div className="w-16 h-16 rounded-full bg-neutral-950 border border-neutral-800 flex items-center justify-center text-neutral-600 mb-3">
                      <MessageCircle className="w-8 h-8" />
                    </div>
                    <h4 className="font-bold text-white text-sm">Pilih Percakapan Pelanggan</h4>
                    <p className="text-xs text-neutral-400 max-w-sm mt-1">
                      Klik salah satu chat di sebelah kiri untuk melihat percakapan, mengecek riwayat chatbot, atau membalas pertanyaan pembeli secara manual.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Active Room Header */}
                    {(() => {
                      const currentRoom = chatRooms.find((r) => r.id === selectedChatRoomId);
                      return (
                        <div className="p-3.5 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white font-bold text-xs uppercase">
                              {currentRoom?.user_name.substring(0, 2) || 'PL'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-xs text-white">
                                  {currentRoom?.user_name || 'Pelanggan'}
                                </h4>
                                <span className="text-[10px] text-neutral-500 font-mono">
                                  ({currentRoom?.id})
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                                <span>Terakhir aktif: {new Date(currentRoom?.last_message_at || Date.now()).toLocaleTimeString('id-ID')}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Toggle Bot Button */}
                            <button
                              onClick={() => currentRoom && handleToggleBot(currentRoom.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                currentRoom?.bot_enabled
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/80 hover:bg-emerald-900/60'
                                  : 'bg-neutral-800 text-neutral-300 border border-neutral-700 hover:bg-neutral-700'
                              }`}
                              title={currentRoom?.bot_enabled ? 'Klik untuk mematikan bot (Mode manual admin)' : 'Klik untuk mengaktifkan bot auto-reply'}
                            >
                              <Bot className="w-3.5 h-3.5" />
                              <span>{currentRoom?.bot_enabled ? 'Mode Bot: ON' : 'Mode Bot: OFF (Manual)'}</span>
                            </button>

                            {/* Delete Room */}
                            <button
                              onClick={() => currentRoom && handleDeleteChatRoom(currentRoom.id)}
                              className="p-1.5 rounded-xl bg-neutral-800 hover:bg-red-950 text-neutral-400 hover:text-red-400 transition-colors"
                              title="Hapus riwayat chat"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Messages Body */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-neutral-950/60 text-xs">
                      {chatMessages.length === 0 ? (
                        <div className="text-center py-10 text-neutral-500 text-xs">
                          Belum ada pesan di percakapan ini.
                        </div>
                      ) : (
                        chatMessages.map((m) => {
                          const isUser = m.sender_type === 'user';
                          const isBot = m.sender_type === 'bot';
                          const isAdmin = m.sender_type === 'admin';

                          return (
                            <div
                              key={m.id}
                              className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'} space-y-1`}
                            >
                              <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 px-1">
                                {isAdmin && (
                                  <span className="bg-red-950 text-red-400 border border-red-800/50 px-1.5 py-0.2 rounded font-bold">
                                    👨‍🔧 Anda (Admin Jawir)
                                  </span>
                                )}
                                {isBot && (
                                  <span className="bg-emerald-950 text-emerald-400 border border-emerald-800/50 px-1.5 py-0.2 rounded font-bold flex items-center gap-1">
                                    <Bot className="w-2.5 h-2.5" /> Jawir Bot (Auto)
                                  </span>
                                )}
                                {isUser && (
                                  <span className="bg-neutral-800 text-neutral-300 px-1.5 py-0.2 rounded font-bold flex items-center gap-1">
                                    <User className="w-2.5 h-2.5" /> {m.sender_name}
                                  </span>
                                )}
                                <span className="text-neutral-500 text-[9px]">
                                  {new Date(m.created_at).toLocaleTimeString('id-ID', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>

                              <div
                                className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-xs shadow-md leading-relaxed whitespace-pre-wrap ${
                                  isAdmin
                                    ? 'bg-[#E50914] text-white rounded-tr-none'
                                    : isBot
                                    ? 'bg-neutral-900 border border-emerald-900/50 text-neutral-200 rounded-tl-none'
                                    : 'bg-neutral-800 border border-neutral-700 text-neutral-100 rounded-tl-none'
                                }`}
                              >
                                {m.message}

                                {/* Product Payload attached */}
                                {m.product_payload && (
                                  <div className="mt-2 bg-neutral-950/90 border border-neutral-700 rounded-xl p-2 flex items-center gap-2 text-left">
                                    <img
                                      src={m.product_payload.image}
                                      alt={m.product_payload.name}
                                      className="w-10 h-10 rounded-lg object-cover bg-neutral-900 shrink-0 border border-neutral-800"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <h6 className="font-semibold text-white text-[10px] truncate">
                                        {m.product_payload.name}
                                      </h6>
                                      <span className="text-[#E50914] font-bold text-[11px] block">
                                        {formatIDR(m.product_payload.price)}
                                      </span>
                                      <span className="text-emerald-400 text-[9px]">
                                        Stok: {m.product_payload.stock} pcs
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={chatMessagesEndRef} />
                    </div>

                    {/* Quick Response Shortcuts for Admin */}
                    <div className="bg-neutral-950 px-3.5 py-2 border-t border-neutral-850 flex items-center gap-2 overflow-x-auto no-scrollbar">
                      <span className="text-[11px] text-neutral-400 shrink-0 font-bold">Template Cepat:</span>
                      {[
                        'Halo kak, barang ready dan siap dikirim hari ini ya!',
                        'Bisa infokan tipe motor dan tahunnya kak?',
                        'Pesanan sudah dipacking rapi dan menunggu pickup kurir.',
                        'Garansi 100% original part Jawir Garage kak.',
                      ].map((tmpl, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendAdminReply(tmpl)}
                          className="shrink-0 text-xs bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-neutral-800 hover:border-neutral-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-medium"
                        >
                          "{tmpl.substring(0, 26)}..."
                        </button>
                      ))}
                    </div>

                    {/* Admin Message Input Bar */}
                    <div className="p-3.5 bg-neutral-900 border-t border-neutral-800 flex items-center gap-3">
                      <input
                        type="text"
                        placeholder="Ketik balasan untuk pelanggan... (Tekan Enter untuk kirim)"
                        value={adminChatInput}
                        onChange={(e) => setAdminChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendAdminReply();
                          }
                        }}
                        disabled={adminSending}
                        className="flex-1 bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#E50914] transition-colors"
                      />
                      <button
                        onClick={() => handleSendAdminReply()}
                        disabled={!adminChatInput.trim() || adminSending}
                        className="min-h-[42px] px-5 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#ff1a25] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-transform active:scale-95 cursor-pointer shadow-md shrink-0"
                      >
                        <Send className="w-4 h-4" />
                        <span>Kirim Balasan</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
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

            {/* Buyer Notes / Catatan Pembeli */}
            <div className={`p-4 rounded-xl border text-xs transition-all ${
              selectedOrder.customer_notes
                ? 'bg-amber-500/10 border-amber-500/30 shadow-md shadow-amber-950/20'
                : 'bg-neutral-900 border-neutral-800'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <span className="text-base">📝</span> Catatan Khusus dari Pembeli
                </span>
                {selectedOrder.customer_notes ? (
                  <span className="text-[9px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-600/40">
                    Pesan Pembeli
                  </span>
                ) : (
                  <span className="text-[10px] text-neutral-500">Tidak ada catatan</span>
                )}
              </div>
              {selectedOrder.customer_notes ? (
                <div className="bg-black/60 border border-amber-500/20 rounded-lg p-3 text-amber-100 font-medium whitespace-pre-wrap text-xs leading-relaxed">
                  "{selectedOrder.customer_notes}"
                </div>
              ) : (
                <p className="text-neutral-500 italic text-[11px]">
                  Pembeli tidak meninggalkan catatan khusus untuk pesanan ini.
                </p>
              )}
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

              {/* Catatan Pembeli pada Label */}
              {selectedOrder.customer_notes && (
                <div className="text-[10px] bg-yellow-50 border border-yellow-300 p-2 rounded text-neutral-900 border-b">
                  <span className="font-bold block text-[9px] uppercase tracking-wider text-neutral-600">📝 CATATAN PEMBELI:</span>
                  <p className="font-semibold text-black mt-0.5">"{selectedOrder.customer_notes}"</p>
                </div>
              )}

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-[#141414] border border-neutral-800 rounded-2xl shadow-2xl p-6 space-y-5 max-h-[92vh] overflow-y-auto no-scrollbar">
            <button
              onClick={() => {
                setIsProductModalOpen(false);
                setEditingProduct(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="bg-[#E50914] text-white text-[9px] font-black px-2 py-0.5 rounded tracking-widest uppercase">
                  CMS PRODUK
                </span>
                <span className="text-neutral-500 text-xs">
                  {editingProduct.id ? `ID: ${editingProduct.id}` : 'Baru'}
                </span>
              </div>
              <h3 className="font-racing font-bold text-xl text-white uppercase tracking-wider mt-1">
                {editingProduct.id ? 'Edit Part Racing' : 'Tambah Part Racing Baru'}
              </h3>
              <p className="text-neutral-400 text-xs">
                Kelola informasi part, kesesuaian motor, harga diskon, variasi produk, dan spesifikasi teknis.
              </p>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-5 text-xs">
              {/* SECTION 1: Informasi Utama */}
              <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-3">
                <span className="text-[11px] font-bold text-neutral-200 uppercase tracking-wider block flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#E50914]" />
                  Informasi Dasar Produk
                </span>

                <div>
                  <label className="block text-neutral-300 font-bold mb-1">
                    Nama Part / Produk <span className="text-[#E50914]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Super Roller BRT Black Diamond Heavy Duty"
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-black border border-neutral-700 text-white focus:outline-none focus:border-[#E50914]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-neutral-300 font-bold mb-1">Kategori</label>
                    <select
                      value={normalizeCategory(editingProduct.category)}
                      onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-black border border-neutral-700 text-white focus:outline-none focus:border-[#E50914]"
                    >
                      {OFFICIAL_CATEGORIES.map((cat) => (
                        <option key={cat.slug} value={cat.slug}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-neutral-300 font-bold mb-1">Fitment Tag</label>
                    <input
                      type="text"
                      placeholder="Contoh: Plug & Play (PnP)"
                      value={editingProduct.fitmentTag || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, fitmentTag: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-black border border-neutral-700 text-white focus:outline-none focus:border-[#E50914]"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-300 font-bold mb-1">Kota Asal Pengiriman</label>
                    <input
                      type="text"
                      placeholder="Contoh: Jakarta Timur"
                      value={editingProduct.originCity || 'Jakarta Timur'}
                      onChange={(e) => setEditingProduct({ ...editingProduct, originCity: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-black border border-neutral-700 text-white focus:outline-none focus:border-[#E50914]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-300 font-bold mb-1 flex items-center justify-between">
                    <span>Badge Promo Shopee (Optional)</span>
                    <span className="text-[10px] text-neutral-500 font-normal">Muncul di label merah pojok produk</span>
                  </label>
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {PROMO_TAG_PRESETS.map((tag) => (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => setEditingProduct({ ...editingProduct, promoTag: tag })}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                          editingProduct.promoTag === tag
                            ? 'bg-[#D0011B] text-white shadow'
                            : 'bg-black border border-neutral-700 text-neutral-400 hover:text-white'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setEditingProduct({ ...editingProduct, promoTag: '' })}
                      className="px-2 py-1 rounded text-[10px] bg-neutral-800 text-neutral-400 hover:text-white"
                    >
                      Kosongkan
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Atau ketik tag custom: MALL, Diskon 50%, dsb."
                    value={editingProduct.promoTag || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, promoTag: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-black border border-neutral-700 text-white focus:outline-none focus:border-[#E50914]"
                  />
                </div>
              </div>

              {/* SECTION 2: Kesesuaian Tipe Motor & Kelola Varian Manual */}
              <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-neutral-200 uppercase tracking-wider block flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#E50914]" />
                      Kesesuaian Motor & Kelola Varian Tipe Motor Manual
                    </span>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Tentukan motor apa saja yang kompatibel dengan part ini. Varian yang ada di sini akan langsung menjadi tombol pilihan variasi motor di Shopee saat pembeli checkout.
                    </p>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 rounded font-mono font-bold bg-[#E50914]/20 border border-[#E50914]/40 text-[#E50914] flex-shrink-0">
                    {bikeVariantsList.length} Varian Motor Aktif
                  </span>
                </div>

                {/* Sub-section A: Filter Kategori Garasi */}
                <div className="p-3 rounded-lg bg-black/50 border border-neutral-800 space-y-2">
                  <label className="block text-xs font-bold text-neutral-300">
                    1. Kategori Filter Etalase (Sub-Bar Motor)
                  </label>
                  <p className="text-[10px] text-neutral-500">
                    Pilih kategori umum agar produk ini muncul saat pembeli memfilter berdasarkan tipe motor di etalase:
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {BIKE_OPTIONS.map((b) => {
                      const isSelected = (editingProduct.bikeCompatibility || []).includes(b.id);
                      return (
                        <button
                          type="button"
                          key={b.id}
                          onClick={() => {
                            const cur = editingProduct.bikeCompatibility || [];
                            const next = isSelected ? cur.filter((x: string) => x !== b.id) : [...cur, b.id];
                            setEditingProduct({ ...editingProduct, bikeCompatibility: next });
                          }}
                          className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#E50914] text-white shadow-md shadow-red-950/40 border border-red-500'
                              : 'bg-neutral-900 text-neutral-400 border border-neutral-700 hover:text-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                          <span>{b.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sub-section B: Input Varian Motor Manual (Shopee Chips) */}
                <div className="p-3.5 rounded-lg bg-black/60 border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-bold text-white flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>2. Opsi Pilihan Varian Motor (Shopee Chips/Pills)</span>
                      </label>
                      <p className="text-[10px] text-neutral-400">
                        Input manual motor yang spesifik. Tidak semua part tersedia di semua motor, masukkan hanya yang cocok untuk part ini.
                      </p>
                    </div>

                    {bikeVariantsList.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setBikeVariantsList([])}
                        className="text-[11px] text-red-400 hover:text-red-300 font-bold transition-colors cursor-pointer"
                      >
                        Reset / Kosongkan
                      </button>
                    )}
                  </div>

                  {/* Manual Input Form */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Ketik nama varian motor (misal: Vario 160 ABS, Beat Karbu, Aerox 155 New) lalu tekan Enter"
                      value={newBikeVariantInput}
                      onChange={(e) => setNewBikeVariantInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = newBikeVariantInput.trim();
                          if (val && !bikeVariantsList.includes(val)) {
                            setBikeVariantsList([...bikeVariantsList, val]);
                            setNewBikeVariantInput('');
                          }
                        }
                      }}
                      className="flex-1 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-[#E50914]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = newBikeVariantInput.trim();
                        if (val && !bikeVariantsList.includes(val)) {
                          setBikeVariantsList([...bikeVariantsList, val]);
                          setNewBikeVariantInput('');
                        }
                      }}
                      disabled={!newBikeVariantInput.trim()}
                      className="px-3.5 py-2 rounded-lg bg-[#E50914] hover:bg-red-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah</span>
                    </button>
                  </div>

                  {/* Quick Suggestion Templates */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-neutral-400 font-medium block">
                        ⚡ Saran Cepat (Klik untuk menambah / menghapus):
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const autoList: string[] = [];
                          const compat = editingProduct.bikeCompatibility || [];
                          if (compat.includes('vario-pcx')) autoList.push('Vario 125 / 150', 'Vario 160 / PCX 160');
                          if (compat.includes('nmax-aerox')) autoList.push('All New NMAX / Aerox 155 Connected', 'Old NMAX / Lexi 125');
                          if (compat.includes('beat-scoopy')) autoList.push('Beat ESP / Deluxe / Street', 'Scoopy Fi / Genio');
                          if (compat.includes('mio-series')) autoList.push('Mio Sporty / Smile 5TL', 'Mio M3 / Fazzio 125');
                          if (compat.includes('sport-bebek')) autoList.push('Ninja 150 R/RR', 'Satria F / Sonic / MX King');
                          if (autoList.length === 0) autoList.push('Universal Semua Motor');
                          setBikeVariantsList(Array.from(new Set([...bikeVariantsList, ...autoList])));
                        }}
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-bold transition-colors cursor-pointer"
                      >
                        + Isi Cepat Sesuai Kategori
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
                      {POPULAR_BIKE_VARIANTS_SUGGESTIONS.map((sug, i) => {
                        const isAlreadyAdded = bikeVariantsList.includes(sug);
                        return (
                          <button
                            type="button"
                            key={i}
                            onClick={() => {
                              if (isAlreadyAdded) {
                                setBikeVariantsList(bikeVariantsList.filter((x) => x !== sug));
                              } else {
                                setBikeVariantsList([...bikeVariantsList, sug]);
                              }
                            }}
                            className={`text-[10px] px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                              isAlreadyAdded
                                ? 'bg-emerald-950/80 border-emerald-500/70 text-emerald-300 font-bold shadow-sm'
                                : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-700 text-neutral-300'
                            }`}
                          >
                            {isAlreadyAdded ? `✓ ${sug}` : `+ ${sug}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active Variants Pills Display */}
                  <div className="pt-2 border-t border-neutral-850">
                    <span className="text-[11px] font-bold text-neutral-300 block mb-1.5">
                      Varian Motor yang Akan Muncul di Tombol Shopee ({bikeVariantsList.length}):
                    </span>

                    {bikeVariantsList.length === 0 ? (
                      <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/50 text-amber-300 text-xs flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400" />
                        <span>
                          Belum ada varian motor spesifik. Part ini akan menggunakan varian default sistem. Klik saran di atas atau ketik varian motor yang tersedia.
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2 p-2.5 rounded-lg bg-neutral-950 border border-neutral-800">
                        {bikeVariantsList.map((variant, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-[#E50914]/20 border border-[#E50914]/50 text-red-200 font-bold shadow-sm"
                          >
                            <span>{variant}</span>
                            <button
                              type="button"
                              onClick={() => setBikeVariantsList(bikeVariantsList.filter((_, i) => i !== idx))}
                              className="text-neutral-400 hover:text-white p-0.5 rounded-full hover:bg-red-800/60 cursor-pointer transition-colors"
                              title="Hapus varian ini"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Sub-section C: Teks Detail Kompatibilitas */}
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">
                    3. Teks Ringkas Kompatibilitas (Tampil di kartu & detail)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Vario 160, PCX 160, All New NMAX 2020-2024"
                    value={editingProduct.compatibilityText || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, compatibilityText: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-black border border-neutral-700 text-white text-xs focus:outline-none focus:border-[#E50914]"
                  />
                </div>
              </div>

              {/* SECTION 3: Harga, Diskon & Inventaris */}
              <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-3">
                <span className="text-[11px] font-bold text-neutral-200 uppercase tracking-wider block flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-[#E50914]" />
                  Harga, Diskon & Inventaris
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-neutral-300 font-bold mb-1">
                      Harga Jual (Rp) <span className="text-[#E50914]">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={editingProduct.price}
                      onChange={(e) => {
                        const pr = parseInt(e.target.value) || 0;
                        const orig = editingProduct.originalPrice || pr;
                        const disc = orig > pr ? Math.round(((orig - pr) / orig) * 100) : 0;
                        setEditingProduct({
                          ...editingProduct,
                          price: pr,
                          discountPercent: disc,
                        });
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-black border border-neutral-700 text-white focus:outline-none focus:border-[#E50914]"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-300 font-bold mb-1">
                      Harga Normal / Coret (Rp)
                    </label>
                    <input
                      type="number"
                      min={0}
                      placeholder="Kosongkan jika tanpa diskon"
                      value={editingProduct.originalPrice || ''}
                      onChange={(e) => {
                        const val = e.target.value ? parseInt(e.target.value) || 0 : null;
                        const pr = editingProduct.price || 0;
                        const disc = val && val > pr ? Math.round(((val - pr) / val) * 100) : 0;
                        setEditingProduct({
                          ...editingProduct,
                          originalPrice: val,
                          discountPercent: disc,
                        });
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-black border border-neutral-700 text-white focus:outline-none focus:border-[#E50914]"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-300 font-bold mb-1">
                      Diskon Terhitung (%)
                    </label>
                    <div className="px-3 py-2 rounded-lg bg-black/60 border border-neutral-800 text-white flex items-center justify-between">
                      <span className="font-racing font-bold text-sm text-[#D0011B]">
                        {editingProduct.discountPercent ? `-${editingProduct.discountPercent}%` : '0% (Tanpa Diskon)'}
                      </span>
                      {editingProduct.originalPrice && editingProduct.originalPrice > editingProduct.price && (
                        <span className="text-[10px] text-emerald-400">Hemat {formatIDR(editingProduct.originalPrice - editingProduct.price)}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-neutral-300 font-bold mb-1">
                      Stok Fisik Tersedia (Pcs) <span className="text-[#E50914]">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={editingProduct.stock}
                      onChange={(e) => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-lg bg-black border border-neutral-700 text-white focus:outline-none focus:border-[#E50914]"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-300 font-bold mb-1 flex items-center justify-between">
                      <span>Berat Barang (Gram) <span className="text-[#E50914]">*</span></span>
                      <span className="text-[10px] text-neutral-500 font-normal">Digunakan untuk ongkir Biteship</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={10}
                      value={editingProduct.weight_grams || 500}
                      onChange={(e) => setEditingProduct({ ...editingProduct, weight_grams: parseInt(e.target.value) || 500 })}
                      className="w-full px-3 py-2 rounded-lg bg-black border border-neutral-700 text-white focus:outline-none focus:border-[#E50914]"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: Variasi Produk Shopee & Harga Kustom */}
              <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-bold text-neutral-200 uppercase tracking-wider block flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#E50914]" />
                      Variasi Produk & Harga Kustom (Shopee Matrix)
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      Setiap opsi dapat memiliki harga kustom (Rp) dan stok masing-masing. Harga di toko akan tampil sebagai rentang (contoh: Rp185.000 - Rp245.703) dan otomatis melonjak saat opsi diklik!
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setVarGroups([
                        ...varGroups,
                        {
                          name: '',
                          options: [
                            { name: '', price: '', stock: '' },
                            { name: '', price: '', stock: '' },
                          ],
                        },
                      ]);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-[#E50914] text-white font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer self-start sm:self-auto flex-shrink-0"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Tambah Grup Variasi</span>
                  </button>
                </div>

                {/* Quick Presets Bar */}
                <div className="p-2.5 rounded-lg bg-black/60 border border-neutral-800/80 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold text-neutral-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    Shortcut Preset Cepat:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProduct({
                        ...editingProduct,
                        price: 185000,
                        originalPrice: 260000,
                        discountPercent: 29,
                      });
                      setVarGroups([
                        {
                          name: 'PILIHAN TIPE / PAKET',
                          options: [
                            { name: 'AH1 - T1', price: 185000, stock: 20 },
                            { name: 'AH1 - T2', price: 185000, stock: 15 },
                            { name: 'AH1 - T3', price: 185000, stock: 10 },
                            { name: 'NOKEN AS + PER KLP', price: 245703, stock: 18 },
                          ],
                        },
                      ]);
                    }}
                    className="text-[10px] px-2 py-1 rounded bg-neutral-850 hover:bg-neutral-750 text-amber-300 border border-amber-800/60 font-semibold cursor-pointer transition-colors"
                  >
                    ⚡ Preset Noken As AH1 (Rp185rb - Rp245.703)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProduct({
                        ...editingProduct,
                        price: 355000,
                        originalPrice: 750000,
                        discountPercent: 53,
                      });
                      setVarGroups([
                        {
                          name: 'UKURAN BORING / PISTON',
                          options: [
                            { name: '54 mm (Standar)', price: 355000, stock: 10 },
                            { name: '58 mm (150cc Harian)', price: 420000, stock: 12 },
                            { name: '62 mm (180cc Touring)', price: 510000, stock: 6 },
                            { name: '66 mm (200cc Super Race)', price: 665000, stock: 4 },
                          ],
                        },
                      ]);
                    }}
                    className="text-[10px] px-2 py-1 rounded bg-neutral-850 hover:bg-neutral-750 text-emerald-300 border border-emerald-800/60 font-semibold cursor-pointer transition-colors"
                  >
                    ⚡ Preset Bore Up (Rp355rb - Rp665rb)
                  </button>
                  {bikeVariantsList.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newGroup: AdminVarGroup = {
                          name: 'Tipe Motor / Varian',
                          options: bikeVariantsList.map((bike) => ({
                            name: bike,
                            price: '',
                            stock: '',
                          })),
                        };
                        setVarGroups([...varGroups, newGroup]);
                      }}
                      className="text-[10px] px-2 py-1 rounded bg-neutral-850 hover:bg-neutral-750 text-blue-300 border border-blue-800/60 font-semibold cursor-pointer transition-colors"
                    >
                      ⚡ Salin dari Varian Motor ({bikeVariantsList.length})
                    </button>
                  )}
                </div>

                {varGroups.length === 0 ? (
                  <div className="p-4 rounded-lg bg-black/40 border border-neutral-800 text-center text-neutral-400 text-xs space-y-1">
                    <p className="font-semibold text-neutral-300">Belum ada grup variasi kustom untuk produk ini.</p>
                    <p className="text-[11px] text-neutral-500">
                      Jika Anda tidak menambahkan grup di sini, sistem akan otomatis menggunakan daftar Varian Motor di Section 2 sebagai pilihan pembeli. Klik salah satu preset atau &quot;Tambah Grup Variasi&quot; untuk memberi harga berbeda di tiap opsi.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {varGroups.map((g, idx) => {
                      const groupPrices = g.options
                        .map((o) => (typeof o.price === 'number' && o.price > 0 ? o.price : (editingProduct.price || 0)))
                        .filter((pr) => pr > 0);
                      const minG = groupPrices.length > 0 ? Math.min(...groupPrices) : (editingProduct.price || 0);
                      const maxG = groupPrices.length > 0 ? Math.max(...groupPrices) : (editingProduct.price || 0);
                      const hasGroupRange = minG !== maxG;

                      return (
                        <div key={idx} className="p-3.5 rounded-xl bg-black border border-neutral-800 space-y-3 shadow-inner">
                          {/* Group Header */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1">
                              <span className="text-[10px] font-bold px-2 py-1 rounded bg-neutral-900 border border-neutral-700 text-neutral-300 whitespace-nowrap">
                                Grup #{idx + 1}
                              </span>
                              <input
                                type="text"
                                placeholder="Nama Grup (Misal: PILIHAN TIPE / PAKET, UKURAN BORING, WARNA)"
                                value={g.name}
                                onChange={(e) => {
                                  const copy = [...varGroups];
                                  copy[idx].name = e.target.value;
                                  setVarGroups(copy);
                                }}
                                className="flex-1 px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-white text-xs font-bold focus:outline-none focus:border-[#E50914]"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setVarGroups(varGroups.filter((_, i) => i !== idx));
                              }}
                              className="p-1.5 rounded-lg bg-neutral-900 hover:bg-red-950 text-neutral-400 hover:text-red-400 border border-neutral-800 hover:border-red-800 transition-colors cursor-pointer"
                              title="Hapus Grup Variasi Ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Live Detected Price Range Banner */}
                          {hasGroupRange && (
                            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-xs">
                              <span className="text-amber-300 font-bold flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                                <span>Deteksi Rentang Harga Shopee: {formatIDR(minG)} - {formatIDR(maxG)}</span>
                              </span>
                              <span className="text-[10px] text-amber-200/80 hidden sm:inline">
                                Harga berganti otomatis saat opsi diklik pembeli
                              </span>
                            </div>
                          )}

                          {/* Options Table */}
                          <div className="space-y-2">
                            <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-neutral-400 px-1 uppercase tracking-wider">
                              <span className="col-span-5 sm:col-span-6">Nama Opsi (Pill Shopee)</span>
                              <span className="col-span-4 sm:col-span-3">Harga Kustom (Rp)</span>
                              <span className="col-span-2">Stok</span>
                              <span className="col-span-1 text-right">Aksi</span>
                            </div>

                            <div className="space-y-1.5">
                              {g.options.map((opt, optIdx) => (
                                <div key={optIdx} className="grid grid-cols-12 gap-2 items-center">
                                  <div className="col-span-5 sm:col-span-6">
                                    <input
                                      type="text"
                                      placeholder="Cth: AH1 - T1, 58 mm, Kanan"
                                      value={opt.name}
                                      onChange={(e) => {
                                        const copy = [...varGroups];
                                        copy[idx].options[optIdx].name = e.target.value;
                                        setVarGroups(copy);
                                      }}
                                      className="w-full px-2.5 py-1.5 rounded bg-neutral-900 border border-neutral-700 text-white text-xs focus:outline-none focus:border-[#E50914]"
                                    />
                                  </div>
                                  <div className="col-span-4 sm:col-span-3">
                                    <input
                                      type="number"
                                      min={0}
                                      placeholder={`Base: ${editingProduct.price || 0}`}
                                      value={opt.price ?? ''}
                                      onChange={(e) => {
                                        const copy = [...varGroups];
                                        const val = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0);
                                        copy[idx].options[optIdx].price = val;
                                        setVarGroups(copy);
                                      }}
                                      className="w-full px-2 py-1.5 rounded bg-neutral-900 border border-neutral-700 text-white text-xs focus:outline-none focus:border-[#E50914] font-racing font-bold text-[#D0011B]"
                                    />
                                  </div>
                                  <div className="col-span-2">
                                    <input
                                      type="number"
                                      min={0}
                                      placeholder={`${editingProduct.stock || 0}`}
                                      value={opt.stock ?? ''}
                                      onChange={(e) => {
                                        const copy = [...varGroups];
                                        const val = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0);
                                        copy[idx].options[optIdx].stock = val;
                                        setVarGroups(copy);
                                      }}
                                      className="w-full px-2 py-1.5 rounded bg-neutral-900 border border-neutral-700 text-white text-xs focus:outline-none focus:border-[#E50914]"
                                    />
                                  </div>
                                  <div className="col-span-1 text-right">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const copy = [...varGroups];
                                        copy[idx].options = copy[idx].options.filter((_, i) => i !== optIdx);
                                        setVarGroups(copy);
                                      }}
                                      className="p-1 rounded bg-neutral-900 hover:bg-red-950 text-neutral-400 hover:text-red-400 cursor-pointer"
                                      title="Hapus Opsi Ini"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const copy = [...varGroups];
                                  copy[idx].options.push({ name: '', price: '', stock: '' });
                                  setVarGroups(copy);
                                }}
                                className="px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3 h-3 text-[#E50914]" />
                                <span>Tambah Baris Opsi</span>
                              </button>

                              {minG > 0 && minG !== editingProduct.price && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingProduct({
                                      ...editingProduct,
                                      price: minG,
                                    });
                                  }}
                                  className="text-[10px] text-amber-300 hover:text-amber-200 underline cursor-pointer"
                                >
                                  Jadikan {formatIDR(minG)} sebagai Harga Dasar Produk
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Preview Pills */}
                          {g.options.filter((o) => o.name && o.name.trim()).length > 0 && (
                            <div className="pt-2 border-t border-neutral-850">
                              <span className="text-[10px] text-neutral-400 block mb-1">
                                Tampilan Tombol Varian di Halaman Pembeli:
                              </span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {g.options
                                  .filter((o) => o.name && o.name.trim())
                                  .map((opt, i) => (
                                    <span
                                      key={i}
                                      className="text-[10px] px-2.5 py-1 rounded-md bg-neutral-900 border border-neutral-700 text-neutral-200 font-medium"
                                    >
                                      <span>{opt.name}</span>
                                    </span>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SECTION 5: Foto & Deskripsi Produk */}
              <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[11px] font-bold text-neutral-200 uppercase tracking-wider block flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-[#E50914]" />
                    Foto & Deskripsi Produk
                  </span>

                  {/* Mode Selector */}
                  <div className="flex rounded-lg bg-black border border-neutral-800 p-0.5">
                    <button
                      type="button"
                      onClick={() => setImageUploadMode('upload')}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        imageUploadMode === 'upload'
                          ? 'bg-[#E50914] text-white shadow'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <UploadCloud className="w-3 h-3" />
                      <span>Upload File (JPG / PNG)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageUploadMode('url')}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        imageUploadMode === 'url'
                          ? 'bg-[#E50914] text-white shadow'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Link URL</span>
                    </button>
                  </div>
                </div>

                {/* Upload Mode: File Upload (JPG/PNG) */}
                {imageUploadMode === 'upload' ? (
                  <div className="space-y-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      onChange={handleImageFileUpload}
                      className="hidden"
                    />

                    {editingProduct.image ? (
                      <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 rounded-xl bg-black/60 border border-neutral-800">
                        <div className="relative group w-28 h-28 rounded-lg overflow-hidden border border-neutral-700 bg-neutral-950 flex-shrink-0">
                          <img
                            src={editingProduct.image}
                            alt="Foto Produk"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-[10px] font-bold text-white bg-black/80 px-2 py-1 rounded">
                              Preview
                            </span>
                          </div>
                        </div>

                        <div className="flex-1 text-center sm:text-left space-y-2">
                          <div className="flex items-center gap-2 justify-center sm:justify-start">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300">
                              <Check className="w-3 h-3 text-emerald-400" />
                              Foto Berhasil Dipilih
                            </span>
                            {editingProduct.image.startsWith('data:') && (
                              <span className="text-[10px] text-neutral-400 font-mono">
                                (Format: {editingProduct.image.includes('image/png') ? 'PNG' : 'JPG'} HD)
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-400">
                            Foto part ini sudah tersimpan dan siap dipublikasikan ke etalase toko.
                          </p>
                          <div className="flex items-center gap-2 justify-center sm:justify-start">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploadingImage}
                              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <UploadCloud className="w-3.5 h-3.5 text-[#E50914]" />
                              <span>Ganti Foto Lain</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingProduct({ ...editingProduct, image: '' })}
                              className="px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus Foto</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragOverImage(true);
                        }}
                        onDragLeave={() => setIsDragOverImage(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragOverImage(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file) processImageFile(file);
                        }}
                        onClick={() => fileInputRef.current?.click()}
                        className={`p-6 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center space-y-2 ${
                          isDragOverImage
                            ? 'border-[#E50914] bg-red-950/20'
                            : 'border-neutral-700 hover:border-[#E50914] bg-black/50 hover:bg-black/80'
                        }`}
                      >
                        <div className="w-12 h-12 mx-auto rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center text-[#E50914]">
                          {isUploadingImage ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                          ) : (
                            <UploadCloud className="w-6 h-6" />
                          )}
                        </div>

                        <div>
                          <p className="text-xs font-bold text-white">
                            {isUploadingImage
                              ? 'Sedang Memproses Foto...'
                              : 'Klik untuk Memilih Foto Produk dari Laptop / HP'}
                          </p>
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            Atau tarik & lepas (drag and drop) file foto ke kotak ini
                          </p>
                        </div>

                        <div className="flex items-center justify-center gap-2 pt-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-900 text-neutral-300 border border-neutral-800">
                            JPG
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-900 text-neutral-300 border border-neutral-800">
                            JPEG
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-900 text-neutral-300 border border-neutral-800">
                            PNG
                          </span>
                          <span className="text-[10px] text-neutral-500">Maksimal 12MB</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* URL Input Mode */
                  <div className="space-y-2">
                    <label className="block text-neutral-300 font-bold mb-1">URL Foto Produk</label>
                    <div className="flex gap-3 items-center">
                      <img
                        src={editingProduct.image || '/images/default.jpg'}
                        alt="Preview"
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 rounded-lg object-cover bg-black border border-neutral-700 flex-shrink-0"
                        onError={(e: any) => {
                          e.target.src = 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=500&auto=format&fit=crop&q=60';
                        }}
                      />
                      <input
                        type="text"
                        placeholder="https://images.unsplash.com/..."
                        value={editingProduct.image || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, image: e.target.value })}
                        className="flex-1 px-3 py-2 rounded-lg bg-black border border-neutral-700 text-white focus:outline-none focus:border-[#E50914]"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-neutral-300 font-bold mb-1">Deskripsi Lengkap Produk</label>
                  <textarea
                    rows={3}
                    placeholder="Jelaskan keunggulan part, spesifikasi material, dan garansi..."
                    value={editingProduct.description || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-black border border-neutral-700 text-white focus:outline-none focus:border-[#E50914]"
                  />
                </div>
              </div>

              {/* SECTION 6: Spesifikasi Part Teknis */}
              <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-neutral-200 uppercase tracking-wider block flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#E50914]" />
                    Spesifikasi Part Teknis (Tabel Rincian)
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setSpecRows([...specRows, { key: '', value: '' }]);
                    }}
                    className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-[#E50914] text-white font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Tambah Baris</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {specRows.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Nama Spek (Misal: Bahan, Merk, Garansi)"
                        value={row.key}
                        onChange={(e) => {
                          const copy = [...specRows];
                          copy[idx].key = e.target.value;
                          setSpecRows(copy);
                        }}
                        className="w-1/3 px-2.5 py-1.5 rounded bg-black border border-neutral-700 text-white text-xs font-semibold focus:outline-none focus:border-[#E50914]"
                      />
                      <input
                        type="text"
                        placeholder="Nilai (Misal: Aluminium CNC 6061, BRT, 1 Bulan)"
                        value={row.value}
                        onChange={(e) => {
                          const copy = [...specRows];
                          copy[idx].value = e.target.value;
                          setSpecRows(copy);
                        }}
                        className="flex-1 px-2.5 py-1.5 rounded bg-black border border-neutral-700 text-white text-xs focus:outline-none focus:border-[#E50914]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSpecRows(specRows.filter((_, i) => i !== idx));
                        }}
                        className="p-1.5 rounded bg-neutral-800 hover:bg-red-950 text-neutral-400 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 7: Visibilitas & Status Toko */}
              <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.isPromo}
                    onChange={(e) => setEditingProduct({ ...editingProduct, isPromo: e.target.checked })}
                    className="w-4 h-4 rounded text-[#E50914] bg-black border-neutral-700"
                  />
                  <span className="font-bold text-neutral-200">Tampilkan di Promo Flash Sale</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.isPaketUpgrade}
                    onChange={(e) => setEditingProduct({ ...editingProduct, isPaketUpgrade: e.target.checked })}
                    className="w-4 h-4 rounded text-[#E50914] bg-black border-neutral-700"
                  />
                  <span className="font-bold text-neutral-200">Paket Upgrade CVT Lengkap</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.isActive !== false}
                    onChange={(e) => setEditingProduct({ ...editingProduct, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-[#E50914] bg-black border-neutral-700"
                  />
                  <span className="font-bold text-emerald-400">Status Aktif (Tayang di Toko)</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-[#E50914] hover:bg-red-700 text-white font-racing font-bold tracking-wider text-sm shadow-lg shadow-red-950/50 cursor-pointer transition-all"
                >
                  SIMPAN PART RACING KE KATALOG
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsProductModalOpen(false);
                    setEditingProduct(null);
                  }}
                  className="px-6 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold transition-colors"
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
