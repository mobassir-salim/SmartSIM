import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';
import { Lock, ShieldCheck, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const email = searchParams.get('email') || '';

  const [code, setCode] = useState(searchParams.get('code') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email) {
      navigate('/login');
    }
  }, [email, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (code.length !== 6 || !/^\d+$/.test(code)) {
      setError('Please enter a valid 6-digit OTP code.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      await api.post('/auth/reset-password', {
        email,
        code,
        new_password: password,
      });

      setSuccess('Your password has been successfully reset. Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Reset failed. The OTP code may be invalid or expired.');
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

        {/* Card Box */}
        <div className="bg-white border-4 border-brand-primary p-8 md:p-12 neo-brutal-shadow relative z-10 rounded-none">
          <header className="mb-8">
            <h2 className="text-3xl font-headline font-black uppercase tracking-tighter text-brand-primary">Reset Password</h2>
            <p className="text-xs font-headline font-black uppercase tracking-widest text-slate-400 mt-1">Enter your new secure password details</p>
          </header>

          {error && (
            <div className="mb-6 p-4 border-2 border-brand-primary bg-brand-secondary text-white flex items-start gap-3 text-sm font-headline font-bold uppercase neo-brutal-shadow-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 border-2 border-brand-primary bg-[#10B981] text-white text-sm font-headline font-bold uppercase neo-brutal-shadow-sm">
              {success}
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Verification Code field */}
              <div className="space-y-1">
                <label htmlFor="otp" className="block text-xs font-headline font-bold text-brand-text uppercase tracking-widest">
                  Verification OTP Code
                </label>
                <div className="relative">
                  <input
                    id="otp"
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-transparent border-b-4 border-t-0 border-l-0 border-r-0 border-brand-primary px-0 py-3 font-sans text-lg focus:outline-none focus:border-brand-secondary focus:ring-0 transition-colors placeholder:text-slate-300 font-semibold tracking-widest text-center"
                  />
                  <ShieldCheck className="absolute right-0 bottom-3 text-brand-primary w-5 h-5" />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1">
                <label htmlFor="pass" className="block text-xs font-headline font-bold text-brand-text uppercase tracking-widest">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="pass"
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

              {/* Confirm Password Field */}
              <div className="space-y-1">
                <label htmlFor="confirm" className="block text-xs font-headline font-bold text-brand-text uppercase tracking-widest">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirm"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-transparent border-b-4 border-t-0 border-l-0 border-r-0 border-brand-primary px-0 py-3 font-sans text-lg focus:outline-none focus:border-brand-secondary focus:ring-0 transition-colors placeholder:text-slate-300 font-semibold"
                  />
                  <Lock className="absolute right-0 bottom-3 text-brand-primary w-5 h-5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-primary-container text-brand-primary border-4 border-brand-primary py-4 px-6 font-headline font-black text-xl uppercase tracking-wider neo-brutal-shadow-sm neo-brutal-shadow-hover transition-all flex items-center justify-center gap-3 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin font-black" />
                    <span>RESETTING...</span>
                  </>
                ) : (
                  <>
                    <span>RESET PASSWORD</span>
                    <ArrowRight className="w-5 h-5 font-bold" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
