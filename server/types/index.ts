export type SecurityAction = 'ALERT' | 'DROP' | 'REJECT' | 'PASS' | 'UNKNOWN';

export interface RawEveEvent {
  timestamp?: string;
  flow_id?: number | string;
  in_iface?: string;
  event_type?: string;
  src_ip?: string;
  src_port?: number;
  dest_ip?: string;
  dest_port?: number;
  proto?: string;
  app_proto?: string;
  alert?: {
    action?: string;
    gid?: number;
    signature_id?: number;
    rev?: number;
    signature?: string;
    category?: string;
    severity?: number;
    metadata?: Record<string, unknown>;
  };
  http?: Record<string, unknown>;
  dns?: Record<string, unknown>;
  tls?: Record<string, unknown>;
  ssh?: Record<string, unknown>;
  flow?: Record<string, unknown>;
  stats?: Record<string, unknown>;
  verdict?: string;
  action?: string;
  [key: string]: unknown;
}

export interface NormalizedSecurityEvent {
  id?: string;
  timestamp: string;
  eventTime: Date;
  eventType: string;
  sourceIP: string | null;
  sourcePort: number | null;
  destinationIP: string | null;
  destinationPort: number | null;
  protocol: string;
  appProtocol: string | null;
  signature: string | null;
  signatureId: number | null;
  category: string;
  severity: number | null;
  action: SecurityAction;
  actionEvidence: string;
  flowId: number | string | null;
  interface: string | null;
  rawEvent: RawEveEvent;
  ingestionSource: 'suricata-tail' | 'demo-generator' | 'api-ingest';
  dedupKey: string;
  createdAt: Date;
}

export interface IngestionStatus {
  filePath: string;
  resolvedPath: string;
  active: boolean;
  fileExists: boolean;
  mode: 'live' | 'demo';
  bytesRead: number;
  eventsReadCount: number;
  alertsReadCount: number;
  errorsCount: number;
  lastEventTime: string | null;
  lastReadTime: string | null;
  lastError: string | null;
  deploymentMode: 'ids' | 'ips';
  enforcementVerified: boolean;
}

export interface DatabaseStatus {
  connected: boolean;
  type: 'mongodb' | 'embedded-store';
  uri: string;
  databaseName: string;
  totalEvents: number;
  totalAlerts: number;
  error?: string;
}

export interface EventQueryParams {
  timeRange?: string; // '15m' | '1h' | '24h' | '7d' | 'all' | 'custom'
  startTime?: string;
  endTime?: string;
  sourceIP?: string;
  destinationIP?: string;
  signature?: string;
  eventType?: string;
  protocol?: string;
  severity?: string; // comma separated numbers or single number
  action?: string; // comma separated or single
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface StatsOverview {
  totalEvents: number;
  totalAlerts: number;
  criticalAlerts: number; // Severity 1
  highAlerts: number;     // Severity 2
  mediumLowAlerts: number;// Severity 3 & 4
  confirmedDrops: number;
  confirmedRejects: number;
  explicitPasses: number;
  unknownActions: number;
  uniqueSourceIPs: number;
  uniqueDestinationIPs: number;
  enforcementMode: 'IDS (Detection Only)' | 'IPS (Active Inline)';
  enforcementEvidenceNotes: string;
  timeWindow: {
    start: string;
    end: string;
    range: string;
  };
}

export interface TimelineDataPoint {
  time: string;
  timestamp: number;
  alerts: number;
  drops: number;
  severity1: number;
  severity2: number;
  severity3: number;
}
