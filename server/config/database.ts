import {
  EventQueryParams,
  NormalizedSecurityEvent,
  StatsOverview,
  TimelineDataPoint,
} from '../types/index.ts';

/**
 * Pure In-Memory Log Store
 * No MongoDB or external database required!
 * Keeps a fast, high-performance in-memory ring buffer of ingested Suricata EVE logs.
 */
export class DatabaseService {
  private static events: NormalizedSecurityEvent[] = [];
  private static dedupSet = new Set<string>();
  private static MAX_BUFFER_SIZE = 10000; // Keep last 3,000 events in memory

  public static initialize(): void {
    console.log('[LogStore] In-memory log buffer initialized (Zero-database architecture).');
  }

  public static getStatus() {
    return {
      connected: true,
      type: 'in-memory-stream',
      uri: 'Memory (No database required)',
      databaseName: 'In-Memory Real-Time Buffer',
      totalEvents: this.events.length,
      totalAlerts: this.events.filter((e) => e.eventType === 'alert').length,
    };
  }

  /**
   * Save an ingested Suricata event to the in-memory buffer
   */
  public static async saveEvent(
    event: NormalizedSecurityEvent
  ): Promise<{ event: NormalizedSecurityEvent; isNew: boolean }> {
    if (this.dedupSet.has(event.dedupKey)) {
      const existing = this.events.find((e) => e.dedupKey === event.dedupKey) || event;
      return { event: existing, isNew: false };
    }

    const eventWithId: NormalizedSecurityEvent = {
      ...event,
      id: event.id || `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };

    this.dedupSet.add(event.dedupKey);
    this.events.unshift(eventWithId);

    // Maintain buffer limit
    if (this.events.length > this.MAX_BUFFER_SIZE) {
      const removed = this.events.pop();
      if (removed) {
        this.dedupSet.delete(removed.dedupKey);
      }
    }

    return { event: eventWithId, isNew: true };
  }

  /**
   * Helper to parse time window from query params
   */
  public static resolveTimeWindow(params: EventQueryParams): { start: Date; end: Date; rangeLabel: string } {
    const end = params.endTime ? new Date(params.endTime) : new Date();
    let start: Date;

    const range = params.timeRange || '24h';
    if (params.startTime) {
      start = new Date(params.startTime);
    } else {
      switch (range) {
        case '15m':
          start = new Date(end.getTime() - 15 * 60 * 1000);
          break;
        case '1h':
          start = new Date(end.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'all':
          start = new Date(0);
          break;
        default:
          start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
          break;
      }
    }

    return { start, end, rangeLabel: range };
  }

  public static async getAlerts(params: EventQueryParams) {
    return this.queryEvents({ ...params, eventType: 'alert' });
  }

  public static async queryEvents(params: EventQueryParams) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(params.limit) || 25));
    const { start, end } = this.resolveTimeWindow(params);

    const filtered = this.events.filter((item) => {
      const itemTime = item.eventTime instanceof Date ? item.eventTime.getTime() : new Date(item.timestamp).getTime();
      if (params.timeRange !== 'all' && (itemTime < start.getTime() || itemTime > end.getTime())) {
        return false;
      }
      if (params.eventType && item.eventType !== params.eventType) {
        return false;
      }
      if (params.sourceIP && item.sourceIP !== params.sourceIP) {
        return false;
      }
      if (params.destinationIP && item.destinationIP !== params.destinationIP) {
        return false;
      }
      if (params.protocol && item.protocol.toUpperCase() !== params.protocol.toUpperCase()) {
        return false;
      }
      if (params.action && item.action.toUpperCase() !== params.action.toUpperCase()) {
        return false;
      }
      if (params.severity) {
        const sevs = params.severity.split(',').map((s) => Number(s.trim()));
        if (!item.severity || !sevs.includes(item.severity)) {
          return false;
        }
      }
      if (params.signature && (!item.signature || !item.signature.toLowerCase().includes(params.signature.toLowerCase()))) {
        return false;
      }
      if (params.search) {
        const q = params.search.toLowerCase();
        const matchesSig = item.signature && item.signature.toLowerCase().includes(q);
        const matchesSrc = item.sourceIP && item.sourceIP.toLowerCase().includes(q);
        const matchesDest = item.destinationIP && item.destinationIP.toLowerCase().includes(q);
        const matchesCat = item.category && item.category.toLowerCase().includes(q);
        const matchesType = item.eventType && item.eventType.toLowerCase().includes(q);
        if (!matchesSig && !matchesSrc && !matchesDest && !matchesCat && !matchesType) {
          return false;
        }
      }
      return true;
    });

    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    return {
      events: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  public static async getEventById(id: string): Promise<NormalizedSecurityEvent | null> {
    return this.events.find((e) => e.id === id || e.dedupKey === id) || null;
  }

  public static async getStatsOverview(params: EventQueryParams): Promise<StatsOverview> {
    const { start, end, rangeLabel } = this.resolveTimeWindow(params);

    const inWindow = this.events.filter((item) => {
      if (params.timeRange === 'all') return true;
      const t = item.eventTime instanceof Date ? item.eventTime.getTime() : new Date(item.timestamp).getTime();
      return t >= start.getTime() && t <= end.getTime();
    });

    const alerts = inWindow.filter((e) => e.eventType === 'alert');
    const drops = inWindow.filter((e) => e.action === 'DROP');
    const rejects = inWindow.filter((e) => e.action === 'REJECT');
    const passes = inWindow.filter((e) => e.action === 'PASS');
    const unknowns = inWindow.filter((e) => e.action === 'UNKNOWN');

    const critAlerts = alerts.filter((e) => e.severity === 1).length;
    const highAlerts = alerts.filter((e) => e.severity === 2).length;
    const medLowAlerts = alerts.filter((e) => e.severity === 3 || e.severity === 4).length;

    const uniqueSources = new Set(inWindow.map((e) => e.sourceIP).filter(Boolean)).size;
    const uniqueDests = new Set(inWindow.map((e) => e.destinationIP).filter(Boolean)).size;

    const hasDrops = drops.length > 0 || rejects.length > 0;
    const enforcementMode = hasDrops ? 'IPS (Active Inline)' : 'IDS (Detection Only)';
    const enforcementEvidenceNotes = hasDrops
      ? `${drops.length} drop / reject verdicts reported by Suricata.`
      : 'Suricata operates in passive IDS tap mode. Alert signatures are reported in real time.';

    return {
      totalEvents: inWindow.length,
      totalAlerts: alerts.length,
      criticalAlerts: critAlerts,
      highAlerts: highAlerts,
      mediumLowAlerts: medLowAlerts,
      confirmedDrops: drops.length,
      confirmedRejects: rejects.length,
      explicitPasses: passes.length,
      unknownActions: unknowns.length,
      uniqueSourceIPs: uniqueSources,
      uniqueDestinationIPs: uniqueDests,
      enforcementMode,
      enforcementEvidenceNotes,
      timeWindow: {
        start: start.toISOString(),
        end: end.toISOString(),
        range: rangeLabel,
      },
    };
  }

  public static async getTimeline(params: EventQueryParams): Promise<TimelineDataPoint[]> {
    const { start, end } = this.resolveTimeWindow(params);
    const durationMs = end.getTime() - start.getTime();

    const bucketCount = 15;
    const intervalMs = Math.max(1000, Math.floor(durationMs / bucketCount));

    const buckets: TimelineDataPoint[] = [];
    for (let i = 0; i < bucketCount; i++) {
      const bStart = start.getTime() + i * intervalMs;
      const bDate = new Date(bStart);
      const timeLabel = bDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      buckets.push({
        time: timeLabel,
        timestamp: bStart,
        alerts: 0,
        drops: 0,
        severity1: 0,
        severity2: 0,
        severity3: 0,
      });
    }

    const inWindow = this.events.filter((item) => {
      const t = item.eventTime instanceof Date ? item.eventTime.getTime() : new Date(item.timestamp).getTime();
      return t >= start.getTime() && t <= end.getTime();
    });

    for (const item of inWindow) {
      const t = item.eventTime instanceof Date ? item.eventTime.getTime() : new Date(item.timestamp).getTime();
      const bucketIdx = Math.min(bucketCount - 1, Math.max(0, Math.floor((t - start.getTime()) / intervalMs)));

      if (item.eventType === 'alert') {
        buckets[bucketIdx].alerts += 1;
        if (item.severity === 1) buckets[bucketIdx].severity1 += 1;
        else if (item.severity === 2) buckets[bucketIdx].severity2 += 1;
        else buckets[bucketIdx].severity3 += 1;
      }
      if (item.action === 'DROP' || item.action === 'REJECT') {
        buckets[bucketIdx].drops += 1;
      }
    }

    return buckets;
  }

  public static async getTopTalkers(params: EventQueryParams) {
    const { start, end } = this.resolveTimeWindow(params);

    const inWindow = this.events.filter((item) => {
      const t = item.eventTime instanceof Date ? item.eventTime.getTime() : new Date(item.timestamp).getTime();
      return t >= start.getTime() && t <= end.getTime();
    });

    const srcMap = new Map<string, { count: number; alertCount: number; lastSeen: number; sigs: Record<string, number> }>();
    const destMap = new Map<string, { count: number; alertCount: number; lastSeen: number }>();

    for (const ev of inWindow) {
      const t = ev.eventTime instanceof Date ? ev.eventTime.getTime() : new Date(ev.timestamp).getTime();
      if (ev.sourceIP) {
        const curr = srcMap.get(ev.sourceIP) || { count: 0, alertCount: 0, lastSeen: 0, sigs: {} };
        curr.count += 1;
        if (ev.eventType === 'alert') {
          curr.alertCount += 1;
          if (ev.signature) {
            curr.sigs[ev.signature] = (curr.sigs[ev.signature] || 0) + 1;
          }
        }
        if (t > curr.lastSeen) curr.lastSeen = t;
        srcMap.set(ev.sourceIP, curr);
      }

      if (ev.destinationIP) {
        const curr = destMap.get(ev.destinationIP) || { count: 0, alertCount: 0, lastSeen: 0 };
        curr.count += 1;
        if (ev.eventType === 'alert') curr.alertCount += 1;
        if (t > curr.lastSeen) curr.lastSeen = t;
        destMap.set(ev.destinationIP, curr);
      }
    }

    const sources = Array.from(srcMap.entries())
      .map(([ip, data]) => {
        let topSig: string | undefined;
        let maxSigCount = 0;
        for (const [sig, sc] of Object.entries(data.sigs)) {
          if (sc > maxSigCount) {
            maxSigCount = sc;
            topSig = sig;
          }
        }
        return {
          ip,
          count: data.count,
          alertCount: data.alertCount,
          lastSeen: new Date(data.lastSeen).toISOString(),
          topSignature: topSig,
        };
      })
      .sort((a, b) => b.alertCount - a.alertCount || b.count - a.count)
      .slice(0, 10);

    const destinations = Array.from(destMap.entries())
      .map(([ip, data]) => ({
        ip,
        count: data.count,
        alertCount: data.alertCount,
        lastSeen: new Date(data.lastSeen).toISOString(),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return { sources, destinations };
  }

  public static async getSignatures(params: EventQueryParams) {
    const { start, end } = this.resolveTimeWindow(params);

    const alerts = this.events.filter((item) => {
      const t = item.eventTime instanceof Date ? item.eventTime.getTime() : new Date(item.timestamp).getTime();
      return item.eventType === 'alert' && t >= start.getTime() && t <= end.getTime() && item.signature;
    });

    const sigMap = new Map<string, { count: number; signatureId: number | null; category: string; severity: number | null }>();

    for (const a of alerts) {
      const sig = a.signature!;
      const curr = sigMap.get(sig) || {
        count: 0,
        signatureId: a.signatureId,
        category: a.category,
        severity: a.severity,
      };
      curr.count += 1;
      sigMap.set(sig, curr);
    }

    return Array.from(sigMap.entries())
      .map(([signature, data]) => ({
        signature,
        signatureId: data.signatureId,
        category: data.category,
        count: data.count,
        severity: data.severity,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  public static async getProtocols(params: EventQueryParams) {
    const { start, end } = this.resolveTimeWindow(params);

    const inWindow = this.events.filter((item) => {
      const t = item.eventTime instanceof Date ? item.eventTime.getTime() : new Date(item.timestamp).getTime();
      return t >= start.getTime() && t <= end.getTime();
    });

    const transMap = new Map<string, number>();
    const appMap = new Map<string, number>();
    const typeMap = new Map<string, number>();

    for (const ev of inWindow) {
      const proto = ev.protocol || 'UNKNOWN';
      transMap.set(proto, (transMap.get(proto) || 0) + 1);

      if (ev.appProtocol) {
        appMap.set(ev.appProtocol, (appMap.get(ev.appProtocol) || 0) + 1);
      }

      const et = ev.eventType || 'unknown';
      typeMap.set(et, (typeMap.get(et) || 0) + 1);
    }

    return {
      transport: Array.from(transMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      application: Array.from(appMap.entries())
        .map(([name, count]) => ({ name: name.toUpperCase(), count }))
        .sort((a, b) => b.count - a.count),
      eventTypes: Array.from(typeMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
    };
  }
}
