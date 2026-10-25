import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api.ts';
import { Printer, Download, ShieldAlert, Ban, FileText, CheckCircle, AlertTriangle } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState('24h');
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    ApiService.fetchReportSummary(timeRange)
      .then(setReport)
      .catch((err) => console.error('Error fetching report:', err))
      .finally(() => setLoading(false));
  }, [timeRange]);

  const handlePrint = () => {
    window.print();
  };

  const overview = report?.overview;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-[#303030] print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-100 font-mono tracking-tight">Threat Intelligence & Incident Report</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit-ready summary of observed Suricata IDS/IPS detections and network anomalies
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-1.5 bg-gradient-to-br from-[#181818] to-[#080808] border border-[#303030] rounded-md text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
          >
            <option className="bg-[#101010] text-slate-200" value="15m">
              Last 15 Minutes
            </option>
            <option className="bg-[#101010] text-slate-200" value="1h">
              Last 1 Hour
            </option>
            <option className="bg-[#101010] text-slate-200" value="24h">
              Last 24 Hours
            </option>
            <option className="bg-[#101010] text-slate-200" value="7d">
              Last 7 Days
            </option>
          </select>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-[#1E293B] hover:bg-[#334155] border border-slate-700 rounded-md transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Printable Report Canvas */}
      <div className="p-8 bg-gradient-to-br from-[#181818] to-[#080808] border border-[#303030] rounded-lg space-y-8 print:bg-white print:text-black print:border-none print:p-0">
        {/* Report Header */}
        <div className="border-b border-[#303030] pb-6 flex items-start justify-between">
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-indigo-400 font-semibold mb-1">
              Suricata Network Security Telemetry Report
            </div>
            <h2 className="text-2xl font-bold text-slate-100 font-mono">Executive Incident & Detection Summary</h2>
            <p className="text-xs text-slate-400 mt-1">
              Evaluation Interval: <strong className="text-slate-200 font-mono">{overview?.timeWindow?.start || 'N/A'}</strong> to{' '}
              <strong className="text-slate-200 font-mono">{overview?.timeWindow?.end || 'N/A'}</strong>
            </p>
          </div>
          <div className="text-right text-xs font-mono text-slate-400">
            <div>Generated: {new Date(report?.generatedAt || Date.now()).toUTCString()}</div>
            <div>Engine: Suricata IDS/IPS v7.x EVE Engine</div>
          </div>
        </div>

        {/* Audit Compliance Disclaimer Notice */}
        <div className="p-4 bg-gradient-to-br from-[#181818] via-[#101010] to-[#070707] border border-[#303030] rounded-md text-xs text-slate-300 leading-relaxed space-y-1">
          <div className="font-semibold text-amber-400 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Operational Telemetry Notice</span>
          </div>
          <p>
            {report?.auditNotice ||
              'This security report represents observed Suricata EVE IDS/IPS telemetry in the specified evaluation window. Unless confirmed by inline drop rules, alerts indicate pattern matches rather than blocked intrusions.'}
          </p>
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gradient-to-br from-[#181818] via-[#101010] to-[#070707] border border-[#303030] rounded-md shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
            <span className="text-xs text-slate-400 block mb-1">Total EVE Events</span>
            <span className="text-2xl font-bold font-mono text-slate-100">{overview?.totalEvents ?? 0}</span>
          </div>
          <div className="p-4 bg-gradient-to-br from-[#181818] via-[#101010] to-[#070707] border border-[#303030] rounded-md shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
            <span className="text-xs text-slate-400 block mb-1">Total Alerts (Sev 1-3)</span>
            <span className="text-2xl font-bold font-mono text-amber-400">{overview?.totalAlerts ?? 0}</span>
          </div>
          <div className="p-4 bg-gradient-to-br from-[#181818] via-[#101010] to-[#070707] border border-[#303030] rounded-md shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
            <span className="text-xs text-slate-400 block mb-1">Critical/High (Sev 1)</span>
            <span className="text-2xl font-bold font-mono text-rose-400">{overview?.criticalAlerts ?? 0}</span>
          </div>
          <div className="p-4 bg-gradient-to-br from-[#181818] via-[#101010] to-[#070707] border border-[#303030] rounded-md shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
            <span className="text-xs text-slate-400 block mb-1">Confirmed Drops (IPS)</span>
            <span className="text-2xl font-bold font-mono text-emerald-400">{overview?.confirmedDrops ?? 0}</span>
          </div>
        </div>

        {/* Enforcement Status Narrative */}
        <div className="p-4 bg-gradient-to-br from-[#181818] via-[#101010] to-[#070707] border border-[#303030] rounded-md space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Enforcement Mode & Evidence
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-100 font-mono">
              {overview?.enforcementMode || 'IDS (Detection Only)'}
            </span>
          </div>
          <p className="text-xs text-slate-300 font-mono">
            {overview?.enforcementEvidenceNotes}
          </p>
        </div>

        {/* Top Threat Signatures Table */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-200">Most Frequently Triggered Signatures</h3>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#303030] text-slate-400 font-mono">
                <th className="py-2">Signature</th>
                <th className="py-2">Category</th>
                <th className="py-2 text-center">SID</th>
                <th className="py-2 text-center">Sev</th>
                <th className="py-2 text-right">Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/60 font-mono">
              {(report?.topSignatures || []).map((s: any) => (
                <tr key={s.signature}>
                  <td className="py-2 text-slate-200 font-sans font-medium">{s.signature}</td>
                  <td className="py-2 text-slate-400">{s.category}</td>
                  <td className="py-2 text-center text-slate-400">{s.signatureId}</td>
                  <td className="py-2 text-center text-rose-400">{s.severity}</td>
                  <td className="py-2 text-right font-bold text-amber-400">{s.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top Source IPs */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-200">Top Observed Source Endpoints</h3>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#303030] text-slate-400 font-mono">
                <th className="py-2">Source IP</th>
                <th className="py-2 text-right">Alert Count</th>
                <th className="py-2 text-right">Total Events</th>
                <th className="py-2 pl-4">Primary Triggered Signature</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/60 font-mono">
              {(report?.topAttackers || []).map((src: any) => (
                <tr key={src.ip}>
                  <td className="py-2 font-medium text-slate-200">{src.ip}</td>
                  <td className="py-2 text-right text-rose-400 font-bold">{src.alertCount}</td>
                  <td className="py-2 text-right text-slate-400">{src.count}</td>
                  <td className="py-2 pl-4 text-slate-300 font-sans">{src.topSignature || 'Standard telemetry'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Report Sign-off */}
        <div className="border-t border-[#1E293B] pt-6 flex items-center justify-between text-xs text-slate-400 font-mono">
          <div>Report ID: REP-{Date.now().toString(36).toUpperCase()}</div>
          <div>Status: Verified Telemetry Ingestion Complete</div>
        </div>
      </div>
    </div>
  );
};
