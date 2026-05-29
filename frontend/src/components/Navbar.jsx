import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../redux/authSlice.js';
import { clearCart } from '../redux/cartSlice.js';
import { ShoppingBag, ScanLine, History, LogOut, ShieldAlert, ShoppingCart } from 'lucide-react';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [menuOpen, setMenuOpen] = useState(false);

  const { userInfo } = useSelector((state) => state.auth);
  const { cartItems } = useSelector((state) => state.cart);

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const handleLogout = () => {
    dispatch(logout());
    dispatch(clearCart());
    setMenuOpen(false);
    navigate('/login');
  };

  const closeMenu = () => setMenuOpen(false);

  if (!userInfo) return null;

  // Links shown in hamburger drawer (Cart is excluded — it lives in the header)
  const drawerLinks = [
    { to: '/scanner', icon: <ScanLine size={18} />, label: 'Scan Items' },
    { to: '/orders',  icon: <History size={18} />,  label: 'Invoices' },
    ...(userInfo.role === 'admin'
      ? [{ to: '/admin', icon: <ShieldAlert size={18} />, label: 'Admin Panel', warn: true }]
      : []),
  ];

  // Links shown in the desktop horizontal nav bar (includes Cart)
  const desktopLinks = [
    { to: '/scanner', icon: <ScanLine size={18} />,    label: 'Scan Items' },
    { to: '/cart',    icon: <ShoppingBag size={18} />, label: 'Cart', badge: cartCount },
    { to: '/orders',  icon: <History size={18} />,     label: 'Invoices' },
    ...(userInfo.role === 'admin'
      ? [{ to: '/admin', icon: <ShieldAlert size={18} />, label: 'Admin Panel', warn: true }]
      : []),
  ];

  return (
    <nav className="navbar">
      <div className="navbar-container">

        {/* Brand */}
        <Link to="/scanner" className="navbar-brand" onClick={closeMenu}>
          <ShoppingBag size={22} />
          <span>SmartCart</span>
        </Link>

        {/* Desktop Links (hidden on mobile) */}
        <div className="navbar-links">
          {desktopLinks.map(({ to, icon, label, badge, warn }) => (
            <Link
              key={to}
              to={to}
              className={`nav-link cart-icon-wrapper ${location.pathname === to ? 'active' : ''}`}
              style={warn ? { color: 'var(--warning)' } : {}}
            >
              {icon}
              <span>{label}</span>
              {badge > 0 && <span className="cart-badge">{badge}</span>}
            </Link>
          ))}

          <div className="user-badge">
            <div className="avatar-circle">
              {userInfo.name.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              {userInfo.name.split(' ')[0]}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="nav-link"
            style={{ cursor: 'pointer', border: 'none', background: 'none' }}
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>

        {/* Mobile Right Controls: Cart icon + Hamburger */}
        <div className="navbar-mobile-controls">

          {/* Cart icon — always visible in header on mobile */}
          <Link
            to="/cart"
            onClick={closeMenu}
            className={`navbar-cart-btn cart-icon-wrapper ${location.pathname === '/cart' ? 'active' : ''}`}
            aria-label="Open cart"
          >
            <ShoppingCart size={20} />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>

          {/* Hamburger toggle */}
          <button
            className={`navbar-hamburger ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
          >
            <span className="hamburger-line" />
            <span className="hamburger-line" />
            <span className="hamburger-line" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {menuOpen && (
        <div className="navbar-drawer open">

          {/* User info row */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 14px 12px',
            borderBottom: '1px solid var(--border-glass)',
            marginBottom: 4,
          }}>
            <div className="avatar-circle" style={{ width: 34, height: 34, fontSize: '0.9rem' }}>
              {userInfo.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'white' }}>{userInfo.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{userInfo.email}</div>
            </div>
          </div>

          {/* Nav links (no Cart — already in header) */}
          {drawerLinks.map(({ to, icon, label, warn }) => (
            <Link
              key={to}
              to={to}
              onClick={closeMenu}
              className={`nav-link drawer-nav-link ${location.pathname === to ? 'active' : ''}`}
              style={warn ? { color: 'var(--warning)' } : {}}
            >
              {icon}
              <span style={{ flexGrow: 1 }}>{label}</span>
            </Link>
          ))}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="nav-link drawer-nav-link"
            style={{ cursor: 'pointer', border: 'none', background: 'none', color: 'var(--danger)', width: '100%', textAlign: 'left' }}
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
