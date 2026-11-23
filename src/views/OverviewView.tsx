import { BookOpen, Pause, Play, RotateCcw } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { EarthOrbitCanvas } from '../components/EarthOrbitCanvas';
import { SubsystemBadge } from '../components/StatusText';
import type { MissionControlSnapshot, NavSection } from '../engine/types';
import {
  formatDistance,
  formatLatLon,
  formatSpeed,
  formatTemp,
  formatUtcShort,
} from '../utils/formatters';

interface OverviewViewProps {
  snapshot: MissionControlSnapshot;
  onNavigate: (section: NavSection) => void;
  onLaunchDemo: () => void;
  onControlSimulation: (payload: { action: 'start' | 'pause' | 'reset' }) => void;
}

export function OverviewView({
  snapshot,
  onNavigate,
  onLaunchDemo,
  onControlSimulation,
}: OverviewViewProps) {
  const {
    activeSpacecraft: sat,
    orbitalState: orb,
    latestTelemetry: tel,
    telemetryHistory,
    settings,
    simulationRunning,
  } = snapshot;

  const alt = formatDistance(tel.altitudeKm, settings.units, 1);
  const vel = formatSpeed(tel.velocityKmS, settings.units, 2);
  const temp = formatTemp(tel.internalTempC, settings.units, 1);

  const chartData = telemetryHistory.slice(-30).map((frame) => ({
    time: formatUtcShort(frame.timestampIso),
    altitude: Number(
      (settings.units === 'IMPERIAL' ? frame.altitudeKm * 0.621371 : frame.altitudeKm).toFixed(2),
    ),
    velocity: Number(
      (settings.units === 'IMPERIAL' ? frame.velocityKmS * 2236.936 : frame.velocityKmS).toFixed(3),
    ),
    temp: Number(
      (settings.units === 'IMPERIAL' ? (frame.internalTempC * 9) / 5 + 32 : frame.internalTempC).toFixed(1),
    ),
    solarPower: frame.solarPowerW,
    busDraw: frame.busPowerDrawW,
  }));

  const telemetryCards: Array<{ label: string; value: string; unit: string; sub?: string }> = [
    { label: 'Altitude', value: alt.value, unit: alt.unit, sub: orb.orbitDirection },
    { label: 'Orbital Velocity', value: vel.value, unit: vel.unit, sub: `Period ${tel.orbitalPeriodMin} min` },
    { label: 'Latitude', value: formatLatLon(tel.latitudeDeg, true), unit: 'WGS-84' },
    { label: 'Longitude', value: formatLatLon(tel.longitudeDeg, false), unit: 'WGS-84' },
    { label: 'Orbital Period', value: tel.orbitalPeriodMin.toFixed(1), unit: 'min', sub: `Inc ${tel.inclinationDeg.toFixed(2)}°` },
    { label: 'Inclination', value: tel.inclinationDeg.toFixed(2), unit: 'deg' },
    { label: 'Battery Voltage', value: tel.batteryVoltageV.toFixed(2), unit: 'V', sub: `SoC ${tel.batterySocPct}%` },
    { label: 'Solar Panel Output', value: tel.solarPowerW.toFixed(0), unit: 'W', sub: orb.inSunlight ? 'Sunlit' : 'Eclipse' },
    { label: 'Internal Temperature', value: temp.value, unit: temp.unit },
    {
      label: 'Signal Strength',
      value: tel.signalStrengthDbm.toFixed(1),
      unit: 'dBm',
      sub: orb.activeGroundStation ? `Link: ${orb.activeGroundStation}` : 'Awaiting Ground Pass',
    },
  ];

  const subsystems: Array<{ name: string; status: typeof tel.subsystems.power }> = [
    { name: 'Communications', status: tel.subsystems.communications },
    { name: 'Power Subsystem', status: tel.subsystems.power },
    { name: 'Thermal Subsystem', status: tel.subsystems.thermal },
    { name: 'Navigation Subsystem', status: tel.subsystems.navigation },
    { name: 'Attitude Control (ADCS)', status: tel.subsystems.attitudeControl },
  ];

  return (
    <div className="space-y-6">
      {/* Header Row with Primary Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">
            Mission Control Overview
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {sat.name} · {sat.missionId} · {sat.provenance}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onControlSimulation({ action: simulationRunning ? 'pause' : 'start' })}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-slate-700 bg-[#0D1422] hover:bg-slate-800 text-xs font-medium text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            {simulationRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {simulationRunning ? 'Pause Stream' : 'Resume Stream'}
          </button>

          <button
            type="button"
            onClick={() => onControlSimulation({ action: 'reset' })}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-slate-700 bg-[#0D1422] hover:bg-slate-800 text-xs font-medium text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>

          <button
            type="button"
            onClick={() => onNavigate('how-it-works')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-sky-500/40 bg-sky-500/15 hover:bg-sky-500/25 text-xs font-semibold text-sky-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            <BookOpen className="w-3.5 h-3.5" />
            HOW IT WORKS
          </button>

          <button
            type="button"
            onClick={onLaunchDemo}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5" />
            Start Demo Mode
          </button>
        </div>
      </div>

      {/* Section A + C + 3D Globe Split */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <div className="xl:col-span-5 flex flex-col gap-5">
          {/* A. Spacecraft Information */}
          <section className="rounded-lg border border-slate-800 bg-[#0D1422] p-5">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="font-display text-sm font-semibold text-white">
                Spacecraft Dossier
              </h2>
              <span className="font-mono text-[11px] text-cyan-300">{sat.missionStatus}</span>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
              <div>
                <dt className="text-slate-400">Spacecraft Name</dt>
                <dd className="font-medium text-white mt-0.5">{sat.name}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Satellite ID / NORAD</dt>
                <dd className="font-mono text-slate-200 mt-0.5">
                  {sat.id} / {sat.noradId}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Mission ID</dt>
                <dd className="font-mono text-slate-200 mt-0.5">{sat.missionId}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Launch Date</dt>
                <dd className="font-mono text-slate-200 mt-0.5">{sat.launchDate}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-slate-400">Orbit Classification & Propagator</dt>
                <dd className="text-slate-200 mt-0.5">
                  {sat.orbitType} · <span className="font-mono text-cyan-300">{sat.elements.propagationModel}</span>
                </dd>
              </div>
            </dl>
          </section>

          {/* C. Mission Health */}
          <section className="rounded-lg border border-slate-800 bg-[#0D1422] p-5 flex-1">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="font-display text-sm font-semibold text-white">
                Mission Health Matrix
              </h2>
              <div className="text-right">
                <span className="font-mono text-2xl font-bold text-white tabular-nums">
                  {tel.overallHealthPct.toFixed(1)}%
                </span>
                <span className="text-[11px] text-slate-400 ml-1.5">Composite</span>
              </div>
            </div>
            <div className="w-full h-2 rounded bg-slate-800 overflow-hidden mb-4">
              <div
                className={`h-full transition-all duration-300 ${
                  tel.overallHealthPct >= 90
                    ? 'bg-emerald-500'
                    : tel.overallHealthPct >= 75
                      ? 'bg-amber-400'
                      : 'bg-red-500'
                }`}
                style={{ width: `${tel.overallHealthPct}%` }}
              />
            </div>

            <div className="divide-y divide-slate-800/80">
              {subsystems.map((sub) => (
                <div key={sub.name} className="py-2.5 flex items-center justify-between text-xs">
                  <span className="text-slate-300">{sub.name}</span>
                  <SubsystemBadge status={sub.status} />
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Interactive 3D Globe */}
        <div className="xl:col-span-7 flex flex-col">
          <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-4 flex-1 flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h2 className="font-display text-sm font-semibold text-white">
                  Orbital Position & Trajectory
                </h2>
                <p className="text-[11px] text-slate-400">
                  Interactive 3D Earth · {sat.provenance}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('tracking')}
                className="text-xs font-medium text-cyan-400 hover:text-cyan-300 cursor-pointer"
              >
                Open Full 3D Tracking →
              </button>
            </div>
            <div className="flex-1 min-h-[340px]">
              <EarthOrbitCanvas
                orbitalState={orb}
                orbitalTrack={snapshot.orbitalTrack}
                groundStations={snapshot.groundStations}
                conjunctions={snapshot.conjunctions}
                heightClass="h-full min-h-[340px]"
                spacecraftName={sat.name}
              />
            </div>
          </div>
        </div>
      </div>

      {/* B. Live Telemetry Grid (10 cards) */}
      <section aria-label="Live Telemetry Metrics">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-sm font-semibold text-white">
            Live Telemetry Channels
          </h2>
          <span className="font-mono text-[11px] text-slate-400 tabular-nums">
            PKT #{tel.packetSeq} · Integrity {tel.packetIntegrityPct}%
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {telemetryCards.map((c) => (
            <div
              key={c.label}
              className="rounded-lg border border-slate-800 bg-[#0D1422] p-3.5"
            >
              <p className="text-[11px] text-slate-400 truncate">{c.label}</p>
              <p className="mt-1.5 font-mono text-xl font-semibold text-white tabular-nums">
                {c.value}
                <span className="text-xs font-normal text-slate-400 ml-1">{c.unit}</span>
              </p>
              {c.sub && (
                <p className="mt-1 text-[11px] font-mono text-slate-400 truncate">{c.sub}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* D. Time-Series Visualizations (4 synchronized charts) */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5" aria-label="Telemetry History Charts">
        <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-4">
          <h3 className="text-xs font-semibold text-white mb-3">
            Altitude History ({alt.unit})
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="time" stroke="#64748B" fontSize={10} />
                <YAxis stroke="#64748B" fontSize={10} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0A101D',
                    borderColor: '#1E293B',
                    fontSize: '11px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="altitude"
                  stroke="#38BDF8"
                  fill="#0EA5E9"
                  fillOpacity={0.16}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-4">
          <h3 className="text-xs font-semibold text-white mb-3">
            Velocity History ({vel.unit})
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="time" stroke="#64748B" fontSize={10} />
                <YAxis stroke="#64748B" fontSize={10} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0A101D',
                    borderColor: '#1E293B',
                    fontSize: '11px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="velocity"
                  stroke="#06B6D4"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-4">
          <h3 className="text-xs font-semibold text-white mb-3">
            Internal Bus Temperature ({temp.unit})
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="time" stroke="#64748B" fontSize={10} />
                <YAxis stroke="#64748B" fontSize={10} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0A101D',
                    borderColor: '#1E293B',
                    fontSize: '11px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="temp"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-4">
          <h3 className="text-xs font-semibold text-white mb-3">
            Power Generation vs Bus Consumption (W)
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="time" stroke="#64748B" fontSize={10} />
                <YAxis stroke="#64748B" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0A101D',
                    borderColor: '#1E293B',
                    fontSize: '11px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="solarPower"
                  name="Solar Gen (W)"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="busDraw"
                  name="Bus Draw (W)"
                  stroke="#F97316"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}
