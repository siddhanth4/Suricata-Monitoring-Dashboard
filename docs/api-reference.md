# Suricata SOC Monitor: REST API & Socket.IO Reference

All REST endpoints are prefixed with `/api`. Responses are serialized as JSON.

---

## 1. System Health & Diagnostics

### `GET /api/health`
Returns system component health, Node memory footprint, database connection type, and connected WebSocket client count.

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2026-10-17T08:30:00.000Z",
  "uptimeSeconds": 1420,
  "memory": {
    "heapUsedMb": 45.2,
    "heapTotalMb": 68.5,
    "rssMb": 112.4
  },
  "database": {
    "connected": true,
    "type": "mongodb",
    "uri": "mongodb://127.0.0.1:27017/suricata_soc",
    "totalEvents": 582,
    "totalAlerts": 142
  },
  "reader": {
    "active": true,
    "mode": "live",
    "eventsIngested": 582,
    "alertsIngested": 142
  },
  "realtime": {
    "connectedClients": 2
  }
}
```

### `GET /api/status`
Returns detailed metrics on the Suricata EVE log reader, including file existence, read offsets, and deployment mode (IDS vs IPS).

---

## 2. Security Alerts API

### `GET /api/alerts`
Retrieves paginated, filtered security alerts.

**Query Parameters:**
- `page` (integer, default: 1)
- `limit` (integer, default: 25, max: 200)
- `timeRange` (string: `15m`, `1h`, `24h`, `7d`, `all`)
- `startTime` (ISO-8601 date string)
- `endTime` (ISO-8601 date string)
- `severity` (comma-separated numbers: `1,2`)
- `action` (string: `ALERT`, `DROP`, `REJECT`, `PASS`)
- `protocol` (string: `TCP`, `UDP`, `ICMP`)
- `sourceIP` (string)
- `destinationIP` (string)
- `search` (string: searches signature, category, source IP, and dest IP)

**Response (200 OK):**
```json
{
  "events": [
    {
      "id": "67104ad5e4b0",
      "timestamp": "2026-10-17T08:14:22.102Z",
      "eventType": "alert",
      "sourceIP": "192.168.1.105",
      "sourcePort": 44120,
      "destinationIP": "192.168.1.50",
      "destinationPort": 80,
      "protocol": "TCP",
      "appProtocol": "http",
      "signature": "ET EXPLOIT Apache Log4j JNDI RCE Attempt (CVE-2021-44228)",
      "signatureId": 2014757,
      "category": "Attempted Administrator Privilege Gain",
      "severity": 1,
      "action": "ALERT",
      "actionEvidence": "Suricata IDS signature triggered (detection-only, packet not confirmed dropped)",
      "flowId": 1844674407370955161,
      "interface": "ens33",
      "ingestionSource": "suricata-tail"
    }
  ],
  "total": 142,
  "page": 1,
  "limit": 25,
  "totalPages": 6
}
```

### `GET /api/alerts/:id`
Retrieves a single alert event by MongoDB ObjectId or internal identifier, including the complete raw Suricata EVE record.

### `GET /api/alerts/export/csv`
Streams filtered alert records as a CSV download.
*Security note:* Values are formula-sanitized to neutralize spreadsheet formula injection (`=`, `+`, `-`, `@`).

---

## 3. Telemetry & Flow Events API

### `GET /api/events`
Returns general network telemetry records across all EVE event types (`dns`, `http`, `tls`, `ssh`, `flow`, `stats`, `alert`).

**Query Parameters:**
- `eventType`: Filter by specific type (`dns`, `tls`, etc.)
- `protocol`: Transport protocol (`TCP`, `UDP`)
- `timeRange`, `page`, `limit`, `search`

---

## 4. Aggregate Statistics API

### `GET /api/stats/overview`
Returns high-level KPI cards for the selected time window:
- `totalEvents`
- `totalAlerts`
- `criticalAlerts` (Severity 1)
- `highAlerts` (Severity 2)
- `confirmedDrops` (Explicit IPS packet drops)
- `uniqueSourceIPs`
- `enforcementMode` (`IDS (Detection Only)` vs `IPS (Active Inline)`)

### `GET /api/stats/timeline`
Returns dynamically bucketed timeseries data points for Recharts area visualization.

### `GET /api/stats/top-talkers`
Returns top 10 source IPs and top 10 destination IPs by alert count and event frequency.

### `GET /api/stats/signatures`
Returns the 10 most frequently triggered Suricata signatures with category and severity.

### `GET /api/stats/protocols`
Returns transport layer and application layer protocol distribution.

---

## 5. Lab Testing & Ingestion API

### `POST /api/demo/generate`
Injects simulated traffic scenario:
- `scenario`: `kali-nmap` | `kali-log4j` | `kali-sqli` | `kali-ssh-brute` | `malware-c2` | `ips-drop-scenario`

### `POST /api/events/ingest`
Direct JSON injection endpoint for automated testing pipelines.

---

## 6. Socket.IO Real-Time Channels

| Channel | Direction | Payload | Description |
|---|---|---|---|
| `security:connected` | Server -> Client | `{ clientId, connectedAt }` | Initial connection handshake |
| `security:alert` | Server -> Client | `NormalizedSecurityEvent` | Emitted when a new alert arrives |
| `security:event` | Server -> Client | `NormalizedSecurityEvent` | Emitted for all EVE telemetry events |
| `security:status` | Server -> Client | `IngestionStatus` | Emitted on file rotation or status change |
| `security:stats_tick` | Server -> Client | `{ timestamp }` | Throttled trigger to refresh charts |
