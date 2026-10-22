import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabaseClient } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { safeFetchJson } from '../config/api';
import { Flame, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export const AuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const redirectTarget = searchParams.get('redirect') || '/';

  useEffect(() => {
    let isMounted = true;

    const processSession = async (sessionUser: any) => {
      try {
        const email = sessionUser.email;
        const name =
          sessionUser.user_metadata?.full_name ||
          sessionUser.user_metadata?.name ||
          sessionUser.user_metadata?.user_name ||
          email?.split('@')[0];
        const avatar_url =
          sessionUser.user_metadata?.avatar_url ||
          sessionUser.user_metadata?.picture;
        const google_id = sessionUser.id;

        const res = await safeFetchJson<any>('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name, avatar_url, google_id }),
        });

        if (!isMounted) return;

        login(res.token, res.user);
        setStatus('success');

        setTimeout(() => {
          if (isMounted) {
            if (res.user?.role === 'admin') {
              navigate('/admin', { replace: true });
            } else {
              navigate(redirectTarget, { replace: true });
            }
          }
        }, 1200);
      } catch (err: any) {
        if (!isMounted) return;
        console.error('[AuthCallback] Backend sync error:', err);
        setStatus('error');
        setErrorMessage(err.message || 'Gagal menyinkronkan profil Google dengan sistem');
      }
    };

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error) throw error;

        if (session?.user) {
          await processSession(session.user);
          return;
        }

        // Listen if session is delivered asynchronously via hash
        const { data: authListener } = supabaseClient.auth.onAuthStateChange(
          async (event, currentSession) => {
            if (currentSession?.user) {
              await processSession(currentSession.user);
            }
          }
        );

        // Fallback timeout if no session was received within 6 seconds
        const timer = setTimeout(() => {
          if (isMounted && status === 'loading') {
            setStatus('error');
            setErrorMessage('Waktu verifikasi habis. Tidak ada data sesi Google yang terdeteksi.');
          }
        }, 6000);

        return () => {
          authListener.subscription.unsubscribe();
          clearTimeout(timer);
        };
      } catch (err: any) {
        if (!isMounted) return;
        console.error('[AuthCallback] Session error:', err);
        setStatus('error');
        setErrorMessage(err.message || 'Gagal memproses sesi autentikasi Google.');
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, [navigate, login, redirectTarget]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#111111] border border-neutral-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden text-center">
        {/* Glow backdrop */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#E50914_0%,_transparent_60%)] opacity-10 pointer-events-none" />

        {/* Logo Badge */}
        <div className="relative mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-[#E50914] to-red-800 flex items-center justify-center shadow-lg shadow-red-950/50 mb-6">
          <Flame className="w-8 h-8 text-white fill-white/30" />
        </div>

        {status === 'loading' && (
          <div className="space-y-4">
            <h2 className="text-xl font-racing font-bold text-white uppercase tracking-wider">
              Menghubungkan Akun Google
            </h2>
            <p className="text-sm text-neutral-400">
              Sedang memverifikasi data dan menyiapkan profil Jawir Garage kamu...
            </p>
            <div className="flex justify-center pt-4">
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 rounded-full border-2 border-neutral-700" />
                <div className="absolute inset-0 rounded-full border-2 border-[#E50914] border-t-transparent animate-spin" />
              </div>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/50 mx-auto flex items-center justify-center text-emerald-400">
              <CheckCircle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-racing font-bold text-white uppercase tracking-wider">
              Login Berhasil!
            </h2>
            <p className="text-sm text-neutral-400">
              Selamat datang! Mengalihkan kamu ke Jawir Garage...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/50 mx-auto flex items-center justify-center text-red-400">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-racing font-bold text-white uppercase tracking-wider">
              Gagal Memverifikasi Akun
            </h2>
            <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-left">
              {errorMessage}
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => navigate('/login', { replace: true })}
                className="w-full py-3 bg-[#E50914] hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all"
              >
                Kembali ke Halaman Login
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Coba Lagi
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
