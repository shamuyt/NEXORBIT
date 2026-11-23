export type NavSection =
  | 'overview'
  | 'tracking'
  | 'telemetry'
  | 'orbital'
  | 'safety'
  | 'anomalies'
  | 'history'
  | 'how-it-works'
  | 'settings';

export type DataProvenance = 'SIMULATED DATA' | 'DEMONSTRATION DATA' | 'TLE SGP4 PROPAGATED';

export type RiskLevel = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';

export type SubsystemStatus = 'NOMINAL' | 'DEGRADED' | 'WARNING' | 'CRITICAL';

export type AnomalySeverity = 'WARNING' | 'CRITICAL';

export type AnomalyStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';

export type FaultInjectionType =
  | 'THERMAL_SPIKE'
  | 'VOLTAGE_DROP'
  | 'COMMS_INTERRUPTION'
  | 'ATTITUDE_TUMBLE';

export interface OrbitalElements {
  semiMajorAxisKm: number;
  eccentricity: number;
  inclinationDeg: number;
  raanDeg: number;
  argPerigeeDeg: number;
  trueAnomalyDeg: number;
  meanAnomalyDeg: number;
  perigeeAltKm: number;
  apogeeAltKm: number;
  orbitalPeriodMin: number;
  j2RaanPrecessionDegDay: number;
  propagationModel: 'SGP4/SDP4 (TLE)' | 'Two-Body Keplerian + J2';
}

export interface TleData {
  line1: string;
  line2: string;
  epochLabel: string;
}

export interface SpacecraftProfile {
  id: string;
  noradId: string;
  name: string;
  missionId: string;
  orbitType: 'Low Earth Orbit (LEO)' | 'Sun-Synchronous Orbit (SSO)' | 'Geostationary Orbit (GEO)';
  launchDate: string;
  missionStatus: 'ACTIVE MISSION' | 'DEMONSTRATION ACTIVE' | 'NOMINAL OPERATIONS';
  provenance: DataProvenance;
  elements: OrbitalElements;
  tle?: TleData;
  busMassKg: number;
  solarAreaM2: number;
  hardBodyRadiusM: number;
}

export interface OrbitalStateVector {
  timestampIso: string;
  simElapsedSec: number;
  latitudeDeg: number;
  longitudeDeg: number;
  altitudeKm: number;
  velocityKmS: number;
  orbitDirection: 'ASCENDING' | 'DESCENDING';
  eciPositionKm: { x: number; y: number; z: number };
  eciVelocityKmS: { x: number; y: number; z: number };
  inSunlight: boolean;
  activeGroundStation: string | null;
  groundStationElevationDeg: number;
}

export interface TelemetryFrame {
  timestampIso: string;
  simElapsedSec: number;
  packetSeq: number;
  packetIntegrityPct: number;
  packetStatus: 'LOCKED' | 'DEGRADED' | 'LOS';
  altitudeKm: number;
  velocityKmS: number;
  latitudeDeg: number;
  longitudeDeg: number;
  orbitalPeriodMin: number;
  inclinationDeg: number;
  batteryVoltageV: number;
  batteryCurrentA: number;
  batterySocPct: number;
  solarPowerW: number;
  busPowerDrawW: number;
  internalTempC: number;
  signalStrengthDbm: number;
  snrDb: number;
  gyroXDegS: number;
  gyroYDegS: number;
  gyroZDegS: number;
  angularVelocityDegS: number;
  accelXMS2: number;
  accelYMS2: number;
  accelZMS2: number;
  overallHealthPct: number;
  subsystems: {
    communications: SubsystemStatus;
    power: SubsystemStatus;
    thermal: SubsystemStatus;
    navigation: SubsystemStatus;
    attitudeControl: SubsystemStatus;
  };
  provenance: DataProvenance;
}

export interface PredictedPosition {
  offsetMinutes: number;
  timestampIso: string;
  latitudeDeg: number;
  longitudeDeg: number;
  altitudeKm: number;
  velocityKmS: number;
  inSunlight: boolean;
}

export interface GroundStation {
  id: string;
  name: string;
  code: string;
  latitudeDeg: number;
  longitudeDeg: number;
  minElevationDeg: number;
  band: string;
}

export interface ConjunctionEvent {
  id: string;
  primaryObject: string;
  secondaryObject: string;
  secondaryNoradId: string;
  objectType: 'DEBRIS' | 'PAYLOAD' | 'ROCKET BODY';
  riskLevel: RiskLevel;
  riskLabel: 'Normal' | 'Monitoring Required' | 'Potential Risk' | 'Critical Alert';
  tcaMinutes: number;
  tcaTimestampIso: string;
  missDistanceKm: number;
  radialMissKm: number;
  inTrackMissKm: number;
  crossTrackMissKm: number;
  relativeVelocityKmS: number;
  hasCovarianceData: boolean;
  positionSigmaKm: number | null;
  collisionProbability: number | null;
  explanation: string;
  recommendedAction: string;
  provenance: 'SIMULATED RISK SCENARIO';
}

export interface AnomalyEvent {
  id: string;
  missionId: string;
  spacecraftId: string;
  parameter: string;
  subsystem: 'Thermal' | 'Power' | 'Communications' | 'Attitude Control' | 'Navigation';
  observedValue: string;
  numericValue: number;
  unit: string;
  normalRange: string;
  zScore: number;
  detectionMethod: 'Threshold + Z-Score Engine' | 'Rate-of-Change Guard';
  detectedAtIso: string;
  severity: AnomalySeverity;
  status: AnomalyStatus;
  explanation: string;
  recommendedInvestigation: string;
  provenance: DataProvenance;
}

export interface MissionHistoryEntry {
  id: string;
  timestampIso: string;
  missionId: string;
  spacecraftName: string;
  eventType: 'MISSION' | 'TELEMETRY' | 'ANOMALY' | 'SAFETY' | 'SYSTEM';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  details: string;
  healthPct: number;
  provenance: DataProvenance;
}

export interface DemoModeState {
  active: boolean;
  paused: boolean;
  stepIndex: number; // 0 to 8 (9 stages)
  stepTitle: string;
  stepDescription: string;
  elapsedSec: number;
  speedMultiplier: number;
}

export interface AppSettings {
  units: 'METRIC' | 'IMPERIAL';
  refreshRateMs: 500 | 1000 | 2000 | 5000;
  contrastMode: 'OBSIDIAN' | 'DEEP_NAVY';
  thresholds: {
    tempMaxC: number;
    tempMinC: number;
    voltageMinV: number;
    voltageMaxV: number;
    angularVelMaxDegS: number;
    signalMinDbm: number;
  };
  alertPreferences: {
    audioChime: boolean;
    autoPauseOnCritical: boolean;
    showSimulatedDisclaimer: boolean;
  };
  simulationSpeed: number;
  activeSpacecraftId: string;
}

export interface MissionControlSnapshot {
  serverTimeIso: string;
  simulationRunning: boolean;
  simulationSpeed: number;
  simElapsedSec: number;
  activeSpacecraft: SpacecraftProfile;
  catalog: SpacecraftProfile[];
  groundStations: GroundStation[];
  orbitalState: OrbitalStateVector;
  orbitalTrack: Array<{ lat: number; lon: number; altKm: number; x: number; y: number; z: number }>;
  predictions: PredictedPosition[];
  latestTelemetry: TelemetryFrame;
  telemetryHistory: TelemetryFrame[];
  conjunctions: ConjunctionEvent[];
  anomalies: AnomalyEvent[];
  missionHistory: MissionHistoryEntry[];
  demoState: DemoModeState;
  settings: AppSettings;
}
