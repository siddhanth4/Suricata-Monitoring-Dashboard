import React, { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { AlertsPage } from './pages/AlertsPage.tsx';
import { EventsPage } from './pages/EventsPage.tsx';
import { ReportsPage } from './pages/ReportsPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { socketClient, ConnectionState } from './services/socket.ts';
import { ApiService } from './services/api.ts';
import { ShieldCheck, AlertCircle } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [simulating, setSimulating] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Initialize Socket.IO connection
  useEffect(() => {
    socketClient.connect();
    const unsub = socketClient.onStateChange((state) => {
      setConnectionState(state);
    });

    return () => {
      unsub();
      socketClient.disconnect();
    };
  }, []);

  const handleSimulateTraffic = async (scenario: string) => {
    setSimulating(true);
    try {
      const res = await ApiService.generateSimulatedTraffic(scenario);
      setToastMessage({
        text: `Injected test scenario: ${res.scenario} (${res.eventsGenerated} events emitted)`,
        type: 'success',
      });
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setToastMessage({ text: `Simulation error: ${msg}`, type: 'error' });
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#080808] to-[#151515] text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Navbar adhering to Top Bar Contract */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        connectionState={connectionState}
        onSimulateTraffic={handleSimulateTraffic}
        simulating={simulating}
      />

      {/* Floating Status Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-lg shadow-2xl border text-xs font-mono transition-all animate-bounce">
          {toastMessage.type === 'success' ? (
            <div className="flex items-center gap-2 text-emerald-300 bg-emerald-950/90 border-emerald-800 px-3 py-1.5 rounded">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{toastMessage.text}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-rose-300 bg-rose-950/90 border-rose-800 px-3 py-1.5 rounded">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>{toastMessage.text}</span>
            </div>
          )}
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'dashboard' && <DashboardPage />}
        {currentTab === 'alerts' && <AlertsPage />}
        {currentTab === 'events' && <EventsPage />}
        {currentTab === 'reports' && <ReportsPage />}
        {currentTab === 'settings' && <SettingsPage />}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-white/10 bg-black/30 py-4 px-6 text-center text-xs text-slate-500 font-mono">
        Suricata SOC Monitor · Real-Time Hybrid IDS/IPS Threat Telemetry · EVE JSON Log Ingestion Engine
      </footer>
    </div>
  );
}
