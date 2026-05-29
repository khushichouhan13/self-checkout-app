import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';

// Layout and routing guards
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

// Application Pages
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Scanner from './pages/Scanner.jsx';
import Cart from './pages/Cart.jsx';
import Invoice from './pages/Invoice.jsx';
import OrderHistory from './pages/OrderHistory.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

// Redux & API
import API from './services/api.js';
import { addToCart } from './redux/cartSlice.js';

function App() {
  const { userInfo } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [globalToast, setGlobalToast] = useState(null);

  // Global handler for physical USB/Bluetooth handheld barcode scanners
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = async (e) => {
      const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      // Barcode scanners enter text at extremely high speed (< 50ms per key)
      const isScannerSpeed = timeDiff < 50;

      // Accumulate standard letters and digits
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (isInput && !isScannerSpeed) {
          // Reset buffer if human is typing slowly inside a form input
          buffer = '';
          return;
        }

        // Reset buffer if there has been a long pause (human typing)
        if (timeDiff > 200) {
          buffer = '';
        }

        buffer += e.key;
      } else if (e.key === 'Enter') {
        const code = buffer.trim();
        buffer = ''; // Flush buffer immediately

        if (code.length >= 2) {
          if (isInput && !isScannerSpeed) {
            return; // Ignore if user is slowly typing and presses Enter in input
          }

          e.preventDefault();
          try {
            // Call API endpoint
            const { data } = await API.post('/products/scan', { barcode: code });
            
            // Add product directly to cart
            dispatch(addToCart({
              product: data._id,
              name:    data.name,
              price:   data.price,
              image:   data.image,
              stock:   data.stock,
            }));

            // Play nice feedback sound
            try {
              const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
              const osc = audioCtx.createOscillator();
              const gain = audioCtx.createGain();
              osc.connect(gain);
              gain.connect(audioCtx.destination);
              osc.type = 'sine';
              osc.frequency.value = 1046; // C6
              gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25);
              osc.start(audioCtx.currentTime);
              osc.stop(audioCtx.currentTime + 0.25);
            } catch (_) {}

            // Trigger beautiful global toast notification
            setGlobalToast({
              success: true,
              message: `"${data.name}" added to cart!`,
            });

          } catch (err) {
            // Only alert for unknown barcodes if it wasn't triggered by human form typing
            if (!isInput) {
              const errMsg = err.response?.data?.message ?? `Barcode "${code}" not found.`;
              setGlobalToast({
                success: false,
                message: errMsg,
              });
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [dispatch]);

  // Auto-dismiss global toast after 4 seconds
  useEffect(() => {
    if (globalToast) {
      const timer = setTimeout(() => setGlobalToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [globalToast]);

  return (
    <Router>
      <div className="app-container">
        {/* Global Navigation Header (Renders only if user logged in) */}
        <Navbar />

        {/* Global Floating Toast Alert for Handheld Scanner Feedback */}
        {globalToast && (
          <div style={{
            position: 'fixed',
            top: '80px',
            right: '20px',
            zIndex: 99999,
            background: globalToast.success ? '#0d9488' : '#e11d48',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 600,
            transition: 'all 0.3s ease',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <span>{globalToast.success ? '🛒' : '❌'}</span>
            <span>{globalToast.message}</span>
          </div>
        )}

        {/* Main Content Layout */}
        <main className="main-content">
          <Routes>
            {/* Public Authentication Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected Customer Routes */}
            <Route
              path="/scanner"
              element={
                <ProtectedRoute>
                  <Scanner />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/cart"
              element={
                <ProtectedRoute>
                  <Cart />
                </ProtectedRoute>
              }
            />

            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <OrderHistory />
                </ProtectedRoute>
              }
            />

            <Route
              path="/invoice/:id"
              element={
                <ProtectedRoute>
                  <Invoice />
                </ProtectedRoute>
              }
            />

            {/* Admin-Only Management Route */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly={true}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Wildcard Fallback Route Redirects */}
            <Route
              path="*"
              element={
                userInfo ? <Navigate to="/scanner" replace /> : <Navigate to="/login" replace />
              }
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
