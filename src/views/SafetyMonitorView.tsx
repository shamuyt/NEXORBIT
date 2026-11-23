import { useState } from 'react';
import { RiskStatusLabel } from '../components/StatusText';
import type { ConjunctionEvent, MissionControlSnapshot } from '../engine/types';
import { formatDistance, formatUtcTime } from '../utils/formatters';

interface SafetyMonitorViewProps {
  snapshot: MissionControlSnapshot;
}

export function SafetyMonitorView({ snapshot }: SafetyMonitorViewProps) {
  const { conjunctions, settings, activeSpacecraft } = snapshot;
  const [selectedId, setSelectedId] = useState<string>(conjunctions[0]?.id ?? '');

  const selected: ConjunctionEvent | undefined =
    conjunctions.find((c) => c.id === selectedId) ?? conjunctions[0];

  const countByLevel = {
    RED: conjunctions.filter((c) => c.riskLevel === 'RED').length,
    ORANGE: conjunctions.filter((c) => c.riskLevel === 'ORANGE').length,
    YELLOW: conjunctions.filter((c) => c.riskLevel === 'YELLOW').length,
    GREEN: conjunctions.filter((c) => c.riskLevel === 'GREEN').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">
            Orbital Safety & Conjunction Monitor
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Close-approach screening for {activeSpacecraft.name} · Clearly marked SIMULATED RISK SCENARIO
          </p>
        </div>

        <div className="rounded-md border border-amber-500/35 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200 font-mono">
          SIMULATED CONJUNCTION SCREENING · NOT LIVE NORAD CDM DATA
        </div>
      </div>

      {/* 4-Tier Risk Classification Legend / Summary */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5" aria-label="Risk Classification Summary">
        <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-4">
          <p className="text-xs font-mono text-emerald-400 font-semibold">● GREEN · Normal</p>
          <p className="font-mono text-2xl font-bold text-white mt-1 tabular-nums">{countByLevel.GREEN}</p>
          <p className="text-[11px] text-slate-400 mt-1">Miss distance &ge; 6.0 km</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-4">
          <p className="text-xs font-mono text-yellow-300 font-semibold">▲ YELLOW · Monitoring</p>
          <p className="font-mono text-2xl font-bold text-white mt-1 tabular-nums">{countByLevel.YELLOW}</p>
          <p className="text-[11px] text-slate-400 mt-1">Miss distance 2.0 – 6.0 km</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-4">
          <p className="text-xs font-mono text-orange-400 font-semibold">▲ ORANGE · Potential Risk</p>
          <p className="font-mono text-2xl font-bold text-white mt-1 tabular-nums">{countByLevel.ORANGE}</p>
          <p className="text-[11px] text-slate-400 mt-1">Miss distance 0.6 – 2.0 km</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-4">
          <p className="text-xs font-mono text-red-400 font-semibold">✖ RED · Critical Alert</p>
          <p className="font-mono text-2xl font-bold text-white mt-1 tabular-nums">{countByLevel.RED}</p>
          <p className="text-[11px] text-slate-400 mt-1">Miss &lt; 0.6 km or Pc &ge; 1e-3</p>
        </div>
      </section>

      {/* Screening Table + Encounter Plane Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-7 rounded-lg border border-slate-800 bg-[#0D1422] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-sm font-semibold text-white">
              Tracked Secondary Objects & Conjunction Queue
            </h2>
            <span className="text-[11px] font-mono text-slate-400">
              {conjunctions.length} cataloged encounters
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 pr-3">Secondary Object</th>
                  <th className="py-2 pr-3">Risk Level</th>
                  <th className="py-2 pr-3 text-right">TCA</th>
                  <th className="py-2 pr-3 text-right">Miss Dist</th>
                  <th className="py-2 pr-3 text-right">Rel Vel</th>
                  <th className="py-2 text-right">Pc</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {conjunctions.map((c) => {
                  const miss = formatDistance(c.missDistanceKm, settings.units, 3);
                  const isSelected = selected?.id === c.id;
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-cyan-500/10' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3 pr-3">
                        <p className="font-medium text-white">{c.secondaryObject}</p>
                        <p className="font-mono text-[11px] text-slate-400">
                          {c.objectType} · NORAD {c.secondaryNoradId}
                        </p>
                      </td>
                      <td className="py-3 pr-3">
                        <RiskStatusLabel level={c.riskLevel} label={c.riskLabel} />
                      </td>
                      <td className="py-3 pr-3 text-right font-mono tabular-nums text-slate-200">
                        {c.tcaMinutes.toFixed(1)} min
                      </td>
                      <td className="py-3 pr-3 text-right font-mono tabular-nums text-white font-semibold">
                        {miss.value} {miss.unit}
                      </td>
                      <td className="py-3 pr-3 text-right font-mono tabular-nums text-slate-300">
                        {c.relativeVelocityKmS.toFixed(2)} km/s
                      </td>
                      <td className="py-3 text-right font-mono tabular-nums">
                        {c.collisionProbability !== null ? (
                          <span className="text-cyan-300">
                            {c.collisionProbability.toExponential(2)}
                          </span>
                        ) : (
                          <span className="text-slate-500">N/A (No Cov)</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Conjunction Encounter Plane & Detailed Assessment */}
        {selected && (
          <div className="xl:col-span-5 rounded-lg border border-slate-800 bg-[#0D1422] p-5 space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <p className="text-[11px] font-mono text-slate-400">{selected.provenance}</p>
                <h2 className="font-display text-base font-semibold text-white mt-0.5">
                  {selected.secondaryObject}
                </h2>
              </div>
              <RiskStatusLabel level={selected.riskLevel} label={selected.riskLabel} />
            </div>

            {/* Encounter-Plane Miss Distance Diagram */}
            <div className="rounded bg-[#070B14] border border-slate-800 p-3">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-2">
                <span>B-Plane Encounter Geometry (Radial vs Cross-Track)</span>
                <span>Scale: 6 km radius</span>
              </div>
              <svg viewBox="0 0 260 180" className="w-full h-40" role="img" aria-label="Encounter plane miss distance diagram">
                <circle cx="130" cy="90" r="75" fill="none" stroke="#1E293B" strokeDasharray="3 3" />
                <circle cx="130" cy="90" r="35" fill="rgba(249,115,22,0.06)" stroke="#F97316" strokeOpacity="0.4" />
                <circle cx="130" cy="90" r="12" fill="rgba(239,68,68,0.14)" stroke="#EF4444" strokeOpacity="0.6" />
                <line x1="30" y1="90" x2="230" y2="90" stroke="#1E293B" strokeWidth="1" />
                <line x1="130" y1="10" x2="130" y2="170" stroke="#1E293B" strokeWidth="1" />
                {/* Primary Spacecraft at center */}
                <circle cx="130" cy="90" r="4" fill="#38BDF8" />
                {/* Secondary Object offset */}
                {(() => {
                  const scale = 12; // px per km
                  const dx = Math.max(-90, Math.min(90, selected.crossTrackMissKm * scale));
                  const dy = Math.max(-70, Math.min(70, -selected.radialMissKm * scale));
                  const sx = 130 + dx;
                  const sy = 90 + dy;
                  return (
                    <>
                      <line x1="130" y1="90" x2={sx} y2={sy} stroke="#94A3B8" strokeDasharray="2 2" />
                      {selected.positionSigmaKm && (
                        <circle
                          cx={sx}
                          cy={sy}
                          r={Math.max(6, selected.positionSigmaKm * scale)}
                          fill="rgba(239,68,68,0.12)"
                          stroke="#F97316"
                          strokeWidth="0.9"
                        />
                      )}
                      <circle cx={sx} cy={sy} r="4.5" fill="#EF4444" />
                    </>
                  );
                })()}
              </svg>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-2.5 rounded bg-[#0A101D] border border-slate-800/80">
                <dt className="text-slate-400 font-sans">Time to Closest Approach</dt>
                <dd className="text-white font-semibold mt-0.5 tabular-nums">
                  T-{selected.tcaMinutes.toFixed(1)} min
                </dd>
                <dd className="text-[10px] text-slate-400 mt-0.5">
                  {formatUtcTime(selected.tcaTimestampIso)}
                </dd>
              </div>
              <div className="p-2.5 rounded bg-[#0A101D] border border-slate-800/80">
                <dt className="text-slate-400 font-sans">Estimated Miss Distance</dt>
                <dd className="text-white font-semibold mt-0.5 tabular-nums">
                  {selected.missDistanceKm.toFixed(3)} km
                </dd>
                <dd className="text-[10px] text-slate-400 mt-0.5">
                  R:{selected.radialMissKm} · I:{selected.inTrackMissKm} · C:{selected.crossTrackMissKm}
                </dd>
              </div>
              <div className="p-2.5 rounded bg-[#0A101D] border border-slate-800/80">
                <dt className="text-slate-400 font-sans">Relative Velocity</dt>
                <dd className="text-white font-semibold mt-0.5 tabular-nums">
                  {selected.relativeVelocityKmS.toFixed(2)} km/s
                </dd>
              </div>
              <div className="p-2.5 rounded bg-[#0A101D] border border-slate-800/80">
                <dt className="text-slate-400 font-sans">Collision Probability (Pc)</dt>
                <dd className="text-white font-semibold mt-0.5 tabular-nums">
                  {selected.collisionProbability !== null
                    ? selected.collisionProbability.toExponential(3)
                    : 'Not Computed'}
                </dd>
                <dd className="text-[10px] text-slate-400 mt-0.5">
                  {selected.hasCovarianceData
                    ? `σ = ${selected.positionSigmaKm} km`
                    : 'Covariance unavailable'}
                </dd>
              </div>
            </dl>

            <div className="space-y-2 text-xs pt-1">
              <div>
                <p className="font-semibold text-slate-200">Engineering Assessment</p>
                <p className="text-slate-300 mt-0.5 leading-relaxed">{selected.explanation}</p>
              </div>
              <div>
                <p className="font-semibold text-cyan-300">Recommended Action</p>
                <p className="text-slate-300 mt-0.5 leading-relaxed">{selected.recommendedAction}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
