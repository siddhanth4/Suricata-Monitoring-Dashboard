import React, { useState, useMemo } from 'react';
import { SecurityEvent } from '../../types.ts';
import { Play, Pause, Search, ArrowRight, ShieldAlert, Ban, ShieldCheck, Eye } from 'lucide-react';

interface LiveAlertFeedProps {
  alerts: SecurityEvent[];
  isPaused: boolean;
  onTogglePause: () => void;
  onSelectEvent: (event: SecurityEvent) => void;
  newAlertIds: Set<string>;
}

export const LiveAlertFeed: React.FC<LiveAlertFeedProps> = ({
  alerts,
  isPaused,
  onTogglePause,
  onSelectEvent,
  newAlertIds,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      if (severityFilter !== 'all' && alert.severity !== Number(severityFilter)) {
        return false;
      }
      if (actionFilter !== 'all' && alert.action !== actionFilter) {
        return false;
      }
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const inSig = alert.signature?.toLowerCase().includes(q);
        const inSrc = alert.sourceIP?.toLowerCase().includes(q);
        const inDest = alert.destinationIP?.toLowerCase().includes(q);
        const inCat = alert.category?.toLowerCase().includes(q);
        if (!inSig && !inSrc && !inDest && !inCat) return false;
      }
      return true;
    });
  }, [alerts, searchTerm, severityFilter, actionFilter]);

  const getSeverityBadge = (sev: number | null) => {
    if (sev === 1) {
      return (
        <span className="font-mono text-xs px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/80 font-bold whitespace-nowrap">
          SEV 1
        </span>
      );
    }
    if (sev === 2) {
      return (
        <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/80 font-medium whitespace-nowrap">
          SEV 2
        </span>
      );
    }
    if (sev === 3) {
      return (
        <span className="font-mono text-xs px-2 py-0.5 rounded bg-yellow-950/60 text-yellow-300 border border-yellow-800/60 whitespace-nowrap">
          SEV 3
        </span>
      );
    }
    return (
      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 whitespace-nowrap">
        INFO
      </span>
    );
  };

  const getActionBadge = (action: string) => {
    if (action === 'DROP') {
      return (
        <span className="flex items-center gap-1 font-mono text-[11px] text-rose-400 font-semibold">
          <Ban className="w-3 h-3" />
          <span>DROP</span>
        </span>
      );
    }
    if (action === 'REJECT') {
      return (
        <span className="flex items-center gap-1 font-mono text-[11px] text-orange-400 font-semibold">
          <ShieldAlert className="w-3 h-3" />
          <span>REJECT</span>
        </span>
      );
    }
    if (action === 'PASS') {
      return (
        <span className="flex items-center gap-1 font-mono text-[11px] text-emerald-400 font-semibold">
          <ShieldCheck className="w-3 h-3" />
          <span>PASS</span>
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 font-mono text-[11px] text-amber-400">
        <ShieldAlert className="w-3 h-3" />
        <span>ALERT</span>
      </span>
    );
  };

 
return (
<div className="p-5 bg-gradient-to-br from-[#1C1C1C] via-[#0D0D0D] to-[#020202] border border-[#303030] rounded-lg flex flex-col h-[550px] min-h-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">    {/* Header and Controls */}
    <div className="shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-[#292929]">
      {/* Title and description */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-100">
            Live Security Alert Stream
          </h3>
          <span className="text-xs font-mono text-slate-400 whitespace-nowrap">
            ({alerts.length} live in buffer)
          </span>
        </div>

        <p className="text-xs text-slate-400 mt-0.5">
          Streaming Suricata EVE alert records with real-time WebSocket delivery
        </p>
      </div>

      {/* Filter controls and Pause button */}
      <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
        {/* Pause / Resume */}
        <button
          type="button"
          onClick={onTogglePause}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-md border transition-colors ${
            isPaused
              ? 'bg-amber-950/50 border-amber-800 text-amber-300 hover:bg-amber-900/60'
              : 'bg-[#151515] border-[#333333] text-slate-200 hover:bg-[#252525]'
          }`}
        >
          {isPaused ? (
            <Play className="w-3 h-3 fill-current" />
          ) : (
            <Pause className="w-3 h-3 fill-current" />
          )}
          <span>{isPaused ? 'Resume Feed' : 'Pause Feed'}</span>
        </button>

        {/* Severity selector */}
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-2.5 py-1.5 bg-[#080808] border border-[#292929] rounded text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
        >
          <option value="all">All Severities</option>
          <option value="1">Critical (Sev 1)</option>
          <option value="2">Medium (Sev 2)</option>
          <option value="3">Low (Sev 3)</option>
        </select>

        {/* Action selector */}
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-2.5 py-1.5 bg-[#080808] border border-[#292929] rounded text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
          aria-label="Filter alerts by action"
        >
          <option value="all">All Actions</option>
          <option value="ALERT">Alert (IDS)</option>
          <option value="DROP">Drop (IPS)</option>
          <option value="REJECT">Reject</option>
        </select>

        {/* Search */}
        <div className="relative flex-1 min-w-[150px] sm:w-44">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search alerts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
className="w-full pl-8 pr-3 py-1.5 bg-[#080808] border border-[#292929] rounded text-xs text-slate-200 focus:outline-none focus:border-indigo-500"            aria-label="Search alerts"
          />
        </div>
      </div>
    </div>

    {/* Scrollable alert table */}
    <div className="flex-1 min-h-0 overflow-auto rounded-sm">
      <table className="w-full min-w-[1050px] text-left text-xs border-collapse">
        <thead className="sticky top-0 z-10 bg-[#080808]">
          <tr className="border-b border-[#292929] text-slate-400 font-mono">
            <th className="py-2.5 px-3 font-medium whitespace-nowrap">
              Timestamp
            </th>
            <th className="py-2.5 px-2 font-medium whitespace-nowrap">
              Severity
            </th>
            <th className="py-2.5 px-3 font-medium">
              Alert Signature
            </th>
            <th className="py-2.5 px-3 font-medium whitespace-nowrap">
              Source Endpoint
            </th>
            <th className="py-2.5 px-2 font-medium text-center">
              Proto
            </th>
            <th className="py-2.5 px-3 font-medium whitespace-nowrap">
              Destination Endpoint
            </th>
            <th className="py-2.5 px-3 font-medium">
              Action
            </th>
            <th className="py-2.5 px-2 font-medium text-center w-12">
              View
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-[#1E293B]/60 font-mono">
          {filteredAlerts.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-12 text-center text-slate-500">
                No alerts match current search or filter parameters.
              </td>
            </tr>
          ) : (
            filteredAlerts.map((alert) => {
              const isNew = newAlertIds.has(alert.id);

              return (
                <tr
                  key={alert.id || alert.timestamp}
                  onClick={() => onSelectEvent(alert)}
                  className={`cursor-pointer transition-colors ${
                    isNew
                      ? 'bg-indigo-950/40'
                      : 'hover:bg-white/[0.04]'
                  }`}
                >
                  {/* Timestamp */}
                  <td className="py-2.5 px-3 text-slate-400 tabular-nums whitespace-nowrap">
                    {new Date(alert.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>

                  {/* Severity */}
                  <td className="py-2.5 px-2 whitespace-nowrap">
                    {getSeverityBadge(alert.severity)}
                  </td>

                  {/* Signature and category */}
                  <td className="py-2.5 px-3 font-sans max-w-[280px]">
                    <div className="font-medium text-slate-200 truncate">
                      {alert.signature}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {alert.category} · SID: {alert.signatureId || 'N/A'}
                    </div>
                  </td>

                  {/* Source endpoint */}
                  <td className="py-2.5 px-3 text-slate-300 tabular-nums whitespace-nowrap">
                    {alert.sourceIP || 'N/A'}:{alert.sourcePort || '-'}
                  </td>

                  {/* Protocol */}
                  <td className="py-2.5 px-2 text-center whitespace-nowrap">
                    <span className="text-[11px] px-1.5 py-0.5 bg-[#090D16] border border-[#1E293B] rounded text-slate-300 uppercase">
                      {alert.protocol}
                    </span>
                  </td>

                  {/* Destination endpoint */}
                  <td className="py-2.5 px-3 text-slate-300 tabular-nums whitespace-nowrap">
                    {alert.destinationIP || 'N/A'}:{alert.destinationPort || '-'}
                  </td>

                  {/* Action */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {getActionBadge(alert.action)}
                  </td>

                  {/* View details */}
                  <td className="py-2.5 px-2 text-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(alert);
                      }}
                      className="p-1 text-slate-400 hover:text-indigo-300 hover:bg-[#1E293B] rounded transition-colors"
                      title="View raw EVE JSON and details"
                      aria-label={`View details for ${alert.signature}`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  </div>
);
};
