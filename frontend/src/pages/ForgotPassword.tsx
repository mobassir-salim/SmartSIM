import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { Mail, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
      navigate(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to request password reset. Please try again.');
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
            <h2 className="text-3xl font-headline font-black uppercase tracking-tighter text-brand-primary">Forgot Password</h2>
            <p className="text-xs font-headline font-black uppercase tracking-widest text-slate-400 mt-1">Enter your email for a reset code</p>
          </header>

          {error && (
            <div className="mb-6 p-4 border-2 border-brand-primary bg-brand-secondary text-white flex items-start gap-3 text-sm font-headline font-bold uppercase neo-brutal-shadow-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-xs font-headline font-bold text-brand-text uppercase tracking-widest">
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
                  className="w-full bg-transparent border-b-4 border-t-0 border-l-0 border-r-0 border-brand-primary px-0 py-3 font-sans text-lg focus:outline-none focus:border-brand-secondary focus:ring-0 transition-colors placeholder:text-slate-300 font-semibold"
                />
                <Mail className="absolute right-0 bottom-3 text-brand-primary w-5 h-5" />
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
                  <span>SENDING...</span>
                </>
              ) : (
                <>
                  <span>SEND RESET OTP</span>
                  <ArrowRight className="w-5 h-5 font-bold" />
                </>
              )}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <Link to="/login" className="text-xs font-headline font-black uppercase tracking-wider text-brand-tertiary hover:bg-brand-primary-container px-1 transition-colors underline decoration-2 underline-offset-4 font-black">
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
