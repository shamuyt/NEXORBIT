import type { ConjunctionEvent, RiskLevel, SpacecraftProfile } from './types';

export interface ConjunctionInput {
  id: string;
  secondaryObject: string;
  secondaryNoradId: string;
  objectType: 'DEBRIS' | 'PAYLOAD' | 'ROCKET BODY';
  tcaMinutes: number;
  radialMissKm: number;
  inTrackMissKm: number;
  crossTrackMissKm: number;
  relativeVelocityKmS: number;
  hardBodyRadiusM: number;
  positionSigmaKm: number | null; // null if tracking covariance is unavailable
}

/**
 * Classifies conjunction risk strictly by miss distance and covariance-supported Pc.
 * Never fabricates collision probability when covariance data is missing.
 */
export function classifyConjunctionRisk(
  missDistanceKm: number,
  collisionProbability: number | null,
): { riskLevel: RiskLevel; riskLabel: ConjunctionEvent['riskLabel'] } {
  if (missDistanceKm < 0.6 || (collisionProbability !== null && collisionProbability >= 1e-3)) {
    return { riskLevel: 'RED', riskLabel: 'Critical Alert' };
  }
  if (missDistanceKm < 2.0 || (collisionProbability !== null && collisionProbability >= 1e-4)) {
    return { riskLevel: 'ORANGE', riskLabel: 'Potential Risk' };
  }
  if (missDistanceKm < 6.0 || (collisionProbability !== null && collisionProbability >= 1e-5)) {
    return { riskLevel: 'YELLOW', riskLabel: 'Monitoring Required' };
  }
  return { riskLevel: 'GREEN', riskLabel: 'Normal' };
}

/**
 * Computes 2D Foster/Chan isotropic encounter-plane collision probability approximation
 * ONLY when valid position uncertainty covariance (positionSigmaKm) is provided.
 */
export function computeCollisionProbability(
  missDistanceKm: number,
  hardBodyRadiusM: number,
  positionSigmaKm: number | null,
): number | null {
  if (positionSigmaKm === null || positionSigmaKm <= 0) {
    return null;
  }
  const rHbKm = Math.max(hardBodyRadiusM, 1) / 1000;
  const sigmaSq = positionSigmaKm * positionSigmaKm;
  // Isotropic 2D Gaussian integral over circular hard-body cross-section
  const pc = (rHbKm * rHbKm) / (2 * sigmaSq) * Math.exp(-(missDistanceKm * missDistanceKm) / (2 * sigmaSq));
  return Number(Math.min(1, Math.max(0, pc)).toExponential(3));
}

export function evaluateConjunction(
  primaryName: string,
  input: ConjunctionInput,
  referenceDate: Date,
): ConjunctionEvent {
  const missDistanceKm = Math.sqrt(
    input.radialMissKm * input.radialMissKm +
      input.inTrackMissKm * input.inTrackMissKm +
      input.crossTrackMissKm * input.crossTrackMissKm,
  );
  const roundedMiss = Number(missDistanceKm.toFixed(3));
  const pc = computeCollisionProbability(
    roundedMiss,
    input.hardBodyRadiusM,
    input.positionSigmaKm,
  );
  const { riskLevel, riskLabel } = classifyConjunctionRisk(roundedMiss, pc);
  const tcaTimestampIso = new Date(referenceDate.getTime() + input.tcaMinutes * 60000).toISOString();

  let explanation = '';
  let recommendedAction = '';
  if (riskLevel === 'RED') {
    explanation = `Simulated close-approach screening indicates miss distance of ${roundedMiss.toFixed(3)} km at ${input.relativeVelocityKmS.toFixed(2)} km/s relative velocity. Exceeds RED safety corridor (< 0.6 km or Pc >= 1e-3).`;
    recommendedAction = 'Prepare prograde/retrograde collision avoidance maneuver (CAM) burn plan and request refined tracking covariance update.';
  } else if (riskLevel === 'ORANGE') {
    explanation = `Simulated conjunction inside 2.0 km screening volume (${roundedMiss.toFixed(3)} km miss distance). Requires elevated trajectory refinement.`;
    recommendedAction = 'Schedule high-cadence ephemeris propagation check at TCA-60 min and verify thruster propellant readiness.';
  } else if (riskLevel === 'YELLOW') {
    explanation = `Secondary object passes within 6.0 km watch box (${roundedMiss.toFixed(3)} km). Covariance ${pc !== null ? 'supports nominal Pc screening' : 'unavailable — Pc withheld'}.`;
    recommendedAction = 'Continue automated conjunction monitoring across next orbital pass; no maneuver required.';
  } else {
    explanation = `Nominal orbital separation (${roundedMiss.toFixed(3)} km). Outside all collision-avoidance screening ellipsoids.`;
    recommendedAction = 'Routine catalog screening only.';
  }

  return {
    id: input.id,
    primaryObject: primaryName,
    secondaryObject: input.secondaryObject,
    secondaryNoradId: input.secondaryNoradId,
    objectType: input.objectType,
    riskLevel,
    riskLabel,
    tcaMinutes: Number(input.tcaMinutes.toFixed(1)),
    tcaTimestampIso,
    missDistanceKm: roundedMiss,
    radialMissKm: Number(input.radialMissKm.toFixed(3)),
    inTrackMissKm: Number(input.inTrackMissKm.toFixed(3)),
    crossTrackMissKm: Number(input.crossTrackMissKm.toFixed(3)),
    relativeVelocityKmS: Number(input.relativeVelocityKmS.toFixed(2)),
    hasCovarianceData: input.positionSigmaKm !== null,
    positionSigmaKm: input.positionSigmaKm,
    collisionProbability: pc,
    explanation,
    recommendedAction,
    provenance: 'SIMULATED RISK SCENARIO',
  };
}

export function generateSimulatedConjunctions(
  spacecraft: SpacecraftProfile,
  simElapsedSec: number,
  referenceDate: Date,
  demoDangerActive = false,
): ConjunctionEvent[] {
  const phaseShift = (simElapsedSec * 0.04) % 45;
  const demoMissScale = demoDangerActive ? 0.35 : 1.0;

  const baseObjects: ConjunctionInput[] = [
    {
      id: 'CONJ-2026-01',
      secondaryObject: 'COSMOS 2251 DEB (SIM)',
      secondaryNoradId: '34454-S',
      objectType: 'DEBRIS',
      tcaMinutes: Math.max(2.4, 38.5 - phaseShift * 0.7),
      radialMissKm: 0.22 * demoMissScale,
      inTrackMissKm: 0.85 * demoMissScale,
      crossTrackMissKm: 0.41 * demoMissScale,
      relativeVelocityKmS: 13.84,
      hardBodyRadiusM: spacecraft.hardBodyRadiusM + 1.5,
      positionSigmaKm: 0.28,
    },
    {
      id: 'CONJ-2026-02',
      secondaryObject: 'SL-16 R/B FRAGMENT (SIM)',
      secondaryNoradId: '28119-S',
      objectType: 'ROCKET BODY',
      tcaMinutes: Math.max(11.2, 74.0 - phaseShift * 0.5),
      radialMissKm: 0.65,
      inTrackMissKm: 1.42,
      crossTrackMissKm: 0.94,
      relativeVelocityKmS: 10.62,
      hardBodyRadiusM: spacecraft.hardBodyRadiusM + 2.8,
      positionSigmaKm: 0.45,
    },
    {
      id: 'CONJ-2026-03',
      secondaryObject: 'FENGYUN 1C DEB (SIM)',
      secondaryNoradId: '31114-S',
      objectType: 'DEBRIS',
      tcaMinutes: 112.4,
      radialMissKm: 1.8,
      inTrackMissKm: 3.1,
      crossTrackMissKm: 2.2,
      relativeVelocityKmS: 14.21,
      hardBodyRadiusM: spacecraft.hardBodyRadiusM + 1.2,
      // Explicitly omit covariance to demonstrate truthful "Pc N/A" handling
      positionSigmaKm: null,
    },
    {
      id: 'CONJ-2026-04',
      secondaryObject: 'STARLINK-4012 (SIM)',
      secondaryNoradId: '52881-S',
      objectType: 'PAYLOAD',
      tcaMinutes: 164.0,
      radialMissKm: 4.5,
      inTrackMissKm: 8.2,
      crossTrackMissKm: 5.1,
      relativeVelocityKmS: 7.45,
      hardBodyRadiusM: spacecraft.hardBodyRadiusM + 3.0,
      positionSigmaKm: 0.85,
    },
  ];

  // For GEO satellites, adjust relative velocities and clearances realistically
  if (spacecraft.orbitType === 'Geostationary Orbit (GEO)') {
    baseObjects.forEach((obj, idx) => {
      obj.relativeVelocityKmS = 0.45 + idx * 0.18;
      obj.inTrackMissKm *= 4.5;
      obj.radialMissKm *= 3.0;
    });
  }

  return baseObjects
    .map((input) => evaluateConjunction(spacecraft.name, input, referenceDate))
    .sort((a, b) => a.missDistanceKm - b.missDistanceKm);
}
