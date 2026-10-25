import crypto from 'crypto';
import { NormalizedSecurityEvent, RawEveEvent, SecurityAction } from '../types/index.ts';

export class ParserService {
  /**
   * Parse a raw line from eve.json into a RawEveEvent object
   */
  public static parseJsonLine(line: string): { success: boolean; data?: RawEveEvent; error?: string } {
    const trimmed = line.trim();
    if (!trimmed) {
      return { success: false, error: 'Empty line' };
    }

    try {
      const parsed = JSON.parse(trimmed) as RawEveEvent;
      return { success: true, data: parsed };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Malformed JSON: ${message}` };
    }
  }

  /**
   * Determine action and verdict with strict IDS vs IPS semantics
   */
  public static determineAction(raw: RawEveEvent): { action: SecurityAction; evidence: string } {
    const alertAction = raw.alert?.action ? String(raw.alert.action).toLowerCase() : null;
    const verdict = raw.verdict ? String(raw.verdict).toLowerCase() : null;
    const generalAction = raw.action ? String(raw.action).toLowerCase() : null;

    // Confirmed drop
    if (alertAction === 'blocked' || alertAction === 'drop' || verdict === 'drop' || generalAction === 'drop') {
      return {
        action: 'DROP',
        evidence: `Suricata explicitly confirmed DROP action (${alertAction || verdict || generalAction})`
      };
    }

    // Confirmed reject
    if (alertAction === 'reject' || verdict === 'reject' || generalAction === 'reject') {
      return {
        action: 'REJECT',
        evidence: `Suricata explicitly confirmed REJECT action (${alertAction || verdict || generalAction})`
      };
    }

    // Explicit pass
    if (alertAction === 'pass' || verdict === 'pass' || generalAction === 'pass') {
      return {
        action: 'PASS',
        evidence: `Suricata explicitly confirmed PASS action (${alertAction || verdict || generalAction})`
      };
    }

    // Alert triggered without drop action
    if (raw.event_type === 'alert') {
      return {
        action: 'ALERT',
        evidence: 'Suricata IDS signature triggered (detection-only, packet not confirmed dropped)'
      };
    }

    // Telemetry / other events without enforcement verdict
    return {
      action: 'UNKNOWN',
      evidence: 'No enforcement verdict present in telemetry record'
    };
  }

  /**
   * Generate stable deduplication key
   */
  public static generateDedupKey(raw: RawEveEvent, normalizedTimestamp: string): string {
    const flowId = raw.flow_id !== undefined ? String(raw.flow_id) : 'noflow';
    const eventType = raw.event_type || 'unknown';
    const sigId = raw.alert?.signature_id !== undefined ? String(raw.alert.signature_id) : 'nosig';
    const src = `${raw.src_ip || 'nosrc'}:${raw.src_port || 0}`;
    const dest = `${raw.dest_ip || 'nodest'}:${raw.dest_port || 0}`;
    const proto = raw.proto || 'noproto';

    const rawString = `${normalizedTimestamp}|${flowId}|${eventType}|${sigId}|${src}|${dest}|${proto}`;
    return crypto.createHash('sha256').update(rawString).digest('hex');
  }

  /**
   * Normalize raw EVE event to strict domain model
   */
  public static normalizeEvent(
    raw: RawEveEvent,
    source: 'suricata-tail' | 'demo-generator' | 'api-ingest' = 'suricata-tail'
  ): NormalizedSecurityEvent {
    // Timestamp handling
    let eventTime: Date;
    let timestampStr: string;

    if (raw.timestamp) {
      const parsedDate = new Date(raw.timestamp);
      if (!isNaN(parsedDate.getTime())) {
        eventTime = parsedDate;
        timestampStr = parsedDate.toISOString();
      } else {
        eventTime = new Date();
        timestampStr = eventTime.toISOString();
      }
    } else {
      eventTime = new Date();
      timestampStr = eventTime.toISOString();
    }

    const { action, evidence } = this.determineAction(raw);
    const dedupKey = this.generateDedupKey(raw, timestampStr);

    // Severity mapping (Suricata: 1=High, 2=Medium, 3=Low, 4=Info)
    let severity: number | null = null;
    if (raw.alert?.severity !== undefined && raw.alert?.severity !== null) {
      const parsedSeverity = Number(raw.alert.severity);
      if (!isNaN(parsedSeverity)) {
        severity = parsedSeverity;
      }
    }

    // Protocol normalization
    const protocol = raw.proto ? String(raw.proto).toUpperCase() : 'UNKNOWN';
    const appProtocol = raw.app_proto ? String(raw.app_proto).toLowerCase() : null;

    // Signature and category
    const signature = raw.alert?.signature ? String(raw.alert.signature) : null;
    const signatureId = raw.alert?.signature_id !== undefined ? Number(raw.alert.signature_id) : null;
    const category = raw.alert?.category ? String(raw.alert.category) : 'Unclassified';

    return {
      timestamp: timestampStr,
      eventTime,
      eventType: raw.event_type || 'unknown',
      sourceIP: raw.src_ip ? String(raw.src_ip) : null,
      sourcePort: raw.src_port !== undefined ? Number(raw.src_port) : null,
      destinationIP: raw.dest_ip ? String(raw.dest_ip) : null,
      destinationPort: raw.dest_port !== undefined ? Number(raw.dest_port) : null,
      protocol,
      appProtocol,
      signature,
      signatureId,
      category,
      severity,
      action,
      actionEvidence: evidence,
      flowId: raw.flow_id !== undefined ? raw.flow_id : null,
      interface: raw.in_iface ? String(raw.in_iface) : null,
      rawEvent: raw,
      ingestionSource: source,
      dedupKey,
      createdAt: new Date(),
    };
  }
}
