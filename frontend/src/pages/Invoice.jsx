import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../services/api.js';
import { Printer, CheckCircle, ArrowLeft, Calendar, FileText, ShoppingBag, Sparkles } from 'lucide-react';

const Invoice = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        const { data } = await API.get(`/orders/${id}`);
        setOrder(data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || 'Failed to fetch invoice data.');
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p style={{ marginTop: 12, color: 'var(--text-secondary)' }}>Retrieving your invoice receipt...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="glass-card" style={{ maxWidth: 500, margin: '40px auto', textAlign: 'center' }}>
        <h3 style={{ color: 'var(--danger)', fontSize: '1.3rem', marginBottom: 10 }}>Error Loading Receipt</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>{error || 'Invoice not found.'}</p>
        <button onClick={() => navigate('/scanner')} className="btn btn-primary">
          Back to Scanner
        </button>
      </div>
    );
  }

  // Formatting helpers
  const invoiceDate = new Date(order.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', paddingBottom: 40 }}>
      <div className="invoice-action-row no-print">
        <button onClick={() => navigate('/orders')} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={16} />
          <span>My Invoices</span>
        </button>

        <button onClick={handlePrint} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Printer size={16} />
          <span>Print / Save PDF</span>
        </button>
      </div>

      {/* Main Premium Digital Invoice Card */}
      <div className="invoice-card">
        
        {/* Invoice Header */}
        <div className="invoice-header">
          <div>
            <span className="invoice-logo">SmartCart</span>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
              Downtown Superstore, Lane 4
            </p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <span className="invoice-badge-paid">Paid</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
              ID: #{order._id.toString().substring(14)}
            </span>
          </div>
        </div>

        {/* Invoice Meta Grid */}
        <div className="invoice-meta-info">
          <div>
            <span style={{ display: 'block', fontWeight: 600, color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase' }}>Billed Customer</span>
            <span style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 500 }}>{order.user?.name || 'In-Store Customer'}</span>
            <span style={{ display: 'block', fontSize: '0.85rem', color: '#64748b' }}>{order.user?.email}</span>
          </div>
          
          <div style={{ textAlign: 'right' }}>
            <span style={{ display: 'block', fontWeight: 600, color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase' }}>Transaction Timestamp</span>
            <span style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 500 }}>
              {invoiceDate}
            </span>
          </div>
        </div>

        {/* Purchase Items breakdown table */}
        <div className="invoice-table-wrapper">
          <table className="invoice-table">
            <thead>
              <tr>
                <th style={{ width: '50%' }}>Scanned Item</th>
                <th style={{ textAlign: 'center', width: '15%' }}>Qty</th>
                <th style={{ textAlign: 'right', width: '15%' }}>Unit Price</th>
                <th style={{ textAlign: 'right', width: '20%' }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ color: '#1e293b', fontWeight: 500 }}>{item.name}</td>
                  <td style={{ textAlign: 'center', color: '#475569' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right', color: '#475569' }}>₹{item.price.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', color: '#0f172a', fontWeight: 600 }}>
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Total calculation row */}
        <div className="invoice-total-row">
          <span>Amount Successfully Charged</span>
          <span>₹{order.totalAmount.toFixed(2)}</span>
        </div>

        {/* Security Exit Verification QR Code */}
        <div className="invoice-verification-qr">
          <div className="invoice-qr-code">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=order_verified_${order._id}`}
              alt="Verification QR Code"
              style={{ width: 140, height: 140 }}
            />
          </div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={16} style={{ color: 'var(--primary)' }} />
            Security Exit Pass
          </h4>
          <p className="invoice-qr-desc">
            Present this unique QR code to the store guard upon exiting. They will scan this to verify your checkout.
          </p>
        </div>

        {/* Thank You Note */}
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
          Thank you for shopping with SmartCart! Avoid the queues next time too!
        </div>
      </div>
    </div>
  );
};

export default Invoice;
