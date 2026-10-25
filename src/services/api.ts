import {
  PaginatedResult,
  ProtocolStats,
  SecurityEvent,
  StatsOverview,
  SystemStatusResponse,
  TimelinePoint,
  TopSignature,
  TopTalkerDest,
  TopTalkerSource,
} from '../types.ts';

const API_BASE = '/api';

export class ApiService {
  public static async fetchOverview(timeRange: string = '24h'): Promise<StatsOverview> {
    const res = await fetch(`${API_BASE}/stats/overview?timeRange=${timeRange}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch overview`);
    return res.json();
  }

  public static async fetchTimeline(timeRange: string = '24h'): Promise<TimelinePoint[]> {
    const res = await fetch(`${API_BASE}/stats/timeline?timeRange=${timeRange}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch timeline`);
    return res.json();
  }

  public static async fetchTopTalkers(
    timeRange: string = '24h'
  ): Promise<{ sources: TopTalkerSource[]; destinations: TopTalkerDest[] }> {
    const res = await fetch(`${API_BASE}/stats/top-talkers?timeRange=${timeRange}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch top talkers`);
    return res.json();
  }

  public static async fetchSignatures(timeRange: string = '24h'): Promise<TopSignature[]> {
    const res = await fetch(`${API_BASE}/stats/signatures?timeRange=${timeRange}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch signatures`);
    return res.json();
  }

  public static async fetchProtocols(timeRange: string = '24h'): Promise<ProtocolStats> {
    const res = await fetch(`${API_BASE}/stats/protocols?timeRange=${timeRange}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch protocols`);
    return res.json();
  }

  public static async fetchAlerts(params: Record<string, string | number | undefined>): Promise<PaginatedResult<SecurityEvent>> {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') {
        query.append(k, String(v));
      }
    }
    const res = await fetch(`${API_BASE}/alerts?${query.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch alerts`);
    return res.json();
  }

  public static async fetchAlertById(id: string): Promise<SecurityEvent> {
    const res = await fetch(`${API_BASE}/alerts/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch alert detail`);
    return res.json();
  }

  public static async fetchEvents(params: Record<string, string | number | undefined>): Promise<PaginatedResult<SecurityEvent>> {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') {
        query.append(k, String(v));
      }
    }
    const res = await fetch(`${API_BASE}/events?${query.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch events`);
    return res.json();
  }

  public static async fetchStatus(): Promise<SystemStatusResponse> {
    const res = await fetch(`${API_BASE}/status`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch status`);
    return res.json();
  }

  public static async fetchReportSummary(timeRange: string = '24h'): Promise<any> {
    const res = await fetch(`${API_BASE}/reports/summary?timeRange=${timeRange}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch report summary`);
    return res.json();
  }

  public static async generateSimulatedTraffic(scenario: string): Promise<any> {
    const res = await fetch(`${API_BASE}/demo/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to generate simulated traffic`);
    return res.json();
  }

  public static getAlertsExportUrl(params: Record<string, string | number | undefined>): string {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') {
        query.append(k, String(v));
      }
    }
    return `${API_BASE}/alerts/export/csv?${query.toString()}`;
  }
}
