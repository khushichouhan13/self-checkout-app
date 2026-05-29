import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api.js';
import { ShieldCheck, Plus, Pencil, Trash2, DollarSign, CreditCard, Users, Layers, X, AlertTriangle, Eye, Camera, CameraOff, Loader2 } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

const AdminDashboard = () => {
  const navigate = useNavigate();

  // Core data states
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal control states
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null); // If null, we are in "Create" mode
  const [modalError, setModalError] = useState('');

  // Form states
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formImage, setFormImage] = useState('');
  const [formStock, setFormStock] = useState('');

  // Camera Barcode Scanner states for Admin Form
  const [isAdminScanning, setIsAdminScanning] = useState(false);
  const [adminScanError, setAdminScanError] = useState('');
  const adminScannerRef = useRef(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch all products and orders concurrently
      const [prodRes, orderRes] = await Promise.all([
        API.get('/products'),
        API.get('/orders'),
      ]);

      setProducts(prodRes.data);
      setOrders(orderRes.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch store database. Verify administrator privilege authorization.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Compute KPI Stats
  const totalSales = orders.reduce((acc, order) => acc + order.totalAmount, 0);
  const totalTransactions = orders.length;
  const uniqueCustomers = new Set(orders.map((o) => o.user?.email)).size;
  const totalInventoryLines = products.length;

  // Manage Modals
  const openCreateModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormPrice('');
    setFormBarcode('');
    setFormImage('');
    setFormStock('');
    setModalError('');
    setShowProductModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormPrice(product.price);
    setFormBarcode(product.barcode);
    setFormImage(product.image);
    setFormStock(product.stock);
    setModalError('');
    setShowProductModal(true);
  };

  const startAdminScanner = async () => {
    setAdminScanError('');
    setIsAdminScanning(true);
    // Let the DOM mount before starting
    setTimeout(async () => {
      try {
        const instance = new Html5Qrcode('admin-scanner-surface');
        adminScannerRef.current = instance;

        await instance.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: { width: 220, height: 130 },
            aspectRatio: 16 / 9,
          },
          (decodedText) => {
            setFormBarcode(decodedText);
            stopAdminScanner();
            // Beep sound
            try {
              const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
              const osc = audioCtx.createOscillator();
              const gain = audioCtx.createGain();
              osc.connect(gain);
              gain.connect(audioCtx.destination);
              osc.type = 'sine';
              osc.frequency.value = 1046;
              gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25);
              osc.start(audioCtx.currentTime);
              osc.stop(audioCtx.currentTime + 0.25);
            } catch (_) {}
          },
          () => {} // Silent errors
        );
      } catch (err) {
        console.error(err);
        setAdminScanError('Could not start scanner. Grant camera access.');
        setIsAdminScanning(false);
      }
    }, 250);
  };

  const stopAdminScanner = async () => {
    if (adminScannerRef.current) {
      try {
        await adminScannerRef.current.stop();
        adminScannerRef.current.clear();
      } catch (_) {}
      adminScannerRef.current = null;
    }
    setIsAdminScanning(false);
  };

  const toggleAdminScanner = () => {
    if (isAdminScanning) {
      stopAdminScanner();
    } else {
      startAdminScanner();
    }
  };

  const closeProductModal = () => {
    stopAdminScanner();
    setShowProductModal(false);
  };

  // Submit Product Form (Create / Edit)
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    const productPayload = {
      name: formName,
      price: parseFloat(formPrice),
      barcode: formBarcode.trim(),
      image: formImage || undefined,
      stock: parseInt(formStock),
    };

    if (!productPayload.name || isNaN(productPayload.price) || !productPayload.barcode || isNaN(productPayload.stock)) {
      setModalError('Please supply all required product details.');
      return;
    }

    try {
      if (editingProduct) {
        // Edit Mode
        const { data } = await API.put(`/products/${editingProduct._id}`, productPayload);
        setProducts(products.map((p) => (p._id === data._id ? data : p)));
      } else {
        // Create Mode
        const { data } = await API.post('/products', productPayload);
        setProducts([data, ...products]);
      }
      setShowProductModal(false);
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to submit product data.');
    }
  };

  // Delete product
  const handleDeleteProduct = async (id, name) => {
    if (window.confirm(`Are you sure you want to remove '${name}' from inventory catalog?`)) {
      try {
        await API.delete(`/products/${id}`);
        setProducts(products.filter((p) => p._id !== id));
      } catch (err) {
        alert(err.response?.data?.message || 'Delete operation failed.');
      }
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p style={{ marginTop: 12, color: 'var(--text-secondary)' }}>Syncing administrator portal logs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card" style={{ maxWidth: 500, margin: '40px auto', textAlign: 'center' }}>
        <AlertTriangle size={36} color="var(--danger)" style={{ marginBottom: 12 }} />
        <h3 style={{ color: 'var(--danger)', fontSize: '1.3rem', marginBottom: 10 }}>Access Unauthorized</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>{error}</p>
        <button onClick={() => navigate('/scanner')} className="btn btn-primary">
          Back to Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      {/* Page Title */}
      <div className="admin-page-header">
        <h2 style={{ fontSize: 'clamp(1.3rem, 5vw, 1.8rem)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldCheck className="primary-color-text" style={{ color: 'var(--primary)', flexShrink: 0 }} />
          Store Management Console
        </h2>

        <button onClick={openCreateModal} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <Plus size={16} />
          <span>Add Product</span>
        </button>
      </div>

      {/* KPI Stats Block */}
      <div className="admin-stats-row">
        <div className="glass-card stat-card">
          <div style={{ display: 'inline-flex', padding: 8, borderRadius: '50%', background: 'rgba(13, 148, 136, 0.08)', color: 'var(--primary)', marginBottom: 6 }}>
            <DollarSign size={20} />
          </div>
          <p className="stat-card-title">Total Sales Revenue</p>
          <p className="stat-card-value">₹{totalSales.toFixed(2)}</p>
        </div>

        <div className="glass-card stat-card">
          <div style={{ display: 'inline-flex', padding: 8, borderRadius: '50%', background: 'rgba(99, 102, 241, 0.08)', color: 'var(--accent)', marginBottom: 6 }}>
            <CreditCard size={20} />
          </div>
          <p className="stat-card-title">Checkout Operations</p>
          <p className="stat-card-value">{totalTransactions}</p>
        </div>

        <div className="glass-card stat-card">
          <div style={{ display: 'inline-flex', padding: 8, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.08)', color: 'var(--success)', marginBottom: 6 }}>
            <Users size={20} />
          </div>
          <p className="stat-card-title">Unique Customers</p>
          <p className="stat-card-value">{uniqueCustomers}</p>
        </div>

        <div className="glass-card stat-card">
          <div style={{ display: 'inline-flex', padding: 8, borderRadius: '50%', background: 'rgba(245, 158, 11, 0.08)', color: 'var(--warning)', marginBottom: 6 }}>
            <Layers size={20} />
          </div>
          <p className="stat-card-title">Seeded Catalog Lines</p>
          <p className="stat-card-value">{totalInventoryLines}</p>
        </div>
      </div>

      {/* Main Grid: Products on Left, Transactions on Right */}
      <div className="admin-grid-layout">
        
        {/* PRODUCTS INVENTORY LIST */}
        <div className="glass-card" style={{ padding: 20 }}>
          <div className="table-header-row">
            <h3 style={{ fontSize: '1.2rem', color: 'white' }}>Current Catalog Inventory</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sorted by latest entry</span>
          </div>

          <div className="responsive-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Preview</th>
                  <th>Product Info</th>
                  <th>Barcode</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product._id}>
                    <td>
                      <img src={product.image} alt={product.name} className="admin-thumbnail" />
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'white', display: 'block', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={product.name}>
                        {product.name}
                      </span>
                    </td>
                    <td>
                      <code style={{ fontFamily: 'monospace', color: 'var(--accent)', background: 'rgba(255,255,255,0.03)', padding: '2px 4px', borderRadius: 4 }}>
                        {product.barcode}
                      </code>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      ₹{product.price.toFixed(2)}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: product.stock < 10 ? 'var(--danger)' : 'var(--text-primary)' }}>
                        {product.stock}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="action-buttons-flex" style={{ justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => openEditModal(product)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: 6, color: 'var(--primary)' }}
                          title="Edit product"
                        >
                          <Pencil size={14} />
                        </button>
                        
                        <button
                          onClick={() => handleDeleteProduct(product._id, product.name)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: 6, color: 'var(--danger)' }}
                          title="Delete product"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* TRANSACTIONS AUDITING SHEET */}
        <div className="glass-card" style={{ padding: 20 }}>
          <div className="table-header-row">
            <h3 style={{ fontSize: '1.2rem', color: 'white' }}>Recent Self-Checkouts</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Latest paid receipts</span>
          </div>

          <div className="responsive-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Customer Info</th>
                  <th>Amount Paid</th>
                  <th style={{ textAlign: 'right' }}>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id}>
                    <td>
                      <span style={{ fontWeight: 600, color: 'white', display: 'block' }}>
                        {order.user?.name || 'In-Store Customer'}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                        {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>
                      ₹{order.totalAmount.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => navigate(`/invoice/${order._id}`)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: 6 }}
                        title="View Full Digital Receipt"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* CRUD ADD/EDIT MODAL OVERLAY DIALOG */}
      {showProductModal && (
        <div className="modal-overlay">
          <div className="glass-card modal-content-card">
            
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', color: 'white' }}>
                {editingProduct ? 'Update Product Item' : 'Register New Product'}
              </h3>
              <button onClick={closeProductModal} className="close-modal-btn">
                <X size={20} />
              </button>
            </div>

            {modalError && (
              <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontSize: '0.85rem', marginBottom: 16 }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleProductSubmit}>
              <div className="form-group">
                <label className="form-label">Product Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Belgian Truffle Chocolate"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Price (INR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="e.g. 5.99"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Barcode / QR Label *</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 107"
                      value={formBarcode}
                      onChange={(e) => setFormBarcode(e.target.value)}
                      required
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={toggleAdminScanner}
                      className={`btn btn-secondary ${isAdminScanning ? 'btn-danger' : 'btn-primary'}`}
                      style={{ padding: '0 12px', display: 'flex', alignItems: 'center', gap: 6, minWidth: 90 }}
                    >
                      {isAdminScanning ? <CameraOff size={14} /> : <Camera size={14} />}
                      <span>{isAdminScanning ? 'Stop' : 'Scan'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Collapsible Admin Scanner Surface */}
              {isAdminScanning && (
                <div style={{
                  margin: '14px 0',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 8,
                  overflow: 'hidden',
                  background: '#020617',
                  position: 'relative'
                }}>
                  <div id="admin-scanner-surface" style={{ width: '100%', minHeight: 200 }} />
                  {adminScanError && (
                    <p style={{ color: 'var(--danger)', fontSize: '0.8rem', padding: 8, textAlign: 'center', margin: 0 }}>
                      ⚠️ {adminScanError}
                    </p>
                  )}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Image URL</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. https://images.unsplash..."
                    value={formImage}
                    onChange={(e) => setFormImage(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Available Stock *</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="e.g. 50"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 14 }}>
                <button type="button" onClick={closeProductModal} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingProduct ? 'Save Changes' : 'Register Product'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
