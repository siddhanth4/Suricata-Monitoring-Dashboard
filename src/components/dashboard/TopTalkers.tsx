import React from 'react';
import { TopTalkerSource } from '../../types.ts';
import { Globe, Filter } from 'lucide-react';

interface TopTalkersProps {
  sources: TopTalkerSource[];
  onFilterByIp?: (ip: string) => void;
}

export const TopTalkers: React.FC<TopTalkersProps> = ({ sources, onFilterByIp }) => {
  return (
    <div className="p-5 bg-[#0F172A] border border-[#1E293B] rounded-lg flex flex-col h-[320px]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Top Observed Source IPs</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Network endpoints generating highest alert and telemetry volume
          </p>
        </div>
        <Globe className="w-4 h-4 text-slate-400" />
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        {sources.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs">
            No source IPs recorded yet.
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1E293B] text-slate-400 font-mono">
                <th className="py-2 font-medium">Source IP</th>
                <th className="py-2 font-medium text-right">Alerts</th>
                <th className="py-2 font-medium pl-3">Top Signature</th>
                <th className="py-2 font-medium text-right pr-1">Last Seen</th>
                <th className="py-2 font-medium text-center w-8">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/60 font-mono">
              {sources.map((item) => (
                <tr key={item.ip} className="hover:bg-[#1E293B]/40 transition-colors">
                  <td className="py-2 font-medium text-slate-200">
                    {item.ip}
                  </td>
                  <td className="py-2 text-right tabular-nums font-semibold text-amber-400">
                    {item.alertCount}
                  </td>
                  <td className="py-2 pl-3 font-sans text-slate-300 max-w-[150px] truncate" title={item.topSignature}>
                    {item.topSignature || 'Generic Traffic'}
                  </td>
                  <td className="py-2 text-right text-slate-400 tabular-nums">
                    {new Date(item.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="py-2 text-center">
                    <button
                      onClick={() => onFilterByIp && onFilterByIp(item.ip)}
                      title={`Filter by ${item.ip}`}
                      className="p-1 text-slate-400 hover:text-indigo-300 hover:bg-[#1E293B] rounded transition-colors"
                    >
                      <Filter className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
