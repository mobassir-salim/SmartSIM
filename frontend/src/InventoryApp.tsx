import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { BrowserRouter as Router } from 'react-router-dom';
import AdminLogin from './components/AdminLogin';
import api from './services/api';
import {
  Server, Cpu, CreditCard, LayoutDashboard,
  Search, Eye, X, RefreshCw, Plus, Loader2, ArrowRight, Check, AlertCircle, Ban, CheckCircle2, Trash2
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
    AVAILABLE: 'bg-green-100 text-green-700 border-green-500',
    RESERVED: 'bg-yellow-100 text-yellow-700 border-yellow-500',
    ALLOCATED: 'bg-blue-100 text-blue-700 border-blue-500',
    ACTIVATED: 'bg-green-100 text-green-700 border-green-500',
    BLOCKED: 'bg-red-100 text-red-700 border-red-500',
    LOST: 'bg-red-100 text-red-700 border-red-500',
    PREPAID: 'bg-purple-100 text-purple-700 border-purple-500',
    POSTPAID: 'bg-indigo-100 text-indigo-700 border-indigo-500',
    active: 'bg-green-100 text-green-700 border-green-500',
    inactive: 'bg-red-100 text-red-700 border-red-500'
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

const InventoryMainApp: React.FC = () => {
  const { user, checkAuth } = useAuth();
  
  type TabId = 'overview' | 'sim-inventory' | 'sims' | 'plans';
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Catalog states
  const [sims, setSims] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);

  // Inventory states
  const [inventoryStats, setInventoryStats] = useState<any>({ total: 0, available: 0, reserved: 0, activated: 0, blocked: 0, lost: 0 });
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventorySearchType, setInventorySearchType] = useState<'iccid' | 'imsi' | 'msisdn' | 'status'>('iccid');
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState('');
  
  // CSV Upload status
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  // Number CSV Upload status
  const [numUploadLoading, setNumUploadLoading] = useState(false);
  const [numUploadResult, setNumUploadResult] = useState<any>(null);

  // Modals state
  const [simModal, setSimModal] = useState<'add' | 'edit' | null>(null);
  const [planModal, setPlanModal] = useState<'add' | 'edit' | null>(null);
  const [simForm, setSimForm] = useState({ id: 0, name: '', type: 'physical', price: '', description: '', iccid_prefix: '' });
  const [planForm, setPlanForm] = useState({ id: 0, name: '', price: '', data_gb: '', validity_days: '', type: 'data', description: '' });

  const notify = (msg: string, isErr = false) => {
    if (isErr) { setErrorMsg(msg); setTimeout(() => setErrorMsg(''), 4000); }
    else { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 4000); }
  };

  const fetchInventoryStats = async () => {
    try {
      const res = await api.get('/admin/inventory');
      setInventoryStats(res.data || { total: 0, available: 0, reserved: 0, activated: 0, blocked: 0, lost: 0 });
    } catch (e: any) {
      notify('Failed to load inventory summary stats', true);
    }
  };

  const searchInventory = async () => {
    try {
      const params: any = {};
      if (inventorySearch) {
        params[inventorySearchType] = inventorySearch;
      }
      if (inventoryStatusFilter) {
        params.status = inventoryStatusFilter;
      }
      const res = await api.get('/admin/inventory/search', { params });
      setInventoryItems(res.data || []);
    } catch (e: any) {
      notify('Search failed', true);
    }
  };

  const fetchAll = useCallback(async () => {
    try {
      // Get catalogs
      const simsRes = await api.get('/sims?include_inactive=true');
      setSims(simsRes.data || []);
      const plansRes = await api.get('/plans');
      setPlans(plansRes.data || []);

      // Get stats
      fetchInventoryStats();
    } catch (e: any) {
      notify('Failed to load portal databases', true);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchAll();
      searchInventory();
    }
  }, [user, fetchAll]);

  // Bulk CSV Upload
  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadLoading(true);
    setUploadResult(null);
    setErrorMsg('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/admin/inventory/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadResult(res.data);
      notify('SIM Inventory CSV processed successfully!');
      fetchAll();
      searchInventory();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'CSV upload failed');
    } finally {
      setUploadLoading(false);
      e.target.value = '';
    }
  };

  // Bulk Mobile Number CSV Upload
  const handleNumberCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNumUploadLoading(true);
    setNumUploadResult(null);
    setErrorMsg('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/admin/inventory/numbers/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setNumUploadResult(res.data);
      notify('Number Inventory CSV processed successfully!');
      fetchAll();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'CSV upload failed');
    } finally {
      setNumUploadLoading(false);
      e.target.value = '';
    }
  };

  const assignSim = async (inventoryId: number, customerId: number) => {
    try {
      const orderId = `MANUAL-${Date.now()}`;
      await api.post('/admin/inventory/assign', {
        inventory_id: inventoryId,
        customer_id: customerId,
        order_id: orderId
      });
      notify('SIM assigned to customer successfully!');
      searchInventory();
      fetchInventoryStats();
    } catch (e: any) {
      notify(e.response?.data?.detail || 'SIM assignment failed', true);
    }
  };

  const saveSIMProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: simForm.name,
      type: simForm.type,
      price: parseFloat(simForm.price),
      description: simForm.description,
      iccid_prefix: simForm.iccid_prefix
    };

    try {
      if (simModal === 'edit') {
        await api.put(`/sims/${simForm.id}`, payload);
        notify('SIM card package details updated!');
      } else {
        await api.post('/sims', payload);
        notify('New SIM card package added to catalog!');
      }
      setSimModal(null);
      fetchAll();
    } catch (e: any) {
      notify('Failed to save SIM package product', true);
    }
  };

  const toggleSIMStatus = async (sim: any) => {
    try {
      const endpoint = sim.is_active ? `/sims/${sim.id}/deactivate` : `/sims/${sim.id}/activate`;
      await api.post(endpoint);
      notify(`SIM ${sim.is_active ? 'deactivated' : 'activated'} successfully.`);
      fetchAll();
    } catch (e: any) {
      notify('Failed to toggle SIM product status', true);
    }
  };

  const deleteSIMProduct = async (id: number) => {
    if (!window.confirm('Delete this SIM product?')) return;
    try {
      await api.delete(`/sims/${id}`);
      notify('SIM package deleted from catalog.');
      fetchAll();
    } catch (e: any) {
      notify('Failed to delete SIM product', true);
    }
  };

  const savePlanProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: planForm.name,
      price: parseFloat(planForm.price),
      data_gb: parseInt(planForm.data_gb),
      validity_days: parseInt(planForm.validity_days),
      type: planForm.type,
      description: planForm.description
    };

    try {
      if (planModal === 'edit') {
        await api.put(`/plans/${planForm.id}`, payload);
        notify('Plan details updated!');
      } else {
        await api.post('/plans', payload);
        notify('New plan added to catalog!');
      }
      setPlanModal(null);
      fetchAll();
    } catch (e: any) {
      notify('Failed to save plan product', true);
    }
  };

  const deletePlanProduct = async (id: number) => {
    if (!window.confirm('Delete this plan?')) return;
    try {
      await api.delete(`/plans/${id}`);
      notify('Plan deleted from catalog.');
      fetchAll();
    } catch (e: any) {
      notify('Failed to delete plan product', true);
    }
  };

  const allowedRoles = ['INVENTORY_ADMIN', 'SUPER_ADMIN', 'admin'];
  const isAuthorized = user && (allowedRoles.map(r => r.toUpperCase()).includes(user.role.toUpperCase()) || user.role.toUpperCase() === 'ADMIN');

  if (!user || !isAuthorized) {
    return (
      <AdminLogin
        portalName="SIM Inventory"
        themeClass="theme-portal-orange"
        allowedRoles={allowedRoles}
        onLoginSuccess={checkAuth}
      />
    );
  }

  return (
    <div className="theme-portal-orange min-h-screen bg-brand-bg text-brand-text flex flex-col font-sans">
      <Navbar />

      <div className="max-w-7xl w-full mx-auto px-4 py-8 flex-grow grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Sidebar Navigation */}
        <aside className="lg:col-span-1 border-4 border-brand-primary bg-white p-6 neo-brutal-shadow flex flex-col justify-between">
          <div className="space-y-6">
            <h3 className="font-headline font-black uppercase text-lg text-brand-primary border-b-2 border-brand-primary pb-2">
              SIM Inventory
            </h3>
            
            <nav className="flex flex-col gap-2">
              {[
                { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
                { id: 'sim-inventory', label: 'SIM Stock Ledger', icon: Server },
                { id: 'sims', label: 'SIM Catalog Mgr', icon: Cpu },
                { id: 'plans', label: 'Plan Catalog Mgr', icon: CreditCard }
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <MetricCard label="Total Stock" value={inventoryStats.total} />
                <MetricCard label="Available" value={inventoryStats.available} accent />
                <MetricCard label="Reserved" value={inventoryStats.reserved} />
                <MetricCard label="Activated" value={inventoryStats.activated} />
                <MetricCard label="Blocked" value={inventoryStats.blocked} />
                <MetricCard label="Lost / Damaged" value={inventoryStats.lost} />
              </div>
              
              <div className="border-4 border-brand-primary bg-white p-6 neo-brutal-shadow space-y-6">
                <SectionHeader title="Bulk Inventory File Uploads" />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* SIM Stock Upload */}
                  <div className="border-2 border-brand-primary p-4 space-y-4">
                    <h4 className="font-headline font-black text-sm uppercase text-brand-primary">1. Upload ICCID/IMSI Cards</h4>
                    <p className="text-xs text-slate-500 font-sans leading-tight">Select a CSV file containing columns: <code className="bg-slate-100 font-mono px-1">ICCID,IMSI,SIM_TYPE,CIRCLE</code></p>
                    <label className="block w-full">
                      <input type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} disabled={uploadLoading} />
                      <div className="w-full bg-brand-primary-container text-brand-primary border-2 border-brand-primary font-headline text-center font-black uppercase text-xs py-3 cursor-pointer">
                        {uploadLoading ? 'Uploading SIM CSV...' : 'Choose SIMs CSV File'}
                      </div>
                    </label>
                    {uploadResult && (
                      <p className="text-[10px] font-mono text-green-600 font-bold bg-green-50 p-2 border border-green-500">
                        Uploaded: {uploadResult.uploaded} | Duplicates: {uploadResult.duplicates} | Errors: {uploadResult.errors}
                      </p>
                    )}
                  </div>

                  {/* Mobile Number Upload */}
                  <div className="border-2 border-brand-primary p-4 space-y-4">
                    <h4 className="font-headline font-black text-sm uppercase text-brand-primary">2. Upload Mobile Number Pool</h4>
                    <p className="text-xs text-slate-500 font-sans leading-tight">Select a CSV file containing columns: <code className="bg-slate-100 font-mono px-1">MSISDN,CIRCLE,OPERATOR,CATEGORY</code></p>
                    <label className="block w-full">
                      <input type="file" accept=".csv" className="hidden" onChange={handleNumberCSVUpload} disabled={numUploadLoading} />
                      <div className="w-full bg-brand-primary-container text-brand-primary border-2 border-brand-primary font-headline text-center font-black uppercase text-xs py-3 cursor-pointer">
                        {numUploadLoading ? 'Uploading Numbers...' : 'Choose Numbers CSV File'}
                      </div>
                    </label>
                    {numUploadResult && (
                      <p className="text-[10px] font-mono text-green-600 font-bold bg-green-50 p-2 border border-green-500">
                        Uploaded: {numUploadResult.uploaded} | Duplicates: {numUploadResult.duplicates} | Errors: {numUploadResult.errors}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: SIM Stock Ledger */}
          {activeTab === 'sim-inventory' && (
            <div className="border-4 border-brand-primary bg-white p-6 neo-brutal-shadow space-y-4">
              <SectionHeader title="SIM Card Inventory Search" />
              
              <div className="flex flex-wrap gap-3">
                <select
                  value={inventorySearchType}
                  onChange={e => setInventorySearchType(e.target.value as any)}
                  className="border-2 border-brand-primary py-2 px-3 text-xs font-headline font-bold uppercase bg-white outline-none"
                >
                  <option value="iccid">ICCID</option>
                  <option value="imsi">IMSI</option>
                  <option value="msisdn">MSISDN</option>
                </select>
                <input
                  type="text"
                  value={inventorySearch}
                  onChange={e => setInventorySearch(e.target.value)}
                  placeholder={`Search by ${inventorySearchType.toUpperCase()}...`}
                  className="border-2 border-brand-primary py-2 px-3 text-xs flex-1 min-w-[200px] outline-none"
                  onKeyDown={e => e.key === 'Enter' && searchInventory()}
                />
                <select
                  value={inventoryStatusFilter}
                  onChange={e => setInventoryStatusFilter(e.target.value)}
                  className="border-2 border-brand-primary py-2 px-3 text-xs font-headline font-bold uppercase bg-white outline-none"
                >
                  <option value="">All Status</option>
                  <option value="AVAILABLE">Available</option>
                  <option value="RESERVED">Reserved</option>
                  <option value="ACTIVATED">Activated</option>
                  <option value="BLOCKED">Blocked</option>
                </select>
                <Btn variant="primary" size="md" onClick={searchInventory}>
                  <Search className="w-4 h-4" /> Search
                </Btn>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b-2 border-brand-primary bg-slate-50 font-headline uppercase text-[10px]">
                      <th className="p-3">ID</th>
                      <th className="p-3">ICCID</th>
                      <th className="p-3">IMSI</th>
                      <th className="p-3">SIM Type</th>
                      <th className="p-3">Circle</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400 font-headline font-bold uppercase border-t border-brand-primary">No inventory records found.</td>
                      </tr>
                    ) : (
                      inventoryItems.map(item => (
                        <tr key={item.id} className="border-b border-brand-primary hover:bg-brand-surface-low">
                          <td className="p-3 font-mono font-bold">{item.id}</td>
                          <td className="p-3 font-mono">{item.iccid}</td>
                          <td className="p-3 font-mono">{item.imsi || '—'}</td>
                          <td className="p-3"><StatusBadge status={item.sim_type || 'PREPAID'} /></td>
                          <td className="p-3 font-bold uppercase text-[10px]">{item.circle || '—'}</td>
                          <td className="p-3"><StatusBadge status={item.status} /></td>
                          <td className="p-3">
                            {(item.status === 'AVAILABLE' || item.status === 'available') && (
                              <Btn variant="success" size="sm" onClick={() => {
                                const cId = prompt('Enter Customer ID to allocate:');
                                if (cId && !isNaN(Number(cId))) assignSim(item.id, Number(cId));
                              }}>Assign</Btn>
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

          {/* Tab 3: SIM Catalog */}
          {activeTab === 'sims' && (
            <div className="border-4 border-brand-primary bg-white p-6 neo-brutal-shadow space-y-4">
              <SectionHeader title="SIM Catalog Products"
                action={<Btn variant="primary" onClick={() => { setSimForm({ id: 0, name: '', type: 'physical', price: '', description: '', iccid_prefix: '' }); setSimModal('add'); }}><Plus className="w-3.5 h-3.5" />Add Product</Btn>} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sims.map(sim => (
                  <div key={sim.id} className="border-2 border-brand-primary p-4 bg-white space-y-4 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-headline font-black uppercase tracking-wider px-2 py-0.5 border border-brand-primary bg-brand-primary-container text-brand-primary">
                          {sim.type}
                        </span>
                        <StatusBadge status={sim.is_active ? 'active' : 'inactive'} />
                      </div>
                      <h4 className="font-headline font-black text-lg uppercase tracking-tight mt-2">{sim.name}</h4>
                      <p className="text-xs text-slate-500 font-sans mt-1">{sim.description}</p>
                      <p className="font-mono text-xs font-bold text-slate-400 mt-2">ICCID Prefix: {sim.iccid_prefix}</p>
                    </div>
                    <div className="border-t border-brand-primary pt-3 flex justify-between items-center">
                      <span className="font-headline font-black text-xl">{sim.price} INR</span>
                      <div className="flex gap-2">
                        <Btn variant="outline" size="sm" onClick={() => { setSimForm({ id: sim.id, name: sim.name, type: sim.type, price: String(sim.price), description: sim.description || '', iccid_prefix: sim.iccid_prefix }); setSimModal('edit'); }}>Edit</Btn>
                        <Btn variant="warning" size="sm" onClick={() => toggleSIMStatus(sim)}>{sim.is_active ? 'Deactivate' : 'Activate'}</Btn>
                        <Btn variant="danger" size="sm" onClick={() => deleteSIMProduct(sim.id)}><Trash2 className="w-3 h-3" /></Btn>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 4: Plan Catalog */}
          {activeTab === 'plans' && (
            <div className="border-4 border-brand-primary bg-white p-6 neo-brutal-shadow space-y-4">
              <SectionHeader title="Data & Calling Plans"
                action={<Btn variant="primary" onClick={() => { setPlanForm({ id: 0, name: '', price: '', data_gb: '', validity_days: '', type: 'data', description: '' }); setPlanModal('add'); }}><Plus className="w-3.5 h-3.5" />Add Plan</Btn>} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {plans.map(plan => (
                  <div key={plan.id} className="border-2 border-brand-primary p-4 bg-white space-y-4 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-headline font-black uppercase tracking-wider px-2 py-0.5 border border-brand-primary bg-brand-primary-container text-brand-primary">
                          {plan.type}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">{plan.validity_days} Days Validity</span>
                      </div>
                      <h4 className="font-headline font-black text-lg uppercase tracking-tight mt-2">{plan.name}</h4>
                      <p className="text-xs text-slate-500 font-sans mt-1">{plan.description}</p>
                      <p className="font-sans text-xs font-bold text-slate-500 mt-2">Data Allowance: {plan.data_gb} GB</p>
                    </div>
                    <div className="border-t border-brand-primary pt-3 flex justify-between items-center">
                      <span className="font-headline font-black text-xl">{plan.price} INR</span>
                      <div className="flex gap-2">
                        <Btn variant="outline" size="sm" onClick={() => { setPlanForm({ id: plan.id, name: plan.name, price: String(plan.price), data_gb: String(plan.data_gb), validity_days: String(plan.validity_days), type: plan.type, description: plan.description || '' }); setPlanModal('edit'); }}>Edit</Btn>
                        <Btn variant="danger" size="sm" onClick={() => deletePlanProduct(plan.id)}><Trash2 className="w-3 h-3" /></Btn>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Add/Edit SIM Product Modal */}
      {simModal && (
        <Modal title={simModal === 'edit' ? 'Edit SIM Product' : 'Add New SIM Product'} onClose={() => setSimModal(null)}>
          <form onSubmit={saveSIMProduct} className="space-y-4">
            <InputField label="Product Name" required value={simForm.name} onChange={(e: any) => setSimForm({ ...simForm, name: e.target.value })} placeholder="e.g. Premium 5G physical SIM" />
            <InputField label="Product Type" type="select" value={simForm.type} onChange={(e: any) => setSimForm({ ...simForm, type: e.target.value })}>
              <option value="physical">Physical SIM Card</option>
              <option value="esim">eSIM Profile</option>
            </InputField>
            <InputField label="Price (INR)" required type="number" step="0.01" value={simForm.price} onChange={(e: any) => setSimForm({ ...simForm, price: e.target.value })} placeholder="e.g. 150.00" />
            <InputField label="ICCID Range Prefix" required value={simForm.iccid_prefix} onChange={(e: any) => setSimForm({ ...simForm, iccid_prefix: e.target.value })} placeholder="e.g. 8991" />
            <InputField label="Product Description" type="textarea" value={simForm.description} onChange={(e: any) => setSimForm({ ...simForm, description: e.target.value })} placeholder="Write product brief description..." />
            
            <Btn variant="primary" size="lg" className="w-full justify-center">Save Product</Btn>
          </form>
        </Modal>
      )}

      {/* Add/Edit Plan Modal */}
      {planModal && (
        <Modal title={planModal === 'edit' ? 'Edit Plan Product' : 'Add New Plan Product'} onClose={() => setPlanModal(null)}>
          <form onSubmit={savePlanProduct} className="space-y-4">
            <InputField label="Plan Name" required value={planForm.name} onChange={(e: any) => setPlanForm({ ...planForm, name: e.target.value })} placeholder="e.g. 100GB Monthly Superpack" />
            <InputField label="Price (INR)" required type="number" step="0.01" value={planForm.price} onChange={(e: any) => setPlanForm({ ...planForm, price: e.target.value })} placeholder="e.g. 499.00" />
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Data Allowance (GB)" required type="number" value={planForm.data_gb} onChange={(e: any) => setPlanForm({ ...planForm, data_gb: e.target.value })} placeholder="e.g. 100" />
              <InputField label="Validity (Days)" required type="number" value={planForm.validity_days} onChange={(e: any) => setPlanForm({ ...planForm, validity_days: e.target.value })} placeholder="e.g. 30" />
            </div>
            <InputField label="Plan Type" type="select" value={planForm.type} onChange={(e: any) => setPlanForm({ ...planForm, type: e.target.value })}>
              <option value="data">Data only</option>
              <option value="voice">Voice pack</option>
              <option value="combo">Combo Plan</option>
            </InputField>
            <InputField label="Plan Description" type="textarea" value={planForm.description} onChange={(e: any) => setPlanForm({ ...planForm, description: e.target.value })} placeholder="Brief details about the plan..." />
            
            <Btn variant="primary" size="lg" className="w-full justify-center">Save Plan</Btn>
          </form>
        </Modal>
      )}

    </div>
  );
};

const InventoryApp: React.FC = () => {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <InventoryMainApp />
        </Router>
      </CartProvider>
    </AuthProvider>
  );
};

export default InventoryApp;
