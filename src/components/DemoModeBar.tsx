import { Pause, Play, RotateCcw, X } from 'lucide-react';
import type { DemoModeState } from '../engine/types';

interface DemoModeBarProps {
  demoState: DemoModeState;
  onControlDemo: (payload: {
    action: 'start' | 'pause' | 'resume' | 'restart' | 'stop';
    speedMultiplier?: number;
  }) => void;
}

export function DemoModeBar({ demoState, onControlDemo }: DemoModeBarProps) {
  if (!demoState.active) return null;

  const pct = Math.round(((demoState.stepIndex + 1) / 9) * 100);

  return (
    <div className="border-b border-cyan-500/30 bg-[#0B172A] px-4 lg:px-6 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-mono text-xs font-semibold text-cyan-300 whitespace-nowrap">
            DEMO MODE · NX-001
          </span>
          <span className="text-slate-600" aria-hidden="true">|</span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">{demoState.stepTitle}</p>
            <p className="text-[11px] text-slate-300 truncate">{demoState.stepDescription}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-2 mr-2">
            <div className="w-28 h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-cyan-400 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="font-mono text-[11px] text-slate-300 tabular-nums">
              {demoState.stepIndex + 1}/9
            </span>
          </div>

          <button
            type="button"
            onClick={() => onControlDemo({ action: demoState.paused ? 'resume' : 'pause' })}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            {demoState.paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            {demoState.paused ? 'Resume' : 'Pause'}
          </button>

          <button
            type="button"
            onClick={() => onControlDemo({ action: 'restart' })}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restart
          </button>

          <select
            aria-label="Demo speed multiplier"
            value={demoState.speedMultiplier}
            onChange={(e) =>
              onControlDemo({
                action: demoState.paused ? 'pause' : 'resume',
                speedMultiplier: Number(e.target.value),
              })
            }
            className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200"
          >
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={5}>5x</option>
          </select>

          <button
            type="button"
            onClick={() => onControlDemo({ action: 'stop' })}
            aria-label="Exit Demo Mode"
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
