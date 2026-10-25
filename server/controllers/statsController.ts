import { Request, Response } from 'express';
import { DatabaseService } from '../config/database.ts';
import { EventQueryParams } from '../types/index.ts';

export class StatsController {
  public static async getOverview(req: Request, res: Response): Promise<void> {
    try {
      const params: EventQueryParams = {
        timeRange: req.query.timeRange as string,
        startTime: req.query.startTime as string,
        endTime: req.query.endTime as string,
      };

      const overview = await DatabaseService.getStatsOverview(params);
      res.json(overview);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: 'Failed to calculate stats overview', details: msg });
    }
  }

  public static async getTimeline(req: Request, res: Response): Promise<void> {
    try {
      const params: EventQueryParams = {
        timeRange: req.query.timeRange as string,
        startTime: req.query.startTime as string,
        endTime: req.query.endTime as string,
      };

      const timeline = await DatabaseService.getTimeline(params);
      res.json(timeline);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: 'Failed to calculate timeline', details: msg });
    }
  }

  public static async getTopTalkers(req: Request, res: Response): Promise<void> {
    try {
      const params: EventQueryParams = {
        timeRange: req.query.timeRange as string,
        startTime: req.query.startTime as string,
        endTime: req.query.endTime as string,
      };

      const topTalkers = await DatabaseService.getTopTalkers(params);
      res.json(topTalkers);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: 'Failed to retrieve top talkers', details: msg });
    }
  }

  public static async getSignatures(req: Request, res: Response): Promise<void> {
    try {
      const params: EventQueryParams = {
        timeRange: req.query.timeRange as string,
        startTime: req.query.startTime as string,
        endTime: req.query.endTime as string,
      };

      const signatures = await DatabaseService.getSignatures(params);
      res.json(signatures);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: 'Failed to retrieve top signatures', details: msg });
    }
  }

  public static async getProtocols(req: Request, res: Response): Promise<void> {
    try {
      const params: EventQueryParams = {
        timeRange: req.query.timeRange as string,
        startTime: req.query.startTime as string,
        endTime: req.query.endTime as string,
      };

      const protocols = await DatabaseService.getProtocols(params);
      res.json(protocols);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: 'Failed to retrieve protocol distribution', details: msg });
    }
  }

  public static async getReportSummary(req: Request, res: Response): Promise<void> {
    try {
      const params: EventQueryParams = {
        timeRange: req.query.timeRange as string,
        startTime: req.query.startTime as string,
        endTime: req.query.endTime as string,
      };

      const [overview, topTalkers, signatures, protocols] = await Promise.all([
        DatabaseService.getStatsOverview(params),
        DatabaseService.getTopTalkers(params),
        DatabaseService.getSignatures(params),
        DatabaseService.getProtocols(params),
      ]);

      res.json({
        generatedAt: new Date().toISOString(),
        overview,
        topAttackers: topTalkers.sources,
        topTargets: topTalkers.destinations,
        topSignatures: signatures,
        protocols,
        auditNotice:
          'This security report represents observed Suricata EVE IDS/IPS telemetry in the specified evaluation window. Unless confirmed by inline drop rules, alerts indicate pattern matches rather than blocked intrusions.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: 'Failed to compile report summary', details: msg });
    }
  }
}
