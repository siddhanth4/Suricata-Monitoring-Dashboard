import React, { useState } from 'react';
import { ConnectionState } from '../../services/socket.ts';
import { Shield, Play, ChevronDown, Check } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  connectionState: ConnectionState;
  onSimulateTraffic: (scenario: string) => void;
  simulating: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  connectionState,
  onSimulateTraffic,
  simulating,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const navLinks = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'alerts', label: 'Alerts' },
    { id: 'events', label: 'Telemetry' },
    { id: 'reports', label: 'Reports' },
    { id: 'settings', label: 'Documentation' },
  ];

  const scenarios = [
    { id: 'kali-nmap', label: 'Kali: Nmap SYN Scan' },
    { id: 'kali-log4j', label: 'Kali: Log4j RCE Attempt (CVE-2021-44228)' },
    { id: 'kali-sqli', label: 'Kali: SQL Injection Probe (sqlmap)' },
    { id: 'kali-ssh-brute', label: 'Kali: Hydra SSH Brute Force' },
    { id: 'malware-c2', label: 'Trojan: Cobalt Strike C2 Beacon' },
    { id: 'ips-drop-scenario', label: 'IPS Test: EternalBlue SMB Drop' },
  ];

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-8 px-6 py-3.5 bg-gradient-to-r from-black via-[#080808] to-[#141414] border-b border-white/10 shadow-lg shadow-black/20">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
        <div className="p-1.5 bg-indigo-950/70 border border-indigo-800/80 rounded-md text-indigo-400">
          <Shield className="w-5 h-5 text-indigo-400" />
        </div>
        <span className="text-base font-bold tracking-tight text-slate-100 font-mono">
          
        </span>
      </div>

      {/* Zone 2: 4–5 clean single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
        {navLinks.map((link) => (
          <button
            key={link.id}
            onClick={() => onTabChange(link.id)}
            className={`whitespace-nowrap shrink-0 py-1 transition-colors ${
              currentTab === link.id
                ? 'text-indigo-400 border-b-2 border-indigo-500 font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            {link.label}
          </button>
        ))}
      </nav>

      {/* Zone 3: 1 primary action & real-time connection state */}
      <div className="flex items-center gap-3.5 shrink-0">
        {/* Real-time Socket Indicator */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400">
          <span
            className={`w-2 h-2 rounded-full ${
              connectionState === 'connected'
                ? 'bg-emerald-500'
                : connectionState === 'reconnecting'
                ? 'bg-amber-500 animate-pulse'
                : 'bg-rose-500'
            }`}
          />
          <span className="capitalize">{connectionState}</span>
        </div>

        {/* Simulate Lab Traffic Action Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            disabled={simulating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-[#252533] to-[#111111] border border-white/15 hover:from-[#333333] hover:to-[#1A1A1A] disabled:opacity-50 rounded-md transition-colors whitespace-nowrap shrink-0 shadow-sm shadow-black/40">
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{simulating ? 'Injecting...' : 'Simulate Demo Traffic'}</span>
            <ChevronDown className="w-3 h-3 ml-0.5 text-indigo-200" />
          </button>

          {dropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-64 bg-gradient-to-br from-[#080808] via-[#101010] to-[#181818] border border-white/10 rounded-md shadow-xl shadow-black/40 py-1 z-50"
              onMouseLeave={() => setDropdownOpen(false)}
            >
              <div className="px-3 py-1.5 text-[11px] font-mono text-slate-400 border-b border-[#1E293B] uppercase tracking-wider">
                Select Authorized Lab Test
              </div>
              {scenarios.map((sc) => (
                <button
                  key={sc.id}
                  onClick={() => {
                    setDropdownOpen(false);
                    onSimulateTraffic(sc.id);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-white/[0.06] hover:text-white transition-colors flex items-center justify-between"
                >
                  <span className="truncate">{sc.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
