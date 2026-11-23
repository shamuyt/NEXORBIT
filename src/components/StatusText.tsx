import type { RiskLevel, SubsystemStatus } from '../engine/types';

export function SubsystemBadge({ status }: { status: SubsystemStatus }) {
  const config: Record<SubsystemStatus, { glyph: string; cls: string }> = {
    NOMINAL: { glyph: '●', cls: 'text-emerald-400' },
    DEGRADED: { glyph: '◐', cls: 'text-amber-300' },
    WARNING: { glyph: '▲', cls: 'text-orange-400' },
    CRITICAL: { glyph: '✖', cls: 'text-red-400' },
  };
  const { glyph, cls } = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-xs font-medium ${cls}`}>
      <span aria-hidden="true">{glyph}</span>
      <span>{status}</span>
    </span>
  );
}

export function RiskStatusLabel({
  level,
  label,
}: {
  level: RiskLevel;
  label: string;
}) {
  const config: Record<RiskLevel, { glyph: string; cls: string }> = {
    GREEN: { glyph: '●', cls: 'text-emerald-400' },
    YELLOW: { glyph: '▲', cls: 'text-yellow-300' },
    ORANGE: { glyph: '▲', cls: 'text-orange-400' },
    RED: { glyph: '✖', cls: 'text-red-400' },
  };
  const { glyph, cls } = config[level];
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-xs font-semibold ${cls}`}>
      <span aria-hidden="true">{glyph}</span>
      <span>
        {level}: {label}
      </span>
    </span>
  );
}
