import test from 'node:test';
import assert from 'node:assert/strict';
import { thresholdAndZScoreDetector } from './anomalyDetector';
import { SAT_CATALOG, propagateSpacecraftState } from './orbitalMechanics';
import {
  classifyConjunctionRisk,
  computeCollisionProbability,
  generateSimulatedConjunctions,
} from './safetyMonitor';
import { generateTelemetryFrame } from './telemetrySimulator';
import type { AppSettings } from './types';

const defaultThresholds: AppSettings['thresholds'] = {
  tempMaxC: 45,
  tempMinC: -10,
  voltageMinV: 6.7,
  voltageMaxV: 8.5,
  angularVelMaxDegS: 0.5,
  signalMinDbm: -112,
};

test('Telemetry simulator generates nominal frame and triggers anomaly detector on fault injection', () => {
  const sat = SAT_CATALOG[0];
  const ref = new Date('2026-11-23T18:00:00Z');
  const { state, updatedElements } = propagateSpacecraftState(sat, 60, ref);

  const nominal = generateTelemetryFrame(sat, state, updatedElements, 1, {
    thermalSpike: false,
    voltageDrop: false,
    commsInterruption: false,
    attitudeTumble: false,
  });
  assert.equal(nominal.subsystems.thermal, 'NOMINAL');
  assert.equal(nominal.subsystems.power, 'NOMINAL');

  const history = Array.from({ length: 8 }, (_, i) => ({
    ...nominal,
    packetSeq: i + 1,
  }));

  const thermalFaultFrame = generateTelemetryFrame(sat, state, updatedElements, 9, {
    thermalSpike: true,
    voltageDrop: true,
    commsInterruption: false,
    attitudeTumble: false,
  });

  const anomalies = thresholdAndZScoreDetector.evaluateFrame(
    thermalFaultFrame,
    history,
    defaultThresholds,
    sat.missionId,
    sat.id,
  );
  assert.ok(anomalies.some((a) => a.subsystem === 'Thermal'));
  assert.ok(anomalies.some((a) => a.subsystem === 'Power'));
  assert.ok(anomalies.every((a) => a.status === 'ACTIVE'));
});

test('Safety monitor withholds collision probability when covariance data is absent', () => {
  const pcMissing = computeCollisionProbability(1.2, 5.0, null);
  assert.equal(pcMissing, null);

  const pcPresent = computeCollisionProbability(0.4, 5.0, 0.25);
  assert.ok(pcPresent !== null && pcPresent > 0);

  assert.equal(classifyConjunctionRisk(0.45, pcPresent).riskLevel, 'RED');
  assert.equal(classifyConjunctionRisk(1.5, 1e-6).riskLevel, 'ORANGE');
  assert.equal(classifyConjunctionRisk(4.2, null).riskLevel, 'YELLOW');
  assert.equal(classifyConjunctionRisk(12.0, 1e-12).riskLevel, 'GREEN');
});

test('Simulated conjunctions sort by closest miss distance and mark provenance', () => {
  const sat = SAT_CATALOG[0];
  const ref = new Date('2026-11-23T18:00:00Z');
  const list = generateSimulatedConjunctions(sat, 10, ref, true);
  assert.ok(list.length >= 3);
  assert.ok(list[0].missDistanceKm <= list[1].missDistanceKm);
  assert.ok(list.every((c) => c.provenance === 'SIMULATED RISK SCENARIO'));
  const noCov = list.find((c) => !c.hasCovarianceData);
  assert.ok(noCov && noCov.collisionProbability === null);
});
