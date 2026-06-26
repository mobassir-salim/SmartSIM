import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { BrowserRouter as Router } from 'react-router-dom';
import AdminLogin from './components/AdminLogin';
import api from './services/api';
import {
  Users, CreditCard, ShoppingBag, TicketCheck, LayoutDashboard,
  Search, Eye, Ban, CheckCircle2, X, RefreshCw, Plus, Loader2, ArrowRight
} from 'lucide-react';

// Shared UI components
const MetricCard = ({ label, value, sub, accent = false }: { label: string; value: string | number; sub?: string; accent?: boolean }) => (
  <div className={`border-4 border-brand-primary p-5 neo-brutal-shadow ${accent ? 'bg-brand-primary-container' : 'bg-white'}`}>
    <p className="text-[9px] font-headline font-black uppercase tracking-widest text-slate-500 mb-1">{label}</p>
    <p className={`text-3xl font-headline font-black ${accent ? 'text-brand-primary' : 'text-brand-secondary'}`}>{value}</p>
    {sub && <p className="text-[10px] font-sans text-slate-400 mt-1">{sub}</p>}
  </div>
);

const SectionHeader = ({ title, action }: { title: string; action?: React.ReactNode }) => (
  <div className="flex justify-between items-center mb-6 pb-4 border-b-4 border-brand-primary">
    <h3 className="font-headline font-black uppercase text-xl text-brand-primary">{title}</h3>
    {action}
  </div>
);

const Btn = ({ children, onClick, variant = 'primary', size = 'sm', disabled = false, className = '' }: any) => {
  const base = 'font-headline font-black uppercase tracking-wide transition-all cursor-pointer flex items-center gap-1.5 border-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes: any = { sm: 'py-1.5 px-3 text-[10px]', md: 'py-2 px-4 text-xs', lg: 'py-3 px-6 text-sm' };
  const variants: any = {
    primary: 'bg-brand-primary text-white border-brand-primary hover:bg-brand-primary/90',
    outline: 'bg-white text-brand-primary border-brand-primary hover:bg-brand-surface-low',
    danger:  'bg-red-500 text-white border-red-500 hover:bg-red-600',
    success: 'bg-green-600 text-white border-green-600 hover:bg-green-700',
    warning: 'bg-yellow-400 text-brand-primary border-yellow-400 hover:bg-yellow-500',
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    active: 'bg-green-100 text-green-700 border-green-500',
    inactive: 'bg-red-100 text-red-700 border-red-500',
    UP: 'bg-green-100 text-green-700 border-green-500',
    DOWN: 'bg-red-100 text-red-700 border-red-500',
    CONFIRMED: 'bg-green-100 text-green-700 border-green-400',
    FAILED: 'bg-red-100 text-red-700 border-red-400',
    PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-400',
    Open: 'bg-blue-100 text-blue-700 border-blue-400',
    Resolved: 'bg-green-100 text-green-700 border-green-400',
    admin: 'bg-red-100 text-red-700 border-red-400',
    user: 'bg-blue-100 text-blue-700 border-blue-400',
  };
  const cls = map[status] || 'bg-slate-100 text-slate-600 border-slate-300';
  return <span className={`text-[8px] font-headline font-black px-1.5 py-0.5 border uppercase ${cls}`}>{status}</span>;
};

const Modal = ({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
    <div className="bg-white border-4 border-brand-primary neo-brutal-shadow w-full max-w-md max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center p-5 border-b-4 border-brand-primary bg-brand-primary-container">
        <h3 className="font-headline font-black uppercase text-lg text-brand-primary">{title}</h3>
        <button onClick={onClose} className="border-2 border-brand-primary p-1 hover:bg-white cursor-pointer"><X className="w-4 h-4" /></button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

const InputField = ({ label, ...props }: any) => (
  <div>
    <label className="text-[9px] font-headline font-black uppercase tracking-widest text-slate-400 block mb-1">{label}</label>
    {props.type === 'select' ? (
      <select {...props} className="w-full border-2 border-brand-primary p-2 font-headline font-semibold text-sm outline-none bg-white">{props.children}</select>
    ) : props.type === 'textarea' ? (
      <textarea {...props} className="w-full border-2 border-brand-primary p-2 font-headline font-semibold text-sm outline-none h-20 resize-none" />
    ) : (
      <input {...props} className="w-full border-2 border-brand-primary p-2 font-headline font-semibold text-sm outline-none" />
    )}
  </div>
);

const formatPrice = (val: number) => Number(val).toFixed(2);

const CRMMainApp: React.FC = () => {
  const { user, checkAuth } = useAuth();
  
  // Tabs configuration
  type TabId = 'overview' | 'customers' | 'tickets' | 'wallets' | 'orders';
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  
  // Notifications
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // States
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  
  // Search options
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSearchType, setCustomerSearchType] = useState<'general' | 'name' | 'email' | 'msisdn'>('general');
  const [walletAdjustForm, setWalletAdjustForm] = useState({ customer_id: '', amount: '', type: 'CREDIT', description: '' });

  // Modals
  const [crmModal, setCrmModal] = useState<'profile' | 'edit' | 'wallet' | null>(null);
  const [ticketModal, setTicketModal] = useState<'add' | 'view' | null>(null);
  const [selectedCrmProfile, setSelectedCrmProfile] = useState<any>(null);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [crmForm, setCrmForm] = useState({ customer_id: 0, name: '', email: '', mobile: '', address: '', notes: '', status: 'ACTIVE' });
  const [ticketForm, setTicketForm] = useState({ customer_id: '', type: 'SIM Activation Issue', description: '' });

  const notify = (msg: string, isErr = false) => {
    if (isErr) { setErrorMsg(msg); setTimeout(() => setErrorMsg(''), 4000); }
    else { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 4000); }
  };

  const fetchAll = useCallback(async () => {
    try {
      const [usersRes, ordersRes, ticketsRes] = await Promise.all([
        api.get('/auth/users'),
        api.get('/admin/orders'),
        api.get('/tickets/admin/all'),
      ]);
      setUsers(usersRes.data || []);
      setOrders(ordersRes.data || []);
      setTickets(ticketsRes.data || []);
    } catch (e: any) {
      notify('Failed to load portal data', true);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchAll();
    }
  }, [user, fetchAll]);

  const searchCrmCustomers = async () => {
    try {
      const params: any = {};
      if (customerSearch) {
        if (customerSearchType === 'general') {
          params.query = customerSearch;
        } else {
          params[customerSearchType] = customerSearch;
        }
      }
      const res = await api.get('/admin/crm/search', { params });
      setUsers(res.data || []);
    } catch (e: any) {
      notify('CRM search failed', true);
    }
  };

  const fetchCrmCustomerProfile = async (id: number) => {
    try {
      const res = await api.get(`/admin/crm/customer/${id}`);
      setSelectedCrmProfile(res.data);
      setCrmModal('profile');
      
      const info = res.data.basic_info;
      setCrmForm({
        customer_id: info.id,
        name: info.name || '',
        email: info.email || '',
        mobile: info.mobile || '',
        address: info.address || '',
        notes: info.notes || '',
        status: info.profile_status || 'ACTIVE'
      });
    } catch (e: any) {
      notify('Failed to fetch customer profile', true);
    }
  };

  const updateCrmCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put('/admin/crm/customer', crmForm);
      notify('Customer CRM profile updated!');
      setCrmModal('profile');
      fetchCrmCustomerProfile(crmForm.customer_id);
      searchCrmCustomers();
    } catch (e: any) {
      notify('Failed to update customer profile', true);
    }
  };

  const adjustWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const amount = parseFloat(walletAdjustForm.amount);
      if (isNaN(amount) || amount <= 0) return notify('Invalid amount', true);
      
      await api.post('/api/admin/crm/wallet/adjust', {
        customer_id: parseInt(walletAdjustForm.customer_id),
        amount,
        type: walletAdjustForm.type,
        description: walletAdjustForm.description || 'Admin adjustment'
      });
      notify('Wallet balance adjusted successfully!');
      setWalletAdjustForm({ customer_id: '', amount: '', type: 'CREDIT', description: '' });
      setCrmModal(null);
      fetchAll();
    } catch (e: any) {
      notify('Failed to adjust wallet balance', true);
    }
  };

  const createTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/tickets/admin/create', {
        customer_id: parseInt(ticketForm.customer_id),
        type: ticketForm.type,
        description: ticketForm.description,
      });
      setTickets(prev => [res.data, ...prev]);
      setTicketForm({ customer_id: '', type: 'SIM Activation Issue', description: '' });
      setTicketModal(null);
      notify('Ticket created!');
    } catch (err: any) {
      notify(err.response?.data?.detail || 'Failed to create ticket', true);
    }
  };

  const resolveTicket = async (id: string | number) => {
    try {
      await api.post('/tickets/admin/resolve', {
        ticket_id: typeof id === 'number' ? id : parseInt(id),
      });
      setTickets(prev => prev.map(t => t.id === id ? { ...t, status: 'Resolved' } : t));
      notify('Ticket marked as resolved!');
    } catch (err: any) {
      notify(err.response?.data?.detail || 'Failed to resolve ticket', true);
    }
  };

  const allowedRoles = ['SUPPORT_AGENT', 'OPERATIONS_ADMIN', 'SUPER_ADMIN', 'admin'];
  const isAuthorized = user && (allowedRoles.map(r => r.toUpperCase()).includes(user.role.toUpperCase()) || user.role.toUpperCase() === 'ADMIN');

  if (!user || !isAuthorized) {
    return (
      <AdminLogin
        portalName="CRM"
        themeClass="theme-portal-green"
        allowedRoles={allowedRoles}
        onLoginSuccess={checkAuth}
      />
    );
  }

  const openTickets = tickets.filter(t => t.status === 'Open').length;

  return (
    <div className="theme-portal-green min-h-screen bg-brand-bg text-brand-text flex flex-col font-sans">
      <Navbar />

      <div className="max-w-7xl w-full mx-auto px-4 py-8 flex-grow grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Sidebar Navigation */}
        <aside className="lg:col-span-1 border-4 border-brand-primary bg-white p-6 neo-brutal-shadow flex flex-col justify-between">
          <div className="space-y-6">
            <h3 className="font-headline font-black uppercase text-lg text-brand-primary border-b-2 border-brand-primary pb-2">
              CRM Portal
            </h3>
            
            <nav className="flex flex-col gap-2">
              {[
                { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
                { id: 'customers', label: 'Customers', icon: Users },
                { id: 'tickets', label: 'Support Tickets', icon: TicketCheck },
                { id: 'wallets', label: 'Wallet Manager', icon: CreditCard },
                { id: 'orders', label: 'Order History', icon: ShoppingBag }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => { setActiveTab(t.id as TabId); setErrorMsg(''); setSuccessMsg(''); }}
                  className={`w-full text-left p-3 border-2 border-brand-primary font-headline text-xs font-black uppercase flex items-center gap-2 cursor-pointer transition-all ${
                    activeTab === t.id 
                      ? 'bg-brand-primary-container text-brand-primary neo-brutal-shadow-xs translate-x-0.5 translate-y-0.5' 
                      : 'bg-white hover:bg-brand-surface-low'
                  }`}
                >
                  <t.icon className="w-4 h-4" />
                  <span>{t.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Workspace Content */}
        <main className="lg:col-span-3 space-y-6">
          {errorMsg && (
            <div className="p-4 border-4 border-brand-primary bg-red-100 text-red-800 font-headline font-black text-xs uppercase">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-4 border-4 border-brand-primary bg-green-100 text-green-800 font-headline font-black text-xs uppercase">
              {successMsg}
            </div>
          )}

          {/* Tab 1: Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard label="Total Customers" value={users.length} sub="Registered users" accent />
                <MetricCard label="Active Support Tickets" value={openTickets} sub={`${tickets.length} total tickets`} />
                <MetricCard label="Total Orders Processed" value={orders.length} sub="Confirmed transactions" accent />
              </div>
              <div className="border-4 border-brand-primary bg-white p-6 neo-brutal-shadow">
                <SectionHeader title="Staff Quick Actions" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Btn variant="primary" size="md" className="justify-center py-4" onClick={() => setActiveTab('customers')}>
                    <Search className="w-4 h-4" /> Search Customer Directory
                  </Btn>
                  <Btn variant="outline" size="md" className="justify-center py-4" onClick={() => setTicketModal('add')}>
                    <Plus className="w-4 h-4" /> Create Support Ticket
                  </Btn>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Customers */}
          {activeTab === 'customers' && (
            <div className="border-4 border-brand-primary bg-white p-6 neo-brutal-shadow space-y-4">
              <SectionHeader title={`Customer Directory (${users.length})`} />
              
              <div className="flex flex-wrap gap-3">
                <select
                  value={customerSearchType}
                  onChange={e => setCustomerSearchType(e.target.value as any)}
                  className="border-2 border-brand-primary py-2 px-3 text-xs font-headline font-bold uppercase bg-white outline-none"
                >
                  <option value="general">General</option>
                  <option value="name">Name</option>
                  <option value="email">Email</option>
                  <option value="msisdn">Mobile No</option>
                </select>
                <input
                  type="text"
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  placeholder={`Search customer directory...`}
                  className="border-2 border-brand-primary py-2 px-3 text-xs flex-1 min-w-[200px] outline-none"
                  onKeyDown={e => e.key === 'Enter' && searchCrmCustomers()}
                />
                <Btn variant="primary" size="md" onClick={searchCrmCustomers}>
                  <Search className="w-4 h-4" /> Search
                </Btn>
              </div>

              <div className="border-2 border-brand-primary divide-y-2 divide-brand-primary">
                {users.length === 0 ? (
                  <p className="p-8 text-center font-headline font-black uppercase text-slate-400">No customers found.</p>
                ) : (
                  users.map(u => (
                    <div key={u.id} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-headline font-black text-brand-primary text-sm uppercase">{u.name}</p>
                          <StatusBadge status={u.role} />
                          <StatusBadge status={u.is_active ? 'active' : 'inactive'} />
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono">{u.email} · {u.mobile || 'No Mobile'}</p>
                        <p className="text-[9px] text-slate-400 font-mono">Joined: {new Date(u.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <Btn variant="outline" size="sm" onClick={() => fetchCrmCustomerProfile(u.id)}>
                          <Eye className="w-3.5 h-3.5" /> View Profile
                        </Btn>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Tickets */}
          {activeTab === 'tickets' && (
            <div className="border-4 border-brand-primary bg-white p-6 neo-brutal-shadow space-y-4">
              <SectionHeader title={`Support Tickets (${tickets.length})`}
                action={<Btn variant="primary" onClick={() => setTicketModal('add')}><Plus className="w-3.5 h-3.5" />New Ticket</Btn>} />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <MetricCard label="Open" value={openTickets} accent />
                <MetricCard label="Resolved" value={tickets.filter(t => t.status === 'Resolved').length} />
              </div>

              {tickets.length === 0 ? (
                <div className="p-12 text-center border-4 border-brand-primary border-dashed bg-brand-surface-low">
                  <TicketCheck className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="font-headline font-black uppercase text-slate-400 text-sm">No support tickets found.</p>
                </div>
              ) : (
                <div className="divide-y-2 divide-brand-primary border-2 border-brand-primary">
                  {tickets.map(t => (
                    <div key={t.id} className="p-4 flex justify-between items-start bg-white">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-bold text-slate-400">{t.id}</span>
                          <span className="text-[10px] font-bold font-sans text-slate-500">Customer #{t.customer_id}</span>
                          <StatusBadge status={t.status} />
                        </div>
                        <p className="font-headline font-black text-sm uppercase mb-1">{t.type}</p>
                        <p className="text-xs text-slate-600 font-sans max-w-md">{t.description}</p>
                      </div>
                      {t.status === 'Open' && (
                        <Btn variant="success" size="sm" onClick={() => resolveTicket(t.id)}>Resolve</Btn>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Wallets */}
          {activeTab === 'wallets' && (
            <div className="border-4 border-brand-primary bg-white p-6 neo-brutal-shadow space-y-4">
              <SectionHeader title="Wallet Balance Administration" />
              <form onSubmit={adjustWallet} className="space-y-4 max-w-md">
                <InputField label="Customer ID *" required type="number" value={walletAdjustForm.customer_id}
                  onChange={(e: any) => setWalletAdjustForm({ ...walletAdjustForm, customer_id: e.target.value })} placeholder="e.g. 1" />
                <div className="grid grid-cols-2 gap-4">
                  <InputField label="Adjustment Amount (INR) *" required type="number" step="0.01" value={walletAdjustForm.amount}
                    onChange={(e: any) => setWalletAdjustForm({ ...walletAdjustForm, amount: e.target.value })} placeholder="e.g. 500.00" />
                  <InputField label="Adjustment Type *" type="select" value={walletAdjustForm.type}
                    onChange={(e: any) => setWalletAdjustForm({ ...walletAdjustForm, type: e.target.value })}>
                    <option value="CREDIT">Add Funds (+)</option>
                    <option value="DEBIT">Deduct Funds (-)</option>
                  </InputField>
                </div>
                <InputField label="Reason / Description *" required value={walletAdjustForm.description}
                  onChange={(e: any) => setWalletAdjustForm({ ...walletAdjustForm, description: e.target.value })} placeholder="Topup via manual support channel" />
                
                <Btn variant="primary" size="lg" className="w-full justify-center">
                  Adjust Wallet Balance
                </Btn>
              </form>
            </div>
          )}

          {/* Tab 5: Orders */}
          {activeTab === 'orders' && (
            <div className="border-4 border-brand-primary bg-white p-6 neo-brutal-shadow space-y-4">
              <SectionHeader title={`Transactions History (${orders.length})`} />
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b-2 border-brand-primary bg-slate-50 font-headline uppercase text-[10px]">
                      <th className="p-3">Order ID</th>
                      <th className="p-3">User ID</th>
                      <th className="p-3">MSISDN</th>
                      <th className="p-3">Total Amount</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id} className="border-b border-brand-primary hover:bg-brand-surface-low">
                        <td className="p-3 font-mono font-bold text-slate-400">{o.id}</td>
                        <td className="p-3 font-mono">#{o.user_id}</td>
                        <td className="p-3 font-mono font-bold text-brand-secondary">{o.msisdn || '—'}</td>
                        <td className="p-3 font-bold">{o.total_amount} INR</td>
                        <td className="p-3"><StatusBadge status={o.status} /></td>
                        <td className="p-3 font-sans text-slate-500">{new Date(o.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* CRM Profile Details Modal */}
      {crmModal === 'profile' && selectedCrmProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border-4 border-brand-primary neo-brutal-shadow w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b-4 border-brand-primary bg-brand-primary-container">
              <div>
                <h3 className="font-headline font-black uppercase text-lg text-brand-primary">
                  Customer Profile: {selectedCrmProfile.basic_info.name}
                </h3>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {selectedCrmProfile.basic_info.id} · Email: {selectedCrmProfile.basic_info.email}</p>
              </div>
              <button onClick={() => setCrmModal(null)} className="border-2 border-brand-primary p-1 hover:bg-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Profile Top Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="border-2 border-brand-primary p-3 bg-slate-50">
                  <p className="text-[9px] font-headline font-black text-slate-400 uppercase">Profile Status</p>
                  <p className="text-md font-headline font-black text-brand-primary uppercase mt-1">
                    {selectedCrmProfile.basic_info.profile_status || 'ACTIVE'}
                  </p>
                </div>
                <div className="border-2 border-brand-primary p-3 bg-slate-50">
                  <p className="text-[9px] font-headline font-black text-slate-400 uppercase">Mobile No</p>
                  <p className="text-md font-headline font-black text-brand-secondary mt-1">{selectedCrmProfile.basic_info.mobile || '—'}</p>
                </div>
                <div className="border-2 border-brand-primary p-3 bg-slate-50">
                  <p className="text-[9px] font-headline font-black text-slate-400 uppercase">Wallet Balance</p>
                  <p className="text-md font-headline font-black text-brand-secondary mt-1">
                    ৳{formatPrice(selectedCrmProfile.wallet_info?.balance || 0)}
                  </p>
                </div>
                <div className="border-2 border-brand-primary p-3 bg-slate-50">
                  <p className="text-[9px] font-headline font-black text-slate-400 uppercase">Total Orders</p>
                  <p className="text-md font-headline font-black text-brand-secondary mt-1">
                    {selectedCrmProfile.order_info?.length || 0}
                  </p>
                </div>
              </div>

              {/* Grid sections for details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Basic Info & Edit */}
                <div className="border-2 border-brand-primary p-4 space-y-3 bg-white">
                  <div className="flex justify-between items-center border-b border-brand-primary pb-2">
                    <h4 className="font-headline font-black uppercase text-xs text-brand-primary">Basic Information</h4>
                    <Btn variant="primary" size="sm" onClick={() => setCrmModal('edit')}>Edit Info</Btn>
                  </div>
                  <div className="text-xs space-y-2 font-sans">
                    <p><strong>Name:</strong> {selectedCrmProfile.basic_info.name}</p>
                    <p><strong>Email:</strong> {selectedCrmProfile.basic_info.email}</p>
                    <p><strong>Mobile:</strong> {selectedCrmProfile.basic_info.mobile || '—'}</p>
                    <p><strong>Address:</strong> {selectedCrmProfile.basic_info.address || '—'}</p>
                    <p><strong>Notes:</strong> {selectedCrmProfile.basic_info.notes || '—'}</p>
                    <p><strong>Registered:</strong> {new Date(selectedCrmProfile.basic_info.created_at).toLocaleString()}</p>
                  </div>
                </div>

                {/* SIM Assignment Info */}
                <div className="border-2 border-brand-primary p-4 space-y-3 bg-white">
                  <h4 className="font-headline font-black uppercase text-xs text-brand-primary border-b border-brand-primary pb-2">SIM Cards</h4>
                  <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {selectedCrmProfile.sim_info.length === 0 ? (
                      <p className="text-xs text-slate-400 font-sans p-2">No SIMs assigned to this customer.</p>
                    ) : (
                      selectedCrmProfile.sim_info.map((sim: any, idx: number) => (
                        <div key={idx} className="py-2 text-xs font-sans space-y-1">
                          <p><strong>MSISDN:</strong> <span className="font-mono">{sim.msisdn}</span></p>
                          <p><strong>ICCID:</strong> <span className="font-mono">{sim.iccid}</span></p>
                          <p><strong>IMSI:</strong> <span className="font-mono">{sim.imsi || '—'}</span></p>
                          <p><strong>Status:</strong> <StatusBadge status={sim.status} /></p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Plan Information */}
                <div className="border-2 border-brand-primary p-4 space-y-3 bg-white">
                  <h4 className="font-headline font-black uppercase text-xs text-brand-primary border-b border-brand-primary pb-2">Plan History</h4>
                  <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {selectedCrmProfile.plan_info.length === 0 ? (
                      <p className="text-xs text-slate-400 font-sans p-2">No plan history found.</p>
                    ) : (
                      selectedCrmProfile.plan_info.map((plan: any, idx: number) => (
                        <div key={idx} className="py-2 text-xs font-sans flex justify-between items-center">
                          <div>
                            <p className="font-bold">{plan.plan_name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">Expires: {plan.expires_at ? new Date(plan.expires_at).toLocaleDateString() : 'Never'}</p>
                          </div>
                          <StatusBadge status={plan.status} />
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* KYC Identity Verification Section */}
                <div className="border-2 border-brand-primary p-4 space-y-3 bg-white md:col-span-2">
                  <h4 className="font-headline font-black uppercase text-xs text-brand-primary border-b border-brand-primary pb-2">KYC Details & Identity Verification</h4>
                  <div className="text-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 font-sans leading-relaxed">
                    <p><strong>Father's Name:</strong> {selectedCrmProfile.basic_info.father_name || '—'}</p>
                    <p><strong>Date of Birth:</strong> {selectedCrmProfile.basic_info.dob || '—'}</p>
                    <p><strong>Gender:</strong> {selectedCrmProfile.basic_info.gender || '—'}</p>
                    <p><strong>Alternate Mobile:</strong> {selectedCrmProfile.basic_info.alternate_mobile || '—'}</p>
                    <p><strong>ID Document Type:</strong> {selectedCrmProfile.basic_info.id_type || '—'}</p>
                    <p><strong>ID Document Number:</strong> {selectedCrmProfile.basic_info.id_number || '—'}</p>
                    <p><strong>ID Issue Date:</strong> {selectedCrmProfile.basic_info.id_issue_date || '—'}</p>
                    <p><strong>ID Expiry Date:</strong> {selectedCrmProfile.basic_info.id_expiry_date || '—'}</p>
                  </div>
                </div>

                {/* Wallet Transactions */}
                <div className="border-2 border-brand-primary p-4 space-y-3 bg-white md:col-span-2">
                  <h4 className="font-headline font-black uppercase text-xs text-brand-primary border-b border-brand-primary pb-2">Wallet Transactions</h4>
                  <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {!selectedCrmProfile.wallet_info || selectedCrmProfile.wallet_info.transactions.length === 0 ? (
                      <p className="text-xs text-slate-400 font-sans p-2">No transaction history.</p>
                    ) : (
                      selectedCrmProfile.wallet_info.transactions.map((tx: any, idx: number) => (
                        <div key={idx} className="py-2 text-xs font-sans flex justify-between items-center">
                          <div>
                            <p className="font-bold">{tx.description || 'Transaction'}</p>
                            <p className="text-[9px] text-slate-400 font-mono">{new Date(tx.created_at).toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${tx.transaction_type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                              {tx.transaction_type === 'CREDIT' ? '+' : '-'}৳{formatPrice(tx.amount)}
                            </p>
                            <StatusBadge status={tx.status} />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* Order History Table */}
              <div className="border-2 border-brand-primary p-4 space-y-3 bg-white">
                <h4 className="font-headline font-black uppercase text-xs text-brand-primary border-b border-brand-primary pb-2">Order History</h4>
                <div className="overflow-x-auto max-h-60">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b-2 border-brand-primary bg-slate-50 font-headline uppercase text-[10px]">
                        <th className="p-2">Order ID</th>
                        <th className="p-2">Amount</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCrmProfile.order_info.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-slate-400">No orders found for this customer.</td>
                        </tr>
                      ) : (
                        selectedCrmProfile.order_info.map((o: any) => (
                          <tr key={o.id} className="border-b border-brand-primary hover:bg-slate-50">
                            <td className="p-2 font-mono font-bold text-slate-400">{o.id}</td>
                            <td className="p-2 font-bold">{o.total_amount} INR</td>
                            <td className="p-2"><StatusBadge status={o.status} /></td>
                            <td className="p-2 font-sans text-slate-400">{new Date(o.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Edit Basic Info Modal */}
      {crmModal === 'edit' && (
        <Modal title="Edit Customer CRM Profile" onClose={() => setCrmModal('profile')}>
          <form onSubmit={updateCrmCustomer} className="space-y-4">
            <InputField label="Name" required value={crmForm.name} onChange={(e: any) => setCrmForm({ ...crmForm, name: e.target.value })} />
            <InputField label="Email" required type="email" value={crmForm.email} onChange={(e: any) => setCrmForm({ ...crmForm, email: e.target.value })} />
            <InputField label="Mobile" required value={crmForm.mobile} onChange={(e: any) => setCrmForm({ ...crmForm, mobile: e.target.value })} />
            <InputField label="Address" value={crmForm.address} onChange={(e: any) => setCrmForm({ ...crmForm, address: e.target.value })} />
            <InputField label="Notes" value={crmForm.notes} onChange={(e: any) => setCrmForm({ ...crmForm, notes: e.target.value })} />
            
            <div className="pt-2">
              <Btn variant="primary" size="lg" className="w-full justify-center">Save Changes</Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* Support Ticket Modal: Create */}
      {ticketModal === 'add' && (
        <Modal title="Create Support Ticket" onClose={() => setTicketModal(null)}>
          <form onSubmit={createTicket} className="space-y-4">
            <InputField label="Customer ID" type="number" required value={ticketForm.customer_id}
              onChange={(e: any) => setTicketForm({ ...ticketForm, customer_id: e.target.value })} placeholder="e.g. 12" />
            <InputField label="Issue Type" type="select" value={ticketForm.type}
              onChange={(e: any) => setTicketForm({ ...ticketForm, type: e.target.value })}>
              <option value="SIM Activation Issue">SIM Activation Issue</option>
              <option value="Verification Rejected">KYC Validation Rejected</option>
              <option value="Billing / Topup Refund">Billing & Wallet Top-up</option>
              <option value="SIM Card Lost">Replacement SIM Card</option>
              <option value="Other">General Issue</option>
            </InputField>
            <InputField label="Description" type="textarea" required value={ticketForm.description}
              onChange={(e: any) => setTicketForm({ ...ticketForm, description: e.target.value })} placeholder="Describe the issue in detail…" />
            
            <Btn variant="primary" size="lg" className="w-full justify-center">Create Ticket</Btn>
          </form>
        </Modal>
      )}

    </div>
  );
};

const CRMApp: React.FC = () => {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <CRMMainApp />
        </Router>
      </CartProvider>
    </AuthProvider>
  );
};

export default CRMApp;
