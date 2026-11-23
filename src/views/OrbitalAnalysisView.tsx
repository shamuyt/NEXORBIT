import { useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { GroundTrackMap } from '../components/GroundTrackMap';
import type { MissionControlSnapshot } from '../engine/types';
import { formatDistance, formatLatLon, formatSpeed, formatUtcShort } from '../utils/formatters';

interface OrbitalAnalysisViewProps {
  snapshot: MissionControlSnapshot;
  onControlSimulation: (payload: { spacecraftId: string }) => void;
}

export function OrbitalAnalysisView({ snapshot, onControlSimulation }: OrbitalAnalysisViewProps) {
  const { activeSpacecraft: sat, orbitalState: orb, predictions, settings, catalog } = snapshot;
  const el = sat.elements;
  const [horizonLimit, setHorizonLimit] = useState<number>(180);

  const filteredPredictions = predictions.filter((p) => p.offsetMinutes <= horizonLimit);

  const sma = formatDistance(el.semiMajorAxisKm, settings.units, 3);
  const perigee = formatDistance(el.perigeeAltKm, settings.units, 2);
  const apogee = formatDistance(el.apogeeAltKm, settings.units, 2);

  const elementCards = [
    { symbol: 'a', name: 'Semi-Major Axis', value: sma.value, unit: sma.unit },
    { symbol: 'e', name: 'Eccentricity', value: el.eccentricity.toFixed(6), unit: 'dimless' },
    { symbol: 'i', name: 'Inclination', value: el.inclinationDeg.toFixed(3), unit: 'deg' },
    { symbol: 'Ω', name: 'RAAN', value: el.raanDeg.toFixed(2), unit: 'deg' },
    { symbol: 'ω', name: 'Argument of Perigee', value: el.argPerigeeDeg.toFixed(2), unit: 'deg' },
    { symbol: 'ν', name: 'True Anomaly', value: el.trueAnomalyDeg.toFixed(2), unit: 'deg' },
    { symbol: 'hp', name: 'Perigee Altitude', value: perigee.value, unit: perigee.unit },
    { symbol: 'ha', name: 'Apogee Altitude', value: apogee.value, unit: apogee.unit },
    { symbol: 'T', name: 'Orbital Period', value: el.orbitalPeriodMin.toFixed(2), unit: 'min' },
  ];

  const altProfileData = filteredPredictions.map((p) => ({
    offset: `+${p.offsetMinutes}m`,
    altitude: Number(
      (settings.units === 'IMPERIAL' ? p.altitudeKm * 0.621371 : p.altitudeKm).toFixed(2),
    ),
    velocity: Number(
      (settings.units === 'IMPERIAL' ? p.velocityKmS * 2236.936 : p.velocityKmS).toFixed(3),
    ),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">
            Orbital Mechanics & Ephemeris Analysis
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Classical Keplerian elements, J2 nodal precession & future orbit prediction · {sat.provenance}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            aria-label="Select spacecraft for orbital analysis"
            value={sat.id}
            onChange={(e) => onControlSimulation({ spacecraftId: e.target.value })}
            className="px-3 py-2 rounded-md border border-slate-700 bg-[#0D1422] text-xs text-white"
          >
            {catalog.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.elements.propagationModel})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Classical Orbital Elements Grid */}
      <section aria-label="Classical Orbital Elements">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="font-display text-sm font-semibold text-white">
            Keplerian State Parameters ({el.propagationModel})
          </h2>
          <span className="font-mono text-xs text-cyan-300">
            J2 Nodal Precession: {el.j2RaanPrecessionDegDay >= 0 ? '+' : ''}
            {el.j2RaanPrecessionDegDay.toFixed(4)} °/day
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {elementCards.map((item) => (
            <div
              key={item.name}
              className="rounded-lg border border-slate-800 bg-[#0D1422] p-4 flex items-center justify-between"
            >
              <div>
                <p className="text-xs text-slate-400">{item.name}</p>
                <p className="font-mono text-xl font-bold text-white mt-1 tabular-nums">
                  {item.value}
                  <span className="text-xs font-normal text-slate-400 ml-1.5">{item.unit}</span>
                </p>
              </div>
              <span className="w-9 h-9 rounded border border-slate-700 bg-[#0A101D] font-mono text-sm font-semibold text-cyan-300 flex items-center justify-center">
                {item.symbol}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* TLE Block when available */}
      {sat.tle && (
        <section className="rounded-lg border border-slate-800 bg-[#0D1422] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h2 className="text-xs font-semibold text-white">
              Two-Line Element Set (NORAD SGP4/SDP4 Input)
            </h2>
            <span className="font-mono text-[11px] text-slate-400">{sat.tle.epochLabel}</span>
          </div>
          <pre className="font-mono text-xs text-cyan-200 bg-[#070B14] border border-slate-800 rounded p-3 overflow-x-auto">
            {`${sat.name}\n${sat.tle.line1}\n${sat.tle.line2}`}
          </pre>
        </section>
      )}

      {/* Ground Track & Prediction Horizon */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-6 space-y-4">
          <GroundTrackMap
            orbitalState={orb}
            orbitalTrack={snapshot.orbitalTrack}
            groundStations={snapshot.groundStations}
          />

          <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-4">
            <h3 className="text-xs font-semibold text-white mb-3">
              Predicted Altitude Envelope ({settings.units === 'IMPERIAL' ? 'mi' : 'km'})
            </h3>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={altProfileData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="offset" stroke="#64748B" fontSize={10} />
                  <YAxis stroke="#64748B" fontSize={10} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0A101D', borderColor: '#1E293B', fontSize: '11px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="altitude"
                    stroke="#38BDF8"
                    fill="#38BDF8"
                    fillOpacity={0.18}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Future Orbit Prediction Table */}
        <div className="xl:col-span-6 rounded-lg border border-slate-800 bg-[#0D1422] p-5 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="font-display text-sm font-semibold text-white">
                Propagated Position Predictions
              </h2>
              <p className="text-[11px] text-slate-400">
                Analytical future ground coordinates & solar illumination
              </p>
            </div>

            <div className="flex items-center gap-1 bg-[#0A101D] p-1 rounded border border-slate-800">
              {[60, 120, 180].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setHorizonLimit(mins)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono cursor-pointer transition-colors ${
                    horizonLimit === mins
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  +{mins}m
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium">
                  <th className="py-2 pr-3">Offset</th>
                  <th className="py-2 pr-3">UTC Epoch</th>
                  <th className="py-2 pr-3">Latitude</th>
                  <th className="py-2 pr-3">Longitude</th>
                  <th className="py-2 pr-3 text-right">Altitude</th>
                  <th className="py-2 pr-3 text-right">Velocity</th>
                  <th className="py-2 text-right">Solar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 font-mono tabular-nums">
                {filteredPredictions.map((p) => {
                  const pAlt = formatDistance(p.altitudeKm, settings.units, 1);
                  const pVel = formatSpeed(p.velocityKmS, settings.units, 2);
                  return (
                    <tr key={p.offsetMinutes} className="hover:bg-slate-800/30">
                      <td className="py-2.5 pr-3 text-cyan-300">+{p.offsetMinutes} min</td>
                      <td className="py-2.5 pr-3 text-slate-300">{formatUtcShort(p.timestampIso)}</td>
                      <td className="py-2.5 pr-3 text-slate-200">{formatLatLon(p.latitudeDeg, true)}</td>
                      <td className="py-2.5 pr-3 text-slate-200">{formatLatLon(p.longitudeDeg, false)}</td>
                      <td className="py-2.5 pr-3 text-right text-slate-200">
                        {pAlt.value} {pAlt.unit}
                      </td>
                      <td className="py-2.5 pr-3 text-right text-slate-200">
                        {pVel.value} {pVel.unit}
                      </td>
                      <td className="py-2.5 text-right">
                        <span className={p.inSunlight ? 'text-amber-300' : 'text-slate-500'}>
                          {p.inSunlight ? 'SUN' : 'ECL'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
