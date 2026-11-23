import { Bell, Menu, Play, Radio, User, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { DataProvenance, NavSection } from '../engine/types';
import { formatUtcTime } from '../utils/formatters';

interface TopBarProps {
  missionId: string;
  spacecraftName: string;
  provenance: DataProvenance;
  wsConnected: boolean;
  simulationRunning: boolean;
  demoActive: boolean;
  activeAlertCount: number;
  mobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
  onToggleNotifications: () => void;
  onLaunchDemo: () => void;
  onNavigate: (section: NavSection) => void;
}

export function TopBar({
  missionId,
  spacecraftName,
  provenance,
  wsConnected,
  simulationRunning,
  demoActive,
  activeAlertCount,
  mobileMenuOpen,
  onToggleMobileMenu,
  onToggleNotifications,
  onLaunchDemo,
  onNavigate,
}: TopBarProps) {
  const [utcNow, setUtcNow] = useState(() => formatUtcTime(new Date()));
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      setUtcNow(formatUtcTime(new Date()));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <header className="h-14 shrink-0 border-b border-slate-800 bg-[#0A101D] px-4 lg:px-6 flex items-center justify-between gap-4 z-30">
      {/* Left Zone: Brand + Mission ID */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          className="lg:hidden p-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <button
          type="button"
          onClick={() => onNavigate('overview')}
          className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-md pr-1"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden="true"
            className="shrink-0"
          >
            <circle cx="16" cy="16" r="13" stroke="#1E293B" strokeWidth="1.5" />
            <ellipse
              cx="16"
              cy="16"
              rx="13.5"
              ry="5.5"
              transform="rotate(-28 16 16)"
              stroke="#06B6D4"
              strokeWidth="1.5"
            />
            <circle cx="16" cy="16" r="4.5" fill="#0EA5E9" fillOpacity="0.25" stroke="#38BDF8" strokeWidth="1.5" />
            <circle cx="26" cy="10.5" r="2.2" fill="#38BDF8" />
          </svg>
          <span className="font-display text-base font-bold tracking-wider text-white">
            NEXORBIT
          </span>
        </button>

        <span className="hidden sm:inline-block h-4 w-px bg-slate-800" aria-hidden="true" />

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 whitespace-nowrap truncate">
          <span className="font-mono text-slate-200 font-medium">{missionId}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate max-w-[180px] text-slate-300">{spacecraftName}</span>
        </div>
      </div>

      {/* Center Zone: Connection, Provenance, UTC Clock */}
      <div className="hidden md:flex items-center gap-5 text-xs whitespace-nowrap">
        <div className="flex items-center gap-1.5 text-slate-300">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              wsConnected ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
            aria-hidden="true"
          />
          <span className="font-mono">
            {wsConnected ? 'WS STREAM CONNECTED' : 'POLLING FALLBACK'}
          </span>
        </div>

        <span className="h-3.5 w-px bg-slate-800" aria-hidden="true" />

        <div className="flex items-center gap-1.5 font-mono">
          <Radio className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
          <span className={simulationRunning ? 'text-cyan-300' : 'text-amber-300'}>
            {simulationRunning ? 'SIMULATION ACTIVE' : 'SIMULATION PAUSED'}
          </span>
          <span className="text-slate-500">/</span>
          <span className="text-slate-300">{provenance}</span>
        </div>

        <span className="h-3.5 w-px bg-slate-800" aria-hidden="true" />

        <time className="font-mono tabular-nums text-slate-200" dateTime={utcNow}>
          {utcNow}
        </time>
      </div>

      {/* Right Zone: Demo Action, Notifications, Profile */}
      <div className="flex items-center gap-2.5 shrink-0">
        {!demoActive && (
          <button
            type="button"
            onClick={onLaunchDemo}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" aria-hidden="true" />
            Demo Mode
          </button>
        )}

        <button
          type="button"
          onClick={onToggleNotifications}
          aria-label={`Notifications (${activeAlertCount} active alerts)`}
          className="relative p-2 rounded-md border border-slate-800 bg-[#0F172A] hover:border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <Bell className="w-4 h-4" />
          {activeAlertCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white font-mono text-[10px] font-semibold flex items-center justify-center tabular-nums">
              {activeAlertCount}
            </span>
          )}
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            aria-label="Flight Director Profile"
            aria-expanded={profileOpen}
            className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-md border border-slate-800 bg-[#0F172A] hover:border-slate-700 text-xs text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            <span className="w-5 h-5 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 flex items-center justify-center">
              <User className="w-3.5 h-3.5" />
            </span>
            <span className="hidden xl:inline font-medium">Flight Ops</span>
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-60 rounded-lg border border-slate-800 bg-[#0D1422] shadow-xl p-3 z-50 text-xs">
              <p className="font-semibold text-white">ECE Flight Operations Console</p>
              <p className="text-slate-400 mt-0.5">Role: Lead Orbital Systems Engineer</p>
              <div className="h-px bg-slate-800 my-2.5" />
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    onNavigate('how-it-works');
                  }}
                  className="text-left px-2 py-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  Open How It Works Guide
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    onNavigate('settings');
                  }}
                  className="text-left px-2 py-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  Console Settings & Units
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
