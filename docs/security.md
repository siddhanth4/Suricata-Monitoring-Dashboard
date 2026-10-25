# Suricata SOC Monitor: Security Considerations & Threat Modeling

This document details the security controls and defensive engineering practices implemented in the Suricata SOC Monitor application.

---

## 1. Least-Privilege Execution Model

- **No Root Privileges**: The Node.js application and Express server must never be executed under `root` or `sudo`. Reading Suricata logs is accomplished through file group permissions (`chmod 644` or `suricata` user group membership), ensuring that an application vulnerability cannot compromise host root privileges.
- **No Arbitrary Shell Execution**: The application does not expose endpoints or mechanisms to execute arbitrary shell commands or modify system network interfaces.

---

## 2. Mitigation of CSV Spreadsheet Formula Injection (CSV Injection)

When exporting filtered security alerts to CSV (`/api/alerts/export/csv`), malicious actors may craft network payloads containing formula injection characters (e.g. User-Agent strings or DNS names starting with `=CMD|' /C ...'`).

In `server/controllers/alertController.ts`, all exported fields pass through `sanitizeCsvCell()`:
```typescript
if (/^[=+\-@\t\r]/.test(str)) {
  str = `'${str}`; // Neutralizes execution in Excel, Calc, and Sheets
}
```
This guarantees that opened CSV files cannot execute arbitrary commands on analyst workstations.

---

## 3. Real-Time Telemetry Data Redaction

WebSocket broadcasts emitted over Socket.IO (`security:alert` and `security:event`) are strictly sanitized:
- Filesystem paths (`SURICATA_EVE_PATH`) are not exposed to the browser client.
- Database connection URIs, credentials, and internal MongoDB object versions are stripped.
- Raw network packet payloads containing potentially sensitive internal company credentials or customer PII are redacted from default broadcasts.

---

## 4. API Security & Input Validation

- **Helmet**: Secures HTTP response headers against clickjacking, MIME-sniffing, and cross-site scripting.
- **CORS Protection**: Restricted to explicit `CLIENT_ORIGIN` hosts rather than unrestricted wildcard origins in production.
- **MongoDB Query Sanitization**: The API strictly constructs MongoDB query operators in backend controllers and never passes raw, unvalidated query objects from the client into Mongoose, preventing NoSQL injection.

---

## 5. Authorized Lab Testing Notice

All penetration testing scenarios and attack traffic generation (e.g., from Kali Linux using Nmap, Nikto, sqlmap, or Hydra) must be conducted exclusively against network subnets and virtual machines owned by the operator or under explicit written authorization.
