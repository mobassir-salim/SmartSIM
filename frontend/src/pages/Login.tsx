import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
      if (err.message && err.message.toLowerCase().includes('activated')) {
        setTimeout(() => {
          navigate(`/verify-otp?email=${encodeURIComponent(email)}&purpose=activation`);
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col justify-center items-center px-4 relative overflow-hidden font-sans select-none">
      {/* Background Decorative Elements */}
      <div className="absolute top-20 right-[10%] w-32 h-32 border-4 border-brand-primary opacity-20 hidden lg:block"></div>
      <div className="absolute bottom-40 left-[5%] w-64 h-8 bg-brand-primary-container hidden lg:block -rotate-12"></div>
      
      <div className="w-full max-w-md relative z-10">
        {/* Bauhaus Geometric Background Shapes */}
        <div className="bauhaus-shape-1"></div>
        <div className="bauhaus-shape-2"></div>

        {/* Logo */}
        <div className="flex justify-center items-center gap-2 mb-8">
          <Link to="/" className="flex items-center gap-2.5 decoration-none">
            <div className="h-10 w-10 bg-brand-primary-container border-2 border-brand-primary flex items-center justify-center font-headline font-black text-xl text-brand-primary">
              S
            </div>
            <span className="font-headline font-black text-2xl tracking-tighter text-brand-primary uppercase">
              Smart<span className="text-brand-secondary">SIM</span>
            </span>
          </Link>
        </div>

        {/* Login Container */}
        <section className="bg-white border-4 border-brand-primary p-8 md:p-12 neo-brutal-shadow relative z-10 rounded-none">
          <header className="mb-10">
            <h1 className="font-headline font-black text-5xl md:text-6xl leading-none uppercase tracking-tighter mb-4">
              WELCOME<br/>BACK
            </h1>
            <p className="font-sans text-sm font-semibold opacity-80">Access your digital global connectivity portal.</p>
          </header>

          {error && (
            <div className="mb-6 p-4 border-2 border-brand-primary bg-brand-secondary text-white flex items-start gap-3 text-sm font-headline font-bold uppercase neo-brutal-shadow-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="block font-headline font-bold uppercase tracking-widest text-xs" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent border-b-4 border-t-0 border-l-0 border-r-0 border-brand-primary px-0 py-3 font-sans text-lg focus:outline-none focus:border-brand-tertiary focus:ring-0 transition-colors placeholder:text-slate-400 font-semibold"
                />
                <Mail className="absolute right-0 bottom-3 text-brand-primary w-5 h-5" />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <label className="block font-headline font-bold uppercase tracking-widest text-xs" htmlFor="password">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs font-headline font-bold uppercase text-brand-tertiary hover:underline underline-offset-4">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent border-b-4 border-t-0 border-l-0 border-r-0 border-brand-primary px-0 py-3 font-sans text-lg focus:outline-none focus:border-brand-tertiary focus:ring-0 transition-colors placeholder:text-slate-400 font-semibold"
                />
                <Lock className="absolute right-0 bottom-3 text-brand-primary w-5 h-5" />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-primary-container text-brand-primary border-4 border-brand-primary py-5 px-6 font-headline font-black text-2xl uppercase tracking-wider neo-brutal-shadow-sm neo-brutal-shadow-hover transition-all flex items-center justify-center gap-3 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin font-black" />
                    <span>SIGNING IN...</span>
                  </>
                ) : (
                  <>
                    <span>LOGIN</span>
                    <ArrowRight className="w-6 h-6 font-bold" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer Links */}
          <footer className="mt-12 pt-8 border-t-2 border-brand-primary border-dashed">
            <p className="font-headline font-bold text-center uppercase tracking-tight text-xs">
              New to SmartSIM?{' '}
              <Link to="/register" className="text-brand-tertiary hover:bg-brand-primary-container px-1 transition-colors underline decoration-2 underline-offset-4 font-black">
                Register for an account
              </Link>
            </p>
          </footer>
        </section>
      </div>
    </div>
  );
};

export default Login;
