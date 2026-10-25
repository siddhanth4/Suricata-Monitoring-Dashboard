import React, { useState, useEffect, useCallback } from 'react';
import { ApiService } from '../services/api.ts';
import { SecurityEvent } from '../types.ts';
import { EventModal } from '../components/common/EventModal.tsx';
import {
  Search,
  Filter,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Radio,
  FileText,
} from 'lucide-react';

export const EventsPage: React.FC = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(30);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filters
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [protocolFilter, setProtocolFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [timeRange, setTimeRange] = useState('24h');

  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiService.fetchEvents({
        page,
        limit,
        eventType: eventTypeFilter,
        protocol: protocolFilter,
        search: searchTerm,
        timeRange,
      });
      setEvents(res.events);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error('Error loading events telemetry:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, eventTypeFilter, protocolFilter, searchTerm, timeRange]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const getEventTypeStyle = (type: string) => {
    switch (type.toLowerCase()) {
      case 'alert':
        return 'text-rose-400 bg-rose-950/40 border-rose-800';
      case 'dns':
        return 'text-cyan-400 bg-cyan-950/40 border-cyan-800';
      case 'http':
        return 'text-indigo-400 bg-indigo-950/40 border-indigo-800';
      case 'tls':
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-800';
      case 'ssh':
        return 'text-purple-400 bg-purple-950/40 border-purple-800';
      case 'flow':
        return 'text-amber-400 bg-amber-950/40 border-amber-800';
      case 'stats':
        return 'text-slate-300 bg-slate-800 border-slate-700';
      default:
        return 'text-slate-400 bg-slate-900 border-slate-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-[#1E293B]">
        <div>
          <h1 className="text-xl font-bold text-slate-100 font-mono tracking-tight">EVE Telemetry & Network Flows</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Full telemetry stream across all Suricata event types including DNS, HTTP, TLS, SSH, and Flow records
          </p>
        </div>

        <button
          onClick={() => loadEvents()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1E293B] hover:bg-[#334155] rounded-md text-xs font-mono text-slate-200 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-gradient-to-br from-[#202020] via-[#101010] to-[#030303] border border-[#303030] rounded-lg flex flex-wrap items-center gap-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search IP, flow ID, host, or query..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 bg-[#090D16] border border-[#1E293B] rounded-md text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Event Type Filter */}
        <select
          value={eventTypeFilter}
          onChange={(e) => {
            setEventTypeFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 bg-[#090D16] border border-[#1E293B] rounded-md text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Event Types</option>
          <option value="alert">alert</option>
          <option value="dns">dns</option>
          <option value="http">http</option>
          <option value="tls">tls</option>
          <option value="ssh">ssh</option>
          <option value="flow">flow</option>
          <option value="stats">stats</option>
        </select>

        {/* Protocol Filter */}
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

        {/* Time Window */}
        <select
          value={timeRange}
          onChange={(e) => {
            setTimeRange(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 bg-[#090D16] border border-[#1E293B] rounded-md text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
        >
          <option value="15m">Last 15m</option>
          <option value="1h">Last 1h</option>
          <option value="24h">Last 24h</option>
          <option value="7d">Last 7d</option>
          <option value="all">All</option>
        </select>
      </div>

      {/* Events Table */}
      <div className="bg-gradient-to-br from-[#202020] via-[#101010] to-[#030303] border border-[#303030] rounded-lg overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1E293B] bg-[#0B111E] text-slate-400 font-mono">
                <th className="py-3 px-4 font-medium">Timestamp</th>
                <th className="py-3 px-3 font-medium">Event Type</th>
                <th className="py-3 px-4 font-medium">Source Endpoint</th>
                <th className="py-3 px-2 font-medium text-center">Proto</th>
                <th className="py-3 px-4 font-medium">Destination Endpoint</th>
                <th className="py-3 px-4 font-medium">Summary / Context</th>
                <th className="py-3 px-3 font-medium text-center w-12">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/60 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-indigo-400" />
                    Loading EVE telemetry events...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No telemetry events found for current filters.
                  </td>
                </tr>
              ) : (
                events.map((ev) => {
                  let contextSummary = '';
                  if (ev.eventType === 'alert') {
                    contextSummary = ev.signature || 'Alert triggered';
                  } else if (ev.eventType === 'dns') {
                    const dns = (ev.rawEvent as any)?.dns;
                    contextSummary = `DNS Query: ${dns?.rrname || 'query'} (${dns?.rrtype || 'A'})`;
                  } else if (ev.eventType === 'http') {
                    const http = (ev.rawEvent as any)?.http;
                    contextSummary = `HTTP ${http?.http_method || 'GET'} ${http?.hostname || ''}${http?.url || '/'}`;
                  } else if (ev.eventType === 'tls') {
                    const tls = (ev.rawEvent as any)?.tls;
                    contextSummary = `TLS SNI: ${tls?.sni || tls?.subject || 'Handshake'}`;
                  } else if (ev.eventType === 'flow') {
                    const flow = (ev.rawEvent as any)?.flow;
                    contextSummary = `Flow state: ${flow?.state || 'closed'} (${flow?.bytes_toserver || 0} bytes to server)`;
                  } else if (ev.eventType === 'stats') {
                    contextSummary = 'Suricata engine heartbeat stats';
                  } else {
                    contextSummary = `Flow ID: ${ev.flowId || 'N/A'}`;
                  }

                  return (
                    <tr
                      key={ev.id}
                      onClick={() => setSelectedEvent(ev)}
                      className="hover:bg-[#1E293B]/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 text-slate-400 tabular-nums whitespace-nowrap">
                        {new Date(ev.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`font-mono text-xs px-2 py-0.5 rounded border uppercase font-medium ${getEventTypeStyle(
                            ev.eventType
                          )}`}
                        >
                          {ev.eventType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 tabular-nums whitespace-nowrap">
                        {ev.sourceIP ? `${ev.sourceIP}:${ev.sourcePort || '-'}` : 'N/A'}
                      </td>
                      <td className="py-3 px-2 text-center whitespace-nowrap">
                        <span className="text-[11px] px-1.5 py-0.5 bg-[#090D16] border border-[#1E293B] rounded text-slate-300 uppercase">
                          {ev.protocol}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 tabular-nums whitespace-nowrap">
                        {ev.destinationIP ? `${ev.destinationIP}:${ev.destinationPort || '-'}` : 'N/A'}
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-300 max-w-[300px] truncate">
                        {contextSummary}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(ev);
                          }}
                          className="p-1 text-slate-400 hover:text-indigo-300 hover:bg-[#1E293B] rounded transition-colors"
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

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#1E293B] bg-[#0B111E] text-xs font-mono text-slate-400">
          <div>
            Showing <strong className="text-slate-200">{events.length}</strong> of{' '}
            <strong className="text-slate-200">{total}</strong> telemetry events
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
