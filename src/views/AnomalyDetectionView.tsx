import { AlertTriangle, Check, CheckCircle2, Flame, Radio, RotateCw, Zap } from 'lucide-react';
import type { ActiveFaultState } from '../engine/telemetrySimulator';
import type { AnomalyStatus, FaultInjectionType, MissionControlSnapshot } from '../engine/types';
import { formatUtcTime } from '../utils/formatters';
import { useState } from 'react';

interface AnomalyDetectionViewProps {
  snapshot: MissionControlSnapshot;
  faults: ActiveFaultState;
  onInjectFault: (faultType: FaultInjectionType, enabled: boolean) => void;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
}

export function AnomalyDetectionView({
  snapshot,
  faults,
  onInjectFault,
  onAcknowledge,
  onResolve,
}: AnomalyDetectionViewProps) {
  const [statusFilter, setStatusFilter] = useState<'ALL' | AnomalyStatus>('ALL');

  const filtered = snapshot.anomalies.filter((a) =>
    statusFilter === 'ALL' ? true : a.status === statusFilter,
  );

  const faultControls: Array<{
    type: FaultInjectionType;
    label: string;
    detail: string;
    active: boolean;
    icon: typeof Flame;
  }> = [
    {
      type: 'THERMAL_SPIKE',
      label: 'Thermal Excursion (+63.4 °C)',
      detail: 'Simulates radiator saturation or amplifier overheating',
      active: faults.thermalSpike,
      icon: Flame,
    },
    {
      type: 'VOLTAGE_DROP',
      label: 'Bus Voltage Drop (6.08 V)',
      detail: 'Simulates Li-Ion bus sag below 6.70 V threshold',
      active: faults.voltageDrop,
      icon: Zap,
    },
    {
      type: 'COMMS_INTERRUPTION',
      label: 'RF Link Interruption (LOS)',
      detail: 'Simulates carrier drop below -112 dBm & packet loss',
      active: faults.commsInterruption,
      icon: Radio,
    },
    {
      type: 'ATTITUDE_TUMBLE',
      label: 'Angular Velocity Drift',
      detail: 'Simulates reaction wheel saturation (> 0.50 °/s)',
      active: faults.attitudeTumble,
      icon: RotateCw,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">
            Telemetry Anomaly Detection Engine
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Threshold + Z-Score statistical pipeline (ML-adapter ready) · {snapshot.activeSpacecraft.provenance}
          </p>
        </div>

        <div className="flex items-center gap-1 bg-[#0D1422] p-1 rounded-md border border-slate-800">
          {(['ALL', 'ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors ${
                statusFilter === st
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Controlled Fault Injection Workbench */}
      <section className="rounded-lg border border-slate-800 bg-[#0D1422] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="font-display text-sm font-semibold text-white">
              Simulated Fault Injection Workbench
            </h2>
            <p className="text-xs text-slate-400">
              Inject controlled anomalies into the simulation engine to test detection latency and alert workflows.
            </p>
          </div>
          <span className="font-mono text-[11px] text-cyan-300">
            Engine: Threshold + Rolling Z-Score
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {faultControls.map((fc) => {
            const Icon = fc.icon;
            return (
              <button
                key={fc.type}
                type="button"
                onClick={() => onInjectFault(fc.type, !fc.active)}
                className={`text-left rounded-lg border p-3.5 transition-colors cursor-pointer ${
                  fc.active
                    ? 'border-red-500/60 bg-red-500/10'
                    : 'border-slate-800 bg-[#0A101D] hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <Icon
                    className={`w-4 h-4 ${fc.active ? 'text-red-400' : 'text-cyan-400'}`}
                    aria-hidden="true"
                  />
                  <span
                    className={`font-mono text-[11px] font-semibold ${
                      fc.active ? 'text-red-300' : 'text-slate-400'
                    }`}
                  >
                    {fc.active ? 'ACTIVE FAULT · CLICK TO CLEAR' : 'INJECT FAULT'}
                  </span>
                </div>
                <p className="text-xs font-semibold text-white mt-2">{fc.label}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{fc.detail}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Detected Anomaly Feed */}
      <section className="space-y-3" aria-label="Detected Anomalies">
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-8 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-white">No Anomalies Matching Filter</p>
            <p className="text-xs text-slate-400 mt-1">
              Use the Fault Injection Workbench above to simulate thermal, power, RF, or attitude anomalies.
            </p>
          </div>
        ) : (
          filtered.map((anom) => (
            <article
              key={anom.id}
              className="rounded-lg border border-slate-800 bg-[#0D1422] p-5 space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                    <span
                      className={`inline-flex items-center gap-1 font-semibold ${
                        anom.severity === 'CRITICAL' ? 'text-red-400' : 'text-amber-300'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {anom.severity}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-300">{anom.subsystem}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-400">{anom.id}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-cyan-300">{anom.status}</span>
                  </div>
                  <h3 className="font-display text-base font-semibold text-white">
                    {anom.parameter}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  {anom.status === 'ACTIVE' && (
                    <button
                      type="button"
                      onClick={() => onAcknowledge(anom.id)}
                      className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
                    >
                      Acknowledge
                    </button>
                  )}
                  {anom.status !== 'RESOLVED' && (
                    <button
                      type="button"
                      onClick={() => onResolve(anom.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs font-medium text-emerald-300 transition-colors cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Resolve Alert
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono bg-[#0A101D] border border-slate-800/80 rounded p-3">
                <div>
                  <span className="text-slate-400 font-sans block">Observed Value</span>
                  <span className="text-white font-semibold text-sm">{anom.observedValue}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-sans block">Normal Range</span>
                  <span className="text-slate-200">{anom.normalRange}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-sans block">Statistical Z-Score</span>
                  <span className="text-amber-300">{anom.zScore} σ</span>
                </div>
                <div>
                  <span className="text-slate-400 font-sans block">Detection Time</span>
                  <span className="text-slate-300">{formatUtcTime(anom.detectedAtIso)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                <div>
                  <p className="font-semibold text-slate-200">Possible Explanation</p>
                  <p className="text-slate-300 mt-0.5 leading-relaxed">{anom.explanation}</p>
                </div>
                <div>
                  <p className="font-semibold text-cyan-300">Recommended Investigation</p>
                  <p className="text-slate-300 mt-0.5 leading-relaxed">
                    {anom.recommendedInvestigation}
                  </p>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
