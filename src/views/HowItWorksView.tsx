import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Database,
  Pause,
  Play,
  Radio,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { NavSection } from '../engine/types';

interface HowItWorksViewProps {
  onBackToDashboard: () => void;
  onNavigate: (section: NavSection) => void;
  onLaunchDemo: () => void;
}

const STEP_META = [
  { id: 1, title: 'Step 1 — Data Collection', short: 'Sensors' },
  { id: 2, title: 'Step 2 — Data Transmission', short: 'RF Link' },
  { id: 3, title: 'Step 3 — Data Processing', short: 'Pipeline' },
  { id: 4, title: 'Step 4 — Orbital Tracking', short: 'Orbits' },
  { id: 5, title: 'Step 5 — Safety Analysis', short: 'Conjunction' },
  { id: 6, title: 'Step 6 — Anomaly Detection', short: 'Anomalies' },
  { id: 7, title: 'Step 7 — Alert Generation', short: 'Alerts' },
  { id: 8, title: 'Step 8 — Mission Control', short: 'Architecture' },
];

const ORBITAL_PARAM_INFO: Record<string, { label: string; value: string; desc: string }> = {
  coords: {
    label: 'Latitude & Longitude',
    value: '34.12° N, 118.45° W',
    desc: 'Subsatellite nadir point projected onto the WGS-84 Earth ellipsoid from ECI/ECEF coordinates.',
  },
  altitude: {
    label: 'Orbital Altitude (h)',
    value: '550.0 km',
    desc: 'Height above Earth mean equatorial radius (6,378.14 km). Determines atmospheric drag and orbital period.',
  },
  velocity: {
    label: 'Orbital Velocity (v)',
    value: '7.58 km/s',
    desc: 'Tangential speed governed by the vis-viva equation v = sqrt(mu * (2/r - 1/a)).',
  },
  trajectory: {
    label: 'Orbital Trajectory',
    value: 'i = 51.6° · e = 0.0002',
    desc: 'Keplerian ellipse or SGP4 propagated 3D path around Earth center of mass.',
  },
  groundtrack: {
    label: 'Surface Ground Track',
    value: '95.6 min / rev',
    desc: 'Westward-shifting sinusoidal trace across Earth as the planet rotates beneath the orbital plane.',
  },
};

export function HowItWorksView({
  onBackToDashboard,
  onNavigate,
  onLaunchDemo,
}: HowItWorksViewProps) {
  const [step, setStep] = useState(0); // 0..7
  const [autoPlay, setAutoPlay] = useState(false);
  const [animPhase, setAnimPhase] = useState(0);

  // Interactive lab states per step
  const [elevationDeg, setElevationDeg] = useState(32);
  const [selectedPipelineNode, setSelectedPipelineNode] = useState(2);
  const [selectedOrbitParam, setSelectedOrbitParam] = useState<string>('altitude');
  const [simMissDistKm, setSimMissDistKm] = useState(0.85);
  const [simVoltageV, setSimVoltageV] = useState(6.1);

  // Smooth SVG packet/orbital animation pulse
  useEffect(() => {
    const id = window.setInterval(() => {
      setAnimPhase((p) => (p + 1) % 100);
    }, 60);
    return () => window.clearInterval(id);
  }, []);

  // Auto-advance demonstration
  useEffect(() => {
    if (!autoPlay) return;
    const id = window.setInterval(() => {
      setStep((s) => {
        if (s >= 7) {
          setAutoPlay(false);
          return 7;
        }
        return s + 1;
      });
    }, 4500);
    return () => window.clearInterval(id);
  }, [autoPlay]);

  const progressPct = Math.round(((step + 1) / 8) * 100);
  const packetX = 95 + (animPhase / 100) * 330;
  const packetY = 70 + (animPhase / 100) * 105;

  const linkLocked = elevationDeg >= 10;
  const simLinkDbm = linkLocked ? -84 + elevationDeg * 0.25 : -118;

  const simRisk =
    simMissDistKm < 0.6
      ? { level: 'RED', label: 'Critical Alert', cls: 'text-red-400' }
      : simMissDistKm < 2.0
        ? { level: 'ORANGE', label: 'Potential Risk', cls: 'text-orange-400' }
        : simMissDistKm < 6.0
          ? { level: 'YELLOW', label: 'Monitoring Required', cls: 'text-yellow-300' }
          : { level: 'GREEN', label: 'Normal', cls: 'text-emerald-400' };

  const voltageAnomaly = simVoltageV < 6.7 || simVoltageV > 8.4;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header & Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-cyan-300">INTERACTIVE ENGINEERING WALKTHROUGH</p>
          <h1 className="font-display text-2xl font-bold text-white tracking-tight mt-0.5">
            How NEXORBIT Works
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoPlay((p) => !p)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold transition-colors cursor-pointer"
          >
            {autoPlay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {autoPlay ? 'Pause Demonstration' : 'Start Demonstration'}
          </button>

          <button
            type="button"
            onClick={() => {
              setAutoPlay(false);
              setStep(0);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-700 bg-[#0D1422] hover:bg-slate-800 text-xs text-slate-200 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restart
          </button>

          <button
            type="button"
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-700 bg-[#0D1422] hover:bg-slate-800 text-xs text-slate-300 cursor-pointer"
          >
            Skip Introduction
          </button>

          <button
            type="button"
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-xs text-cyan-200 cursor-pointer"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Stepper & Progress Indicator */}
      <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-4 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-white">{STEP_META[step].title}</span>
          <span className="font-mono text-cyan-300 tabular-nums">
            Stage {step + 1} of 8 ({progressPct}%)
          </span>
        </div>

        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-cyan-400 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 pt-1">
          {STEP_META.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setAutoPlay(false);
                setStep(idx);
              }}
              className={`px-2 py-1.5 rounded text-[11px] font-medium transition-colors cursor-pointer truncate ${
                idx === step
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : idx < step
                    ? 'bg-slate-800/70 text-slate-200 border border-transparent'
                    : 'bg-[#0A101D] text-slate-400 border border-slate-800/70 hover:text-white'
              }`}
            >
              {idx + 1}. {s.short}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Stage Canvas */}
      <section className="rounded-lg border border-slate-800 bg-[#0D1422] p-6 min-h-[420px] flex flex-col justify-between gap-6">
        {/* STEP 1 — DATA COLLECTION */}
        {step === 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-5 space-y-4">
              <h2 className="font-display text-xl font-bold text-white">
                Step 1: Onboard Spacecraft Data Collection
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Every spacecraft carries an integrated suite of sensors sampling bus health and orbital kinematics continuously at millisecond-to-second intervals.
              </p>
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                {[
                  { name: 'GNSS / GPS Receiver', desc: 'ECI position & timing lock' },
                  { name: 'Thermal Thermistors', desc: 'Bus & payload °C loops' },
                  { name: 'EPS Voltage Shunts', desc: 'Battery V & solar array W' },
                  { name: '3-Axis Gyroscope', desc: 'Body angular rates (°/s)' },
                  { name: 'IMU Accelerometer', desc: 'Thrust & drag forces (m/s²)' },
                  { name: 'S/X-Band Transceiver', desc: 'Downlink packet framing' },
                ].map((sensor) => (
                  <div key={sensor.name} className="rounded border border-slate-800 bg-[#0A101D] p-2.5">
                    <p className="font-semibold text-cyan-300">{sensor.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{sensor.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-7 rounded-lg border border-slate-800 bg-[#070B14] p-4">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-2">
                <span>ANIMATED SENSOR TELEMETRY DOWNLINK</span>
                <span className="text-cyan-300">PACKET STREAMING</span>
              </div>
              <svg viewBox="0 0 520 220" className="w-full h-56" role="img" aria-label="Animated telemetry packet transmission from satellite to ground station">
                {/* Space arc */}
                <path d="M 30 205 Q 260 150 490 205" fill="none" stroke="#1E293B" strokeWidth="2" />
                {/* Satellite */}
                <g transform="translate(80, 58)">
                  <rect x="-18" y="-12" width="36" height="24" rx="3" fill="#1E293B" stroke="#38BDF8" strokeWidth="1.5" />
                  <rect x="-48" y="-6" width="26" height="12" fill="#0C4A6E" stroke="#38BDF8" strokeWidth="1" />
                  <rect x="22" y="-6" width="26" height="12" fill="#0C4A6E" stroke="#38BDF8" strokeWidth="1" />
                  <text x="0" y="-20" textAnchor="middle" fill="#E2E8F0" fontSize="10" fontFamily="JetBrains Mono">
                    SPACECRAFT BUS
                  </text>
                </g>

                {/* Transmission Beam */}
                <line x1="95" y1="70" x2="425" y2="175" stroke="#06B6D4" strokeOpacity="0.35" strokeDasharray="5 4" strokeWidth="1.5" />

                {/* Animated Packet */}
                <g transform={`translate(${packetX}, ${packetY})`}>
                  <rect x="-18" y="-9" width="36" height="18" rx="3" fill="#0EA5E9" />
                  <text x="0" y="3" textAnchor="middle" fill="#070B14" fontSize="8.5" fontWeight="bold" fontFamily="JetBrains Mono">
                    CCSDS
                  </text>
                </g>

                {/* Ground Station */}
                <g transform="translate(430, 178)">
                  <polygon points="-14,18 14,18 0,-6" fill="#1E293B" stroke="#10B981" strokeWidth="1.5" />
                  <path d="M -14 -8 Q 0 -20 14 -8" fill="none" stroke="#10B981" strokeWidth="2" />
                  <text x="0" y="32" textAnchor="middle" fill="#34D399" fontSize="10" fontFamily="JetBrains Mono">
                    GROUND STATION
                  </text>
                </g>
              </svg>
            </div>
          </div>
        )}

        {/* STEP 2 — DATA TRANSMISSION */}
        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-5 space-y-4">
              <h2 className="font-display text-xl font-bold text-white">
                Step 2: RF Ground-Station Communication
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Telemetry packets travel over S-band or X-band radio links. Successful reception depends on geometric line-of-sight visibility, antenna elevation angle, link budget margin, and ground-station pass availability.
              </p>

              <div className="rounded-lg border border-slate-800 bg-[#0A101D] p-4 space-y-3">
                <div className="flex justify-between text-xs">
                  <label htmlFor="hiw-elev" className="text-slate-300 font-medium">
                    Spacecraft Elevation Angle Above Horizon
                  </label>
                  <span className="font-mono text-cyan-300">{elevationDeg}°</span>
                </div>
                <input
                  id="hiw-elev"
                  type="range"
                  min={0}
                  max={85}
                  value={elevationDeg}
                  onChange={(e) => setElevationDeg(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
                <div className="flex justify-between text-xs font-mono pt-1">
                  <span className={linkLocked ? 'text-emerald-400' : 'text-red-400'}>
                    {linkLocked ? '● LINK LOCKED (>= 10° Mask)' : '✖ BELOW HORIZON MASK (LOS)'}
                  </span>
                  <span className="text-slate-200">{simLinkDbm.toFixed(1)} dBm</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 rounded-lg border border-slate-800 bg-[#070B14] p-5 space-y-3">
              <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3 rounded bg-[#0D1422] border border-slate-800">
                  <p className="text-slate-400">Carrier Band</p>
                  <p className="text-white font-semibold mt-1">2.24 GHz (S-Band)</p>
                </div>
                <div className="p-3 rounded bg-[#0D1422] border border-slate-800">
                  <p className="text-slate-400">Link Margin</p>
                  <p className={`font-semibold mt-1 ${linkLocked ? 'text-emerald-400' : 'text-red-400'}`}>
                    {linkLocked ? `+${(elevationDeg * 0.25 + 4.5).toFixed(1)} dB` : '-3.2 dB (Drop)'}
                  </p>
                </div>
                <div className="p-3 rounded bg-[#0D1422] border border-slate-800">
                  <p className="text-slate-400">Frame Integrity</p>
                  <p className="text-cyan-300 font-semibold mt-1">{linkLocked ? '99.6%' : '0.0%'}</p>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Try dragging the elevation slider below 10° to observe how ground-station horizon masking interrupts RF packet downlink.
              </p>
            </div>
          </div>
        )}

        {/* STEP 3 — DATA PROCESSING */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-display text-xl font-bold text-white">
                Step 3: Ingestion & Telemetry Processing Pipeline
              </h2>
              <p className="text-sm text-slate-300 mt-1">
                Click any stage in the pipeline below to inspect how raw RF frames become calibrated engineering units.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
              {[
                { title: '1. Satellite Data', desc: 'Raw binary CCSDS frames sampled onboard.' },
                { title: '2. Ground Station', desc: 'Demodulates RF carrier & verifies CRC checksum.' },
                { title: '3. Data Processing', desc: 'Decommutates hex words into °C, V, km/s.' },
                { title: '4. Database', desc: 'Time-series archive & mission event storage.' },
                { title: '5. Monitoring Engine', desc: 'Evaluates thresholds, Z-scores & conjunctions.' },
              ].map((node, idx) => (
                <button
                  key={node.title}
                  type="button"
                  onClick={() => setSelectedPipelineNode(idx)}
                  className={`text-left rounded-lg border p-3.5 transition-colors cursor-pointer ${
                    selectedPipelineNode === idx
                      ? 'border-cyan-400 bg-cyan-500/15'
                      : 'border-slate-800 bg-[#0A101D] hover:border-slate-700'
                  }`}
                >
                  <p className="text-xs font-semibold text-white">{node.title}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{node.desc}</p>
                </button>
              ))}
            </div>

            <div className="rounded-lg border border-slate-800 bg-[#070B14] p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div>
                <span className="text-slate-400 block">Bus Voltage (EPS)</span>
                <span className="text-white text-sm font-semibold">7.42 V</span>
                <span className="text-slate-400 block text-[11px] mt-0.5">Li-Ion 2S nominal rail</span>
              </div>
              <div>
                <span className="text-slate-400 block">Internal Temp</span>
                <span className="text-white text-sm font-semibold">28.4 °C</span>
                <span className="text-slate-400 block text-[11px] mt-0.5">Avionics deck thermistor</span>
              </div>
              <div>
                <span className="text-slate-400 block">Angular Rate</span>
                <span className="text-white text-sm font-semibold">0.064 °/s</span>
                <span className="text-slate-400 block text-[11px] mt-0.5">Nadir pitch hold</span>
              </div>
              <div>
                <span className="text-slate-400 block">Pipeline Stage</span>
                <span className="text-cyan-300 text-sm font-semibold">
                  Stage {selectedPipelineNode + 1} Active
                </span>
                <span className="text-slate-400 block text-[11px] mt-0.5">Latency &lt; 120 ms</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4 — ORBITAL TRACKING */}
        {step === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-6 space-y-4">
              <h2 className="font-display text-xl font-bold text-white">
                Step 4: Real-Time Orbital Tracking & Propagation
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Click any orbital parameter to examine how NEXORBIT computes spacecraft position and predicts ground tracks using Keplerian mechanics and SGP4.
              </p>

              <div className="flex flex-wrap gap-2">
                {Object.entries(ORBITAL_PARAM_INFO).map(([key, info]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedOrbitParam(key)}
                    className={`px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors ${
                      selectedOrbitParam === key
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-[#0A101D] text-slate-300 border border-slate-800 hover:text-white'
                    }`}
                  >
                    {info.label}
                  </button>
                ))}
              </div>

              <div className="rounded-lg border border-slate-800 bg-[#0A101D] p-4">
                <p className="font-mono text-xs text-cyan-300">
                  {ORBITAL_PARAM_INFO[selectedOrbitParam].label} · {ORBITAL_PARAM_INFO[selectedOrbitParam].value}
                </p>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  {ORBITAL_PARAM_INFO[selectedOrbitParam].desc}
                </p>
              </div>
            </div>

            <div className="lg:col-span-6 rounded-lg border border-slate-800 bg-[#070B14] p-4 flex items-center justify-center">
              <svg viewBox="0 0 280 220" className="w-full h-56" role="img" aria-label="Animated orbital trajectory around Earth">
                <circle cx="140" cy="110" r="52" fill="#0C2D48" stroke="#38BDF8" strokeWidth="1.2" />
                <ellipse cx="140" cy="110" rx="108" ry="44" transform="rotate(-24 140 110)" fill="none" stroke="#38BDF8" strokeDasharray="4 3" strokeWidth="1.5" />
                {(() => {
                  const ang = (animPhase / 100) * Math.PI * 2;
                  const rx = 108 * Math.cos(ang);
                  const ry = 44 * Math.sin(ang);
                  const rot = (-24 * Math.PI) / 180;
                  const sx = 140 + rx * Math.cos(rot) - ry * Math.sin(rot);
                  const sy = 110 + rx * Math.sin(rot) + ry * Math.cos(rot);
                  return (
                    <>
                      <line x1="140" y1="110" x2={sx} y2={sy} stroke="#F59E0B" strokeOpacity="0.45" strokeDasharray="2 2" />
                      <circle cx={sx} cy={sy} r="6" fill="#38BDF8" />
                    </>
                  );
                })()}
              </svg>
            </div>
          </div>
        )}

        {/* STEP 5 — SAFETY ANALYSIS */}
        {step === 4 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-6 space-y-4">
              <h2 className="font-display text-xl font-bold text-white">
                Step 5: Conjunction & Orbital Safety Screening
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                NEXORBIT propagates secondary catalog objects forward to evaluate Time to Closest Approach (TCA), relative velocity, and miss distance. Collision probability is computed strictly when covariance uncertainty is available.
              </p>

              <div className="rounded-lg border border-slate-800 bg-[#0A101D] p-4 space-y-3">
                <div className="flex justify-between text-xs">
                  <label htmlFor="hiw-miss" className="text-slate-300 font-medium">
                    Simulated Miss Distance (km)
                  </label>
                  <span className="font-mono text-white">{simMissDistKm.toFixed(2)} km</span>
                </div>
                <input
                  id="hiw-miss"
                  type="range"
                  min={0.2}
                  max={8.0}
                  step={0.1}
                  value={simMissDistKm}
                  onChange={(e) => setSimMissDistKm(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
                <div className="flex items-center justify-between text-xs font-mono pt-1">
                  <span className={simRisk.cls}>
                    RISK LEVEL: {simRisk.level} ({simRisk.label})
                  </span>
                  <span className="text-slate-400">Rel Vel: 13.8 km/s</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 rounded-lg border border-slate-800 bg-[#070B14] p-4 text-xs space-y-3">
              <p className="font-mono text-[11px] text-amber-300">
                SIMULATED CLOSE-APPROACH SCENARIO
              </p>
              <div className="grid grid-cols-2 gap-3 font-mono">
                <div className="p-3 rounded bg-[#0D1422] border border-slate-800">
                  <span className="text-slate-400 block">Primary</span>
                  <span className="text-white">NEXORBIT SAT-01</span>
                </div>
                <div className="p-3 rounded bg-[#0D1422] border border-slate-800">
                  <span className="text-slate-400 block">Secondary</span>
                  <span className="text-white">COSMOS DEB (SIM)</span>
                </div>
                <div className="p-3 rounded bg-[#0D1422] border border-slate-800">
                  <span className="text-slate-400 block">TCA Window</span>
                  <span className="text-cyan-300">T-24.6 min</span>
                </div>
                <div className="p-3 rounded bg-[#0D1422] border border-slate-800">
                  <span className="text-slate-400 block">Screening Result</span>
                  <span className={simRisk.cls}>{simRisk.level}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6 — ANOMALY DETECTION */}
        {step === 5 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-amber-300">
                  EXAMPLE SIMULATION VALUES
                </span>
              </div>
              <h2 className="font-display text-xl font-bold text-white">
                Step 6: Telemetry Anomaly Detection Lab
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Every incoming telemetry frame is evaluated against calibrated operating envelopes and statistical Z-score baselines. Test the battery voltage detector below:
              </p>

              <div className="rounded-lg border border-slate-800 bg-[#0A101D] p-4 space-y-3">
                <div className="flex justify-between text-xs">
                  <label htmlFor="hiw-volt" className="text-slate-300 font-medium">
                    Detected Bus Voltage (Normal: 7.4 V, Min Floor: 6.7 V)
                  </label>
                  <span className="font-mono text-white font-semibold">{simVoltageV.toFixed(1)} V</span>
                </div>
                <input
                  id="hiw-volt"
                  type="range"
                  min={5.6}
                  max={8.6}
                  step={0.1}
                  value={simVoltageV}
                  onChange={(e) => setSimVoltageV(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>
            </div>

            <div className="lg:col-span-6 rounded-lg border border-slate-800 bg-[#070B14] p-5 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">NORMAL BATTERY VOLTAGE: 7.4 V</span>
                <span className={voltageAnomaly ? 'text-red-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                  {voltageAnomaly ? '▲ ANOMALY DETECTED' : '● WITHIN ENVELOPE'}
                </span>
              </div>
              <div className="p-4 rounded bg-[#0D1422] border border-slate-800 space-y-2 text-xs">
                <p className="font-mono text-lg font-bold text-white">
                  Observed: {simVoltageV.toFixed(1)} V
                </p>
                <p className="text-slate-300">
                  {voltageAnomaly
                    ? 'System identifies an unusual bus voltage departure outside [6.7 V – 8.4 V]. A power subsystem warning is automatically generated.'
                    : 'Battery bus voltage lies comfortably inside nominal regulation bounds.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 7 — ALERT GENERATION */}
        {step === 6 && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold text-white">
              Step 7: Actionable Alert Generation & Operator Workflow
            </h2>
            <p className="text-sm text-slate-300 max-w-3xl">
              Rather than emitting raw error codes, NEXORBIT attaches subsystem context, root-cause hypotheses, and an engineering investigation checklist to every alert.
            </p>

            <div className="rounded-lg border border-orange-500/40 bg-[#0A101D] p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                <span className="inline-flex items-center gap-1.5 text-orange-400 font-semibold">
                  <AlertTriangle className="w-4 h-4" />
                  WARNING · POWER SUBSYSTEM (EXAMPLE)
                </span>
                <span className="text-slate-400">Detected: 2026-11-23 18:24:10 UTC</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1">
                <div>
                  <p className="text-slate-400">Observed vs Normal</p>
                  <p className="font-mono text-white font-semibold mt-0.5">6.10 V (Norm: 6.70 – 8.50 V)</p>
                </div>
                <div>
                  <p className="text-slate-400">Possible Explanation</p>
                  <p className="text-slate-200 mt-0.5">
                    Unusual Li-Ion bus voltage sag during high payload draw or MPPT regulator dropout.
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Suggested Investigation</p>
                  <p className="text-cyan-300 mt-0.5">
                    Verify battery cell tap voltages, inspect shunt regulator current, and shed non-essential loads.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 8 — MISSION CONTROL & FULL DATA-FLOW DIAGRAM */}
        {step === 7 && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-bold text-white">
                  Step 8: Unified Mission Control Architecture
                </h2>
                <p className="text-sm text-slate-300 mt-1">
                  Engineers monitor spacecraft health, 3D orbital mechanics, anomaly diagnostics, and conjunction safety from one integrated console.
                </p>
              </div>
              <button
                type="button"
                onClick={onLaunchDemo}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                Launch Live 9-Stage Demo Mode
              </button>
            </div>

            {/* End-to-End Animated Data Flow Diagram */}
            <div className="rounded-lg border border-slate-800 bg-[#070B14] p-4 overflow-x-auto">
              <div className="min-w-[680px] flex items-center justify-between gap-2 text-xs">
                {[
                  { label: 'Sensors', icon: Activity, action: () => onNavigate('telemetry') },
                  { label: 'RF Ground Link', icon: Radio, action: () => onNavigate('tracking') },
                  { label: 'Database & State', icon: Database, action: () => onNavigate('history') },
                  { label: 'Safety Engine', icon: ShieldAlert, action: () => onNavigate('safety') },
                  { label: 'Anomaly Engine', icon: AlertTriangle, action: () => onNavigate('anomalies') },
                  { label: 'Mission Control', icon: CheckCircle2, action: onBackToDashboard },
                ].map((stage, i, arr) => {
                  const Icon = stage.icon;
                  const activeIdx = Math.floor((animPhase / 100) * arr.length);
                  const isHighlighted = i === activeIdx;
                  return (
                    <div key={stage.label} className="flex items-center gap-2 flex-1">
                      <button
                        type="button"
                        onClick={stage.action}
                        className={`flex-1 rounded-lg border p-3 text-center transition-colors cursor-pointer ${
                          isHighlighted
                            ? 'border-cyan-400 bg-cyan-500/15 text-white'
                            : 'border-slate-800 bg-[#0D1422] text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <Icon className="w-4 h-4 mx-auto text-cyan-400 mb-1.5" />
                        <p className="font-medium whitespace-nowrap">{stage.label}</p>
                      </button>
                      {i < arr.length - 1 && (
                        <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Prev / Next Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => {
              setAutoPlay(false);
              setStep((s) => Math.max(0, s - 1));
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-slate-700 bg-[#0A101D] hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium text-white cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Previous
          </button>

          {step < 7 ? (
            <button
              type="button"
              onClick={() => {
                setAutoPlay(false);
                setStep((s) => Math.min(7, s + 1));
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold cursor-pointer"
            >
              Next
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onBackToDashboard}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold cursor-pointer"
            >
              Return to Overview Dashboard
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
