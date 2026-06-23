import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useCart } from '../context/CartContext';
import { Search } from 'lucide-react';

const PlanCatalog: React.FC = () => {
  const { addToCart } = useCart();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Filters
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'data' | 'voice' | 'combo'>('all');

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch('http://localhost/api/plans');
        if (!res.ok) throw new Error('Failed to load plans catalog');
        const data = await res.json();
        setPlans(data || []);
      } catch (err: any) {
        setError(err.message || 'Error loading plans');
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const handleBuyClick = (plan: any) => {
    addToCart({
      id: String(plan.id),
      name: plan.name,
      type: 'PLAN',
      price: plan.price
    });
  };

  // Apply filters
  const filteredPlans = plans.filter((plan) => {
    const matchesSearch = plan.name.toLowerCase().includes(search.toLowerCase()) || 
                          (plan.description && plan.description.toLowerCase().includes(search.toLowerCase()));
    
    const matchesType = typeFilter === 'all' || plan.type.toLowerCase() === typeFilter;

    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col font-sans">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-grow w-full">
        {/* Page Header */}
        <div className="mb-10 border-4 border-brand-primary bg-brand-primary-container p-8 neo-brutal-shadow rounded-none relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-brand-secondary border-b-4 border-l-4 border-brand-primary"></div>
          <h1 className="text-3xl sm:text-4xl font-headline font-black text-brand-primary uppercase mb-2 tracking-tight">
            Mobile Plans Catalog
          </h1>
          <p className="font-sans text-sm max-w-xl font-semibold opacity-90">
            Explore high-speed mobile data packs, voice rate offers, and combo recharges. Select a plan to add it to your checkout cart.
          </p>
        </div>

        {/* Filters Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          {/* Search bar */}
          <div className="md:col-span-2 relative flex border-4 border-brand-primary bg-white neo-brutal-shadow-sm">
            <span className="flex items-center pl-4 pr-3 text-brand-primary">
              <Search className="w-5 h-5" />
            </span>
            <input
              type="text"
              placeholder="Search plan name or detail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full py-4 px-2 font-headline font-semibold text-sm outline-none bg-transparent"
            />
          </div>

          {/* Type Filter Buttons */}
          <div className="md:col-span-2 flex border-4 border-brand-primary bg-white neo-brutal-shadow-sm font-headline font-black text-[10px] uppercase">
            <button
              onClick={() => setTypeFilter('all')}
              className={`flex-1 py-4 text-center border-r-2 border-brand-primary transition-colors cursor-pointer ${
                typeFilter === 'all' ? 'bg-brand-primary-container text-brand-primary' : 'hover:bg-brand-surface-low'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setTypeFilter('data')}
              className={`flex-1 py-4 text-center border-r-2 border-brand-primary transition-colors cursor-pointer ${
                typeFilter === 'data' ? 'bg-brand-primary-container text-brand-primary' : 'hover:bg-brand-surface-low'
              }`}
            >
              Data
            </button>
            <button
              onClick={() => setTypeFilter('voice')}
              className={`flex-1 py-4 text-center border-r-2 border-brand-primary transition-colors cursor-pointer ${
                typeFilter === 'voice' ? 'bg-brand-primary-container text-brand-primary' : 'hover:bg-brand-surface-low'
              }`}
            >
              Voice
            </button>
            <button
              onClick={() => setTypeFilter('combo')}
              className={`flex-1 py-4 text-center transition-colors cursor-pointer ${
                typeFilter === 'combo' ? 'bg-brand-primary-container text-brand-primary' : 'hover:bg-brand-surface-low'
              }`}
            >
              Combo
            </button>
          </div>
        </div>

        {/* Catalog List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-12 w-12 border-4 border-brand-primary border-t-brand-secondary animate-spin mb-4"></div>
            <p className="font-headline font-black uppercase text-sm tracking-wider">Loading mobile plans...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 border-4 border-brand-primary bg-white max-w-md mx-auto p-8 neo-brutal-shadow-sm">
            <p className="font-headline font-black uppercase text-lg mb-2 text-brand-secondary">Error Loading Catalog</p>
            <p className="text-xs font-sans text-brand-text font-semibold opacity-70 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-brand-primary-container text-brand-primary border-2 border-brand-primary font-headline font-black px-4 py-2 text-xs uppercase"
            >
              Retry
            </button>
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="text-center py-16 border-4 border-brand-primary border-dashed bg-white max-w-md mx-auto p-8 neo-brutal-shadow-sm">
            <p className="font-headline font-black uppercase text-lg mb-2 text-brand-primary">No Plans Found</p>
            <p className="text-xs font-sans text-brand-text font-semibold opacity-70">
              No plan packages match your current search queries or filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPlans.map((plan) => (
              <div
                key={plan.id}
                className="bg-brand-primary-container/10 border-4 border-brand-primary p-6 neo-brutal-shadow flex flex-col justify-between group hover:-translate-x-1 hover:-translate-y-1 hover:neo-brutal-shadow-lg transition-all duration-200"
              >
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
                    <span className="text-[10px] font-headline font-black uppercase text-slate-400 block tracking-wider leading-none mb-1">
                      Price
                    </span>
                    <span className="font-headline text-3xl font-black text-brand-primary">
                      {plan.price.toFixed(2)} BDT
                    </span>
                  </div>
                  <button
                    onClick={() => handleBuyClick(plan)}
                    className="bg-brand-primary-container hover:bg-brand-primary text-brand-primary hover:text-white px-5 py-3 border-2 border-brand-primary font-headline text-xs font-black uppercase tracking-widest neo-brutal-shadow-xs active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                  >
                    Buy Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default PlanCatalog;
