import { useState } from 'react';
import { DemoModeBar } from './components/DemoModeBar';
import { NotificationDrawer } from './components/NotificationDrawer';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import type { NavSection } from './engine/types';
import { useMissionStream } from './hooks/useMissionStream';
import { AnomalyDetectionView } from './views/AnomalyDetectionView';
import { HowItWorksView } from './views/HowItWorksView';
import { LiveTrackingView } from './views/LiveTrackingView';
import { MissionHistoryView } from './views/MissionHistoryView';
import { OrbitalAnalysisView } from './views/OrbitalAnalysisView';
import { OverviewView } from './views/OverviewView';
import { SafetyMonitorView } from './views/SafetyMonitorView';
import { SettingsView } from './views/SettingsView';
import { TelemetryView } from './views/TelemetryView';

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const {
    snapshot,
    faults,
    wsConnected,
    loading,
    error,
    controlSimulation,
    controlDemo,
    injectFault,
    acknowledgeAnomaly,
    resolveAnomaly,
    updateSettings,
    refreshState,
  } = useMissionStream();

  if (loading && !snapshot) {
    return (
      <div className="min-h-screen bg-[#070B14] text-slate-200 flex items-center justify-center p-6">
        <div className="max-w-sm w-full rounded-lg border border-slate-800 bg-[#0D1422] p-6 text-center space-y-3">
          <p className="font-display text-lg font-bold text-white tracking-wider">NEXORBIT</p>
          <p className="text-xs text-slate-400">
            Initializing orbital mechanics engine and telemetry WebSocket stream...
          </p>
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="min-h-screen bg-[#070B14] text-slate-200 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-lg border border-red-500/40 bg-[#0D1422] p-6 space-y-3">
          <h1 className="font-display text-lg font-bold text-white">
            Telemetry Link Unavailable
          </h1>
          <p className="text-xs text-slate-300">
            {error ?? 'Unable to connect to the NEXORBIT mission control backend.'}
          </p>
          <button
            type="button"
            onClick={() => void refreshState()}
            className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const activeAnomalyCount = snapshot.anomalies.filter((a) => a.status !== 'RESOLVED').length;
  const highRiskConjunctionCount = snapshot.conjunctions.filter(
    (c) => c.riskLevel === 'RED' || c.riskLevel === 'ORANGE',
  ).length;
  const totalAlertCount = activeAnomalyCount + highRiskConjunctionCount;

  const surfaceBgClass =
    snapshot.settings.contrastMode === 'DEEP_NAVY' ? 'bg-[#081020]' : 'bg-[#070B14]';

  const handleLaunchDemo = () => {
    void controlDemo({ action: 'start' });
    if (activeSection === 'how-it-works' || activeSection === 'settings') {
      setActiveSection('overview');
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col ${surfaceBgClass} text-slate-100`}
      data-active-section={activeSection}
      data-simulation-running={snapshot.simulationRunning ? 'true' : 'false'}
    >
      <TopBar
        missionId={snapshot.activeSpacecraft.missionId}
        spacecraftName={snapshot.activeSpacecraft.name}
        provenance={snapshot.activeSpacecraft.provenance}
        wsConnected={wsConnected}
        simulationRunning={snapshot.simulationRunning}
        demoActive={snapshot.demoState.active}
        activeAlertCount={totalAlertCount}
        mobileMenuOpen={mobileMenuOpen}
        onToggleMobileMenu={() => setMobileMenuOpen((v) => !v)}
        onToggleNotifications={() => setNotificationsOpen((v) => !v)}
        onLaunchDemo={handleLaunchDemo}
        onNavigate={setActiveSection}
      />

      <DemoModeBar
        demoState={snapshot.demoState}
        onControlDemo={(payload) => void controlDemo(payload)}
      />

      <div className="flex-1 flex min-h-0">
        <Sidebar
          activeSection={activeSection}
          onSelectSection={setActiveSection}
          activeAnomalyCount={activeAnomalyCount}
          highRiskConjunctionCount={highRiskConjunctionCount}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        <main className="flex-1 min-w-0 p-4 lg:p-6 overflow-y-auto">
          {snapshot.settings.alertPreferences.showSimulatedDisclaimer && (
            <div className="mb-4 rounded-md border border-slate-800 bg-[#0A101D] px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
              <span>
                Data Provenance:{' '}
                <strong className="font-mono text-cyan-300">
                  {snapshot.activeSpacecraft.provenance}
                </strong>{' '}
                — Simulated telemetry &amp; orbital scenarios are explicitly separated from live spacecraft downlinks.
              </span>
              <span className="font-mono text-slate-400">
                Refresh: {snapshot.settings.refreshRateMs}ms · Speed: {snapshot.simulationSpeed}x
              </span>
            </div>
          )}

          {activeSection === 'overview' && (
            <OverviewView
              snapshot={snapshot}
              onNavigate={setActiveSection}
              onLaunchDemo={handleLaunchDemo}
              onControlSimulation={(payload) => void controlSimulation(payload)}
            />
          )}

          {activeSection === 'tracking' && (
            <LiveTrackingView
              snapshot={snapshot}
              onControlSimulation={(payload) => void controlSimulation(payload)}
            />
          )}

          {activeSection === 'telemetry' && <TelemetryView snapshot={snapshot} />}

          {activeSection === 'orbital' && (
            <OrbitalAnalysisView
              snapshot={snapshot}
              onControlSimulation={(payload) => void controlSimulation(payload)}
            />
          )}

          {activeSection === 'safety' && <SafetyMonitorView snapshot={snapshot} />}

          {activeSection === 'anomalies' && (
            <AnomalyDetectionView
              snapshot={snapshot}
              faults={faults}
              onInjectFault={(type, enabled) => void injectFault(type, enabled)}
              onAcknowledge={(id) => void acknowledgeAnomaly(id)}
              onResolve={(id) => void resolveAnomaly(id)}
            />
          )}

          {activeSection === 'history' && <MissionHistoryView snapshot={snapshot} />}

          {activeSection === 'how-it-works' && (
            <HowItWorksView
              onBackToDashboard={() => setActiveSection('overview')}
              onNavigate={setActiveSection}
              onLaunchDemo={handleLaunchDemo}
            />
          )}

          {activeSection === 'settings' && (
            <SettingsView snapshot={snapshot} onUpdateSettings={updateSettings} />
          )}
        </main>
      </div>

      <NotificationDrawer
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        anomalies={snapshot.anomalies}
        conjunctions={snapshot.conjunctions}
        onAcknowledgeAnomaly={(id) => void acknowledgeAnomaly(id)}
        onNavigate={setActiveSection}
      />
    </div>
  );
}
