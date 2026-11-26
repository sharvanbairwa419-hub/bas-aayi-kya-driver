import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Bus, QrCode, ShieldCheck, LogOut, MapPin, Gauge, Users, AlertTriangle,
  Camera, Keyboard, Check, X, RefreshCw, Play, Square, History, User, Phone, Clock, WifiOff,
} from 'lucide-react';

// The phone must be able to reach the owner's server. In a browser on the same
// computer this is http://127.0.0.1:3000; inside the installed APK the driver
// enters the server address once (it is remembered on the phone).
const DEFAULT_API = `${window.location.protocol}//${window.location.hostname}:3000`;
let API = localStorage.getItem('bak_api') || DEFAULT_API;
const setApiBase = (value) => {
  const clean = String(value || '').trim().replace(/\/+$/, '');
  if (!clean) return false;
  API = clean;
  localStorage.setItem('bak_api', clean);
  return true;
};
const TOKEN_KEY = 'bak_driver_token';

async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch (e) { json = null; }
  if (!res.ok) {
    const err = new Error((json && json.error) || 'Network error, try again');
    err.status = res.status;
    throw err;
  }
  return json;
}

const todayKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const parseServerTime = (value) => (value ? new Date(String(value).replace(' ', 'T') + 'Z') : null);

const startedToday = (duty) => {
  const started = parseServerTime(duty?.started_at);
  return Boolean(started) && todayKey(started) === todayKey(new Date());
};

const hhmmss = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const busPin = L.divIcon({
  className: 'bak-driver-pin',
  html: `<div style="width:20px;height:20px;border-radius:50%;background:#EF6A1E;border:3px solid #0C0B0A;box-shadow:0 0 0 2px #EF6A1E"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const passengerPin = L.divIcon({
  className: 'bak-passenger-pin',
  html: `<div style="width:22px;height:22px;border-radius:50%;background:#0B5D57;border:3px solid #F5EFE6;box-shadow:0 0 0 2px #0B5D57"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function Follow({ position }) {
  const map = useMap();
  useEffect(() => { if (position) map.setView(position, map.getZoom() < 12 ? 14 : map.getZoom()); }, [position?.[0], position?.[1]]);
  return null;
}

// ---------------------------------------------------------------- pairing
function PairScreen({ onReady }) {
  const [code, setCode] = useState('');
  const [server, setServer] = useState(localStorage.getItem('bak_api') || DEFAULT_API);
  const [hails, setHails] = useState([]);
  const [accepted, setAccepted] = useState(null);
  const [hailBusy, setHailBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      setApiBase(server);
      const data = await api('/api/driver/pair', { method: 'POST', body: { code } });
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem('bak_driver_name', data.driver.name);
      onReady(data.token);
    } catch (err) {
      setError(err.message);
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen flex flex-col grain px-5 safe-bottom">
      <div className="pt-12 pb-8">
        <div className="w-12 h-12 rounded-2xl bg-marigold grid place-items-center mb-6">
          <Bus size={22} className="text-ink" />
        </div>
        <h1 className="text-4xl leading-tight">Bas Aayi Kya<br /><span className="text-marigold">Driver</span></h1>
        <p className="text-muted text-sm mt-3 max-w-xs">
          Bus owner ने जो 6-अक्षर code दिया है, वही डालें. इसके बाद bus का QR scan करके duty शुरू होगी.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="code">Owner का pairing code</label>
          <input
            id="code" className="field text-center font-display text-3xl tracking-[0.35em] uppercase"
            value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            placeholder="ABC123" autoCapitalize="characters" autoComplete="off" inputMode="text" required
          />
        </div>
        {error && <p className="text-sm text-chili bg-chili/10 rounded-xl px-3 py-2.5 flex items-start gap-2"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{error}</p>}
        <button className="btn-primary w-full py-4 text-base inline-flex items-center justify-center gap-2" disabled={busy || code.length < 6}>
          {busy ? 'Connecting…' : 'Connect to owner'} <Check size={18} />
        </button>
      </form>

      <details className="mt-6 rounded-2xl border border-line px-3.5 py-3">
        <summary className="text-xs font-semibold text-muted cursor-pointer">Server address (ज़रूरत हो तभी बदलें)</summary>
        <input className="field mt-3 text-sm" value={server} onChange={(e) => setServer(e.target.value)}
          placeholder="http://192.168.1.5:3000" inputMode="url" autoComplete="off" />
        <p className="text-[11px] text-muted mt-2">
          Owner का server किस address पर चल रहा है. Phone और server एक ही Wi-Fi पर हों.
        </p>
      </details>

      <p className="text-xs text-muted mt-4">
        Code नहीं है? अपने bus owner से dashboard में driver जोड़कर code देने को कहें. कोई भी account अपने आप नहीं बनता.
      </p>
      <div className="mt-auto pt-10 text-[11px] text-muted">© {new Date().getFullYear()} Bas Aayi Kya · गाड़ी चलाइए, बाकी हम देख लेंगे</div>
    </div>
  );
}

// ---------------------------------------------------------------- QR scanner
function QrScanner({ title, hint, onCode, onClose }) {
  const videoRef = useRef(null);
  const handled = useRef(false);
  const [mode, setMode] = useState('camera');
  const [manual, setManual] = useState('');
  const [notice, setNotice] = useState('Camera शुरू हो रहा है…');

  useEffect(() => {
    let stream = null;
    let interval = null;
    let cancelled = false;

    (async () => {
      if (!('BarcodeDetector' in window)) {
        setMode('manual');
        setNotice('इस phone में camera QR support नहीं — नीचे code type करें.');
        return;
      }
      try {
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (cancelled) return;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setNotice('QR को frame में रखें');
        interval = setInterval(async () => {
          if (cancelled || handled.current || !videoRef.current) return;
          try {
            const found = await detector.detect(videoRef.current);
            if (found && found.length) {
              handled.current = true;
              onCode(found[0].rawValue);
            }
          } catch (e) { /* frame skipped */ }
        }, 450);
      } catch (e) {
        setMode('manual');
        setNotice('Camera permission नहीं मिली — नीचे QR code type करें.');
      }
    })();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function submitManual(e) {
    e.preventDefault();
    if (!manual.trim() || handled.current) return;
    handled.current = true;
    onCode(manual.trim());
  }

  return (
    <div className="fixed inset-0 z-[600] bg-night flex flex-col">
      <div className="flex items-center justify-between px-5 pt-6 pb-3">
        <div>
          <p className="font-display text-xl">{title}</p>
          <p className="text-xs text-muted mt-0.5">{hint}</p>
        </div>
        <button onClick={onClose} className="btn-ghost-dark p-2.5" aria-label="Close scanner"><X size={18} /></button>
      </div>

      {mode === 'camera' ? (
        <div className="relative flex-1 min-h-0">
          <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <div className="w-60 h-60 rounded-3xl border-2 border-marigold/80 shadow-[0_0_0_9999px_rgba(12,11,10,.55)]" />
          </div>
          <p className="absolute bottom-6 inset-x-0 text-center text-xs text-paper/80">{notice}</p>
        </div>
      ) : (
        <div className="flex-1 grid place-items-center px-5">
          <div className="text-center">
            <Camera size={28} className="mx-auto text-muted mb-3" />
            <p className="text-sm text-muted max-w-xs">{notice}</p>
          </div>
        </div>
      )}

      <form onSubmit={submitManual} className="p-5 border-t border-line bg-night-2 safe-bottom">
        <label className="label" htmlFor="qrmanual">या QR के नीचे लिखा code डालें</label>
        <div className="flex gap-2">
          <input id="qrmanual" className="field uppercase tracking-[0.2em]" value={manual}
            onChange={(e) => setManual(e.target.value.toUpperCase())} placeholder="BAK-XXXXXX" autoComplete="off" />
          <button className="btn-primary px-5 shrink-0 inline-flex items-center gap-1.5" disabled={!manual.trim()}>
            <Keyboard size={15} /> OK
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------- duty board
export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('duty');
  const [scanMode, setScanMode] = useState(null); // 'start' | 'end'
  const [busy, setBusy] = useState(false);
  const [fix, setFix] = useState(null);
  const [geoState, setGeoState] = useState('idle');
  const [now, setNow] = useState(Date.now());
  const [sosOpen, setSosOpen] = useState(false);
  const [trips, setTrips] = useState([]);
  const [toast, setToast] = useState('');
  const [server, setServer] = useState(localStorage.getItem('bak_api') || DEFAULT_API);
  const [hails, setHails] = useState([]);
  const [accepted, setAccepted] = useState(null);
  const [hailBusy, setHailBusy] = useState(false);
  const fixRef = useRef(null);
  const dutyIdRef = useRef(null);

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null); setMe(null); setTrips([]);
  };

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2600); };

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api('/api/driver/me', { token });
      setMe(data);
      setError('');
    } catch (err) {
      if (err.status === 401 || err.status === 404) { logout(); return; }
      setError(err.message);
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const id = setInterval(load, 15000); return () => clearInterval(id); }, [load]);

  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  const dutyIsToday = (d) => (d?.start_day ? d.start_day === todayKey() : startedToday(d));
  const duty = me?.duty && dutyIsToday(me.duty) ? me.duty : null;
  const staleDuty = me?.duty && !dutyIsToday(me.duty) ? me.duty : null;
  dutyIdRef.current = duty?.id || null;

  // ---- real phone GPS ----
  useEffect(() => {
    if (!duty) return;
    if (!('geolocation' in navigator)) { setGeoState('unsupported'); return; }
    setGeoState('locating');
    const watch = navigator.geolocation.watchPosition(
      (pos) => {
        const next = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          speed: pos.coords.speed != null ? Math.round(pos.coords.speed * 3.6) : 0,
          accuracy: pos.coords.accuracy,
        };
        fixRef.current = next;
        setFix(next);
        setGeoState('ok');
      },
      (err) => {
        setGeoState(err.code === 1 ? 'denied' : 'error');
      },
      { enableHighAccuracy: true, maximumAge: 4000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [duty?.id]);

  // ---- push the fix to the owner every 10s ----
  useEffect(() => {
    if (!duty) return;
    let alive = true;
    const push = async () => {
      const point = fixRef.current;
      if (!alive || !point) return;
      try {
        await api('/api/driver/location', { method: 'POST', token, body: point });
      } catch (err) {
        if (err.status === 401) logout();
        if (err.status === 409) { setError('Duty अब active नहीं है — फिर से QR scan करें.'); load(); }
      }
    };
    push();
    const id = setInterval(push, 10000);
    return () => { alive = false; clearInterval(id); };
  }, [duty?.id, token, load]);

  // ---- pickup requests: nearest passenger on this route ----
  useEffect(() => {
    if (!duty || !token) { setHails([]); return; }
    let alive = true;
    const pull = async () => {
      try {
        const list = await api('/api/driver/hails', { token });
        if (alive) setHails(list || []);
      } catch (err) { if (err.status === 401) logout(); }
    };
    pull();
    const id = setInterval(pull, 5000);
    return () => { alive = false; clearInterval(id); };
  }, [duty?.id, token]);

  async function answerHail(hail, accept) {
    setHailBusy(true);
    try {
      if (accept) {
        const res = await api(`/api/driver/hails/${hail.id}/accept`, { method: 'POST', token });
        setAccepted(res.hail);
        flash('Pickup accept हो गया — passenger आपका इंतज़ार कर रहा है.');
      } else {
        await api(`/api/driver/hails/${hail.id}/reject`, { method: 'POST', token });
        flash('Request आगे भेज दी — कोई और driver लेगा.');
      }
      setHails((prev) => prev.filter((h) => h.id !== hail.id));
    } catch (err) {
      flash(err.message);
      if (err.status === 409) setHails((prev) => prev.filter((h) => h.id !== hail.id));
    } finally { setHailBusy(false); }
  }

  useEffect(() => {
    if (tab !== 'trips' || !token) return;
    api('/api/driver/trips', { token }).then(setTrips).catch(() => {});
  }, [tab, token, duty?.id]);

  async function handleScan(code) {
    setBusy(true); setError('');
    try {
      if (scanMode === 'end') {
        await api('/api/driver/duty/end', { method: 'POST', token, body: { qr: code } });
        flash('Duty खत्म. Bus owner को signal चला गया.');
      } else {
        await api('/api/driver/duty/start', { method: 'POST', token, body: { qr: code, day: todayKey() } });
        flash('Duty शुरू — location भेजी जा रही है.');
      }
      setScanMode(null);
      setTab('duty');
      await load();
    } catch (err) {
      setScanMode(null);
      setError(err.message);
    } finally { setBusy(false); }
  }

  async function updatePassengers(delta) {
    const next = Math.max(0, Math.min(100, (duty?.passenger_count || 0) + delta));
    try {
      await api('/api/driver/passengers', { method: 'POST', token, body: { count: next } });
      setMe((prev) => ({ ...prev, duty: { ...prev.duty, passenger_count: next } }));
    } catch (err) { flash(err.message); }
  }

  async function sendSos(type) {
    setSosOpen(false);
    try {
      await api('/api/driver/sos', { method: 'POST', token, body: { type, message: `SOS: ${type}`, ...(fixRef.current || {}) } });
      flash('SOS भेज दिया — owner के dashboard पर alert गया.');
    } catch (err) { flash(err.message); }
  }

  if (!token) return <PairScreen onReady={(t) => { setToken(t); setLoading(true); }} />;

  if (loading) {
    return <div className="min-h-screen grid place-items-center"><RefreshCw className="animate-spin text-muted" /></div>;
  }
  if (!me) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="card p-6 text-center max-w-xs">
          <p className="text-sm text-chili mb-3">{error || 'Connection नहीं बना.'}</p>
          <button className="btn-primary px-4 py-2.5 w-full" onClick={load}>Try again</button>
          <button className="btn-ghost-dark px-4 py-2.5 w-full mt-2" onClick={logout}>Change code</button>
        </div>
      </div>
    );
  }

  const consent = me.driver.consent || {};
  const consentOk = consent.status === 'active' || consent.status === 'expiring';
  const elapsed = duty ? now - (parseServerTime(duty.started_at)?.getTime() || now) : 0;
  const trail = (me.trail || []).map((p) => [p.lat, p.lng]);
  const position = fix ? [fix.lat, fix.lng] : null;

  const tabs = [
    { id: 'duty', label: 'Duty', icon: Bus },
    { id: 'trips', label: 'Trips', icon: History },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-30 bg-night/90 backdrop-blur border-b border-line px-5 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-marigold grid place-items-center shrink-0"><Bus size={18} className="text-ink" /></div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[15px] leading-tight truncate">{me.driver.name}</p>
          <p className="text-[11px] text-muted truncate">{me.owner?.name || 'Bus owner'}</p>
        </div>
        {duty ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-full bg-leaf/15 text-leaf">
            <span className="live-dot w-1.5 h-1.5 bg-leaf" /> On duty
          </span>
        ) : (
          <span className="text-[11px] font-semibold px-2.5 py-1.5 rounded-full bg-night-3 text-muted">Off duty</span>
        )}
      </header>

      <main className="px-5 pt-4 space-y-4">
        {error && (
          <p className="text-sm text-chili bg-chili/10 rounded-xl px-3 py-2.5 flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {error}
          </p>
        )}
        {toast && (
          <p className="text-sm text-leaf bg-leaf/10 rounded-xl px-3 py-2.5 animate-slide-in">{toast}</p>
        )}
        {!consentOk && (
          <div className="card p-4 border-haldi/40">
            <p className="flex items-center gap-2 text-sm font-semibold text-haldi"><ShieldCheck size={16} /> Consent बाकी है</p>
            <p className="text-xs text-muted mt-1">
              Owner को dashboard से आपका 120-दिन location consent approve करना होगा. उसके बाद ही duty शुरू होगी.
            </p>
          </div>
        )}

        {tab === 'duty' && (
          <>
            {duty ? (
              <>
                <div className="card p-5 text-center relative overflow-hidden">
                  <div className="absolute inset-x-0 -top-24 h-40 bg-marigold/10 blur-3xl pointer-events-none" />
                  <p className="label mb-1">Duty चालू · {duty.bus_number}</p>
                  <p className="font-display text-5xl num tracking-tight">{hhmmss(elapsed)}</p>
                  <p className="text-xs text-muted mt-2">
                    {parseServerTime(duty.started_at)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} से · {me.owner?.name}
                  </p>

                  <div className="grid grid-cols-3 gap-2 mt-5">
                    <div className="rounded-2xl bg-night-3 py-3">
                      <Gauge size={15} className="mx-auto text-muted mb-1" />
                      <p className="text-lg font-semibold num">{fix ? fix.speed : duty.last_speed || 0}</p>
                      <p className="text-[10px] text-muted">km/h</p>
                    </div>
                    <div className="rounded-2xl bg-night-3 py-3">
                      <MapPin size={15} className="mx-auto text-muted mb-1" />
                      <p className="text-lg font-semibold">{geoState === 'ok' ? 'LIVE' : geoState === 'denied' ? 'OFF' : '…'}</p>
                      <p className="text-[10px] text-muted">GPS</p>
                    </div>
                    <div className="rounded-2xl bg-night-3 py-3">
                      <Users size={15} className="mx-auto text-muted mb-1" />
                      <p className="text-lg font-semibold num">{duty.passenger_count || 0}</p>
                      <p className="text-[10px] text-muted">सवारी</p>
                    </div>
                  </div>

                  {(geoState === 'denied' || geoState === 'error') && (
                    <p className="text-xs text-chili mt-3 flex items-center justify-center gap-1.5">
                      <WifiOff size={13} /> Location permission चालू करें, वरना owner को bus नहीं दिखेगी.
                    </p>
                  )}
                  {fix?.accuracy > 60 && (
                    <p className="text-[11px] text-haldi mt-2">GPS accuracy कम ({Math.round(fix.accuracy)}m) — खुली जगह पर फोन रखें.</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => updatePassengers(-1)} className="btn-ghost-dark py-4 text-base press">− सवारी</button>
                  <button onClick={() => updatePassengers(1)} className="btn-primary py-4 text-base press">+ सवारी</button>
                </div>

                <div className="card overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-line">
                    <p className="text-xs text-muted">आपका आज का रास्ता</p>
                    <span className="text-[11px] text-muted num">{duty.last_lat ? 'GPS मिला' : 'GPS बाकी'}</span>
                  </div>
                  <div className="h-56">
                    <MapContainer center={position || [duty.last_lat || 26.9124, duty.last_lng || 75.7873]} zoom={14} className="h-full w-full" zoomControl={false}>
                      <TileLayer attribution='&copy; OpenStreetMap' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Follow position={position} />
                      {trail.length > 1 && <Polyline positions={trail} pathOptions={{ color: '#EF6A1E', weight: 4 }} />}
                      {position && <Marker position={position} icon={busPin} />}
                      {accepted?.at && <Marker position={[accepted.at.lat, accepted.at.lng]} icon={passengerPin} />}
                    </MapContainer>
                  </div>
                </div>

                {accepted && (
                  <div className="card p-4 border-teal/50">
                    <div className="flex items-center justify-between">
                      <p className="font-display text-base">Passenger आपका इंतज़ार कर रहा है</p>
                      <button onClick={() => setAccepted(null)} className="text-xs text-muted">हो गया</button>
                    </div>
                    <p className="text-sm text-ink-2 mt-1">
                      {accepted.passenger?.name || 'Passenger'}
                      {accepted.route?.from || accepted.route?.to ? ` · ${accepted.route.from || '—'} → ${accepted.route.to || '—'}` : ''}
                    </p>
                    <p className="text-xs text-muted mt-1">
                      नीले pin पर passenger खड़ा है{fix ? ` · आपसे ${Math.max(1, Math.round((((fix.lat - accepted.at.lat) ** 2 + (fix.lng - accepted.at.lng) ** 2) ** 0.5) * 111 * 10)) / 10} km` : ''}
                    </p>
                    {accepted.passenger?.phone && (
                      <a href={`tel:${accepted.passenger.phone}`} className="btn-ghost-dark w-full py-2.5 text-xs mt-3 inline-flex items-center justify-center gap-2">
                        <Phone size={13} /> {accepted.passenger.phone}
                      </a>
                    )}
                  </div>
                )}

                <button onClick={() => setScanMode('end')} className="w-full rounded-2xl border border-chili/40 bg-chili/10 text-chili py-4 font-semibold inline-flex items-center justify-center gap-2 press">
                  <Square size={16} /> Duty खत्म करें — bus QR scan
                </button>
                <p className="text-[11px] text-muted text-center -mt-1">
                  नियम: duty खत्म करने के लिए भी bus के QR के पास जाना ज़रूरी है.
                </p>

                <button onClick={() => setSosOpen(true)} className="w-full rounded-2xl border border-line py-3.5 text-sm font-semibold inline-flex items-center justify-center gap-2 press">
                  <AlertTriangle size={15} className="text-chili" /> Emergency / SOS
                </button>
              </>
            ) : (
              <div className="card p-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-marigold/15 grid place-items-center mx-auto mb-4">
                  <QrCode size={26} className="text-marigold" />
                </div>
                <p className="font-display text-2xl">Bus QR scan करें</p>
                <p className="text-sm text-muted mt-2 max-w-[280px] mx-auto">
                  {staleDuty
                    ? 'पिछली duty 12 बजे के बाद अपने आप बंद हो गई. आज की duty शुरू करने के लिए bus पर लगा QR scan करें.'
                    : 'Bus में लगे QR को scan करके duty शुरू करें. इसके बाद owner को आपकी live location दिखेगी.'}
                </p>
                <button onClick={() => setScanMode('start')} disabled={!consentOk}
                  className="btn-primary w-full py-4 mt-5 inline-flex items-center justify-center gap-2">
                  <Camera size={18} /> Scan QR & start duty
                </button>
                {!consentOk && <p className="text-xs text-haldi mt-3">पहले owner से 120-दिन consent approve करवाएँ.</p>}
              </div>
            )}
          </>
        )}

        {tab === 'trips' && (
          <div className="space-y-3">
            <p className="font-display text-xl px-1">आपकी duties</p>
            {trips.length === 0 && <div className="card p-8 text-center text-sm text-muted">अभी कोई duty record नहीं.</div>}
            {trips.map((t) => {
              const start = parseServerTime(t.started_at);
              const end = parseServerTime(t.ended_at);
              const mins = start ? Math.round(((end || new Date()).getTime() - start.getTime()) / 60000) : 0;
              return (
                <div key={t.id} className="card p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl grid place-items-center shrink-0 ${t.status === 'ACTIVE' ? 'bg-leaf/15 text-leaf' : 'bg-night-3 text-muted'}`}>
                    <Bus size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm">{t.bus_number}</p>
                    <p className="text-[11px] text-muted">
                      {start ? start.toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'} · {mins} min · {t.passenger_count || 0} सवारी
                    </p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${t.status === 'ACTIVE' ? 'bg-leaf/15 text-leaf' : 'bg-night-3 text-muted'}`}>
                    {t.status === 'ACTIVE' ? 'चालू' : 'बंद'}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'profile' && (
          <div className="space-y-3">
            <div className="card p-5 text-center">
              <div className="w-16 h-16 rounded-full bg-marigold grid place-items-center mx-auto font-display text-2xl text-ink">
                {me.driver.name.slice(0, 1).toUpperCase()}
              </div>
              <p className="font-display text-xl mt-3">{me.driver.name}</p>
              <p className="text-sm text-muted">{me.driver.phone}</p>
              <div className="mt-4 inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-night-3">
                <ShieldCheck size={13} className={consentOk ? 'text-leaf' : 'text-haldi'} />
                {consentOk ? `Consent valid · ${consent.days_left} दिन बाकी` : 'Consent बाकी'}
              </div>
            </div>
            <div className="card p-4 space-y-3 text-sm">
              <div className="flex items-center gap-3"><Bus size={15} className="text-muted" /> Owner: <span className="font-semibold">{me.owner?.name}</span></div>
              <div className="flex items-center gap-3"><Phone size={15} className="text-muted" /> Support के लिए owner से संपर्क करें</div>
              <div className="flex items-center gap-3"><Clock size={15} className="text-muted" /> Duty हर 24 घंटे में QR से फिर शुरू करनी होती है</div>
            </div>

            <div className="card p-4">
              <label className="label" htmlFor="srv">Server address</label>
              <input id="srv" className="field text-sm" value={server} onChange={(e) => setServer(e.target.value)}
                placeholder="http://192.168.1.5:3000" inputMode="url" autoComplete="off" />
              <button
                onClick={() => { if (setApiBase(server)) flash('Server address सेव हो गया.'); else flash('पूरा address डालें.'); }}
                className="btn-ghost-dark w-full py-2.5 text-xs mt-2">Save server address</button>
            </div>
            <button onClick={logout} className="w-full rounded-2xl border border-line py-3.5 text-sm font-semibold inline-flex items-center justify-center gap-2 press">
              <LogOut size={15} /> Log out / naya code
            </button>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-night-2/95 backdrop-blur border-t border-line safe-bottom">
        <div className="grid grid-cols-3">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`py-3 flex flex-col items-center gap-1 press ${tab === t.id ? 'text-marigold' : 'text-muted'}`}>
              <t.icon size={18} />
              <span className="text-[10px] font-semibold">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {scanMode && (
        <QrScanner
          title={scanMode === 'end' ? 'Duty खत्म करें' : 'Bus QR scan करें'}
          hint={scanMode === 'end' ? 'उसी bus का QR जिससे duty शुरू की थी' : 'QR bus के अंदर चिपका होगा'}
          onCode={handleScan}
          onClose={() => setScanMode(null)}
        />
      )}

      {hails.length > 0 && !accepted && (
        <div className="fixed inset-0 z-[560] bg-night/70 backdrop-blur-sm flex items-end">
          <div className="w-full bg-night-2 rounded-t-sheet p-5 safe-bottom animate-slide-in">
            <div className="flex items-center gap-2 text-marigold text-xs font-semibold uppercase tracking-widest">
              <MapPin size={13} /> आगे passenger खड़ा है
            </div>
            <p className="font-display text-2xl mt-2">Pickup request</p>
            <p className="text-sm text-muted mt-1">
              {hails[0].passenger?.name || 'Passenger'}
              {hails[0].route?.from || hails[0].route?.to ? ` · ${hails[0].route.from || '—'} → ${hails[0].route.to || '—'}` : ''}
            </p>
            {hails[0].bus?.distance_km != null && (
              <p className="text-sm text-ink-2 mt-2">
                आपसे <span className="font-semibold num">{hails[0].bus.distance_km} km</span> दूर · लगभग {hails[0].bus.eta_min} min
              </p>
            )}
            <p className="text-[11.5px] text-muted mt-2">Accept करेंगे तो passenger को आपकी live location दिखेगी. 75 सेकंड में जवाब दें, वरना request अगले driver को चली जाएगी.</p>
            <div className="grid grid-cols-2 gap-2.5 mt-4">
              <button onClick={() => answerHail(hails[0], false)} disabled={hailBusy}
                className="rounded-2xl border border-line py-4 font-semibold press inline-flex items-center justify-center gap-2">
                <X size={16} /> Skip
              </button>
              <button onClick={() => answerHail(hails[0], true)} disabled={hailBusy}
                className="btn-primary py-4 inline-flex items-center justify-center gap-2">
                <Check size={16} /> Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {sosOpen && (
        <div className="fixed inset-0 z-[550] bg-night/80 backdrop-blur-sm flex items-end" onClick={() => setSosOpen(false)}>
          <div className="w-full bg-night-2 rounded-t-sheet p-5 safe-bottom animate-slide-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-display text-lg">Emergency alert</p>
              <button onClick={() => setSosOpen(false)} className="btn-ghost-dark p-2"><X size={16} /></button>
            </div>
            <p className="text-xs text-muted mb-3">Owner के dashboard पर तुरंत alert जाएगा, आपकी location के साथ.</p>
            <div className="space-y-2">
              {['Breakdown', 'Accident', 'Medical Emergency', 'Security Issue'].map((type) => (
                <button key={type} onClick={() => sendSos(type)} className="w-full text-left rounded-2xl border border-line px-4 py-3.5 text-sm font-semibold press hover:bg-night-3">
                  {type}
                </button>
              ))}
            </div>
            {busy && <p className="text-xs text-muted mt-3 flex items-center gap-2"><Play size={12} /> भेज रहे हैं…</p>}
          </div>
        </div>
      )}
    </div>
  );
}
