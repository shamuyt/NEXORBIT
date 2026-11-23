import { Pause, Play, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { type CameraPreset, EarthOrbitCanvas } from '../components/EarthOrbitCanvas';
import { GroundTrackMap } from '../components/GroundTrackMap';
import type { MissionControlSnapshot } from '../engine/types';
import { formatDistance, formatLatLon, formatSpeed } from '../utils/formatters';

interface LiveTrackingViewProps {
  snapshot: MissionControlSnapshot;
  onControlSimulation: (payload: {
    action?: 'start' | 'pause' | 'reset';
    speed?: number;
    spacecraftId?: string;
  }) => void;
}

export function LiveTrackingView({ snapshot, onControlSimulation }: LiveTrackingViewProps) {
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('earth');
  const [showGroundTrack, setShowGroundTrack] = useState(true);
  const [showGroundStations, setShowGroundStations] = useState(true);
  const [showConjunctions, setShowConjunctions] = useState(true);

  const { activeSpacecraft: sat, orbitalState: orb, catalog, settings, simulationRunning, simulationSpeed } = snapshot;
  const alt = formatDistance(orb.altitudeKm, settings.units, 2);
  const vel = formatSpeed(orb.velocityKmS, settings.units, 3);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">
            Live Spacecraft Tracking
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Interactive 3D orbital visualizer & surface ground track · {sat.provenance}
          </p>
        </div>

        {/* Simulation Playback Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="sat-selector" className="sr-only">
            Select Satellite
          </label>
          <select
            id="sat-selector"
            value={sat.id}
            onChange={(e) => onControlSimulation({ spacecraftId: e.target.value })}
            className="px-3 py-2 rounded-md border border-slate-700 bg-[#0D1422] text-xs font-medium text-white"
          >
            {catalog.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.id})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => onControlSimulation({ action: simulationRunning ? 'pause' : 'start' })}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            {simulationRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {simulationRunning ? 'Pause Tracking' : 'Start Tracking'}
          </button>

          <button
            type="button"
            onClick={() => onControlSimulation({ action: 'reset' })}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-700 bg-[#0D1422] hover:bg-slate-800 text-xs text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>

          <select
            aria-label="Simulation speed multiplier"
            value={simulationSpeed}
            onChange={(e) => onControlSimulation({ speed: Number(e.target.value) })}
            className="px-2.5 py-2 rounded-md border border-slate-700 bg-[#0D1422] text-xs font-mono text-cyan-300"
          >
            <option value={1}>1x Real-Time</option>
            <option value={5}>5x Speed</option>
            <option value={10}>10x Speed</option>
            <option value={25}>25x Speed</option>
            <option value={50}>50x Speed</option>
          </select>
        </div>
      </div>

      {/* Main 3D Stage + Inspector Split */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <div className="xl:col-span-8 flex flex-col gap-3">
          <EarthOrbitCanvas
            orbitalState={orb}
            orbitalTrack={snapshot.orbitalTrack}
            groundStations={snapshot.groundStations}
            conjunctions={snapshot.conjunctions}
            showGroundTrack={showGroundTrack}
            showGroundStations={showGroundStations}
            showConjunctions={showConjunctions}
            cameraPreset={cameraPreset}
            heightClass="h-[460px]"
            spacecraftName={sat.name}
          />

          {/* Compact Docked Viewport Controls */}
          <div className="rounded-lg border border-slate-800 bg-[#0D1422] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 mr-1">Camera:</span>
              {(['earth', 'follow', 'nadir'] as CameraPreset[]).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCameraPreset(preset)}
                  className={`px-2.5 py-1 rounded text-xs font-medium capitalize transition-colors cursor-pointer ${
                    cameraPreset === preset
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-slate-800/70 text-slate-300 hover:text-white border border-transparent'
                  }`}
                >
                  {preset === 'earth' ? 'Global Earth' : preset === 'follow' ? 'Follow Craft' : 'Nadir Lock'}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-slate-300">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showGroundTrack}
                  onChange={(e) => setShowGroundTrack(e.target.checked)}
                  className="accent-cyan-400"
                />
                Ground Track
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showGroundStations}
                  onChange={(e) => setShowGroundStations(e.target.checked)}
                  className="accent-cyan-400"
                />
                Ground Stations
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showConjunctions}
                  onChange={(e) => setShowConjunctions(e.target.checked)}
                  className="accent-cyan-400"
                />
                Risk Vectors
              </label>
            </div>
          </div>
        </div>

        {/* Right Side Ephemeris & Spacecraft State */}
        <div className="xl:col-span-4 flex flex-col gap-4">
          <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="font-display text-sm font-semibold text-white">{sat.name}</h2>
                <p className="text-[11px] font-mono text-slate-400">
                  NORAD {sat.noradId} · {sat.elements.propagationModel}
                </p>
              </div>
              <span className="font-mono text-[11px] text-cyan-300">{sat.provenance}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded bg-[#0A101D] border border-slate-800/80">
                <p className="text-slate-400">Latitude</p>
                <p className="font-mono text-base font-semibold text-white mt-0.5 tabular-nums">
                  {formatLatLon(orb.latitudeDeg, true)}
                </p>
              </div>
              <div className="p-2.5 rounded bg-[#0A101D] border border-slate-800/80">
                <p className="text-slate-400">Longitude</p>
                <p className="font-mono text-base font-semibold text-white mt-0.5 tabular-nums">
                  {formatLatLon(orb.longitudeDeg, false)}
                </p>
              </div>
              <div className="p-2.5 rounded bg-[#0A101D] border border-slate-800/80">
                <p className="text-slate-400">Altitude</p>
                <p className="font-mono text-base font-semibold text-white mt-0.5 tabular-nums">
                  {alt.value} <span className="text-xs text-slate-400">{alt.unit}</span>
                </p>
              </div>
              <div className="p-2.5 rounded bg-[#0A101D] border border-slate-800/80">
                <p className="text-slate-400">Velocity</p>
                <p className="font-mono text-base font-semibold text-white mt-0.5 tabular-nums">
                  {vel.value} <span className="text-xs text-slate-400">{vel.unit}</span>
                </p>
              </div>
            </div>

            <dl className="space-y-2 text-xs pt-1">
              <div className="flex justify-between">
                <dt className="text-slate-400">Orbit Direction</dt>
                <dd className="font-mono text-slate-200">{orb.orbitDirection}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Solar Illumination</dt>
                <dd className={`font-mono ${orb.inSunlight ? 'text-amber-300' : 'text-slate-400'}`}>
                  {orb.inSunlight ? 'SUNLIT' : 'UMBRA ECLIPSE'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Ground Station Link</dt>
                <dd className="font-mono text-emerald-400">
                  {orb.activeGroundStation
                    ? `${orb.activeGroundStation} (${orb.groundStationElevationDeg}°)`
                    : 'No Line-of-Sight Pass'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">ECI Position (km)</dt>
                <dd className="font-mono text-slate-300 tabular-nums">
                  [{orb.eciPositionKm.x.toFixed(0)}, {orb.eciPositionKm.y.toFixed(0)}, {orb.eciPositionKm.z.toFixed(0)}]
                </dd>
              </div>
            </dl>
          </div>

          <GroundTrackMap
            orbitalState={orb}
            orbitalTrack={snapshot.orbitalTrack}
            groundStations={snapshot.groundStations}
          />
        </div>
      </div>
    </div>
  );
}
