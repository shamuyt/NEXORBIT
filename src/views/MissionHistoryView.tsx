import { Download, Search } from 'lucide-react';
import { useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MissionControlSnapshot, MissionHistoryEntry } from '../engine/types';
import { formatUtcShort, formatUtcTime } from '../utils/formatters';

interface MissionHistoryViewProps {
  snapshot: MissionControlSnapshot;
}

export function MissionHistoryView({ snapshot }: MissionHistoryViewProps) {
  const [typeFilter, setTypeFilter] = useState<'ALL' | MissionHistoryEntry['eventType']>('ALL');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | MissionHistoryEntry['severity']>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filtered = snapshot.missionHistory.filter((item) => {
    if (typeFilter !== 'ALL' && item.eventType !== typeFilter) return false;
    if (severityFilter !== 'ALL' && item.severity !== severityFilter) return false;
    if (dateFilter && !item.timestampIso.startsWith(dateFilter)) return false;
    if (
      searchQuery.trim() &&
      !`${item.title} ${item.details} ${item.missionId} ${item.spacecraftName}`
        .toLowerCase()
        .includes(searchQuery.trim().toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const healthTrend = snapshot.telemetryHistory.slice(-24).map((t) => ({
    time: formatUtcShort(t.timestampIso),
    health: t.overallHealthPct,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">
            Mission History & Audit Archive
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Historical mission records, anomaly logs, conjunction events & CSV telemetry export
          </p>
        </div>

        <a
          href="/api/history/export"
          download="nexorbit-mission-history.csv"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV Data
        </a>
      </div>

      {/* Mission Health Trend Chart */}
      <section className="rounded-lg border border-slate-800 bg-[#0D1422] p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-sm font-semibold text-white">
            Composite Mission Health Trend (%)
          </h2>
          <span className="font-mono text-xs text-slate-400">
            {snapshot.activeSpacecraft.name} · {snapshot.activeSpacecraft.provenance}
          </span>
        </div>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={healthTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis dataKey="time" stroke="#64748B" fontSize={10} />
              <YAxis stroke="#64748B" fontSize={10} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0A101D', borderColor: '#1E293B', fontSize: '11px' }}
              />
              <Area
                type="monotone"
                dataKey="health"
                stroke="#10B981"
                fill="#10B981"
                fillOpacity={0.18}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="rounded-lg border border-slate-800 bg-[#0D1422] p-4 flex flex-wrap items-center gap-3 text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            aria-label="Search mission history"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search mission ID, spacecraft, or event details..."
            className="w-full pl-8 pr-3 py-2 rounded bg-[#0A101D] border border-slate-700 text-slate-200 placeholder:text-slate-500"
          />
        </div>

        <select
          aria-label="Filter by event type"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          className="px-3 py-2 rounded bg-[#0A101D] border border-slate-700 text-slate-200"
        >
          <option value="ALL">All Event Types</option>
          <option value="MISSION">Mission</option>
          <option value="ANOMALY">Anomaly</option>
          <option value="SAFETY">Safety</option>
          <option value="SYSTEM">System</option>
        </select>

        <select
          aria-label="Filter by severity"
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as typeof severityFilter)}
          className="px-3 py-2 rounded bg-[#0A101D] border border-slate-700 text-slate-200"
        >
          <option value="ALL">All Severities</option>
          <option value="INFO">Info</option>
          <option value="WARNING">Warning</option>
          <option value="CRITICAL">Critical</option>
        </select>

        <input
          type="date"
          aria-label="Filter by UTC date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-2 rounded bg-[#0A101D] border border-slate-700 text-slate-200 font-mono"
        />

        {(typeFilter !== 'ALL' || severityFilter !== 'ALL' || dateFilter || searchQuery) && (
          <button
            type="button"
            onClick={() => {
              setTypeFilter('ALL');
              setSeverityFilter('ALL');
              setDateFilter('');
              setSearchQuery('');
            }}
            className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
          >
            Clear Filters
          </button>
        )}
      </section>

      {/* Historical Event Table */}
      <section className="rounded-lg border border-slate-800 bg-[#0D1422] p-5">
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400">
            No historical mission records match your active filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 pr-3">UTC Timestamp</th>
                  <th className="py-2 pr-3">Mission / Craft</th>
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3">Severity</th>
                  <th className="py-2 pr-3">Event</th>
                  <th className="py-2 text-right">Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/30">
                    <td className="py-3 pr-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {formatUtcTime(row.timestampIso)}
                    </td>
                    <td className="py-3 pr-3 whitespace-nowrap">
                      <p className="font-mono text-white">{row.missionId}</p>
                      <p className="text-[11px] text-slate-400">{row.spacecraftName}</p>
                    </td>
                    <td className="py-3 pr-3 font-mono text-slate-300">{row.eventType}</td>
                    <td className="py-3 pr-3 font-mono">
                      <span
                        className={
                          row.severity === 'CRITICAL'
                            ? 'text-red-400'
                            : row.severity === 'WARNING'
                              ? 'text-amber-300'
                              : 'text-cyan-300'
                        }
                      >
                        {row.severity}
                      </span>
                    </td>
                    <td className="py-3 pr-3 max-w-md">
                      <p className="font-medium text-white">{row.title}</p>
                      <p className="text-slate-400 mt-0.5">{row.details}</p>
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums text-slate-200">
                      {row.healthPct.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
