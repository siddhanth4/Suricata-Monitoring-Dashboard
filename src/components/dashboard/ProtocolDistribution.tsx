import React from 'react';
import { ProtocolStats } from '../../types.ts';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Layers } from 'lucide-react';

interface ProtocolDistributionProps {
  protocols: ProtocolStats | null;
}

const COLORS = ['#6366F1', '#EC4899', '#06B6D4', '#10B981', '#F59E0B', '#8B5CF6'];

export const ProtocolDistribution: React.FC<ProtocolDistributionProps> = ({ protocols }) => {
  const transportData = protocols?.transport || [];
  const eventTypesData = protocols?.eventTypes || [];

  return (
    <div className="p-5 bg-[#0F172A] border border-[#1E293B] rounded-lg flex flex-col h-[320px]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Protocol & EVE Telemetry Distribution</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Breakdown of observed transport layer protocols and EVE telemetry record types
          </p>
        </div>
        <Layers className="w-4 h-4 text-slate-400" />
      </div>

      <div className="flex-1 grid grid-cols-2 gap-4">
        {/* Left: Transport Protocol Pie */}
        <div className="flex flex-col items-center justify-center">
          <div className="text-xs font-mono text-slate-400 mb-1">Transport Layer (L4)</div>
          <div className="w-full h-36">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={transportData}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={55}
                  paddingAngle={2}
                >
                  {transportData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }: any) => {
                    if (active && payload && payload.length) {
                      const data = payload[0];
                      return (
                        <div className="p-2 bg-[#06090F] border border-[#334155] rounded text-xs font-mono text-slate-200 shadow-xl">
                          <span className="font-semibold text-indigo-400">{data.name}:</span> {data.value} pkts/events
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-2 text-[11px] font-mono text-slate-400 mt-1">
            {transportData.slice(0, 3).map((item, i) => (
              <span key={item.name} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span>{item.name}: {item.count}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Right: EVE Record Types */}
        <div className="flex flex-col justify-center space-y-2 pr-1">
          <div className="text-xs font-mono text-slate-400 mb-1">EVE Record Categories</div>
          {eventTypesData.slice(0, 5).map((et, i) => (
            <div key={et.name} className="text-xs">
              <div className="flex justify-between text-slate-300 font-mono mb-1">
                <span className="uppercase">{et.name}</span>
                <span className="text-slate-400 tabular-nums">{et.count}</span>
              </div>
              <div className="w-full bg-[#1E293B] h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: COLORS[i % COLORS.length],
                    width: `${Math.min(100, Math.round((et.count / (protocols?.eventTypes[0]?.count || 1)) * 100))}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
