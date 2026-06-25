import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

interface AdminLoginProps {
  portalName: string;
  themeClass: string;
  allowedRoles: string[];
  onLoginSuccess: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ portalName, themeClass, allowedRoles, onLoginSuccess }) => {
  const { login, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      
      // We must fetch the profile to verify role (already updated in AuthContext)
      // Check if user is in allowedRoles
      const token = localStorage.getItem('access_token');
      if (token) {
        const res = await fetch('/api/auth/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const profile = await res.json();
          const normalizedRole = (profile.role || '').toUpperCase();
          const normalizedAllowed = allowedRoles.map(r => r.toUpperCase());
          
          if (normalizedAllowed.includes(normalizedRole) || normalizedRole === 'ADMIN') {
            onLoginSuccess();
            return;
          }
        }
      }
      
      // If we reach here, unauthorized role
      logout();
      setError('❌ Unauthorized role for this portal.');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen bg-brand-bg text-brand-text flex flex-col justify-center items-center px-4 relative overflow-hidden font-sans ${themeClass}`}>
      {/* Background Decorative Elements */}
      <div className="absolute top-20 right-[10%] w-32 h-32 border-4 border-brand-primary opacity-20 hidden lg:block"></div>
      <div className="absolute bottom-40 left-[5%] w-64 h-8 bg-brand-primary-container hidden lg:block -rotate-12"></div>
      
      <div className="w-full max-w-md relative z-10">
        <div className="bauhaus-shape-1"></div>
        <div className="bauhaus-shape-2"></div>

        {/* Logo */}
        <div className="flex justify-center items-center gap-2 mb-8">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 bg-brand-primary-container border-2 border-brand-primary flex items-center justify-center font-headline font-black text-xl text-brand-primary">
              S
            </div>
            <span className="font-headline font-black text-2xl tracking-tighter text-brand-primary uppercase">
              SmartSIM <span className="text-brand-secondary">{portalName}</span>
            </span>
          </div>
        </div>

        {/* Login Box */}
        <section className="bg-white border-4 border-brand-primary p-8 md:p-12 neo-brutal-shadow relative z-10 rounded-none">
          <header className="mb-10">
            <h1 className="font-headline font-black text-4xl md:text-5xl leading-none uppercase tracking-tighter mb-4">
              STAFF<br/>SIGN IN
            </h1>
            <p className="font-sans text-xs font-semibold opacity-80">Access the internal operations dashboard.</p>
          </header>

          {error && (
            <div className="mb-6 p-4 border-2 border-brand-primary bg-brand-secondary text-white flex items-start gap-3 text-sm font-headline font-bold uppercase neo-brutal-shadow-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-2">
              <label className="block font-headline font-bold uppercase tracking-widest text-[10px]" htmlFor="email">
                Administrative Email
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="admin@smartsim.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent border-b-4 border-t-0 border-l-0 border-r-0 border-brand-primary px-0 py-3 font-sans text-lg focus:outline-none focus:border-brand-secondary focus:ring-0 transition-colors placeholder:text-slate-400 font-semibold"
                />
                <Mail className="absolute right-0 bottom-3 text-brand-primary w-5 h-5" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block font-headline font-bold uppercase tracking-widest text-[10px]" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent border-b-4 border-t-0 border-l-0 border-r-0 border-brand-primary px-0 py-3 font-sans text-lg focus:outline-none focus:border-brand-secondary focus:ring-0 transition-colors placeholder:text-slate-400 font-semibold"
                />
                <Lock className="absolute right-0 bottom-3 text-brand-primary w-5 h-5" />
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-primary-container text-brand-primary border-4 border-brand-primary py-4 px-6 font-headline font-black text-xl uppercase tracking-wider neo-brutal-shadow-sm neo-brutal-shadow-hover transition-all flex items-center justify-center gap-3 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin font-black" />
                    <span>VERIFYING credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Portal</span>
                    <ArrowRight className="w-5 h-5 font-bold" />
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default AdminLogin;
