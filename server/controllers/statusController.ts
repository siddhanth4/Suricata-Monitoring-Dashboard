import { Request, Response } from 'express';
import { DatabaseService } from '../config/database.ts';
import { SuricataReader } from '../services/suricataReader.ts';
import { SocketService } from '../services/socketService.ts';

export class StatusController {
  public static async getHealth(_req: Request, res: Response): Promise<void> {
    try {
      const memory = process.memoryUsage();
      const dbStatus = DatabaseService.getStatus();
      const readerStatus = SuricataReader.getStatus();

      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        memory: {
          heapUsedMb: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
          heapTotalMb: Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100,
          rssMb: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
        },
        database: dbStatus,
        reader: {
          active: readerStatus.active,
          mode: readerStatus.mode,
          eventsIngested: readerStatus.eventsReadCount,
          alertsIngested: readerStatus.alertsReadCount,
        },
        realtime: {
          connectedClients: SocketService.getConnectedClientsCount(),
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ status: 'unhealthy', error: msg });
    }
  }

  public static async getStatus(_req: Request, res: Response): Promise<void> {
    try {
      const readerStatus = SuricataReader.getStatus();
      const dbStatus = DatabaseService.getStatus();

      res.json({
        suricata: readerStatus,
        database: dbStatus,
        serverTime: new Date().toISOString(),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: 'Failed to retrieve system status', details: msg });
    }
  }

  public static async generateDemoTraffic(req: Request, res: Response): Promise<void> {
    try {
      const { scenario = 'kali-nmap' } = req.body || {};
      const validScenarios = [
        'kali-nmap',
        'kali-log4j',
        'kali-sqli',
        'kali-ssh-brute',
        'malware-c2',
        'ips-drop-scenario',
        'dns-telemetry',
        'flow-telemetry',
      ];

      const chosen = validScenarios.includes(scenario) ? scenario : 'kali-nmap';
      const events = await SuricataReader.generateSimulatedTraffic(chosen);

      res.json({
        success: true,
        scenario: chosen,
        eventsGenerated: events.length,
        events: events.map((e) => ({
          id: e.id,
          timestamp: e.timestamp,
          signature: e.signature,
          severity: e.severity,
          action: e.action,
        })),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: 'Failed to generate demo traffic', details: msg });
    }
  }

  public static async ingestManualEvent(req: Request, res: Response): Promise<void> {
    try {
      const rawPayload = req.body;
      const jsonLine = typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload);

      const event = await SuricataReader.processSingleLine(jsonLine, 'api-ingest');
      if (!event) {
        res.status(400).json({ error: 'Invalid EVE JSON line' });
        return;
      }

      res.status(201).json({
        success: true,
        event: {
          id: event.id,
          timestamp: event.timestamp,
          signature: event.signature,
          action: event.action,
          severity: event.severity,
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: 'Failed to ingest event', details: msg });
    }
  }
}
