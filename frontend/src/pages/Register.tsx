import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, Lock, AlertCircle, Loader2, ArrowRight, Globe, Zap } from 'lucide-react';

const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    try {
      await register(name, email, mobile, password);
      navigate(`/verify-otp?email=${encodeURIComponent(email)}&purpose=activation`);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your entries.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col justify-center items-center px-6 py-12 relative overflow-hidden font-sans">
      {/* Background Decorative Elements */}
      <div className="absolute top-20 right-[10%] w-32 h-32 border-4 border-brand-primary opacity-20 hidden lg:block"></div>
      <div className="absolute bottom-40 left-[5%] w-64 h-8 bg-brand-primary-container hidden lg:block -rotate-12"></div>

      <div className="w-full max-w-6xl z-10">
        {/* Header/Logo for mobile or just top alignment */}
        <div className="flex justify-start items-center gap-2 mb-12">
          <Link to="/" className="flex items-center gap-2.5 decoration-none">
            <div className="h-10 w-10 bg-brand-primary-container border-2 border-brand-primary flex items-center justify-center font-headline font-black text-xl text-brand-primary">
              S
            </div>
            <span className="font-headline font-black text-2xl tracking-tighter text-brand-primary uppercase">
              Smart<span className="text-brand-secondary">SIM</span>
            </span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Side: Visual/Context (Visible only on lg screens) */}
          <div className="lg:col-span-5 hidden lg:block space-y-8">
            <h2 className="text-7xl font-headline font-black leading-none uppercase tracking-tighter text-brand-primary">
              JOIN THE <br/><span className="bg-brand-primary-container px-2 border-4 border-brand-primary inline-block rotate-1">NETWORK</span>
            </h2>
            <p className="text-lg font-semibold border-l-8 border-brand-secondary pl-6 py-2 text-brand-text/90">
              Future-proof your connectivity with Bauhaus-inspired digital infrastructure. Global coverage, zero borders.
            </p>
            <div className="grid grid-cols-2 gap-4 mt-12">
              <div className="border-4 border-brand-primary p-4 bg-brand-surface-highest neo-brutal-shadow-sm">
                <Globe className="w-8 h-8 mb-2 text-brand-tertiary" />
                <p className="font-headline font-bold uppercase text-xs tracking-wider">200+ Countries</p>
              </div>
              <div className="border-4 border-brand-primary p-4 bg-brand-primary-container neo-brutal-shadow-sm">
                <Zap className="w-8 h-8 mb-2 text-brand-primary" />
                <p className="font-headline font-bold uppercase text-xs tracking-wider">Instant Activation</p>
              </div>
            </div>
          </div>

          {/* Right Side: Registration Form */}
          <div className="lg:col-span-7 flex justify-center lg:justify-end">
            <div className="w-full max-w-xl bg-white border-4 border-brand-primary p-8 md:p-12 neo-brutal-shadow relative overflow-hidden rounded-none z-10">
              {/* Bauhaus Accent Corner */}
              <div className="absolute top-0 right-0 w-16 h-16 bg-brand-secondary border-b-4 border-l-4 border-brand-primary"></div>
              
              <div className="mb-10">
                <h1 className="text-4xl md:text-5xl font-headline font-black uppercase leading-tight text-brand-primary">
                  Create Account
                </h1>
                <p className="text-xs font-headline font-black uppercase tracking-widest text-slate-400 mt-1">Get started with your SmartSIM dashboard</p>
              </div>

              {error && (
                <div className="mb-6 p-4 border-2 border-brand-primary bg-brand-secondary text-white flex items-start gap-3 text-sm font-headline font-bold uppercase neo-brutal-shadow-sm">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Full Name Field */}
                <div className="space-y-1">
                  <label className="block font-headline font-bold uppercase text-xs tracking-widest" htmlFor="name">
                    Full Name
                  </label>
                  <div className="relative">
                    <input
                      id="name"
                      type="text"
                      required
                      placeholder="HERBERT BAYER"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-transparent border-b-4 border-t-0 border-l-0 border-r-0 border-brand-primary px-0 py-3 font-sans text-lg focus:outline-none focus:border-brand-secondary focus:ring-0 transition-colors placeholder:text-slate-300 font-semibold"
                    />
                    <User className="absolute right-0 bottom-3 text-brand-primary w-5 h-5" />
                  </div>
                </div>

                {/* Email Field */}
                <div className="space-y-1">
                  <label className="block font-headline font-bold uppercase text-xs tracking-widest" htmlFor="email">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      type="email"
                      required
                      placeholder="USER@SMARTSIM.IO"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-transparent border-b-4 border-t-0 border-l-0 border-r-0 border-brand-primary px-0 py-3 font-sans text-lg focus:outline-none focus:border-brand-secondary focus:ring-0 transition-colors placeholder:text-slate-300 font-semibold"
                    />
                    <Mail className="absolute right-0 bottom-3 text-brand-primary w-5 h-5" />
                  </div>
                </div>

                {/* Mobile & Password Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Mobile Field */}
                  <div className="space-y-1">
                    <label className="block font-headline font-bold uppercase text-xs tracking-widest" htmlFor="mobile">
                      Mobile Number
                    </label>
                    <div className="relative">
                      <input
                        id="mobile"
                        type="tel"
                        required
                        placeholder="+49 000 0000"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        className="w-full bg-transparent border-b-4 border-t-0 border-l-0 border-r-0 border-brand-primary px-0 py-3 font-sans text-lg focus:outline-none focus:border-brand-secondary focus:ring-0 transition-colors placeholder:text-slate-300 font-semibold"
                      />
                      <Phone className="absolute right-0 bottom-3 text-brand-primary w-5 h-5" />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-1">
                    <label className="block font-headline font-bold uppercase text-xs tracking-widest" htmlFor="password">
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
                        className="w-full bg-transparent border-b-4 border-t-0 border-l-0 border-r-0 border-brand-primary px-0 py-3 font-sans text-lg focus:outline-none focus:border-brand-secondary focus:ring-0 transition-colors placeholder:text-slate-300 font-semibold"
                      />
                      <Lock className="absolute right-0 bottom-3 text-brand-primary w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Submit button & footer */}
                <div className="pt-8 space-y-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-brand-primary-container text-brand-primary border-4 border-brand-primary py-5 px-6 font-headline font-black text-2xl uppercase tracking-wider neo-brutal-shadow-sm neo-brutal-shadow-hover transition-all flex items-center justify-center gap-4 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin font-black" />
                        <span>CREATING ACCOUNT...</span>
                      </>
                    ) : (
                      <>
                        <span>CREATE ACCOUNT</span>
                        <ArrowRight className="w-6 h-6 font-bold" />
                      </>
                    )}
                  </button>

                  <div className="text-center">
                    <p className="font-headline font-bold uppercase text-[10px] tracking-widest text-slate-400 mb-2">Already a member?</p>
                    <Link to="/login" className="inline-block text-brand-tertiary font-black uppercase text-lg border-b-4 border-brand-tertiary hover:text-brand-secondary hover:border-brand-secondary transition-all">
                      Login instead
                    </Link>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
