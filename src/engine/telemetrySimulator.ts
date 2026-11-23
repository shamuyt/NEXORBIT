import type {
  FaultInjectionType,
  OrbitalElements,
  OrbitalStateVector,
  SpacecraftProfile,
  SubsystemStatus,
  TelemetryFrame,
} from './types';

export interface ActiveFaultState {
  thermalSpike: boolean;
  voltageDrop: boolean;
  commsInterruption: boolean;
  attitudeTumble: boolean;
}

/**
 * Deterministic, physics-informed spacecraft telemetry synthesis engine.
 * Models sunlit/eclipse thermal cycling, solar array incidence, battery SoC/voltage,
 * RF link budget vs ground station elevation, and 3-axis reaction wheel dynamics.
 */
export function generateTelemetryFrame(
  spacecraft: SpacecraftProfile,
  orbitalState: OrbitalStateVector,
  elements: OrbitalElements,
  packetSeq: number,
  faults: ActiveFaultState,
  prevSocPct = 86,
): TelemetryFrame {
  const t = orbitalState.simElapsedSec;
  const phaseRad = (elements.trueAnomalyDeg * Math.PI) / 180;

  // Deterministic pseudo-noise bounded smoothly via multi-harmonic trig
  const microJitterA = Math.sin(t * 0.73) * 0.5 + Math.cos(t * 1.41) * 0.5;
  const microJitterB = Math.cos(t * 0.91) * 0.5 + Math.sin(t * 1.77) * 0.5;

  // Solar power generation (W) based on sunlight & bus array area
  const peakSolarW = spacecraft.solarAreaM2 * 245; // ~245 W/m2 effective EPS output
  const incidenceFactor = 0.78 + 0.18 * Math.cos(phaseRad * 0.5);
  const rawSolarW = orbitalState.inSunlight
    ? peakSolarW * incidenceFactor + microJitterA * 6
    : 0;
  const solarPowerW = Math.max(0, Number(rawSolarW.toFixed(1)));

  // Bus power draw (W)
  const baseDrawW = spacecraft.solarAreaM2 * 115;
  const commsDrawW = orbitalState.activeGroundStation ? 48 : 12;
  const heaterDrawW = orbitalState.inSunlight ? 5 : 38;
  const busPowerDrawW = Number((baseDrawW + commsDrawW + heaterDrawW + microJitterB * 4).toFixed(1));

  // Battery State of Charge & Bus Voltage (nominal 7.4V for 2S Li-Ion smallsat bus or scaled)
  const netPowerW = solarPowerW - busPowerDrawW;
  const deltaSoc = (netPowerW / Math.max(peakSolarW, 200)) * 0.14;
  let batterySocPct = Math.min(99.5, Math.max(18.0, prevSocPct + deltaSoc));
  if (faults.voltageDrop) {
    batterySocPct = Math.max(24.0, batterySocPct - 18.0);
  }

  let batteryVoltageV = 6.95 + (batterySocPct / 100) * 1.15 + microJitterA * 0.03;
  if (faults.voltageDrop) {
    batteryVoltageV = 6.08 + microJitterB * 0.06; // Simulates abnormal under-voltage drop (~6.1V vs 7.4V nominal)
  }
  const batteryCurrentA = Number((netPowerW / Math.max(batteryVoltageV, 5.5)).toFixed(2));

  // Internal bus temperature (°C): rises in sunlight, cools in eclipse
  const baseTempC = orbitalState.inSunlight ? 26.5 + 4.5 * Math.sin(phaseRad) : 14.2 + 2.5 * Math.cos(phaseRad);
  let internalTempC = baseTempC + microJitterA * 0.6;
  if (faults.thermalSpike) {
    internalTempC = 63.4 + Math.sin(t * 0.5) * 1.8; // Abnormal thermal excursion
  }

  // RF Communications Link (dBm & SNR)
  const hasPass = Boolean(orbitalState.activeGroundStation);
  const elevGain = hasPass ? Math.min(18, orbitalState.groundStationElevationDeg * 0.35) : 0;
  let signalStrengthDbm = hasPass ? -78 + elevGain + microJitterB * 1.4 : -106 + microJitterA * 1.8;
  let snrDb = hasPass ? 16.5 + elevGain * 0.45 : 3.2;
  let packetIntegrityPct = hasPass ? 99.6 : 94.5;
  let packetStatus: TelemetryFrame['packetStatus'] = hasPass ? 'LOCKED' : 'DEGRADED';

  if (faults.commsInterruption) {
    signalStrengthDbm = -119.5 + microJitterA * 1.2;
    snrDb = -1.8;
    packetIntegrityPct = 38.4;
    packetStatus = 'LOS';
  }

  // 3-Axis Gyroscope & Accelerometer
  let gyroXDegS = 0.014 * Math.sin(t * 0.4) + microJitterA * 0.004;
  let gyroYDegS = -0.011 * Math.cos(t * 0.35) + microJitterB * 0.004;
  let gyroZDegS = 0.062 + microJitterA * 0.005; // Nadir-pointing pitch rate ~0.06 deg/s in LEO

  if (faults.attitudeTumble) {
    gyroXDegS = 2.45 + Math.sin(t * 1.3) * 0.4;
    gyroYDegS = -1.82 + Math.cos(t * 1.1) * 0.3;
    gyroZDegS = 3.10 + Math.sin(t * 0.9) * 0.35;
  }

  const angularVelocityDegS = Math.sqrt(
    gyroXDegS * gyroXDegS + gyroYDegS * gyroYDegS + gyroZDegS * gyroZDegS,
  );

  // Microgravity drag/reaction wheel residual acceleration (m/s^2)
  const accelXMS2 = (faults.attitudeTumble ? 0.042 : 0.0008) * Math.sin(t * 0.6);
  const accelYMS2 = (faults.attitudeTumble ? 0.036 : 0.0006) * Math.cos(t * 0.8);
  const accelZMS2 = (faults.attitudeTumble ? 0.051 : 0.0011) * Math.sin(t * 0.5 + 1.0);

  // Subsystem statuses
  const thermalStatus: SubsystemStatus =
    internalTempC > 55 ? 'CRITICAL' : internalTempC > 42 ? 'WARNING' : 'NOMINAL';
  const powerStatus: SubsystemStatus =
    batteryVoltageV < 6.4 ? 'CRITICAL' : batteryVoltageV < 6.8 ? 'WARNING' : 'NOMINAL';
  const commsStatus: SubsystemStatus =
    faults.commsInterruption ? 'CRITICAL' : hasPass ? 'NOMINAL' : 'DEGRADED';
  const adcsStatus: SubsystemStatus =
    angularVelocityDegS > 1.5 ? 'CRITICAL' : angularVelocityDegS > 0.5 ? 'WARNING' : 'NOMINAL';
  const navStatus: SubsystemStatus = 'NOMINAL';

  // Aggregate Spacecraft Health Score (0 - 100%)
  let health = 99.4;
  if (thermalStatus === 'WARNING') health -= 9;
  if (thermalStatus === 'CRITICAL') health -= 24;
  if (powerStatus === 'WARNING') health -= 10;
  if (powerStatus === 'CRITICAL') health -= 26;
  if (commsStatus === 'DEGRADED') health -= 3;
  if (commsStatus === 'CRITICAL') health -= 22;
  if (adcsStatus === 'WARNING') health -= 8;
  if (adcsStatus === 'CRITICAL') health -= 24;

  return {
    timestampIso: orbitalState.timestampIso,
    simElapsedSec: t,
    packetSeq,
    packetIntegrityPct: Number(packetIntegrityPct.toFixed(1)),
    packetStatus,
    altitudeKm: orbitalState.altitudeKm,
    velocityKmS: orbitalState.velocityKmS,
    latitudeDeg: orbitalState.latitudeDeg,
    longitudeDeg: orbitalState.longitudeDeg,
    orbitalPeriodMin: elements.orbitalPeriodMin,
    inclinationDeg: elements.inclinationDeg,
    batteryVoltageV: Number(batteryVoltageV.toFixed(2)),
    batteryCurrentA,
    batterySocPct: Number(batterySocPct.toFixed(1)),
    solarPowerW,
    busPowerDrawW,
    internalTempC: Number(internalTempC.toFixed(1)),
    signalStrengthDbm: Number(signalStrengthDbm.toFixed(1)),
    snrDb: Number(snrDb.toFixed(1)),
    gyroXDegS: Number(gyroXDegS.toFixed(3)),
    gyroYDegS: Number(gyroYDegS.toFixed(3)),
    gyroZDegS: Number(gyroZDegS.toFixed(3)),
    angularVelocityDegS: Number(angularVelocityDegS.toFixed(3)),
    accelXMS2: Number(accelXMS2.toFixed(4)),
    accelYMS2: Number(accelYMS2.toFixed(4)),
    accelZMS2: Number(accelZMS2.toFixed(4)),
    overallHealthPct: Number(Math.max(15, health).toFixed(1)),
    subsystems: {
      communications: commsStatus,
      power: powerStatus,
      thermal: thermalStatus,
      navigation: navStatus,
      attitudeControl: adcsStatus,
    },
    provenance: spacecraft.provenance,
  };
}

export function applyFaultToState(
  faults: ActiveFaultState,
  faultType: FaultInjectionType,
  enabled: boolean,
): ActiveFaultState {
  switch (faultType) {
    case 'THERMAL_SPIKE':
      return { ...faults, thermalSpike: enabled };
    case 'VOLTAGE_DROP':
      return { ...faults, voltageDrop: enabled };
    case 'COMMS_INTERRUPTION':
      return { ...faults, commsInterruption: enabled };
    case 'ATTITUDE_TUMBLE':
      return { ...faults, attitudeTumble: enabled };
  }
}
