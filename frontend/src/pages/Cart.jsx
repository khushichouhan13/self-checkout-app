import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { updateQuantity, removeFromCart, clearCart } from '../redux/cartSlice.js';
import API from '../services/api.js';
import { Trash2, ShoppingBag, Plus, Minus, Tag, Check, AlertTriangle, CreditCard } from 'lucide-react';

const Cart = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { userInfo } = useSelector((state) => state.auth);
  const { cartItems } = useSelector((state) => state.cart);

  // Coupon states
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0); // in percentage
  const [appliedCode, setAppliedCode] = useState('');
  const [couponError, setCouponError] = useState('');

  // Payment states
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  // Computations
  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const taxRate = 0.05; // 5% Standard tax
  const taxAmount = subtotal * taxRate;
  const discountAmount = subtotal * (appliedDiscount / 100);
  const totalAmount = subtotal + taxAmount - discountAmount;

  const handleQtyChange = (id, currentQty, amount, stock) => {
    const newQty = currentQty + amount;
    if (newQty >= 1 && newQty <= stock) {
      dispatch(updateQuantity({ product: id, quantity: newQty }));
    }
  };

  const handleRemove = (id) => {
    dispatch(removeFromCart(id));
  };

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    setCouponError('');
    const code = couponCode.trim().toUpperCase();

    if (code === 'WELCOME10') {
      setAppliedDiscount(10);
      setAppliedCode('WELCOME10 (10% OFF)');
      setCouponCode('');
    } else if (code === 'DISCOUNT20') {
      setAppliedDiscount(20);
      setAppliedCode('DISCOUNT20 (20% OFF)');
      setCouponCode('');
    } else {
      setCouponError('Invalid voucher or coupon code.');
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedDiscount(0);
    setAppliedCode('');
  };

  // MAIN INTEGRATION: RAZORPAY STANDARD GATEWAY CHECKOUT FLOW
  const handlePaymentCheckout = async () => {
    if (cartItems.length === 0) return;
    
    setLoadingCheckout(true);
    setCheckoutError('');

    try {
      // 1. Create a Razorpay Order — backend always re-derives price from DB
      const itemsPayload = cartItems.map((item) => ({
        product: item.product,
        quantity: item.quantity,
        name: item.name,
      }));

      const { data: orderData } = await API.post('/payments/order', {
        items: itemsPayload,
      });

      // Validate the backend returned a real Razorpay order
      if (!orderData || !orderData.id || !orderData.amount || orderData.amount <= 0) {
        const errMsg = orderData?.message || orderData?.error || 'Order initialization failed.';
        throw new Error(errMsg);
      }

      // 2. Setup Razorpay client-side options
      const options = {
        key: (import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_mockKeyId123').trim(), // Test Key
        amount: orderData.amount, // In paise (amount * 100)
        currency: "INR",
        name: "My Store",
        description: "Test Transaction",
        image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200',
        order_id: orderData.id,
        
        // Success payment handler
        handler: async (response) => {
          try {
            // Send payload to backend to verify signature and commit order
            const verificationPayload = {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              items: orderData.calculatedItems,
            };

            const { data: verifyResult } = await API.post('/payments/verify', verificationPayload);

            if (verifyResult.success) {
              // Clear local Redux cart
              dispatch(clearCart());
              // Redirect to digital invoice page
              navigate(`/invoice/${verifyResult.order._id}`);
            }
          } catch (err) {
            console.error(err);
            setCheckoutError(err.response?.data?.message || 'Payment authentication signature failed.');
            setLoadingCheckout(false);
          }
        },
        prefill: {
          name: userInfo.name,
          email: userInfo.email,
        },
        theme: {
          color: "#3399cc"
        },
        
        // Triggered when modal is closed
        modal: {
          ondismiss: () => {
            setLoadingCheckout(false);
          }
        }
      };

      // 3. Open Razorpay payment gateway
      const isMockSetup = options.key === 'rzp_test_mockKeyId123';

      if (isMockSetup && typeof window.Razorpay === 'undefined') {
        console.warn('Razorpay SDK script not loaded, running simulated mock payment.');
        simulateMockPayment(orderData);
      } else {
        const rzp = new window.Razorpay(options);
        rzp.open();
      }

    } catch (err) {
      console.error(err);
      // Handle both Axios HTTP errors and manually thrown errors
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Order initialization failed. Please try again.';
      setCheckoutError(msg);
      setLoadingCheckout(false);
    }
  };

  // Developer simulation helper for zero-setup local testing
  const simulateMockPayment = async (orderData) => {
    if (window.confirm("Razorpay SDK is running in test mode. Would you like to simulate a successful payment?")) {
      try {
        const verificationPayload = {
          razorpay_order_id: orderData.id,
          razorpay_payment_id: 'pay_mock_' + Math.random().toString(36).substring(7),
          razorpay_signature: 'mock_signature_approved', // backend allows if mock key configured
          items: orderData.calculatedItems,
        };

        const { data: verifyResult } = await API.post('/payments/verify', verificationPayload);

        if (verifyResult.success) {
          dispatch(clearCart());
          navigate(`/invoice/${verifyResult.order._id}`);
        }
      } catch (err) {
        setCheckoutError(err.response?.data?.message || 'Simulation verification failed.');
        setLoadingCheckout(false);
      }
    } else {
      setLoadingCheckout(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="glass-card empty-state" style={{ maxWidth: 600, margin: '40px auto' }}>
        <ShoppingBag size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
        <h2 style={{ fontSize: '1.5rem', marginBottom: 8, color: 'white' }}>Your Cart is Empty</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>You haven't scanned any store products yet. Visit the Scanner page to pick items.</p>
        <button onClick={() => navigate('/scanner')} className="btn btn-primary">
          Open Scanner Panel
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <h2 style={{ fontSize: 'clamp(1.4rem, 5vw, 1.8rem)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
        <ShoppingBag className="primary-color-text" style={{ color: 'var(--primary)' }} />
        Review Shopping Cart
      </h2>

      {checkoutError && (
        <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <AlertTriangle size={18} />
          <span style={{ fontSize: '0.9rem' }}>{checkoutError}</span>
        </div>
      )}

      <div className="cart-layout">
        {/* Scanned Cart items list */}
        <div className="cart-items-panel">
          {cartItems.map((item) => (
            <div key={item.product} className="glass-card cart-item-row" style={{ borderRadius: 'var(--radius-md)' }}>
              <img src={item.image} alt={item.name} className="cart-item-img" />

              <div className="cart-item-details">
                <h4>{item.name}</h4>
                <p>₹{item.price.toFixed(2)}</p>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Stock: {item.stock} units</span>
              </div>

              {/* Footer row: visible on mobile as full-width, on tablet handled by CSS grid */}
              <div className="cart-item-footer">
                <div className="cart-item-quantities">
                  <button
                    onClick={() => handleQtyChange(item.product, item.quantity, -1, item.stock)}
                    className="qty-btn"
                    disabled={item.quantity <= 1}
                    aria-label="Decrease quantity"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="qty-val">{item.quantity}</span>
                  <button
                    onClick={() => handleQtyChange(item.product, item.quantity, 1, item.stock)}
                    className="qty-btn"
                    disabled={item.quantity >= item.stock}
                    aria-label="Increase quantity"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <button
                  onClick={() => handleRemove(item.product)}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '8px 10px', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.15)' }}
                  title="Remove item"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Pricing totals, discount coupon form, and checkout execution */}
        <div className="cart-summary-panel">
          <div className="glass-card">
            <h3 className="summary-header" style={{ fontSize: '1.2rem', color: 'white' }}>Cart Summary</h3>
            
            <div style={{ marginTop: 14 }}>
              <div className="summary-row">
                <span>Items Subtotal</span>
                <span style={{ color: 'white', fontWeight: 600 }}>₹{subtotal.toFixed(2)}</span>
              </div>

              <div className="summary-row">
                <span>Estimated Tax (5%)</span>
                <span style={{ color: 'white', fontWeight: 600 }}>₹{taxAmount.toFixed(2)}</span>
              </div>

              {appliedDiscount > 0 && (
                <div className="summary-row" style={{ color: 'var(--success)' }}>
                  <span>Discount Applied</span>
                  <span style={{ fontWeight: 600 }}>-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="summary-row total">
                <span>Total Amount</span>
                <span>₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Coupons section */}
            <div className="coupon-section">
              <span className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Discount Coupon</span>
              
              {!appliedCode ? (
                <form onSubmit={handleApplyCoupon} className="coupon-input-flex">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. WELCOME10"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                  />
                  <button type="submit" className="btn btn-secondary btn-sm" style={{ padding: '8px 12px' }}>
                    Apply
                  </button>
                </form>
              ) : (
                <div className="coupon-applied-badge">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Check size={14} />
                    <span>{appliedCode}</span>
                  </div>
                  <button onClick={handleRemoveCoupon} style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                    Remove
                  </button>
                </div>
              )}

              {couponError && (
                <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: 6, fontWeight: 500 }}>
                  {couponError}
                </p>
              )}

              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 8, fontStyle: 'italic' }}>
                Hint: Try using promo codes <code style={{ color: 'var(--primary)' }}>WELCOME10</code> or <code style={{ color: 'var(--primary)' }}>DISCOUNT20</code>
              </p>
            </div>

            {/* Checkout initiation */}
            <button
              onClick={handlePaymentCheckout}
              className="btn btn-primary btn-full"
              disabled={loadingCheckout || cartItems.length === 0}
              style={{ marginTop: 20 }}
            >
              <CreditCard size={18} />
              {loadingCheckout ? 'Initializing Order...' : 'Pay with Razorpay'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
