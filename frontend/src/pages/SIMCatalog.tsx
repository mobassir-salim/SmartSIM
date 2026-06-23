import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useCart } from '../context/CartContext';
import { Search } from 'lucide-react';

const SIMCatalog: React.FC = () => {
  const { addToCart } = useCart();
  const [sims, setSims] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Filters
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'physical' | 'esim'>('all');

  useEffect(() => {
    const fetchSims = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch('/api/sims');
        if (!res.ok) throw new Error('Failed to load SIM cards catalog');
        const data = await res.json();
        setSims(data || []);
      } catch (err: any) {
        setError(err.message || 'Error loading SIM cards');
      } finally {
        setLoading(false);
      }
    };

    fetchSims();
  }, []);

  const handleBuyClick = (sim: any) => {
    addToCart({
      id: String(sim.id),
      name: sim.name,
      type: 'SIM',
      price: sim.price
    });
  };

  // Apply filters
  const filteredSims = sims.filter((sim) => {
    const matchesSearch = sim.name.toLowerCase().includes(search.toLowerCase()) || 
                          (sim.description && sim.description.toLowerCase().includes(search.toLowerCase()));
    
    const matchesType = typeFilter === 'all' || 
                        (typeFilter === 'esim' && sim.type === 'esim') || 
                        (typeFilter === 'physical' && sim.type === 'physical');

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
            SIM Card Catalog
          </h1>
          <p className="font-sans text-sm max-w-xl font-semibold opacity-90">
            Browse through our available physical SIM cards and instant-activation eSIMs. Select a card to add it to your cart.
          </p>
        </div>

        {/* Filters Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Search bar */}
          <div className="md:col-span-2 relative flex border-4 border-brand-primary bg-white neo-brutal-shadow-sm">
            <span className="flex items-center pl-4 pr-3 text-brand-primary">
              <Search className="w-5 h-5" />
            </span>
            <input
              type="text"
              placeholder="Search SIM name or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full py-4 px-2 font-headline font-semibold text-sm outline-none bg-transparent"
            />
          </div>

          {/* Type Filter Buttons */}
          <div className="flex border-4 border-brand-primary bg-white neo-brutal-shadow-sm font-headline font-black text-xs uppercase">
            <button
              onClick={() => setTypeFilter('all')}
              className={`flex-1 py-4 text-center border-r-2 border-brand-primary transition-colors cursor-pointer ${
                typeFilter === 'all' ? 'bg-brand-primary-container text-brand-primary' : 'hover:bg-brand-surface-low'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setTypeFilter('esim')}
              className={`flex-1 py-4 text-center border-r-2 border-brand-primary transition-colors cursor-pointer ${
                typeFilter === 'esim' ? 'bg-brand-primary-container text-brand-primary' : 'hover:bg-brand-surface-low'
              }`}
            >
              eSIM
            </button>
            <button
              onClick={() => setTypeFilter('physical')}
              className={`flex-1 py-4 text-center transition-colors cursor-pointer ${
                typeFilter === 'physical' ? 'bg-brand-primary-container text-brand-primary' : 'hover:bg-brand-surface-low'
              }`}
            >
              Physical
            </button>
          </div>
        </div>

        {/* Catalog List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-12 w-12 border-4 border-brand-primary border-t-brand-secondary animate-spin mb-4"></div>
            <p className="font-headline font-black uppercase text-sm tracking-wider">Loading SIM card catalog...</p>
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
        ) : filteredSims.length === 0 ? (
          <div className="text-center py-16 border-4 border-brand-primary border-dashed bg-white max-w-md mx-auto p-8 neo-brutal-shadow-sm">
            <p className="font-headline font-black uppercase text-lg mb-2 text-brand-primary">No SIMs Found</p>
            <p className="text-xs font-sans text-brand-text font-semibold opacity-70">
              No SIM cards match your current search queries or filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredSims.map((sim) => (
              <div
                key={sim.id}
                className="bg-white border-4 border-brand-primary p-6 neo-brutal-shadow flex flex-col justify-between group hover:-translate-x-1 hover:-translate-y-1 hover:neo-brutal-shadow-lg transition-all duration-200"
              >
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
                    <span className="text-[10px] font-headline font-black uppercase text-slate-400 block tracking-wider leading-none mb-1">
                      Price
                    </span>
                    <span className="font-headline text-3xl font-black text-brand-primary">
                      {sim.price.toFixed(2)} BDT
                    </span>
                  </div>
                  <button
                    onClick={() => handleBuyClick(sim)}
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

export default SIMCatalog;
