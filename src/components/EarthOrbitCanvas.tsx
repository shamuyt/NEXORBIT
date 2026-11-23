import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { R_EARTH_KM } from '../engine/constants';
import type { ConjunctionEvent, GroundStation, OrbitalStateVector } from '../engine/types';

export type CameraPreset = 'earth' | 'follow' | 'nadir';

interface EarthOrbitCanvasProps {
  orbitalState: OrbitalStateVector;
  orbitalTrack: Array<{ lat: number; lon: number; altKm: number; x: number; y: number; z: number }>;
  groundStations: GroundStation[];
  conjunctions?: ConjunctionEvent[];
  showGroundTrack?: boolean;
  showGroundStations?: boolean;
  showConjunctions?: boolean;
  cameraPreset?: CameraPreset;
  heightClass?: string;
  spacecraftName?: string;
}

const CONTINENT_POLYGONS: Array<Array<[number, number]>> = [
  [
    [-168, 65], [-160, 71], [-135, 69], [-115, 72], [-95, 74], [-78, 70],
    [-60, 62], [-54, 52], [-66, 44], [-75, 36], [-81, 25], [-89, 21],
    [-84, 10], [-78, 8], [-85, 11], [-94, 16], [-105, 20], [-112, 28],
    [-117, 32], [-124, 41], [-125, 49], [-137, 58], [-152, 60], [-166, 60],
  ],
  [[-55, 60], [-42, 60], [-20, 70], [-18, 81], [-45, 83], [-68, 77], [-58, 68]],
  [
    [-78, 9], [-71, 12], [-61, 10], [-50, 2], [-35, -6], [-38, -15],
    [-42, -23], [-52, -33], [-64, -42], [-68, -54], [-74, -52], [-73, -38],
    [-71, -18], [-81, -5], [-79, 2],
  ],
  [
    [-9, 37], [-9, 43], [-2, 44], [-4, 48], [2, 51], [8, 54], [10, 58],
    [5, 61], [16, 69], [28, 71], [42, 67], [58, 68], [55, 52], [44, 44],
    [30, 46], [28, 41], [22, 37], [15, 38], [12, 43], [3, 43], [-5, 36],
  ],
  [
    [-17, 15], [-14, 28], [-6, 36], [10, 37], [22, 32], [33, 31], [43, 12],
    [51, 12], [46, 2], [40, -10], [35, -24], [28, -33], [18, -34], [14, -22],
    [12, -6], [9, 4], [-2, 5], [-12, 8],
  ],
  [
    [28, 41], [42, 42], [54, 40], [50, 52], [60, 68], [85, 73], [115, 74],
    [145, 70], [175, 66], [162, 58], [142, 54], [132, 42], [122, 38],
    [120, 24], [108, 20], [105, 10], [98, 12], [90, 22], [80, 10],
    [72, 20], [62, 25], [52, 25], [44, 13], [35, 30], [34, 36],
  ],
  [[114, -22], [129, -14], [136, -12], [142, -11], [153, -26], [150, -37], [138, -35], [128, -32], [115, -34], [113, -26]],
  [[-180, -72], [-120, -73], [-60, -64], [0, -70], [60, -68], [120, -67], [180, -72], [180, -90], [-180, -90]],
];

function latLonToSceneVec3(latDeg: number, lonDeg: number, radius: number, out: THREE.Vector3): THREE.Vector3 {
  const lat = THREE.MathUtils.degToRad(latDeg);
  const lon = THREE.MathUtils.degToRad(lonDeg);
  out.set(
    radius * Math.cos(lat) * Math.cos(lon),
    radius * Math.sin(lat),
    -radius * Math.cos(lat) * Math.sin(lon),
  );
  return out;
}

function createEarthTextures(maxAniso: number): {
  albedoMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const width = 1024;
  const height = 512;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0, '#0c233c');
  oceanGrad.addColorStop(0.5, '#091a30');
  oceanGrad.addColorStop(1, '#0c233c');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
  ctx.lineWidth = 1;
  for (let lon = -180; lon <= 180; lon += 30) {
    const x = ((lon + 180) / 360) * width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = ((90 - lat) / 180) * height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bCtx = bumpCanvas.getContext('2d')!;
  bCtx.fillStyle = '#181818';
  bCtx.fillRect(0, 0, width, height);

  CONTINENT_POLYGONS.forEach((poly, idx) => {
    const isAntarctica = idx === CONTINENT_POLYGONS.length - 1;
    ctx.beginPath();
    bCtx.beginPath();
    poly.forEach(([lon, lat], pIdx) => {
      const x = ((lon + 180) / 360) * width;
      const y = ((90 - lat) / 180) * height;
      if (pIdx === 0) {
        ctx.moveTo(x, y);
        bCtx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
        bCtx.lineTo(x, y);
      }
    });
    ctx.closePath();
    bCtx.closePath();

    ctx.fillStyle = isAntarctica ? '#3b4d63' : '#1b354b';
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.25;
    ctx.stroke();

    bCtx.fillStyle = '#9a9a9a';
    bCtx.fill();
  });

  ctx.fillStyle = 'rgba(251, 191, 36, 0.55)';
  const hubs = [
    [-74, 40.7], [-118, 34], [-0.1, 51.5], [2.3, 48.8], [77.6, 13],
    [139.7, 35.7], [116.4, 39.9], [151.2, -33.8], [-46.6, -23.5], [31.2, 30],
  ];
  hubs.forEach(([lon, lat]) => {
    const x = ((lon + 180) / 360) * width;
    const y = ((90 - lat) / 180) * height;
    ctx.beginPath();
    ctx.arc(x, y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  });

  const albedoMap = new THREE.CanvasTexture(canvas);
  albedoMap.colorSpace = THREE.SRGBColorSpace;
  albedoMap.anisotropy = maxAniso;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.anisotropy = maxAniso;

  return { albedoMap, bumpMap };
}

function createSolarCellTexture(maxAniso: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0c2448';
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  for (let x = 0; x <= 256; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 128);
    ctx.stroke();
  }
  for (let y = 0; y <= 128; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function buildProceduralSpacecraft(solarTex: THREE.CanvasTexture): THREE.Group {
  const craft = new THREE.Group();

  const busMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.85, roughness: 0.25 });
  const mliGoldMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.92, roughness: 0.22 });
  const darkTrimMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.45, roughness: 0.72 });
  const solarMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: solarTex, metalness: 0.35, roughness: 0.18 });
  const dishMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.4, roughness: 0.35, side: THREE.DoubleSide });
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

  const busMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.046, 8), busMat);
  craft.add(busMesh);

  const mliMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.0275, 0.0275, 0.022, 8), mliGoldMat);
  craft.add(mliMesh);

  const boomGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.18, 8);
  boomGeo.rotateZ(Math.PI / 2);
  craft.add(new THREE.Mesh(boomGeo, darkTrimMat));

  const wingGeo = new THREE.BoxGeometry(0.068, 0.0025, 0.032);
  const leftWing = new THREE.Mesh(wingGeo, solarMat);
  leftWing.position.set(-0.065, 0, 0);
  craft.add(leftWing);

  const rightWing = new THREE.Mesh(wingGeo, solarMat);
  rightWing.position.set(0.065, 0, 0);
  craft.add(rightWing);

  const dishPts = [
    new THREE.Vector2(0.001, 0),
    new THREE.Vector2(0.012, 0.003),
    new THREE.Vector2(0.021, 0.011),
  ];
  const dishMesh = new THREE.Mesh(new THREE.LatheGeometry(dishPts, 18), dishMat);
  dishMesh.position.set(0, 0.027, 0);
  craft.add(dishMesh);

  const hornMesh = new THREE.Mesh(new THREE.ConeGeometry(0.0035, 0.014, 10), darkTrimMat);
  hornMesh.position.set(0, 0.038, 0);
  hornMesh.rotation.x = Math.PI;
  craft.add(hornMesh);

  const turretMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.014, 0.014, 12), darkTrimMat);
  turretMesh.position.set(0, -0.029, 0);
  craft.add(turretMesh);

  const beaconMesh = new THREE.Mesh(new THREE.SphereGeometry(0.009, 12, 12), beaconMat);
  beaconMesh.position.set(0, 0.048, 0);
  craft.add(beaconMesh);

  return craft;
}

const _vecSat = new THREE.Vector3();
const _vecDebris = new THREE.Vector3();
const _vecGs = new THREE.Vector3();
const _vecLookTarget = new THREE.Vector3();
const _vecDesiredCam = new THREE.Vector3();
const _vecOrigin = new THREE.Vector3(0, 0, 0);

export function EarthOrbitCanvas({
  orbitalState,
  orbitalTrack,
  groundStations,
  conjunctions = [],
  showGroundTrack = true,
  showGroundStations = true,
  showConjunctions = true,
  cameraPreset = 'earth',
  heightClass = 'h-[420px]',
  spacecraftName = 'Spacecraft',
}: EarthOrbitCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const requestRenderRef = useRef<(() => void) | null>(null);

  const latestPropsRef = useRef({
    orbitalState,
    orbitalTrack,
    groundStations,
    conjunctions,
    showGroundTrack,
    showGroundStations,
    showConjunctions,
    cameraPreset,
  });
  latestPropsRef.current = {
    orbitalState,
    orbitalTrack,
    groundStations,
    conjunctions,
    showGroundTrack,
    showGroundStations,
    showConjunctions,
    cameraPreset,
  };

  const presetTransitionRef = useRef<{ active: boolean; preset: CameraPreset }>({
    active: false,
    preset: cameraPreset,
  });

  useEffect(() => {
    presetTransitionRef.current = { active: true, preset: cameraPreset };
    requestRenderRef.current?.();
  }, [cameraPreset]);

  useEffect(() => {
    requestRenderRef.current?.();
  }, [orbitalState, orbitalTrack, conjunctions, showGroundTrack, showGroundStations, showConjunctions]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || 720;
    const height = container.clientHeight || 420;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050811);
    scene.fog = new THREE.FogExp2(0x050811, 0.045);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.05, 80);
    camera.position.set(2.35, 1.35, 2.55);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const sunKey = new THREE.DirectionalLight(0xfff4e0, 2.4);
    sunKey.position.set(6, 2.5, 5);
    scene.add(sunKey);

    const hemiFill = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.65);
    scene.add(hemiFill);

    const rimLight = new THREE.DirectionalLight(0x06b6d4, 0.85);
    rimLight.position.set(-5, -2, -5);
    scene.add(rimLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 1.35;
    controls.maxDistance = 11.5;
    controls.enablePan = true;

    const starCount = 900;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 22 + ((i * 73) % 18);
      const theta = ((i * 137.5) % 360) * (Math.PI / 180);
      const phi = Math.acos(2 * (((i * 29) % 100) / 100) - 1);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xcbd5e1, size: 0.075, sizeAttenuation: true });
    scene.add(new THREE.Points(starGeo, starMat));

    const earthGroup = new THREE.Group();
    scene.add(earthGroup);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const { albedoMap, bumpMap } = createEarthTextures(maxAniso);

    const earthGeo = new THREE.SphereGeometry(1, 48, 36);
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: albedoMap,
      bumpMap,
      bumpScale: 0.012,
      roughness: 0.68,
      metalness: 0.08,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthMesh.rotation.y = Math.PI;
    earthGroup.add(earthMesh);

    const atmoGeo = new THREE.SphereGeometry(1.028, 36, 24);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.09,
      side: THREE.BackSide,
      depthWrite: false,
    });
    earthGroup.add(new THREE.Mesh(atmoGeo, atmoMat));

    const gsGeo = new THREE.SphereGeometry(0.018, 10, 10);
    const gsMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const gsInstanced = new THREE.InstancedMesh(gsGeo, gsMat, Math.max(1, groundStations.length));
    const dummy = new THREE.Object3D();
    groundStations.forEach((gs, i) => {
      latLonToSceneVec3(gs.latitudeDeg, gs.longitudeDeg, 1.012, dummy.position);
      dummy.updateMatrix();
      gsInstanced.setMatrixAt(i, dummy.matrix);
    });
    gsInstanced.instanceMatrix.needsUpdate = true;
    gsInstanced.computeBoundingSphere();
    earthGroup.add(gsInstanced);

    const solarTex = createSolarCellTexture(maxAniso);
    const spacecraftGroup = buildProceduralSpacecraft(solarTex);
    scene.add(spacecraftGroup);

    const orbitLineGeo = new THREE.BufferGeometry();
    const orbitLineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8 });
    scene.add(new THREE.Line(orbitLineGeo, orbitLineMat));

    const groundTrackGeo = new THREE.BufferGeometry();
    const groundTrackMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.72 });
    const groundTrackLine = new THREE.Line(groundTrackGeo, groundTrackMat);
    earthGroup.add(groundTrackLine);

    const linkGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const linkMat = new THREE.LineBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.75 });
    const linkBeam = new THREE.Line(linkGeo, linkMat);
    linkBeam.visible = false;
    scene.add(linkBeam);

    const debrisGeo = new THREE.OctahedronGeometry(0.024, 0);
    const debrisMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const debrisMesh = new THREE.Mesh(debrisGeo, debrisMat);
    debrisMesh.visible = false;
    scene.add(debrisMesh);

    const conjVecGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const conjVecMat = new THREE.LineBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.85 });
    const conjVecLine = new THREE.Line(conjVecGeo, conjVecMat);
    conjVecLine.visible = false;
    scene.add(conjVecLine);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let frameId = 0;
    let disposed = false;
    let renderBusy = false;
    let renderDirty = false;
    let lastRenderMs = performance.now();
    let lastTrackHash = '';

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      if (!sync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const startWait = performance.now();
      const poll = () => {
        if (disposed) {
          gl.deleteSync(sync);
          return;
        }
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED && performance.now() - startWait < 250) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function updateSceneFromState(dt: number): boolean {
      const {
        orbitalState: st,
        orbitalTrack: track,
        groundStations: stations,
        conjunctions: conjs,
        showGroundTrack: showGT,
        showGroundStations: showGS,
        showConjunctions: showConj,
      } = latestPropsRef.current;

      const altScale =
        st.altitudeKm > 5000
          ? 1 + Math.min(2.2, Math.log10(1 + st.altitudeKm / R_EARTH_KM) * 2.1)
          : 1 + Math.max(0.08, (st.altitudeKm / R_EARTH_KM) * 1.6);

      earthGroup.rotation.y = (st.simElapsedSec / 86400) * Math.PI * 2;

      latLonToSceneVec3(st.latitudeDeg, st.longitudeDeg, altScale, _vecSat);
      _vecSat.applyAxisAngle(THREE.Object3D.DEFAULT_UP, earthGroup.rotation.y);
      spacecraftGroup.position.copy(_vecSat);
      spacecraftGroup.lookAt(_vecOrigin);
      spacecraftGroup.rotateX(Math.PI / 2);

      const trackHash = track.length > 0 ? `${track.length}-${track[0].lat}-${track[0].lon}` : '';
      if (track.length > 2 && trackHash !== lastTrackHash) {
        lastTrackHash = trackHash;
        const orbitPts: THREE.Vector3[] = [];
        const gtPts: THREE.Vector3[] = [];
        track.forEach((pt) => {
          const rVisual =
            pt.altKm > 5000
              ? 1 + Math.min(2.2, Math.log10(1 + pt.altKm / R_EARTH_KM) * 2.1)
              : 1 + Math.max(0.08, (pt.altKm / R_EARTH_KM) * 1.6);
          const p3 = new THREE.Vector3();
          latLonToSceneVec3(pt.lat, pt.lon, rVisual, p3);
          p3.applyAxisAngle(THREE.Object3D.DEFAULT_UP, earthGroup.rotation.y);
          orbitPts.push(p3);

          const g3 = new THREE.Vector3();
          latLonToSceneVec3(pt.lat, pt.lon, 1.008, g3);
          gtPts.push(g3);
        });
        orbitLineGeo.setFromPoints(orbitPts);
        groundTrackGeo.setFromPoints(gtPts);
      }

      groundTrackLine.visible = showGT;
      gsInstanced.visible = showGS;

      if (st.activeGroundStation && showGS) {
        const matchedGs = stations.find((g) => st.activeGroundStation?.startsWith(g.code));
        if (matchedGs) {
          latLonToSceneVec3(matchedGs.latitudeDeg, matchedGs.longitudeDeg, 1.012, _vecGs);
          _vecGs.applyAxisAngle(THREE.Object3D.DEFAULT_UP, earthGroup.rotation.y);
          const posAttr = linkGeo.getAttribute('position') as THREE.BufferAttribute;
          posAttr.setXYZ(0, _vecSat.x, _vecSat.y, _vecSat.z);
          posAttr.setXYZ(1, _vecGs.x, _vecGs.y, _vecGs.z);
          posAttr.needsUpdate = true;
          linkBeam.visible = true;
        } else {
          linkBeam.visible = false;
        }
      } else {
        linkBeam.visible = false;
      }

      const topRisk = conjs[0];
      if (
        showConj &&
        topRisk &&
        (topRisk.riskLevel === 'RED' || topRisk.riskLevel === 'ORANGE' || topRisk.riskLevel === 'YELLOW')
      ) {
        const offsetAng = (topRisk.tcaMinutes * 0.015) % 0.6;
        latLonToSceneVec3(
          st.latitudeDeg + Math.sin(offsetAng) * 8,
          st.longitudeDeg + Math.cos(offsetAng) * 11,
          altScale + 0.04,
          _vecDebris,
        );
        _vecDebris.applyAxisAngle(THREE.Object3D.DEFAULT_UP, earthGroup.rotation.y);
        debrisMesh.position.copy(_vecDebris);
        debrisMesh.visible = true;

        const cAttr = conjVecGeo.getAttribute('position') as THREE.BufferAttribute;
        cAttr.setXYZ(0, _vecSat.x, _vecSat.y, _vecSat.z);
        cAttr.setXYZ(1, _vecDebris.x, _vecDebris.y, _vecDebris.z);
        cAttr.needsUpdate = true;
        conjVecLine.visible = true;
      } else {
        debrisMesh.visible = false;
        conjVecLine.visible = false;
      }

      let keepAnimating = false;
      if (presetTransitionRef.current.active) {
        const p = presetTransitionRef.current.preset;
        if (p === 'earth') {
          _vecLookTarget.set(0, 0, 0);
          _vecDesiredCam.set(2.35, 1.35, 2.55);
        } else if (p === 'follow') {
          _vecLookTarget.copy(_vecSat);
          _vecDesiredCam.copy(_vecSat).normalize().multiplyScalar(altScale + 0.65);
          _vecDesiredCam.y += 0.25;
        } else {
          _vecLookTarget.set(0, 0, 0);
          _vecDesiredCam.copy(_vecSat).normalize().multiplyScalar(altScale + 1.35);
        }

        const alpha = isSoftwareGl ? 1 : 1 - Math.exp(-5 * dt);
        controls.target.lerp(_vecLookTarget, alpha);
        camera.position.lerp(_vecDesiredCam, alpha);
        if (camera.position.distanceTo(_vecDesiredCam) < 0.03) {
          presetTransitionRef.current.active = false;
        } else {
          keepAnimating = true;
        }
      }

      return keepAnimating;
    }

    function requestRender() {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        if (disposed) return;
        renderDirty = false;
        const now = performance.now();
        const dt = Math.min(0.1, (now - lastRenderMs) / 1000);
        lastRenderMs = now;

        const keepAnimating = updateSceneFromState(dt);
        controls.update();
        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (!disposed && (renderDirty || keepAnimating)) {
            requestRender();
          }
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    requestRenderRef.current = requestRender;

    controls.addEventListener('start', () => {
      presetTransitionRef.current.active = false;
    });
    controls.addEventListener('change', requestRender);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 720;
      const h = container.clientHeight || 420;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    requestRender();

    return () => {
      disposed = true;
      requestRenderRef.current = null;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      controls.dispose();
      earthGeo.dispose();
      earthMat.dispose();
      albedoMap.dispose();
      bumpMap.dispose();
      solarTex.dispose();
      atmoGeo.dispose();
      atmoMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      orbitLineGeo.dispose();
      orbitLineMat.dispose();
      groundTrackGeo.dispose();
      groundTrackMat.dispose();
      linkGeo.dispose();
      linkMat.dispose();
      debrisGeo.dispose();
      debrisMat.dispose();
      conjVecGeo.dispose();
      conjVecMat.dispose();
      gsGeo.dispose();
      gsMat.dispose();
      renderer.dispose();
    };
  }, [groundStations]);

  return (
    <div
      className={`relative w-full ${heightClass} rounded-lg border border-slate-800 bg-[#050811] overflow-hidden`}
      data-testid="earth-orbit-canvas-container"
    >
      <div
        ref={mountRef}
        className="w-full h-full"
        aria-label={`Interactive 3D orbital visualization for ${spacecraftName}`}
      />
      <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap items-center gap-2 text-[11px] font-mono">
        <span className="px-2 py-0.5 rounded bg-[#0A101D]/90 border border-slate-700/80 text-cyan-300">
          3D ORBITAL VIEWPORT
        </span>
        <span className="px-2 py-0.5 rounded bg-[#0A101D]/90 border border-slate-700/80 text-slate-300 tabular-nums">
          LAT {orbitalState.latitudeDeg.toFixed(2)}° · LON {orbitalState.longitudeDeg.toFixed(2)}°
        </span>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 text-[11px] text-slate-400 bg-[#0A101D]/85 px-2.5 py-1 rounded border border-slate-800">
        Drag to rotate · Scroll to zoom · Right-drag to pan
      </div>
    </div>
  );
}
