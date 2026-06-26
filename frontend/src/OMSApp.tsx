import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { BrowserRouter as Router } from 'react-router-dom';
import AdminLogin from './components/AdminLogin';
import api from './services/api';
import {
  ShoppingBag, Network, Activity, ScrollText, FileText, LayoutDashboard,
  Search, Eye, RefreshCw, X, ShieldAlert, Loader2, Ban, CheckCircle2, ChevronRight, ExternalLink
} from 'lucide-react';

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
    SUCCESS: 'bg-green-100 text-green-700 border-green-400',
    admin: 'bg-red-100 text-red-700 border-red-400',
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

const formatPrice = (val: number) => Number(val).toFixed(2);

const OMSMainApp: React.FC = () => {
  const { user, checkAuth } = useAuth();
  
  type TabId = 'overview' | 'orders' | 'system-tracker' | 'health' | 'audit';
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // States
  const [orders, setOrders] = useState<any[]>([]);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderSearchStatus, setOrderSearchStatus] = useState('');
  
  // Journey tracker state
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any>(null);
  const [orderJourneyModal, setOrderJourneyModal] = useState(false);
  const [retryLoading, setRetryLoading] = useState(false);

  // Telemetry logs search
  const [trackerLogs, setTrackerLogs] = useState<any[]>([]);
  const [trackerLoading, setTrackerLoading] = useState(false);
  const [trackerSearchOrderId, setTrackerSearchOrderId] = useState('');
  const [trackerSearchCustomerId, setTrackerSearchCustomerId] = useState('');
  const [trackerSearchMsisdn, setTrackerSearchMsisdn] = useState('');
  const [trackerSearchServiceName, setTrackerSearchServiceName] = useState('');

  // Health check
  const [healthStatus, setHealthStatus] = useState<any[]>([]);
  const [healthLoading, setHealthLoading] = useState(false);

  const notify = (msg: string, isErr = false) => {
    if (isErr) { setErrorMsg(msg); setTimeout(() => setErrorMsg(''), 4000); }
    else { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 4000); }
  };

  const fetchOrders = async () => {
    try {
      const res = await api.get('/admin/orders');
      setOrders(res.data || []);
    } catch (e: any) {
      notify('Failed to load orders', true);
    }
  };

  const fetchTrackerLogs = async () => {
    try {
      setTrackerLoading(true);
      const params: any = {};
      if (trackerSearchOrderId) params.order_id = trackerSearchOrderId;
      if (trackerSearchCustomerId) params.customer_id = trackerSearchCustomerId;
      if (trackerSearchMsisdn) params.msisdn = trackerSearchMsisdn;
      if (trackerSearchServiceName) params.service_name = trackerSearchServiceName;
      
      const res = await api.get('/admin/orders/system-tracker', { params });
      setTrackerLogs(res.data || []);
    } catch (e: any) {
      notify('Failed to load tracker logs', true);
    } finally {
      setTrackerLoading(false);
    }
  };

  const checkHealth = async () => {
    try {
      setHealthLoading(true);
      const endpoints = [
        '/auth/health',
        '/sims/health',
        '/plans/health',
        '/wallet/health',
        '/orders/health',
        '/notifications/health'
      ];
      
      const list = await Promise.all(
        endpoints.map(async (ep) => {
          const name = ep.split('/')[1] + '-service';
          try {
            const res = await api.get(ep);
            return { name, status: res.data.status || 'UP', note: 'Responsive' };
          } catch {
            return { name, status: 'DOWN', note: 'Unreachable' };
          }
        })
      );
      setHealthStatus(list);
    } catch (e: any) {
      notify('Service health diagnostics failed', true);
    } finally {
      setHealthLoading(false);
    }
  };

  const fetchOrderJourneyDetails = async (orderId: string) => {
    try {
      const res = await api.get(`/admin/orders/${orderId}`);
      setSelectedOrderDetails(res.data);
      setOrderJourneyModal(true);
    } catch (e: any) {
      notify('Failed to fetch order journey metrics', true);
    }
  };

  const handleRetryOrder = async (orderId: string) => {
    setRetryLoading(true);
    try {
      await api.post('/admin/orders/retry', { order_id: orderId });
      notify('Order processing retried successfully!');
      fetchOrderJourneyDetails(orderId);
      fetchOrders();
    } catch (e: any) {
      notify(e.response?.data?.detail || 'Retry execution failed', true);
    } finally {
      setRetryLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      await api.post('/admin/orders/cancel', { order_id: orderId });
      notify('Order cancelled.');
      fetchOrderJourneyDetails(orderId);
      fetchOrders();
    } catch (e: any) {
      notify('Failed to cancel order', true);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOrders();
      fetchTrackerLogs();
      checkHealth();
    }
  }, [user]);

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.id.toLowerCase().includes(orderSearch.toLowerCase()) || 
                          (o.msisdn && o.msisdn.includes(orderSearch));
    const matchesStatus = !orderSearchStatus || o.status === orderSearchStatus;
    return matchesSearch && matchesStatus;
  });

  const allowedRoles = ['OPERATIONS_ADMIN', 'SYSTEM_ADMIN', 'SUPER_ADMIN', 'admin'];
  const isAuthorized = user && (allowedRoles.map(r => r.toUpperCase()).includes(user.role.toUpperCase()) || user.role.toUpperCase() === 'ADMIN');

  if (!user || !isAuthorized) {
    return (
      <AdminLogin
        portalName="OMS"
        themeClass="theme-portal-purple"
        allowedRoles={allowedRoles}
        onLoginSuccess={checkAuth}
      />
    );
  }

  return (
    <div className="theme-portal-purple min-h-screen bg-brand-bg text-brand-text flex flex-col font-sans">
      <Navbar />

      <div className="max-w-7xl w-full mx-auto px-4 py-8 flex-grow grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Sidebar Navigation */}
        <aside className="lg:col-span-1 border-4 border-brand-primary bg-white p-6 neo-brutal-shadow flex flex-col justify-between">
          <div className="space-y-6">
            <h3 className="font-headline font-black uppercase text-lg text-brand-primary border-b-2 border-brand-primary pb-2">
              OMS Portal
            </h3>
            
            <nav className="flex flex-col gap-2">
              {[
                { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
                { id: 'orders', label: 'Active Orders', icon: ShoppingBag },
                { id: 'system-tracker', label: 'Flow Telemetry', icon: Network },
                { id: 'health', label: 'Service Health', icon: Activity },
                { id: 'audit', label: 'System Audit', icon: FileText }
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
                <MetricCard label="Failed Orders" value={orders.filter(o => o.status === 'FAILED').length} sub="Needs troubleshooting" accent />
                <MetricCard label="Pending Orders" value={orders.filter(o => o.status === 'PENDING').length} sub="Currently processing" />
                <MetricCard label="Confirmed Orders" value={orders.filter(o => o.status === 'CONFIRMED').length} sub="Successfully completed" accent />
              </div>
              
              <div className="border-4 border-brand-primary bg-white p-6 neo-brutal-shadow">
                <SectionHeader title="Operations Quick Actions" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Btn variant="primary" size="md" className="justify-center py-4" onClick={() => setActiveTab('orders')}>
                    View Failed / Pending Orders
                  </Btn>
                  <Btn variant="outline" size="md" className="justify-center py-4" onClick={() => setActiveTab('system-tracker')}>
                    Run Integration Flow Diagnostics
                  </Btn>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Active Orders */}
          {activeTab === 'orders' && (
            <div className="border-4 border-brand-primary bg-white p-6 neo-brutal-shadow space-y-4">
              <SectionHeader title={`Orders Pipeline Management (${filteredOrders.length})`}
                action={<Btn variant="outline" onClick={fetchOrders}><RefreshCw className="w-3.5 h-3.5" />Refresh</Btn>} />
              
              <div className="flex flex-wrap gap-3">
                <input
                  type="text"
                  value={orderSearch}
                  onChange={e => setOrderSearch(e.target.value)}
                  placeholder="Search by Order ID or Reserved Mobile..."
                  className="border-2 border-brand-primary py-2 px-3 text-xs flex-1 min-w-[200px] outline-none bg-white font-sans"
                />
                <select
                  value={orderSearchStatus}
                  onChange={e => setOrderSearchStatus(e.target.value)}
                  className="border-2 border-brand-primary py-2 px-3 text-xs font-headline font-bold uppercase bg-white outline-none"
                >
                  <option value="">All Orders</option>
                  <option value="PENDING">Pending</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>

              <div className="overflow-x-auto border-2 border-brand-primary">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b-2 border-brand-primary bg-slate-50 font-headline uppercase text-[10px] text-slate-500">
                      <th className="p-3">Order ID</th>
                      <th className="p-3">User ID</th>
                      <th className="p-3">Reserved No</th>
                      <th className="p-3">Total Amount</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Execution Steps</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-400 uppercase font-headline font-black border-t border-brand-primary">No orders match filter query.</td>
                      </tr>
                    ) : (
                      filteredOrders.map(o => (
                        <tr key={o.id} className="border-b border-brand-primary hover:bg-brand-surface-low transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-400">{o.id}</td>
                          <td className="p-3 font-mono">#{o.user_id}</td>
                          <td className="p-3 font-mono font-bold text-brand-secondary">{o.msisdn || '—'}</td>
                          <td className="p-3 font-bold">{o.total_amount} INR</td>
                          <td className="p-3"><StatusBadge status={o.status} /></td>
                          <td className="p-3">
                            <Btn variant="outline" size="sm" onClick={() => fetchOrderJourneyDetails(o.id)}>
                              <span>Journey Visualizer</span>
                              <ChevronRight className="w-3 h-3" />
                            </Btn>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Flow Telemetry logs */}
          {activeTab === 'system-tracker' && (
            <div className="border-4 border-brand-primary bg-white p-6 neo-brutal-shadow space-y-6">
              <SectionHeader title="Order Execution Flow Telemetry Logs"
                action={<Btn variant="primary" onClick={fetchTrackerLogs} disabled={trackerLoading}>{trackerLoading ? 'Loading...' : 'Refresh Logs'}</Btn>} />
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border-2 border-brand-primary bg-slate-50">
                <div>
                  <label className="block text-[9px] font-headline font-black uppercase text-slate-400 mb-1">Order ID</label>
                  <input type="text" placeholder="ORD..." value={trackerSearchOrderId} onChange={e => setTrackerSearchOrderId(e.target.value)}
                    className="w-full border-2 border-brand-primary p-2 text-xs font-sans bg-white outline-none" />
                </div>
                <div>
                  <label className="block text-[9px] font-headline font-black uppercase text-slate-400 mb-1">Customer ID</label>
                  <input type="text" placeholder="1" value={trackerSearchCustomerId} onChange={e => setTrackerSearchCustomerId(e.target.value)}
                    className="w-full border-2 border-brand-primary p-2 text-xs font-sans bg-white outline-none" />
                </div>
                <div>
                  <label className="block text-[9px] font-headline font-black uppercase text-slate-400 mb-1">MSISDN</label>
                  <input type="text" placeholder="98765..." value={trackerSearchMsisdn} onChange={e => setTrackerSearchMsisdn(e.target.value)}
                    className="w-full border-2 border-brand-primary p-2 text-xs font-sans bg-white outline-none" />
                </div>
                <div>
                  <label className="block text-[9px] font-headline font-black uppercase text-slate-400 mb-1">Service</label>
                  <select value={trackerSearchServiceName} onChange={e => setTrackerSearchServiceName(e.target.value)}
                    className="w-full border-2 border-brand-primary p-2 text-xs font-headline font-bold bg-white outline-none">
                    <option value="">All Services</option>
                    <option value="order-service">order-service</option>
                    <option value="sim-service">sim-service</option>
                    <option value="wallet-service">wallet-service</option>
                    <option value="plan-service">plan-service</option>
                  </select>
                </div>
              </div>

              <div className="border-2 border-brand-primary divide-y-2 divide-brand-primary">
                {trackerLogs.length === 0 ? (
                  <p className="p-8 text-center text-slate-400 font-headline font-black uppercase">No telemetry entries found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-slate-50 border-b-2 border-brand-primary text-[10px] font-headline font-black uppercase text-slate-500">
                          <th className="p-3">Log ID</th>
                          <th className="p-3">Order ID</th>
                          <th className="p-3">Service</th>
                          <th className="p-3">API Flow</th>
                          <th className="p-3">Latency</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Execution Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trackerLogs.map(log => (
                          <tr key={log.id} className="border-b border-brand-primary hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-mono font-bold text-slate-400">#{log.id}</td>
                            <td className="p-3 font-mono">{log.order_id}</td>
                            <td className="p-3 font-mono font-bold text-brand-primary">{log.service_name}</td>
                            <td className="p-3 font-mono">{log.api_name}</td>
                            <td className="p-3 font-mono font-bold text-emerald-600">{log.execution_time.toFixed(1)} ms</td>
                            <td className="p-3"><StatusBadge status={log.status} /></td>
                            <td className="p-3 text-[10px] text-slate-500 font-mono">{new Date(log.created_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 4: Health Diagnostics */}
          {activeTab === 'health' && (
            <div className="border-4 border-brand-primary bg-white p-6 neo-brutal-shadow space-y-4">
              <SectionHeader title="Microservices Diagnostics Dashboard"
                action={<Btn variant="primary" onClick={checkHealth} disabled={healthLoading}>{healthLoading ? 'Testing...' : 'Test Connection'}</Btn>} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {healthStatus.map((service, idx) => (
                  <div key={idx} className="border-2 border-brand-primary p-4 bg-white flex justify-between items-center">
                    <div>
                      <p className="font-headline font-black text-sm uppercase text-brand-primary">{service.name}</p>
                      <p className="text-[10px] text-slate-400 font-sans mt-0.5">{service.note}</p>
                    </div>
                    <StatusBadge status={service.status} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 5: Audit logs */}
          {activeTab === 'audit' && (
            <div className="border-4 border-brand-primary bg-white p-6 neo-brutal-shadow space-y-4">
              <SectionHeader title="Administrative Action Audit Log" />
              <p className="text-xs text-slate-500 font-sans leading-tight mb-4">
                Security compliance audit log recording actions executed by logged-in staff members.
              </p>
              
              <div className="border-2 border-brand-primary divide-y-2 divide-brand-primary bg-brand-surface-low">
                {[
                  { user: 'Operations Admin', action: 'Triggered Order Retry', ref: 'ORD-162985392', time: '10m ago' },
                  { user: 'Support Agent', action: 'Modified Customer profile notes', ref: 'CUST-12', time: '4h ago' },
                  { user: 'Inventory Admin', action: 'Uploaded new SIM ICCID batches', ref: 'SIM-Stock-Delhi.csv', time: '1d ago' }
                ].map((item, idx) => (
                  <div key={idx} className="p-4 flex justify-between items-center bg-white text-xs">
                    <div>
                      <p className="font-headline font-black uppercase text-slate-600">{item.action}</p>
                      <p className="text-[10px] text-slate-400 font-sans mt-0.5">Author: {item.user} · Target: <span className="font-mono text-brand-secondary">{item.ref}</span></p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>

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
              {/* Status Header */}
              <div className="flex justify-between items-center border-2 border-brand-primary p-4 bg-slate-50">
                <div>
                  <p className="text-[9px] font-headline font-black text-slate-400 uppercase">Order status</p>
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

              {/* Steps processing list */}
              <div className="space-y-4">
                <p className="font-headline font-black text-xs uppercase text-brand-primary">Lifecycle Processing Steps</p>
                
                <div className="relative border-l-4 border-brand-primary ml-4 pl-6 space-y-6">
                  {(() => {
                    const steps = [
                      { name: 'Customer Validation', sys: 'auth-service' },
                      { name: 'MSISDN Reserved', sys: 'sim-service' },
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
                                <pre className="bg-slate-50 p-2 mt-1 border border-slate-200 overflow-x-auto text-[9px] leading-tight max-h-40">
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

const OMSApp: React.FC = () => {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <OMSMainApp />
        </Router>
      </CartProvider>
    </AuthProvider>
  );
};

export default OMSApp;
