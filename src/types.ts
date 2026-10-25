export type SecurityAction = 'ALERT' | 'DROP' | 'REJECT' | 'PASS' | 'UNKNOWN';

export interface SecurityEvent {
  id: string;
  timestamp: string;
  eventTime?: string;
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
  rawEvent?: Record<string, unknown>;
  ingestionSource: 'suricata-tail' | 'demo-generator' | 'api-ingest';
  createdAt?: string;
}

export interface StatsOverview {
  totalEvents: number;
  totalAlerts: number;
  criticalAlerts: number;
  highAlerts: number;
  mediumLowAlerts: number;
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

export interface TimelinePoint {
  time: string;
  timestamp: number;
  alerts: number;
  drops: number;
  severity1: number;
  severity2: number;
  severity3: number;
}

export interface TopTalkerSource {
  ip: string;
  count: number;
  alertCount: number;
  lastSeen: string;
  topSignature?: string;
}

export interface TopTalkerDest {
  ip: string;
  count: number;
  alertCount: number;
  lastSeen: string;
}

export interface TopSignature {
  signature: string;
  signatureId: number | null;
  category: string;
  count: number;
  severity: number | null;
}

export interface ProtocolStats {
  transport: Array<{ name: string; count: number }>;
  application: Array<{ name: string; count: number }>;
  eventTypes: Array<{ name: string; count: number }>;
}

export interface SystemStatusResponse {
  suricata: {
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
  };
  database: {
    connected: boolean;
    type: 'mongodb' | 'embedded-store';
    uri: string;
    databaseName: string;
    totalEvents: number;
    totalAlerts: number;
    error?: string;
  };
  serverTime: string;
}

export interface PaginatedResult<T> {
  events: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
