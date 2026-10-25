  import React from 'react';
  import { StatsOverview } from '../../types.ts';
  import { ShieldCheck, ShieldAlert, Ban, CheckCircle2, HelpCircle } from 'lucide-react';

  interface EnforcementActionsProps {
    overview: StatsOverview | null;
  }

  export const EnforcementActions: React.FC<EnforcementActionsProps> = ({ overview }) => {
    const alerted = overview?.totalAlerts ?? 0;
    const drops = overview?.confirmedDrops ?? 0;
    const rejects = overview?.confirmedRejects ?? 0;
    const passes = overview?.explicitPasses ?? 0;
    const unknowns = overview?.unknownActions ?? 0;

    const total = alerted + drops + rejects + passes + unknowns || 1;

    const actions = [
      {
        label: 'Alerted (IDS)',
        count: alerted,
        percent: Math.round((alerted / total) * 100),
        color: 'text-amber-400',
        bg: 'bg-amber-500',
        icon: ShieldAlert,
        desc: 'Pattern matched; packet forwarded in passive detection mode',
      },
      {
        label: 'Confirmed Drop',
        count: drops,
        percent: Math.round((drops / total) * 100),
        color: 'text-rose-400',
        bg: 'bg-rose-500',
        icon: Ban,
        desc: 'Packet explicitly blocked by active inline IPS rule verdict',
      },
      {
        label: 'Confirmed Reject',
        count: rejects,
        percent: Math.round((rejects / total) * 100),
        color: 'text-orange-400',
        bg: 'bg-orange-500',
        icon: ShieldAlert,
        desc: 'Packet dropped and TCP RST / ICMP unreachable sent to sender',
      },
      {
        label: 'Explicit Pass',
        count: passes,
        percent: Math.round((passes / total) * 100),
        color: 'text-emerald-400',
        bg: 'bg-emerald-500',
        icon: CheckCircle2,
        desc: 'Traffic explicitly whitelisted or authorized by pass rule',
      },
      {
        label: 'Unverified / Telemetry',
        count: unknowns,
        percent: Math.round((unknowns / total) * 100),
        color: 'text-slate-400',
        bg: 'bg-slate-500',
        icon: HelpCircle,
        desc: 'Standard protocol telemetry (flow, dns, http) without enforcement',
      },
    ];

    return (
<div className="p-5 bg-gradient-to-br from-[#1C1C1C] via-[#0D0D0D] to-[#020202] border border-[#303030] rounded-lg flex flex-col h-[550px] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">        <div className="flex items-center justify-between mb-10">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">IDS / IPS Enforcement Action Statistics</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Strict distinction between passive signature alerts and confirmed inline packet drops
            </p>
          </div>
          <ShieldCheck className="w-4 h-4 text-slate-400" />
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <div key={act.label} className="p-2.5 bg-gradient-to-r from-[#101010] to-[#080808] border border-[#292929] rounded-md">
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-3.5 h-3.5 ${act.color}`} />
                    <span className="font-semibold text-slate-200">{act.label}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className={`font-bold ${act.color} tabular-nums`}>{act.count}</span>
                    <span className="text-slate-400 text-[11px] tabular-nums">({act.percent}%)</span>
                  </div>
                </div>
                <div className="w-full bg-[#292929] h-1.5 rounded-full overflow-hidden mb-1.5">
                  <div className={`h-full ${act.bg} rounded-full`} style={{ width: `${act.percent}%` }} />
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  {act.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
