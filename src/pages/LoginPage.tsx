import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, User, Lock, Eye, EyeOff, AlertCircle, Check, X, Flame, ChevronRight } from 'lucide-react';
import { safeFetchJson } from '../config/api';

interface PasswordRule {
  label: string;
  test: (pwd: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  { label: 'Minimal 8 karakter', test: (p) => p.length >= 8 },
  { label: 'Minimal 1 huruf kapital (A-Z)', test: (p) => /[A-Z]/.test(p) },
  { label: 'Minimal 1 simbol (!@#$%^&*)', test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

const getPasswordStrength = (pwd: string): { score: number; label: string; color: string } => {
  const passed = PASSWORD_RULES.filter(r => r.test(pwd)).length;
  if (passed === 0) return { score: 0, label: '', color: '' };
  if (passed === 1) return { score: 1, label: 'Lemah', color: '#E50914' };
  if (passed === 2) return { score: 2, label: 'Sedang', color: '#f59e0b' };
  return { score: 3, label: 'Kuat', color: '#10b981' };
};

export const LoginPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/';

  const strength = getPasswordStrength(password);
  const isPasswordValid = PASSWORD_RULES.every(r => r.test(password));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      if (!isPasswordValid) {
        setError('Password tidak memenuhi syarat keamanan. Periksa kembali requirements di bawah.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Konfirmasi password tidak cocok.');
        return;
      }
    }

    setLoading(true);
    const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';

    try {
      const data = await safeFetchJson<any>(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      login(data.token, data.user);
      if (data.user?.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setError('');
    setPassword('');
    setConfirmPassword('');
    setPasswordFocused(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* Left: Branding / Illustration Panel */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] flex-shrink-0 bg-[#111111] border-r border-neutral-800 p-10 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_#E50914_0%,_transparent_55%)] opacity-10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_#E50914_0%,_transparent_50%)] opacity-5" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px]" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#E50914] to-red-800 flex items-center justify-center shadow-lg shadow-red-950/50">
            <Flame className="w-6 h-6 text-white fill-white/30" />
          </div>
          <div>
            <p className="font-racing font-extrabold text-xl text-white tracking-wider uppercase">JAWIR GARAGE</p>
            <p className="text-[11px] text-neutral-500 font-medium tracking-widest uppercase">Platinum Speedshop</p>
          </div>
        </div>

        {/* Main tagline */}
        <div className="relative z-10">
          <h1 className="font-racing font-black text-4xl xl:text-5xl text-white uppercase leading-tight mb-4">
            PERFORMA<br />
            <span className="text-[#E50914]">LEBIH DARI</span><br />
            SEKEDAR PART.
          </h1>
          <p className="text-neutral-400 text-sm leading-relaxed max-w-sm">
            Bergabunglah dengan ribuan pecinta otomotif Indonesia. Dapatkan akses ke ribuan spare part racing premium, CVT upgrade kits, dan eksklusivitas penawaran member.
          </p>

          {/* Feature bullets */}
          <div className="mt-8 space-y-3">
            {['100% Plug & Play Garansi Pasang', 'Pengiriman Same-Day ke seluruh JABODETABEK', 'Konsultasi gratis dengan mekanik berpengalaman'].map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-emerald-400" />
                </div>
                <p className="text-sm text-neutral-300">{f}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom testimonial */}
        <div className="relative z-10 p-4 rounded-xl bg-white/5 border border-neutral-800 backdrop-blur-sm">
          <p className="text-xs text-neutral-300 italic leading-relaxed">
            "Stok lengkap, cepat, dan mekaniknya ramah. Sudah belanja 3x dan selalu puas!"
          </p>
          <div className="flex items-center gap-2 mt-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-xs font-bold">R</div>
            <div>
              <p className="text-xs font-bold text-white">Rizky A.</p>
              <p className="text-[10px] text-neutral-500">Member Premium · NMAX Owner</p>
            </div>
            <div className="ml-auto flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-3 h-3 text-amber-400">★</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right: Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        {/* Mobile logo */}
        <div className="lg:hidden absolute top-6 left-6 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#E50914] flex items-center justify-center">
            <Flame className="w-4 h-4 text-white fill-white/30" />
          </div>
          <span className="font-racing font-bold text-white text-base uppercase tracking-wide">Jawir Garage</span>
        </div>

        <div className="w-full max-w-md">
          {/* Tab switcher */}
          <div className="flex p-1 bg-neutral-900 rounded-xl border border-neutral-800 mb-8">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  mode === m
                    ? 'bg-[#E50914] text-white shadow-lg shadow-red-950/40'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {m === 'login' ? 'Masuk' : 'Daftar Baru'}
              </button>
            ))}
          </div>

          {/* Header */}
          <div className="mb-7">
            <h2 className="text-2xl font-racing font-bold text-white uppercase tracking-wide">
              {mode === 'login' ? 'Selamat Datang Kembali' : 'Buat Akun Member'}
            </h2>
            <p className="text-neutral-400 text-sm mt-1">
              {mode === 'login'
                ? 'Masuk ke akun Jawir Garage kamu untuk melanjutkan belanja.'
                : 'Daftar sekarang dan nikmati promo eksklusif member!'}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/40 mb-5">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <p className="text-sm text-red-300">{error}</p>
                {(error.includes('404') || error.includes('terhubung') || error.includes('Network') || error.includes('bukan format JSON')) && (
                  <div className="pt-2 border-t border-red-500/20">
                    <p className="text-[11px] text-neutral-400 mb-2">
                      💡 <strong>Tips:</strong> Jika backend belum aktif di hosting Anda, Anda dapat menguji aplikasi menggunakan mode demo darurat:
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          login('demo-admin-token', { id: 'u-admin', username: 'admin', role: 'admin' });
                          navigate('/admin', { replace: true });
                        }}
                        className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-bold transition-all cursor-pointer shadow-sm"
                      >
                        Masuk Mode Demo (Admin)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          login('demo-user-token', { id: 'u-demo', username: username || 'demo_user', role: 'user' });
                          navigate(from, { replace: true });
                        }}
                        className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium transition-all cursor-pointer border border-neutral-700"
                      >
                        Masuk Mode Demo (Member)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-1.5 uppercase tracking-wider">Username</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-neutral-900 border border-neutral-700 rounded-xl text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914]/50 transition-all"
                  placeholder="Masukkan username unik kamu"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-1.5 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  className="w-full pl-10 pr-11 py-3 bg-neutral-900 border border-neutral-700 rounded-xl text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914]/50 transition-all"
                  placeholder="Buat password yang kuat"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength bar (Register mode only) */}
              {mode === 'register' && password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1.5">
                    {[1, 2, 3].map((s) => (
                      <div
                        key={s}
                        className="flex-1 h-1 rounded-full transition-all duration-300"
                        style={{ backgroundColor: strength.score >= s ? strength.color : '#262626' }}
                      />
                    ))}
                  </div>
                  {strength.label && (
                    <p className="text-[11px] font-bold" style={{ color: strength.color }}>
                      Password: {strength.label}
                    </p>
                  )}
                </div>
              )}

              {/* Password rules checklist (Register mode only) */}
              {mode === 'register' && (passwordFocused || password.length > 0) && (
                <div className="mt-3 p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-2">
                  <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Syarat Password:</p>
                  {PASSWORD_RULES.map((rule, i) => {
                    const passed = rule.test(password);
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${passed ? 'bg-emerald-500/20 border border-emerald-500/50' : 'bg-neutral-800 border border-neutral-700'}`}>
                          {passed
                            ? <Check className="w-2.5 h-2.5 text-emerald-400" />
                            : <X className="w-2.5 h-2.5 text-neutral-500" />}
                        </div>
                        <span className={`text-xs transition-colors ${passed ? 'text-emerald-400' : 'text-neutral-500'}`}>
                          {rule.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Confirm Password (Register only) */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1.5 uppercase tracking-wider">Konfirmasi Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full pl-10 pr-11 py-3 bg-neutral-900 border rounded-xl text-white text-sm placeholder-neutral-600 focus:outline-none transition-all ${
                      confirmPassword && confirmPassword !== password
                        ? 'border-red-500/70 focus:ring-1 focus:ring-red-500/30'
                        : confirmPassword && confirmPassword === password
                        ? 'border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/30'
                        : 'border-neutral-700 focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914]/50'
                    }`}
                    placeholder="Ulangi password kamu"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  {confirmPassword && (
                    <div className={`absolute right-11 top-1/2 -translate-y-1/2`}>
                      {confirmPassword === password
                        ? <Check className="w-4 h-4 text-emerald-400" />
                        : <X className="w-4 h-4 text-red-400" />}
                    </div>
                  )}
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Password tidak cocok
                  </p>
                )}
              </div>
            )}



            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-2 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all bg-[#E50914] hover:bg-red-700 text-white shadow-lg shadow-red-950/30 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>{mode === 'login' ? 'Masuk ke Akun' : 'Buat Akun Sekarang'}</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Back to store */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              ← Kembali ke Toko tanpa Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
