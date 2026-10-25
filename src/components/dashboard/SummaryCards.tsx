import React from 'react';
import { StatsOverview, SystemStatusResponse } from '../../types.ts';
import { ShieldAlert, Flame, Ban, Network, Activity, Info } from 'lucide-react';

interface SummaryCardsProps {
  overview: StatsOverview | null;
  status: SystemStatusResponse | null;
  timeRange: string;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ overview, status, timeRange }) => {
  const totalAlerts = overview?.totalAlerts ?? 0;
  const criticalAlerts = overview?.criticalAlerts ?? 0;
  const highAlerts = overview?.highAlerts ?? 0;
  const confirmedDrops = overview?.confirmedDrops ?? 0;
  const uniqueSources = overview?.uniqueSourceIPs ?? 0;
  const totalEvents = overview?.totalEvents ?? 0;

  const isIpsMode = (overview?.confirmedDrops ?? 0) > 0 || status?.suricata.deploymentMode === 'ips';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Alerts */}
      <div className="p-4 bg-gradient-to-br from-[#151515] via-[#0A0A0A] to-[#000000] border border-[#303030] rounded-lg">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs font-medium uppercase tracking-wider">Total Alerts</span>
          <ShieldAlert className="w-4 h-4 text-amber-400" />
        </div>
        <div className="text-2xl font-bold font-mono tabular-nums text-slate-100">
          {totalAlerts.toLocaleString()}
        </div>
        <div className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
          <span>Window: <strong className="text-slate-300 font-mono">{timeRange}</strong></span>
          <span aria-hidden="true">·</span>
          <span>Alerts only</span>
        </div>
      </div>

      {/* 2. Critical / High Severity */}
      <div className="p-4 bg-gradient-to-br from-[#151515] via-[#0A0A0A] to-[#000000] border border-[#303030] rounded-lg">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs font-medium uppercase tracking-wider">Critical & High</span>
          <Flame className="w-4 h-4 text-rose-500" />
        </div>
        <div className="text-2xl font-bold font-mono tabular-nums text-rose-400">
          {(criticalAlerts + highAlerts).toLocaleString()}
        </div>
        <div className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
          <span>Sev 1: <strong className="text-rose-400 font-mono">{criticalAlerts}</strong></span>
          <span aria-hidden="true">·</span>
          <span>Sev 2: <strong className="text-amber-400 font-mono">{highAlerts}</strong></span>
        </div>
      </div>

      {/* 3. Confirmed Drops (IDS vs IPS semantics) */}
      <div className="p-4 bg-gradient-to-br from-[#151515] via-[#0A0A0A] to-[#000000] border border-[#303030] rounded-lg">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium uppercase tracking-wider">Confirmed Drops</span>
            <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
          </div>
          <Ban className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="text-2xl font-bold font-mono tabular-nums text-slate-100">
          {confirmedDrops.toLocaleString()}
        </div>
        <div className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
          <span>Mode: <strong className={isIpsMode ? "text-emerald-400" : "text-amber-400"}>
            {isIpsMode ? 'IPS Inline' : 'IDS Passive'}
          </strong></span>
          <span aria-hidden="true">·</span>
          <span>{isIpsMode ? 'Packets Dropped' : 'Detection Only'}</span>
        </div>

        {/* Hover Explanatory Tooltip */}
        <div className="hidden group-hover:block absolute bottom-full left-0 mb-2 w-72 p-2.5 bg-[#06090F] border border-[#334155] rounded shadow-xl text-[11px] text-slate-300 z-30 leading-normal pointer-events-none">
          <strong className="text-white block mb-1">Enforcement Action Semantics:</strong>
          {overview?.enforcementEvidenceNotes || 'Passive IDS mode flags matching signatures without blocking. Confirmed drops require inline IPS NFQUEUE / AF_PACKET IPS deployment.'}
        </div>
      </div>

      {/* 4. Unique Source IPs */}
      {/* <div className="p-4 bg-[#0F172A] border border-[#1E293B] rounded-lg">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs font-medium uppercase tracking-wider">Unique Sources</span>
          <Network className="w-4 h-4 text-sky-400" />
        </div>
        <div className="text-2xl font-bold font-mono tabular-nums text-slate-100">
          {uniqueSources.toLocaleString()}
        </div>
        <div className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
          <span>Destinations: <strong className="text-slate-300 font-mono">{overview?.uniqueDestinationIPs ?? 0}</strong></span>
          <span aria-hidden="true">·</span>
          <span>Observed IPs</span>
        </div>
      </div> */}

      {/* 5. Ingestion Engine Status */}
      <div className="p-4 bg-gradient-to-br from-[#151515] via-[#0A0A0A] to-[#000000] border border-[#303030] rounded-lg">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs font-medium uppercase tracking-wider">EVE Telemetry</span>
          <Activity className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="text-2xl font-bold font-mono tabular-nums text-slate-100">
          {totalEvents.toLocaleString()}
        </div>
        <div className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
          <span>Source: <strong className="text-indigo-300 uppercase font-mono">{status?.suricata.mode || 'LIVE'}</strong></span>
          <span aria-hidden="true">·</span>
          <span>In-Memory Stream</span>
        </div>
      </div>
    </div>
  );
};
