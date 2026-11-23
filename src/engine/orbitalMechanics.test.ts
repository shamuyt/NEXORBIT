import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MU_EARTH,
  R_EARTH_KM,
  SAT_CATALOG,
  computeJ2RaanPrecessionDegDay,
  computeOrbitalPeriodMin,
  computeVisVivaVelocityKmS,
  generateOrbitalTrack,
  predictFuturePositions,
  propagateSpacecraftState,
  solveEccentricAnomaly,
} from './orbitalMechanics';

test('solveEccentricAnomaly solves Kepler equation accurately', () => {
  const M = 1.15;
  const e = 0.08;
  const E = solveEccentricAnomaly(M, e);
  const residual = Math.abs(E - e * Math.sin(E) - M);
  assert.ok(residual < 1e-8, `Expected residual < 1e-8, got ${residual}`);
});

test('550 km circular LEO orbit computes realistic period (~95.6 min) and velocity (~7.58 km/s)', () => {
  const a = R_EARTH_KM + 550;
  const periodMin = computeOrbitalPeriodMin(a);
  const velocityKmS = computeVisVivaVelocityKmS(a, a);
  assert.ok(periodMin > 94.5 && periodMin < 96.8, `Unexpected LEO period: ${periodMin}`);
  assert.ok(velocityKmS > 7.52 && velocityKmS < 7.64, `Unexpected LEO velocity: ${velocityKmS}`);
  assert.ok(Math.abs(velocityKmS - Math.sqrt(MU_EARTH / a)) < 1e-6);
});

test('Sun-synchronous 98.1 deg inclination yields positive ~0.9856 deg/day J2 RAAN precession', () => {
  const sso = SAT_CATALOG.find((s) => s.id === 'NX-SSO-02')!;
  const rate = computeJ2RaanPrecessionDegDay(
    sso.elements.semiMajorAxisKm,
    sso.elements.eccentricity,
    sso.elements.inclinationDeg,
  );
  assert.ok(rate > 0.85 && rate < 1.15, `Expected SSO precession ~0.98 deg/day, got ${rate}`);
});

test('SGP4 propagation works for ISS TLE and generates continuous track', () => {
  const iss = SAT_CATALOG.find((s) => s.id === 'ISS-25544')!;
  const ref = new Date('2026-11-23T18:00:00Z');
  const { state } = propagateSpacecraftState(iss, 120, ref);
  assert.ok(state.altitudeKm > 380 && state.altitudeKm < 460, `ISS altitude out of bounds: ${state.altitudeKm}`);
  assert.ok(state.velocityKmS > 7.4 && state.velocityKmS < 7.9, `ISS velocity out of bounds: ${state.velocityKmS}`);
  assert.ok(state.latitudeDeg >= -52.5 && state.latitudeDeg <= 52.5);

  const track = generateOrbitalTrack(iss, 0, ref, 32);
  assert.equal(track.length, 33);

  const preds = predictFuturePositions(iss, 0, ref, [15, 30, 60]);
  assert.equal(preds.length, 3);
  assert.equal(preds[0].offsetMinutes, 15);
});
