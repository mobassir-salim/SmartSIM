import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ShieldCheck, AlertCircle, ShoppingBag, ArrowLeft, Loader2 } from 'lucide-react';

const KYCForm: React.FC = () => {
  const { cart, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();

  // Redirect check states
  const hasSim = cart.some(item => item.type === 'SIM');
  const reservedMsisdn = sessionStorage.getItem('reserved_msisdn');

  // Form fields state
  const [formData, setFormData] = useState({
    father_name: '',
    dob: '',
    gender: 'Male',
    alternate_mobile: '',
    address: '',
    city: '',
    state: '',
    pin_code: '',
    country: 'Bangladesh',
    id_type: 'Aadhaar',
    id_number: '',
    id_issue_date: '',
    id_expiry_date: ''
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Safeguards & Reservation Verification
  useEffect(() => {
    if (!hasSim) {
      navigate('/sims');
      return;
    }

    if (!sessionStorage.getItem('reserved_msisdn')) {
      navigate('/customer/select-number');
      return;
    }

    const verifyAndSync = async () => {
      try {
        const res = await api.get('/numbers/active-reservation');
        if (res.data && res.data.msisdn) {
          sessionStorage.setItem('reserved_msisdn', res.data.msisdn);
          sessionStorage.setItem('reserved_expiry', res.data.reservation_expiry);
        } else {
          sessionStorage.removeItem('reserved_msisdn');
          sessionStorage.removeItem('reserved_expiry');
          navigate('/customer/select-number');
        }
      } catch (err) {
        console.error('Failed to verify active reservation:', err);
      }
    };

    verifyAndSync();
  }, [hasSim]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reservedMsisdn) return;

    setLoading(true);
    setError('');
    setSuccess('');

    // Clean up empty optional fields
    const customerInfo: any = {
      dob: formData.dob,
      gender: formData.gender,
      alternate_mobile: formData.alternate_mobile,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      pin_code: formData.pin_code,
      country: formData.country,
      id_type: formData.id_type,
      id_number: formData.id_number
    };

    if (formData.father_name.trim()) customerInfo.father_name = formData.father_name;
    if (formData.id_issue_date) customerInfo.id_issue_date = formData.id_issue_date;
    if (formData.id_expiry_date) customerInfo.id_expiry_date = formData.id_expiry_date;

    try {
      const payload = {
        items: cart.map(item => ({
          item_type: item.type,
          item_id: item.id,
          quantity: item.quantity
        })),
        msisdn: reservedMsisdn,
        customer_info: customerInfo
      };

      const res = await api.post('/orders', payload);
      
      setSuccess('🎉 Order placed successfully! Your SIM is being activated.');
      clearCart();
      sessionStorage.removeItem('reserved_msisdn');
      sessionStorage.removeItem('reserved_expiry');

      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      if (err.response?.status === 402) {
        setError('❌ Insufficient wallet balance. Please add funds to your wallet and try again.');
      } else {
        setError(err.response?.data?.detail || 'Order checkout failed. Please check your KYC details.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!hasSim || !reservedMsisdn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col font-sans theme-portal-blue">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-12 flex-grow w-full">
        {/* Navigation Link back */}
        <button
          onClick={() => navigate('/customer/select-number')}
          className="mb-6 flex items-center gap-1.5 font-headline font-black text-xs uppercase text-slate-500 hover:text-brand-primary cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Number Selection</span>
        </button>

        {/* Page Header */}
        <div className="mb-10 border-4 border-brand-primary bg-brand-primary-container p-8 neo-brutal-shadow rounded-none relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-brand-secondary border-b-4 border-l-4 border-brand-primary"></div>
          <h1 className="text-3xl font-headline font-black text-brand-primary uppercase mb-2 tracking-tight">
            Customer KYC Verification
          </h1>
          <p className="font-sans text-xs max-w-xl font-semibold opacity-90">
            Please fill out your identity verification details to activate the SIM card and complete order placement.
          </p>
        </div>

        {/* Summary Banner */}
        <div className="mb-8 p-5 border-4 border-brand-primary bg-white neo-brutal-shadow flex justify-between items-center">
          <div className="font-headline font-black text-sm uppercase">
            <span className="text-slate-400 block text-[10px]">Reserved Number</span>
            <span className="text-brand-primary text-lg">+91 {reservedMsisdn}</span>
          </div>
          <div className="font-headline font-black text-sm uppercase text-right">
            <span className="text-slate-400 block text-[10px]">Order Total</span>
            <span className="text-brand-primary text-xl">{cartTotal.toFixed(2)} INR</span>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 border-4 border-brand-primary bg-red-100 text-red-800 font-headline font-black text-xs uppercase flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-8 p-4 border-4 border-brand-primary bg-green-100 text-green-800 font-headline font-black text-xs uppercase flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            <span>{success}</span>
          </div>
        )}

        {/* KYC Form */}
        <form onSubmit={handleSubmit} className="border-4 border-brand-primary bg-white p-8 neo-brutal-shadow space-y-8">
          
          {/* Section 1: Basic Information */}
          <div>
            <h3 className="font-headline font-black uppercase text-sm text-brand-primary mb-4 pb-2 border-b-2 border-brand-primary">
              1. Basic Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-headline font-black uppercase text-slate-400 mb-2">Father's Name (Optional)</label>
                <input
                  type="text"
                  name="father_name"
                  value={formData.father_name}
                  onChange={handleChange}
                  placeholder="Father's full name"
                  className="w-full py-2.5 px-3 border-2 border-brand-primary bg-white font-sans text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-headline font-black uppercase text-slate-400 mb-2">Date of Birth *</label>
                <input
                  type="date"
                  name="dob"
                  required
                  value={formData.dob}
                  onChange={handleChange}
                  className="w-full py-2.5 px-3 border-2 border-brand-primary bg-white font-headline text-xs font-black uppercase outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-headline font-black uppercase text-slate-400 mb-2">Gender *</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full py-2.5 px-3 border-2 border-brand-primary bg-white font-headline text-xs font-black uppercase outline-none"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-headline font-black uppercase text-slate-400 mb-2">Alternate Mobile Number *</label>
                <input
                  type="tel"
                  name="alternate_mobile"
                  required
                  pattern="[0-9]{10,15}"
                  value={formData.alternate_mobile}
                  onChange={handleChange}
                  placeholder="e.g. 01712345678"
                  className="w-full py-2.5 px-3 border-2 border-brand-primary bg-white font-sans text-xs outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Address Information */}
          <div>
            <h3 className="font-headline font-black uppercase text-sm text-brand-primary mb-4 pb-2 border-b-2 border-brand-primary">
              2. Address Details
            </h3>

            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-headline font-black uppercase text-slate-400 mb-2">Permanent Address *</label>
                <input
                  type="text"
                  name="address"
                  required
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="House #, Street, Area name"
                  className="w-full py-2.5 px-3 border-2 border-brand-primary bg-white font-sans text-xs outline-none"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="col-span-1">
                  <label className="block text-[10px] font-headline font-black uppercase text-slate-400 mb-2">City *</label>
                  <input
                    type="text"
                    name="city"
                    required
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full py-2.5 px-3 border-2 border-brand-primary bg-white font-sans text-xs outline-none"
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-[10px] font-headline font-black uppercase text-slate-400 mb-2">State *</label>
                  <input
                    type="text"
                    name="state"
                    required
                    value={formData.state}
                    onChange={handleChange}
                    className="w-full py-2.5 px-3 border-2 border-brand-primary bg-white font-sans text-xs outline-none"
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-[10px] font-headline font-black uppercase text-slate-400 mb-2">PIN / Zip Code *</label>
                  <input
                    type="text"
                    name="pin_code"
                    required
                    value={formData.pin_code}
                    onChange={handleChange}
                    className="w-full py-2.5 px-3 border-2 border-brand-primary bg-white font-sans text-xs outline-none"
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-[10px] font-headline font-black uppercase text-slate-400 mb-2">Country *</label>
                  <input
                    type="text"
                    name="country"
                    required
                    value={formData.country}
                    onChange={handleChange}
                    className="w-full py-2.5 px-3 border-2 border-brand-primary bg-white font-sans text-xs outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Identity Document Verification */}
          <div>
            <h3 className="font-headline font-black uppercase text-sm text-brand-primary mb-4 pb-2 border-b-2 border-brand-primary">
              3. Identity Verification
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-[10px] font-headline font-black uppercase text-slate-400 mb-2">ID Proof Type *</label>
                <select
                  name="id_type"
                  value={formData.id_type}
                  onChange={handleChange}
                  className="w-full py-2.5 px-3 border-2 border-brand-primary bg-white font-headline text-xs font-black uppercase outline-none"
                >
                  <option value="Aadhaar">Aadhaar</option>
                  <option value="PAN">PAN Card</option>
                  <option value="Passport">Passport</option>
                  <option value="Driving License">Driving License</option>
                  <option value="Voter ID">Voter ID</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-headline font-black uppercase text-slate-400 mb-2">ID Card / Document Number *</label>
                <input
                  type="text"
                  name="id_number"
                  required
                  value={formData.id_number}
                  onChange={handleChange}
                  placeholder="Provide correct document ID number"
                  className="w-full py-2.5 px-3 border-2 border-brand-primary bg-white font-sans text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-headline font-black uppercase text-slate-400 mb-2">Issue Date (Optional)</label>
                <input
                  type="date"
                  name="id_issue_date"
                  value={formData.id_issue_date}
                  onChange={handleChange}
                  className="w-full py-2.5 px-3 border-2 border-brand-primary bg-white font-headline text-xs font-black uppercase outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-headline font-black uppercase text-slate-400 mb-2">Expiry Date (Optional)</label>
                <input
                  type="date"
                  name="id_expiry_date"
                  value={formData.id_expiry_date}
                  onChange={handleChange}
                  className="w-full py-2.5 px-3 border-2 border-brand-primary bg-white font-headline text-xs font-black uppercase outline-none"
                />
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="border-t-4 border-brand-primary pt-6 flex justify-between items-center gap-4">
            <p className="text-[11px] font-sans text-slate-400 leading-tight max-w-sm">
              By submitting this form, you certify that the provided information matches your official documents and agree to verify your identity.
            </p>
            <button
              type="submit"
              disabled={loading}
              className="bg-brand-primary text-white hover:bg-brand-primary/95 border-4 border-brand-primary font-headline text-sm font-black uppercase tracking-wider py-4 px-8 flex items-center gap-2 cursor-pointer disabled:opacity-50 neo-brutal-shadow-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-5 h-5" />
                  <span>Place Order & Pay</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default KYCForm;
