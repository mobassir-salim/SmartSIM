import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Search, Phone, ShieldCheck, RefreshCw, AlertCircle, Timer, ChevronRight, Ban } from 'lucide-react';

const SelectNumber: React.FC = () => {
  const { cart } = useCart();
  const navigate = useNavigate();
  
  // State
  const [numbers, setNumbers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [reserveLoading, setReserveLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');
  
  // Filters
  const [searchPattern, setSearchPattern] = useState<string>('');
  const [circleFilter, setCircleFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  
  // Active reservation state
  const [reservedMsisdn, setReservedMsisdn] = useState<string | null>(() => {
    return sessionStorage.getItem('reserved_msisdn');
  });
  const [expiryTime, setExpiryTime] = useState<string | null>(() => {
    return sessionStorage.getItem('reserved_expiry');
  });
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const timerRef = useRef<any>(null);

  // Check if SIM in cart
  const hasSim = cart.some(item => item.type === 'SIM');

  // Fetch available numbers
  const fetchNumbers = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params: any = {};
      if (circleFilter) params.circle = circleFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (searchPattern) {
        // Support SQL like pattern search
        params.pattern = searchPattern.includes('%') ? searchPattern : `%${searchPattern}%`;
      }
      
      const res = await api.get('/numbers', { params });
      setNumbers(res.data || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load available numbers');
    } finally {
      setLoading(false);
    }
  };

  // Sync active reservation with backend on mount
  useEffect(() => {
    const syncReservation = async () => {
      try {
        const res = await api.get('/numbers/active-reservation');
        if (res.data && res.data.msisdn) {
          sessionStorage.setItem('reserved_msisdn', res.data.msisdn);
          sessionStorage.setItem('reserved_expiry', res.data.reservation_expiry);
          setReservedMsisdn(res.data.msisdn);
          setExpiryTime(res.data.reservation_expiry);
        } else {
          sessionStorage.removeItem('reserved_msisdn');
          sessionStorage.removeItem('reserved_expiry');
          setReservedMsisdn(null);
          setExpiryTime(null);
        }
      } catch (err) {
        console.error('Failed to sync active reservation:', err);
      }
    };
    syncReservation();
  }, []);

  useEffect(() => {
    fetchNumbers();
  }, [circleFilter, categoryFilter]);

  // Handle countdown timer
  useEffect(() => {
    if (expiryTime) {
      const calculateTimeLeft = () => {
        const diff = new Date(expiryTime).getTime() - new Date().getTime();
        return diff > 0 ? Math.floor(diff / 1000) : 0;
      };

      setTimeLeft(calculateTimeLeft());
      
      if (timerRef.current) clearInterval(timerRef.current);
      
      timerRef.current = setInterval(() => {
        const remaining = calculateTimeLeft();
        setTimeLeft(remaining);
        if (remaining <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          sessionStorage.removeItem('reserved_msisdn');
          sessionStorage.removeItem('reserved_expiry');
          setReservedMsisdn(null);
          setExpiryTime(null);
          fetchNumbers();
        }
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [expiryTime]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchNumbers();
  };

  const handleReserve = async (msisdn: string) => {
    if (!hasSim) {
      setError('You must have a SIM card in your cart to reserve a number.');
      return;
    }
    
    setReserveLoading(true);
    setError('');
    setSuccessMsg('');
    
    try {
      const res = await api.post('/numbers/reserve', { msisdn });
      const data = res.data;
      
      // Update local storage/session storage
      sessionStorage.setItem('reserved_msisdn', data.msisdn);
      sessionStorage.setItem('reserved_expiry', data.reservation_expiry);
      
      setReservedMsisdn(data.msisdn);
      setExpiryTime(data.reservation_expiry);
      setSuccessMsg(`🎉 Number ${data.msisdn} successfully reserved for 30 minutes!`);
      
      // Refresh available numbers
      fetchNumbers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reserve number. It might have been taken.');
    } finally {
      setReserveLoading(false);
    }
  };

  const handleRelease = async () => {
    if (!reservedMsisdn) return;
    
    setReserveLoading(true);
    setError('');
    setSuccessMsg('');
    
    try {
      await api.post('/numbers/release', { msisdn: reservedMsisdn });
      sessionStorage.removeItem('reserved_msisdn');
      sessionStorage.removeItem('reserved_expiry');
      setReservedMsisdn(null);
      setExpiryTime(null);
      setSuccessMsg('Number released successfully.');
      fetchNumbers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to release number');
    } finally {
      setReserveLoading(false);
    }
  };

  const formatTimeLeft = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!hasSim) {
    return (
      <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col font-sans theme-portal-blue">
        <Navbar />
        <main className="max-w-md mx-auto px-4 py-20 flex-grow flex flex-col justify-center w-full">
          <div className="text-center p-8 border-4 border-brand-primary bg-white neo-brutal-shadow">
            <AlertCircle className="w-16 h-16 text-brand-secondary mx-auto mb-4" />
            <h2 className="font-headline font-black uppercase text-xl text-brand-primary mb-2">SIM Required</h2>
            <p className="font-sans text-sm text-brand-text font-semibold opacity-70 mb-6">
              You must have a SIM card in your cart before selecting a mobile number.
            </p>
            <button
              onClick={() => navigate('/sims')}
              className="w-full bg-brand-primary-container text-brand-primary border-4 border-brand-primary font-headline font-black py-3 px-4 uppercase tracking-widest text-xs neo-brutal-shadow-sm neo-brutal-shadow-hover transition-all cursor-pointer"
            >
              Browse SIM Catalog
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col font-sans theme-portal-blue">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-grow w-full">
        {/* Page Header */}
        <div className="mb-10 border-4 border-brand-primary bg-brand-primary-container p-8 neo-brutal-shadow rounded-none relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-brand-secondary border-b-4 border-l-4 border-brand-primary"></div>
          <h1 className="text-3xl sm:text-4xl font-headline font-black text-brand-primary uppercase mb-2 tracking-tight">
            Choose Preferred Number
          </h1>
          <p className="font-sans text-sm max-w-xl font-semibold opacity-90">
            Browse, search and reserve your preferred mobile number. The reserved number is locked to you for 30 minutes while you complete checkout.
          </p>
        </div>

        {/* Status / Active Reservation Box */}
        {reservedMsisdn && (
          <div className="mb-8 p-6 border-4 border-brand-primary bg-blue-50 neo-brutal-shadow flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-blue-500 text-white border-2 border-brand-primary flex items-center justify-center font-headline font-black text-lg">
                <Phone className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-headline font-black uppercase text-blue-500 block tracking-wider leading-none mb-1">
                  Active Reservation
                </span>
                <span className="font-headline text-2xl font-black text-brand-primary tracking-tight">
                  +880 {reservedMsisdn}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 font-headline font-black text-sm uppercase text-blue-700 bg-blue-100 border-2 border-blue-500 px-4 py-2">
                <Timer className="w-4 h-4 animate-pulse" />
                <span>Expires in: {formatTimeLeft(timeLeft)}</span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleRelease}
                  disabled={reserveLoading}
                  className="bg-white hover:bg-red-50 text-red-500 border-2 border-brand-primary font-headline text-xs font-black uppercase px-4 py-2.5 cursor-pointer disabled:opacity-50"
                >
                  Release
                </button>
                <button
                  onClick={() => navigate('/customer/order/customer-information')}
                  className="bg-brand-primary-container hover:bg-brand-primary text-brand-primary hover:text-white border-2 border-brand-primary font-headline text-xs font-black uppercase px-6 py-2.5 flex items-center gap-1.5 cursor-pointer neo-brutal-shadow-xs active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
                >
                  <span>Proceed to KYC</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Notifications */}
        {error && (
          <div className="mb-6 p-4 border-4 border-brand-primary bg-red-100 text-red-800 font-headline font-black text-xs uppercase flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-6 p-4 border-4 border-brand-primary bg-green-100 text-green-800 font-headline font-black text-xs uppercase flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Search and Filters */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1 border-4 border-brand-primary bg-white p-6 neo-brutal-shadow">
            <h3 className="font-headline font-black uppercase text-md text-brand-primary mb-6 border-b-2 border-brand-primary pb-2">
              Filter Numbers
            </h3>

            <form onSubmit={handleSearchSubmit} className="space-y-6">
              <div>
                <label className="block text-[10px] font-headline font-black uppercase text-slate-400 mb-2">Search Pattern</label>
                <div className="relative flex border-2 border-brand-primary bg-white">
                  <input
                    type="text"
                    placeholder="e.g. 98% or %123"
                    value={searchPattern}
                    onChange={(e) => setSearchPattern(e.target.value)}
                    className="w-full py-2.5 px-3 font-sans text-xs font-semibold outline-none"
                  />
                  <button type="submit" className="px-3 border-l-2 border-brand-primary bg-brand-primary-container text-brand-primary cursor-pointer hover:bg-brand-primary hover:text-white transition-colors">
                    <Search className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-[9px] font-sans text-slate-400 block mt-1.5 leading-tight">
                  Use <strong>%</strong> as wildcard. E.g., <code className="bg-slate-100 px-1">%8888</code> for ending with 8888.
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-headline font-black uppercase text-slate-400 mb-2">Telecom Circle</label>
                <select
                  value={circleFilter}
                  onChange={(e) => setCircleFilter(e.target.value)}
                  className="w-full py-2.5 px-3 border-2 border-brand-primary bg-white font-headline text-xs font-black uppercase outline-none"
                >
                  <option value="">All Circles</option>
                  <option value="DELHI">Delhi</option>
                  <option value="MUMBAI">Mumbai</option>
                  <option value="KOLKATA">Kolkata</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-headline font-black uppercase text-slate-400 mb-2">Category</label>
                <div className="flex flex-col gap-2">
                  {[
                    { id: '', label: 'All Numbers' },
                    { id: 'Regular', label: 'Regular' },
                    { id: 'Premium', label: 'Premium Stars' },
                    { id: 'VIP', label: 'VIP Club' }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryFilter(cat.id)}
                      className={`w-full text-left py-2.5 px-3 border-2 border-brand-primary font-headline text-xs font-black uppercase transition-all cursor-pointer ${
                        categoryFilter === cat.id
                          ? 'bg-brand-primary-container text-brand-primary neo-brutal-shadow-xs translate-x-0.5 translate-y-0.5'
                          : 'bg-white hover:bg-brand-surface-low'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={fetchNumbers}
                className="w-full flex items-center justify-center gap-1.5 border-2 border-brand-primary hover:bg-brand-surface-low font-headline text-xs font-black uppercase py-3 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh Grid</span>
              </button>
            </form>
          </div>

          {/* Numbers Grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 border-4 border-brand-primary border-dashed bg-white">
                <div className="h-12 w-12 border-4 border-brand-primary border-t-brand-secondary animate-spin mb-4"></div>
                <p className="font-headline font-black uppercase text-sm tracking-wider">Searching available numbers...</p>
              </div>
            ) : numbers.length === 0 ? (
              <div className="text-center py-16 border-4 border-brand-primary border-dashed bg-white p-8 neo-brutal-shadow">
                <Ban className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="font-headline font-black uppercase text-lg text-brand-primary mb-2">No Numbers Available</h3>
                <p className="text-xs font-sans text-brand-text font-semibold opacity-70">
                  No numbers match your filters or query pattern. Please try checking another category or circles.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {numbers.map((num) => {
                  const isReservedByMe = reservedMsisdn === num.msisdn;
                  
                  return (
                    <div
                      key={num.id}
                      className={`border-4 border-brand-primary p-5 bg-white neo-brutal-shadow flex flex-col justify-between hover:-translate-y-0.5 transition-all ${
                        isReservedByMe ? 'bg-blue-50 border-blue-500' : ''
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <span className={`text-[9px] font-headline font-black uppercase tracking-wider px-2 py-0.5 border-2 border-brand-primary ${
                            num.category === 'VIP' ? 'bg-purple-100 text-purple-700 border-purple-500' :
                            num.category === 'Premium' ? 'bg-yellow-100 text-yellow-700 border-yellow-500' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {num.category}
                          </span>
                          <span className="text-[10px] font-headline font-black uppercase text-slate-400">{num.circle}</span>
                        </div>

                        <div className="font-headline text-2xl font-black text-brand-primary tracking-tight mb-4 flex items-center gap-1.5">
                          <Phone className="w-5 h-5 text-slate-400" />
                          <span>+880 {num.msisdn}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleReserve(num.msisdn)}
                        disabled={reserveLoading || reservedMsisdn !== null}
                        className={`w-full py-2.5 border-2 border-brand-primary font-headline text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                          isReservedByMe 
                            ? 'bg-green-500 text-white border-green-700 cursor-default'
                            : reservedMsisdn !== null 
                              ? 'bg-slate-100 text-slate-400 border-slate-300 cursor-not-allowed opacity-60'
                              : 'bg-brand-primary-container hover:bg-brand-primary hover:text-white text-brand-primary neo-brutal-shadow-xs active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'
                        }`}
                      >
                        {isReservedByMe ? 'Reserved By You' : reservedMsisdn !== null ? 'Unavailable' : 'Reserve Number'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SelectNumber;
