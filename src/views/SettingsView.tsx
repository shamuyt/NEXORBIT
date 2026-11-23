import { Check } from 'lucide-react';
import { useState } from 'react';
import type { AppSettings, MissionControlSnapshot } from '../engine/types';

interface SettingsViewProps {
  snapshot: MissionControlSnapshot;
  onUpdateSettings: (partial: Partial<AppSettings>) => Promise<void>;
}

export function SettingsView({ snapshot, onUpdateSettings }: SettingsViewProps) {
  const { settings, catalog } = snapshot;
  const [savedBanner, setSavedBanner] = useState(false);

  const apply = async (partial: Partial<AppSettings>) => {
    await onUpdateSettings(partial);
    setSavedBanner(true);
    window.setTimeout(() => setSavedBanner(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">
            Console Settings & Simulation Config
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure display units, telemetry stream cadence, alert thresholds, and active mission selection
          </p>
        </div>

        {savedBanner && (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-400">
            <Check className="w-4 h-4" />
            Configuration Saved
          </span>
        )}
      </div>

      {/* Mission & Simulation Config */}
      <section className="rounded-lg border border-slate-800 bg-[#0D1422] p-5 space-y-4">
        <h2 className="font-display text-sm font-semibold text-white">
          Mission Selection & Simulation Engine
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label htmlFor="settings-mission" className="block text-slate-400 mb-1.5">
              Active Spacecraft / Mission
            </label>
            <select
              id="settings-mission"
              value={settings.activeSpacecraftId}
              onChange={(e) => void apply({ activeSpacecraftId: e.target.value })}
              className="w-full px-3 py-2 rounded bg-[#0A101D] border border-slate-700 text-white"
            >
              {catalog.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.missionId} — {s.name} ({s.orbitType})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="settings-speed" className="block text-slate-400 mb-1.5">
              Orbital Propagation Speed
            </label>
            <select
              id="settings-speed"
              value={settings.simulationSpeed}
              onChange={(e) => void apply({ simulationSpeed: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded bg-[#0A101D] border border-slate-700 text-white font-mono"
            >
              <option value={1}>1x (Real-Time)</option>
              <option value={5}>5x</option>
              <option value={10}>10x</option>
              <option value={25}>25x</option>
              <option value={50}>50x</option>
            </select>
          </div>
        </div>
      </section>

      {/* Display, Theme & Units */}
      <section className="rounded-lg border border-slate-800 bg-[#0D1422] p-5 space-y-4">
        <h2 className="font-display text-sm font-semibold text-white">
          Units, Theme & Telemetry Refresh Rate
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1.5">Engineering Units</label>
            <div className="grid grid-cols-2 gap-1 p-1 rounded bg-[#0A101D] border border-slate-800">
              {(['METRIC', 'IMPERIAL'] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => void apply({ units: u })}
                  className={`py-1.5 rounded text-xs font-medium cursor-pointer transition-colors ${
                    settings.units === u
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {u === 'METRIC' ? 'Metric (km, °C)' : 'Imperial (mi, °F)'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="settings-refresh" className="block text-slate-400 mb-1.5">
              Telemetry Refresh Cadence
            </label>
            <select
              id="settings-refresh"
              value={settings.refreshRateMs}
              onChange={(e) =>
                void apply({ refreshRateMs: Number(e.target.value) as AppSettings['refreshRateMs'] })
              }
              className="w-full px-3 py-2 rounded bg-[#0A101D] border border-slate-700 text-white font-mono"
            >
              <option value={500}>500 ms (2 Hz)</option>
              <option value={1000}>1000 ms (1 Hz)</option>
              <option value={2000}>2000 ms (0.5 Hz)</option>
              <option value={5000}>5000 ms (0.2 Hz)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1.5">Console Surface Theme</label>
            <div className="grid grid-cols-2 gap-1 p-1 rounded bg-[#0A101D] border border-slate-800">
              {(['OBSIDIAN', 'DEEP_NAVY'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => void apply({ contrastMode: mode })}
                  className={`py-1.5 rounded text-xs font-medium cursor-pointer transition-colors ${
                    settings.contrastMode === mode
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {mode === 'OBSIDIAN' ? 'Obsidian' : 'Deep Navy'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Alert Thresholds */}
      <section className="rounded-lg border border-slate-800 bg-[#0D1422] p-5 space-y-4">
        <h2 className="font-display text-sm font-semibold text-white">
          Anomaly Detection Thresholds & Alert Preferences
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div>
            <label htmlFor="th-temp-max" className="block font-sans text-slate-400 mb-1.5">
              Max Internal Temp (°C)
            </label>
            <input
              id="th-temp-max"
              type="number"
              value={settings.thresholds.tempMaxC}
              onChange={(e) =>
                void apply({
                  thresholds: { ...settings.thresholds, tempMaxC: Number(e.target.value) },
                })
              }
              className="w-full px-3 py-2 rounded bg-[#0A101D] border border-slate-700 text-white"
            />
          </div>

          <div>
            <label htmlFor="th-volt-min" className="block font-sans text-slate-400 mb-1.5">
              Min Bus Voltage (V)
            </label>
            <input
              id="th-volt-min"
              type="number"
              step="0.1"
              value={settings.thresholds.voltageMinV}
              onChange={(e) =>
                void apply({
                  thresholds: { ...settings.thresholds, voltageMinV: Number(e.target.value) },
                })
              }
              className="w-full px-3 py-2 rounded bg-[#0A101D] border border-slate-700 text-white"
            />
          </div>

          <div>
            <label htmlFor="th-ang-max" className="block font-sans text-slate-400 mb-1.5">
              Max Angular Rate (°/s)
            </label>
            <input
              id="th-ang-max"
              type="number"
              step="0.1"
              value={settings.thresholds.angularVelMaxDegS}
              onChange={(e) =>
                void apply({
                  thresholds: { ...settings.thresholds, angularVelMaxDegS: Number(e.target.value) },
                })
              }
              className="w-full px-3 py-2 rounded bg-[#0A101D] border border-slate-700 text-white"
            />
          </div>
        </div>

        <div className="pt-2 flex flex-wrap gap-5 text-xs text-slate-300">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.alertPreferences.showSimulatedDisclaimer}
              onChange={(e) =>
                void apply({
                  alertPreferences: {
                    ...settings.alertPreferences,
                    showSimulatedDisclaimer: e.target.checked,
                  },
                })
              }
              className="accent-cyan-400"
            />
            Display data provenance banners
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.alertPreferences.autoPauseOnCritical}
              onChange={(e) =>
                void apply({
                  alertPreferences: {
                    ...settings.alertPreferences,
                    autoPauseOnCritical: e.target.checked,
                  },
                })
              }
              className="accent-cyan-400"
            />
            Highlight critical alerts immediately
          </label>
        </div>
      </section>
    </div>
  );
}
