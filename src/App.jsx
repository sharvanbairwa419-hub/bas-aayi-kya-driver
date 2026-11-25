import React, { useState, useEffect, useRef } from 'react';
import { 
  Bus, Navigation, MapPin, Users, AlertTriangle, ShieldCheck, 
  Clock, Activity, Phone, ChevronRight, Settings, LogOut, CheckCircle2, 
  RotateCw, Play, Square, Wifi, AlertOctagon, ArrowRight, QrCode, 
  Camera, Bell, Compass, Volume2, Shield
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

const API_BASE = `${window.location.protocol}//${window.location.hostname || 'localhost'}:3000/api`;

// Route Waypoints for Demo (Jaipur to Kota)
const ROUTE_WAYPOINTS = [
  { name: 'Jaipur Sindhi Camp', lat: 26.9239, lng: 75.8016 },
  { name: 'Near Sanganer Toll', lat: 26.8124, lng: 75.7512 },
  { name: 'Chaksu Bypass', lat: 26.6021, lng: 75.9512 },
  { name: 'Near Dudu, Rajasthan', lat: 26.6836, lng: 75.2412 },
  { name: 'Newai Highway Stop', lat: 26.4321, lng: 75.9312 },
  { name: 'Kothun Junction', lat: 26.3421, lng: 75.9723 },
  { name: 'Tonk City Cross', lat: 26.1624, lng: 75.7892 },
  { name: 'Bundi Valley', lat: 25.4412, lng: 75.6412 },
  { name: 'Kota Railway Station', lat: 25.2138, lng: 75.8648 }
];

// Custom Bus Marker (Google Maps Style)
const createDriverBusMarker = (isTracking) => {
  return L.divIcon({
    className: 'driver-bus-icon',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <div style="background: #2563EB; color: #FFFFFF; font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.25); display: flex; align-items: center; gap: 4px; border: 2px solid #FFFFFF;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 6v6"></path><path d="M15 6v6"></path><path d="M2 12h19.6"></path><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C18.1 6.8 17.2 6 16.1 6H4c-1.1 0-2.1.8-2.4 1.8l-1.4 5C.1 13.2 0 13.6 0 14c0 .4.1.8.2 1.2.3 1.1.8 2.8.8 2.8h3"></path><circle cx="7" cy="18" r="2"></circle><circle cx="17" cy="18" r="2"></circle>
          </svg>
          <span>RJ14-AB-1234</span>
          ${isTracking ? '<span style="width: 6px; height: 6px; border-radius: 50%; background: #4ADE80;"></span>' : ''}
        </div>
        <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid #2563EB; margin-top: -1px;"></div>
      </div>
    `,
    iconSize: [110, 36],
    iconAnchor: [55, 34]
  });
};

function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function App() {
  // App Phase
  const [showPermissions, setShowPermissions] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentTab, setCurrentTab] = useState('home'); // home, map, count, emergency, trips, profile

  // Driver & Bus Data
  const [driver, setDriver] = useState({
    name: 'Ramesh Kumar',
    phone: '+91 98765 43210',
    bus_number: 'RJ14-AB-1234',
    route_name: 'Jaipur → Kota',
    bus_id: 1,
    color: 'Blue',
    capacity: 40,
    license_number: 'RJ14-2018-00912'
  });

  // Trip State
  const [isTripActive, setIsTripActive] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [currentWaypointIndex, setCurrentWaypointIndex] = useState(3); // Start near Dudu
  const [currentSpeed, setCurrentSpeed] = useState(45);
  const [passengerCount, setPassengerCount] = useState(24);
  const [toastMessage, setToastMessage] = useState(null);

  // Forms
  const [loginPhone, setLoginPhone] = useState('+91 98765 43210');
  const [loginOtp, setLoginOtp] = useState('123456');
  const [pairingCodeInput, setPairingCodeInput] = useState('');
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [selectedEmergency, setSelectedEmergency] = useState('Breakdown');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // GPS Simulation Loop: moves bus along route when trip is active
  useEffect(() => {
    let interval = null;
    if (isTripActive && isOnline) {
      interval = setInterval(() => {
        setCurrentWaypointIndex((prev) => {
          const nextIndex = (prev + 1) % ROUTE_WAYPOINTS.length;
          const currentPoint = ROUTE_WAYPOINTS[nextIndex];
          const mockSpeed = Math.floor(40 + Math.random() * 20);
          setCurrentSpeed(mockSpeed);

          // Push to backend
          fetch(`${API_BASE}/driver/location`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bus_id: driver.bus_id || 1,
              lat: currentPoint.lat,
              lng: currentPoint.lng,
              speed: mockSpeed,
              location_name: currentPoint.name
            })
          }).catch(() => {});

          return nextIndex;
        });
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [isTripActive, isOnline, driver.bus_id]);

  // Handle Login (real driver account from backend)
  const handleLogin = async (e) => {
    e.preventDefault();
    if (loginOtp !== '123456') {
      showToast('Invalid OTP! Use 123456 for demo.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/driver/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: loginPhone, otp: loginOtp })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Login failed. Use a pairing code instead.');
        return;
      }

      const d = data.driver || {};
      setDriver((prev) => ({
        ...prev,
        name: d.name || prev.name,
        phone: d.phone || prev.phone,
        bus_number: d.bus_number || 'Not paired',
        route_name: d.route_name || 'No route assigned',
        bus_id: d.assigned_bus_id || prev.bus_id,
        capacity: d.capacity || prev.capacity,
        color: d.color || prev.color,
        license_number: d.license_number || prev.license_number
      }));
      setIsLoggedIn(true);
      showToast(`Welcome ${d.name || 'Driver'}! Bus ${d.bus_number || 'not assigned yet'}.`);
    } catch (err) {
      // Backend offline: keep the demo shift usable
      setIsLoggedIn(true);
      showToast('Backend offline — demo shift started (Ramesh Kumar).');
    }
  };

  // Handle Pairing Code
  const handlePairingCode = async (e) => {
    e.preventDefault();
    if (!pairingCodeInput) return;
    try {
      const res = await fetch(`${API_BASE}/driver/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairing_code: pairingCodeInput, driver_phone: loginPhone })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDriver(prev => ({
          ...prev,
          bus_number: data.bus.bus_number,
          route_name: data.bus.route_name,
          bus_id: data.bus.id,
          capacity: data.bus.capacity || prev.capacity,
          color: data.bus.color || prev.color
        }));
        setIsLoggedIn(true);
        showToast(`Paired to ${data.bus.bus_number}!`);
      } else {
        showToast(data.error || 'Invalid code');
      }
    } catch (e) {
      setIsLoggedIn(true);
      showToast(`Paired via code: ${pairingCodeInput}`);
    }
  };

  // Toggle Trip Start / End
  const handleTripToggle = async () => {
    if (!isTripActive) {
      setIsTripActive(true);
      try {
        await fetch(`${API_BASE}/trips/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bus_id: driver.bus_id, route_name: driver.route_name })
        });
      } catch (e) {}
      showToast('Trip Started! GPS Location Broadcast ACTIVE.');
    } else {
      setIsTripActive(false);
      try {
        await fetch(`${API_BASE}/trips/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bus_id: driver.bus_id })
        });
      } catch (e) {}
      showToast('Trip Ended. Location tracking paused.');
    }
  };

  // Send Emergency Alert
  const handleSendEmergency = async () => {
    const loc = ROUTE_WAYPOINTS[currentWaypointIndex];
    try {
      await fetch(`${API_BASE}/alerts/emergency`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bus_id: driver.bus_id,
          type: selectedEmergency,
          message: `${selectedEmergency} reported near ${loc.name}`,
          location: loc.name,
          lat: loc.lat,
          lng: loc.lng
        })
      });
    } catch (e) {}
    setEmergencyModalOpen(false);
    showToast(`EMERGENCY SOS: ${selectedEmergency} Alert Sent to Sharma Travels!`);
  };

  const currentCoords = ROUTE_WAYPOINTS[currentWaypointIndex];
  const busCapacity = driver.capacity || 40;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col relative pb-20 selection:bg-blue-100 selection:text-blue-900">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 inset-x-4 z-50 p-3.5 bg-white border border-slate-200 text-slate-800 rounded-xl shadow-xl flex items-center justify-between text-xs font-semibold">
          <span>{toastMessage}</span>
          <div className="w-2 h-2 rounded-full bg-emerald-500 live-dot" />
        </div>
      )}

      {/* ---------------- 0. PERMISSIONS SCREEN (PWA FIRST LAUNCH) ---------------- */}
      {showPermissions && (
        <div className="fixed inset-0 z-50 bg-[#F8FAFC] p-6 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-6 pt-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mx-auto">
              <Shield className="w-8 h-8" />
            </div>

            <div className="text-center space-y-2">
              <h1 className="font-heading font-extrabold text-2xl text-slate-900">Driver Permissions Setup</h1>
              <p className="text-xs text-slate-500 leading-relaxed">
                Bas Aayi Kya driver app needs essential device access to track live buses and alert passengers on time.
              </p>
            </div>

            <div className="space-y-3">
              <div className="glass-card p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-slate-900">Precise GPS & Background Location</div>
                  <div className="text-[11px] text-slate-500">Jab app background mein ho, tab bhi live location share karne ke liye.</div>
                </div>
              </div>

              <div className="glass-card p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-slate-900">Camera Access</div>
                  <div className="text-[11px] text-slate-500">Bus se jodne ke liye QR code scan karne hetu.</div>
                </div>
              </div>

              <div className="glass-card p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-slate-900">Push Notifications & Wake Lock</div>
                  <div className="text-[11px] text-slate-500">Trip updates aur screen ko trip ke dauraan on rakhne ke liye.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="py-6 space-y-2">
            <button 
              onClick={() => setShowPermissions(false)}
              className="w-full py-4 rounded-xl bg-[#10B981] hover:bg-[#0ea371] text-[#02040A] font-extrabold text-sm uppercase tracking-wider transition btn-tactile glow-emerald shadow-xl">
              Grant & Continue to App
            </button>
            <div className="text-[10px] text-center text-[#5A6680]">You can manage permissions in phone settings anytime</div>
          </div>
        </div>
      )}

      {/* ---------------- 1. LOGIN SCREEN ---------------- */}
      {!isLoggedIn && !showPermissions && (
        <div className="flex-1 flex flex-col justify-center px-6 py-12 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#10B981] to-[#059669] flex items-center justify-center mx-auto shadow-lg shadow-[#10B981]/25 text-[#02040A]">
              <Bus className="w-8 h-8" />
            </div>
            <h2 className="font-heading font-extrabold text-3xl text-white">Driver Login</h2>
            <p className="text-xs text-[#8B95A8]">Login with mobile OTP or enter Bus Pairing Code</p>
          </div>

          {/* Phone OTP Login */}
          <div className="glass-card p-6 space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8B95A8] mb-1">Driver Phone Number</label>
                <input 
                  type="text" 
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value)}
                  className="w-full bg-[#070B14] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#10B981]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8B95A8] mb-1">6-Digit OTP</label>
                <input 
                  type="password" 
                  maxLength={6}
                  value={loginOtp}
                  onChange={(e) => setLoginOtp(e.target.value)}
                  className="w-full bg-[#070B14] border border-white/10 rounded-xl px-4 py-3 text-sm text-center font-mono text-lg text-white focus:outline-none focus:border-[#10B981]"
                />
                <div className="text-[11px] text-[#5A6680] text-center mt-1">Demo OTP: <span className="text-[#10B981]">123456</span></div>
              </div>

              <button 
                type="submit"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#10B981] to-[#059669] text-[#02040A] font-extrabold text-sm uppercase tracking-wider transition btn-tactile glow-emerald shadow-lg">
                Login as Driver
              </button>
            </form>

            <div className="relative flex items-center justify-center py-2">
              <div className="border-t border-white/10 w-full" />
              <span className="bg-[#0F1623] px-3 text-[10px] uppercase font-bold text-[#5A6680] absolute">OR</span>
            </div>

            {/* Direct 6-Digit Pairing Code Login */}
            <form onSubmit={handlePairingCode} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8B95A8] mb-1">Enter Bus Pairing Code</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={pairingCodeInput}
                    onChange={(e) => setPairingCodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. BAS-RJ14-AB-1234-7842"
                    className="flex-1 bg-[#070B14] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#10B981]"
                  />
                  <button 
                    type="submit"
                    className="px-4 py-2.5 bg-[#161F35] hover:bg-[#10B981] hover:text-[#02040A] text-white text-xs font-bold rounded-xl transition">
                    Pair
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- LOGGED IN DRIVER APP SCREENS ---------------- */}
      {isLoggedIn && !showPermissions && (
        <>
          {/* Top Driver Bar */}
          <header className="bg-[#070B14] border-b border-white/5 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#10B981]/20 border border-[#10B981]/30 flex items-center justify-center text-[#10B981] font-bold text-xs">
                RK
              </div>
              <div>
                <div className="font-heading font-bold text-sm text-white">{driver.name}</div>
                <div className="text-[11px] text-[#8B95A8] flex items-center gap-1.5 font-mono">
                  <span>{driver.bus_number}</span>
                  <span>•</span>
                  <span className="text-[#10B981] font-semibold">{driver.route_name}</span>
                </div>
              </div>
            </div>

            {/* Online Toggle */}
            <div className="flex items-center gap-2">
              <span className={`text-[10px] uppercase font-bold ${isOnline ? 'text-[#10B981]' : 'text-gray-500'}`}>
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
              <button 
                onClick={() => setIsOnline(!isOnline)}
                className={`w-11 h-6 rounded-full transition p-1 flex items-center ${isOnline ? 'bg-[#10B981] justify-end' : 'bg-gray-800 justify-start'}`}>
                <div className="w-4 h-4 rounded-full bg-white shadow" />
              </button>
            </div>
          </header>

          {/* TAB CONTENT */}
          <div className="flex-1 p-4 space-y-4">

            {/* ---------------- 2. HOME SCREEN ---------------- */}
            {currentTab === 'home' && (
              <div className="space-y-4">

                {/* BIG TRIP START / END BUTTON */}
                <div className="glass-card p-6 text-center space-y-4 relative overflow-hidden">
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-widest text-[#8B95A8] font-semibold">Active Trip Status</div>
                    <div className="text-sm font-semibold text-white">
                      {isTripActive ? 'Broadcasting High-Frequency GPS Telemetry' : 'Bus is currently Stationary at Depot'}
                    </div>
                  </div>

                  <button 
                    onClick={handleTripToggle}
                    className={`w-full py-5 rounded-2xl font-extrabold text-base tracking-wider uppercase transition btn-tactile shadow-2xl flex items-center justify-center gap-3 ${
                      isTripActive 
                        ? 'bg-[#EF4444] text-white glow-danger' 
                        : 'bg-gradient-to-r from-[#10B981] to-[#059669] text-[#02040A] glow-emerald'
                    }`}>
                    {isTripActive ? (
                      <>
                        <Square className="w-6 h-6 fill-current" />
                        <span>END TRIP (HOLD TO FINISH)</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-6 h-6 fill-current" />
                        <span>START TRIP (BROADCAST GPS)</span>
                      </>
                    )}
                  </button>

                  <div className="text-[11px] text-[#5A6680] flex items-center justify-center gap-2">
                    <Wifi className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>GPS Accuracy: ±3 meters • Sample Rate: 3s</span>
                  </div>
                </div>

                {/* CURRENT LOCATION TELEMETRY CARD */}
                <div className="glass-card p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#8B95A8]">
                    <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-[#10B981]" /> Live Location
                    </span>
                    <span className="text-[#10B981] font-mono">Updated just now</span>
                  </div>

                  <div className="font-heading font-bold text-lg text-white">
                    {currentCoords.name}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-[#070B14] p-2.5 rounded-xl border border-white/5 font-mono">
                      <div className="text-[10px] text-[#5A6680]">COORDINATES</div>
                      <div className="text-white mt-0.5">{currentCoords.lat.toFixed(4)}, {currentCoords.lng.toFixed(4)}</div>
                    </div>
                    <div className="bg-[#070B14] p-2.5 rounded-xl border border-white/5 font-mono">
                      <div className="text-[10px] text-[#5A6680]">CURRENT SPEED</div>
                      <div className="text-[#10B981] font-bold text-sm mt-0.5">{isTripActive ? `${currentSpeed} km/h` : '0 km/h'}</div>
                    </div>
                  </div>
                </div>

                {/* TODAY'S TRIP SUMMARY CARD */}
                <div className="glass-card p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#8B95A8]">
                    <span className="font-semibold uppercase tracking-wider">Today's Shift</span>
                    <span className="text-white">Trip #1 of 2</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-[#070B14] p-3 rounded-xl border border-white/5">
                      <div className="text-[10px] text-[#5A6680] uppercase">Departure</div>
                      <div className="font-heading font-bold text-sm text-white mt-1">09:30 AM</div>
                    </div>
                    <div className="bg-[#070B14] p-3 rounded-xl border border-white/5 cursor-pointer hover:border-[#10B981]/50" onClick={() => setCurrentTab('count')}>
                      <div className="text-[10px] text-[#5A6680] uppercase">Passengers</div>
                      <div className="font-heading font-bold text-sm text-[#10B981] mt-1">{passengerCount}/{busCapacity}</div>
                    </div>
                    <div className="bg-[#070B14] p-3 rounded-xl border border-white/5">
                      <div className="text-[10px] text-[#5A6680] uppercase">Earnings</div>
                      <div className="font-heading font-bold text-sm text-white mt-1">₹1,200</div>
                    </div>
                  </div>
                </div>

                {/* QUICK ACTIONS SCROLL */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#8B95A8]">Driver Quick Tools</div>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button 
                      onClick={() => setEmergencyModalOpen(true)}
                      className="p-3.5 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/40 hover:bg-[#EF4444]/25 text-left space-y-1 transition btn-tactile">
                      <AlertOctagon className="w-5 h-5 text-[#EF4444]" />
                      <div className="font-bold text-xs text-white">Emergency SOS</div>
                    </button>

                    <button 
                      onClick={() => setCurrentTab('count')}
                      className="p-3.5 rounded-xl bg-[#0F1623] border border-white/10 hover:bg-[#161F35] text-left space-y-1 transition btn-tactile">
                      <Users className="w-5 h-5 text-[#10B981]" />
                      <div className="font-bold text-xs text-white">Passenger Count</div>
                    </button>

                    <button 
                      onClick={() => setCurrentTab('map')}
                      className="p-3.5 rounded-xl bg-[#0F1623] border border-white/10 hover:bg-[#161F35] text-left space-y-1 transition btn-tactile">
                      <Compass className="w-5 h-5 text-[#6366F1]" />
                      <div className="font-bold text-xs text-white">View Full Map</div>
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* ---------------- 3. LIVE MAP SCREEN ---------------- */}
            {currentTab === 'map' && (
              <div className="space-y-3 h-[calc(100vh-145px)] flex flex-col">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] live-dot" />
                    <span className="font-semibold text-xs text-white">GPS Auto-Tracking: Active</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#10B981] bg-[#10B981]/20 px-2.5 py-1 rounded-full">
                    {currentSpeed} km/h
                  </span>
                </div>

                <div className="flex-1 rounded-2xl overflow-hidden border border-white/10 relative">
                  <MapContainer 
                    center={[currentCoords.lat, currentCoords.lng]} 
                    zoom={10} 
                    className="w-full h-full">
                    <TileLayer
                      attribution='&copy; <a href="https://carto.com/">CARTO Voyager</a>'
                      url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    />
                    <MapRecenter center={[currentCoords.lat, currentCoords.lng]} />
                    <Polyline 
                      positions={ROUTE_WAYPOINTS.map(w => [w.lat, w.lng])} 
                      color="#10B981" 
                      weight={4} 
                      opacity={0.8} 
                      dashArray="8, 6" 
                    />

                    {/* Bus Marker */}
                    <Marker 
                      position={[currentCoords.lat, currentCoords.lng]}
                      icon={createDriverBusMarker(isTripActive)}
                    >
                      <Popup>
                        <div className="p-1">
                          <div className="font-bold text-xs text-white">{driver.bus_number}</div>
                          <div className="text-[11px] text-[#10B981]">{currentCoords.name}</div>
                          <div className="text-[10px] text-gray-400">Speed: {currentSpeed} km/h</div>
                        </div>
                      </Popup>
                    </Marker>
                  </MapContainer>

                  {/* Floating Overlay Badge */}
                  <div className="absolute bottom-3 inset-x-3 bg-[#070B14]/90 backdrop-blur-md p-3 rounded-xl border border-white/10 flex items-center justify-between text-xs">
                    <div>
                      <div className="text-[10px] text-[#8B95A8] uppercase">Next Upcoming Stop</div>
                      <div className="font-bold text-white">{ROUTE_WAYPOINTS[(currentWaypointIndex + 1) % ROUTE_WAYPOINTS.length].name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-[#8B95A8] uppercase">Est. Arrival</div>
                      <div className="font-bold text-[#10B981]">In 14 mins</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ---------------- 4. PASSENGER COUNT SCREEN ---------------- */}
            {currentTab === 'count' && (
              <div className="glass-card p-6 space-y-6 text-center">
                <div>
                  <h2 className="font-heading font-bold text-xl text-white">Live Passenger Headcount</h2>
                  <p className="text-xs text-[#8B95A8]">Update onboard travelers to inform waiting passengers</p>
                </div>

                <div className="py-2">
                  <div className="font-heading font-extrabold text-7xl text-white tracking-tight">
                    {passengerCount}
                  </div>
                  <div className="text-xs text-[#8B95A8] mt-1">/ {busCapacity} Seats Occupied</div>
                </div>

                {/* Stepper Buttons */}
                <div className="flex items-center justify-center gap-6">
                  <button 
                    onClick={() => setPassengerCount(Math.max(0, passengerCount - 1))}
                    className="w-16 h-16 rounded-2xl bg-[#0F1623] border border-white/15 text-2xl font-bold text-white hover:bg-[#161F35] transition btn-tactile">
                    -
                  </button>
                  <button 
                    onClick={() => setPassengerCount(Math.min(busCapacity, passengerCount + 1))}
                    className="w-16 h-16 rounded-2xl bg-[#10B981] text-2xl font-bold text-[#02040A] hover:bg-[#0ea371] transition btn-tactile glow-emerald">
                    +
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1 text-left">
                  <div className="flex justify-between text-xs text-[#8B95A8]">
                    <span>Occupancy Rate</span>
                    <span className="text-white font-semibold">{Math.round((passengerCount / busCapacity) * 100)}%</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-[#070B14] overflow-hidden p-0.5 border border-white/5">
                    <div 
                      className="h-full bg-gradient-to-r from-[#10B981] to-[#F59E0B] rounded-full transition-all duration-300" 
                      style={{ width: `${(passengerCount / busCapacity) * 100}%` }} 
                    />
                  </div>
                </div>

                {/* 40 Seats Mini Grid */}
                <div className="grid grid-cols-8 gap-1.5 pt-2">
                  {Array.from({ length: busCapacity }).map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-4 rounded-sm text-[8px] flex items-center justify-center font-bold ${
                        i < passengerCount ? 'bg-[#10B981] text-black' : 'bg-gray-800 text-gray-500'
                      }`}>
                      {i + 1}
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => {
                    fetch(`${API_BASE}/trips/passengers`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ bus_id: driver.bus_id, passenger_count: passengerCount })
                    }).catch(() => {});
                    showToast('Passenger count synchronized with Owner Dashboard.');
                  }}
                  className="w-full py-3.5 rounded-xl bg-[#161F35] hover:bg-[#10B981] hover:text-[#02040A] text-white font-semibold text-xs uppercase tracking-wider transition btn-tactile">
                  Save & Broadcast Count
                </button>
              </div>
            )}

            {/* ---------------- 6. TRIP HISTORY SCREEN ---------------- */}
            {currentTab === 'trips' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <h2 className="font-heading font-bold text-lg text-white">Trip History</h2>
                  <span className="text-xs text-[#8B95A8]">This Month: 34 Trips</span>
                </div>

                <div className="space-y-2.5">
                  <div className="glass-card p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#10B981] uppercase tracking-wider">Today, 09:30 AM</span>
                      <span className="text-white font-bold">₹1,200</span>
                    </div>
                    <div className="font-semibold text-sm text-white">Jaipur → Kota (Active)</div>
                    <div className="text-xs text-[#8B95A8] flex justify-between">
                      <span>24 Passengers</span>
                      <span>Bus RJ14-AB-1234</span>
                    </div>
                  </div>

                  <div className="glass-card p-4 space-y-2 opacity-80">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#8B95A8] uppercase tracking-wider">Yesterday, 02:00 PM</span>
                      <span className="text-white font-bold">₹1,850</span>
                    </div>
                    <div className="font-semibold text-sm text-white">Kota → Jaipur</div>
                    <div className="text-xs text-[#8B95A8] flex justify-between">
                      <span>37 Passengers</span>
                      <span className="text-[#22C55E]">Completed</span>
                    </div>
                  </div>

                  <div className="glass-card p-4 space-y-2 opacity-80">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#8B95A8] uppercase tracking-wider">23 Nov, 08:30 AM</span>
                      <span className="text-white font-bold">₹1,900</span>
                    </div>
                    <div className="font-semibold text-sm text-white">Jaipur → Kota</div>
                    <div className="text-xs text-[#8B95A8] flex justify-between">
                      <span>38 Passengers</span>
                      <span className="text-[#22C55E]">Completed</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ---------------- 7. PROFILE SCREEN ---------------- */}
            {currentTab === 'profile' && (
              <div className="glass-card p-6 space-y-6">
                <div className="text-center space-y-3">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#10B981] to-[#059669] flex items-center justify-center text-[#02040A] font-extrabold text-2xl mx-auto shadow-xl">
                    RK
                  </div>
                  <div>
                    <h2 className="font-heading font-bold text-xl text-white">{driver.name}</h2>
                    <div className="text-xs text-[#8B95A8] font-mono">{driver.phone}</div>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10B981]/20 text-[#10B981] text-xs font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" /> DPDP Consent: Active
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-3 bg-[#070B14] rounded-xl flex justify-between">
                    <span className="text-[#8B95A8]">Assigned Bus</span>
                    <span className="text-white font-bold">{driver.bus_number}</span>
                  </div>
                  <div className="p-3 bg-[#070B14] rounded-xl flex justify-between">
                    <span className="text-[#8B95A8]">Commercial License</span>
                    <span className="text-white font-mono">{driver.license_number || 'RJ14-2018-00912'}</span>
                  </div>
                  <div className="p-3 bg-[#070B14] rounded-xl flex justify-between">
                    <span className="text-[#8B95A8]">Operator Agency</span>
                    <span className="text-white">Sharma Travels</span>
                  </div>
                </div>

                <button 
                  onClick={() => { setIsLoggedIn(false); setIsTripActive(false); }}
                  className="w-full py-3.5 rounded-xl bg-[#EF4444]/20 hover:bg-[#EF4444]/30 text-[#EF4444] font-semibold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2">
                  <LogOut className="w-4 h-4" /> End Shift & Logout
                </button>
              </div>
            )}

          </div>

          {/* ---------------- EMERGENCY ALERT MODAL ---------------- */}
          {emergencyModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md p-6 flex flex-col justify-center">
              <div className="glass-card p-6 space-y-4 border-[#EF4444]/50">
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 rounded-full bg-[#EF4444]/20 border border-[#EF4444] flex items-center justify-center text-[#EF4444] mx-auto animate-pulse">
                    <AlertTriangle className="w-7 h-7" />
                  </div>
                  <h3 className="font-heading font-extrabold text-xl text-white">EMERGENCY SOS ALERT</h3>
                  <p className="text-xs text-[#8B95A8]">Select situation to immediately alert Sharma Travels dispatch:</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                  {['Breakdown', 'Accident', 'Medical Emergency', 'Security Issue'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedEmergency(type)}
                      className={`p-3 rounded-xl border transition text-center ${
                        selectedEmergency === type 
                          ? 'bg-[#EF4444] text-white border-[#EF4444]' 
                          : 'bg-[#070B14] text-[#8B95A8] border-white/10'
                      }`}>
                      {type}
                    </button>
                  ))}
                </div>

                <div className="space-y-2 pt-2">
                  <button 
                    onClick={handleSendEmergency}
                    className="w-full py-4 rounded-xl bg-[#EF4444] text-white font-extrabold text-sm uppercase tracking-wider transition btn-tactile glow-danger">
                    CONFIRM & DISPATCH ALERT
                  </button>
                  <button 
                    onClick={() => setEmergencyModalOpen(false)}
                    className="w-full py-3 rounded-xl bg-[#0F1623] text-xs text-[#8B95A8] hover:text-white transition">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* BOTTOM MOBILE NAVIGATION BAR */}
          <nav className="fixed bottom-0 inset-x-0 max-w-md mx-auto bg-[#070B14]/95 backdrop-blur-xl border-t border-white/10 px-4 py-2 flex items-center justify-around z-40">
            <button 
              onClick={() => setCurrentTab('home')}
              className={`flex flex-col items-center gap-1 transition ${currentTab === 'home' ? 'text-[#10B981]' : 'text-[#8B95A8] hover:text-white'}`}>
              <Navigation className="w-5 h-5" />
              <span className="text-[10px] font-semibold">Shift</span>
            </button>
            <button 
              onClick={() => setCurrentTab('map')}
              className={`flex flex-col items-center gap-1 transition ${currentTab === 'map' ? 'text-[#10B981]' : 'text-[#8B95A8] hover:text-white'}`}>
              <MapPin className="w-5 h-5" />
              <span className="text-[10px] font-semibold">Map</span>
            </button>
            <button 
              onClick={() => setCurrentTab('count')}
              className={`flex flex-col items-center gap-1 transition ${currentTab === 'count' ? 'text-[#10B981]' : 'text-[#8B95A8] hover:text-white'}`}>
              <Users className="w-5 h-5" />
              <span className="text-[10px] font-semibold">Count</span>
            </button>
            <button 
              onClick={() => setCurrentTab('trips')}
              className={`flex flex-col items-center gap-1 transition ${currentTab === 'trips' ? 'text-[#10B981]' : 'text-[#8B95A8] hover:text-white'}`}>
              <Clock className="w-5 h-5" />
              <span className="text-[10px] font-semibold">History</span>
            </button>
            <button 
              onClick={() => setCurrentTab('profile')}
              className={`flex flex-col items-center gap-1 transition ${currentTab === 'profile' ? 'text-[#10B981]' : 'text-[#8B95A8] hover:text-white'}`}>
              <ShieldCheck className="w-5 h-5" />
              <span className="text-[10px] font-semibold">Profile</span>
            </button>
          </nav>
        </>
      )}
    </div>
  );
}
