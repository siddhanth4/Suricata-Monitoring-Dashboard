import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ApiService } from '../services/api.ts';
import { socketClient } from '../services/socket.ts';
import {
  ProtocolStats,
  SecurityEvent,
  StatsOverview,
  SystemStatusResponse,
  TimelinePoint,
  TopSignature,
  TopTalkerSource,
} from '../types.ts';
import { SummaryCards } from '../components/dashboard/SummaryCards.tsx';
import { AttackTimeline } from '../components/dashboard/AttackTimeline.tsx';
import { TopSignatures } from '../components/dashboard/TopSignatures.tsx';
import { TopTalkers } from '../components/dashboard/TopTalkers.tsx';
import { EnforcementActions } from '../components/dashboard/EnforcementActions.tsx';
import { ProtocolDistribution } from '../components/dashboard/ProtocolDistribution.tsx';
import { LiveAlertFeed } from '../components/dashboard/LiveAlertFeed.tsx';
import { EventModal } from '../components/common/EventModal.tsx';
import { RefreshCw, Clock, Filter, AlertCircle } from 'lucide-react';

interface DashboardPageProps {
  onFilterAlerts?: (filter: { ip?: string; signature?: string }) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = () => {
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [signatures, setSignatures] = useState<TopSignature[]>([]);
  const [sources, setSources] = useState<TopTalkerSource[]>([]);
  const [protocols, setProtocols] = useState<ProtocolStats | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatusResponse | null>(null);

  // Live Alerts Buffer
  const [liveAlerts, setLiveAlerts] = useState<SecurityEvent[]>([]);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [newAlertIds, setNewAlertIds] = useState<Set<string>>(new Set());
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  // Fetch aggregate data
  const loadDashboardData = useCallback(async (range: string) => {
    try {
      setError(null);
      const [ov, tl, sigs, tt, proto, status, alertsRes] = await Promise.all([
        ApiService.fetchOverview(range),
        ApiService.fetchTimeline(range),
        ApiService.fetchSignatures(range),
        ApiService.fetchTopTalkers(range),
        ApiService.fetchProtocols(range),
        ApiService.fetchStatus(),
        ApiService.fetchAlerts({ timeRange: range, limit: 30 }),
      ]);

      setOverview(ov);
      setTimeline(tl);
      setSignatures(sigs);
      setSources(tt.sources);
      setProtocols(proto);
      setSystemStatus(status);
      setLiveAlerts(alertsRes.events);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData(timeRange);
  }, [timeRange, loadDashboardData]);

  // Socket.IO real-time listener for live alerts
  useEffect(() => {
    const unsubAlert = socketClient.onAlert((newAlert: SecurityEvent) => {
      if (!isPausedRef.current) {
        setLiveAlerts((prev) => {
          // Check for duplicate
          if (prev.some((e) => e.id === newAlert.id)) return prev;
          const updated = [newAlert, ...prev];
          return updated.slice(0, 100); // keep max 100 in live view
        });

        // Flash highlight on newly arrived alert
        setNewAlertIds((prev) => new Set(prev).add(newAlert.id));
        setTimeout(() => {
          setNewAlertIds((prev) => {
            const next = new Set(prev);
            next.delete(newAlert.id);
            return next;
          });
        }, 3000);
      }
    });

    const unsubStats = socketClient.onStatsTick(() => {
      // Soft refresh overview and timeline when events tick
      ApiService.fetchOverview(timeRange).then(setOverview).catch(() => {});
      ApiService.fetchTimeline(timeRange).then(setTimeline).catch(() => {});
      ApiService.fetchSignatures(timeRange).then(setSignatures).catch(() => {});
    });

    return () => {
      unsubAlert();
      unsubStats();
    };
  }, [timeRange]);

  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range);
    loadDashboardData(range);
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Time Range Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2 border-b border-[#292929]">
        <div>
          <h1 className="text-xl font-bold text-slate-100 font-mono tracking-tight">
            Suriata Monitoring Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time hybrid IDS/IPS threat detection and Suricata telemetry monitoring
          </p>
        </div>

        {/* Time Window Buttons (Interactive segmented control) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-gradient-to-br from-[#151515] via-[#0B0B0B] to-[#050505] border border-[#292929] rounded-lg">
            {[
              { id: '15m', label: '15m' },
              { id: '1h', label: '1h' },
              { id: '24h', label: '24h' },
              { id: '7d', label: '7d' },
              { id: 'all', label: 'All' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => handleTimeRangeChange(btn.id)}
                className={`px-3 py-1 text-xs font-mono font-medium rounded-md transition-colors ${
                  timeRange === btn.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => loadDashboardData(timeRange)}
            className="p-1.5 bg-[#0B0B0B] border border-[#292929] hover:bg-[#202020] rounded-lg text-slate-300 transition-colors"
            title="Refresh Dashboard"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-950/40 border border-rose-800/80 rounded-md text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>Error loading telemetry: {error}</span>
        </div>
      )}

      {/* A. Summary Cards */}
      <SummaryCards overview={overview} status={systemStatus} timeRange={timeRange} />

      {/* B & C. Attack Timeline & Top Signatures */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AttackTimeline data={timeline} loading={loading} />
        </div>
        <div className="lg:col-span-1">
          <TopSignatures signatures={signatures} />
        </div>
      </div>

      {/* D, E, G. Top Talkers, Enforcement Actions, Protocol Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* <TopTalkers sources={sources} /> */}
        <div className="lg:col-span-2">
          <LiveAlertFeed
            alerts={liveAlerts}
            isPaused={isPaused}
            onTogglePause={() => setIsPaused(!isPaused)}
            onSelectEvent={setSelectedEvent}
            newAlertIds={newAlertIds}
          />
        </div>
        <div className="lg:col-span-1">
          <EnforcementActions overview={overview} />
        </div> 
        {/* <ProtocolDistribution protocols={protocols} /> */}
      </div>

      {/* F. Live Alert Feed */}
      {/* <LiveAlertFeed
        alerts={liveAlerts}
        isPaused={isPaused}
        onTogglePause={() => setIsPaused(!isPaused)}
        onSelectEvent={setSelectedEvent}
        newAlertIds={newAlertIds}
      /> */}

      {/* Detailed Event Inspection Modal */}
      <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  );
};
