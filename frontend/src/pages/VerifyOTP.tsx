import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { ShieldCheck, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

const VerifyOTP: React.FC = () => {
  const { checkAuth } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const email = searchParams.get('email') || '';
  const purpose = searchParams.get('purpose') || 'activation';
  
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

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
      setError('Please enter a valid 6-digit number.');
      setLoading(false);
      return;
    }

    try {
      const res = await api.post('/auth/verify-otp', {
        email,
        code,
        purpose,
      });

      if (purpose === 'activation') {
        const { access_token, refresh_token } = res.data;
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        await checkAuth();
        navigate('/dashboard');
      } else if (purpose === 'reset') {
        navigate(`/reset-password?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Verification failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setResendMessage(null);
    setResendLoading(true);

    try {
      if (purpose === 'activation') {
        await api.post('/auth/resend-otp', { email, purpose });
      } else {
        await api.post('/auth/forgot-password', { email });
      }
      setResendMessage('A new 6-digit OTP code has been generated. Please check the backend container logs!');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to resend OTP.');
    } finally {
      setResendLoading(false);
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

        {/* Box Container */}
        <div className="bg-white border-4 border-brand-primary p-8 md:p-12 neo-brutal-shadow relative z-10 rounded-none">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-brand-primary">
            <div className="h-12 w-12 border-2 border-brand-primary bg-brand-primary-container text-brand-primary flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-headline font-black uppercase text-brand-primary">Verify OTP</h2>
              <p className="text-xs font-headline font-black uppercase tracking-wider text-slate-400">FOR {email}</p>
            </div>
          </div>

          <p className="font-sans text-sm font-semibold mb-6 leading-relaxed text-brand-text">
            Please enter the 6-digit OTP code. Since this is a local environment, the code has been printed to the <span className="bg-brand-primary-container px-1.5 py-0.5 border border-brand-primary font-mono font-bold">backend container logs</span>.
          </p>

          {error && (
            <div className="mb-6 p-4 border-2 border-brand-primary bg-brand-secondary text-white flex items-start gap-3 text-sm font-headline font-bold uppercase neo-brutal-shadow-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {resendMessage && (
            <div className="mb-6 p-4 border-2 border-brand-primary bg-[#10B981] text-white text-sm font-headline font-bold uppercase neo-brutal-shadow-sm">
              {resendMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="otp" className="block text-xs font-headline font-bold text-brand-text uppercase tracking-widest">
                6-Digit Verification Code
              </label>
              <input
                id="otp"
                type="text"
                required
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="block w-full px-4 py-4 bg-brand-surface-low border-4 border-brand-primary rounded-none text-brand-text placeholder-slate-400 focus:outline-none focus:border-brand-secondary transition-all text-center tracking-widest text-2xl font-headline font-black"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-primary-container text-brand-primary border-4 border-brand-primary py-4 px-6 font-headline font-black text-xl uppercase tracking-wider neo-brutal-shadow-sm neo-brutal-shadow-hover transition-all flex items-center justify-center gap-3 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin font-black" />
                  <span>VERIFYING...</span>
                </>
              ) : (
                <>
                  <span>VERIFY CODE</span>
                  <ArrowRight className="w-5 h-5 font-bold" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 flex justify-between items-center text-xs font-headline font-black uppercase tracking-wider">
            <button
              onClick={handleResend}
              disabled={resendLoading}
              className="text-brand-tertiary hover:bg-brand-primary-container px-1 transition-colors disabled:opacity-50 font-black cursor-pointer underline decoration-2 underline-offset-4"
            >
              {resendLoading ? 'REQUESTING...' : 'RESEND OTP CODE'}
            </button>
            <Link to="/login" className="text-brand-primary hover:bg-brand-primary-container px-1 transition-colors underline decoration-2 underline-offset-4">
              BACK TO SIGN IN
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyOTP;
