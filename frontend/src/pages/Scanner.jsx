import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart } from '../redux/cartSlice.js';
import API from '../services/api.js';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  Scan, Sparkles, CheckCircle2, AlertCircle, Keyboard,
  Camera, CameraOff, ShoppingCart, Loader2, SwitchCamera,
  PackagePlus, X, Save,
} from 'lucide-react';

/* All supported barcode + QR formats */
const SCAN_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
  Html5QrcodeSupportedFormats.AZTEC,
];

const SCAN_COOLDOWN_MS = 2500; // prevent re-scanning same code instantly

const Scanner = () => {
  const dispatch  = useDispatch();
  const { userInfo } = useSelector(state => state.auth);
  const isAdmin   = userInfo?.role === 'admin';

  /* State */
  const [isScanning, setIsScanning]         = useState(false);
  const [isStarting, setIsStarting]         = useState(false);
  const [cameras, setCameras]               = useState([]);
  const [selectedCamIdx, setSelectedCamIdx] = useState(0);
  const [cameraError, setCameraError]       = useState('');

  const [lastCode, setLastCode]             = useState('');
  const [scannedProduct, setScannedProduct] = useState(null);
  const [successText, setSuccessText]       = useState('');
  const [errorText, setErrorText]           = useState('');
  const [isLookingUp, setIsLookingUp]       = useState(false);

  const [manualCode, setManualCode]         = useState('');

  /* Admin: register new product from scanned barcode */
  const [pendingBarcode, setPendingBarcode]   = useState('');
  const [showRegForm, setShowRegForm]         = useState(false);
  const [regForm, setRegForm]                 = useState({ name: '', price: '', stock: '', image: '' });
  const [regError, setRegError]               = useState('');
  const [regLoading, setRegLoading]           = useState(false);

  /* Refs */
  const scannerRef    = useRef(null);
  const processingRef = useRef(false);    // debounce duplicate scans
  const successTimer  = useRef(null);

  /* ── Enumerate cameras on mount ─────────────────────────────── */
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then(devices => {
        if (devices?.length) {
          setCameras(devices);
          // prefer back / environment camera on mobile
          const backIdx = devices.findIndex(d =>
            /back|rear|environment/i.test(d.label)
          );
          setSelectedCamIdx(backIdx !== -1 ? backIdx : devices.length - 1);
        }
      })
      .catch(() => setCameraError('Camera permission denied or no camera found.'));

    return () => { stopScanner(); };
  }, []);

  /* ── Beep helper ──────────────────────────────────────────────── */
  const playBeep = () => {
    try {
      const ctx  = new (window.AudioContext || window.webkitAudioContext)();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = 1046; // C6 note
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } catch (_) {}
  };

  /* ── Core scan handler ────────────────────────────────────────── */
  const handleScan = useCallback(async (barcode) => {
    if (processingRef.current) return;
    processingRef.current = true;

    setLastCode(barcode);
    setErrorText('');
    setSuccessText('');
    setScannedProduct(null);
    clearTimeout(successTimer.current);
    playBeep();

    setIsLookingUp(true);
    try {
      // POST /api/products/scan to lookup product by barcode
      const { data } = await API.post('/products/scan', { barcode });
      dispatch(addToCart({
        product: data._id,
        name:    data.name,
        price:   data.price,
        image:   data.image,
        stock:   data.stock,
      }));
      setScannedProduct(data);
      setSuccessText(`"${data.name}" added to cart!`);
      
      // Stop scanning after one successful scan
      stopScanner();

      successTimer.current = setTimeout(() => {
        setSuccessText('');
        setScannedProduct(null);
      }, 4000);
    } catch (err) {
      if (err.response?.status === 404 && isAdmin) {
        // Admin: offer to register the unknown product
        setPendingBarcode(barcode);
        setShowRegForm(true);
        setRegForm({ name: '', price: '', stock: '', image: '' });
        setRegError('');
        setErrorText('');
      } else {
        const msg = err.response?.data?.message
          ?? `Barcode "${barcode}" not found in the store catalog.`;
        setErrorText(msg);
      }
    } finally {
      setIsLookingUp(false);
      setTimeout(() => { processingRef.current = false; }, SCAN_COOLDOWN_MS);
    }
  }, [dispatch, isAdmin]);

  /* ── Start / stop camera (hoisted standard functions) ─────────── */
  async function startScanner() {
    if (!cameras.length) {
      setCameraError('No camera available. Please check your browser permissions.');
      return;
    }
    setIsStarting(true);
    setCameraError('');

    try {
      const instance = new Html5Qrcode('qr-video-surface', {
        formatsToSupport: SCAN_FORMATS,
        verbose: false,
      });
      scannerRef.current = instance;

      await instance.start(
        cameras[selectedCamIdx].id,
        {
          fps: 15,
          qrbox: { width: 260, height: 160 },
          aspectRatio: 16 / 9,
          disableFlip: false,
        },
        (decoded) => handleScan(decoded),
        () => {} // silent frame errors
      );
      setIsScanning(true);
    } catch (err) {
      setCameraError('Could not start camera. Allow camera access and try again.');
      scannerRef.current = null;
    } finally {
      setIsStarting(false);
    }
  }

  async function stopScanner() {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (_) {}
      scannerRef.current = null;
    }
    setIsScanning(false);
  }

  const toggleScanner = () => (isScanning ? stopScanner() : startScanner());

  /* ── Switch camera (cycle through devices) ────────────────────── */
  const switchCamera = async () => {
    if (cameras.length < 2) return;
    await stopScanner();
    setSelectedCamIdx(prev => (prev + 1) % cameras.length);
  };

  // restart automatically after switching camera index
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return; }
    if (cameras.length > 1) startScanner();
  }, [selectedCamIdx]);

  /* ── Manual entry ─────────────────────────────────────────────── */
  const handleManualSubmit = (e) => {
    e.preventDefault();
    const code = manualCode.trim();
    if (code) { handleScan(code); setManualCode(''); }
  };

  /* Admin: submit new product registration */
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegError('');
    if (!regForm.name || !regForm.price || !regForm.stock) {
      setRegError('Name, price, and stock are required.');
      return;
    }
    setRegLoading(true);
    try {
      const { data } = await API.post('/products', {
        name:    regForm.name.trim(),
        price:   parseFloat(regForm.price),
        barcode: pendingBarcode,
        image:   regForm.image.trim() || undefined,
        stock:   parseInt(regForm.stock),
      });
      // Auto-add newly registered product to cart
      dispatch(addToCart({
        product: data._id,
        name:    data.name,
        price:   data.price,
        image:   data.image,
        stock:   data.stock,
      }));
      setShowRegForm(false);
      setPendingBarcode('');
      setRegForm({ name: '', price: '', stock: '', image: '' });
      setScannedProduct(data);
      setSuccessText(`"${data.name}" registered & added to cart!`);
      successTimer.current = setTimeout(() => {
        setSuccessText('');
        setScannedProduct(null);
      }, 5000);
    } catch (err) {
      setRegError(err.response?.data?.message || 'Registration failed. Try again.');
    } finally {
      setRegLoading(false);
    }
  };

  /* ── Demo items ───────────────────────────────────────────────── */
  const demoItems = [
    { code: '101', name: 'Coffee Beans',  icon: '☕' },
    { code: '102', name: 'Fiji Water',    icon: '💧' },
    { code: '103', name: 'Granola',       icon: '🥣' },
    { code: '104', name: 'Chocolate',     icon: '🍫' },
    { code: '105', name: 'Olive Oil',     icon: '🫒' },
    { code: '106', name: 'Strawberries',  icon: '🍓' },
  ];

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div className="scanner-page-container">

      {/* ── Header ── */}
      <div className="scan-title-section">
        <h2 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <Scan size={28} style={{ color: 'var(--primary)' }} />
          Product Scanner
        </h2>
        <p style={{ marginTop: 8, color: 'var(--text-secondary)' }}>
          Point your camera at any barcode or QR label to instantly add it to your cart.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* ── Toast alerts ── */}
        {successText && (
          <div className="alert-toast toast-success">
            <CheckCircle2 size={20} color="var(--success)" />
            <div style={{ textAlign: 'left' }}>
              <span style={{ fontWeight: 600, display: 'block' }}>Added to Cart</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{successText}</span>
            </div>
          </div>
        )}
        {errorText && (
          <div className="alert-toast toast-error">
            <AlertCircle size={20} color="var(--danger)" />
            <div style={{ textAlign: 'left' }}>
              <span style={{ fontWeight: 600, display: 'block' }}>Not Found</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{errorText}</span>
            </div>
          </div>
        )}

        {/* ── Camera viewport card ── */}
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>

          {/* Status bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-glass)',
            background: 'rgba(0,0,0,0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', fontWeight: 600 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: isScanning ? 'var(--success)' : 'var(--text-muted)',
                boxShadow: isScanning ? '0 0 8px var(--success)' : 'none',
                display: 'inline-block',
                animation: isScanning ? 'pulse-dot 1.5s ease-in-out infinite' : 'none',
              }} />
              {isScanning ? 'Camera Active — Point at barcode' : 'Camera Off'}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {cameras.length > 1 && (
                <button
                  onClick={switchCamera}
                  className="btn btn-secondary btn-sm"
                  title="Switch Camera"
                  style={{ padding: '6px 10px' }}
                >
                  <SwitchCamera size={15} />
                </button>
              )}
              <button
                onClick={toggleScanner}
                className={`btn btn-sm ${isScanning ? 'btn-danger' : 'btn-primary'}`}
                disabled={isStarting}
                style={{ minWidth: 120 }}
              >
                {isStarting
                  ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Starting…</>
                  : isScanning
                    ? <><CameraOff size={14} /> Stop Camera</>
                    : <><Camera size={14} /> Start Camera</>
                }
              </button>
            </div>
          </div>

          {/* Video surface */}
          <div style={{ position: 'relative', background: '#020617', minHeight: 260 }}>

            {/* Html5Qrcode mounts the <video> here */}
            <div
              id="qr-video-surface"
              style={{ width: '100%' }}
            />

            {/* Overlay: shown only while scanning */}
            {isScanning && (
              <div style={{
                position: 'absolute', inset: 0,
                pointerEvents: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {/* Corner brackets */}
                <div style={{
                  position: 'relative',
                  width: 260, height: 160,
                }}>
                  {/* TL */}
                  <span style={{ position:'absolute', top:0, left:0, width:28, height:28,
                    borderTop:'3px solid var(--primary)', borderLeft:'3px solid var(--primary)',
                    borderRadius:'4px 0 0 0' }} />
                  {/* TR */}
                  <span style={{ position:'absolute', top:0, right:0, width:28, height:28,
                    borderTop:'3px solid var(--primary)', borderRight:'3px solid var(--primary)',
                    borderRadius:'0 4px 0 0' }} />
                  {/* BL */}
                  <span style={{ position:'absolute', bottom:0, left:0, width:28, height:28,
                    borderBottom:'3px solid var(--primary)', borderLeft:'3px solid var(--primary)',
                    borderRadius:'0 0 0 4px' }} />
                  {/* BR */}
                  <span style={{ position:'absolute', bottom:0, right:0, width:28, height:28,
                    borderBottom:'3px solid var(--primary)', borderRight:'3px solid var(--primary)',
                    borderRadius:'0 0 4px 0' }} />
                  {/* Laser sweep */}
                  <div style={{
                    position: 'absolute', left: 6, right: 6,
                    height: 2,
                    background: 'linear-gradient(90deg, transparent, #ef4444, transparent)',
                    boxShadow: '0 0 10px 2px rgba(239,68,68,0.7)',
                    animation: 'laser-bounce 2s ease-in-out infinite',
                    borderRadius: 2,
                  }} />
                </div>
              </div>
            )}

            {/* Idle placeholder */}
            {!isScanning && !isStarting && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 14,
              }}>
                <div style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: 'rgba(13,148,136,0.1)',
                  border: '2px solid rgba(13,148,136,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Camera size={30} style={{ color: 'var(--primary)' }} />
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
                  Press <strong style={{ color: 'var(--text-secondary)' }}>Start Camera</strong> to begin scanning
                </p>
                {cameraError && (
                  <p style={{ color: 'var(--danger)', fontSize: '0.8rem', maxWidth: 260, textAlign: 'center' }}>
                    ⚠ {cameraError}
                  </p>
                )}
              </div>
            )}

            {/* Camera permission error overlay */}
            {cameraError && isScanning === false && isStarting === false && cameras.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center' }}>
                <AlertCircle size={32} color="var(--danger)" style={{ marginBottom: 10 }} />
                <p style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>{cameraError}</p>
              </div>
            )}
          </div>

          {/* Looking-up indicator + last scanned code */}
          <div style={{
            padding: '10px 16px',
            borderTop: '1px solid var(--border-glass)',
            background: 'rgba(0,0,0,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            minHeight: 44,
          }}>
            {isLookingUp
              ? <span style={{ display:'flex', alignItems:'center', gap:8, color:'var(--text-secondary)', fontSize:'0.85rem' }}>
                  <Loader2 size={14} style={{ animation:'spin 1s linear infinite', color:'var(--primary)' }} />
                  Looking up product…
                </span>
              : lastCode
                ? <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Last scan: <code style={{
                      color: 'var(--accent)', background: 'rgba(99,102,241,0.1)',
                      padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace',
                    }}>{lastCode}</code>
                  </span>
                : <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Supports EAN-13 · EAN-8 · Code-128 · QR · UPC & more
                  </span>
            }
            {cameras.length > 1 && (
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                📷 {cameras[selectedCamIdx]?.label?.split('(')[0].trim() || `Camera ${selectedCamIdx + 1}`}
              </span>
            )}
          </div>
        </div>

        {/* ── Scanned product preview ── */}
        {scannedProduct && (
          <div className="glass-card hoverable" style={{
            display: 'flex', gap: 16, alignItems: 'center', padding: 14,
            borderLeft: '4px solid var(--success)',
            background: 'rgba(16,185,129,0.05)',
            animation: 'slide-in 0.3s cubic-bezier(0.16,1,0.3,1)',
          }}>
            <img
              src={scannedProduct.image}
              alt={scannedProduct.name}
              style={{ width: 64, height: 64, borderRadius: 'var(--radius-md)', objectFit: 'cover' }}
            />
            <div style={{ textAlign: 'left', flexGrow: 1 }}>
              <h4 style={{ fontSize: '0.95rem', color: 'white' }}>{scannedProduct.name}</h4>
              <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)', marginTop: 4 }}>
                ₹{scannedProduct.price.toFixed(2)}
              </p>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', background: 'var(--success)',
              color: 'white', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: 600,
            }}>
              <ShoppingCart size={13} /> Added
            </div>
          </div>
        )}

        {/* ── Manual entry ── */}
        <div className="glass-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Keyboard size={16} style={{ color: 'var(--primary)' }} />
            Enter Barcode Manually
          </h3>
          <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: 10 }}>
            <input
              type="text"
              className="form-control"
              placeholder="Type barcode code, e.g. 101"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              style={{ flexGrow: 1 }}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={!manualCode.trim()}>
              Lookup
            </button>
          </form>
        </div>

        {/* ── Demo simulator ── */}
        <div className="simulator-panel">
          <div className="simulator-header">
            <Sparkles size={17} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Test Scan Simulator</h3>
          </div>
          <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
            Click a product to simulate scanning its store barcode:
          </p>
          <div className="simulator-buttons">
            {demoItems.map(item => (
              <button
                key={item.code}
                type="button"
                onClick={() => handleScan(item.code)}
                className="btn btn-secondary btn-sm"
                style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', padding: '10px 8px', gap: 4,
                  height: 'auto', background: 'rgba(30,41,59,0.6)',
                }}
              >
                <span style={{ fontSize: '1.3rem' }}>{item.icon}</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>{item.name}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>#{item.code}</span>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Inline keyframes for spin + pulse-dot */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};

export default Scanner;
