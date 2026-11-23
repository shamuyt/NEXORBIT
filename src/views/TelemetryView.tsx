import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SubsystemBadge } from '../components/StatusText';
import type { MissionControlSnapshot, SubsystemStatus } from '../engine/types';
import { formatTemp, formatUtcShort } from '../utils/formatters';

interface TelemetryViewProps {
  snapshot: MissionControlSnapshot;
}

interface ChannelSpec {
  id: string;
  label: string;
  value: number;
  unit: string;
  normalMin: number;
  normalMax: number;
  warnFloor?: number;
  warnCeiling?: number;
  minObserved: number;
  maxObserved: number;
  status: SubsystemStatus;
}

export function TelemetryView({ snapshot }: TelemetryViewProps) {
  const { latestTelemetry: tel, telemetryHistory, settings } = snapshot;
  const hist = telemetryHistory.length > 0 ? telemetryHistory : [tel];
  const th = settings.thresholds;

  const minMax = (getter: (f: typeof tel) => number): [number, number] => {
    let min = Infinity;
    let max = -Infinity;
    for (const f of hist) {
      const v = getter(f);
      if (v < min) min = v;
      if (v > max) max = v;
    }
    return [Number(min.toFixed(3)), Number(max.toFixed(3))];
  };

  const tempDisplay = formatTemp(tel.internalTempC, settings.units, 1);
  const [tempMinObs, tempMaxObs] = minMax((f) =>
    settings.units === 'IMPERIAL' ? (f.internalTempC * 9) / 5 + 32 : f.internalTempC,
  );
  const [voltMinObs, voltMaxObs] = minMax((f) => f.batteryVoltageV);
  const [currMinObs, currMaxObs] = minMax((f) => f.batteryCurrentA);
  const [socMinObs, socMaxObs] = minMax((f) => f.batterySocPct);
  const [solarMinObs, solarMaxObs] = minMax((f) => f.solarPowerW);
  const [sigMinObs, sigMaxObs] = minMax((f) => f.signalStrengthDbm);
  const [angMinObs, angMaxObs] = minMax((f) => f.angularVelocityDegS);
  const [accMinObs, accMaxObs] = minMax((f) =>
    Math.sqrt(f.accelXMS2 ** 2 + f.accelYMS2 ** 2 + f.accelZMS2 ** 2),
  );

  const channels: ChannelSpec[] = [
    {
      id: 'temp',
      label: 'Internal Bus Temperature',
      value: Number(tempDisplay.value),
      unit: tempDisplay.unit,
      normalMin: settings.units === 'IMPERIAL' ? (th.tempMinC * 9) / 5 + 32 : th.tempMinC,
      normalMax: settings.units === 'IMPERIAL' ? (th.tempMaxC * 9) / 5 + 32 : th.tempMaxC,
      warnCeiling: settings.units === 'IMPERIAL' ? (th.tempMaxC * 9) / 5 + 32 : th.tempMaxC,
      minObserved: tempMinObs,
      maxObserved: tempMaxObs,
      status: tel.subsystems.thermal,
    },
    {
      id: 'voltage',
      label: 'Battery Bus Voltage',
      value: tel.batteryVoltageV,
      unit: 'V',
      normalMin: th.voltageMinV,
      normalMax: th.voltageMaxV,
      warnFloor: th.voltageMinV,
      minObserved: voltMinObs,
      maxObserved: voltMaxObs,
      status: tel.subsystems.power,
    },
    {
      id: 'current',
      label: 'Battery Net Current',
      value: tel.batteryCurrentA,
      unit: 'A',
      normalMin: -30,
      normalMax: 45,
      minObserved: currMinObs,
      maxObserved: currMaxObs,
      status: 'NOMINAL',
    },
    {
      id: 'soc',
      label: 'Battery State of Charge',
      value: tel.batterySocPct,
      unit: '%',
      normalMin: 30,
      normalMax: 100,
      warnFloor: 30,
      minObserved: socMinObs,
      maxObserved: socMaxObs,
      status: tel.batterySocPct < 30 ? 'WARNING' : 'NOMINAL',
    },
    {
      id: 'solar',
      label: 'Solar Array Generation',
      value: tel.solarPowerW,
      unit: 'W',
      normalMin: 0,
      normalMax: 2200,
      minObserved: solarMinObs,
      maxObserved: solarMaxObs,
      status: 'NOMINAL',
    },
    {
      id: 'signal',
      label: 'RF Downlink Signal Strength',
      value: tel.signalStrengthDbm,
      unit: 'dBm',
      normalMin: th.signalMinDbm,
      normalMax: -55,
      warnFloor: th.signalMinDbm,
      minObserved: sigMinObs,
      maxObserved: sigMaxObs,
      status: tel.subsystems.communications,
    },
    {
      id: 'angular',
      label: 'Angular Velocity Magnitude',
      value: tel.angularVelocityDegS,
      unit: '°/s',
      normalMin: 0,
      normalMax: th.angularVelMaxDegS,
      warnCeiling: th.angularVelMaxDegS,
      minObserved: angMinObs,
      maxObserved: angMaxObs,
      status: tel.subsystems.attitudeControl,
    },
    {
      id: 'accel',
      label: 'IMU Residual Acceleration',
      value: Number(
        Math.sqrt(tel.accelXMS2 ** 2 + tel.accelYMS2 ** 2 + tel.accelZMS2 ** 2).toFixed(4),
      ),
      unit: 'm/s²',
      normalMin: 0,
      normalMax: 0.02,
      warnCeiling: 0.02,
      minObserved: accMinObs,
      maxObserved: accMaxObs,
      status: tel.subsystems.attitudeControl,
    },
  ];

  const series = hist.slice(-40).map((f) => ({
    time: formatUtcShort(f.timestampIso),
    voltage: f.batteryVoltageV,
    temp: Number(
      (settings.units === 'IMPERIAL' ? (f.internalTempC * 9) / 5 + 32 : f.internalTempC).toFixed(1),
    ),
    signal: f.signalStrengthDbm,
    angularVel: f.angularVelocityDegS,
    gyroX: f.gyroXDegS,
    gyroY: f.gyroYDegS,
    gyroZ: f.gyroZDegS,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">
            Telemetry Sensor Suite
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time spacecraft bus channels, threshold bounds & IMU waveforms · {tel.provenance}
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono bg-[#0D1422] border border-slate-800 rounded-md px-3.5 py-2">
          <span className="text-slate-400">
            PKT SEQ: <span className="text-white">{tel.packetSeq}</span>
          </span>
          <span className="text-slate-700">|</span>
          <span className="text-slate-400">
            FRAME STATUS:{' '}
            <span
              className={
                tel.packetStatus === 'LOCKED'
                  ? 'text-emerald-400'
                  : tel.packetStatus === 'DEGRADED'
                    ? 'text-amber-300'
                    : 'text-red-400'
              }
            >
              {tel.packetStatus} ({tel.packetIntegrityPct}%)
            </span>
          </span>
          <span className="text-slate-700">|</span>
          <span className="text-slate-400">
            SNR: <span className="text-cyan-300">{tel.snrDb} dB</span>
          </span>
        </div>
      </div>

      {/* Sensor Channel Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {channels.map((ch) => {
          const span = Math.max(0.001, ch.normalMax - ch.normalMin);
          const pct = Math.min(100, Math.max(0, ((ch.value - ch.normalMin) / span) * 100));
          return (
            <div
              key={ch.id}
              className="rounded-lg border border-slate-800 bg-[#0D1422] p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-slate-300">{ch.label}</p>
                <SubsystemBadge status={ch.status} />
              </div>

              <div className="font-mono text-2xl font-bold text-white tabular-nums">
                {ch.value}
                <span className="text-xs font-normal text-slate-400 ml-1.5">{ch.unit}</span>
              </div>

              <div>
                <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-200 ${
                      ch.status === 'CRITICAL'
                        ? 'bg-red-500'
                        : ch.status === 'WARNING'
                          ? 'bg-orange-400'
                          : 'bg-cyan-400'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-slate-400 mt-1.5 tabular-nums">
                  <span>
                    Norm: {ch.normalMin.toFixed(1)}..{ch.normalMax.toFixed(1)}
                  </span>
                  <span>
                    Min/Max: {ch.minObserved} / {ch.maxObserved}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Gyroscope & Accelerometer Triad */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-4">
          <h2 className="text-xs font-semibold text-white mb-3">
            3-Axis Gyroscope Readings (°/s)
          </h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { axis: 'Roll (X)', val: tel.gyroXDegS },
              { axis: 'Pitch (Y)', val: tel.gyroYDegS },
              { axis: 'Yaw (Z)', val: tel.gyroZDegS },
            ].map((g) => (
              <div key={g.axis} className="rounded bg-[#0A101D] border border-slate-800 p-3">
                <p className="text-[11px] text-slate-400">{g.axis}</p>
                <p className="font-mono text-lg font-semibold text-cyan-300 mt-1 tabular-nums">
                  {g.val.toFixed(3)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-4">
          <h2 className="text-xs font-semibold text-white mb-3">
            3-Axis Accelerometer Readings (m/s²)
          </h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { axis: 'Accel X', val: tel.accelXMS2 },
              { axis: 'Accel Y', val: tel.accelYMS2 },
              { axis: 'Accel Z', val: tel.accelZMS2 },
            ].map((a) => (
              <div key={a.axis} className="rounded bg-[#0A101D] border border-slate-800 p-3">
                <p className="text-[11px] text-slate-400">{a.axis}</p>
                <p className="font-mono text-lg font-semibold text-emerald-300 mt-1 tabular-nums">
                  {a.val.toFixed(4)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Multi-Channel Telemetry Waveforms */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-4">
          <h3 className="text-xs font-semibold text-white mb-3">
            EPS Voltage (V) & Thermal ({tempDisplay.unit}) Trend
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="time" stroke="#64748B" fontSize={10} />
                <YAxis yAxisId="left" stroke="#38BDF8" fontSize={10} domain={['auto', 'auto']} />
                <YAxis yAxisId="right" orientation="right" stroke="#F59E0B" fontSize={10} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0A101D', borderColor: '#1E293B', fontSize: '11px' }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="voltage"
                  name="Voltage (V)"
                  stroke="#38BDF8"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="temp"
                  name={`Temp (${tempDisplay.unit})`}
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-4">
          <h3 className="text-xs font-semibold text-white mb-3">
            3-Axis Gyroscope Rate History (°/s)
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="time" stroke="#64748B" fontSize={10} />
                <YAxis stroke="#64748B" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0A101D', borderColor: '#1E293B', fontSize: '11px' }}
                />
                <Line type="monotone" dataKey="gyroX" name="Roll X" stroke="#38BDF8" dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="gyroY" name="Pitch Y" stroke="#10B981" dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="gyroZ" name="Yaw Z" stroke="#F97316" dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}
