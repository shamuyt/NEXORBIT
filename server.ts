import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocket, WebSocketServer } from 'ws';
import { thresholdAndZScoreDetector } from './src/engine/anomalyDetector';
import {
  GROUND_STATIONS,
  SAT_CATALOG,
  generateOrbitalTrack,
  predictFuturePositions,
  propagateSpacecraftState,
} from './src/engine/orbitalMechanics';
import { generateSimulatedConjunctions } from './src/engine/safetyMonitor';
import {
  type ActiveFaultState,
  applyFaultToState,
  generateTelemetryFrame,
} from './src/engine/telemetrySimulator';
import type {
  AnomalyEvent,
  AppSettings,
  DemoModeState,
  FaultInjectionType,
  MissionControlSnapshot,
  MissionHistoryEntry,
  SpacecraftProfile,
  TelemetryFrame,
} from './src/engine/types';
import { escapeCsvCell } from './src/utils/formatters';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const STORE_PATH = path.resolve(__dirname, 'data', 'mission_store.json');

const DEMO_STEPS: Array<{ title: string; description: string }> = [
  {
    title: '01. Orbit Injection & Initialization',
    description: 'NEXORBIT DEMO SAT-01 (NX-001) enters 550 km Low Earth Orbit at 51.6° inclination.',
  },
  {
    title: '02. Telemetry Stream Acquisition',
    description: 'Onboard EPS, thermal, GNSS, and IMU sensors begin streaming packetized frames.',
  },
  {
    title: '03. Ground Station Downlink Lock',
    description: 'Simulated RF telemetry packets arrive at ground receiving stations for decoding.',
  },
  {
    title: '04. Real-Time Orbital Tracking',
    description: 'Two-body + J2 orbital propagator updates 3D trajectory and surface ground track.',
  },
  {
    title: '05. Thermal Excursion Injected',
    description: 'Simulated thermal dissipation spike pushes internal bus temperature above 60 °C.',
  },
  {
    title: '06. Anomaly Detection Triggered',
    description: 'Threshold + Z-score engine isolates thermal deviation and generates diagnostics.',
  },
  {
    title: '07. Conjunction Safety Screening',
    description: 'Safety Monitor evaluates simulated nearby debris object at closest approach.',
  },
  {
    title: '08. Mission Alert Escalation',
    description: 'Coordinated anomaly and conjunction alerts are raised for flight director review.',
  },
  {
    title: '09. Full Mission Control Sync',
    description: 'All dashboards, charts, and logs reflect the live integrated mission state.',
  },
];

const DEFAULT_SETTINGS: AppSettings = {
  units: 'METRIC',
  refreshRateMs: 1000,
  contrastMode: 'OBSIDIAN',
  thresholds: {
    tempMaxC: 45,
    tempMinC: -10,
    voltageMinV: 6.7,
    voltageMaxV: 8.5,
    angularVelMaxDegS: 0.5,
    signalMinDbm: -112,
  },
  alertPreferences: {
    audioChime: false,
    autoPauseOnCritical: false,
    showSimulatedDisclaimer: true,
  },
  simulationSpeed: 10,
  activeSpacecraftId: 'NX-001',
};

interface PersistedStore {
  settings: AppSettings;
  anomalies: AnomalyEvent[];
  missionHistory: MissionHistoryEntry[];
}

function loadPersistedStore(): PersistedStore {
  const defaultHistory: MissionHistoryEntry[] = [
    {
      id: 'HIST-1001',
      timestampIso: new Date(Date.now() - 86400_000 * 3).toISOString(),
      missionId: 'NX-002',
      spacecraftName: 'NEXORBIT HELIOS-2',
      eventType: 'MISSION',
      severity: 'INFO',
      title: 'Sun-Synchronous Commissioning Pass Completed',
      details: '98.12° inclination checkout verified; nominal solar array deployment at 680 km altitude.',
      healthPct: 99.4,
      provenance: 'SIMULATED DATA',
    },
    {
      id: 'HIST-1002',
      timestampIso: new Date(Date.now() - 86400_000 * 2).toISOString(),
      missionId: 'ISS-LEO-01',
      spacecraftName: 'ISS (ZARYA)',
      eventType: 'SAFETY',
      severity: 'WARNING',
      title: 'Conjunction Screening Watch Window Closed',
      details: 'Simulated screening pass against catalog fragment cleared at 3.42 km radial separation.',
      healthPct: 98.8,
      provenance: 'TLE SGP4 PROPAGATED',
    },
    {
      id: 'HIST-1003',
      timestampIso: new Date(Date.now() - 86400_000).toISOString(),
      missionId: 'NX-001',
      spacecraftName: 'NEXORBIT DEMO SAT-01',
      eventType: 'ANOMALY',
      severity: 'WARNING',
      title: 'Eclipse Exit Battery Voltage Transient Resolved',
      details: 'Observed temporary bus sag to 6.62 V during eclipse exit; MPPT recovery confirmed nominal.',
      healthPct: 94.2,
      provenance: 'DEMONSTRATION DATA',
    },
    {
      id: 'HIST-1004',
      timestampIso: new Date(Date.now() - 3600_000 * 5).toISOString(),
      missionId: 'NX-004',
      spacecraftName: 'NEXORBIT RELAY-4',
      eventType: 'SYSTEM',
      severity: 'INFO',
      title: 'GEO Station-Keeping Ephemeris Updated',
      details: 'Two-body + J2 orbital elements synchronized for 35,786 km geostationary slot.',
      healthPct: 99.6,
      provenance: 'SIMULATED DATA',
    },
  ];

  const defaultAnomalies: AnomalyEvent[] = [
    {
      id: 'ANOM-HIST-01',
      missionId: 'NX-001',
      spacecraftId: 'NX-001',
      parameter: 'Battery Bus Voltage',
      subsystem: 'Power',
      observedValue: '6.62 V',
      numericValue: 6.62,
      unit: 'V',
      normalRange: '6.70 – 8.50 V',
      zScore: -2.94,
      detectionMethod: 'Threshold + Z-Score Engine',
      detectedAtIso: new Date(Date.now() - 86400_000).toISOString(),
      severity: 'WARNING',
      status: 'RESOLVED',
      explanation: 'Simulated eclipse exit load spike reduced bus voltage momentarily below 6.70 V floor.',
      recommendedInvestigation: 'Verify MPPT solar regulator lock and cell balancing resistor telemetry.',
      provenance: 'DEMONSTRATION DATA',
    },
  ];

  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8')) as Partial<PersistedStore>;
      return {
        settings: { ...DEFAULT_SETTINGS, ...(raw.settings ?? {}), thresholds: { ...DEFAULT_SETTINGS.thresholds, ...(raw.settings?.thresholds ?? {}) }, alertPreferences: { ...DEFAULT_SETTINGS.alertPreferences, ...(raw.settings?.alertPreferences ?? {}) } },
        anomalies: Array.isArray(raw.anomalies) ? raw.anomalies : defaultAnomalies,
        missionHistory: Array.isArray(raw.missionHistory) ? raw.missionHistory : defaultHistory,
      };
    }
  } catch {
    // Fall back to defaults cleanly
  }
  return {
    settings: DEFAULT_SETTINGS,
    anomalies: defaultAnomalies,
    missionHistory: defaultHistory,
  };
}

function savePersistedStore(store: PersistedStore) {
  try {
    fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
  } catch {
    // Ignore write failure in read-only environments
  }
}

class MissionSimulationEngine {
  private referenceDate = new Date();
  private simElapsedSec = 0;
  private packetSeq = 100;
  private simulationRunning = true;
  private activeFaults: ActiveFaultState = {
    thermalSpike: false,
    voltageDrop: false,
    commsInterruption: false,
    attitudeTumble: false,
  };
  private demoState: DemoModeState = {
    active: false,
    paused: false,
    stepIndex: 0,
    stepTitle: DEMO_STEPS[0].title,
    stepDescription: DEMO_STEPS[0].description,
    elapsedSec: 0,
    speedMultiplier: 1,
  };
  private store: PersistedStore;
  private telemetryHistory: TelemetryFrame[] = [];
  private orbitalTrackCache: Array<{ lat: number; lon: number; altKm: number; x: number; y: number; z: number }> = [];
  private trackLastComputedAtSec = -9999;
  private lastAnomalyKeyTimestamp = new Map<string, number>();

  constructor() {
    this.store = loadPersistedStore();
    this.seedInitialHistory();
  }

  private getActiveSpacecraft(): SpacecraftProfile {
    return (
      SAT_CATALOG.find((s) => s.id === this.store.settings.activeSpacecraftId) ?? SAT_CATALOG[0]
    );
  }

  private seedInitialHistory() {
    this.telemetryHistory = [];
    const sat = this.getActiveSpacecraft();
    let prevSoc = 84.5;
    for (let i = 24; i >= 0; i--) {
      const t = i === 0 ? this.simElapsedSec : Math.max(0, this.simElapsedSec - i * 10);
      const { state, updatedElements } = propagateSpacecraftState(sat, t, this.referenceDate);
      const frame = generateTelemetryFrame(
        sat,
        state,
        updatedElements,
        this.packetSeq++,
        this.activeFaults,
        prevSoc,
      );
      prevSoc = frame.batterySocPct;
      this.telemetryHistory.push(frame);
    }
    this.orbitalTrackCache = generateOrbitalTrack(sat, this.simElapsedSec, this.referenceDate, 96);
    this.trackLastComputedAtSec = this.simElapsedSec;
  }

  public tick(dtRealSec: number): MissionControlSnapshot {
    const sat = this.getActiveSpacecraft();

    if (this.demoState.active && !this.demoState.paused) {
      this.demoState.elapsedSec += dtRealSec * this.demoState.speedMultiplier;
      const stageDuration = 4.0; // ~4 seconds per stage at 1x
      const nextIndex = Math.min(8, Math.floor(this.demoState.elapsedSec / stageDuration));
      if (nextIndex !== this.demoState.stepIndex) {
        this.demoState.stepIndex = nextIndex;
        this.demoState.stepTitle = DEMO_STEPS[nextIndex].title;
        this.demoState.stepDescription = DEMO_STEPS[nextIndex].description;

        // Orchestrate real simulation changes at key demo stages
        if (nextIndex === 4) {
          this.activeFaults.thermalSpike = true;
          this.appendHistory({
            missionId: sat.missionId,
            spacecraftName: sat.name,
            eventType: 'SYSTEM',
            severity: 'WARNING',
            title: 'Demo Mode: Thermal Excursion Injected',
            details: 'Demonstrating threshold + Z-score anomaly detection on payload radiator loop.',
            healthPct: 86,
            provenance: 'DEMONSTRATION DATA',
          });
        } else if (nextIndex === 6) {
          this.appendHistory({
            missionId: sat.missionId,
            spacecraftName: sat.name,
            eventType: 'SAFETY',
            severity: 'CRITICAL',
            title: 'Demo Mode: Close-Approach Screening Alert',
            details: 'Simulated conjunction screening detected object within RED safety corridor.',
            healthPct: 76,
            provenance: 'DEMONSTRATION DATA',
          });
        }
      }
    }

    if (this.simulationRunning) {
      this.simElapsedSec += dtRealSec * this.store.settings.simulationSpeed;
      const { state, updatedElements } = propagateSpacecraftState(
        sat,
        this.simElapsedSec,
        this.referenceDate,
      );
      const prevFrame = this.telemetryHistory[this.telemetryHistory.length - 1];
      const frame = generateTelemetryFrame(
        sat,
        state,
        updatedElements,
        this.packetSeq++,
        this.activeFaults,
        prevFrame?.batterySocPct ?? 85,
      );
      this.telemetryHistory.push(frame);
      if (this.telemetryHistory.length > 90) {
        this.telemetryHistory.shift();
      }

      // Run Anomaly Detection Engine
      const detected = thresholdAndZScoreDetector.evaluateFrame(
        frame,
        this.telemetryHistory,
        this.store.settings.thresholds,
        sat.missionId,
        sat.id,
      );

      const nowMs = Date.now();
      for (const anom of detected) {
        const dedupKey = `${anom.spacecraftId}:${anom.subsystem}`;
        const lastMs = this.lastAnomalyKeyTimestamp.get(dedupKey) ?? 0;
        const hasActiveSame = this.store.anomalies.some(
          (a) => a.spacecraftId === anom.spacecraftId && a.subsystem === anom.subsystem && a.status === 'ACTIVE',
        );
        if (!hasActiveSame && nowMs - lastMs > 8000) {
          this.lastAnomalyKeyTimestamp.set(dedupKey, nowMs);
          this.store.anomalies.unshift(anom);
          if (this.store.anomalies.length > 60) this.store.anomalies.pop();
          this.appendHistory({
            missionId: sat.missionId,
            spacecraftName: sat.name,
            eventType: 'ANOMALY',
            severity: anom.severity,
            title: `${anom.subsystem} Anomaly: ${anom.parameter}`,
            details: `Observed ${anom.observedValue} (Normal: ${anom.normalRange}, Z=${anom.zScore}).`,
            healthPct: frame.overallHealthPct,
            provenance: sat.provenance,
          });
          savePersistedStore(this.store);
        }
      }

      // Refresh orbital track curve periodically
      if (Math.abs(this.simElapsedSec - this.trackLastComputedAtSec) > 60) {
        this.orbitalTrackCache = generateOrbitalTrack(sat, this.simElapsedSec, this.referenceDate, 96);
        this.trackLastComputedAtSec = this.simElapsedSec;
      }
    }

    return this.getSnapshot();
  }

  private appendHistory(entry: Omit<MissionHistoryEntry, 'id' | 'timestampIso'>) {
    this.store.missionHistory.unshift({
      id: `HIST-${Date.now()}-${Math.floor(Math.random() * 999)}`,
      timestampIso: new Date().toISOString(),
      ...entry,
    });
    if (this.store.missionHistory.length > 120) {
      this.store.missionHistory.pop();
    }
  }

  public getSnapshot(): MissionControlSnapshot {
    const sat = this.getActiveSpacecraft();
    const { state, updatedElements } = propagateSpacecraftState(
      sat,
      this.simElapsedSec,
      this.referenceDate,
    );
    const activeProfile: SpacecraftProfile = { ...sat, elements: updatedElements };
    const latestTelemetry =
      this.telemetryHistory[this.telemetryHistory.length - 1] ??
      generateTelemetryFrame(sat, state, updatedElements, this.packetSeq, this.activeFaults, 85);

    const demoDangerActive = this.demoState.active && this.demoState.stepIndex >= 6;
    const conjunctions = generateSimulatedConjunctions(
      activeProfile,
      this.simElapsedSec,
      this.referenceDate,
      demoDangerActive,
    );
    const predictions = predictFuturePositions(activeProfile, this.simElapsedSec, this.referenceDate);

    return {
      serverTimeIso: new Date().toISOString(),
      simulationRunning: this.simulationRunning,
      simulationSpeed: this.store.settings.simulationSpeed,
      simElapsedSec: Number(this.simElapsedSec.toFixed(1)),
      activeSpacecraft: activeProfile,
      catalog: SAT_CATALOG,
      groundStations: GROUND_STATIONS,
      orbitalState: state,
      orbitalTrack: this.orbitalTrackCache,
      predictions,
      latestTelemetry,
      telemetryHistory: this.telemetryHistory,
      conjunctions,
      anomalies: this.store.anomalies,
      missionHistory: this.store.missionHistory,
      demoState: this.demoState,
      settings: this.store.settings,
    };
  }

  public controlSimulation(payload: {
    action?: 'start' | 'pause' | 'reset';
    speed?: number;
    spacecraftId?: string;
  }) {
    if (payload.action === 'start') this.simulationRunning = true;
    if (payload.action === 'pause') this.simulationRunning = false;
    if (payload.action === 'reset') {
      this.simElapsedSec = 0;
      this.referenceDate = new Date();
      this.activeFaults = {
        thermalSpike: false,
        voltageDrop: false,
        commsInterruption: false,
        attitudeTumble: false,
      };
      this.seedInitialHistory();
      this.appendHistory({
        missionId: this.getActiveSpacecraft().missionId,
        spacecraftName: this.getActiveSpacecraft().name,
        eventType: 'SYSTEM',
        severity: 'INFO',
        title: 'Simulation Epoch Reset',
        details: 'Orbital propagation and telemetry buffers reset to current epoch.',
        healthPct: 99.4,
        provenance: this.getActiveSpacecraft().provenance,
      });
      savePersistedStore(this.store);
    }
    if (typeof payload.speed === 'number' && payload.speed >= 1 && payload.speed <= 100) {
      this.store.settings.simulationSpeed = payload.speed;
      savePersistedStore(this.store);
    }
    if (payload.spacecraftId && SAT_CATALOG.some((s) => s.id === payload.spacecraftId)) {
      this.store.settings.activeSpacecraftId = payload.spacecraftId;
      this.simElapsedSec = 0;
      this.activeFaults = {
        thermalSpike: false,
        voltageDrop: false,
        commsInterruption: false,
        attitudeTumble: false,
      };
      this.seedInitialHistory();
      const sat = this.getActiveSpacecraft();
      this.appendHistory({
        missionId: sat.missionId,
        spacecraftName: sat.name,
        eventType: 'MISSION',
        severity: 'INFO',
        title: `Switched Active Spacecraft to ${sat.name}`,
        details: `Tracking ${sat.orbitType} via ${sat.elements.propagationModel}.`,
        healthPct: 99.4,
        provenance: sat.provenance,
      });
      savePersistedStore(this.store);
    }
  }

  public controlDemo(payload: {
    action: 'start' | 'pause' | 'resume' | 'restart' | 'stop';
    speedMultiplier?: number;
  }) {
    if (typeof payload.speedMultiplier === 'number') {
      this.demoState.speedMultiplier = Math.max(0.5, Math.min(10, payload.speedMultiplier));
    }

    if (payload.action === 'start' || payload.action === 'restart') {
      this.store.settings.activeSpacecraftId = 'NX-001';
      this.store.settings.simulationSpeed = 15;
      this.simulationRunning = true;
      this.simElapsedSec = 0;
      this.referenceDate = new Date();
      this.activeFaults = {
        thermalSpike: false,
        voltageDrop: false,
        commsInterruption: false,
        attitudeTumble: false,
      };
      this.seedInitialHistory();
      this.demoState = {
        active: true,
        paused: false,
        stepIndex: 0,
        stepTitle: DEMO_STEPS[0].title,
        stepDescription: DEMO_STEPS[0].description,
        elapsedSec: 0,
        speedMultiplier: this.demoState.speedMultiplier,
      };
      this.appendHistory({
        missionId: 'NX-001',
        spacecraftName: 'NEXORBIT DEMO SAT-01',
        eventType: 'MISSION',
        severity: 'INFO',
        title: 'Demo Mode Mission Sequence Initiated',
        details: '9-stage automated aerospace demonstration started on NX-001 (550 km LEO, 51.6° incl).',
        healthPct: 99.4,
        provenance: 'DEMONSTRATION DATA',
      });
      savePersistedStore(this.store);
    } else if (payload.action === 'pause') {
      this.demoState.paused = true;
    } else if (payload.action === 'resume') {
      this.demoState.paused = false;
      this.simulationRunning = true;
    } else if (payload.action === 'stop') {
      this.demoState.active = false;
      this.demoState.paused = false;
      this.activeFaults.thermalSpike = false;
    }
  }

  public injectFault(faultType: FaultInjectionType, enabled: boolean) {
    this.activeFaults = applyFaultToState(this.activeFaults, faultType, enabled);
    const sat = this.getActiveSpacecraft();
    this.appendHistory({
      missionId: sat.missionId,
      spacecraftName: sat.name,
      eventType: 'SYSTEM',
      severity: enabled ? 'WARNING' : 'INFO',
      title: `${enabled ? 'Injected' : 'Cleared'} Simulated Fault: ${faultType.replace('_', ' ')}`,
      details: enabled
        ? 'Controlled test disturbance injected into telemetry synthesis engine.'
        : 'Test disturbance cleared; subsystem returning to nominal profile.',
      healthPct: this.telemetryHistory[this.telemetryHistory.length - 1]?.overallHealthPct ?? 95,
      provenance: sat.provenance,
    });
    savePersistedStore(this.store);
  }

  public getFaultFlags(): ActiveFaultState {
    return this.activeFaults;
  }

  public updateAnomalyStatus(id: string, status: 'ACKNOWLEDGED' | 'RESOLVED'): boolean {
    const target = this.store.anomalies.find((a) => a.id === id);
    if (!target) return false;
    target.status = status;
    if (status === 'RESOLVED') {
      if (target.subsystem === 'Thermal') this.activeFaults.thermalSpike = false;
      if (target.subsystem === 'Power') this.activeFaults.voltageDrop = false;
      if (target.subsystem === 'Communications') this.activeFaults.commsInterruption = false;
      if (target.subsystem === 'Attitude Control') this.activeFaults.attitudeTumble = false;
    }
    this.appendHistory({
      missionId: target.missionId,
      spacecraftName: target.spacecraftId,
      eventType: 'ANOMALY',
      severity: 'INFO',
      title: `Anomaly ${id} marked ${status}`,
      details: `${target.parameter} (${target.observedValue}) updated by flight controller.`,
      healthPct: this.telemetryHistory[this.telemetryHistory.length - 1]?.overallHealthPct ?? 98,
      provenance: target.provenance,
    });
    savePersistedStore(this.store);
    return true;
  }

  public updateSettings(partial: Partial<AppSettings>) {
    const prevSat = this.store.settings.activeSpacecraftId;
    this.store.settings = {
      ...this.store.settings,
      ...partial,
      thresholds: {
        ...this.store.settings.thresholds,
        ...(partial.thresholds ?? {}),
      },
      alertPreferences: {
        ...this.store.settings.alertPreferences,
        ...(partial.alertPreferences ?? {}),
      },
    };
    if (partial.activeSpacecraftId && partial.activeSpacecraftId !== prevSat) {
      this.controlSimulation({ spacecraftId: partial.activeSpacecraftId });
    } else {
      savePersistedStore(this.store);
    }
  }

  public buildCsvExport(): string {
    const header = [
      'Category',
      'Timestamp UTC',
      'Mission ID',
      'Spacecraft',
      'Severity',
      'Title / Parameter',
      'Details / Values',
      'Provenance',
    ].join(',');

    const histRows = this.store.missionHistory.map((h) =>
      [
        escapeCsvCell(h.eventType),
        escapeCsvCell(h.timestampIso),
        escapeCsvCell(h.missionId),
        escapeCsvCell(h.spacecraftName),
        escapeCsvCell(h.severity),
        escapeCsvCell(h.title),
        escapeCsvCell(h.details),
        escapeCsvCell(h.provenance),
      ].join(','),
    );

    const telemRows = this.telemetryHistory.slice(-30).map((t) =>
      [
        'TELEMETRY_FRAME',
        escapeCsvCell(t.timestampIso),
        escapeCsvCell(this.getActiveSpacecraft().missionId),
        escapeCsvCell(this.getActiveSpacecraft().name),
        escapeCsvCell(t.overallHealthPct < 80 ? 'WARNING' : 'INFO'),
        escapeCsvCell(`PKT #${t.packetSeq}`),
        escapeCsvCell(
          `Alt=${t.altitudeKm}km Vel=${t.velocityKmS}km/s Temp=${t.internalTempC}C Vbat=${t.batteryVoltageV}V Health=${t.overallHealthPct}%`,
        ),
        escapeCsvCell(t.provenance),
      ].join(','),
    );

    return [header, ...histRows, ...telemRows].join('\n');
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  const engine = new MissionSimulationEngine();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws/telemetry' });

  function broadcastSnapshot(snapshot: MissionControlSnapshot) {
    const payload = JSON.stringify({
      type: 'TELEMETRY_TICK',
      data: snapshot,
      faults: engine.getFaultFlags(),
    });
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  wss.on('connection', (ws) => {
    ws.send(
      JSON.stringify({
        type: 'TELEMETRY_INIT',
        data: engine.getSnapshot(),
        faults: engine.getFaultFlags(),
      }),
    );
  });

  // Authoritative server-side tick loop honoring configured refresh rate
  let lastTickMs = Date.now();
  let timerId: NodeJS.Timeout | null = null;
  const scheduleTick = () => {
    const snapshot = engine.getSnapshot();
    const intervalMs = snapshot.settings.refreshRateMs || 1000;
    timerId = setTimeout(() => {
      const now = Date.now();
      const dtSec = Math.min(5, Math.max(0.2, (now - lastTickMs) / 1000));
      lastTickMs = now;
      const updated = engine.tick(dtSec);
      broadcastSnapshot(updated);
      scheduleTick();
    }, intervalMs);
  };
  scheduleTick();

  // REST API Endpoints
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'nexorbit-mission-control', utc: new Date().toISOString() });
  });

  app.get('/api/state', (_req, res) => {
    res.json({
      snapshot: engine.getSnapshot(),
      faults: engine.getFaultFlags(),
    });
  });

  app.post('/api/simulation/control', (req, res) => {
    engine.controlSimulation(req.body ?? {});
    const snap = engine.getSnapshot();
    broadcastSnapshot(snap);
    res.json({ snapshot: snap, faults: engine.getFaultFlags() });
  });

  app.post('/api/demo/control', (req, res) => {
    engine.controlDemo(req.body ?? { action: 'start' });
    const snap = engine.getSnapshot();
    broadcastSnapshot(snap);
    res.json({ snapshot: snap, faults: engine.getFaultFlags() });
  });

  app.post('/api/anomalies/inject', (req, res) => {
    const { faultType, enabled } = req.body ?? {};
    if (!faultType) {
      res.status(400).json({ error: 'faultType is required' });
      return;
    }
    engine.injectFault(faultType, Boolean(enabled));
    const snap = engine.tick(0.25);
    broadcastSnapshot(snap);
    res.json({ snapshot: snap, faults: engine.getFaultFlags() });
  });

  app.post('/api/anomalies/:id/acknowledge', (req, res) => {
    const ok = engine.updateAnomalyStatus(req.params.id, 'ACKNOWLEDGED');
    if (!ok) {
      res.status(404).json({ error: 'Anomaly not found' });
      return;
    }
    const snap = engine.getSnapshot();
    broadcastSnapshot(snap);
    res.json({ snapshot: snap, faults: engine.getFaultFlags() });
  });

  app.post('/api/anomalies/:id/resolve', (req, res) => {
    const ok = engine.updateAnomalyStatus(req.params.id, 'RESOLVED');
    if (!ok) {
      res.status(404).json({ error: 'Anomaly not found' });
      return;
    }
    const snap = engine.getSnapshot();
    broadcastSnapshot(snap);
    res.json({ snapshot: snap, faults: engine.getFaultFlags() });
  });

  app.post('/api/settings', (req, res) => {
    engine.updateSettings(req.body ?? {});
    const snap = engine.getSnapshot();
    broadcastSnapshot(snap);
    res.json({ snapshot: snap, faults: engine.getFaultFlags() });
  });

  app.get('/api/history/export', (_req, res) => {
    const csv = engine.buildCsvExport();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="nexorbit-mission-history.csv"');
    res.send(csv);
  });

  // Vite Dev Middleware or Static Production Build
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[NEXORBIT] Mission Control server listening on http://0.0.0.0:${PORT}`);
  });

  process.on('SIGTERM', () => {
    if (timerId) clearTimeout(timerId);
    server.close();
  });
}

startServer().catch((err) => {
  console.error('[NEXORBIT] Fatal server startup error:', err);
  process.exit(1);
});
