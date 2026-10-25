import React from 'react';
import { TimelinePoint } from '../../types.ts';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Clock, Activity } from 'lucide-react';

interface AttackTimelineProps {
  data: TimelinePoint[];
  loading?: boolean;
}

interface TooltipPayloadItem {
  dataKey?: string;
  value?: number | string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
}

const getValue = (
  payload: TooltipPayloadItem[],
  key: string
): number => {
  const value = payload.find((item) => item.dataKey === key)?.value;
  const numericValue = Number(value ?? 0);

  return Number.isFinite(numericValue) ? numericValue : 0;
};

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
}) => {
  if (!active || !payload?.length) return null;

  const alerts = getValue(payload, 'alerts');
  const sev1 = getValue(payload, 'severity1');
  const sev2 = getValue(payload, 'severity2');
  const drops = getValue(payload, 'drops');

  return (
    <div className="p-3 bg-[#06090F] border border-[#334155] rounded-md shadow-xl text-xs space-y-1.5 font-mono">
      <div className="text-slate-400 font-semibold border-b border-[#1E293B] pb-1">
        {label}
      </div>

      <div className="flex justify-between gap-4 text-slate-200">
        <span>Total Alerts:</span>
        <strong className="text-cyan-400">{alerts}</strong>
      </div>

      <div className="flex justify-between gap-4 text-slate-200">
        <span>Critical (Sev 1):</span>
        <strong className="text-rose-400">{sev1}</strong>
      </div>

      <div className="flex justify-between gap-4 text-slate-200">
        <span>Medium (Sev 2):</span>
        <strong className="text-amber-300">{sev2}</strong>
      </div>

      <div className="flex justify-between gap-4 text-slate-200">
        <span>Drops:</span>
        <strong className="text-emerald-400">{drops}</strong>
      </div>
    </div>
  );
};

export const AttackTimeline: React.FC<AttackTimelineProps> = ({
  data,
  loading = false,
}) => {
  // Normalize values without inventing events or sample data.
  const chartData = React.useMemo(
    () =>
      (Array.isArray(data) ? data : []).map((point) => ({
        ...point,
        alerts: Number.isFinite(Number(point.alerts))
          ? Number(point.alerts)
          : 0,
        severity1: Number.isFinite(Number(point.severity1))
          ? Number(point.severity1)
          : 0,
        severity2: Number.isFinite(Number(point.severity2))
          ? Number(point.severity2)
          : 0,
        drops: Number.isFinite(Number(point.drops))
          ? Number(point.drops)
          : 0,
      })),
    [data]
  );

  const hasTimeline = chartData.length > 0;

  const hasActivity = chartData.some(
    (point) =>
      point.alerts > 0 ||
      point.severity1 > 0 ||
      point.severity2 > 0 ||
      point.drops > 0
  );

  return (
    <div className="p-5 bg-gradient-to-br from-[#151515] via-[#0A0A0A] to-[#000000] border border-[#303030] rounded-lg flex flex-col h-[320px] min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">
            Attack &amp; Threat Activity Timeline
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Suricata alerts, severity and confirmed drops over time
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400" />
            <span>Total Alerts</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
            <span>Sev 1</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
            <span>Sev 2</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
            <span>Drops</span>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0 min-w-0">
        {loading && !hasTimeline ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
            <Activity className="w-6 h-6 mb-2 animate-pulse" />
            Loading timeline data...
          </div>
        ) : !hasTimeline ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
            <Clock className="w-6 h-6 mb-2 text-slate-600" />
            <span>Waiting for timeline data from the backend.</span>
            <span className="mt-1 text-slate-600">
              No synthetic events are generated.
            </span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 8, right: 12, left: 8, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="timelineSev1Gradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.02} />
                </linearGradient>

                <linearGradient
                  id="timelineSev2Gradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.02} />
                </linearGradient>

                <linearGradient
                  id="timelineDropsGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                // stroke="#1E293B"
                stroke="#292929"
                vertical={false}
              />

              <XAxis
                dataKey="time"
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#1E293B' }}
                minTickGap={24}
              />

              <YAxis
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#1E293B' }}
                allowDecimals={false}
                domain={[0, 'auto']}
                width={38}
              />

              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: '#475569', strokeDasharray: '4 4' }}
              />

              <Area
                type="monotone"
                dataKey="severity1"
                name="Critical (Sev 1)"
                stroke="#F43F5E"
                fill="url(#timelineSev1Gradient)"
                strokeWidth={1.5}
                connectNulls
                isAnimationActive={false}
              />

              <Area
                type="monotone"
                dataKey="severity2"
                name="Medium (Sev 2)"
                stroke="#F59E0B"
                fill="url(#timelineSev2Gradient)"
                strokeWidth={1.5}
                connectNulls
                isAnimationActive={false}
              />

              <Area
                type="monotone"
                dataKey="drops"
                name="Confirmed Drops"
                stroke="#10B981"
                fill="url(#timelineDropsGradient)"
                strokeWidth={1.5}
                connectNulls
                isAnimationActive={false}
              />

              <Line
                type="monotone"
                dataKey="alerts"
                name="Total Alerts"
                stroke="#22D3EE"
                strokeWidth={2}
                dot={{ r: 2, fill: '#22D3EE', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                connectNulls
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {hasTimeline && !hasActivity && !loading && (
          <p className="text-center text-[11px] text-slate-500 mt-1">
            No alerts or drops in this interval. The timeline is showing zero activity.
          </p>
        )}
      </div>
    </div>
  );
};
