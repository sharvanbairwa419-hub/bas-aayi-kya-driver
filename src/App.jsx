import React, { useState, useEffect, useRef } from 'react';
import {
  Bus, Navigation, MapPin, Users, AlertTriangle, ShieldCheck, Clock,
  Play, Square, Wifi, ArrowRight, QrCode, Camera, Bell, Compass, Shield,
  LogOut, Phone, TriangleAlert, Siren, HeartPulse, Lock, Gauge, Timer,
  CircleCheck, ChevronRight, RefreshCw
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

const API_BASE = `${window.location.protocol}//${window.location.hostname || 'localhost'}:3000/api`;

const ROUTE_WAYPOINTS = [
  { name: 'Jaipur Sindhi Camp', lat: 26.9239, lng: 75.8016 },
  { name: 'Sanganer Toll', lat: 26.8124, lng: 75.7512 },
  { name: 'Chaksu Bypass', lat: 26.6021, lng: 75.9512 },
  { name: 'Dudu, Rajasthan', lat: 26.6836, lng: 75.2412 },
  { name: 'Newai Highway', lat: 26.4321, lng: 75.9312 },
  { name: 'Kothun Junction', lat: 26.3421, lng: 75.9723 },
  { name: 'Tonk City Cross', lat: 26.1624, lng: 75.7892 },
  { name: 'Bundi Valley', lat: 25.4412, lng: 75.6412 },
  { name: 'Kota Railway Station', lat: 25.2138, lng: 75.8648 },
];

const SOS_TYPES = [
  { id: 'Breakdown', label: 'Breakdown', icon: TriangleAlert, hint: 'Bus cannot move' },
  { id: 'Accident', label: 'Accident', icon: Siren, hint: 'Collision on route' },
  { id: 'Medical Emergency', label: 'Medical', icon: HeartPulse, hint: 'Passenger needs help' },
  { id: 'Security Issue', label: 'Security', icon: Lock, hint: 'Threat on board' },
];

function busMarker(online) {
  return L.divIcon({
    className: 'driver-bus-pin',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center">
        <div style="background:#EF6A1E;color:#1A0F06;font-family:'Instrument Sans',sans-serif;font-size:11px;font-weight:700;padding:5px 9px;border-radius:999px;box-shadow:0 8px 20px -8px rgba(0,0,0,.8);border:2px solid #0C0B0A;display:flex;align-items:center;gap:5px;white-space:nowrap">
          <span style="width:6px;height:6px;border-radius:50%;background:${online ? '#1A0F06' : '#6E655C'}"></span>
          YOUR BUS
        </div>
        <div style="width:2px;height:8px;background:#EF6A1E"></div>
      </div>`,
    iconSize: [110, 40],
    iconAnchor: [55, 40],
  });
}

function Follow({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center?.[0]) map.panTo(center, { animate: true, duration: 0.8 });
  }, [center, map]);
  return null;
}

const fmtTime = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const initials = (name = '') => name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

export default function App() {
  const [showPermissions, setShowPermissions] = useState(() => !localStorage.getItem('bak_driver_perms'));
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [tab, setTab] = useState('shift');

  const [driver, setDriver] = useState({
    id: 1, name: 'Ramesh Kumar', phone: '+91 98765 43210', bus_number: 'RJ14-AB-1234',
    route_name: 'Jaipur → Kota', bus_id: 1, capacity: 40, license_number: 'RJ14-2018-00912',
  });

  const [isTripActive, setIsTripActive] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [waypoint, setWaypoint] = useState(3);
  const [speed, setSpeed] = useState(45);
  const [passengers, setPassengers] = useState(24);
  const [elapsed, setElapsed] = useState(0);
  const [toast, setToast] = useState(null);

  const [loginPhone, setLoginPhone] = useState('+91 98765 43210');
  const [loginOtp, setLoginOtp] = useState('123456');
  const [pairing, setPairing] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const [sosType, setSosType] = useState('Breakdown');
  const [trips, setTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const notify = (msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  };

  const buzz = (ms = 12) => {
    try { navigator.vibrate?.(ms); } catch { /* no haptics */ }
  };

  /* real-time pickup alerts */
  useEffect(() => {
    let channel;
    try {
      if ('BroadcastChannel' in window) {
        channel = new BroadcastChannel('bas_aayi_kya_live');
        channel.onmessage = (event) => {
          if (event.data?.type === 'PASSENGER_PICKUP_REQUEST') {
            notify(`Pickup request: ${event.data.passenger_name} at ${event.data.location}`);
            buzz([30, 60, 30]);
          }
        };
      }
    } catch { /* ignore */ }
    return () => { if (channel) channel.close(); };
  }, []);

  /* GPS broadcast loop */
  useEffect(() => {
    if (!isTripActive || !isOnline) return;
    const id = window.setInterval(() => {
      setWaypoint((prev) => {
        const next = (prev + 1) % ROUTE_WAYPOINTS.length;
        const point = ROUTE_WAYPOINTS[next];
        const nextSpeed = Math.floor(40 + Math.random() * 22);
        setSpeed(nextSpeed);

        const payload = {
          type: 'DRIVER_TELEMETRY',
          bus_id: driver.bus_id || 1,
          bus_number: driver.bus_number,
          lat: point.lat,
          lng: point.lng,
          speed: nextSpeed,
          location_name: point.name,
          available_seats: Math.max(0, (driver.capacity || 40) - passengers),
        };

        try {
          if ('BroadcastChannel' in window) {
            const ch = new BroadcastChannel('bas_aayi_kya_live');
            ch.postMessage(payload);
            ch.close();
          }
          localStorage.setItem('bas_aayi_kya_driver_location', JSON.stringify(payload));
        } catch { /* storage blocked */ }

        fetch(`${API_BASE}/driver/location`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bus_id: driver.bus_id || 1,
            lat: point.lat,
            lng: point.lng,
            speed: nextSpeed,
            location_name: point.name,
          }),
        }).catch(() => {});

        return next;
      });
    }, 3500);
    return () => window.clearInterval(id);
  }, [isTripActive, isOnline, driver.bus_id, driver.bus_number, driver.capacity, passengers]);

  /* trip timer */
  useEffect(() => {
    if (!isTripActive) return;
    const id = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [isTripActive]);

  const login = async (e) => {
    e.preventDefault();
    if (loginOtp !== '123456') { notify('Invalid OTP — use 123456'); return; }
    setLoginBusy(true);
    try {
      const res = await fetch(`${API_BASE}/auth/driver/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: loginPhone, otp: loginOtp }),
      });
      const data = await res.json();
      if (!res.ok) { notify(data.error || 'Login failed — try the pairing code'); return; }
      const d = data.driver || {};
      setDriver((prev) => ({
        ...prev,
        id: d.id || prev.id,
        name: d.name || prev.name,
        phone: d.phone || prev.phone,
        license_number: d.license_number || prev.license_number,
        bus_id: d.assigned_bus_id || prev.bus_id,
        bus_number: d.bus_number || 'Not paired',
        route_name: d.route_name || 'No route assigned',
        capacity: d.capacity || prev.capacity,
      }));
      setIsLoggedIn(true);
      setTab('shift');
      notify(`Welcome ${d.name || 'Driver'}${d.bus_number ? ` · ${d.bus_number}` : ''}`);
    } catch {
      setIsLoggedIn(true);
      setTab('shift');
      notify('Backend offline — demo shift started');
    } finally {
      setLoginBusy(false);
    }
  };

  const pair = async (e) => {
    e.preventDefault();
    if (!pairing.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/driver/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairing_code: pairing.trim(), driver_phone: loginPhone }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { notify(data.error || 'Invalid pairing code'); return; }
      setDriver((prev) => ({
        ...prev,
        bus_number: data.bus.bus_number,
        route_name: data.bus.route_name,
        bus_id: data.bus.id,
        capacity: data.bus.capacity || prev.capacity,
      }));
      setIsLoggedIn(true);
      setTab('shift');
      notify(`Paired to ${data.bus.bus_number}`);
      buzz(30);
    } catch {
      notify('Backend offline — cannot verify the code');
    }
  };

  const toggleTrip = async () => {
    if (!isTripActive) {
      setIsTripActive(true);
      setElapsed(0);
      buzz([20, 40, 20]);
      try {
        await fetch(`${API_BASE}/trips/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bus_id: driver.bus_id, driver_id: driver.id, route_name: driver.route_name }),
        });
      } catch { /* offline */ }
      notify('Trip started — GPS is broadcasting');
    } else {
      setIsTripActive(false);
      buzz(40);
      try {
        await fetch(`${API_BASE}/trips/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bus_id: driver.bus_id }),
        });
      } catch { /* offline */ }
      notify('Trip ended — tracking paused');
    }
  };

  const saveCount = async () => {
    buzz(20);
    try {
      await fetch(`${API_BASE}/trips/passengers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bus_id: driver.bus_id, passenger_count: passengers }),
      });
      notify('Passenger count sent to the owner board');
    } catch {
      notify('Saved locally — backend is offline');
    }
  };

  const sendSos = async () => {
    const loc = ROUTE_WAYPOINTS[waypoint];
    buzz([60, 80, 60]);
    try {
      await fetch(`${API_BASE}/alerts/emergency`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bus_id: driver.bus_id,
          type: sosType,
          message: `${sosType} reported near ${loc.name}`,
          location: loc.name,
          lat: loc.lat,
          lng: loc.lng,
        }),
      });
    } catch { /* offline */ }
    setSosOpen(false);
    notify(`SOS sent — ${sosType} alert reached the owner`);
  };

  const loadTrips = async () => {
    setTripsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/trips`);
      const data = await res.json();
      if (Array.isArray(data)) {
        const mine = data.filter((t) => Number(t.driver_id) === Number(driver.id));
        setTrips(mine.length ? mine : data);
      }
    } catch {
      setTrips([]);
    } finally {
      setTripsLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'history') loadTrips();
  }, [tab]);

  const point = ROUTE_WAYPOINTS[waypoint];
  const nextPoint = ROUTE_WAYPOINTS[(waypoint + 1) % ROUTE_WAYPOINTS.length];
  const capacity = driver.capacity || 40;
  const pct = Math.min(100, Math.round((passengers / capacity) * 100));

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(driver.bus_number); } catch { /* ignore */ }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  /* ------------------------------ PERMISSIONS ------------------------------ */
  if (showPermissions) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-between bg-night px-5 pb-6 pt-10 text-nightink">
        <div className="space-y-7">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-marigold text-[#1A0F06] shadow-glow">
            <Shield className="h-8 w-8" strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="font-display text-3xl leading-tight">Before your first trip</h1>
            <p className="mt-2 text-sm leading-relaxed text-nightmuted">
              The driver app needs three permissions. Nothing is shared when the trip is stopped.
            </p>
          </div>

          <div className="space-y-2.5">
            {[
              { icon: Navigation, title: 'Precise GPS', text: 'Location keeps flowing in the background during a trip.' },
              { icon: Camera, title: 'Camera', text: 'Only to scan the bus QR when pairing.' },
              { icon: Bell, title: 'Notifications', text: 'Pickup requests and owner messages.' },
            ].map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.title} className="card flex items-start gap-3 p-4">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-night-3 text-marigold">
                    <Icon className="h-[18px] w-[18px]" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{p.title}</div>
                    <div className="mt-0.5 text-[11px] leading-relaxed text-nightmuted">{p.text}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-3 pt-8">
          <button
            onClick={() => {
              localStorage.setItem('bak_driver_perms', '1');
              setShowPermissions(false);
              buzz(20);
            }}
            className="btn-primary press w-full py-4 text-sm uppercase tracking-wide"
          >
            Allow & continue
          </button>
          <p className="text-center text-[11px] text-nightmuted">
            You can change these anytime in phone settings.
          </p>
        </div>
      </div>
    );
  }

  /* ------------------------------ LOGIN ------------------------------ */
  if (!isLoggedIn) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-night px-5 pb-8 pt-10 text-nightink">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-marigold text-[#1A0F06] shadow-glow">
            <Bus className="h-6 w-6" strokeWidth={2.3} />
          </div>
          <div>
            <div className="font-display text-lg leading-none">Bas Aayi Kya</div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-nightmuted">Driver</div>
          </div>
        </div>

        <div className="mt-10">
          <h1 className="font-display text-3xl leading-tight">Start your shift</h1>
          <p className="mt-2 text-sm text-nightmuted">Login with your mobile number, or paste the owner's pairing code.</p>
        </div>

        <form onSubmit={login} className="mt-7 space-y-4">
          <div>
            <label className="label">Mobile number</label>
            <input
              className="field"
              value={loginPhone}
              onChange={(e) => setLoginPhone(e.target.value)}
              inputMode="tel"
              placeholder="+91 98765 43210"
            />
          </div>
          <div>
            <label className="label">6-digit OTP</label>
            <input
              className="field num text-center text-lg tracking-[0.5em]"
              value={loginOtp}
              onChange={(e) => setLoginOtp(e.target.value)}
              maxLength={6}
              inputMode="numeric"
            />
            <div className="mt-1.5 text-xs text-nightmuted">
              Demo OTP <span className="font-semibold text-marigold">123456</span>
            </div>
          </div>
          <button type="submit" disabled={loginBusy} className="btn-primary press w-full py-4 text-sm uppercase tracking-wide">
            {loginBusy ? 'Checking…' : 'Login as driver'}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-nightline" />
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-nightmuted">or pair a bus</span>
          <div className="h-px flex-1 bg-nightline" />
        </div>

        <form onSubmit={pair} className="space-y-3">
          <div>
            <label className="label">Bus pairing code</label>
            <input
              className="field font-mono text-xs uppercase"
              value={pairing}
              onChange={(e) => setPairing(e.target.value.toUpperCase())}
              placeholder="BAS-RJ14-AB-1234-7842"
            />
          </div>
          <button type="submit" className="press flex w-full items-center justify-center gap-2 rounded-2xl border border-nightline bg-night-2 py-3.5 text-sm font-semibold text-nightink">
            <QrCode className="h-4 w-4 text-marigold" /> Pair this bus
          </button>
        </form>

        <div className="mt-auto pt-8 text-center text-[11px] leading-relaxed text-nightmuted">
          Android app · version 1.0 · built for one-handed use on the road
        </div>
      </div>
    );
  }

  /* ------------------------------ APP ------------------------------ */
  const navItems = [
    { id: 'shift', label: 'Shift', icon: Navigation },
    { id: 'map', label: 'Map', icon: MapPin },
    { id: 'count', label: 'Count', icon: Users },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'profile', label: 'Profile', icon: ShieldCheck },
  ];

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-night pb-24 text-nightink">
      {toast && (
        <div className="fixed inset-x-3 top-3 z-[1200] mx-auto flex max-w-sm items-center gap-2.5 rounded-2xl border border-nightline bg-night-3 px-4 py-3 text-xs font-medium shadow-lift animate-slide-in">
          <CircleCheck className="h-4 w-4 shrink-0 text-marigold" />
          <span className="flex-1 leading-snug">{toast}</span>
        </div>
      )}

      {/* header */}
      <header className="sticky top-0 z-30 border-b border-nightline bg-night/90 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-night-3 text-[11px] font-bold text-marigold">
            {initials(driver.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{driver.name}</div>
            <div className="flex items-center gap-1.5 truncate text-[11px] text-nightmuted">
              <button onClick={copyCode} className="press font-mono hover:text-nightink">
                {copied ? 'copied' : driver.bus_number}
              </button>
              <span>·</span>
              <span className="truncate">{driver.route_name}</span>
            </div>
          </div>

          <button
            onClick={() => { setIsOnline((v) => !v); buzz(15); }}
            className={`press flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
              isOnline
                ? 'border-leaf/40 bg-leaf/15 text-leaf'
                : 'border-nightline bg-night-2 text-nightmuted'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-leaf live-dot' : 'bg-nightmuted'}`} />
            {isOnline ? 'Online' : 'Offline'}
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-4">
        {/* ---------------- SHIFT ---------------- */}
        {tab === 'shift' && (
          <div className="space-y-4">
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-nightline px-4 py-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-nightmuted">
                  {isTripActive ? 'Live trip' : 'Ready to depart'}
                </span>
                {isTripActive ? (
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-leaf">
                    <span className="live-dot h-1.5 w-1.5 bg-leaf" /> broadcasting
                  </span>
                ) : (
                  <span className="text-[11px] text-nightmuted">GPS paused</span>
                )}
              </div>

              <div className="px-4 pb-4 pt-5 text-center">
                <button
                  onClick={toggleTrip}
                  className={`press relative mx-auto grid h-44 w-44 place-items-center rounded-full border-2 transition-colors ${
                    isTripActive ? 'border-chili/50 bg-chili/10' : 'border-marigold/45 bg-marigold/10'
                  }`}
                >
                  <span className={`absolute inset-3 rounded-full border ${isTripActive ? 'border-chili/20' : 'border-marigold/20'}`} />
                  <span className="relative flex flex-col items-center gap-1.5">
                    {isTripActive ? (
                      <>
                        <Square className="h-9 w-9 fill-chili text-chili" />
                        <span className="text-sm font-extrabold uppercase tracking-[0.12em] text-chili">End trip</span>
                        <span className="num text-xs text-nightmuted">{fmtTime(elapsed)}</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-9 w-9 fill-marigold text-marigold" />
                        <span className="text-sm font-extrabold uppercase tracking-[0.12em] text-marigold">Start trip</span>
                        <span className="text-[11px] text-nightmuted">tap to go live</span>
                      </>
                    )}
                  </span>
                </button>

                <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-nightmuted">
                  <Wifi className="h-3.5 w-3.5 text-marigold" />
                  GPS every 3.5s · {isTripActive ? `${speed} km/h` : 'stationary'}
                </div>
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-nightmuted">Current location</span>
                <span className="text-[10px] text-nightmuted">just now</span>
              </div>
              <div className="mt-2 flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-marigold" />
                <div className="min-w-0 flex-1">
                  <div className="font-display text-lg leading-tight">{point.name}</div>
                  <div className="num mt-0.5 text-[11px] text-nightmuted">
                    {point.lat.toFixed(4)}, {point.lng.toFixed(4)}
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  { label: 'Speed', value: isTripActive ? `${speed}` : '0', unit: 'km/h', icon: Gauge },
                  { label: 'Onboard', value: `${passengers}`, unit: `/${capacity}`, icon: Users },
                  { label: 'Trip', value: isTripActive ? fmtTime(elapsed) : '—', unit: '', icon: Timer },
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label} className="rounded-xl border border-nightline bg-night-3 p-2.5">
                      <div className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-nightmuted">
                        <Icon className="h-3 w-3" /> {s.label}
                      </div>
                      <div className="num mt-1 font-display text-lg leading-none">
                        {s.value}
                        <span className="ml-0.5 text-[10px] font-medium text-nightmuted">{s.unit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={() => setSosOpen(true)} className="press flex items-center gap-2.5 rounded-2xl border border-chili/40 bg-chili/10 p-3.5 text-left">
                <Siren className="h-5 w-5 text-chili" />
                <span>
                  <span className="block text-xs font-bold text-chili">Emergency SOS</span>
                  <span className="block text-[10px] text-nightmuted">Alert the owner</span>
                </span>
              </button>
              <button onClick={() => setTab('count')} className="press flex items-center gap-2.5 rounded-2xl border border-nightline bg-night-2 p-3.5 text-left">
                <Users className="h-5 w-5 text-marigold" />
                <span>
                  <span className="block text-xs font-bold">Passenger count</span>
                  <span className="block text-[10px] text-nightmuted">{passengers} onboard</span>
                </span>
              </button>
              <button onClick={() => setTab('map')} className="press flex items-center gap-2.5 rounded-2xl border border-nightline bg-night-2 p-3.5 text-left">
                <Compass className="h-5 w-5 text-teal" />
                <span>
                  <span className="block text-xs font-bold">Route map</span>
                  <span className="block text-[10px] text-nightmuted">Next: {nextPoint.name}</span>
                </span>
              </button>
              <a href="tel:+919876543210" className="press flex items-center gap-2.5 rounded-2xl border border-nightline bg-night-2 p-3.5 text-left">
                <Phone className="h-5 w-5 text-nightmuted" />
                <span>
                  <span className="block text-xs font-bold">Call owner</span>
                  <span className="block text-[10px] text-nightmuted">+91 98765 43210</span>
                </span>
              </a>
            </div>
          </div>
        )}

        {/* ---------------- MAP ---------------- */}
        {tab === 'map' && (
          <div className="flex h-[calc(100vh-190px)] min-h-[420px] flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="live-dot h-2 w-2 bg-leaf" />
                <span className="text-xs font-semibold">Following your bus</span>
              </div>
              <span className="num rounded-full bg-night-3 px-2.5 py-1 text-xs font-bold text-marigold">
                {isTripActive ? speed : 0} km/h
              </span>
            </div>

            <div className="relative flex-1 overflow-hidden rounded-2xl border border-nightline">
              <MapContainer center={[point.lat, point.lng]} zoom={10} className="h-full w-full">
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Follow center={[point.lat, point.lng]} />
                <Polyline
                  positions={ROUTE_WAYPOINTS.map((w) => [w.lat, w.lng])}
                  color="#EF6A1E"
                  weight={3}
                  opacity={0.75}
                  dashArray="7 7"
                />
                <Marker position={[point.lat, point.lng]} icon={busMarker(isTripActive)}>
                  <Popup>
                    <div className="text-xs">
                      <div className="font-bold">{driver.bus_number}</div>
                      <div>{point.name}</div>
                      <div>{isTripActive ? `${speed} km/h` : 'stopped'}</div>
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>

              <div className="absolute inset-x-3 bottom-3 flex items-center justify-between rounded-xl border border-nightline bg-night/90 px-3 py-2.5 backdrop-blur-md">
                <div className="min-w-0">
                  <div className="text-[9px] uppercase tracking-wider text-nightmuted">Next stop</div>
                  <div className="truncate text-xs font-semibold">{nextPoint.name}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[9px] uppercase tracking-wider text-nightmuted">ETA</div>
                  <div className="text-xs font-semibold text-marigold">~14 min</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- COUNT ---------------- */}
        {tab === 'count' && (
          <div className="space-y-4">
            <div className="card p-5 text-center">
              <h2 className="font-display text-xl">Passenger headcount</h2>
              <p className="mt-1 text-xs text-nightmuted">Waiting passengers see the seats left.</p>

              <div className="mt-5">
                <div className="num font-display text-6xl leading-none">{passengers}</div>
                <div className="mt-1 text-xs text-nightmuted">of {capacity} seats</div>
              </div>

              <div className="mt-5 flex items-center justify-center gap-4">
                <button
                  onClick={() => { setPassengers((p) => Math.max(0, p - 1)); buzz(10); }}
                  className="press grid h-16 w-16 place-items-center rounded-2xl border border-nightline bg-night-3 text-2xl font-bold"
                  aria-label="Remove a passenger"
                >
                  −
                </button>
                <button
                  onClick={() => { setPassengers((p) => Math.min(capacity, p + 1)); buzz(10); }}
                  className="btn-primary press grid h-16 w-16 place-items-center rounded-2xl text-2xl font-bold"
                  aria-label="Add a passenger"
                >
                  +
                </button>
              </div>

              <div className="mt-5 text-left">
                <div className="flex justify-between text-[11px] text-nightmuted">
                  <span>Occupancy</span>
                  <span className="font-semibold text-nightink">{pct}%</span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-night-3">
                  <div className="h-full rounded-full bg-marigold transition-all duration-300" style={{ width: `${pct}%` }} />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-8 gap-1.5">
                {Array.from({ length: capacity }).map((_, i) => (
                  <div
                    key={i}
                    className={`num grid h-5 place-items-center rounded text-[8px] font-bold ${
                      i < passengers ? 'bg-marigold text-[#1A0F06]' : 'bg-night-3 text-nightmuted'
                    }`}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>

              <button onClick={saveCount} className="btn-primary press mt-5 w-full py-3.5 text-xs uppercase tracking-wider">
                Save & broadcast count
              </button>
            </div>
          </div>
        )}

        {/* ---------------- HISTORY ---------------- */}
        {tab === 'history' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl">Trip history</h2>
              <button onClick={loadTrips} className="press flex items-center gap-1 text-xs font-semibold text-nightmuted">
                <RefreshCw className={`h-3.5 w-3.5 ${tripsLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>

            {tripsLoading && (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => <div key={i} className="skeleton h-20 w-full" />)}
              </div>
            )}

            {!tripsLoading && trips.length === 0 && (
              <div className="card px-5 py-10 text-center">
                <Clock className="mx-auto h-7 w-7 text-nightmuted" />
                <div className="mt-3 text-sm font-semibold">No trips yet</div>
                <p className="mx-auto mt-1 max-w-[240px] text-xs text-nightmuted">
                  Start a trip from the Shift tab and it appears here with passengers and earnings.
                </p>
              </div>
            )}

            {!tripsLoading && trips.map((t) => (
              <div key={t.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    t.status === 'COMPLETED' ? 'text-nightmuted' : 'text-marigold'
                  }`}>
                    {t.status === 'COMPLETED' ? 'Completed' : 'Running now'}
                  </span>
                  <span className="num text-sm font-bold">₹{Math.round(t.earnings || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="mt-1.5 text-sm font-semibold">{t.route_name || 'Route'}</div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-nightmuted">
                  <span>{t.passenger_count || 0} passengers</span>
                  <span className="font-mono">{t.bus_number || driver.bus_number}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ---------------- PROFILE ---------------- */}
        {tab === 'profile' && (
          <div className="space-y-4">
            <div className="card p-5 text-center">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-marigold text-2xl font-extrabold text-[#1A0F06]">
                {initials(driver.name)}
              </div>
              <h2 className="mt-3 font-display text-xl">{driver.name}</h2>
              <div className="num mt-0.5 text-xs text-nightmuted">{driver.phone}</div>
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-leaf/15 px-3 py-1 text-[11px] font-semibold text-leaf">
                <ShieldCheck className="h-3.5 w-3.5" /> Consent active
              </div>
            </div>

            <div className="card divide-y divide-nightline">
              {[
                ['Assigned bus', driver.bus_number],
                ['Route', driver.route_name],
                ['Licence', driver.license_number || '—'],
                ['Operator', 'Sharma Travels'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs text-nightmuted">{k}</span>
                  <span className="max-w-[60%] truncate text-xs font-semibold">{v}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => { setIsTripActive(false); setIsLoggedIn(false); }}
              className="press flex w-full items-center justify-center gap-2 rounded-2xl border border-chili/30 bg-chili/10 py-3.5 text-xs font-bold uppercase tracking-wider text-chili"
            >
              <LogOut className="h-4 w-4" /> End shift & log out
            </button>
          </div>
        )}
      </main>

      {/* bottom nav */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-nightline bg-night/95 px-2 pt-1.5 backdrop-blur-xl">
        <div className="flex items-stretch justify-between">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setTab(item.id); buzz(8); }}
                className="press flex flex-1 flex-col items-center gap-1 py-1.5"
              >
                <span className={`grid h-8 w-12 place-items-center rounded-full ${active ? 'bg-marigold text-[#1A0F06]' : 'text-nightmuted'}`}>
                  <Icon className="h-[19px] w-[19px]" strokeWidth={2.2} />
                </span>
                <span className={`text-[10px] font-semibold ${active ? 'text-nightink' : 'text-nightmuted'}`}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* SOS sheet */}
      {sosOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-t-[28px] border-t border-nightline bg-night-2 p-5 animate-slide-in">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-xl text-chili">Emergency SOS</h3>
                <p className="mt-1 text-xs text-nightmuted">Owner gets the alert with your last coordinates.</p>
              </div>
              <button onClick={() => setSosOpen(false)} className="press grid h-9 w-9 place-items-center rounded-xl border border-nightline text-nightmuted">
                ✕
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {SOS_TYPES.map((s) => {
                const Icon = s.icon;
                const active = sosType === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => { setSosType(s.id); buzz(10); }}
                    className={`press rounded-2xl border p-3 text-left ${
                      active ? 'border-chili bg-chili/15' : 'border-nightline bg-night-3'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${active ? 'text-chili' : 'text-nightmuted'}`} />
                    <div className="mt-1.5 text-xs font-bold">{s.label}</div>
                    <div className="text-[10px] text-nightmuted">{s.hint}</div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 rounded-xl bg-night-3 p-3 text-[11px] text-nightmuted">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-marigold" /> {point.name}
              </div>
            </div>

            <button onClick={sendSos} className="press mt-4 w-full rounded-2xl bg-chili py-4 text-sm font-extrabold uppercase tracking-wider text-white">
              Send alert now
            </button>
            <button onClick={() => setSosOpen(false)} className="press mt-2 w-full py-3 text-xs text-nightmuted">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
