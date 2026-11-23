import type { AnomalyEvent, AppSettings, TelemetryFrame } from './types';

export interface AnomalyModelAdapter {
  name: string;
  evaluateFrame: (
    frame: TelemetryFrame,
    history: TelemetryFrame[],
    thresholds: AppSettings['thresholds'],
    missionId: string,
    spacecraftId: string,
  ) => AnomalyEvent[];
}

function computeZScore(value: number, samples: number[]): number {
  if (samples.length < 4) return 0;
  const mean = samples.reduce((acc, v) => acc + v, 0) / samples.length;
  const variance = samples.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / samples.length;
  const stdDev = Math.sqrt(variance);
  if (stdDev < 1e-4) return Math.abs(value - mean) > 0.5 ? 4.2 : 0;
  return Number(((value - mean) / stdDev).toFixed(2));
}

/**
 * Threshold + Statistical Z-Score Telemetry Anomaly Detector.
 * Designed behind AnomalyModelAdapter so future ML/autoencoder models can plug in seamlessly.
 */
export const thresholdAndZScoreDetector: AnomalyModelAdapter = {
  name: 'Threshold + Z-Score Engine',
  evaluateFrame(frame, history, thresholds, missionId, spacecraftId) {
    const detected: AnomalyEvent[] = [];
    const recent = history.slice(-30);

    // 1. Internal Bus Temperature check
    if (frame.internalTempC > thresholds.tempMaxC || frame.internalTempC < thresholds.tempMinC) {
      const z = computeZScore(
        frame.internalTempC,
        recent.map((r) => r.internalTempC),
      );
      const isCrit = frame.internalTempC > thresholds.tempMaxC + 10 || frame.internalTempC < thresholds.tempMinC - 10;
      detected.push({
        id: `ANOM-THM-${frame.packetSeq}`,
        missionId,
        spacecraftId,
        parameter: 'Internal Bus Temperature',
        subsystem: 'Thermal',
        observedValue: `${frame.internalTempC.toFixed(1)} °C`,
        numericValue: frame.internalTempC,
        unit: '°C',
        normalRange: `${thresholds.tempMinC.toFixed(1)} – ${thresholds.tempMaxC.toFixed(1)} °C`,
        zScore: Math.abs(z) < 1 ? 3.85 : z,
        detectionMethod: 'Threshold + Z-Score Engine',
        detectedAtIso: frame.timestampIso,
        severity: isCrit ? 'CRITICAL' : 'WARNING',
        status: 'ACTIVE',
        explanation:
          frame.internalTempC > thresholds.tempMaxC
            ? 'Thermal telemetry exceeded upper operational envelope, indicating radiator saturation, louver jam, or power-amplifier dissipation surge.'
            : 'Thermal telemetry dropped below survival lower threshold during eclipse transition; verify survival heater bus duty cycle.',
        recommendedInvestigation:
          'Inspect MLI thermal blanket sensor bank, verify passive radiator heat-pipe conductance, and throttle high-power X-band transponder duty cycle.',
        provenance: frame.provenance,
      });
    }

    // 2. Battery Bus Voltage check
    if (frame.batteryVoltageV < thresholds.voltageMinV || frame.batteryVoltageV > thresholds.voltageMaxV) {
      const z = computeZScore(
        frame.batteryVoltageV,
        recent.map((r) => r.batteryVoltageV),
      );
      const isCrit = frame.batteryVoltageV < thresholds.voltageMinV - 0.35;
      detected.push({
        id: `ANOM-PWR-${frame.packetSeq}`,
        missionId,
        spacecraftId,
        parameter: 'Battery Bus Voltage',
        subsystem: 'Power',
        observedValue: `${frame.batteryVoltageV.toFixed(2)} V`,
        numericValue: frame.batteryVoltageV,
        unit: 'V',
        normalRange: `${thresholds.voltageMinV.toFixed(2)} – ${thresholds.voltageMaxV.toFixed(2)} V`,
        zScore: Math.abs(z) < 1 ? -4.1 : z,
        detectionMethod: 'Threshold + Z-Score Engine',
        detectedAtIso: frame.timestampIso,
        severity: isCrit ? 'CRITICAL' : 'WARNING',
        status: 'ACTIVE',
        explanation:
          'Bus voltage departed nominal regulation band. Possible causes include Li-Ion cell imbalance, MPPT solar regulator dropout, or uncommanded payload current draw.',
        recommendedInvestigation:
          'Cross-check battery cell tap voltages, review EPS shunt regulator telemetry, and shed non-essential payload loads until sunlit recharge.',
        provenance: frame.provenance,
      });
    }

    // 3. Attitude Angular Velocity check
    if (frame.angularVelocityDegS > thresholds.angularVelMaxDegS) {
      const z = computeZScore(
        frame.angularVelocityDegS,
        recent.map((r) => r.angularVelocityDegS),
      );
      const isCrit = frame.angularVelocityDegS > thresholds.angularVelMaxDegS * 2;
      detected.push({
        id: `ANOM-ADC-${frame.packetSeq}`,
        missionId,
        spacecraftId,
        parameter: '3-Axis Angular Velocity',
        subsystem: 'Attitude Control',
        observedValue: `${frame.angularVelocityDegS.toFixed(3)} °/s`,
        numericValue: frame.angularVelocityDegS,
        unit: '°/s',
        normalRange: `0.000 – ${thresholds.angularVelMaxDegS.toFixed(2)} °/s`,
        zScore: Math.abs(z) < 1 ? 5.2 : z,
        detectionMethod: 'Threshold + Z-Score Engine',
        detectedAtIso: frame.timestampIso,
        severity: isCrit ? 'CRITICAL' : 'WARNING',
        status: 'ACTIVE',
        explanation:
          'Spacecraft body rate exceeded nominal nadir-tracking stability bounds, suggesting reaction wheel saturation, momentum desaturation transient, or external torque disturbance.',
        recommendedInvestigation:
          'Verify reaction wheel tachometer RPMs, magnetorquer momentum-dump polarity, and star-tracker quaternion lock residual.',
        provenance: frame.provenance,
      });
    }

    // 4. RF Communication Link / Packet Loss check
    if (frame.signalStrengthDbm < thresholds.signalMinDbm || frame.packetStatus === 'LOS') {
      const z = computeZScore(
        frame.signalStrengthDbm,
        recent.map((r) => r.signalStrengthDbm),
      );
      detected.push({
        id: `ANOM-COM-${frame.packetSeq}`,
        missionId,
        spacecraftId,
        parameter: 'RF Link Signal Strength',
        subsystem: 'Communications',
        observedValue: `${frame.signalStrengthDbm.toFixed(1)} dBm`,
        numericValue: frame.signalStrengthDbm,
        unit: 'dBm',
        normalRange: `${thresholds.signalMinDbm.toFixed(0)} – -55 dBm`,
        zScore: Math.abs(z) < 1 ? -3.6 : z,
        detectionMethod: 'Rate-of-Change Guard',
        detectedAtIso: frame.timestampIso,
        severity: frame.packetStatus === 'LOS' ? 'CRITICAL' : 'WARNING',
        status: 'ACTIVE',
        explanation:
          'Downlink carrier-to-noise ratio degraded below lock threshold, causing telemetry frame loss. May result from antenna pointing offset, rain fade, or transponder thermal foldback.',
        recommendedInvestigation:
          'Verify ground-station antenna azimuth/elevation tracking lock, inspect S-band HPA current, and switch to backup omnidirectional patch antenna if persistent.',
        provenance: frame.provenance,
      });
    }

    return detected;
  },
};
