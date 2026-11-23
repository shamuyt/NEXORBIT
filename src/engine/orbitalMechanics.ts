import * as satellite from 'satellite.js';
import type {
  GroundStation,
  OrbitalElements,
  OrbitalStateVector,
  PredictedPosition,
  SpacecraftProfile,
} from './types';

import { J2_EARTH, MU_EARTH, OMEGA_EARTH_RAD_S, R_EARTH_KM } from './constants';
export { J2_EARTH, MU_EARTH, OMEGA_EARTH_RAD_S, R_EARTH_KM };

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

export const GROUND_STATIONS: GroundStation[] = [
  {
    id: 'GS-GDS',
    name: 'Goldstone Deep Space Complex',
    code: 'GDSCC',
    latitudeDeg: 35.4267,
    longitudeDeg: -116.89,
    minElevationDeg: 5,
    band: 'S / X-Band',
  },
  {
    id: 'GS-SVL',
    name: 'Svalbard Satellite Station',
    code: 'SVAL',
    latitudeDeg: 78.2298,
    longitudeDeg: 15.4078,
    minElevationDeg: 5,
    band: 'S / X / Ka-Band',
  },
  {
    id: 'GS-BLR',
    name: 'Bengaluru ISTRAC Telemetry Hub',
    code: 'BLR-IS',
    latitudeDeg: 13.0352,
    longitudeDeg: 77.5132,
    minElevationDeg: 5,
    band: 'S / X-Band',
  },
  {
    id: 'GS-KOU',
    name: 'Kourou Guiana Station',
    code: 'KOUR',
    latitudeDeg: 5.2514,
    longitudeDeg: -52.8047,
    minElevationDeg: 5,
    band: 'S-Band',
  },
  {
    id: 'GS-MAD',
    name: 'Madrid Telemetry Complex',
    code: 'MDSCC',
    latitudeDeg: 40.4314,
    longitudeDeg: -4.248,
    minElevationDeg: 5,
    band: 'X / Ka-Band',
  },
];

export function computeOrbitalPeriodMin(semiMajorAxisKm: number): number {
  const a = Math.max(semiMajorAxisKm, R_EARTH_KM + 120);
  const periodSec = 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / MU_EARTH);
  return periodSec / 60;
}

export function computeVisVivaVelocityKmS(radiusKm: number, semiMajorAxisKm: number): number {
  const r = Math.max(radiusKm, R_EARTH_KM + 100);
  const a = Math.max(semiMajorAxisKm, R_EARTH_KM + 100);
  const vSq = MU_EARTH * (2 / r - 1 / a);
  return Math.sqrt(Math.max(vSq, 0));
}

export function computeJ2RaanPrecessionDegDay(
  semiMajorAxisKm: number,
  eccentricity: number,
  inclinationDeg: number,
): number {
  const n = Math.sqrt(MU_EARTH / Math.pow(semiMajorAxisKm, 3)); // rad/s
  const p = semiMajorAxisKm * (1 - eccentricity * eccentricity);
  const cosI = Math.cos(inclinationDeg * DEG2RAD);
  const omegaDotRadS = -1.5 * n * J2_EARTH * Math.pow(R_EARTH_KM / p, 2) * cosI;
  return omegaDotRadS * RAD2DEG * 86400;
}

/**
 * Solves Kepler's Equation M = E - e * sin(E) via Newton-Raphson iteration.
 */
export function solveEccentricAnomaly(meanAnomalyRad: number, eccentricity: number): number {
  const e = Math.min(Math.max(eccentricity, 0), 0.99);
  let E = meanAnomalyRad;
  for (let iter = 0; iter < 12; iter++) {
    const f = E - e * Math.sin(E) - meanAnomalyRad;
    const fPrime = 1 - e * Math.cos(E);
    const delta = f / fPrime;
    E -= delta;
    if (Math.abs(delta) < 1e-10) break;
  }
  return E;
}

function buildElements(
  altitudePerigeeKm: number,
  altitudeApogeeKm: number,
  inclinationDeg: number,
  raanDeg: number,
  argPerigeeDeg: number,
  trueAnomalyDeg: number,
  propagationModel: OrbitalElements['propagationModel'],
): OrbitalElements {
  const rp = R_EARTH_KM + altitudePerigeeKm;
  const ra = R_EARTH_KM + altitudeApogeeKm;
  const a = (rp + ra) / 2;
  const e = (ra - rp) / (ra + rp);
  return {
    semiMajorAxisKm: Number(a.toFixed(3)),
    eccentricity: Number(e.toFixed(6)),
    inclinationDeg,
    raanDeg,
    argPerigeeDeg,
    trueAnomalyDeg,
    meanAnomalyDeg: trueAnomalyDeg,
    perigeeAltKm: altitudePerigeeKm,
    apogeeAltKm: altitudeApogeeKm,
    orbitalPeriodMin: Number(computeOrbitalPeriodMin(a).toFixed(2)),
    j2RaanPrecessionDegDay: Number(computeJ2RaanPrecessionDegDay(a, e, inclinationDeg).toFixed(4)),
    propagationModel,
  };
}

export const SAT_CATALOG: SpacecraftProfile[] = [
  {
    id: 'NX-001',
    noradId: '99001',
    name: 'NEXORBIT DEMO SAT-01',
    missionId: 'NX-001',
    orbitType: 'Low Earth Orbit (LEO)',
    launchDate: '2026-03-14',
    missionStatus: 'DEMONSTRATION ACTIVE',
    provenance: 'DEMONSTRATION DATA',
    elements: buildElements(548.5, 551.5, 51.6, 42.0, 68.5, 0, 'Two-Body Keplerian + J2'),
    busMassKg: 420,
    solarAreaM2: 6.4,
    hardBodyRadiusM: 3.2,
  },
  {
    id: 'ISS-25544',
    noradId: '25544',
    name: 'ISS (ZARYA)',
    missionId: 'ISS-LEO-01',
    orbitType: 'Low Earth Orbit (LEO)',
    launchDate: '1998-11-20',
    missionStatus: 'ACTIVE MISSION',
    provenance: 'TLE SGP4 PROPAGATED',
    tle: {
      line1: '1 25544U 98067A   26327.50000000  .00016717  00000-0  30142-3 0  9991',
      line2: '2 25544  51.6416 142.3812 0004125  82.4190 277.7210 15.49812340481234',
      epochLabel: '2026-327.50 UTC (SGP4 Sample Epoch)',
    },
    elements: buildElements(417.0, 422.8, 51.64, 142.38, 82.42, 277.72, 'SGP4/SDP4 (TLE)'),
    busMassKg: 420000,
    solarAreaM2: 2500,
    hardBodyRadiusM: 54.0,
  },
  {
    id: 'NX-SSO-02',
    noradId: '99002',
    name: 'NEXORBIT HELIOS-2',
    missionId: 'NX-002',
    orbitType: 'Sun-Synchronous Orbit (SSO)',
    launchDate: '2025-10-08',
    missionStatus: 'NOMINAL OPERATIONS',
    provenance: 'SIMULATED DATA',
    elements: buildElements(676.0, 684.0, 98.12, 210.4, 115.0, 35.0, 'Two-Body Keplerian + J2'),
    busMassKg: 680,
    solarAreaM2: 9.2,
    hardBodyRadiusM: 4.0,
  },
  {
    id: 'NX-GEO-04',
    noradId: '99004',
    name: 'NEXORBIT RELAY-4',
    missionId: 'NX-004',
    orbitType: 'Geostationary Orbit (GEO)',
    launchDate: '2024-06-22',
    missionStatus: 'NOMINAL OPERATIONS',
    provenance: 'SIMULATED DATA',
    elements: buildElements(35782.0, 35790.0, 0.08, 12.5, 45.0, 120.0, 'Two-Body Keplerian + J2'),
    busMassKg: 2150,
    solarAreaM2: 28.0,
    hardBodyRadiusM: 7.5,
  },
];

function wrapLongitude(lonDeg: number): number {
  let lon = ((lonDeg + 180) % 360 + 360) % 360 - 180;
  if (lon === -180) lon = 180;
  return lon;
}

function wrapDegrees360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * Evaluates whether a ground station can see the spacecraft above its minimum elevation mask.
 */
export function evaluateGroundStationVisibility(
  eciPosKm: { x: number; y: number; z: number },
  gmstRad: number,
): { stationName: string | null; elevationDeg: number } {
  const ecfSat = satellite.eciToEcf(eciPosKm, gmstRad);
  let bestStation: string | null = null;
  let maxElDeg = -90;

  for (const gs of GROUND_STATIONS) {
    const observerGd = {
      longitude: gs.longitudeDeg * DEG2RAD,
      latitude: gs.latitudeDeg * DEG2RAD,
      height: 0.1,
    };
    const look = satellite.ecfToLookAngles(observerGd, ecfSat);
    const elDeg = look.elevation * RAD2DEG;
    if (elDeg >= gs.minElevationDeg && elDeg > maxElDeg) {
      maxElDeg = elDeg;
      bestStation = `${gs.code} (${gs.name.split(' ')[0]})`;
    }
  }

  return {
    stationName: bestStation,
    elevationDeg: maxElDeg > -90 ? Number(maxElDeg.toFixed(1)) : 0,
  };
}

/**
 * Computes orbital state vector at a given simulation time & epoch timestamp.
 * Uses SGP4/SDP4 when TLE is present, or analytical Keplerian two-body + J2 precession otherwise.
 */
export function propagateSpacecraftState(
  spacecraft: SpacecraftProfile,
  simElapsedSec: number,
  referenceDate: Date,
): { state: OrbitalStateVector; updatedElements: OrbitalElements } {
  const targetDate = new Date(referenceDate.getTime() + simElapsedSec * 1000);

  if (spacecraft.tle) {
    const satrec = satellite.twoline2satrec(spacecraft.tle.line1, spacecraft.tle.line2);
    const posVel = satellite.propagate(satrec, targetDate);
    if (posVel && posVel.position && posVel.velocity && typeof posVel.position !== 'boolean') {
      const gmst = satellite.gstime(targetDate);
      const geo = satellite.eciToGeodetic(posVel.position, gmst);
      const latDeg = satellite.degreesLat(geo.latitude);
      const lonDeg = satellite.degreesLong(geo.longitude);
      const altKm = geo.height;

      const v = posVel.velocity;
      const speedKmS = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
      const rMagKm = Math.sqrt(
        posVel.position.x * posVel.position.x +
          posVel.position.y * posVel.position.y +
          posVel.position.z * posVel.position.z,
      );

      // Sunlight check via simple cylindrical Earth shadow approximation
      const sunAngle = (simElapsedSec / 86400) * 2 * Math.PI;
      const sunDir = { x: Math.cos(sunAngle), y: Math.sin(sunAngle) * 0.917, z: Math.sin(sunAngle) * 0.397 };
      const dotSun =
        posVel.position.x * sunDir.x + posVel.position.y * sunDir.y + posVel.position.z * sunDir.z;
      const perpSq = rMagKm * rMagKm - dotSun * dotSun;
      const inSunlight = dotSun > 0 || Math.sqrt(Math.max(perpSq, 0)) > R_EARTH_KM;

      const gsVis = evaluateGroundStationVisibility(posVel.position, gmst);
      const orbitDirection = v.z >= 0 ? 'ASCENDING' : 'DESCENDING';

      const meanMotionRevDay = (satrec.no * 1440) / (2 * Math.PI);
      const periodMin = 1440 / Math.max(meanMotionRevDay, 0.1);
      const aKm = Math.pow(MU_EARTH * Math.pow((periodMin * 60) / (2 * Math.PI), 2), 1 / 3);

      return {
        state: {
          timestampIso: targetDate.toISOString(),
          simElapsedSec,
          latitudeDeg: Number(latDeg.toFixed(4)),
          longitudeDeg: Number(lonDeg.toFixed(4)),
          altitudeKm: Number(altKm.toFixed(2)),
          velocityKmS: Number(speedKmS.toFixed(4)),
          orbitDirection,
          eciPositionKm: {
            x: Number(posVel.position.x.toFixed(2)),
            y: Number(posVel.position.y.toFixed(2)),
            z: Number(posVel.position.z.toFixed(2)),
          },
          eciVelocityKmS: {
            x: Number(v.x.toFixed(4)),
            y: Number(v.y.toFixed(4)),
            z: Number(v.z.toFixed(4)),
          },
          inSunlight,
          activeGroundStation: gsVis.stationName,
          groundStationElevationDeg: gsVis.elevationDeg,
        },
        updatedElements: {
          ...spacecraft.elements,
          semiMajorAxisKm: Number(aKm.toFixed(3)),
          orbitalPeriodMin: Number(periodMin.toFixed(2)),
          trueAnomalyDeg: Number(wrapDegrees360((simElapsedSec / (periodMin * 60)) * 360).toFixed(2)),
        },
      };
    }
  }

  // Two-Body Keplerian + J2 Precession Propagation
  const el = spacecraft.elements;
  const a = el.semiMajorAxisKm;
  const e = el.eccentricity;
  const incRad = el.inclinationDeg * DEG2RAD;
  const n = Math.sqrt(MU_EARTH / Math.pow(a, 3)); // mean motion rad/s

  // Secular J2 RAAN precession
  const raanDeg = wrapDegrees360(
    el.raanDeg + (el.j2RaanPrecessionDegDay / 86400) * simElapsedSec,
  );
  const raanRad = raanDeg * DEG2RAD;
  const argPerigeeRad = el.argPerigeeDeg * DEG2RAD;

  const M0 = el.meanAnomalyDeg * DEG2RAD;
  const M = (M0 + n * simElapsedSec) % (2 * Math.PI);
  const E = solveEccentricAnomaly(M, e);

  // True anomaly nu
  const sinNu = (Math.sqrt(1 - e * e) * Math.sin(E)) / (1 - e * Math.cos(E));
  const cosNu = (Math.cos(E) - e) / (1 - e * Math.cos(E));
  const nuRad = Math.atan2(sinNu, cosNu);
  const trueAnomalyDeg = wrapDegrees360(nuRad * RAD2DEG);

  // Orbital radius r
  const rKm = a * (1 - e * Math.cos(E));
  const altitudeKm = rKm - R_EARTH_KM;
  const velocityKmS = computeVisVivaVelocityKmS(rKm, a);

  // Position in perifocal frame (PQW)
  const xP = rKm * Math.cos(nuRad);
  const yP = rKm * Math.sin(nuRad);

  // Velocity in perifocal frame
  const p = a * (1 - e * e);
  const fac = Math.sqrt(MU_EARTH / p);
  const vxP = -fac * Math.sin(nuRad);
  const vyP = fac * (e + Math.cos(nuRad));

  // Rotate PQW -> ECI
  const cosO = Math.cos(raanRad);
  const sinO = Math.sin(raanRad);
  const cosW = Math.cos(argPerigeeRad);
  const sinW = Math.sin(argPerigeeRad);
  const cosI = Math.cos(incRad);
  const sinI = Math.sin(incRad);

  const px = cosO * cosW - sinO * sinW * cosI;
  const py = sinO * cosW + cosO * sinW * cosI;
  const pz = sinW * sinI;

  const qx = -cosO * sinW - sinO * cosW * cosI;
  const qy = -sinO * sinW + cosO * cosW * cosI;
  const qz = cosW * sinI;

  const eciPosKm = {
    x: px * xP + qx * yP,
    y: py * xP + qy * yP,
    z: pz * xP + qz * yP,
  };
  const eciVelKmS = {
    x: px * vxP + qx * vyP,
    y: py * vxP + qy * vyP,
    z: pz * vxP + qz * vyP,
  };

  // ECI -> Geodetic Lat/Lon using GMST
  const gmst = satellite.gstime(targetDate);
  const geo = satellite.eciToGeodetic(eciPosKm, gmst);
  const latDeg = satellite.degreesLat(geo.latitude);
  const lonDeg = wrapLongitude(satellite.degreesLong(geo.longitude));

  // Cylindrical shadow check against a fixed sun vector slowly rotating with year
  const sunAngle = (targetDate.getTime() / 86400000) * ((2 * Math.PI) / 365.25);
  const sunDir = {
    x: Math.cos(sunAngle),
    y: Math.sin(sunAngle) * 0.917,
    z: Math.sin(sunAngle) * 0.397,
  };
  const dotSun = eciPosKm.x * sunDir.x + eciPosKm.y * sunDir.y + eciPosKm.z * sunDir.z;
  const perpSq = rKm * rKm - dotSun * dotSun;
  const inSunlight = dotSun > 0 || Math.sqrt(Math.max(perpSq, 0)) > R_EARTH_KM;

  const gsVis = evaluateGroundStationVisibility(eciPosKm, gmst);

  return {
    state: {
      timestampIso: targetDate.toISOString(),
      simElapsedSec,
      latitudeDeg: Number(latDeg.toFixed(4)),
      longitudeDeg: Number(lonDeg.toFixed(4)),
      altitudeKm: Number(altitudeKm.toFixed(2)),
      velocityKmS: Number(velocityKmS.toFixed(4)),
      orbitDirection: eciVelKmS.z >= 0 ? 'ASCENDING' : 'DESCENDING',
      eciPositionKm: {
        x: Number(eciPosKm.x.toFixed(2)),
        y: Number(eciPosKm.y.toFixed(2)),
        z: Number(eciPosKm.z.toFixed(2)),
      },
      eciVelocityKmS: {
        x: Number(eciVelKmS.x.toFixed(4)),
        y: Number(eciVelKmS.y.toFixed(4)),
        z: Number(eciVelKmS.z.toFixed(4)),
      },
      inSunlight,
      activeGroundStation: gsVis.stationName,
      groundStationElevationDeg: gsVis.elevationDeg,
    },
    updatedElements: {
      ...el,
      raanDeg: Number(raanDeg.toFixed(2)),
      trueAnomalyDeg: Number(trueAnomalyDeg.toFixed(2)),
      meanAnomalyDeg: Number(wrapDegrees360(M * RAD2DEG).toFixed(2)),
    },
  };
}

/**
 * Generates an orbital trajectory sample path (1 full period) for 3D rendering & 2D ground track.
 */
export function generateOrbitalTrack(
  spacecraft: SpacecraftProfile,
  simElapsedSec: number,
  referenceDate: Date,
  samples = 96,
): Array<{ lat: number; lon: number; altKm: number; x: number; y: number; z: number }> {
  const periodSec = spacecraft.elements.orbitalPeriodMin * 60;
  const points: Array<{ lat: number; lon: number; altKm: number; x: number; y: number; z: number }> = [];

  for (let i = 0; i <= samples; i++) {
    const dt = (i / samples) * periodSec;
    const { state } = propagateSpacecraftState(spacecraft, simElapsedSec + dt, referenceDate);
    // Normalize ECI into 3D scene coordinates (Earth radius = 1.0 in Three.js Y-up space)
    // ECI X -> Three X, ECI Z (north pole) -> Three Y, -ECI Y -> Three Z
    const scale = 1 / R_EARTH_KM;
    points.push({
      lat: state.latitudeDeg,
      lon: state.longitudeDeg,
      altKm: state.altitudeKm,
      x: Number((state.eciPositionKm.x * scale).toFixed(4)),
      y: Number((state.eciPositionKm.z * scale).toFixed(4)),
      z: Number((-state.eciPositionKm.y * scale).toFixed(4)),
    });
  }
  return points;
}

/**
 * Computes future orbital positions at specified minute offsets.
 */
export function predictFuturePositions(
  spacecraft: SpacecraftProfile,
  simElapsedSec: number,
  referenceDate: Date,
  offsetsMin: number[] = [5, 15, 30, 45, 60, 90, 120, 180],
): PredictedPosition[] {
  return offsetsMin.map((offsetMin) => {
    const { state } = propagateSpacecraftState(
      spacecraft,
      simElapsedSec + offsetMin * 60,
      referenceDate,
    );
    return {
      offsetMinutes: offsetMin,
      timestampIso: state.timestampIso,
      latitudeDeg: state.latitudeDeg,
      longitudeDeg: state.longitudeDeg,
      altitudeKm: state.altitudeKm,
      velocityKmS: state.velocityKmS,
      inSunlight: state.inSunlight,
    };
  });
}
