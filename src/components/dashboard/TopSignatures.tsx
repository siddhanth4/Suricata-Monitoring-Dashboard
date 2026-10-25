import React from 'react';
import { TopSignature } from '../../types.ts';
import { FileCode, AlertCircle } from 'lucide-react';

interface TopSignaturesProps {
  signatures: TopSignature[];
  onSelectSignature?: (sig: string) => void;
}

export const TopSignatures: React.FC<TopSignaturesProps> = ({ signatures, onSelectSignature }) => {
  const maxCount = signatures.length > 0 ? Math.max(...signatures.map((s) => s.count)) : 1;

  return (
    <div className="p-5 bg-gradient-to-br from-[#151515] via-[#0A0A0A] to-[#000000] border border-[#303030] rounded-lg flex flex-col h-[320px]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Top Triggered Alert Signatures</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Most frequent Suricata detection rules triggered in current window
          </p>
        </div>
        <FileCode className="w-4 h-4 text-slate-400" />
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-3">
        {signatures.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
            <AlertCircle className="w-5 h-5 mb-1 text-slate-600" />
            <span>No alert signatures triggered yet.</span>
          </div>
        ) : (
          signatures.map((sig, idx) => {
            const percentage = Math.round((sig.count / maxCount) * 100);
            return (
              <div
                key={sig.signature + idx}
                onClick={() => onSelectSignature && onSelectSignature(sig.signature)}
                className="group cursor-pointer p-2 rounded hover:bg-[#1E293B]/60 transition-colors"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span className="font-mono text-slate-400 font-semibold">{idx + 1}.</span>
                    <span className="font-medium text-slate-200 truncate group-hover:text-indigo-300">
                      {sig.signature}
                    </span>
                  </div>
                  <span className="font-mono font-semibold text-slate-100 shrink-0">
                    {sig.count.toLocaleString()}
                  </span>
                </div>

                {/* Progress Bar & Metadata */}
                <div className="w-full bg-[#252525] h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      sig.severity === 1 ? 'bg-rose-500' : sig.severity === 2 ? 'bg-amber-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                  <span className="truncate">{sig.category}</span>
                  <span className="font-mono text-slate-400 shrink-0">
                    SID: {sig.signatureId || 'N/A'} · Sev {sig.severity || '-'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
