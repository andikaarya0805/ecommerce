import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { ChatMessage, ChatProductPayload } from '../types';
import { safeFetchJson } from '../config/api';
import { formatIDR } from './ProductCard';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  ShieldCheck,
  ChevronDown,
  ExternalLink,
  Sparkles,
  ShoppingBag,
  HelpCircle,
  Phone,
  CheckCheck,
} from 'lucide-react';

export const LiveChatWidget: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isExcludedPage =
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/checkout' ||
    location.pathname === '/cart' ||
    location.pathname.startsWith('/admin');

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showTooltip, setShowTooltip] = useState(true);
  const [attachedProduct, setAttachedProduct] = useState<ChatProductPayload | null>(null);

  // Persistent guest identity
  const [guestId, setGuestId] = useState<string>(() => {
    let saved = localStorage.getItem('jawir_guest_chat_id');
    if (!saved) {
      saved = 'guest_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('jawir_guest_chat_id', saved);
    }
    return saved;
  });

  const [guestName] = useState<string>(() => {
    let saved = localStorage.getItem('jawir_guest_name');
    if (!saved) {
      saved = 'Pelanggan #' + Math.floor(1000 + Math.random() * 9000);
      localStorage.setItem('jawir_guest_name', saved);
    }
    return saved;
  });

  const roomId = user ? `room_user_${user.id}` : `room_guest_${guestId}`;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  // Fetch messages from server
  const fetchMessages = async () => {
    try {
      const res = await safeFetchJson<{ room: any; messages: ChatMessage[] }>(
        `/api/chat/messages/${roomId}`
      );
      if (res && res.messages) {
        setMessages(res.messages);
        if (res.room && !isOpen) {
          setUnreadCount(res.room.unread_user || 0);
        }
      }
    } catch (err) {
      // Quiet fail on network hiccups
    }
  };

  // Mark room as read for user
  const markAsRead = async () => {
    try {
      await safeFetchJson(`/api/chat/rooms/${roomId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'user' }),
      });
      setUnreadCount(0);
    } catch (err) {}
  };

  // Polling: 1s when open, 2s when closed (Real-time sync)
  useEffect(() => {
    fetchMessages();
    const intervalTime = isOpen ? 1000 : 2000;
    const interval = setInterval(fetchMessages, intervalTime);
    return () => clearInterval(interval);
  }, [roomId, isOpen]);

  // When opening chat, clear unread & scroll to bottom
  useEffect(() => {
    if (isOpen) {
      markAsRead();
      scrollToBottom(false);
      setShowTooltip(false);
    }
  }, [isOpen]);

  // Scroll on message change
  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages.length, isOpen]);

  // Listen to custom event from "Chat Sekarang" or "Chat Penjual" buttons across the store
  useEffect(() => {
    const handleOpenChatEvent = (e: any) => {
      const detail = e.detail;
      setIsOpen(true);
      if (detail?.product) {
        setAttachedProduct(detail.product);
      }
      if (detail?.initialMessage) {
        setInputMessage(detail.initialMessage);
      }
    };

    window.addEventListener('open-jawir-chat', handleOpenChatEvent);
    return () => window.removeEventListener('open-jawir-chat', handleOpenChatEvent);
  }, []);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isSending) return;

    setIsSending(true);
    setInputMessage('');

    // Optimistic user message
    const tempMsg: ChatMessage = {
      id: 'temp_' + Date.now(),
      room_id: roomId,
      sender_type: 'user',
      sender_name: user ? user.username : guestName,
      message: text,
      product_payload: attachedProduct,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);
    setAttachedProduct(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await safeFetchJson<{
        success: boolean;
        roomId: string;
        botReply?: ChatMessage | null;
      }>('/api/chat/send', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          roomId,
          message: text,
          guestId: user ? undefined : guestId,
          guestName: user ? undefined : guestName,
          productContext: attachedProduct,
        }),
      });

      if (res && res.botReply) {
        setMessages((prev) => [...prev, res.botReply!]);
      }
      await fetchMessages();
    } catch (err: any) {
      console.error('Error sending chat:', err);
    } finally {
      setIsSending(false);
      scrollToBottom();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickPrompts = [
    { label: '🔍 Cek Stok Pulley & Roller', text: 'Apakah pulley dan roller ready stok kak?' },
    { label: '🏍️ Racikan Beat / Scoopy', text: 'Minta rekomendasi racikan kirian buat motor Beat FI / Scoopy biar enteng di tanjakan' },
    { label: '🏍️ Racikan NMAX / Aerox', text: 'Saran racikan upgrade CVT buat NMAX / Aerox anti gredek dan nafas panjang' },
    { label: '📦 Lacak Pesanan Saya', text: 'Saya mau cek status pesanan dan nomor resi saya' },
    { label: '🚚 Jadwal Pengiriman & Ongkir', text: 'Kapan pesanan saya dikirim dan pakai kurir apa saja?' },
    { label: '👨‍🔧 Bicara dengan Admin / Mekanik', text: 'Tolong hubungkan saya dengan mekanik atau admin Jawir Garage' },
  ];

  const handleProductCardClick = (prod: ChatProductPayload) => {
    if (prod.id) {
      navigate(`/product/${prod.id}`);
      setIsOpen(false);
    }
  };

  // Do not render floating trigger on login, register, checkout, cart, or admin pages when closed
  if (isExcludedPage && !isOpen) {
    return null;
  }

  return (
    <div className="fixed z-40 bottom-4 right-4 flex flex-col items-end pointer-events-auto select-none font-sans transition-all duration-300">
      {/* Mini Tooltip Prompt when closed */}
      {!isOpen && showTooltip && (
        <div className="hidden sm:flex relative mb-2 px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-700 shadow-2xl text-neutral-200 text-xs items-center gap-2.5 max-w-[260px] animate-in fade-in slide-in-from-bottom-2">
          <Sparkles className="w-4 h-4 text-[#E50914] shrink-0 animate-pulse" />
          <div className="leading-tight">
            <span className="font-bold text-white block">Tanya Admin & Jawir Bot</span>
            <span className="text-[11px] text-neutral-400">Cek stok, racikan motor & pesanan</span>
          </div>
          <button
            onClick={() => setShowTooltip(false)}
            className="text-neutral-400 hover:text-white ml-1 p-1"
            aria-label="Tutup tooltip"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-neutral-900 border-r border-b border-neutral-700 rotate-45" />
        </div>
      )}

      {/* Floating Action Trigger Button */}
      {!isOpen && (
        <div className="flex items-center gap-2">
          {/* Main Shopee Live Chat Button */}
          <button
            id="floating-live-chat-btn"
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-2.5 bg-gradient-to-r from-[#D0011B] to-[#E50914] hover:from-[#E50914] hover:to-[#ff1a25] active:scale-95 text-white px-5 py-3 rounded-full shadow-2xl shadow-red-950/80 border border-red-400/50 transition-all cursor-pointer min-h-[50px]"
            aria-label="Buka Chat Toko & Mekanik"
          >
            <div className="relative">
              <MessageCircle className="w-5 h-5 fill-current" />
              {unreadCount > 0 && (
                <span className="absolute -top-2.5 -right-2.5 bg-amber-400 text-neutral-950 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-bounce">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-black uppercase tracking-wider font-heading leading-tight flex items-center gap-1.5">
                Chat Penjual
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </span>
              <span className="text-[10px] text-red-100/90 -mt-0.5">Jawir Bot & Admin Online</span>
            </div>
          </button>
        </div>
      )}

      {/* Shopee-style Chat Window Box */}
      {isOpen && (
        <div className="w-[94vw] sm:w-[410px] h-[580px] max-h-[85vh] bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-850 border-b border-neutral-800 px-4 py-3 flex items-center justify-between text-white shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-9 h-9 rounded-full bg-neutral-800 border border-red-500/40 p-1 flex items-center justify-center shrink-0">
                <span className="text-[#E50914] font-black text-sm tracking-tighter">JG</span>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-neutral-900" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-xs truncate">Jawir Garage Official</h4>
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  <span>Respon Cepat ~ 24 Jam Aktif</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Minimize */}
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
                title="Tutup Chat"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Shopee Store Performance Banner */}
          <div className="bg-neutral-900/80 border-b border-neutral-800/80 px-3 py-1.5 flex items-center justify-between text-[11px] text-neutral-400 shrink-0">
            <div className="flex items-center gap-3">
              <span>Performa Chat: <strong className="text-emerald-400 font-semibold">100%</strong></span>
              <span>•</span>
              <span>Waktu Balas: <strong className="text-neutral-200 font-semibold">Hitungan Menit</strong></span>
            </div>
            <span className="text-[10px] text-neutral-400 font-mono">
              {user ? `@${user.username}` : guestName}
            </span>
          </div>

          {/* Quick Prompts Bar (Horizontal Scrollable Chips) */}
          <div className="bg-neutral-950 px-2.5 py-2 border-b border-neutral-850 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(p.text)}
                disabled={isSending}
                className="shrink-0 text-[11px] bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 hover:border-neutral-700 px-2.5 py-1 rounded-full transition-all cursor-pointer active:scale-95 whitespace-nowrap"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-neutral-950/70 text-xs">
            {/* Store Greeting Welcome Card if empty */}
            {messages.length === 0 && (
              <div className="bg-gradient-to-b from-neutral-900 to-neutral-900/60 border border-neutral-800 rounded-xl p-3.5 text-neutral-300 space-y-2 text-center animate-in fade-in">
                <div className="w-10 h-10 mx-auto rounded-full bg-red-950/60 border border-red-500/30 flex items-center justify-center text-[#E50914]">
                  <Bot className="w-5 h-5" />
                </div>
                <h5 className="font-bold text-white text-xs">Halo! Selamat Datang di Jawir Garage</h5>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Asisten pintar kami siap menjawab ketersediaan stok, harga, racikan motor, dan status pesanan langsung dari database toko!
                </p>
                <div className="pt-1 flex flex-wrap justify-center gap-1.5">
                  <span className="text-[10px] bg-neutral-800/80 text-neutral-400 px-2 py-0.5 rounded-full">
                    ✅ Cek Stok Otomatis
                  </span>
                  <span className="text-[10px] bg-neutral-800/80 text-neutral-400 px-2 py-0.5 rounded-full">
                    🏍️ Konsultasi Motor
                  </span>
                  <span className="text-[10px] bg-neutral-800/80 text-neutral-400 px-2 py-0.5 rounded-full">
                    📦 Lacak Invoice
                  </span>
                </div>
              </div>
            )}

            {/* Message Bubbles */}
            {messages.map((m) => {
              const isUser = m.sender_type === 'user';
              const isBot = m.sender_type === 'bot';
              const isAdmin = m.sender_type === 'admin';

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
                >
                  {/* Sender label */}
                  <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 px-1">
                    {isBot && (
                      <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 px-1.5 py-0.2 rounded font-bold flex items-center gap-1">
                        <Bot className="w-2.5 h-2.5" /> Jawir Bot
                      </span>
                    )}
                    {isAdmin && (
                      <span className="bg-red-950/80 text-red-400 border border-red-800/50 px-1.5 py-0.2 rounded font-bold flex items-center gap-1">
                        <ShieldCheck className="w-2.5 h-2.5 text-blue-400" /> Admin Jawir
                      </span>
                    )}
                    {isUser && <span>{user ? user.username : 'Anda'}</span>}
                    <span className="text-neutral-500 text-[9px]">
                      {new Date(m.created_at).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Bubble Content */}
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-md leading-relaxed whitespace-pre-wrap ${
                      isUser
                        ? 'bg-[#E50914] text-white rounded-tr-none'
                        : isBot
                        ? 'bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-tl-none'
                        : 'bg-neutral-850 border border-red-500/30 text-white rounded-tl-none ring-1 ring-red-500/20'
                    }`}
                  >
                    {m.message}

                    {/* Shopee Interactive Product Card Payload */}
                    {m.product_payload && (
                      <div
                        onClick={() => handleProductCardClick(m.product_payload!)}
                        className="mt-2.5 bg-neutral-950/90 border border-neutral-700 hover:border-[#E50914] rounded-xl p-2.5 flex gap-2.5 transition-all cursor-pointer group text-left"
                      >
                        <img
                          src={m.product_payload.image}
                          alt={m.product_payload.name}
                          className="w-14 h-14 rounded-lg object-cover bg-neutral-900 shrink-0 border border-neutral-800 group-hover:scale-105 transition-transform"
                          onError={(e: any) => {
                            e.target.src = 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=300';
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <h6 className="font-semibold text-white text-[11px] truncate group-hover:text-[#E50914] transition-colors">
                            {m.product_payload.name}
                          </h6>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[#E50914] font-bold text-xs">
                              {formatIDR(m.product_payload.price)}
                            </span>
                            {m.product_payload.originalPrice && m.product_payload.originalPrice > m.product_payload.price && (
                              <span className="text-[10px] text-neutral-400 line-through">
                                {formatIDR(m.product_payload.originalPrice)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-1 text-[10px]">
                            <span className={m.product_payload.stock > 0 ? 'text-emerald-400' : 'text-amber-400'}>
                              {m.product_payload.stock > 0 ? `Stok: ${m.product_payload.stock} pcs` : 'Stok Habis'}
                            </span>
                            <span className="text-neutral-400 flex items-center gap-0.5 group-hover:text-white transition-colors">
                              Lihat <ExternalLink className="w-2.5 h-2.5" />
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isSending && (
              <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] italic px-2">
                <span className="w-1.5 h-1.5 bg-[#E50914] rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-[#E50914] rounded-full animate-bounce delay-100" />
                <span className="w-1.5 h-1.5 bg-[#E50914] rounded-full animate-bounce delay-200" />
                <span>Jawir Bot sedang merespons...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Attached Product Preview Bar */}
          {attachedProduct && (
            <div className="bg-neutral-900 border-t border-neutral-800 px-3 py-1.5 flex items-center justify-between shrink-0 animate-in fade-in">
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={attachedProduct.image}
                  alt={attachedProduct.name}
                  className="w-8 h-8 rounded object-cover shrink-0 border border-neutral-700"
                />
                <div className="min-w-0">
                  <span className="text-[10px] text-neutral-400 block">Menanyakan produk:</span>
                  <span className="text-[11px] font-semibold text-white truncate block max-w-[200px]">
                    {attachedProduct.name}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setAttachedProduct(null)}
                className="text-neutral-400 hover:text-white p-1"
                title="Batal lampirkan produk"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Footer Input Bar */}
          <div className="bg-neutral-900 border-t border-neutral-800 p-3 flex items-center gap-2.5 shrink-0">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ketik pesan atau tanya part..."
              disabled={isSending}
              className="flex-1 bg-neutral-950 border border-neutral-700 rounded-full px-4 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#E50914] transition-colors"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || isSending}
              className="w-11 h-11 rounded-full bg-[#E50914] hover:bg-[#ff1a25] disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-transform active:scale-95 shrink-0 cursor-pointer shadow-lg"
              title="Kirim Pesan"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
