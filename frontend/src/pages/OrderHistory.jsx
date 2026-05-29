import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api.js';
import { History, Eye, Calendar, FileText, ShoppingBag, ArrowRight } from 'lucide-react';

const OrderHistory = () => {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUserOrders = async () => {
      try {
        setLoading(true);
        const { data } = await API.get('/orders/me');
        setOrders(data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || 'Failed to retrieve past orders.');
        setLoading(false);
      }
    };

    fetchUserOrders();
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p style={{ marginTop: 12, color: 'var(--text-secondary)' }}>Retrieving your billing history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card" style={{ maxWidth: 500, margin: '40px auto', textAlign: 'center' }}>
        <h3 style={{ color: 'var(--danger)', fontSize: '1.3rem', marginBottom: 10 }}>Error Retrieving History</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>{error}</p>
        <button onClick={() => navigate('/scanner')} className="btn btn-primary">
          Back to Scanner
        </button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="glass-card empty-state" style={{ maxWidth: 600, margin: '40px auto' }}>
        <History size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
        <h2 style={{ fontSize: '1.5rem', marginBottom: 8, color: 'white' }}>No Checkout Invoices Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>You haven't completed any self-checkout transactions yet.</p>
        <button onClick={() => navigate('/scanner')} className="btn btn-primary">
          Go Scan Products
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <h2 style={{ fontSize: 'clamp(1.3rem, 5vw, 1.8rem)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
        <History className="primary-color-text" style={{ color: 'var(--primary)', flexShrink: 0 }} />
        Your Purchase Invoices
      </h2>

      <div className="order-history-list">
        {orders.map((order) => {
          const formattedDate = new Date(order.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          const totalItemsCount = order.items.reduce((acc, item) => acc + item.quantity, 0);

          return (
            <div key={order._id} className="glass-card history-card hoverable" style={{ padding: '16px 20px' }}>
              <div className="history-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <FileText size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, color: 'white' }}>Invoice #{order._id.toString().substring(14).toUpperCase()}</span>
                  <span style={{ padding: '2px 8px', background: 'rgba(16, 185, 129, 0.08)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 600 }}>Paid</span>
                </div>

                <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', flexWrap: 'wrap' }}>
                  <Calendar size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <span>{formattedDate}</span>
                  <span style={{ color: 'var(--text-muted)' }}>•</span>
                  <span>{totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'}</span>
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  {order.items.map((item, idx) => (
                    <span key={idx} style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-glass)', padding: '2px 8px', borderRadius: 4, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      {item.name} (x{item.quantity})
                    </span>
                  ))}
                </div>
              </div>

              <div className="history-card-footer">
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, color: 'white' }}>
                  ₹{order.totalAmount.toFixed(2)}
                </span>

                <button
                  onClick={() => navigate(`/invoice/${order._id}`)}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }}
                >
                  <Eye size={14} />
                  <span>View Pass</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderHistory;
