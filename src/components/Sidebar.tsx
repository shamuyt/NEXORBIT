import {
  Activity,
  AlertTriangle,
  BookOpen,
  Compass,
  Globe,
  History,
  LayoutDashboard,
  Settings,
  ShieldAlert,
} from 'lucide-react';
import type { NavSection } from '../engine/types';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  activeAnomalyCount: number;
  highRiskConjunctionCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{
  id: NavSection;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'tracking', label: 'Live Tracking', icon: Globe },
  { id: 'telemetry', label: 'Telemetry', icon: Activity },
  { id: 'orbital', label: 'Orbital Analysis', icon: Compass },
  { id: 'safety', label: 'Safety Monitor', icon: ShieldAlert },
  { id: 'anomalies', label: 'Anomaly Detection', icon: AlertTriangle },
  { id: 'history', label: 'Mission History', icon: History },
  { id: 'how-it-works', label: 'How It Works', icon: BookOpen },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({
  activeSection,
  onSelectSection,
  activeAnomalyCount,
  highRiskConjunctionCount,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const navContent = (
    <div className="flex flex-col h-full justify-between py-4 px-3">
      <div>
        <div className="px-3 pb-3 mb-3 border-b border-slate-800/80">
          <p className="text-[11px] font-medium tracking-wider text-slate-400">
            Mission Control
          </p>
          <p className="text-xs text-slate-300 mt-0.5">Engineering Beyond Orbit.</p>
        </div>

        <nav aria-label="Primary Sidebar Navigation" className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            const badgeCount =
              item.id === 'anomalies'
                ? activeAnomalyCount
                : item.id === 'safety'
                  ? highRiskConjunctionCount
                  : 0;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectSection(item.id);
                  onCloseMobile();
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/35'
                    : item.id === 'how-it-works'
                      ? 'text-sky-300 hover:bg-slate-800/70 hover:text-white border border-transparent'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white border border-transparent'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </span>
                {badgeCount > 0 && (
                  <span
                    className={`font-mono text-[11px] px-1.5 py-0.5 rounded tabular-nums ${
                      item.id === 'safety'
                        ? 'bg-orange-500/20 text-orange-300'
                        : 'bg-red-500/20 text-red-300'
                    }`}
                  >
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-6 pt-4 px-3 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
        <p className="font-medium text-slate-300">Data Integrity Policy</p>
        <p className="leading-relaxed">
          All synthetic telemetry and risk scenarios are explicitly tagged as simulated or TLE-propagated.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Rail */}
      <aside className="hidden lg:block w-60 shrink-0 border-r border-slate-800 bg-[#0A101D]">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black/70"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-50 w-64 max-w-[80vw] bg-[#0A101D] border-r border-slate-800 h-full overflow-y-auto">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
