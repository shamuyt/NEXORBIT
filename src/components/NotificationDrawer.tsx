import { AlertTriangle, CheckCircle2, ShieldAlert, X } from 'lucide-react';
import type { AnomalyEvent, ConjunctionEvent, NavSection } from '../engine/types';
import { formatUtcShort } from '../utils/formatters';

interface NotificationDrawerProps {
  open: boolean;
  onClose: () => void;
  anomalies: AnomalyEvent[];
  conjunctions: ConjunctionEvent[];
  onAcknowledgeAnomaly: (id: string) => void;
  onNavigate: (section: NavSection) => void;
}

export function NotificationDrawer({
  open,
  onClose,
  anomalies,
  conjunctions,
  onAcknowledgeAnomaly,
  onNavigate,
}: NotificationDrawerProps) {
  if (!open) return null;

  const activeAnomalies = anomalies.filter((a) => a.status !== 'RESOLVED');
  const elevatedConjunctions = conjunctions.filter(
    (c) => c.riskLevel === 'RED' || c.riskLevel === 'ORANGE',
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <dialog
        open
        aria-label="Mission Alerts and Notifications"
        className="relative z-10 m-0 ml-auto h-full w-full max-w-md bg-[#0D1422] border-l border-slate-800 text-slate-100 flex flex-col p-0"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <h2 className="font-display text-base font-semibold text-white">
              Mission Alert Queue
            </h2>
            <p className="text-xs text-slate-400">
              {activeAnomalies.length} telemetry alerts · {elevatedConjunctions.length} conjunction warnings
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notifications"
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeAnomalies.length === 0 && elevatedConjunctions.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-[#0A101D] p-6 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-white">All Systems Nominal</p>
              <p className="text-xs text-slate-400 mt-1">
                No active telemetry anomalies or elevated conjunction alerts.
              </p>
            </div>
          ) : (
            <>
              {elevatedConjunctions.map((c) => (
                <div
                  key={c.id}
                  className="rounded-lg border border-slate-800 bg-[#0A101D] p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-300">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      {c.riskLevel}: {c.riskLabel}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">
                      TCA {c.tcaMinutes} min
                    </span>
                  </div>
                  <p className="text-xs font-medium text-white">{c.secondaryObject}</p>
                  <p className="text-xs text-slate-300">
                    Miss Distance: <span className="font-mono">{c.missDistanceKm} km</span> · Rel Vel:{' '}
                    <span className="font-mono">{c.relativeVelocityKmS} km/s</span>
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-mono text-slate-400">{c.provenance}</span>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('safety');
                        onClose();
                      }}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
                    >
                      Inspect Conjunction →
                    </button>
                  </div>
                </div>
              ))}

              {activeAnomalies.map((a) => (
                <div
                  key={a.id}
                  className="rounded-lg border border-slate-800 bg-[#0A101D] p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                        a.severity === 'CRITICAL' ? 'text-red-400' : 'text-amber-300'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {a.severity} · {a.subsystem}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">
                      {formatUtcShort(a.detectedAtIso)} UTC
                    </span>
                  </div>
                  <p className="text-xs font-medium text-white">
                    {a.parameter}: <span className="font-mono">{a.observedValue}</span>
                  </p>
                  <p className="text-[11px] text-slate-400">Normal Range: {a.normalRange}</p>
                  <div className="flex items-center justify-between pt-1">
                    {a.status === 'ACTIVE' ? (
                      <button
                        type="button"
                        onClick={() => onAcknowledgeAnomaly(a.id)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 cursor-pointer"
                      >
                        Acknowledge
                      </button>
                    ) : (
                      <span className="text-[11px] font-mono text-cyan-300">ACKNOWLEDGED</span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('anomalies');
                        onClose();
                      }}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
                    >
                      Investigate →
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </dialog>
    </div>
  );
}
