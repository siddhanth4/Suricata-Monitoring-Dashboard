import { Request, Response } from 'express';
import { DatabaseService } from '../config/database.ts';
import { EventQueryParams } from '../types/index.ts';

/**
 * Sanitize strings for CSV to prevent formula injection in Excel / Calc
 */
function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let str = String(value);
  // Neutralize formula triggers
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  // Escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export class AlertController {
  public static async getAlerts(req: Request, res: Response): Promise<void> {
    try {
      const params: EventQueryParams = {
        timeRange: req.query.timeRange as string,
        startTime: req.query.startTime as string,
        endTime: req.query.endTime as string,
        sourceIP: req.query.sourceIP as string,
        destinationIP: req.query.destinationIP as string,
        signature: req.query.signature as string,
        protocol: req.query.protocol as string,
        severity: req.query.severity as string,
        action: req.query.action as string,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 25,
      };

      const result = await DatabaseService.getAlerts(params);
      res.json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: 'Failed to retrieve alerts', details: msg });
    }
  }

  public static async getAlertById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const event = await DatabaseService.getEventById(id);
      if (!event) {
        res.status(404).json({ error: 'Alert not found' });
        return;
      }
      res.json(event);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: 'Failed to retrieve alert', details: msg });
    }
  }

  public static async getEvents(req: Request, res: Response): Promise<void> {
    try {
      const params: EventQueryParams = {
        timeRange: req.query.timeRange as string,
        startTime: req.query.startTime as string,
        endTime: req.query.endTime as string,
        eventType: req.query.eventType as string,
        sourceIP: req.query.sourceIP as string,
        destinationIP: req.query.destinationIP as string,
        protocol: req.query.protocol as string,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 30,
      };

      const result = await DatabaseService.queryEvents(params);
      res.json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: 'Failed to retrieve events', details: msg });
    }
  }

  public static async getEventById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const event = await DatabaseService.getEventById(id);
      if (!event) {
        res.status(404).json({ error: 'Event not found' });
        return;
      }
      res.json(event);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: 'Failed to retrieve event', details: msg });
    }
  }

  public static async exportAlertsCsv(req: Request, res: Response): Promise<void> {
    try {
      const params: EventQueryParams = {
        timeRange: req.query.timeRange as string,
        startTime: req.query.startTime as string,
        endTime: req.query.endTime as string,
        severity: req.query.severity as string,
        action: req.query.action as string,
        search: req.query.search as string,
        limit: 1000, // Export ceiling
      };

      const { events } = await DatabaseService.getAlerts(params);

      const headers = [
        'Timestamp',
        'Severity',
        'Signature',
        'Signature_ID',
        'Category',
        'Action',
        'Protocol',
        'Source_IP',
        'Source_Port',
        'Destination_IP',
        'Destination_Port',
        'Interface',
        'Action_Evidence',
      ];

      const csvRows = [headers.join(',')];

      for (const ev of events) {
        const row = [
          sanitizeCsvCell(ev.timestamp),
          sanitizeCsvCell(ev.severity),
          sanitizeCsvCell(ev.signature),
          sanitizeCsvCell(ev.signatureId),
          sanitizeCsvCell(ev.category),
          sanitizeCsvCell(ev.action),
          sanitizeCsvCell(ev.protocol),
          sanitizeCsvCell(ev.sourceIP),
          sanitizeCsvCell(ev.sourcePort),
          sanitizeCsvCell(ev.destinationIP),
          sanitizeCsvCell(ev.destinationPort),
          sanitizeCsvCell(ev.interface),
          sanitizeCsvCell(ev.actionEvidence),
        ];
        csvRows.push(row.join(','));
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="suricata_alerts_${Date.now()}.csv"`);
      res.status(200).send(csvRows.join('\n'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: 'Failed to export CSV', details: msg });
    }
  }
}
