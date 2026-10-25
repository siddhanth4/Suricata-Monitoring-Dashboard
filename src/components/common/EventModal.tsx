import React, { useState } from 'react';
import { SecurityEvent } from '../../types.ts';
import { X, Copy, Check, Shield, AlertTriangle, ArrowRight, Activity, Terminal } from 'lucide-react';

interface EventModalProps {
  event: SecurityEvent | null;
  onClose: () => void;
}

export const EventModal: React.FC<EventModalProps> = ({ event, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!event) return null;

  const handleCopyJson = () => {
    if (event.rawEvent) {
      navigator.clipboard.writeText(JSON.stringify(event.rawEvent, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getSeverityLabel = (sev: number | null) => {
    if (sev === 1) return { label: 'Severity 1 (Critical / High)', color: 'text-red-400', bg: 'bg-red-950/40 border-red-800/60' };
    if (sev === 2) return { label: 'Severity 2 (Medium)', color: 'text-amber-400', bg: 'bg-amber-950/40 border-amber-800/60' };
    if (sev === 3) return { label: 'Severity 3 (Low)', color: 'text-yellow-400', bg: 'bg-yellow-950/40 border-yellow-800/60' };
    return { label: 'Severity 4 (Info / Telemetry)', color: 'text-slate-400', bg: 'bg-slate-900 border-slate-800' };
  };

  const sevInfo = getSeverityLabel(event.severity);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
<div className="relative w-full max-w-3xl max-h-[90vh] bg-gradient-to-br from-[#151515] via-[#0B0B0B] to-[#050505] border border-[#292929] rounded-lg shadow-2xl flex flex-col overflow-hidden">        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E293B] bg-[#080808]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#181818] border border-[#292929] rounded-md text-slate-300">
              <Shield className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                {event.signature || `${event.eventType.toUpperCase()} Telemetry Event`}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span className="font-mono tabular-nums">{new Date(event.timestamp).toLocaleString()}</span>
                <span aria-hidden="true">·</span>
                <span>Type: <strong className="text-slate-200 font-mono">{event.eventType}</strong></span>
                <span aria-hidden="true">·</span>
                <span>Action: <strong className="text-slate-200">{event.action}</strong></span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-[#1E293B] rounded-md transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Action & Evidence Banner */}
          <div className="p-4 bg-gradient-to-r from-[#101010] to-[#080808] border border-[#292929] rounded-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Enforcement Action & Evidence</span>
              <span className={`text-xs px-2 py-0.5 rounded font-mono font-medium border ${
                event.action === 'DROP' ? 'bg-red-950/60 text-red-300 border-red-800' :
                event.action === 'REJECT' ? 'bg-orange-950/60 text-orange-300 border-orange-800' :
                event.action === 'ALERT' ? 'bg-amber-950/60 text-amber-300 border-amber-800' :
                event.action === 'PASS' ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800' :
                'bg-slate-800 text-slate-300 border-slate-700'
              }`}>
                {event.action}
              </span>
            </div>
            <p className="text-sm text-slate-300 font-mono">
              {event.actionEvidence || 'Telemetry event without inline enforcement record.'}
            </p>
          </div>

          {/* Network Flow Tuple */}
          <div className="p-4 bg-gradient-to-r from-[#101010] to-[#080808] border border-[#292929] rounded-md">
            <h3 className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-3">Network Flow Tuple</h3>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="text-xs text-slate-400">Source Endpoint</div>
                <div className="text-sm font-mono font-medium text-slate-200 mt-0.5">
                  {event.sourceIP || 'N/A'}:{event.sourcePort || '-'}
                </div>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <span className="text-xs font-mono uppercase bg-[#181818] border border-[#292929] px-2 py-1 rounded text-slate-300">
                  {event.protocol} {event.appProtocol ? `/${event.appProtocol.toUpperCase()}` : ''}
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex-1 min-w-[200px] text-right">
                <div className="text-xs text-slate-400">Destination Endpoint</div>
                <div className="text-sm font-mono font-medium text-slate-200 mt-0.5">
                  {event.destinationIP || 'N/A'}:{event.destinationPort || '-'}
                </div>
              </div>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-gradient-to-br from-[#101010] to-[#080808] border border-[#292929] rounded-md">
              <span className="text-slate-400 block mb-1">Severity Rating</span>
              <span className={`font-medium ${sevInfo.color}`}>{sevInfo.label}</span>
            </div>
            <div className="p-3 bg-gradient-to-br from-[#101010] to-[#080808] border border-[#292929] rounded-md">
              <span className="text-slate-400 block mb-1">Rule Signature ID</span>
              <span className="font-mono text-slate-200">{event.signatureId ?? 'N/A'}</span>
            </div>
            <div className="p-3 bg-gradient-to-br from-[#101010] to-[#080808] border border-[#292929] rounded-md">
              <span className="text-slate-400 block mb-1">Classification Category</span>
              <span className="text-slate-200 truncate block">{event.category}</span>
            </div>
            <div className="p-3 bg-gradient-to-br from-[#101010] to-[#080808] border border-[#292929] rounded-md">
              <span className="text-slate-400 block mb-1">Capture Interface</span>
              <span className="font-mono text-slate-200">{event.interface || 'eth0'}</span>
            </div>
          </div>

          {/* Raw EVE JSON Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                <Terminal className="w-4 h-4 text-slate-400" />
                <span>Raw Suricata EVE JSON Record</span>
              </div>
              <button
                onClick={handleCopyJson}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-300 bg-[#1E293B] hover:bg-[#334155] rounded transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copied ? 'Copied' : 'Copy JSON'}</span>
              </button>
            </div>
            <pre className="p-4 bg-[#030303] border border-[#292929] rounded-md text-xs font-mono text-slate-300 overflow-x-auto max-h-64 leading-relaxed">
              {JSON.stringify(event.rawEvent || event, null, 2)}
            </pre>
          </div>
        </div>

        {/* Footer */}
        
      </div>
    </div>
  );
};
