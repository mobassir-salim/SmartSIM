import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { ArrowRight, Server, Database, Layers, ShieldCheck, Cpu, Wallet, ShoppingBag, Bell } from 'lucide-react';
import Navbar from '../components/Navbar';

function Home() {

  const [backendStatus, setBackendStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading');
  const [backendInfo, setBackendInfo] = useState<any>(null);
  
  const [authStatus, setAuthStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading');
  const [simStatus, setSimStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading');
  const [planStatus, setPlanStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading');
  const [walletStatus, setWalletStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading');
  const [orderStatus, setOrderStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading');
  const [notificationStatus, setNotificationStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading');

  // Shopping Cart Context & Drawer State
  const { addToCart } = useCart();
  const handleBuyClick = (item: any, type: 'SIM' | 'PLAN') => {
    addToCart({
      id: String(item.id),
      name: item.name,
      type: type,
      price: item.price
    });
  };
  
  const [sims, setSims] = useState<any[]>([]);
  const [loadingSims, setLoadingSims] = useState<boolean>(true);
  
  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState<boolean>(true);

  useEffect(() => {
    // Check Monolith
    fetch('http://localhost/api/health')
      .then((res) => {
        if (!res.ok) throw new Error('Not OK');
        return res.json();
      })
      .then((data) => {
        setBackendStatus('connected');
        setBackendInfo(data);
      })
      .catch(() => {
        setBackendStatus('disconnected');
      });

    // Check Auth Service
    fetch('http://localhost/api/auth/health')
      .then((res) => {
        if (!res.ok) throw new Error('Not OK');
        return res.json();
      })
      .then(() => {
        setAuthStatus('connected');
      })
      .catch(() => {
        setAuthStatus('disconnected');
      });

    // Check SIM Service
    fetch('http://localhost/api/sims/health')
      .then((res) => {
        if (!res.ok) throw new Error('Not OK');
        return res.json();
      })
      .then(() => {
        setSimStatus('connected');
      })
      .catch(() => {
        setSimStatus('disconnected');
      });

    // Check Plan Service
    fetch('http://localhost/api/plans/health')
      .then((res) => {
        if (!res.ok) throw new Error('Not OK');
        return res.json();
      })
      .then(() => {
        setPlanStatus('connected');
      })
      .catch(() => {
        setPlanStatus('disconnected');
      });

    // Check Wallet Service
    fetch('http://localhost/api/wallet/health')
      .then((res) => {
        if (!res.ok) throw new Error('Not OK');
        return res.json();
      })
      .then(() => {
        setWalletStatus('connected');
      })
      .catch(() => {
        setWalletStatus('disconnected');
      });

    // Check Order Service
    fetch('http://localhost/api/orders/health')
      .then((res) => {
        if (!res.ok) throw new Error('Not OK');
        return res.json();
      })
      .then(() => {
        setOrderStatus('connected');
      })
      .catch(() => {
        setOrderStatus('disconnected');
      });

    // Check Notification Service
    fetch('http://localhost/api/notifications/health')
      .then((res) => {
        if (!res.ok) throw new Error('Not OK');
        return res.json();
      })
      .then(() => {
        setNotificationStatus('connected');
      })
      .catch(() => {
        setNotificationStatus('disconnected');
      });

    // Fetch SIM Catalog
    fetch('http://localhost/api/sims')
      .then((res) => {
        if (!res.ok) throw new Error('Not OK');
        return res.json();
      })
      .then((data) => {
        setSims(data);
        setLoadingSims(false);
      })
      .catch((err) => {
        console.error('Error fetching SIM catalog:', err);
        setLoadingSims(false);
      });

    // Fetch Plan Catalog
    fetch('http://localhost/api/plans')
      .then((res) => {
        if (!res.ok) throw new Error('Not OK');
        return res.json();
      })
      .then((data) => {
        setPlans(data);
        setLoadingPlans(false);
      })
      .catch((err) => {
        console.error('Error fetching Plan catalog:', err);
        setLoadingPlans(false);
      });
  }, []);

  useEffect(() => {
    if (!loadingSims && window.location.hash === '#sims') {
      const element = document.getElementById('sims');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [loadingSims]);

  useEffect(() => {
    if (!loadingPlans && window.location.hash === '#plans') {
      const element = document.getElementById('plans');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [loadingPlans]);

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col font-sans selection:bg-brand-primary-container selection:text-brand-primary">
      <Navbar />

      {/* Main Content */}
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative pt-20 pb-20 bg-white overflow-hidden border-b-4 border-brand-primary">
          {/* Background Decorative Elements */}
          <div className="absolute top-20 right-[10%] w-32 h-32 border-4 border-brand-primary opacity-20 hidden lg:block"></div>
          <div className="absolute bottom-40 left-[5%] w-64 h-8 bg-brand-primary-container hidden lg:block -rotate-12"></div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Hero Text */}
              <div className="lg:col-span-7 text-left">
                <div className="inline-flex items-center gap-2 px-4 py-1 border-2 border-brand-primary bg-brand-primary-container text-brand-primary font-headline text-xs font-black uppercase tracking-widest mb-6">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-secondary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-secondary"></span>
                  </span>
                  Bauhaus active
                </div>

                <h1 className="text-5xl sm:text-7xl font-headline font-black text-brand-text tracking-tighter mb-8 leading-none uppercase">
                  Smart Connectivity <span className="bg-brand-primary-container px-2 border-2 border-brand-primary inline-block rotate-1">Simplified.</span>
                </h1>

                <p className="text-lg text-brand-text max-w-xl mb-10 leading-relaxed font-sans font-medium">
                  Discover, purchase, and manage telecom SIM cards and tailored mobile data packages instantly through our next-generation self-care platform.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <button 
                    onClick={() => document.getElementById('sims')?.scrollIntoView({ behavior: 'smooth' })}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-brand-primary-container text-brand-primary border-4 border-brand-primary font-headline text-lg font-black uppercase tracking-wider px-8 py-4 neo-brutal-shadow-sm neo-brutal-shadow-hover cursor-pointer"
                  >
                    <span>Browse SIM Catalog</span>
                    <ArrowRight className="w-5 h-5 font-bold" />
                  </button>
                  <button 
                    onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })}
                    className="w-full sm:w-auto bg-white text-brand-primary border-4 border-brand-primary font-headline text-lg font-black uppercase tracking-wider px-8 py-4 neo-brutal-shadow-sm neo-brutal-shadow-hover cursor-pointer"
                  >
                    Explore Plans
                  </button>
                </div>
              </div>

              {/* Right Column: Clean Grid Presentation */}
              <div className="lg:col-span-5 relative hidden lg:block">
                <div className="relative w-full h-[360px] flex items-center justify-center">
                  <div className="absolute -z-10 w-80 h-[280px] border-4 border-brand-primary bg-brand-secondary translate-x-4 translate-y-4"></div>
                  {/* Modern Shop Card Mockup */}
                  <div className="w-80 border-4 border-brand-primary bg-white p-6 neo-brutal-shadow relative">
                    <div className="h-28 border-2 border-brand-primary bg-brand-surface-low mb-4 flex items-center justify-center text-brand-tertiary">
                      <Layers className="w-12 h-12" />
                    </div>
                    <h4 className="font-headline text-xl font-black text-brand-text uppercase mb-1">eSIM Unlimited Data</h4>
                    <p className="text-xs font-sans text-brand-text opacity-70 mb-4 font-semibold">Prepaid eSIM with global connectivity</p>
                    <div className="flex justify-between items-center border-t-2 border-brand-primary pt-4">
                      <span className="font-headline text-3xl font-black text-brand-primary">$29.99</span>
                      <span className="text-[10px] uppercase font-headline font-black text-white bg-brand-secondary border-2 border-brand-primary px-3 py-1">In Stock</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SIM Catalog Section */}
        <section id="sims" className="py-20 bg-[#F3F4F6] border-b-4 border-brand-primary">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="font-headline text-4xl sm:text-5xl font-black text-brand-text uppercase tracking-tighter mb-4">
                Available SIM Cards & eSIMs
              </h2>
              <p className="text-lg text-brand-text max-w-2xl mx-auto leading-relaxed font-sans font-medium opacity-80">
                Choose between physical SIM cards and instant eSIM packages to get connected immediately.
              </p>
            </div>

            {loadingSims ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="h-10 w-10 border-4 border-brand-primary border-t-brand-secondary animate-spin mb-4"></div>
                <p className="font-headline font-black uppercase text-sm tracking-wider">Loading catalog...</p>
              </div>
            ) : sims.length === 0 ? (
              <div className="text-center py-12 border-4 border-brand-primary border-dashed bg-white max-w-md mx-auto p-8 neo-brutal-shadow-sm">
                <p className="font-headline font-black uppercase text-lg mb-2 text-brand-primary">No SIMs found</p>
                <p className="text-xs font-sans text-brand-text font-semibold opacity-70">
                  Please seed some SIM cards using the admin API or checking back later.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {sims.map((sim) => (
                  <div key={sim.id} className="bg-white border-4 border-brand-primary p-6 neo-brutal-shadow flex flex-col justify-between group hover:-translate-x-1 hover:-translate-y-1 hover:neo-brutal-shadow-lg transition-all duration-200">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] uppercase font-headline font-black text-brand-primary bg-brand-primary-container border-2 border-brand-primary px-3 py-1">
                          {sim.type === 'esim' ? 'eSIM' : 'Physical SIM'}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-400">Prefix: {sim.iccid_prefix}</span>
                      </div>
                      
                      <h3 className="font-headline text-2xl font-black uppercase tracking-tight text-brand-text mb-2 group-hover:text-brand-primary transition-colors">
                        {sim.name}
                      </h3>
                      
                      <p className="text-xs font-sans text-brand-text opacity-70 mb-6 font-semibold line-clamp-3">
                        {sim.description || 'Premium connectivity package with reliable nationwide coverage and high-speed data.'}
                      </p>
                    </div>

                    <div className="border-t-2 border-brand-primary pt-4 mt-auto flex justify-between items-center">
                      <div>
                        <span className="text-[10px] font-headline font-black uppercase text-slate-400 block tracking-wider leading-none mb-1">Price</span>
                        <span className="font-headline text-3xl font-black text-brand-primary">${sim.price.toFixed(2)}</span>
                      </div>
                      <button 
                        onClick={() => handleBuyClick(sim, 'SIM')}
                        className="bg-brand-primary-container hover:bg-brand-primary text-brand-primary hover:text-white px-5 py-3 border-2 border-brand-primary font-headline text-xs font-black uppercase tracking-widest neo-brutal-shadow-xs active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                      >
                        Buy Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Plans Catalog Section */}
        <section id="plans" className="py-20 bg-white border-b-4 border-brand-primary">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="font-headline text-4xl sm:text-5xl font-black text-brand-text uppercase tracking-tighter mb-4">
                Mobile Recharge & Combo Plans
              </h2>
              <p className="text-lg text-brand-text max-w-2xl mx-auto leading-relaxed font-sans font-medium opacity-80">
                Tailored high-speed data, voice, and SMS combo packages designed for any connectivity requirement.
              </p>
            </div>

            {loadingPlans ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="h-10 w-10 border-4 border-brand-primary border-t-brand-secondary animate-spin mb-4"></div>
                <p className="font-headline font-black uppercase text-sm tracking-wider">Loading plans...</p>
              </div>
            ) : plans.length === 0 ? (
              <div className="text-center py-12 border-4 border-brand-primary border-dashed bg-white max-w-md mx-auto p-8 neo-brutal-shadow-sm">
                <p className="font-headline font-black uppercase text-lg mb-2 text-brand-primary">No Plans found</p>
                <p className="text-xs font-sans text-brand-text font-semibold opacity-70">
                  Please seed some plans using the admin API or checking back later.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {plans.map((plan) => (
                  <div key={plan.id} className="bg-brand-primary-container/10 border-4 border-brand-primary p-6 neo-brutal-shadow flex flex-col justify-between group hover:-translate-x-1 hover:-translate-y-1 hover:neo-brutal-shadow-lg transition-all duration-200">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] uppercase font-headline font-black text-white bg-brand-primary border-2 border-brand-primary px-3 py-1">
                          {plan.type.toUpperCase()}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-500">Validity: {plan.validity_days} Days</span>
                      </div>
                      
                      <h3 className="font-headline text-2xl font-black uppercase tracking-tight text-brand-text mb-2 group-hover:text-brand-primary transition-colors">
                        {plan.name}
                      </h3>
                      
                      <div className="mb-4 flex items-center gap-2">
                        <span className="text-xs font-headline font-bold text-brand-primary uppercase">Data allowance:</span>
                        <span className="text-sm font-sans font-extrabold text-brand-text bg-white px-2 py-0.5 border border-brand-primary rounded-none">
                          {plan.data_gb === -1 ? 'Unlimited GB' : `${plan.data_gb} GB`}
                        </span>
                      </div>
                      
                      <p className="text-xs font-sans text-brand-text opacity-70 mb-6 font-semibold line-clamp-3">
                        {plan.description || 'Flexible high-speed mobile data pack with secure checkout and immediate activation.'}
                      </p>
                    </div>

                    <div className="border-t-2 border-brand-primary pt-4 mt-auto flex justify-between items-center">
                      <div>
                        <span className="text-[10px] font-headline font-black uppercase text-slate-400 block tracking-wider leading-none mb-1">Price</span>
                        <span className="font-headline text-3xl font-black text-brand-primary">${plan.price.toFixed(2)}</span>
                      </div>
                      <button 
                        onClick={() => handleBuyClick(plan, 'PLAN')}
                        className="bg-brand-primary text-white hover:bg-brand-primary-container hover:text-brand-primary px-5 py-3 border-2 border-brand-primary font-headline text-xs font-black uppercase tracking-widest neo-brutal-shadow-xs active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                      >
                        Select Plan
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Integration Status Section */}
        <section className="bg-brand-bg py-16">
          <div className="max-w-7xl mx-auto px-4">
            <h3 className="font-headline text-2xl font-black uppercase tracking-wider text-brand-text mb-10 text-center italic">
              System Integration Status
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-4">
              {/* Frontend Status */}
              <div className="bg-white p-4 border-4 border-brand-primary neo-brutal-shadow-sm flex flex-col items-center text-center">
                <div className="h-9 w-9 border-2 border-brand-primary bg-brand-primary-container text-brand-text flex items-center justify-center font-bold mb-2.5">
                  <Layers className="w-4 h-4 animate-pulse" />
                </div>
                <h4 className="font-headline text-xs font-black uppercase text-brand-text">Frontend</h4>
                <p className="text-[9px] font-sans text-brand-text mt-0.5 opacity-70 font-semibold">Vite (Port 5173)</p>
                <span className="mt-3 px-2 py-0.5 border-2 border-brand-primary bg-[#10B981] text-white text-[9px] font-headline font-black uppercase tracking-widest">
                  Online
                </span>
              </div>

              {/* Gateway / Monolith */}
              <div className="bg-white p-4 border-4 border-brand-primary neo-brutal-shadow-sm flex flex-col items-center text-center">
                <div className={`h-9 w-9 border-2 border-brand-primary flex items-center justify-center font-bold mb-2.5 ${
                  backendStatus === 'connected' ? 'bg-[#10B981] text-white' :
                  backendStatus === 'disconnected' ? 'bg-[#cc0000] text-white' : 'bg-brand-primary-container text-brand-text'
                }`}>
                  <Server className="w-4 h-4" />
                </div>
                <h4 className="font-headline text-xs font-black uppercase text-brand-text">Monolith</h4>
                <p className="text-[9px] font-sans text-brand-text mt-0.5 opacity-70 font-semibold">FastAPI (Port 8000)</p>
                <span className={`mt-3 px-2 py-0.5 border-2 border-brand-primary text-[9px] font-headline font-black uppercase tracking-widest ${
                  backendStatus === 'connected' ? 'bg-[#10B981] text-white' :
                  backendStatus === 'disconnected' ? 'bg-[#cc0000] text-white' : 'bg-brand-primary-container text-brand-text animate-pulse'
                }`}>
                  {backendStatus === 'connected' ? 'Connected' :
                   backendStatus === 'disconnected' ? 'Offline' : 'Checking...'}
                </span>
              </div>

              {/* Auth Service */}
              <div className="bg-white p-4 border-4 border-brand-primary neo-brutal-shadow-sm flex flex-col items-center text-center">
                <div className={`h-9 w-9 border-2 border-brand-primary flex items-center justify-center font-bold mb-2.5 ${
                  authStatus === 'connected' ? 'bg-[#10B981] text-white' :
                  authStatus === 'disconnected' ? 'bg-[#cc0000] text-white' : 'bg-brand-primary-container text-brand-text'
                }`}>
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h4 className="font-headline text-xs font-black uppercase text-brand-text">Auth Svc</h4>
                <p className="text-[9px] font-sans text-brand-text mt-0.5 opacity-70 font-semibold">FastAPI (Port 8001)</p>
                <span className={`mt-3 px-2 py-0.5 border-2 border-brand-primary text-[9px] font-headline font-black uppercase tracking-widest ${
                  authStatus === 'connected' ? 'bg-[#10B981] text-white' :
                  authStatus === 'disconnected' ? 'bg-[#cc0000] text-white' : 'bg-brand-primary-container text-brand-text animate-pulse'
                }`}>
                  {authStatus === 'connected' ? 'Connected' :
                   authStatus === 'disconnected' ? 'Offline' : 'Checking...'}
                </span>
              </div>

              {/* SIM Service */}
              <div className="bg-white p-4 border-4 border-brand-primary neo-brutal-shadow-sm flex flex-col items-center text-center">
                <div className={`h-9 w-9 border-2 border-brand-primary flex items-center justify-center font-bold mb-2.5 ${
                  simStatus === 'connected' ? 'bg-[#10B981] text-white' :
                  simStatus === 'disconnected' ? 'bg-[#cc0000] text-white' : 'bg-brand-primary-container text-brand-text'
                }`}>
                  <Cpu className="w-4 h-4" />
                </div>
                <h4 className="font-headline text-xs font-black uppercase text-brand-text">SIM Svc</h4>
                <p className="text-[9px] font-sans text-brand-text mt-0.5 opacity-70 font-semibold">FastAPI (Port 8002)</p>
                <span className={`mt-3 px-2 py-0.5 border-2 border-brand-primary text-[9px] font-headline font-black uppercase tracking-widest ${
                  simStatus === 'connected' ? 'bg-[#10B981] text-white' :
                  simStatus === 'disconnected' ? 'bg-[#cc0000] text-white' : 'bg-brand-primary-container text-brand-text animate-pulse'
                }`}>
                  {simStatus === 'connected' ? 'Connected' :
                   simStatus === 'disconnected' ? 'Offline' : 'Checking...'}
                </span>
              </div>

              {/* Plan Service */}
              <div className="bg-white p-4 border-4 border-brand-primary neo-brutal-shadow-sm flex flex-col items-center text-center">
                <div className={`h-9 w-9 border-2 border-brand-primary flex items-center justify-center font-bold mb-2.5 ${
                  planStatus === 'connected' ? 'bg-[#10B981] text-white' :
                  planStatus === 'disconnected' ? 'bg-[#cc0000] text-white' : 'bg-brand-primary-container text-brand-text'
                }`}>
                  <Cpu className="w-4 h-4" />
                </div>
                <h4 className="font-headline text-xs font-black uppercase text-brand-text">Plan Svc</h4>
                <p className="text-[9px] font-sans text-brand-text mt-0.5 opacity-70 font-semibold">FastAPI (Port 8003)</p>
                <span className={`mt-3 px-2 py-0.5 border-2 border-brand-primary text-[9px] font-headline font-black uppercase tracking-widest ${
                  planStatus === 'connected' ? 'bg-[#10B981] text-white' :
                  planStatus === 'disconnected' ? 'bg-[#cc0000] text-white' : 'bg-brand-primary-container text-brand-text animate-pulse'
                }`}>
                  {planStatus === 'connected' ? 'Connected' :
                   planStatus === 'disconnected' ? 'Offline' : 'Checking...'}
                </span>
              </div>

              {/* Wallet Service */}
              <div className="bg-white p-4 border-4 border-brand-primary neo-brutal-shadow-sm flex flex-col items-center text-center">
                <div className={`h-9 w-9 border-2 border-brand-primary flex items-center justify-center font-bold mb-2.5 ${
                  walletStatus === 'connected' ? 'bg-[#10B981] text-white' :
                  walletStatus === 'disconnected' ? 'bg-[#cc0000] text-white' : 'bg-brand-primary-container text-brand-text'
                }`}>
                  <Wallet className="w-4 h-4" />
                </div>
                <h4 className="font-headline text-xs font-black uppercase text-brand-text">Wallet Svc</h4>
                <p className="text-[9px] font-sans text-brand-text mt-0.5 opacity-70 font-semibold">FastAPI (Port 8004)</p>
                <span className={`mt-3 px-2 py-0.5 border-2 border-brand-primary text-[9px] font-headline font-black uppercase tracking-widest ${
                  walletStatus === 'connected' ? 'bg-[#10B981] text-white' :
                  walletStatus === 'disconnected' ? 'bg-[#cc0000] text-white' : 'bg-brand-primary-container text-brand-text animate-pulse'
                }`}>
                  {walletStatus === 'connected' ? 'Connected' :
                   walletStatus === 'disconnected' ? 'Offline' : 'Checking...'}
                </span>
              </div>

              {/* Order Service */}
              <div className="bg-white p-4 border-4 border-brand-primary neo-brutal-shadow-sm flex flex-col items-center text-center">
                <div className={`h-9 w-9 border-2 border-brand-primary flex items-center justify-center font-bold mb-2.5 ${
                  orderStatus === 'connected' ? 'bg-[#10B981] text-white' :
                  orderStatus === 'disconnected' ? 'bg-[#cc0000] text-white' : 'bg-brand-primary-container text-brand-text'
                }`}>
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <h4 className="font-headline text-xs font-black uppercase text-brand-text">Order Svc</h4>
                <p className="text-[9px] font-sans text-brand-text mt-0.5 opacity-70 font-semibold">FastAPI (Port 8005)</p>
                <span className={`mt-3 px-2 py-0.5 border-2 border-brand-primary text-[9px] font-headline font-black uppercase tracking-widest ${
                  orderStatus === 'connected' ? 'bg-[#10B981] text-white' :
                  orderStatus === 'disconnected' ? 'bg-[#cc0000] text-white' : 'bg-brand-primary-container text-brand-text animate-pulse'
                }`}>
                  {orderStatus === 'connected' ? 'Connected' :
                   orderStatus === 'disconnected' ? 'Offline' : 'Checking...'}
                </span>
              </div>

              {/* Notification Service */}
              <div className="bg-white p-4 border-4 border-brand-primary neo-brutal-shadow-sm flex flex-col items-center text-center">
                <div className={`h-9 w-9 border-2 border-brand-primary flex items-center justify-center font-bold mb-2.5 ${
                  notificationStatus === 'connected' ? 'bg-[#10B981] text-white' :
                  notificationStatus === 'disconnected' ? 'bg-[#cc0000] text-white' : 'bg-brand-primary-container text-brand-text'
                }`}>
                  <Bell className="w-4 h-4" />
                </div>
                <h4 className="font-headline text-xs font-black uppercase text-brand-text">Notif Svc</h4>
                <p className="text-[9px] font-sans text-brand-text mt-0.5 opacity-70 font-semibold">FastAPI (Port 8006)</p>
                <span className={`mt-3 px-2 py-0.5 border-2 border-brand-primary text-[9px] font-headline font-black uppercase tracking-widest ${
                  notificationStatus === 'connected' ? 'bg-[#10B981] text-white' :
                  notificationStatus === 'disconnected' ? 'bg-[#cc0000] text-white' : 'bg-brand-primary-container text-brand-text animate-pulse'
                }`}>
                  {notificationStatus === 'connected' ? 'Connected' :
                   notificationStatus === 'disconnected' ? 'Offline' : 'Checking...'}
                </span>
              </div>

              {/* Database Status */}
              <div className="bg-white p-4 border-4 border-brand-primary neo-brutal-shadow-sm flex flex-col items-center text-center">
                <div className={`h-9 w-9 border-2 border-brand-primary flex items-center justify-center font-bold mb-2.5 ${
                  backendStatus === 'connected' || authStatus === 'connected' || simStatus === 'connected' || planStatus === 'connected' || walletStatus === 'connected' || orderStatus === 'connected' || notificationStatus === 'connected' ? 'bg-[#10B981] text-white' :
                  backendStatus === 'disconnected' && authStatus === 'disconnected' && simStatus === 'disconnected' && planStatus === 'disconnected' && walletStatus === 'disconnected' && orderStatus === 'disconnected' && notificationStatus === 'disconnected' ? 'bg-[#cc0000] text-white' : 'bg-brand-primary-container text-brand-text'
                }`}>
                  <Database className="w-4 h-4" />
                </div>
                <h4 className="font-headline text-xs font-black uppercase text-brand-text">Database</h4>
                <p className="text-[9px] font-sans text-brand-text mt-0.5 opacity-70 font-semibold">Postgres (Port 5433)</p>
                <span className={`mt-3 px-2 py-0.5 border-2 border-brand-primary text-[9px] font-headline font-black uppercase tracking-widest ${
                  backendStatus === 'connected' || authStatus === 'connected' || simStatus === 'connected' || planStatus === 'connected' || walletStatus === 'connected' || orderStatus === 'connected' || notificationStatus === 'connected' ? 'bg-[#10B981] text-white' :
                  backendStatus === 'disconnected' && authStatus === 'disconnected' && simStatus === 'disconnected' && planStatus === 'disconnected' && walletStatus === 'disconnected' && orderStatus === 'disconnected' && notificationStatus === 'disconnected' ? 'bg-[#cc0000] text-white' : 'bg-brand-primary-container text-brand-text'
                }`}>
                  {backendStatus === 'connected' || authStatus === 'connected' || simStatus === 'connected' || planStatus === 'connected' || walletStatus === 'connected' || orderStatus === 'connected' || notificationStatus === 'connected' ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>

            {(backendStatus === 'connected' && backendInfo) && (
              <div className="mt-8 text-center text-xs text-brand-text font-mono border-t-2 border-brand-primary border-dashed pt-4">
                API Environment: {backendInfo.project} (Status: {backendInfo.status})
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-brand-primary text-brand-bg border-t-4 border-brand-primary py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center sm:items-start gap-2">
            <span className="text-xl font-headline font-black uppercase tracking-tighter">SMARTSIM</span>
            <p className="font-headline font-bold uppercase tracking-widest text-[10px] opacity-80">
              © {new Date().getFullYear()} SMARTSIM. FORM FOLLOWS FUNCTION.
            </p>
          </div>
          <div className="flex gap-8 uppercase font-headline text-[10px] font-black tracking-widest">
            <a href="#" className="hover:text-brand-primary-container transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-brand-primary-container transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default Home;
