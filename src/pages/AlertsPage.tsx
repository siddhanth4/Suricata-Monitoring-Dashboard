import React, { useState, useEffect, useCallback } from 'react';
import { ApiService } from '../services/api.ts';
import { SecurityEvent } from '../types.ts';
import { EventModal } from '../components/common/EventModal.tsx';
import {
  Search,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Ban,
  ShieldCheck,
  Eye,
  RefreshCw,
} from 'lucide-react';

export const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<SecurityEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [protocolFilter, setProtocolFilter] = useState('');
  const [timeRange, setTimeRange] = useState('24h');

  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiService.fetchAlerts({
        page,
        limit,
        search: searchTerm,
        severity: severityFilter,
        action: actionFilter,
        protocol: protocolFilter,
        timeRange,
      });
      setAlerts(res.events);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error('Error loading historical alerts:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, severityFilter, actionFilter, protocolFilter, timeRange]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const handleExportCsv = () => {
    const url = ApiService.getAlertsExportUrl({
      search: searchTerm,
      severity: severityFilter,
      action: actionFilter,
      protocol: protocolFilter,
      timeRange,
    });
    window.location.href = url;
  };

  const getSeverityBadge = (sev: number | null) => {
    if (sev === 1) return <span className="font-mono text-xs px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800 font-bold">SEV 1</span>;
    if (sev === 2) return <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800 font-medium">SEV 2</span>;
    if (sev === 3) return <span className="font-mono text-xs px-2 py-0.5 rounded bg-yellow-950/60 text-yellow-300 border border-yellow-800">SEV 3</span>;
    return <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">INFO</span>;
  };

  const getActionBadge = (action: string) => {
    if (action === 'DROP') return <span className="flex items-center gap-1 font-mono text-[11px] text-rose-400 font-semibold"><Ban className="w-3 h-3" />DROP</span>;
    if (action === 'REJECT') return <span className="flex items-center gap-1 font-mono text-[11px] text-orange-400 font-semibold"><ShieldAlert className="w-3 h-3" />REJECT</span>;
    if (action === 'PASS') return <span className="flex items-center gap-1 font-mono text-[11px] text-emerald-400 font-semibold"><ShieldCheck className="w-3 h-3" />PASS</span>;
    return <span className="flex items-center gap-1 font-mono text-[11px] text-amber-400"><ShieldAlert className="w-3 h-3" />ALERT</span>;
  };

  return (
    <div className="space-y-6">
      {/* Title & Export */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-[#303030]">
        <div>
          <h1 className="text-xl font-bold text-slate-100 font-mono tracking-tight">Historical Security Alerts</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Query, filter, and inspect Suricata alerts indexed in MongoDB database
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-[#1E293B] hover:bg-[#334155] border border-slate-700 rounded-md transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => loadAlerts()}
            className="p-1.5 bg-[#0F172A] border border-[#1E293B] hover:bg-[#1E293B] rounded-lg text-slate-300 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
<div className="p-4 bg-gradient-to-br from-[#202020] via-[#101010] to-[#030303] border border-[#303030] rounded-lg flex flex-wrap items-center gap-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search by signature, IP, or category..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 bg-[#090D16] border border-[#1E293B] rounded-md text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Time range */}
        <select
          value={timeRange}
          onChange={(e) => {
            setTimeRange(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 bg-[#090D16] border border-[#1E293B] rounded-md text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
        >
          <option value="15m">Last 15 Minutes</option>
          <option value="1h">Last 1 Hour</option>
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="all">All Historical</option>
        </select>

        {/* Severity */}
        <select
          value={severityFilter}
          onChange={(e) => {
            setSeverityFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 bg-[#090D16] border border-[#1E293B] rounded-md text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Severities</option>
          <option value="1">Critical (Sev 1)</option>
          <option value="2">Medium (Sev 2)</option>
          <option value="3">Low (Sev 3)</option>
        </select>

        {/* Action */}
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 bg-[#090D16] border border-[#1E293B] rounded-md text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Actions</option>
          <option value="ALERT">Alerted (IDS)</option>
          <option value="DROP">Drop (IPS)</option>
          <option value="REJECT">Reject</option>
        </select>

        {/* Protocol */}
        <select
          value={protocolFilter}
          onChange={(e) => {
            setProtocolFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 bg-[#090D16] border border-[#1E293B] rounded-md text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Protocols</option>
          <option value="TCP">TCP</option>
          <option value="UDP">UDP</option>
          <option value="ICMP">ICMP</option>
        </select>
      </div>

      {/* Alerts Table */}
<div className="bg-gradient-to-br from-[#202020] via-[#101010] to-[#030303] border border-[#303030] rounded-lg overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#303030] bg-gradient-to-r from-[#181818] via-[#101010] to-[#08080] text-slate-300 font-mono">
                <th className="py-3 px-4 font-medium">Timestamp</th>
                <th className="py-3 px-3 font-medium">Severity</th>
                <th className="py-3 px-4 font-medium">Signature / Category</th>
                <th className="py-3 px-4 font-medium">Source</th>
                <th className="py-3 px-2 font-medium text-center">Proto</th>
                <th className="py-3 px-4 font-medium">Destination</th>
                <th className="py-3 px-3 font-medium">Action</th>
                <th className="py-3 px-3 font-medium text-center w-12">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#303030]/70 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-indigo-400" />
                    Querying MongoDB security events...
                  </td>
                </tr>
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No alert events matched the specified filter criteria.
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => (
                  <tr
                    key={alert.id}
                    onClick={() => setSelectedEvent(alert)}
                    className="hover:bg-white/[0.045] cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 text-slate-400 tabular-nums whitespace-nowrap">
                      {new Date(alert.timestamp).toLocaleString([], {
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">{getSeverityBadge(alert.severity)}</td>
                    <td className="py-3 px-4 font-sans max-w-[320px]">
                      <div className="font-medium text-slate-200 truncate">{alert.signature}</div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {alert.category} · SID: {alert.signatureId || 'N/A'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300 tabular-nums whitespace-nowrap">
                      {alert.sourceIP || 'N/A'}:{alert.sourcePort || '-'}
                    </td>
                    <td className="py-3 px-2 text-center whitespace-nowrap">
                      <span className="text-[11px] px-1.5 py-0.5 bg-[#090D16] border border-[#1E293B] rounded text-slate-300 uppercase">
                        {alert.protocol}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 tabular-nums whitespace-nowrap">
                      {alert.destinationIP || 'N/A'}:{alert.destinationPort || '-'}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">{getActionBadge(alert.action)}</td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(alert);
                        }}
                        className="p-1 text-slate-400 hover:text-indigo-300 hover:bg-[#1E293B] rounded transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
<div className="flex items-center justify-between px-4 py-3 border-t border-[#303030] bg-gradient-to-r from-[#181818] to-[#080808] text-xs font-mono text-slate-400">          <div>
            Showing <strong className="text-slate-200">{alerts.length}</strong> of{' '}
            <strong className="text-slate-200">{total}</strong> alerts
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 bg-[#1E293B] hover:bg-[#334155] disabled:opacity-40 rounded transition-colors text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>
              Page <strong className="text-slate-200">{page}</strong> of{' '}
              <strong className="text-slate-200">{totalPages}</strong>
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 bg-[#1E293B] hover:bg-[#334155] disabled:opacity-40 rounded transition-colors text-slate-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  );
};
