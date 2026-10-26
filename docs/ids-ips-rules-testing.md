# Suricata IDS/IPS Rules and Testing Guide

This document explains the existing rules and the verified demo workflow for the Suricata SOC Monitor lab. It is intended for systems you own or are explicitly authorized to test.

**Do not add rules as part of these tests.** The commands below use the existing rule file and signatures described in the project notes. Before relying on any SID, confirm that the active configuration loads it.

## 1. Lab topology

| System | Address | Interface |
|---|---|---|
| Kali Linux test VM | `192.168.194.129` | `eth0` |
| Ubuntu Suricata VM | `192.168.194.132` | `ens33` |
| HTTP test server on Ubuntu | `192.168.194.132:8080` | Python HTTP server |

Verify addresses first:

```bash
# Ubuntu
ip -brief address show
hostname -I

# Kali
ip -brief address show
```

## 2. IDS vs IPS: how to explain it

### IDS — AF-PACKET

- Suricata captures packets from the configured interface (`ens33` in this lab).
- It evaluates the traffic against loaded signatures.
- Matching `alert` rules create events in `eve.json` and often `fast.log`.
- This is the passive monitoring demonstration. Do not describe an IDS alert as proof that traffic was blocked.

Candidate configuration:

```text
/etc/suricata/suricata.yaml.pre-nfq-ips
```

The filename is not proof of mode. Validate it and inspect the AF-PACKET interface and rule path before the demo:

```bash
sudo suricata -T -c /etc/suricata/suricata.yaml.pre-nfq-ips
sudo sed -n '650,710p' /etc/suricata/suricata.yaml.pre-nfq-ips
sudo sed -n '2295,2330p' /etc/suricata/suricata.yaml.pre-nfq-ips
```

### IPS — NFQUEUE

- The normal systemd service runs Suricata using `-q 0` and `/etc/suricata/suricata.yaml`.
- A service override runs `/usr/local/sbin/suricata-nfq-iptables` to manage NFQUEUE rules.
- In this lab, the queue rules are scoped to TCP port `8080` between Kali and Ubuntu.
- A matching `drop` rule discards queued traffic; `reject` attempts to actively reject it.
- A rule can only enforce prevention if the packet traverses the NFQUEUE path and the active ruleset/configuration supports the action.

Inspect the active service and queue:

```bash
sudo systemctl show suricata -p ExecStart
sudo systemctl cat suricata
ps -eo pid,args | grep '[s]uricata'
sudo iptables -vnL INPUT
sudo iptables -vnL OUTPUT
```

Do not add broad catch-all NFQUEUE rules manually on top of the service-managed rules.

## 3. Rule interpretation

A Suricata signature generally has an action, protocol, source/destination direction and match options. For example:

```suricata
alert tcp any any -> $HOME_NET 21 (msg:"Possible FTP Brute Force - Repeated Connection Attempts"; flags:S; flow:stateless; detection_filter:track by_src, count 10, seconds 60; priority:2; sid:1000007; rev:2;)
```

- `alert`: report a match; it does not block.
- `tcp`: inspect TCP packets.
- `any any -> $HOME_NET 21`: any source IP/port to a destination in `$HOME_NET`, TCP port 21.
- `flags:S`: match SYN packets.
- `flow:stateless`: does not require a fully established flow.
- `detection_filter:track by_src, count 10, seconds 60`: track matching packets per source over a 60-second interval; alerts occur after the threshold is reached and can recur on subsequent matches.
- `priority:2`: rule priority, not proof of exploit success.
- `sid`: signature identifier; it should be unique among loaded rules.
- `rev`: rule revision.

**Important distinction:** the FTP-port rule counts repeated TCP SYN connection attempts. It does not inspect FTP credentials or prove failed login attempts. Its message is a heuristic label.

## 4. Existing rules known in this lab

The active file reported in this lab is:

```text
/var/lib/suricata/rules/local.rules
```

Confirm the actual file contents before a demo:

```bash
sudo grep -nE 'sid:1000007|sid:1000009|sid:1000012|sid:1000013|sid:1000014|sid:1000015|sid:1000016|sid:1000017|sid:1000018|sid:1000019|sid:1000020|sid:1000021|sid:1000022|sid:1000023' /var/lib/suricata/rules/local.rules
```

Known existing signatures from the lab include:

| SID | Message / purpose | Action and matching behavior | Test / important note |
|---|---|---|---|
| `1000007` | Possible FTP Brute Force — Repeated Connection Attempts | `alert`; TCP SYN packets to `$HOME_NET:21`; threshold of 10 matches in 60 seconds per source | Send at least 10 SYN probes from Kali to Ubuntu TCP/21. It is a connection-attempt heuristic, not login-failure detection. |
| `1000009` | SQL Injection Attempt — OR 1=1 Pattern | `alert`; HTTP URI containing `1=1` | Use a request to the Ubuntu HTTP test service; traffic must be visible to Suricata. |
| `1000012` | Directory Traversal Blocked | `drop`; raw HTTP URI contains `../`, destination port 8080 | Test only through the configured IPS/NFQUEUE path. |
| `1000013` | Passwd File Access Blocked | `drop`; HTTP raw URI contains `/etc/passwd`, destination port any | The lab's queue rules may be narrower than this rule; verify traffic is queued. |
| `1000014` | PowerShell Activity Blocked | `drop`; HTTP request body contains `powershell` case-insensitively, destination port 8080 | Requires a matching HTTP request body and inline path. |
| `1000015` | Reverse Shell Blocked | `drop`; TCP payload content contains `/bin/sh` case-insensitively | Payload matching depends on traffic visibility and stream/application handling. |
| `1000016` | Ransomware Extension Detected | `drop`; raw HTTP URI contains `.locked`, case-insensitively, destination port 8080 | The signature detects a URI pattern; it does not establish ransomware execution. |
| `1000017` | Remote Code Execution Attempt Detected | `reject`; HTTP request body contains `system(`, destination port 8080 | A test request body can match. Check EVE verdict and client outcome. |
| `1000018` | PHP Web Shell Upload Attempt | `reject`; HTTP request body contains `shell.php`, destination port 8080 | Pattern detection only; it does not prove a web shell was installed. |
| `1000019` | SQL Injection Pattern Blocked | `drop`; HTTP URI contains `UNION SELECT`, destination port 8080 | Send a harmless test URI containing the pattern. |
| `1000020` | Suspicious Command Parameter Blocked | `drop`; HTTP URI contains `cmd=`, destination port 8080 | Pattern match only; legitimate URIs can false-positive. |
| `1000021` | Suspicious Script Tag Blocked | `drop`; HTTP request body contains `<script`, destination port 8080 | Requires body inspection and inline queueing. |
| `1000022` | SQL Injection Boolean Pattern Blocked | `drop`; HTTP URI contains `OR` followed by `1=1` within the configured distance/window, destination port 8080 | The two content matches are positional; URL normalization can affect what is inspected. |
| `1000023` | PHP Suspicious Content Blocked | `drop`; HTTP request body contains `<?php` followed by `system(` within the configured window, destination port 8080 | Request body must contain both patterns in the required order. |

The table is based on the rule definitions recorded during this lab. If the actual `local.rules` file differs, the file currently loaded by Suricata is authoritative. These rules are custom lab signatures, not automatically Emerging Threats (ET) rules.

## 5. IDS demo: test SID 1000007

### Step 1 — Switch to AF-PACKET IDS

On Ubuntu, first validate the candidate config (Section 2). Then:

```bash
sudo systemctl stop suricata
sudo systemctl status suricata --no-pager
sudo iptables -vnL INPUT
sudo iptables -vnL OUTPUT
```

Confirm the service is stopped and its managed queue rules are removed. Start the foreground IDS:

```bash
sudo suricata --af-packet -c /etc/suricata/suricata.yaml.pre-nfq-ips
```

Keep it running. In another Ubuntu terminal:

```bash
sudo tail -f /var/log/suricata/fast.log
```

### Step 2 — Generate SYN probes from Kali

Check that `nping` is available first:

```bash
command -v nping
```

If present, run only against your Ubuntu lab VM:

```bash
sudo nping --tcp -p 21 --flags syn --count 12 192.168.194.132
```

The rule matches SYN packets to destination TCP/21. It is not necessary for an FTP service to be listening for Suricata to observe SYNs, but network connectivity and interface visibility are necessary.

### Step 3 — Verify the event on Ubuntu

```bash
sudo grep '1000007' /var/log/suricata/fast.log | tail -n 20
sudo jq -c 'select(.event_type=="alert" and .alert.signature_id==1000007) | {timestamp,src_ip,src_port,dest_ip,dest_port,alert:.alert}' /var/log/suricata/eve.json | tail -n 20
```

The rule may produce more than one alert event after its threshold is reached. Alert count is not guaranteed to equal the 12 probes, and identical endpoint fields do not alone prove duplicate ingestion.

### Step 4 — Verify the dashboard

Keep the Node.js backend and browser dashboard running on Windows. Confirm the same SID, timestamp, source/destination IP and port appear in the live feed.

If the dashboard displays two apparently identical rows:

1. Compare raw `eve.json` and `fast.log`.
2. If both raw logs have two alert records, Suricata emitted two records; inspect their timestamps and packet details before calling them duplicates.
3. If raw logs have one event but the dashboard has two rows, investigate backend replay/reconnect handling or frontend state insertion.
4. Do not deduplicate solely by SID and five-tuple: distinct alerts can legitimately share those fields.

Stop foreground IDS with `Ctrl+C` before switching to IPS.

## 6. IPS demo: test existing HTTP rules

### Step 1 — Start the normal service

On Ubuntu:

```bash
sudo systemctl start suricata
sudo systemctl status suricata --no-pager -l
ps -eo pid,args | grep '[s]uricata'
sudo iptables -vnL INPUT
sudo iptables -vnL OUTPUT
```

Confirm the process uses `/etc/suricata/suricata.yaml` with `-q 0`. Verify the managed NFQUEUE rules and their counters. Do not continue to claim IPS enforcement if the service is not running in queue mode.

### Step 2 — Ensure the test HTTP server is running

In a separate Ubuntu terminal, if the existing server is not already running:

```bash
python3 -m http.server 8080 --bind 192.168.194.132 --directory ~/suricata-ips-lab/empty
```

This is a simple test server, not a production application. Keep it running while testing.

### Step 3 — Send existing rule-matching requests from Kali

Test the PHP/system pattern (known to trigger SIDs `1000017` and `1000023` in this lab):

```bash
curl --max-time 5 -X POST --data-binary 'system("test")' http://192.168.194.132:8080/
```

Test the SQL boolean pattern (known to trigger SIDs `1000022` and `1000009` in this lab):

```bash
curl --max-time 5 'http://192.168.194.132:8080/?q=OR%201=1'
```

These requests are for a local lab only. They do not execute an exploit against a real application; they test signature matching on the HTTP request.

### Step 4 — Confirm alert and enforcement evidence

On Ubuntu:

```bash
sudo tail -n 30 /var/log/suricata/fast.log
sudo jq -c 'select(.event_type=="alert" and (.alert.signature_id as $sid | [1000017,1000022,1000023,1000009] | index($sid))) | {timestamp,src_ip,src_port,dest_ip,dest_port,alert:.alert,verdict:.verdict}' /var/log/suricata/eve.json
```

If that `jq` filter is inconvenient, use individual SIDs:

```bash
sudo grep -E '1000017|1000022|1000023|1000009' /var/log/suricata/fast.log
```

Check the dashboard for the same events. Do not use `alert.action:"blocked"` alone as proof of a drop/reject: inspect `verdict.action` where available, the active rule action, NFQUEUE counters, and the request outcome. A client timeout is not sufficient evidence by itself.

## 7. Common rule-testing pitfalls

- **Wrong mode:** the current service is NFQUEUE IPS; the candidate foreground config is intended for AF-PACKET IDS. Verify the running process.
- **Wrong interface:** ensure `ens33` is the interface receiving Kali traffic.
- **Wrong HOME_NET:** `$HOME_NET` must include the protected Ubuntu address/subnet.
- **Rule not loaded:** validate the exact config and confirm the intended rules file is referenced.
- **Wrong port/path:** the IPS queue rules in this lab are scoped to TCP/8080. A rule targeting port 21 or 22 can alert in IDS mode but is not necessarily inline-blocked in the current IPS setup.
- **Threshold not reached:** SID `1000007` needs repeated matching SYNs from one source within 60 seconds.
- **False-positive interpretation:** a URI/body pattern match is not proof an exploit succeeded; a SYN-threshold alert is not proof of password brute force.
- **Duplicate display:** distinguish multiple raw Suricata events from repeated ingestion/rendering by the dashboard.
- **Changing rules:** no rules are added or modified in this guide. If you intentionally change a rule, back up the file, keep SIDs unique, validate with `suricata -T`, and reload/restart only according to the service's supported process.
