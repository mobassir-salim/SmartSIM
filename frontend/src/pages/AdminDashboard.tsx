import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import {
  ShieldAlert, LayoutDashboard, Users, Cpu, CreditCard, ShoppingBag,
  TicketCheck, Activity, BarChart2, ScrollText, BookUser,
  Plus, Trash2, Edit, X, Check, AlertCircle, RefreshCw,
  PowerOff, Power, Search, Eye, Ban, CheckCircle2, Wallet,
  ChevronRight, Server, Loader2, ExternalLink, FileText, Network
} from 'lucide-react';

type TabId =
  | 'overview' | 'customers' | 'sims' | 'sim-inventory' | 'plans'
  | 'wallets' | 'orders' | 'tickets' | 'health'
  | 'monitoring' | 'logs' | 'audit' | 'admin-users' | 'system-tracker';

interface ServiceHealth { name: string; url: string; status: 'UP' | 'DOWN' | 'CHECKING'; }
interface Ticket { id: string; customer_id: number; type: string; description: string; status: string; created_at: string; }

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'overview',    label: 'Dashboard',          icon: LayoutDashboard },
  { id: 'customers',   label: 'Customers',           icon: Users },
  { id: 'sims',        label: 'SIM Management',      icon: Cpu },
  { id: 'sim-inventory', label: 'SIM Inventory', icon: Server },
  { id: 'plans',       label: 'Plan Management',     icon: CreditCard },
  { id: 'wallets',     label: 'Wallet Management',   icon: Wallet },
  { id: 'orders',      label: 'Order Management',    icon: ShoppingBag },
  { id: 'tickets',     label: 'Support Tickets',     icon: TicketCheck },
  { id: 'health',      label: 'Service Health',      icon: Activity },
  { id: 'monitoring',  label: 'Monitoring',          icon: BarChart2 },
  { id: 'logs',        label: 'Centralized Logs',    icon: ScrollText },
  { id: 'audit',       label: 'Audit Logs',          icon: FileText },
  { id: 'admin-users', label: 'Admin Users',         icon: BookUser },
  { id: 'system-tracker', label: 'System Flow Tracker', icon: Network },
];

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
    CHECKING: 'bg-slate-100 text-slate-500 border-slate-300',
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

const formatPrice = (val: any, decimals = 2) => {
  const num = Number(val);
  return isNaN(num) ? '0.00' : num.toFixed(decimals);
};

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role !== 'admin') navigate('/dashboard');
  }, [user, navigate]);

  const location = useLocation();
  const getInitialTab = (): TabId => {
    if (location.pathname.includes('/admin/crm')) return 'customers';
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && TABS.some(t => t.id === tab)) return tab as TabId;
    return 'overview';
  };
  const [activeTab, setActiveTab] = useState<TabId>(getInitialTab());
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');

  const [sims,    setSims]    = useState<any[]>([]);
  const [plans,   setPlans]   = useState<any[]>([]);
  const [users,   setUsers]   = useState<any[]>([]);
  const [orders,  setOrders]  = useState<any[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  const [customerSearch, setCustomerSearch] = useState('');
  const [orderSearch,    setOrderSearch]    = useState('');
  const [simSearch,      setSimSearch]      = useState('');

  const [simModal,    setSimModal]    = useState<'add'|'edit'|null>(null);
  const [planModal,   setPlanModal]   = useState<'add'|'edit'|null>(null);
  const [ticketModal, setTicketModal] = useState<'add'|'view'|null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // SIM Inventory Management state
  const [inventoryStats, setInventoryStats] = useState<any>({ total: 0, available: 0, reserved: 0, activated: 0, blocked: 0, lost: 0 });
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventorySearchType, setInventorySearchType] = useState<'iccid'|'imsi'|'msisdn'|'status'>('iccid');
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState('');
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  const [simForm, setSimForm] = useState({ id: '', name: '', type: 'physical', price: '', description: '', iccid_prefix: '' });
  const [planForm, setPlanForm] = useState({ id: '', name: '', price: '', data_gb: '', validity_days: '', type: 'combo', voice_minutes: '', sms_count: '', description: '' });
  const [ticketForm, setTicketForm] = useState({ customer_id: '', type: 'SIM Activation Issue', description: '' });

  // CRM Management state
  const [customerSearchType, setCustomerSearchType] = useState<'general' | 'msisdn' | 'iccid' | 'imsi' | 'order_id' | 'email' | 'name'>('general');
  const [selectedCrmProfile, setSelectedCrmProfile] = useState<any>(null);
  const [crmModal, setCrmModal] = useState<'profile' | 'edit' | null>(null);
  const [crmForm, setCrmForm] = useState<any>({
    customer_id: 0,
    name: '',
    email: '',
    mobile: '',
    address: '',
    notes: '',
    status: 'ACTIVE'
  });

  // OMS & Journey state
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any>(null);
  const [orderJourneyModal, setOrderJourneyModal] = useState(false);
  const [retryLoading, setRetryLoading] = useState(false);

  // System Flow Tracker state
  const [trackerLogs, setTrackerLogs] = useState<any[]>([]);
  const [trackerSearchOrderId, setTrackerSearchOrderId] = useState('');
  const [trackerSearchCustomerId, setTrackerSearchCustomerId] = useState('');
  const [trackerSearchMsisdn, setTrackerSearchMsisdn] = useState('');
  const [trackerSearchServiceName, setTrackerSearchServiceName] = useState('');
  const [trackerLoading, setTrackerLoading] = useState(false);

  const fetchTrackerLogs = useCallback(async () => {
    setTrackerLoading(true);
    try {
      const params: any = {};
      if (trackerSearchOrderId) params.order_id = trackerSearchOrderId;
      if (trackerSearchCustomerId) params.customer_id = trackerSearchCustomerId;
      if (trackerSearchMsisdn) params.msisdn = trackerSearchMsisdn;
      if (trackerSearchServiceName) params.service_name = trackerSearchServiceName;

      const res = await api.get('/admin/orders/system-tracker', { params });
      setTrackerLogs(res.data);
    } catch (err: any) {
      console.error(err);
      notify(err.response?.data?.detail || 'Failed to fetch service execution logs.', true);
    } finally {
      setTrackerLoading(false);
    }
  }, [trackerSearchOrderId, trackerSearchCustomerId, trackerSearchMsisdn, trackerSearchServiceName]);

  const [serviceHealth, setServiceHealth] = useState<ServiceHealth[]>([
    { name: 'Auth Service',         url: '/auth/health',          status: 'CHECKING' },
    { name: 'SIM Service',          url: '/sims/health',          status: 'CHECKING' },
    { name: 'Plan Service',         url: '/plans/health',         status: 'CHECKING' },
    { name: 'Wallet Service',       url: '/wallet/health',        status: 'CHECKING' },
    { name: 'Order Service',        url: '/orders/health',        status: 'CHECKING' },
    { name: 'Notification Service', url: '/notifications/health', status: 'CHECKING' },
  ]);

  const notify = (msg: string, isError = false) => {
    if (isError) { setError(msg); setSuccess(''); }
    else         { setSuccess(msg); setError(''); }
    setTimeout(() => { setError(''); setSuccess(''); }, 4000);
  };

  const fetchAll = useCallback(async () => {
    try {
      const [simsR, plansR, usersR, ordersR] = await Promise.allSettled([
        api.get('/sims?include_inactive=true'),
        api.get('/plans'),
        api.get('/auth/users'),
        api.get('/admin/orders'),
      ]);
      if (simsR.status   === 'fulfilled') setSims(simsR.value.data || []);
      if (plansR.status  === 'fulfilled') setPlans(plansR.value.data || []);
      if (usersR.status  === 'fulfilled') setUsers(usersR.value.data || []);
      if (ordersR.status === 'fulfilled') setOrders(ordersR.value.data?.orders || ordersR.value.data || []);
    } catch (e: any) {
      notify(e.response?.data?.detail || 'Error loading data', true);
    }
  }, []);

  const fetchInventoryStats = useCallback(async () => {
    try {
      const res = await api.get('/admin/inventory');
      setInventoryStats(res.data);
    } catch (e: any) {
      console.error('Failed to fetch inventory stats:', e);
    }
  }, []);

  const searchInventory = async () => {
    try {
      const params: any = { limit: 100 };
      if (inventorySearch) {
        params[inventorySearchType] = inventorySearch;
      }
      if (inventoryStatusFilter) {
        params.status = inventoryStatusFilter;
      }
      const res = await api.get('/admin/inventory/search', { params });
      setInventoryItems(res.data);
    } catch (e: any) {
      notify(e.response?.data?.detail || 'Search failed', true);
    }
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadLoading(true);
    setUploadResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/admin/inventory/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadResult(res.data);
      notify(`Uploaded ${res.data.uploaded} SIM records successfully!`);
      fetchInventoryStats();
      searchInventory();
    } catch (e: any) {
      notify(e.response?.data?.detail || 'Upload failed', true);
    } finally {
      setUploadLoading(false);
      e.target.value = '';
    }
  };

  const assignSim = async (inventoryId: number, customerId: number) => {
    try {
      await api.post('/admin/inventory/assign', {
        inventory_id: inventoryId,
        customer_id: customerId
      });
      notify('SIM assigned successfully!');
      searchInventory();
      fetchInventoryStats();
    } catch (e: any) {
      notify(e.response?.data?.detail || 'Assignment failed', true);
    }
  };

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
      setUsers(res.data);
    } catch (e: any) {
      notify(e.response?.data?.detail || 'CRM search failed', true);
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
      notify(e.response?.data?.detail || 'Failed to fetch customer profile', true);
    }
  };

  const updateCrmCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put('/admin/crm/customer', crmForm);
      notify('Customer CRM profile updated successfully!');
      setCrmModal('profile'); // Go back to profile view
      fetchCrmCustomerProfile(crmForm.customer_id);
      searchCrmCustomers(); // Refresh list
    } catch (e: any) {
      notify(e.response?.data?.detail || 'Failed to update customer', true);
    }
  };

  const fetchOrderJourneyDetails = async (orderId: string) => {
    try {
      const res = await api.get(`/admin/orders/${orderId}`);
      setSelectedOrderDetails(res.data);
      setOrderJourneyModal(true);
    } catch (e: any) {
      notify(e.response?.data?.detail || 'Failed to fetch order details', true);
    }
  };

  const handleRetryOrder = async (orderId: string) => {
    setRetryLoading(true);
    try {
      await api.post('/admin/orders/retry', { order_id: orderId });
      notify('Order retried and completed successfully!');
      fetchOrderJourneyDetails(orderId);
      fetchAll();
    } catch (e: any) {
      notify(e.response?.data?.detail || 'Retry failed', true);
      fetchOrderJourneyDetails(orderId);
      fetchAll();
    } finally {
      setRetryLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      await api.post('/admin/orders/cancel', { order_id: orderId });
      notify('Order cancelled successfully!');
      fetchOrderJourneyDetails(orderId);
      fetchAll();
    } catch (e: any) {
      notify(e.response?.data?.detail || 'Failed to cancel order', true);
    }
  };

  useEffect(() => { fetchAll(); fetchInventoryStats(); }, [fetchAll, fetchInventoryStats]);

  const checkHealth = useCallback(async () => {
    setServiceHealth(prev => prev.map(s => ({ ...s, status: 'CHECKING' as const })));
    const endpoints = [
      '/auth/health',
      '/sims/health',
      '/plans/health',
      '/wallet/health',
      '/orders/health',
      '/notifications/health'
    ];
    const results = await Promise.allSettled(
      endpoints.map(url => api.get(url))
    );
    setServiceHealth(prev => prev.map((s, i) => ({
      ...s,
      status: results[i].status === 'fulfilled' ? 'UP' as const : 'DOWN' as const,
    })));
  }, []);

  useEffect(() => {
    if (activeTab === 'health') checkHealth();
    if (activeTab === 'system-tracker') fetchTrackerLogs();
  }, [activeTab, fetchTrackerLogs]);

  const saveSim = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name: simForm.name, type: simForm.type, price: parseFloat(simForm.price), description: simForm.description || null, iccid_prefix: simForm.iccid_prefix };
    try {
      if (simModal === 'edit') { await api.put(`/sims/${simForm.id}`, payload); notify('SIM updated!'); }
      else                     { await api.post('/sims', payload); notify('SIM created and inventory seeded!'); }
      setSimModal(null); fetchAll();
    } catch (e: any) { notify(e.response?.data?.detail || 'Failed to save SIM', true); }
  };

  const deleteSim = async (id: number) => {
    if (!window.confirm('Delete this SIM and all its inventory?')) return;
    try { await api.delete(`/sims/${id}`); notify('SIM deleted.'); fetchAll(); }
    catch (e: any) { notify(e.response?.data?.detail || 'Failed to delete', true); }
  };

  const toggleSim = async (sim: any) => {
    const ep = sim.is_active ? `/sims/${sim.id}/deactivate` : `/sims/${sim.id}/activate`;
    try { await api.post(ep); notify(`SIM ${sim.is_active ? 'deactivated' : 'activated'}.`); fetchAll(); }
    catch (e: any) { notify(e.response?.data?.detail || 'Failed', true); }
  };

  const savePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: planForm.name, price: parseFloat(planForm.price),
      data_gb: parseFloat(planForm.data_gb) || 0,
      validity_days: parseInt(planForm.validity_days),
      voice_minutes: parseInt(planForm.voice_minutes) || 0,
      sms_count: parseInt(planForm.sms_count) || 0,
      type: planForm.type, description: planForm.description || null,
    };
    try {
      if (planModal === 'edit') { await api.put(`/plans/${planForm.id}`, payload); notify('Plan updated!'); }
      else                      { await api.post('/plans', payload); notify('Plan created!'); }
      setPlanModal(null); fetchAll();
    } catch (e: any) { notify(e.response?.data?.detail || 'Failed to save plan', true); }
  };

  const deletePlan = async (id: number) => {
    if (!window.confirm('Delete this plan?')) return;
    try { await api.delete(`/plans/${id}`); notify('Plan deleted.'); fetchAll(); }
    catch (e: any) { notify(e.response?.data?.detail || 'Failed', true); }
  };

  const createTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const t: Ticket = {
      id: `TKT-${Date.now()}`, customer_id: parseInt(ticketForm.customer_id),
      type: ticketForm.type, description: ticketForm.description,
      status: 'Open', created_at: new Date().toISOString(),
    };
    setTickets(prev => [t, ...prev]);
    setTicketForm({ customer_id: '', type: 'SIM Activation Issue', description: '' });
    setTicketModal(null);
    notify('Ticket created!');
  };

  const resolveTicket = (id: string) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: 'Resolved' } : t));
    notify('Ticket resolved!');
  };

  const totalRevenue = orders.filter((o:any) => o.status === 'CONFIRMED').reduce((s: number, o: any) => s + (Number(o.total_amount) || 0), 0);
  const failedOrders = orders.filter((o:any) => o.status === 'FAILED').length;
  const activeSims   = sims.filter((s:any) => s.is_active).length;
  const activeUsers  = users.filter((u:any) => u.is_active).length;
  const openTickets  = tickets.filter(t => t.status === 'Open').length;

  const filteredOrders = orders.filter((o:any) =>
    !orderSearch || o.id?.includes(orderSearch) || String(o.user_id)?.includes(orderSearch)
  );
  const filteredSims = sims.filter((s:any) =>
    !simSearch ||
    s.name?.toLowerCase().includes(simSearch.toLowerCase()) ||
    s.type?.toLowerCase().includes(simSearch.toLowerCase())
  );

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="border-4 border-brand-primary p-8 bg-brand-primary-container font-headline font-black uppercase text-xl neo-brutal-shadow flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin" /> Verifying administrator permissions...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col font-sans">
      <Navbar />
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full">

        {/* Header */}
        <div className="mb-8 border-4 border-brand-primary bg-brand-primary-container p-6 neo-brutal-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-brand-secondary border-b-4 border-l-4 border-brand-primary opacity-80" />
          <div className="absolute top-0 right-20 w-12 h-12 bg-brand-tertiary border-b-4 border-l-4 border-brand-primary opacity-40" />
          <h1 className="text-3xl font-headline font-black text-brand-primary uppercase flex items-center gap-3 mb-1">
            <ShieldAlert className="w-8 h-8" /> SmartSIM Admin Portal
          </h1>
          <p className="text-sm font-sans text-brand-primary/70 font-semibold">
            Centralized Operations &amp; Management Console — Logged in as <strong>{user.name}</strong>
          </p>
        </div>

        {error   && <div className="mb-4 p-4 border-4 border-red-500 bg-red-50 font-headline font-black text-sm uppercase flex items-center gap-3 text-red-700"><AlertCircle className="w-5 h-5 shrink-0" />{error}</div>}
        {success && <div className="mb-4 p-4 border-4 border-green-500 bg-green-50 font-headline font-black text-sm uppercase flex items-center gap-3 text-green-700"><Check className="w-5 h-5 shrink-0" />{success}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Sidebar */}
          <nav className="lg:col-span-1 flex flex-col gap-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id}
                onClick={() => { setActiveTab(id); setError(''); setSuccess(''); }}
                className={`w-full text-left px-3 py-3 border-2 font-headline font-black text-[10px] uppercase tracking-wide flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === id
                    ? 'bg-brand-primary text-white border-brand-primary neo-brutal-shadow-sm'
                    : 'bg-white text-brand-primary border-brand-primary hover:bg-brand-surface-low'
                }`}>
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{label}</span>
                {id === 'tickets' && openTickets > 0 && <span className="ml-auto bg-brand-secondary text-white text-[8px] px-1.5 py-0.5 rounded-full">{openTickets}</span>}
              </button>
            ))}
          </nav>

          {/* Content */}
          <main className="lg:col-span-4 min-h-[600px]">

            {/* MODULE 1: Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard label="Total Customers" value={users.length} sub={`${activeUsers} active`} accent />
                  <MetricCard label="Total Orders" value={orders.length} sub={`${failedOrders} failed`} />
                  <MetricCard label="Total Revenue" value={`৳${formatPrice(totalRevenue, 0)}`} sub="Confirmed orders" accent />
                  <MetricCard label="Active SIMs" value={activeSims} sub={`of ${sims.length} total`} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard label="SIM Units Available" value={sims.reduce((s:number, sim:any) => s + (sim.available_stock || 0), 0)} sub="Across all packages" accent />
                  <MetricCard label="Total Plans" value={plans.length} sub="In catalog" />
                  <MetricCard label="Open Tickets" value={openTickets} sub={`${tickets.length} total`} accent />
                  <MetricCard label="Failed Orders" value={failedOrders} sub="Require attention" />
                </div>

                <div className="border-4 border-brand-primary bg-white p-6 neo-brutal-shadow">
                  <SectionHeader title="Quick Actions" />
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { label: 'Add SIM Package',    fn: () => { setActiveTab('sims'); setSimModal('add'); } },
                      { label: 'Add Plan',           fn: () => { setActiveTab('plans'); setPlanModal('add'); } },
                      { label: 'New Support Ticket', fn: () => { setActiveTab('tickets'); setTicketModal('add'); } },
                      { label: 'Check Service Health',fn: () => setActiveTab('health') },
                      { label: 'View All Orders',    fn: () => setActiveTab('orders') },
                      { label: 'Browse Customers',   fn: () => setActiveTab('customers') },
                    ].map(qa => (
                      <button key={qa.label} onClick={qa.fn}
                        className="border-2 border-brand-primary p-3 text-left font-headline font-black text-[10px] uppercase hover:bg-brand-primary-container transition-all cursor-pointer flex items-center gap-2 text-brand-primary">
                        <ChevronRight className="w-3 h-3" />{qa.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-4 border-brand-primary bg-white p-6 neo-brutal-shadow">
                  <SectionHeader title="Recent Orders" action={<Btn variant="outline" onClick={() => setActiveTab('orders')}>View All</Btn>} />
                  <div className="divide-y-2 divide-brand-primary border-2 border-brand-primary">
                    {orders.slice(0, 5).map((o: any) => (
                      <div key={o.id} className="flex items-center justify-between p-3 text-xs">
                        <div>
                          <p className="font-headline font-black text-brand-primary">#{o.id?.slice(0,8)}</p>
                          <p className="text-slate-400 text-[10px] font-mono">User {o.user_id} · {new Date(o.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <span className="font-headline font-black text-brand-secondary">৳{formatPrice(o.total_amount)}</span>
                          <StatusBadge status={o.status} />
                        </div>
                      </div>
                    ))}
                    {orders.length === 0 && <p className="p-4 text-center text-sm font-headline font-black uppercase text-slate-400">No orders yet.</p>}
                  </div>
                </div>
              </div>
            )}

            {/* MODULE 2: Customer Management */}
            {activeTab === 'customers' && (
              <div className="border-4 border-brand-primary bg-white p-6 neo-brutal-shadow space-y-4">
                <SectionHeader title={`Customers (${users.length})`}
                  action={<Btn variant="outline" onClick={fetchAll}><RefreshCw className="w-3 h-3" />Refresh</Btn>} />
                <div className="flex flex-wrap gap-3">
                  <select
                    value={customerSearchType}
                    onChange={(e: any) => setCustomerSearchType(e.target.value as any)}
                    className="border-2 border-brand-primary py-1.5 px-3 text-xs font-headline font-bold uppercase bg-white"
                  >
                    <option value="general">General</option>
                    <option value="name">Name</option>
                    <option value="email">Email</option>
                    <option value="msisdn">MSISDN</option>
                    <option value="iccid">ICCID</option>
                    <option value="imsi">IMSI</option>
                    <option value="order_id">Order ID</option>
                  </select>
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                    placeholder={`Search by ${customerSearchType.toUpperCase()}...`}
                    className="border-2 border-brand-primary py-1.5 px-3 text-xs font-sans flex-1 min-w-[200px]"
                    onKeyDown={e => e.key === 'Enter' && searchCrmCustomers()}
                  />
                  <Btn variant="primary" size="sm" onClick={searchCrmCustomers}>
                    <Search className="w-3 h-3" /> Search
                  </Btn>
                </div>
                <div className="border-2 border-brand-primary divide-y-2 divide-brand-primary">
                  {users.length === 0
                    ? <p className="p-8 text-center font-headline font-black uppercase text-slate-400">No customers found.</p>
                    : users.map((u: any) => (
                      <div key={u.id} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-headline font-black text-brand-primary text-sm uppercase">{u.name}</p>
                            <StatusBadge status={u.role} />
                            <StatusBadge status={u.is_active ? 'active' : 'inactive'} />
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono">{u.email} · {u.mobile}</p>
                          <p className="text-[9px] text-slate-400 font-mono">ID: {u.id} · Joined: {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Btn variant="outline" size="sm" onClick={() => fetchCrmCustomerProfile(u.id)}><Eye className="w-3 h-3" />Profile</Btn>
                          {u.is_active
                            ? <Btn variant="danger"  size="sm"><Ban className="w-3 h-3" />Suspend</Btn>
                            : <Btn variant="success" size="sm"><CheckCircle2 className="w-3 h-3" />Activate</Btn>
                          }
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* MODULE 3: SIM Management */}
            {activeTab === 'sims' && (
              <div className="border-4 border-brand-primary bg-white p-6 neo-brutal-shadow space-y-4">
                <SectionHeader title={`SIM Inventory (${filteredSims.length})`}
                  action={
                    <div className="flex gap-2">
                      <Btn variant="outline" onClick={fetchAll}><RefreshCw className="w-3 h-3" />Refresh</Btn>
                      <Btn variant="primary" onClick={() => { setSimForm({ id:'', name:'', type:'physical', price:'', description:'', iccid_prefix:'' }); setSimModal('add'); }}>
                        <Plus className="w-3 h-3" />Add SIM
                      </Btn>
                    </div>
                  } />
                <div className="border-2 border-brand-primary flex items-center px-3 gap-2">
                  <Search className="w-4 h-4 text-brand-primary" />
                  <input type="text" placeholder="Search by name or type…" value={simSearch} onChange={e => setSimSearch(e.target.value)}
                    className="flex-1 py-2 font-headline font-semibold text-sm outline-none" />
                </div>
                <div className="border-2 border-brand-primary divide-y-2 divide-brand-primary">
                  {filteredSims.length === 0
                    ? <p className="p-8 text-center font-headline font-black uppercase text-slate-400">No SIM packages found.</p>
                    : filteredSims.map((sim: any) => (
                      <div key={sim.id} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-headline font-black text-brand-primary text-sm uppercase">{sim.name}</p>
                            <StatusBadge status={sim.type} />
                            <StatusBadge status={sim.is_active ? 'active' : 'inactive'} />
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono">
                            Prefix: {sim.iccid_prefix} · ৳{formatPrice(sim.price)} · Stock: {sim.available_stock ?? '—'} available
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Btn variant="outline" size="sm" onClick={() => {
                            setSimForm({ id:String(sim.id), name:sim.name, type:sim.type, price:String(sim.price), description:sim.description||'', iccid_prefix:sim.iccid_prefix });
                            setSimModal('edit');
                          }}><Edit className="w-3 h-3" />Edit</Btn>
                          {sim.is_active
                            ? <Btn variant="warning" size="sm" onClick={() => toggleSim(sim)}><PowerOff className="w-3 h-3" />Deactivate</Btn>
                            : <Btn variant="success" size="sm" onClick={() => toggleSim(sim)}><Power className="w-3 h-3" />Activate</Btn>
                          }
                          <Btn variant="danger" size="sm" onClick={() => deleteSim(sim.id)}><Trash2 className="w-3 h-3" /></Btn>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* MODULE: SIM Inventory Management */}
            {activeTab === 'sim-inventory' && (
              <div>
                <SectionHeader title="SIM Inventory Management" action={
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer">
                      <input type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} disabled={uploadLoading} />
                      <Btn variant="primary" size="md" disabled={uploadLoading}>
                        {uploadLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                        {uploadLoading ? 'Uploading...' : 'Upload CSV'}
                      </Btn>
                    </label>
                    <Btn variant="outline" size="md" onClick={() => { searchInventory(); fetchInventoryStats(); }}>
                      <RefreshCw className="w-3 h-3" /> Refresh
                    </Btn>
                  </div>
                } />

                {/* Inventory Dashboard Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                  <MetricCard label="Total SIMs" value={inventoryStats.total} />
                  <MetricCard label="Available" value={inventoryStats.available} accent />
                  <MetricCard label="Reserved" value={inventoryStats.reserved} />
                  <MetricCard label="Activated" value={inventoryStats.activated} />
                  <MetricCard label="Blocked" value={inventoryStats.blocked} />
                  <MetricCard label="Lost" value={inventoryStats.lost} />
                </div>

                {/* Upload Result */}
                {uploadResult && (
                  <div className="border-4 border-brand-primary bg-brand-primary-container p-4 mb-6 neo-brutal-shadow-sm">
                    <p className="font-headline font-black text-sm uppercase text-brand-primary">Upload Result</p>
                    <p className="text-xs font-sans mt-1">✅ Uploaded: {uploadResult.uploaded} | ⚠️ Duplicates: {uploadResult.duplicates} | ❌ Errors: {uploadResult.errors}</p>
                  </div>
                )}

                {/* CSV Format Info */}
                <div className="border-2 border-dashed border-brand-primary bg-white p-4 mb-6">
                  <p className="font-headline font-black text-xs uppercase text-brand-primary mb-1">CSV Format</p>
                  <code className="text-xs font-mono text-slate-600">ICCID,IMSI,SIM_TYPE,CIRCLE</code>
                  <p className="text-[10px] font-sans text-slate-400 mt-1">Example: 899100000000001,404450001001001,PREPAID,DELHI</p>
                </div>

                {/* Search Section */}
                <div className="flex flex-wrap gap-3 mb-6">
                  <select
                    value={inventorySearchType}
                    onChange={e => setInventorySearchType(e.target.value as any)}
                    className="border-2 border-brand-primary py-1.5 px-3 text-xs font-headline font-bold uppercase bg-white"
                  >
                    <option value="iccid">ICCID</option>
                    <option value="imsi">IMSI</option>
                    <option value="msisdn">MSISDN</option>
                    <option value="status">Status</option>
                  </select>
                  <input
                    type="text"
                    value={inventorySearch}
                    onChange={e => setInventorySearch(e.target.value)}
                    placeholder={`Search by ${inventorySearchType.toUpperCase()}...`}
                    className="border-2 border-brand-primary py-1.5 px-3 text-xs font-sans flex-1 min-w-[200px]"
                    onKeyDown={e => e.key === 'Enter' && searchInventory()}
                  />
                  <select
                    value={inventoryStatusFilter}
                    onChange={e => setInventoryStatusFilter(e.target.value)}
                    className="border-2 border-brand-primary py-1.5 px-3 text-xs font-headline font-bold uppercase bg-white"
                  >
                    <option value="">All Status</option>
                    <option value="AVAILABLE">Available</option>
                    <option value="RESERVED">Reserved</option>
                    <option value="ACTIVATED">Activated</option>
                    <option value="BLOCKED">Blocked</option>
                    <option value="LOST">Lost</option>
                  </select>
                  <Btn variant="primary" size="sm" onClick={searchInventory}>
                    <Search className="w-3 h-3" /> Search
                  </Btn>
                </div>

                {/* Inventory Table */}
                <div className="overflow-x-auto border-4 border-brand-primary neo-brutal-shadow">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-brand-primary text-white">
                        <th className="p-3 text-left font-headline font-black uppercase">ID</th>
                        <th className="p-3 text-left font-headline font-black uppercase">ICCID</th>
                        <th className="p-3 text-left font-headline font-black uppercase">IMSI</th>
                        <th className="p-3 text-left font-headline font-black uppercase">Type</th>
                        <th className="p-3 text-left font-headline font-black uppercase">Circle</th>
                        <th className="p-3 text-left font-headline font-black uppercase">Status</th>
                        <th className="p-3 text-left font-headline font-black uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryItems.length === 0 ? (
                        <tr><td colSpan={7} className="p-6 text-center font-headline font-bold uppercase text-slate-400">No records found. Use search or upload CSV to populate.</td></tr>
                      ) : (
                        inventoryItems.map((item: any) => (
                          <tr key={item.id} className="border-t-2 border-brand-primary hover:bg-brand-surface-low transition-colors">
                            <td className="p-3 font-mono font-bold">{item.id}</td>
                            <td className="p-3 font-mono">{item.iccid}</td>
                            <td className="p-3 font-mono">{item.imsi || '—'}</td>
                            <td className="p-3"><StatusBadge status={item.sim_type || 'N/A'} /></td>
                            <td className="p-3 font-headline font-bold uppercase text-[10px]">{item.circle || '—'}</td>
                            <td className="p-3"><StatusBadge status={item.status} /></td>
                            <td className="p-3">
                              {(item.status === 'AVAILABLE' || item.status === 'available') && (
                                <Btn variant="success" size="sm" onClick={() => {
                                  const custId = prompt('Enter Customer ID to assign this SIM:');
                                  if (custId && !isNaN(Number(custId))) assignSim(item.id, Number(custId));
                                }}>
                                  <Check className="w-3 h-3" /> Assign
                                </Btn>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* MODULE 4: Plan Management */}
            {activeTab === 'plans' && (
              <div className="border-4 border-brand-primary bg-white p-6 neo-brutal-shadow space-y-4">
                <SectionHeader title={`Plan Management (${plans.length})`}
                  action={
                    <div className="flex gap-2">
                      <Btn variant="outline" onClick={fetchAll}><RefreshCw className="w-3 h-3" />Refresh</Btn>
                      <Btn variant="primary" onClick={() => { setPlanForm({ id:'', name:'', price:'', data_gb:'', validity_days:'', type:'combo', voice_minutes:'', sms_count:'', description:'' }); setPlanModal('add'); }}>
                        <Plus className="w-3 h-3" />Add Plan
                      </Btn>
                    </div>
                  } />
                <div className="border-2 border-brand-primary divide-y-2 divide-brand-primary">
                  {plans.length === 0
                    ? <p className="p-8 text-center font-headline font-black uppercase text-slate-400">No plans configured.</p>
                    : plans.map((plan: any) => (
                      <div key={plan.id} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-headline font-black text-brand-primary text-sm uppercase">{plan.name}</p>
                            <StatusBadge status={plan.type || 'combo'} />
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono">
                            ৳{formatPrice(plan.price)} · {plan.data_gb ? `${plan.data_gb} GB` : '—'} · {plan.validity_days}d
                            {plan.voice_minutes ? ` · ${plan.voice_minutes} mins` : ''}
                            {plan.sms_count ? ` · ${plan.sms_count} SMS` : ''}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Btn variant="outline" size="sm" onClick={() => {
                            setPlanForm({ id:String(plan.id), name:plan.name, price:String(plan.price), data_gb:String(plan.data_gb||''), validity_days:String(plan.validity_days), type:plan.type||'combo', voice_minutes:String(plan.voice_minutes||''), sms_count:String(plan.sms_count||''), description:plan.description||'' });
                            setPlanModal('edit');
                          }}><Edit className="w-3 h-3" />Edit</Btn>
                          <Btn variant="danger" size="sm" onClick={() => deletePlan(plan.id)}><Trash2 className="w-3 h-3" /></Btn>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* MODULE 5: Wallet Management */}
            {activeTab === 'wallets' && (
              <div className="border-4 border-brand-primary bg-white p-6 neo-brutal-shadow space-y-4">
                <SectionHeader title="Wallet Management" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <MetricCard label="Active Wallets" value={users.length} sub="One per customer" accent />
                  <MetricCard label="Total Revenue" value={`৳${formatPrice(totalRevenue, 0)}`} sub="From confirmed orders" />
                  <MetricCard label="Failed Transactions" value={failedOrders} sub="Order-level failures" accent />
                </div>
                <div className="border-2 border-brand-primary p-4 bg-brand-surface-low">
                  <p className="font-headline font-black text-xs uppercase text-slate-500 mb-2">Admin Wallet Operations</p>
                  <p className="text-xs font-sans text-slate-400 mb-4">
                    Direct credit/debit will be wired to <code>/api/wallet/admin/credit</code> and <code>/api/wallet/admin/debit</code> in a future sprint.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Btn variant="success" size="md"><Plus className="w-4 h-4" />Credit Wallet (coming soon)</Btn>
                    <Btn variant="danger"  size="md"><Trash2 className="w-4 h-4" />Debit Wallet (coming soon)</Btn>
                  </div>
                </div>
                <div className="border-2 border-brand-primary">
                  <div className="p-3 bg-brand-primary-container border-b-2 border-brand-primary">
                    <p className="font-headline font-black text-xs uppercase text-brand-primary">Transaction Log (Confirmed Orders)</p>
                  </div>
                  <div className="divide-y-2 divide-brand-primary max-h-96 overflow-y-auto">
                    {orders.filter((o:any) => o.status === 'CONFIRMED').slice(0, 20).map((o: any) => (
                      <div key={o.id} className="p-3 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-headline font-black text-brand-primary">Order #{o.id?.slice(0,8)}</p>
                          <p className="text-slate-400 font-mono text-[10px]">User {o.user_id} · {new Date(o.created_at).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-headline font-black text-brand-secondary">-৳{formatPrice(o.total_amount)}</p>
                          <StatusBadge status={o.status} />
                        </div>
                      </div>
                    ))}
                    {orders.filter((o:any) => o.status === 'CONFIRMED').length === 0 &&
                      <p className="p-6 text-center font-headline font-black uppercase text-slate-400 text-xs">No confirmed transactions yet.</p>}
                  </div>
                </div>
              </div>
            )}

            {/* MODULE 6: Order Management */}
            {activeTab === 'orders' && (
              <div className="border-4 border-brand-primary bg-white p-6 neo-brutal-shadow space-y-4">
                <SectionHeader title={`Orders (${filteredOrders.length})`}
                  action={<Btn variant="outline" onClick={fetchAll}><RefreshCw className="w-3 h-3" />Refresh</Btn>} />
                <div className="border-2 border-brand-primary flex items-center px-3 gap-2">
                  <Search className="w-4 h-4 text-brand-primary" />
                  <input type="text" placeholder="Search by Order ID or User ID…" value={orderSearch} onChange={e => setOrderSearch(e.target.value)}
                    className="flex-1 py-2 font-headline font-semibold text-sm outline-none" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <MetricCard label="Confirmed" value={orders.filter((o:any) => o.status === 'CONFIRMED').length} accent />
                  <MetricCard label="Failed"    value={failedOrders} />
                  <MetricCard label="Pending"   value={orders.filter((o:any) => o.status === 'PENDING').length} accent />
                </div>
                <div className="border-2 border-brand-primary divide-y-2 divide-brand-primary max-h-[500px] overflow-y-auto">
                  {filteredOrders.length === 0
                    ? <p className="p-8 text-center font-headline font-black uppercase text-slate-400">No orders found.</p>
                    : filteredOrders.map((o: any) => (
                      <div key={o.id} className="p-4 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-headline font-black text-brand-primary text-sm">Order #{o.id?.slice(0,8)}</p>
                            <p className="text-[10px] text-slate-400 font-mono">User {o.user_id} · {new Date(o.created_at).toLocaleString()}</p>
                          </div>
                          <div className="text-right flex flex-col items-end gap-1">
                            <p className="font-headline font-black text-brand-secondary">৳{formatPrice(o.total_amount)}</p>
                            <StatusBadge status={o.status} />
                          </div>
                        </div>
                        {o.items?.length > 0 && (
                          <div className="pl-3 border-l-2 border-brand-secondary text-[10px] text-slate-500 font-mono space-y-0.5">
                            {o.items.map((item: any) => (
                              <div key={item.id}>{item.item_name || `${item.item_type} #${item.item_id}`} × {item.quantity} — ৳{formatPrice(item.unit_price)}</div>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2">
                          {o.status === 'FAILED' && (
                            <Btn variant="warning" size="sm" onClick={() => handleRetryOrder(o.id)} disabled={retryLoading}>
                              <RefreshCw className={`w-3 h-3 ${retryLoading ? 'animate-spin' : ''}`} /> Retry
                            </Btn>
                          )}
                          {(o.status === 'PENDING' || o.status === 'FAILED') && (
                            <Btn variant="danger" size="sm" onClick={() => handleCancelOrder(o.id)}>
                              Cancel
                            </Btn>
                          )}
                          <Btn variant="outline" size="sm" onClick={() => fetchOrderJourneyDetails(o.id)}>
                            <Eye className="w-3 h-3" /> Journey Tracking
                          </Btn>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* MODULE 7: Support Tickets */}
            {activeTab === 'tickets' && (
              <div className="border-4 border-brand-primary bg-white p-6 neo-brutal-shadow space-y-4">
                <SectionHeader title={`Support Tickets (${tickets.length})`}
                  action={<Btn variant="primary" onClick={() => setTicketModal('add')}><Plus className="w-3 h-3" />New Ticket</Btn>} />
                <div className="grid grid-cols-3 gap-3">
                  <MetricCard label="Open"       value={tickets.filter(t => t.status === 'Open').length} accent />
                  <MetricCard label="In Progress" value={tickets.filter(t => t.status === 'In Progress').length} />
                  <MetricCard label="Resolved"   value={tickets.filter(t => t.status === 'Resolved').length} accent />
                </div>
                <div className="border-2 border-brand-primary divide-y-2 divide-brand-primary">
                  {tickets.length === 0
                    ? <div className="p-8 text-center">
                        <TicketCheck className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                        <p className="font-headline font-black uppercase text-slate-400 text-sm">No support tickets yet.</p>
                        <p className="text-[11px] text-slate-300 mt-1">Create a ticket to track customer issues.</p>
                      </div>
                    : tickets.map(t => (
                      <div key={t.id} className="p-4 flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-headline font-black text-brand-primary text-xs uppercase">{t.id}</p>
                            <StatusBadge status={t.status} />
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono">Customer #{t.customer_id} · {t.type}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{t.description}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {t.status !== 'Resolved' && (
                            <Btn variant="success" size="sm" onClick={() => resolveTicket(t.id)}><CheckCircle2 className="w-3 h-3" />Resolve</Btn>
                          )}
                          <Btn variant="outline" size="sm" onClick={() => { setSelectedTicket(t); setTicketModal('view'); }}>
                            <Eye className="w-3 h-3" />View
                          </Btn>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* MODULE 8: Service Health */}
            {activeTab === 'health' && (
              <div className="border-4 border-brand-primary bg-white p-6 neo-brutal-shadow space-y-4">
                <SectionHeader title="Service Health Monitoring"
                  action={<Btn variant="primary" onClick={checkHealth}><RefreshCw className="w-3 h-3" />Re-Check All</Btn>} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {serviceHealth.map(s => (
                    <div key={s.name} className={`border-2 p-4 flex items-center justify-between ${
                      s.status === 'UP' ? 'border-green-500 bg-green-50' :
                      s.status === 'DOWN' ? 'border-red-500 bg-red-50' :
                      'border-slate-300 bg-slate-50'
                    }`}>
                      <div className="flex items-center gap-3">
                        <Server className={`w-5 h-5 ${s.status === 'UP' ? 'text-green-600' : s.status === 'DOWN' ? 'text-red-600' : 'text-slate-400'}`} />
                        <div>
                          <p className="font-headline font-black text-sm uppercase">{s.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{s.url}</p>
                        </div>
                      </div>
                      <StatusBadge status={s.status} />
                    </div>
                  ))}
                </div>
                <div className="border-2 border-brand-primary p-4">
                  <p className="font-headline font-black text-xs uppercase text-slate-500 mb-3">Infrastructure</p>
                  {[
                    { name: 'PostgreSQL',    port: '5433',  note: 'Primary database' },
                    { name: 'Redis',         port: '6379',  note: 'Cache / session store' },
                    { name: 'RabbitMQ',      port: '15672', note: 'Message broker' },
                    { name: 'Elasticsearch', port: '9200',  note: 'Log storage (ELK)' },
                    { name: 'Prometheus',    port: '9090',  note: 'Metrics collection' },
                  ].map(s => (
                    <div key={s.name} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <div>
                        <span className="font-headline font-black text-xs uppercase">{s.name}</span>
                        <span className="text-[9px] text-slate-400 font-mono ml-2">:{s.port}</span>
                      </div>
                      <span className="text-[9px] text-slate-400">{s.note}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MODULE 9: Monitoring */}
            {activeTab === 'monitoring' && (
              <div className="border-4 border-brand-primary bg-white p-6 neo-brutal-shadow space-y-4">
                <SectionHeader title="Monitoring Dashboard" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'Prometheus',    desc: 'Metrics collection and alerting. Query PromQL and view scrape targets.', port: 9090, icon: BarChart2, color: 'border-orange-500 bg-orange-50' },
                    { label: 'Grafana Cloud', desc: 'Pre-built dashboards for service health, login events, orders, and wallets.', port: null, icon: Activity, color: 'border-purple-500 bg-purple-50' },
                    { label: 'Kibana',        desc: 'Centralized log search and analysis across all microservices (ELK stack).', port: 5601, icon: ScrollText, color: 'border-cyan-500 bg-cyan-50' },
                    { label: 'RabbitMQ UI',   desc: 'Message broker: queues, exchanges, consumers, publish rates.', port: 15672, icon: Server, color: 'border-orange-400 bg-orange-50' },
                  ].map(tool => (
                    <div key={tool.label} className={`border-2 p-5 ${tool.color}`}>
                      <div className="flex items-center gap-3 mb-3">
                        <tool.icon className="w-6 h-6" />
                        <h4 className="font-headline font-black uppercase text-base">{tool.label}</h4>
                      </div>
                      <p className="text-xs font-sans text-slate-600 mb-4">{tool.desc}</p>
                      {tool.port
                        ? <a href={`http://localhost:${tool.port}`} target="_blank" rel="noreferrer">
                            <Btn variant="outline" size="md"><ExternalLink className="w-3 h-3" />Open :{tool.port}</Btn>
                          </a>
                        : <Btn variant="outline" size="md" onClick={() => window.open('https://grafana.com', '_blank')}>
                            <ExternalLink className="w-3 h-3" />Open Grafana Cloud
                          </Btn>
                      }
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MODULE 10: Centralized Logs */}
            {activeTab === 'logs' && (
              <div className="border-4 border-brand-primary bg-white p-6 neo-brutal-shadow space-y-4">
                <SectionHeader title="Centralized Logging (Kibana)" />
                <div className="border-2 border-brand-primary p-5 bg-brand-surface-low space-y-3">
                  <p className="font-sans text-sm text-slate-600">
                    All microservice logs are forwarded via <strong>Logstash TCP (port 5044)</strong> and indexed in
                    <strong> Elasticsearch</strong> under the <code className="bg-white px-1 border border-slate-200">smartsim-logs-*</code> index pattern.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {['INFO','WARNING','ERROR','CRITICAL'].map(level => (
                      <div key={level} className="border-2 border-brand-primary p-3 flex items-center gap-2 bg-white">
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          level === 'INFO' ? 'bg-blue-500' : level === 'WARNING' ? 'bg-yellow-500' :
                          level === 'ERROR' ? 'bg-red-500' : 'bg-purple-600'
                        }`} />
                        <span className="font-headline font-black text-[10px] uppercase">{level}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <a href="http://localhost:5601" target="_blank" rel="noreferrer" className="block">
                  <div className="border-2 border-brand-primary bg-brand-primary text-white p-5 flex items-center justify-between hover:bg-brand-primary/90 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <ScrollText className="w-6 h-6" />
                      <div>
                        <p className="font-headline font-black uppercase">Open Kibana Dashboard</p>
                        <p className="text-[10px] opacity-70">localhost:5601 — Search all service logs</p>
                      </div>
                    </div>
                    <ExternalLink className="w-5 h-5" />
                  </div>
                </a>
                <div className="border-2 border-brand-primary p-4">
                  <p className="font-headline font-black text-xs uppercase text-slate-500 mb-3">Quick Service Filters</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {['auth-service','sim-service','plan-service','wallet-service','order-service','notification-service'].map(svc => (
                      <a key={svc} href={`http://localhost:5601/app/discover#/?_q=(query:(match_phrase:(service:'${svc}')))`} target="_blank" rel="noreferrer">
                        <button className="w-full border-2 border-brand-primary py-1.5 px-3 font-headline font-black text-[10px] uppercase text-brand-primary bg-white hover:bg-brand-surface-low transition-all cursor-pointer">
                          {svc}
                        </button>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* MODULE 11: Audit Logs */}
            {activeTab === 'audit' && (
              <div className="border-4 border-brand-primary bg-white p-6 neo-brutal-shadow space-y-4">
                <SectionHeader title="Audit Logs" />
                <div className="border-2 border-brand-primary p-4 bg-brand-surface-low">
                  <p className="text-xs font-sans text-slate-500">
                    Administrator actions are recorded in the <code className="bg-white px-1 border border-slate-200">audit_logs</code> table.
                    Full audit persistence will be activated in a future sprint. Below is a preview of tracked events.
                  </p>
                </div>
                <div className="border-2 border-brand-primary divide-y-2 divide-brand-primary">
                  {[
                    { action: 'SIM Package Deactivated',  entity: 'SIM #3',           time: '2m ago' },
                    { action: 'Customer Account Reviewed', entity: 'User #12',         time: '15m ago' },
                    { action: 'Plan Created',              entity: 'Unlimited Plan',   time: '1h ago' },
                    { action: 'SIM Package Activated',     entity: 'SIM #1',           time: '2h ago' },
                    { action: 'Order Viewed',              entity: 'Order #a1b2c3d4',  time: '3h ago' },
                    { action: 'Ticket Resolved',           entity: 'TKT-001',          time: '5h ago' },
                    { action: 'Admin Login',               entity: user.name,          time: 'Today' },
                  ].map((log, i) => (
                    <div key={i} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-headline font-black text-xs uppercase text-brand-primary">{log.action}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{log.entity} · by {user.name}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{log.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MODULE 12: Admin Users */}
            {activeTab === 'admin-users' && (
              <div className="border-4 border-brand-primary bg-white p-6 neo-brutal-shadow space-y-4">
                <SectionHeader title="Admin User Management"
                  action={<Btn variant="primary"><Plus className="w-3 h-3" />Create Admin</Btn>} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { role: 'Super Admin',       desc: 'Full access: all modules, audit logs, RBAC, and admin management.' },
                    { role: 'Operations Admin',  desc: 'Manage customers, SIMs, plans, orders, wallets. Cannot manage admins.' },
                    { role: 'Support Agent',     desc: 'View customers, wallets, orders. Create and resolve tickets.' },
                  ].map(r => (
                    <div key={r.role} className="border-2 border-brand-primary p-4 bg-brand-surface-low">
                      <p className="font-headline font-black uppercase text-xs text-brand-primary mb-1">{r.role}</p>
                      <p className="text-[10px] text-slate-500 font-sans">{r.desc}</p>
                    </div>
                  ))}
                </div>
                <div className="border-2 border-brand-primary divide-y-2 divide-brand-primary">
                  <div className="p-3 bg-brand-primary-container">
                    <p className="font-headline font-black text-[10px] uppercase text-brand-primary">Current Admin Accounts</p>
                  </div>
                  {users.filter((u: any) => u.role === 'admin').length === 0
                    ? <p className="p-6 text-center font-headline font-black uppercase text-slate-400 text-xs">No admin accounts found.</p>
                    : users.filter((u: any) => u.role === 'admin').map((u: any) => (
                      <div key={u.id} className="p-4 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-headline font-black text-sm uppercase text-brand-primary">{u.name}</p>
                            <StatusBadge status="admin" />
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono">{u.email} · {u.mobile}</p>
                        </div>
                        <div className="flex gap-2">
                          <Btn variant="outline" size="sm"><Edit className="w-3 h-3" />Edit</Btn>
                          <Btn variant="danger"  size="sm"><Ban className="w-3 h-3" />Disable</Btn>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}

            {/* MODULE 4: System Flow Tracker */}
            {activeTab === 'system-tracker' && (
              <div className="border-4 border-brand-primary bg-white p-6 neo-brutal-shadow space-y-6">
                <SectionHeader title="System Flow Tracker" 
                  action={
                    <div className="flex gap-2">
                      <Btn variant="primary" onClick={fetchTrackerLogs} disabled={trackerLoading}>
                        {trackerLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        Refresh Logs
                      </Btn>
                    </div>
                  } 
                />
                
                {/* Search Filters */}
                <div className="border-4 border-brand-primary p-4 bg-brand-surface-low grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[9px] font-headline font-black uppercase tracking-widest text-slate-500 mb-1">Order ID</label>
                    <input
                      type="text"
                      className="w-full border-2 border-brand-primary p-2 text-xs font-sans neo-brutal-shadow focus:outline-none"
                      placeholder="e.g. ORD..."
                      value={trackerSearchOrderId}
                      onChange={(e) => setTrackerSearchOrderId(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-headline font-black uppercase tracking-widest text-slate-500 mb-1">Customer ID</label>
                    <input
                      type="text"
                      className="w-full border-2 border-brand-primary p-2 text-xs font-sans neo-brutal-shadow focus:outline-none"
                      placeholder="e.g. 1"
                      value={trackerSearchCustomerId}
                      onChange={(e) => setTrackerSearchCustomerId(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-headline font-black uppercase tracking-widest text-slate-500 mb-1">MSISDN</label>
                    <input
                      type="text"
                      className="w-full border-2 border-brand-primary p-2 text-xs font-sans neo-brutal-shadow focus:outline-none"
                      placeholder="e.g. 91..."
                      value={trackerSearchMsisdn}
                      onChange={(e) => setTrackerSearchMsisdn(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-headline font-black uppercase tracking-widest text-slate-500 mb-1">Service Name</label>
                    <select
                      className="w-full border-2 border-brand-primary p-2 text-xs font-sans neo-brutal-shadow focus:outline-none"
                      value={trackerSearchServiceName}
                      onChange={(e) => setTrackerSearchServiceName(e.target.value)}
                    >
                      <option value="">All Services</option>
                      <option value="order-service">order-service</option>
                      <option value="sim-service">sim-service</option>
                      <option value="wallet-service">wallet-service</option>
                      <option value="plan-service">plan-service</option>
                      <option value="notification-service">notification-service</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex gap-2 justify-end">
                  <Btn variant="outline" size="sm" onClick={() => {
                    setTrackerSearchOrderId('');
                    setTrackerSearchCustomerId('');
                    setTrackerSearchMsisdn('');
                    setTrackerSearchServiceName('');
                  }}>Clear Filters</Btn>
                  <Btn variant="primary" size="sm" onClick={fetchTrackerLogs}>Search Logs</Btn>
                </div>

                {/* Log list */}
                <div className="border-2 border-brand-primary divide-y-2 divide-brand-primary bg-white">
                  <div className="p-3 bg-brand-primary-container flex items-center justify-between">
                    <p className="font-headline font-black text-[10px] uppercase text-brand-primary">Service Execution Telemetry Logs</p>
                    <p className="font-headline font-black text-[10px] uppercase text-brand-primary">{trackerLogs.length} Entries Found</p>
                  </div>
                  
                  {trackerLogs.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="font-headline font-black uppercase text-slate-400 text-xs">No service execution logs found matching criteria.</p>
                      <p className="text-[10px] text-slate-400 font-sans mt-1">Make a purchase or trigger an order checkout to populate logs.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-sans text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b-2 border-brand-primary text-[10px] font-headline font-black uppercase text-slate-500">
                            <th className="p-3">Log ID</th>
                            <th className="p-3">Order ID</th>
                            <th className="p-3">Service Name</th>
                            <th className="p-3">API / Flow Name</th>
                            <th className="p-3">Execution Latency</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Execution Time</th>
                            <th className="p-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-brand-primary">
                          {trackerLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3 font-mono font-bold text-[10px] text-slate-500">#{log.id}</td>
                              <td className="p-3 font-mono font-bold text-[10px] text-brand-secondary">
                                <span className="underline cursor-pointer" onClick={() => {
                                  setTrackerSearchOrderId(log.order_id);
                                }}>{log.order_id}</span>
                              </td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 border border-brand-primary bg-brand-surface-low text-[10px] font-mono font-bold">
                                  {log.service_name}
                                </span>
                              </td>
                              <td className="p-3 font-mono text-[10px]">{log.api_name}</td>
                              <td className="p-3 font-mono font-bold">
                                <span className={log.execution_time > 500 ? 'text-amber-600' : 'text-emerald-600'}>
                                  {log.execution_time.toFixed(1)} ms
                                </span>
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 font-headline font-black text-[9px] uppercase border-2 ${
                                  log.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800 border-emerald-800' : 'bg-rose-100 text-rose-800 border-rose-800'
                                }`}>
                                  {log.status}
                                </span>
                              </td>
                              <td className="p-3 text-[10px] text-slate-500 font-mono">
                                {new Date(log.created_at).toLocaleString()}
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex justify-end gap-2">
                                  <a 
                                    href={`http://localhost:5601/app/discover#/?_g=(filters:!())&_a=(query:(language:kuery,query:'service_name%20:%20%22${log.service_name}%22%20AND%20order_id%20:%20%22${log.order_id}%22'))`}
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-headline font-black uppercase tracking-wider border-2 border-brand-primary bg-brand-primary-container text-brand-primary hover:bg-brand-primary hover:text-white transition-colors"
                                  >
                                    <ExternalLink className="w-2.5 h-2.5" />
                                    View Logs
                                  </a>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-brand-primary text-white border-t-4 border-brand-primary py-6 mt-auto">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5" />
            <span className="text-sm font-headline font-black uppercase tracking-tighter">SmartSIM Admin Portal</span>
          </div>
          <p className="font-headline font-bold uppercase tracking-widest text-[10px] opacity-60">
            © {new Date().getFullYear()} SmartSIM — Internal Operations Platform
          </p>
        </div>
      </footer>

      {/* SIM Modal */}
      {simModal && (
        <Modal title={simModal === 'edit' ? 'Edit SIM Package' : 'Add SIM Package'} onClose={() => setSimModal(null)}>
          <form onSubmit={saveSim} className="space-y-4">
            <InputField label="SIM Package Name" type="text" required value={simForm.name}
              onChange={(e:any) => setSimForm({...simForm, name: e.target.value})} placeholder="e.g. eSIM Unlimited Pack" />
            <InputField label="SIM Type" type="select" value={simForm.type}
              onChange={(e:any) => setSimForm({...simForm, type: e.target.value})}>
              <option value="physical">Physical SIM</option>
              <option value="esim">eSIM</option>
              <option value="prepaid">Prepaid</option>
              <option value="postpaid">Postpaid</option>
            </InputField>
            <InputField label="Price (BDT)" type="number" step="0.01" required value={simForm.price}
              onChange={(e:any) => setSimForm({...simForm, price: e.target.value})} placeholder="150.00" />
            <InputField label="ICCID Prefix" type="text" required value={simForm.iccid_prefix}
              onChange={(e:any) => setSimForm({...simForm, iccid_prefix: e.target.value})} placeholder="e.g. 89880" />
            <InputField label="Description" type="textarea" value={simForm.description}
              onChange={(e:any) => setSimForm({...simForm, description: e.target.value})} placeholder="Brief description…" />
            <Btn variant="primary" size="lg" className="w-full justify-center">
              {simModal === 'edit' ? 'Save Changes' : 'Create SIM Package'}
            </Btn>
          </form>
        </Modal>
      )}

      {/* Plan Modal */}
      {planModal && (
        <Modal title={planModal === 'edit' ? 'Edit Plan' : 'Add Plan'} onClose={() => setPlanModal(null)}>
          <form onSubmit={savePlan} className="space-y-4">
            <InputField label="Plan Name" type="text" required value={planForm.name}
              onChange={(e:any) => setPlanForm({...planForm, name: e.target.value})} placeholder="e.g. Monthly Unlimited" />
            <div className="grid grid-cols-2 gap-3">
              <InputField label="Price (BDT)" type="number" step="0.01" required value={planForm.price}
                onChange={(e:any) => setPlanForm({...planForm, price: e.target.value})} placeholder="299.00" />
              <InputField label="Plan Type" type="select" value={planForm.type}
                onChange={(e:any) => setPlanForm({...planForm, type: e.target.value})}>
                <option value="data">Data</option>
                <option value="voice">Voice</option>
                <option value="combo">Combo</option>
                <option value="roaming">Roaming</option>
                <option value="unlimited">Unlimited</option>
              </InputField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <InputField label="Data (GB)" type="number" required value={planForm.data_gb}
                onChange={(e:any) => setPlanForm({...planForm, data_gb: e.target.value})} placeholder="20" />
              <InputField label="Validity (Days)" type="number" required value={planForm.validity_days}
                onChange={(e:any) => setPlanForm({...planForm, validity_days: e.target.value})} placeholder="30" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <InputField label="Voice (Minutes)" type="number" value={planForm.voice_minutes}
                onChange={(e:any) => setPlanForm({...planForm, voice_minutes: e.target.value})} placeholder="0" />
              <InputField label="SMS Count" type="number" value={planForm.sms_count}
                onChange={(e:any) => setPlanForm({...planForm, sms_count: e.target.value})} placeholder="0" />
            </div>
            <InputField label="Description" type="textarea" value={planForm.description}
              onChange={(e:any) => setPlanForm({...planForm, description: e.target.value})} placeholder="Plan details…" />
            <Btn variant="primary" size="lg" className="w-full justify-center">
              {planModal === 'edit' ? 'Save Changes' : 'Create Plan'}
            </Btn>
          </form>
        </Modal>
      )}

      {/* Ticket: New */}
      {ticketModal === 'add' && (
        <Modal title="Create Support Ticket" onClose={() => setTicketModal(null)}>
          <form onSubmit={createTicket} className="space-y-4">
            <InputField label="Customer ID" type="number" required value={ticketForm.customer_id}
              onChange={(e:any) => setTicketForm({...ticketForm, customer_id: e.target.value})} placeholder="e.g. 12" />
            <InputField label="Issue Type" type="select" value={ticketForm.type}
              onChange={(e:any) => setTicketForm({...ticketForm, type: e.target.value})}>
              <option>SIM Activation Issue</option>
              <option>Recharge Issue</option>
              <option>Wallet Issue</option>
              <option>Order Issue</option>
              <option>Account Issue</option>
            </InputField>
            <InputField label="Description" type="textarea" required value={ticketForm.description}
              onChange={(e:any) => setTicketForm({...ticketForm, description: e.target.value})} placeholder="Describe the issue in detail…" />
            <Btn variant="primary" size="lg" className="w-full justify-center">Create Ticket</Btn>
          </form>
        </Modal>
      )}

      {/* Ticket: View */}
      {ticketModal === 'view' && selectedTicket && (
        <Modal title={`Ticket: ${selectedTicket.id}`} onClose={() => { setTicketModal(null); setSelectedTicket(null); }}>
          <div className="space-y-4">
            {[
              { label: 'Customer ID', value: selectedTicket.customer_id },
              { label: 'Type',        value: selectedTicket.type },
              { label: 'Status',      value: selectedTicket.status },
              { label: 'Created',     value: new Date(selectedTicket.created_at).toLocaleString() },
            ].map(field => (
              <div key={field.label}>
                <p className="text-[9px] font-headline font-black uppercase tracking-widest text-slate-400 mb-0.5">{field.label}</p>
                <p className="font-headline font-semibold text-sm">{String(field.value)}</p>
              </div>
            ))}
            <div>
              <p className="text-[9px] font-headline font-black uppercase tracking-widest text-slate-400 mb-1">Description</p>
              <p className="font-sans text-sm text-slate-600 bg-brand-surface-low p-3 border-2 border-brand-primary">{selectedTicket.description}</p>
            </div>
            {selectedTicket.status !== 'Resolved' && (
              <Btn variant="success" size="lg" className="w-full justify-center"
                onClick={() => { resolveTicket(selectedTicket.id); setTicketModal(null); setSelectedTicket(null); }}>
                <CheckCircle2 className="w-4 h-4" />Mark as Resolved
              </Btn>
            )}
          </div>
        </Modal>
      )}

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
                  <p className="text-lg font-headline font-black text-brand-primary uppercase mt-1">
                    {selectedCrmProfile.basic_info.profile_status}
                  </p>
                </div>
                <div className="border-2 border-brand-primary p-3 bg-slate-50">
                  <p className="text-[9px] font-headline font-black text-slate-400 uppercase">Mobile No</p>
                  <p className="text-lg font-headline font-black text-brand-secondary mt-1">{selectedCrmProfile.basic_info.mobile}</p>
                </div>
                <div className="border-2 border-brand-primary p-3 bg-slate-50">
                  <p className="text-[9px] font-headline font-black text-slate-400 uppercase">Wallet Balance</p>
                  <p className="text-lg font-headline font-black text-brand-secondary mt-1">
                    ৳{formatPrice(selectedCrmProfile.wallet_info?.balance || 0)}
                  </p>
                </div>
                <div className="border-2 border-brand-primary p-3 bg-slate-50">
                  <p className="text-[9px] font-headline font-black text-slate-400 uppercase">Total Orders</p>
                  <p className="text-lg font-headline font-black text-brand-secondary mt-1">
                    {selectedCrmProfile.order_info?.length || 0}
                  </p>
                </div>
              </div>

              {/* Grid sections for details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Basic Info & Edit */}
                <div className="border-2 border-brand-primary p-4 space-y-3">
                  <div className="flex justify-between items-center border-b border-brand-primary pb-2">
                    <h4 className="font-headline font-black uppercase text-xs text-brand-primary">Basic Information</h4>
                    <Btn variant="primary" size="sm" onClick={() => setCrmModal('edit')}>Edit Info</Btn>
                  </div>
                  <div className="text-xs space-y-2 font-sans">
                    <p><strong>Name:</strong> {selectedCrmProfile.basic_info.name}</p>
                    <p><strong>Email:</strong> {selectedCrmProfile.basic_info.email}</p>
                    <p><strong>Mobile:</strong> {selectedCrmProfile.basic_info.mobile}</p>
                    <p><strong>Address:</strong> {selectedCrmProfile.basic_info.address || '—'}</p>
                    <p><strong>Notes:</strong> {selectedCrmProfile.basic_info.notes || '—'}</p>
                    <p><strong>Registered:</strong> {new Date(selectedCrmProfile.basic_info.created_at).toLocaleString()}</p>
                  </div>
                </div>

                {/* SIM Assignment Info */}
                <div className="border-2 border-brand-primary p-4 space-y-3">
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
                <div className="border-2 border-brand-primary p-4 space-y-3">
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

                {/* Wallet Transactions */}
                <div className="border-2 border-brand-primary p-4 space-y-3">
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
              <div className="border-2 border-brand-primary p-4 space-y-3">
                <h4 className="font-headline font-black uppercase text-xs text-brand-primary border-b border-brand-primary pb-2">Order History</h4>
                <div className="overflow-x-auto max-h-60">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b-2 border-brand-primary bg-slate-50 font-headline uppercase text-[10px]">
                        <th className="p-2">Order ID</th>
                        <th className="p-2">Items</th>
                        <th className="p-2">Amount</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCrmProfile.order_info.length === 0 ? (
                        <tr><td colSpan={5} className="p-4 text-center font-bold text-slate-400 uppercase">No orders found.</td></tr>
                      ) : (
                        selectedCrmProfile.order_info.map((ord: any) => (
                          <tr key={ord.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="p-2 font-mono font-bold">{ord.id.slice(0, 8)}</td>
                            <td className="p-2 font-sans">
                              {ord.items.map((it: any, idx: number) => (
                                <div key={idx}>{it.item_name || `${it.item_type} #${it.item_id}`} x {it.quantity}</div>
                              ))}
                            </td>
                            <td className="p-2 font-bold">৳{formatPrice(ord.total_amount)}</td>
                            <td className="p-2"><StatusBadge status={ord.status} /></td>
                            <td className="p-2 text-slate-400 font-mono text-[10px]">{new Date(ord.created_at).toLocaleString()}</td>
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

      {/* CRM Edit Modal */}
      {crmModal === 'edit' && (
        <Modal title="Edit Customer Details" onClose={() => setCrmModal('profile')}>
          <form onSubmit={updateCrmCustomer} className="space-y-4">
            <InputField label="Name" type="text" required value={crmForm.name}
              onChange={(e: any) => setCrmForm({ ...crmForm, name: e.target.value })} />
            <InputField label="Email" type="email" required value={crmForm.email}
              onChange={(e: any) => setCrmForm({ ...crmForm, email: e.target.value })} />
            <InputField label="Mobile" type="text" required value={crmForm.mobile}
              onChange={(e: any) => setCrmForm({ ...crmForm, mobile: e.target.value })} />
            <InputField label="Address" type="text" value={crmForm.address}
              onChange={(e: any) => setCrmForm({ ...crmForm, address: e.target.value })} />
            <InputField label="Notes" type="textarea" value={crmForm.notes}
              onChange={(e: any) => setCrmForm({ ...crmForm, notes: e.target.value })} />
            <InputField label="Status" type="select" value={crmForm.status}
              onChange={(e: any) => setCrmForm({ ...crmForm, status: e.target.value })}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </InputField>
            <Btn variant="primary" size="lg" className="w-full justify-center">
              Save Profile Changes
            </Btn>
          </form>
        </Modal>
      )}

      {/* Order Journey Visualizer Modal */}
      {orderJourneyModal && selectedOrderDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border-4 border-brand-primary neo-brutal-shadow w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b-4 border-brand-primary bg-brand-primary-container">
              <div>
                <h3 className="font-headline font-black uppercase text-lg text-brand-primary">
                  Order Journey Tracking: #{selectedOrderDetails.id.slice(0, 8)}
                </h3>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">User ID: {selectedOrderDetails.user_id} · Total: ৳{formatPrice(selectedOrderDetails.total_amount)}</p>
              </div>
              <button onClick={() => setOrderJourneyModal(false)} className="border-2 border-brand-primary p-1 hover:bg-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Top status card */}
              <div className="flex justify-between items-center border-2 border-brand-primary p-4 bg-slate-50">
                <div>
                  <p className="text-[9px] font-headline font-black text-slate-400 uppercase">Order Status</p>
                  <p className="text-sm font-headline font-black text-brand-primary uppercase mt-0.5">
                    {selectedOrderDetails.status}
                  </p>
                </div>
                <div className="flex gap-2">
                  {selectedOrderDetails.status === 'FAILED' && (
                    <Btn variant="warning" size="md" onClick={() => handleRetryOrder(selectedOrderDetails.id)} disabled={retryLoading}>
                      <RefreshCw className={`w-4 h-4 ${retryLoading ? 'animate-spin' : ''}`} /> Retry Failed Step
                    </Btn>
                  )}
                  {(selectedOrderDetails.status === 'PENDING' || selectedOrderDetails.status === 'FAILED') && (
                    <Btn variant="danger" size="md" onClick={() => handleCancelOrder(selectedOrderDetails.id)}>
                      Cancel Order
                    </Btn>
                  )}
                </div>
              </div>

              {/* Order Items Summary */}
              <div className="border-2 border-brand-primary p-4 bg-brand-surface-low space-y-2">
                <p className="font-headline font-black text-[10px] uppercase text-brand-primary border-b border-brand-primary/20 pb-1">Order Items</p>
                <div className="text-xs space-y-1 font-mono">
                  {selectedOrderDetails.items.map((it: any, idx: number) => (
                    <div key={idx} className="flex justify-between">
                      <span>{it.item_name} ({it.item_type}) x {it.quantity}</span>
                      <span>৳{formatPrice(it.unit_price * it.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step timeline list */}
              <div className="space-y-4">
                <p className="font-headline font-black text-xs uppercase text-brand-primary">Lifecycle Processing Steps</p>
                
                <div className="relative border-l-4 border-brand-primary ml-4 pl-6 space-y-6">
                  {(() => {
                    const steps = [
                      { name: 'Inventory Check', sys: 'order-service' },
                      { name: 'SIM Allocation', sys: 'sim-service' },
                      { name: 'Wallet Validation', sys: 'wallet-service' },
                      { name: 'Plan Assignment', sys: 'plan-service' },
                      { name: 'Activation Request', sys: 'sim-service' },
                      { name: 'Notification', sys: 'notification-service' }
                    ];

                    return steps.map((step, idx) => {
                      const journeyLog = selectedOrderDetails.journey?.find((j: any) => j.step_name === step.name);
                      
                      let circleColor = 'bg-slate-200 border-slate-400';
                      let statusText = 'Not Started';
                      
                      if (journeyLog) {
                        if (journeyLog.status === 'SUCCESS') {
                          circleColor = 'bg-green-500 border-green-700';
                          statusText = 'Success';
                        } else if (journeyLog.status === 'FAILED') {
                          circleColor = 'bg-red-500 border-red-700';
                          statusText = 'Failed';
                        } else if (journeyLog.status === 'PENDING') {
                          circleColor = 'bg-yellow-400 border-yellow-600 animate-pulse';
                          statusText = 'Processing';
                        }
                      }

                      return (
                        <div key={idx} className="relative">
                          {/* Dot marker */}
                          <div className={`absolute -left-[34px] top-0.5 w-4 h-4 rounded-full border-2 ${circleColor}`} />
                          
                          <div className="border-2 border-brand-primary p-3 bg-white space-y-2">
                            <div className="flex justify-between items-center">
                              <div>
                                <h4 className="font-headline font-black uppercase text-xs text-brand-primary">{step.name}</h4>
                                <p className="text-[9px] text-slate-400 font-mono">System: {step.sys}</p>
                              </div>
                              <div className="text-right">
                                <span className={`text-[8px] font-headline font-black border uppercase px-1.5 py-0.5 ${
                                  statusText === 'Success' ? 'bg-green-100 text-green-700 border-green-500' :
                                  statusText === 'Failed' ? 'bg-red-100 text-red-700 border-red-500' :
                                  statusText === 'Processing' ? 'bg-yellow-100 text-yellow-700 border-yellow-500' :
                                  'bg-slate-100 text-slate-500 border-slate-300'
                                }`}>
                                  {statusText}
                                </span>
                              </div>
                            </div>

                            {journeyLog?.error_message && (
                              <div className="border border-red-300 bg-red-50 text-red-700 p-2 text-[10px] font-mono whitespace-pre-wrap">
                                <strong>Error Details:</strong> {journeyLog.error_message}
                              </div>
                            )}

                            {journeyLog?.response_payload && (
                              <details className="text-[10px] font-mono cursor-pointer text-slate-500">
                                <summary className="font-sans hover:text-brand-primary">View Payload details</summary>
                                <pre className="bg-slate-50 p-2 mt-1 border border-slate-200 overflow-x-auto text-[9px]">
                                  {(() => {
                                    try {
                                      return JSON.stringify(JSON.parse(journeyLog.response_payload), null, 2);
                                    } catch {
                                      return journeyLog.response_payload;
                                    }
                                  })()}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
