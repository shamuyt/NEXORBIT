import type { GroundStation, OrbitalStateVector } from '../engine/types';

interface GroundTrackMapProps {
  orbitalState: OrbitalStateVector;
  orbitalTrack: Array<{ lat: number; lon: number }>;
  groundStations: GroundStation[];
}

const LAND_OUTLINES: Array<Array<[number, number]>> = [
  [[-168, 65], [-160, 71], [-135, 69], [-115, 72], [-78, 70], [-54, 52], [-66, 44], [-81, 25], [-94, 16], [-117, 32], [-137, 58], [-166, 60]],
  [[-78, 9], [-61, 10], [-35, -6], [-42, -23], [-68, -54], [-73, -38], [-81, -5]],
  [[-9, 37], [-4, 48], [10, 58], [28, 71], [58, 68], [55, 52], [28, 41], [12, 43], [-5, 36]],
  [[-17, 15], [-6, 36], [33, 31], [51, 12], [40, -10], [28, -33], [18, -34], [9, 4], [-12, 8]],
  [[28, 41], [60, 68], [115, 74], [175, 66], [142, 54], [120, 24], [105, 10], [80, 10], [62, 25], [44, 13], [35, 30]],
  [[114, -22], [136, -12], [153, -26], [150, -37], [128, -32], [115, -34]],
];

function toSvgCoords(lat: number, lon: number): [number, number] {
  const x = ((lon + 180) / 360) * 720;
  const y = ((90 - lat) / 180) * 320;
  return [x, y];
}

export function GroundTrackMap({
  orbitalState,
  orbitalTrack,
  groundStations,
}: GroundTrackMapProps) {
  // Split orbital track segments across antimeridian (+/- 180 lon wrap)
  const segments: Array<string> = [];
  let currentPath: string[] = [];
  for (let i = 0; i < orbitalTrack.length; i++) {
    const pt = orbitalTrack[i];
    const [x, y] = toSvgCoords(pt.lat, pt.lon);
    if (i > 0 && Math.abs(pt.lon - orbitalTrack[i - 1].lon) > 180) {
      if (currentPath.length > 1) segments.push(currentPath.join(' '));
      currentPath = [`M ${x.toFixed(1)} ${y.toFixed(1)}`];
    } else {
      currentPath.push(`${currentPath.length === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
  }
  if (currentPath.length > 1) segments.push(currentPath.join(' '));

  const [satX, satY] = toSvgCoords(orbitalState.latitudeDeg, orbitalState.longitudeDeg);

  return (
    <div className="rounded-lg border border-slate-800 bg-[#0A101D] p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-300">
          Equirectangular Surface Ground Track
        </span>
        <span className="font-mono text-[11px] text-slate-400">
          WGS-84 Subsatellite Projection
        </span>
      </div>
      <svg
        viewBox="0 0 720 320"
        className="w-full h-auto rounded border border-slate-800/80 bg-[#070B14]"
        role="img"
        aria-label="2D Ground Track and Ground Station Visibility Map"
      >
        {/* Grid lines */}
        {[-120, -60, 0, 60, 120].map((lon) => {
          const [x] = toSvgCoords(0, lon);
          return <line key={lon} x1={x} y1={0} x2={x} y2={320} stroke="#1E293B" strokeWidth="0.7" />;
        })}
        {[-60, -30, 0, 30, 60].map((lat) => {
          const [, y] = toSvgCoords(lat, 0);
          return (
            <line
              key={lat}
              x1={0}
              y1={y}
              x2={720}
              y2={y}
              stroke={lat === 0 ? '#334155' : '#1E293B'}
              strokeWidth={lat === 0 ? '1' : '0.7'}
            />
          );
        })}

        {/* Continents */}
        {LAND_OUTLINES.map((poly, idx) => {
          const d =
            poly
              .map(([lon, lat], pIdx) => {
                const [x, y] = toSvgCoords(lat, lon);
                return `${pIdx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
              })
              .join(' ') + ' Z';
          return (
            <path
              key={idx}
              d={d}
              fill="#132238"
              stroke="#294466"
              strokeWidth="1"
            />
          );
        })}

        {/* Orbital Ground Track */}
        {segments.map((d, idx) => (
          <path
            key={idx}
            d={d}
            fill="none"
            stroke="#F59E0B"
            strokeWidth="1.8"
            strokeDasharray="4 3"
          />
        ))}

        {/* Ground Stations */}
        {groundStations.map((gs) => {
          const [gx, gy] = toSvgCoords(gs.latitudeDeg, gs.longitudeDeg);
          const isLinked = orbitalState.activeGroundStation?.startsWith(gs.code);
          return (
            <g key={gs.id}>
              <circle
                cx={gx}
                cy={gy}
                r={isLinked ? 26 : 16}
                fill={isLinked ? 'rgba(16, 185, 129, 0.14)' : 'rgba(56, 189, 248, 0.06)'}
                stroke={isLinked ? '#10B981' : '#334155'}
                strokeWidth="0.8"
              />
              <circle cx={gx} cy={gy} r="3" fill={isLinked ? '#10B981' : '#64748B'} />
              <text
                x={gx + 5}
                y={gy + 3}
                fontSize="9"
                fill={isLinked ? '#34D399' : '#94A3B8'}
                fontFamily="JetBrains Mono, monospace"
              >
                {gs.code}
              </text>
            </g>
          );
        })}

        {/* Spacecraft Marker */}
        <circle cx={satX} cy={satY} r="9" fill="rgba(6, 182, 212, 0.2)" stroke="#38BDF8" strokeWidth="1.2" />
        <circle cx={satX} cy={satY} r="3.8" fill="#38BDF8" />
      </svg>
    </div>
  );
}
