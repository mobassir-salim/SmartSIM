import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { ShoppingCart, LogOut, X, Minus, Plus, Trash2 } from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { cart, removeFromCart, updateQuantity, clearCart, cartCount, cartTotal } = useCart();

  const [showCart, setShowCart] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleCartCheckout = async () => {
    if (cart.length === 0) return;
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login', { state: { from: location } });
      return;
    }

    setCheckoutLoading(true);
    setCheckoutMessage('');

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          items: cart.map((item) => ({
            item_type: item.type,
            item_id: item.id,
            quantity: item.quantity
          }))
        })
      });

      const data = await res.json();

      if (res.ok) {
        setCheckoutMessage('✅ Checkout successful! Order confirmed.');
        clearCart();
        setTimeout(() => {
          setShowCart(false);
          setCheckoutMessage('');
          if (location.pathname === '/dashboard') {
            window.location.reload();
          } else {
            navigate('/dashboard');
          }
        }, 1500);
      } else if (res.status === 402) {
        setCheckoutMessage('❌ Insufficient wallet balance. Please top up.');
      } else {
        setCheckoutMessage(`❌ Checkout failed: ${data.detail || 'Unknown error'}`);
      }
    } catch (err) {
      setCheckoutMessage('❌ Network error during checkout. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <>
      <header className="border-b-4 border-brand-primary bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 decoration-none">
            <div className="h-10 w-10 bg-brand-primary-container border-2 border-brand-primary flex items-center justify-center font-headline font-black text-xl text-brand-primary">
              S
            </div>
            <span className="font-headline font-black text-2xl tracking-tighter text-brand-primary uppercase">
              Smart<span className="text-brand-secondary">SIM</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 font-headline font-black text-sm uppercase tracking-wide">
            <Link to="/" className="text-brand-primary hover:text-brand-secondary transition-colors">Home</Link>
            <Link to="/sims" className="text-brand-primary hover:text-brand-secondary transition-colors">SIM Catalog</Link>
            <Link to="/plans" className="text-brand-primary hover:text-brand-secondary transition-colors">Plan Catalog</Link>
            {user && (
              <Link to="/dashboard" className="text-brand-primary hover:text-brand-secondary transition-colors">Dashboard</Link>
            )}
            {user && user.role === 'admin' && (
              <Link to="/admin" className="text-brand-secondary hover:text-brand-secondary/80 transition-colors font-extrabold bg-brand-primary-container/30 px-2 py-1 border border-brand-secondary">Admin Panel</Link>
            )}
          </nav>

          <div className="flex items-center gap-4">
            {/* Cart Trigger */}
            <button
              onClick={() => setShowCart(true)}
              className="relative p-2.5 border-2 border-brand-primary bg-brand-primary-container text-brand-primary hover:bg-brand-primary hover:text-white transition-colors cursor-pointer"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-brand-secondary text-white font-headline font-black text-[9px] px-1.5 py-0.5 border-2 border-brand-primary rounded-none min-w-[20px] text-center">
                  {cartCount}
                </span>
              )}
            </button>

            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-xs font-headline font-black uppercase text-brand-primary hidden sm:inline">
                  Hello, <span className="text-brand-secondary">{user.name}</span>
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-xs font-headline font-black uppercase bg-brand-surface-low hover:bg-brand-primary-container text-brand-primary px-4 py-2.5 border-2 border-brand-primary neo-brutal-shadow-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4 font-black" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-xs font-headline font-black uppercase text-brand-primary hover:bg-brand-primary-container px-3 py-2 transition-all"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="text-xs font-headline font-black uppercase bg-brand-primary-container text-brand-primary px-4 py-2.5 border-2 border-brand-primary neo-brutal-shadow-sm hover:bg-brand-primary hover:text-white transition-all"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Cart Modal Drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white border-4 border-brand-primary neo-brutal-shadow w-full max-w-md mx-4 p-6 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 pb-2 border-b-4 border-brand-primary">
              <h3 className="font-headline font-black uppercase text-xl text-brand-primary flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                <span>Shopping Cart</span>
              </h3>
              <button
                onClick={() => { setShowCart(false); setCheckoutMessage(''); }}
                className="border-2 border-brand-primary p-1 hover:bg-brand-primary-container transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto mb-6 space-y-4 pr-1">
              {cart.length === 0 ? (
                <div className="border-4 border-brand-primary bg-brand-surface-low border-dashed p-8 text-center text-brand-text font-headline font-black uppercase tracking-wider text-sm">
                  Your cart is empty.
                </div>
              ) : (
                <div className="divide-y-2 divide-brand-primary border-4 border-brand-primary bg-white">
                  {cart.map((item) => (
                    <div key={`${item.type}-${item.id}`} className="flex items-center justify-between p-4 gap-4">
                      <div className="flex-grow">
                        <span className="text-[9px] font-headline font-black uppercase tracking-wider px-1.5 py-0.5 border border-brand-primary bg-brand-primary-container text-brand-primary">
                          {item.type}
                        </span>
                        <h4 className="font-headline font-black text-brand-text text-sm uppercase tracking-tight mt-1 leading-none">
                          {item.name}
                        </h4>
                        <p className="font-mono text-xs text-brand-primary mt-1">
                          {item.price.toFixed(2)} BDT
                        </p>
                      </div>

                      <div className="flex items-center border-2 border-brand-primary bg-white">
                        <button
                          onClick={() => updateQuantity(item.id, item.type, item.quantity - 1)}
                          className="px-2 py-1 font-black hover:bg-brand-primary-container transition-colors cursor-pointer border-r-2 border-brand-primary"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-3 font-headline font-black text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.type, item.quantity + 1)}
                          className="px-2 py-1 font-black hover:bg-brand-primary-container transition-colors cursor-pointer border-l-2 border-brand-primary"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.id, item.type)}
                        className="border-2 border-brand-primary p-1.5 hover:bg-red-100 text-red-500 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t-4 border-brand-primary pt-4 mb-4">
                <div className="flex justify-between items-center mb-4 font-headline font-black text-lg">
                  <span className="uppercase text-slate-400">Total:</span>
                  <span className="text-brand-primary text-2xl">{cartTotal.toFixed(2)} BDT</span>
                </div>
                {checkoutMessage && (
                  <p className="text-xs font-headline font-black mb-4 text-center">{checkoutMessage}</p>
                )}
                <div className="flex gap-4">
                  <button
                    onClick={clearCart}
                    disabled={checkoutLoading}
                    className="flex-1 bg-white hover:bg-red-50 text-red-500 border-4 border-brand-primary font-headline font-black py-3 uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50"
                  >
                    Clear Cart
                  </button>
                  <button
                    onClick={handleCartCheckout}
                    disabled={checkoutLoading}
                    className="flex-1 bg-brand-primary text-white hover:bg-brand-primary/90 border-4 border-brand-primary font-headline font-black py-3 uppercase tracking-widest neo-brutal-shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {checkoutLoading ? 'Checking out...' : 'Checkout'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
