import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { authStart, authSuccess, authFailure } from '../redux/authSlice.js';
import API from '../services/api.js';
import { ShoppingBag, KeyRound, Mail, ArrowRight } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userInfo, loading, error } = useSelector((state) => state.auth);

  useEffect(() => {
    // If logged in, redirect to scanner page
    if (userInfo) {
      navigate('/scanner');
    }
  }, [userInfo, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!email || !password) {
      setLocalError('Please fill in all credentials.');
      return;
    }

    try {
      dispatch(authStart());
      const { data } = await API.post('/auth/login', { email, password });
      dispatch(authSuccess(data));
      navigate('/scanner');
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Server error. Authentication failed.';
      dispatch(authFailure(errMsg));
      setLocalError(errMsg);
    }
  };

  // Helper function to fill mock logins instantly (very friendly for developer reviews!)
  const fillMockCredentials = (role) => {
    if (role === 'admin') {
      setEmail('admin@store.com');
      setPassword('admin123');
    } else {
      setEmail('user@store.com');
      setPassword('user123');
    }
  };

  return (
    <div className="auth-page">
      <div className="glass-card auth-card">
        <div className="auth-header">
          <div style={{ display: 'inline-flex', padding: 12, borderRadius: '50%', background: 'var(--primary-glow)', color: 'var(--primary)', marginBottom: 16 }}>
            <ShoppingBag size={32} />
          </div>
          <h2>SmartCart Checkout</h2>
          <p>Login to start scanning & paying</p>
        </div>

        {(localError || error) && (
          <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontSize: '0.875rem', marginBottom: 20 }}>
            {localError || error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="email"
                className="form-control"
                placeholder="customer@store.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: 46 }}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <KeyRound size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: 46 }}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? 'Logging in...' : 'Sign In'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="simulator-panel" style={{ marginTop: 24, padding: 14 }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', marginBottom: 10 }}>
            Quick Demo Accounts
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button type="button" onClick={() => fillMockCredentials('user')} className="btn btn-secondary btn-sm">
              Standard User
            </button>
            <button type="button" onClick={() => fillMockCredentials('admin')} className="btn btn-secondary btn-sm" style={{ borderColor: 'rgba(245, 158, 11, 0.3)', color: 'var(--warning)' }}>
              Store Admin
            </button>
          </div>
        </div>

        <div className="auth-footer">
          Don't have an account? <Link to="/signup">Sign Up</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
