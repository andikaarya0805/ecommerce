import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';

export const WhatsAppFloatingButton: React.FC = () => {
  const [showTooltip, setShowTooltip] = useState(true);

  return (
    <div className="fixed bottom-4 right-4 z-30 flex flex-col items-end pointer-events-auto">
      {/* Mini Tooltip Prompt */}
      {showTooltip && (
        <div className="relative mb-2 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 shadow-xl text-neutral-200 text-xs flex items-center gap-2 max-w-[220px] animate-in fade-in slide-in-from-bottom-2">
          <span>💬 Mau tanya racikan CVT & roller motor kamu?</span>
          <button
            onClick={() => setShowTooltip(false)}
            className="text-neutral-400 hover:text-white"
            aria-label="Tutup tooltip"
          >
            <X className="w-3 h-3" />
          </button>
          <div className="absolute -bottom-1.5 right-5 w-3 h-3 bg-neutral-900 border-r border-b border-neutral-700 rotate-45" />
        </div>
      )}

      {/* Floating Action Button */}
      <button
        id="floating-whatsapp-btn"
        type="button"
        onClick={() => {
          window.dispatchEvent(
            new CustomEvent('open-jawir-chat', {
              detail: {
                initialMessage: 'Halo Mekanik Jawir Garage, saya mau konsultasi part kirian CVT!',
              },
            })
          );
        }}
        className="group relative flex items-center gap-2 bg-[#E50914] hover:bg-[#ff1a25] active:scale-95 text-white p-3 sm:px-4 sm:py-2.5 rounded-full shadow-2xl shadow-red-950/60 border border-red-400/40 transition-all cursor-pointer"
        aria-label="Chat Live Mekanik"
      >
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
        </span>
        <MessageCircle className="w-5 h-5 fill-current" />
        <span className="hidden sm:inline text-xs font-bold font-heading uppercase tracking-wider">
          Chat Live Mekanik
        </span>
      </button>
    </div>
  );
};
