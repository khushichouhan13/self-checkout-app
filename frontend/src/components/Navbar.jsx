import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../redux/authSlice.js';
import { clearCart } from '../redux/cartSlice.js';
import { ShoppingBag, ScanLine, History, LogOut, ShieldAlert } from 'lucide-react';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const { userInfo } = useSelector((state) => state.auth);
  const { cartItems } = useSelector((state) => state.cart);

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const handleLogout = () => {
    dispatch(logout());
    dispatch(clearCart());
    navigate('/login');
  };

  if (!userInfo) return null; // Hide navigation bar if user is not authenticated

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/scanner" className="navbar-brand">
          <ShoppingBag className="primary-color-icon" />
          <span>SmartCart</span>
        </Link>

        <div className="navbar-links">
          <Link
            to="/scanner"
            className={`nav-link ${location.pathname === '/scanner' ? 'active' : ''}`}
          >
            <ScanLine size={18} />
            <span>Scan Items</span>
          </Link>

          <Link
            to="/cart"
            className={`nav-link cart-icon-wrapper ${
              location.pathname === '/cart' ? 'active' : ''
            }`}
          >
            <ShoppingBag size={18} />
            <span>Cart</span>
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>

          <Link
            to="/orders"
            className={`nav-link ${location.pathname === '/orders' ? 'active' : ''}`}
          >
            <History size={18} />
            <span>Invoices</span>
          </Link>

          {userInfo.role === 'admin' && (
            <Link
              to="/admin"
              className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}
              style={{ color: 'var(--warning)' }}
            >
              <ShieldAlert size={18} />
              <span>Admin Panel</span>
            </Link>
          )}

          <div className="user-badge">
            <div className="avatar-circle">
              {userInfo.name.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{userInfo.name.split(' ')[0]}</span>
          </div>

          <button onClick={handleLogout} className="nav-link" style={{ cursor: 'pointer', border: 'none', background: 'none' }} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
