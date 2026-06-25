import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { 
  User as UserIcon, CreditCard, ShoppingBag, Radio, Plus, X, 
  ArrowDownLeft, ArrowUpRight, LayoutDashboard
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'wallet' | 'orders' | 'profile'>('overview');

  // Wallet state
  const [wallet, setWallet] = useState<any>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [walletError, setWalletError] = useState('');

  // Top-up modal state
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpMsg, setTopUpMsg] = useState('');

  // Recent transactions state
  const [transactions, setTransactions] = useState<any[]>([]);

  // Orders state
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState('');

  // Active SIMs state
  const [sims, setSims] = useState<any[]>([]);
  const [simsLoading, setSimsLoading] = useState(true);
  const [simsError, setSimsError] = useState('');

  const fetchSims = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      setSimsLoading(true);
      setSimsError('');
      const res = await fetch('/api/sims/assignments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load SIM assignments');
      const data = await res.json();
      setSims(data || []);
    } catch (err: any) {
      setSimsError('Could not load SIM cards');
    } finally {
      setSimsLoading(false);
    }
  };

  const fetchOrders = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      setOrdersLoading(true);
      setOrdersError('');
      const res = await fetch('/api/orders?limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load orders');
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err: any) {
      setOrdersError('Could not load orders');
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchWallet = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      setWalletLoading(true);
      setWalletError('');
      const res = await fetch('/api/wallet', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load wallet');
      const data = await res.json();
      setWallet(data);

      // Fetch wallet transactions
      const txRes = await fetch('/api/wallet/transactions?limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (txRes.ok) {
        const txData = await txRes.json();
        setTransactions(txData.transactions || []);
      }
    } catch (err: any) {
      setWalletError('Could not load wallet');
    } finally {
      setWalletLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
    fetchOrders();
    fetchSims();
  }, []);

  const handleTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    if (!amount || amount <= 0) { setTopUpMsg('Enter a valid amount'); return; }
    const token = localStorage.getItem('access_token');
    setTopUpLoading(true);
    setTopUpMsg('');
    try {
      const res = await fetch('/api/wallet/add-money', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, description: 'Manual top-up' }),
      });
      if (!res.ok) throw new Error('Top-up failed');
      setTopUpMsg('✅ Top-up successful!');
      setTopUpAmount('');
      await fetchWallet(); // Refresh balance
      setTimeout(() => { setShowTopUp(false); setTopUpMsg(''); }, 1500);
    } catch {
      setTopUpMsg('❌ Top-up failed. Try again.');
    } finally {
      setTopUpLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center text-brand-text font-sans">
        <div className="border-4 border-brand-primary p-8 bg-brand-primary-container font-headline font-black uppercase text-xl neo-brutal-shadow">
          Loading user profile...
        </div>
      </div>
    );
  }

  const joinDate = new Date(user.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col font-sans selection:bg-brand-primary-container selection:text-brand-primary">
      <Navbar />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-grow w-full">
        {/* Welcome Section */}
        <div className="mb-10 border-4 border-brand-primary bg-brand-primary-container p-8 neo-brutal-shadow rounded-none relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-brand-secondary border-b-4 border-l-4 border-brand-primary"></div>
          <h1 className="text-3xl sm:text-4xl font-headline font-black text-brand-primary uppercase mb-2 tracking-tight">
            Customer Dashboard
          </h1>
          <p className="font-sans text-sm max-w-xl font-semibold opacity-90">
            Welcome back to your workspace. Here you can configure your SIM card settings, buy and review your phone plans, and fund your balance wallet.
          </p>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1 flex flex-col gap-3 font-headline font-black text-sm uppercase tracking-wide">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full text-left p-4 border-4 border-brand-primary transition-all cursor-pointer flex items-center gap-3 ${
                activeTab === 'overview'
                  ? 'bg-brand-primary-container text-brand-primary neo-brutal-shadow-sm translate-x-1 translate-y-1'
                  : 'bg-white hover:bg-brand-surface-low'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Overview</span>
            </button>
            <button
              onClick={() => setActiveTab('wallet')}
              className={`w-full text-left p-4 border-4 border-brand-primary transition-all cursor-pointer flex items-center gap-3 ${
                activeTab === 'wallet'
                  ? 'bg-brand-primary-container text-brand-primary neo-brutal-shadow-sm translate-x-1 translate-y-1'
                  : 'bg-white hover:bg-brand-surface-low'
              }`}
            >
              <CreditCard className="w-5 h-5" />
              <span>My Wallet</span>
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full text-left p-4 border-4 border-brand-primary transition-all cursor-pointer flex items-center gap-3 ${
                activeTab === 'orders'
                  ? 'bg-brand-primary-container text-brand-primary neo-brutal-shadow-sm translate-x-1 translate-y-1'
                  : 'bg-white hover:bg-brand-surface-low'
              }`}
            >
              <ShoppingBag className="w-5 h-5" />
              <span>Order History</span>
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full text-left p-4 border-4 border-brand-primary transition-all cursor-pointer flex items-center gap-3 ${
                activeTab === 'profile'
                  ? 'bg-brand-primary-container text-brand-primary neo-brutal-shadow-sm translate-x-1 translate-y-1'
                  : 'bg-white hover:bg-brand-surface-low'
              }`}
            >
              <UserIcon className="w-5 h-5" />
              <span>Profile Details</span>
            </button>
          </div>

          {/* Tab Content Display Area */}
          <div className="lg:col-span-3">
            
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Wallet Balance Card */}
                  <div className="bg-white border-4 border-brand-primary p-6 neo-brutal-shadow rounded-none flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-headline font-black uppercase tracking-widest text-slate-400">Wallet Balance</span>
                        <CreditCard className={`w-6 h-6 text-brand-primary ${walletLoading ? 'animate-pulse' : ''}`} />
                      </div>

                      {walletLoading ? (
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-8 w-8 border-4 border-brand-primary border-t-brand-secondary animate-spin"></div>
                          <span className="text-sm font-headline font-black uppercase text-slate-400">Loading...</span>
                        </div>
                      ) : walletError ? (
                        <p className="text-sm font-headline font-black text-red-500 mb-2">{walletError}</p>
                      ) : (
                        <>
                          <h2 className="text-4xl font-headline font-black text-brand-primary mb-1">
                            {parseFloat(wallet?.balance || 0).toFixed(2)} BDT
                          </h2>
                          <p className="text-[10px] font-headline font-black uppercase text-slate-400 tracking-widest mb-2">
                            Available Balance
                          </p>
                        </>
                      )}
                      <p className="text-xs font-sans font-semibold text-brand-text/75">Top up your wallet to instantly buy eSIMs and combos.</p>
                    </div>

                    <button
                      onClick={() => setShowTopUp(true)}
                      className="w-full mt-6 flex items-center justify-center gap-2 bg-brand-primary-container text-brand-primary border-4 border-brand-primary font-headline font-black py-3 px-4 rounded-none neo-brutal-shadow-sm neo-brutal-shadow-hover transition-all text-sm cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Top Up Wallet
                    </button>
                  </div>

                  {/* Active SIMs Card */}
                  <div className="bg-white border-4 border-brand-primary p-6 neo-brutal-shadow rounded-none flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-headline font-black uppercase tracking-widest text-slate-400">Active SIMs</span>
                        <Radio className="w-6 h-6 text-brand-primary animate-pulse" />
                      </div>
                      {simsLoading ? (
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-6 w-6 border-4 border-brand-primary border-t-brand-secondary animate-spin"></div>
                          <span className="text-xs font-headline font-black uppercase text-slate-400">Loading...</span>
                        </div>
                      ) : simsError ? (
                        <p className="text-xs font-headline font-black text-red-500 mb-2">{simsError}</p>
                      ) : (
                        <>
                          <h2 className="text-4xl font-headline font-black text-brand-primary mb-2">
                            {sims.length}
                          </h2>
                          {sims.length === 0 ? (
                            <p className="text-xs font-sans font-semibold text-brand-text/75 leading-relaxed">No SIM cards linked to your account yet.</p>
                          ) : (
                            <div className="space-y-1.5 mt-2">
                              {sims.map((sim: any) => (
                                <div key={sim.id} className="flex justify-between items-center bg-brand-surface-low border-2 border-brand-primary/20 px-2 py-1">
                                  <span className="text-xs font-mono font-black text-brand-primary">
                                    +880 {sim.msisdn}
                                  </span>
                                  <span className={`text-[8px] font-headline font-black px-1.5 py-0.5 border border-brand-primary/30 uppercase ${
                                    sim.assignment_status === 'ACTIVATED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {sim.assignment_status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <button 
                      onClick={() => setActiveTab('orders')}
                      className="w-full mt-6 flex justify-center items-center bg-brand-primary-container text-brand-primary border-4 border-brand-primary font-headline font-black py-3 px-4 rounded-none neo-brutal-shadow-sm neo-brutal-shadow-hover transition-all text-sm cursor-pointer"
                    >
                      View Purchased SIMs
                    </button>
                  </div>
                </div>

                {/* Quick Transactions Log */}
                <div className="bg-white border-4 border-brand-primary p-6 neo-brutal-shadow rounded-none">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-headline font-black uppercase tracking-widest text-slate-400">Recent Transactions</span>
                    <button onClick={() => setActiveTab('wallet')} className="text-xs font-headline font-black text-brand-secondary hover:underline uppercase">View All</button>
                  </div>
                  {walletLoading ? (
                    <div className="h-20 flex items-center justify-center border-4 border-brand-primary border-dashed bg-brand-surface-low">
                      <div className="h-6 w-6 border-4 border-brand-primary border-t-brand-secondary animate-spin"></div>
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="border-4 border-brand-primary bg-brand-surface-low border-dashed p-6 text-center text-sm font-headline font-black uppercase text-slate-500">
                      No transactions found.
                    </div>
                  ) : (
                    <div className="divide-y-2 divide-brand-primary border-4 border-brand-primary">
                      {transactions.slice(0, 3).map((tx: any) => (
                        <div key={tx.id} className="flex items-center justify-between px-4 py-3 bg-white">
                          <div className="flex items-center gap-3">
                            <div className={`h-8 w-8 border-2 border-brand-primary flex items-center justify-center ${
                              tx.transaction_type === 'CREDIT' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'
                            }`}>
                              {tx.transaction_type === 'CREDIT' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className="text-xs font-headline font-black uppercase text-brand-text">{tx.description || tx.transaction_type}</p>
                              <p className="text-[9px] font-mono text-slate-400">{new Date(tx.created_at).toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-headline font-black text-sm ${tx.transaction_type === 'CREDIT' ? 'text-green-600' : 'text-red-500'}`}>
                              {tx.transaction_type === 'CREDIT' ? '+' : '-'}{parseFloat(tx.amount).toFixed(2)} BDT
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* WALLET TAB */}
            {activeTab === 'wallet' && (
              <div className="space-y-8">
                {/* Balance display */}
                <div className="bg-white border-4 border-brand-primary p-8 neo-brutal-shadow rounded-none flex flex-col md:flex-row justify-between items-center gap-6">
                  <div>
                    <span className="text-xs font-headline font-black uppercase tracking-widest text-slate-400 block mb-1">Total Wallet Funds</span>
                    <h2 className="text-5xl font-headline font-black text-brand-primary">
                      {parseFloat(wallet?.balance || 0).toFixed(2)} BDT
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowTopUp(true)}
                    className="w-full md:w-auto flex items-center justify-center gap-2 bg-brand-primary-container text-brand-primary border-4 border-brand-primary font-headline font-black py-4 px-8 rounded-none neo-brutal-shadow-sm neo-brutal-shadow-hover transition-all text-sm cursor-pointer"
                  >
                    <Plus className="w-5 h-5" />
                    Top Up Balance
                  </button>
                </div>

                {/* Transactions list */}
                <div className="bg-white border-4 border-brand-primary p-6 neo-brutal-shadow rounded-none">
                  <h3 className="font-headline font-black uppercase text-lg text-brand-primary mb-6">Transactions History</h3>
                  {walletLoading ? (
                    <div className="py-12 text-center">
                      <div className="h-10 w-10 border-4 border-brand-primary border-t-brand-secondary animate-spin mx-auto mb-4"></div>
                      <p className="font-headline font-black text-xs uppercase">Loading transactions...</p>
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="border-4 border-brand-primary bg-brand-surface-low border-dashed p-10 text-center text-sm font-headline font-black uppercase text-slate-500">
                      No wallet transactions recorded.
                    </div>
                  ) : (
                    <div className="divide-y-2 divide-brand-primary border-4 border-brand-primary">
                      {transactions.map((tx: any) => (
                        <div key={tx.id} className="flex items-center justify-between p-4 bg-white hover:bg-brand-surface-low transition-colors">
                          <div className="flex items-center gap-4">
                            <div className={`h-10 w-10 border-2 border-brand-primary flex items-center justify-center ${
                              tx.transaction_type === 'CREDIT' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'
                            }`}>
                              {tx.transaction_type === 'CREDIT' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                            </div>
                            <div>
                              <p className="text-sm font-headline font-black uppercase text-brand-text">{tx.description || tx.transaction_type}</p>
                              <p className="text-[10px] font-mono text-slate-400 mt-0.5">{new Date(tx.created_at).toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-headline font-black text-base ${tx.transaction_type === 'CREDIT' ? 'text-green-600' : 'text-red-500'}`}>
                              {tx.transaction_type === 'CREDIT' ? '+' : '-'}{parseFloat(tx.amount).toFixed(2)} BDT
                            </p>
                            <span className="text-[9px] font-headline font-black uppercase tracking-wider text-slate-400 block mt-0.5">
                              Status: {tx.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ORDERS TAB */}
            {activeTab === 'orders' && (
              <div className="bg-white border-4 border-brand-primary p-6 neo-brutal-shadow rounded-none">
                <h3 className="font-headline font-black uppercase text-lg text-brand-primary mb-6">Orders History</h3>
                
                {ordersLoading ? (
                  <div className="py-12 text-center">
                    <div className="h-10 w-10 border-4 border-brand-primary border-t-brand-secondary animate-spin mx-auto mb-4"></div>
                    <p className="font-headline font-black text-xs uppercase">Loading order records...</p>
                  </div>
                ) : ordersError ? (
                  <p className="text-sm font-headline font-black text-red-500">{ordersError}</p>
                ) : orders.length === 0 ? (
                  <div className="border-4 border-brand-primary bg-brand-surface-low border-dashed p-10 text-center text-sm font-headline font-black uppercase text-slate-500">
                    No orders placed yet.
                  </div>
                ) : (
                  <div className="divide-y-4 divide-brand-primary border-4 border-brand-primary bg-white">
                    {orders.map((order: any) => (
                      <div key={order.id} className="p-6 hover:bg-brand-surface-low transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 pb-4 border-b-2 border-brand-primary/10">
                          <div>
                            <p className="font-headline font-black uppercase text-sm text-brand-primary">Order #{order.id.slice(0, 8)}</p>
                            <p className="text-xs text-slate-400 mt-1">{new Date(order.created_at).toLocaleString()}</p>
                          </div>
                          <div className="sm:text-right">
                            <p className="font-headline font-black text-lg text-brand-primary">{parseFloat(order.total_amount).toFixed(2)} BDT</p>
                            <span className={`inline-block text-[9px] font-headline font-black px-2 py-0.5 border-2 border-brand-primary uppercase tracking-wider mt-1 ${
                              order.status === 'CONFIRMED' ? 'bg-green-500 text-white' :
                              order.status === 'FAILED' ? 'bg-red-500 text-white' :
                              order.status === 'PENDING' ? 'bg-yellow-400 text-brand-text' : 'bg-slate-400 text-white'
                            }`}>
                              {order.status}
                            </span>
                          </div>
                        </div>

                        {/* Order Items Detail */}
                        <div className="pl-4 border-l-4 border-brand-secondary space-y-2">
                          {order.items?.map((item: any) => (
                            <div key={item.id} className="flex justify-between items-center text-sm">
                              <div>
                                <span className="font-sans font-semibold text-brand-text uppercase">{item.item_name || `${item.item_type} ID: ${item.item_id}`}</span>
                                <span className="text-xs text-slate-400 ml-2">x {item.quantity}</span>
                              </div>
                              <span className="font-mono text-slate-500 font-semibold">{parseFloat(item.unit_price).toFixed(2)} BDT</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="bg-white border-4 border-brand-primary p-6 neo-brutal-shadow rounded-none">
                <h3 className="font-headline font-black uppercase text-lg text-brand-primary mb-6">Profile Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Avatar section */}
                  <div className="flex flex-col items-center justify-center p-6 border-4 border-brand-primary bg-brand-primary-container/10">
                    <div className="h-24 w-24 border-4 border-brand-primary bg-brand-primary-container text-brand-primary flex items-center justify-center font-bold mb-4 neo-brutal-shadow-sm">
                      <UserIcon className="w-12 h-12" />
                    </div>
                    <h4 className="font-headline font-black text-xl uppercase mb-1">{user.name}</h4>
                    <span className="text-[10px] font-headline font-black px-2.5 py-0.5 border-2 border-brand-primary bg-brand-secondary text-white uppercase tracking-wider">
                      {user.role}
                    </span>
                  </div>

                  {/* Profile info fields */}
                  <div className="space-y-5">
                    <div className="border-2 border-brand-primary p-3 bg-white">
                      <label className="text-[9px] font-headline font-black uppercase tracking-widest text-slate-400 block mb-1">Full Name</label>
                      <p className="font-headline font-black text-sm text-brand-primary">{user.name}</p>
                    </div>
                    <div className="border-2 border-brand-primary p-3 bg-white">
                      <label className="text-[9px] font-headline font-black uppercase tracking-widest text-slate-400 block mb-1">Email Address</label>
                      <p className="font-headline font-black text-sm text-brand-primary">{user.email}</p>
                    </div>
                    <div className="border-2 border-brand-primary p-3 bg-white">
                      <label className="text-[9px] font-headline font-black uppercase tracking-widest text-slate-400 block mb-1">Mobile Number</label>
                      <p className="font-headline font-black text-sm text-brand-primary">{user.mobile}</p>
                    </div>
                    <div className="border-2 border-brand-primary p-3 bg-white">
                      <label className="text-[9px] font-headline font-black uppercase tracking-widest text-slate-400 block mb-1">Registered Since</label>
                      <p className="font-headline font-black text-sm text-brand-primary">{joinDate}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      </main>

      {/* Top-Up Modal */}
      {showTopUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white border-4 border-brand-primary neo-brutal-shadow w-full max-w-sm mx-4 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline font-black uppercase text-xl text-brand-primary">Top Up Wallet</h3>
              <button onClick={() => { setShowTopUp(false); setTopUpMsg(''); }} className="border-2 border-brand-primary p-1 hover:bg-brand-primary-container transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-2">
              <label className="text-[10px] font-headline font-black uppercase tracking-widest text-slate-400 block mb-1">Amount (BDT)</label>
              <input
                type="number"
                min="1"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                placeholder="e.g. 500"
                className="w-full border-4 border-brand-primary p-3 font-headline font-black text-2xl text-brand-primary focus:outline-none focus:bg-brand-primary-container transition-colors"
              />
            </div>

            <div className="flex gap-2 mb-4">
              {[100, 250, 500, 1000].map(amt => (
                <button
                  key={amt}
                  onClick={() => setTopUpAmount(String(amt))}
                  className="flex-1 border-2 border-brand-primary py-1 text-xs font-headline font-black hover:bg-brand-primary-container transition-colors cursor-pointer"
                >
                  {amt}
                </button>
              ))}
            </div>

            {topUpMsg && (
              <p className="text-sm font-headline font-black mb-3 text-center">{topUpMsg}</p>
            )}

            <button
              onClick={handleTopUp}
              disabled={topUpLoading}
              className="w-full bg-brand-primary text-white border-4 border-brand-primary font-headline font-black py-3 uppercase tracking-widest neo-brutal-shadow-sm hover:bg-brand-primary/90 transition-all cursor-pointer disabled:opacity-50"
            >
              {topUpLoading ? 'Processing...' : 'Confirm Top Up'}
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-brand-primary text-brand-bg border-t-4 border-brand-primary py-12 mt-auto">
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
};

export default Dashboard;
