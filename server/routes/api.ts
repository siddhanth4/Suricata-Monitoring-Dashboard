import { Router } from 'express';
import { AlertController } from '../controllers/alertController.ts';
import { StatsController } from '../controllers/statsController.ts';
import { StatusController } from '../controllers/statusController.ts';

const router = Router();

// Health & System Status
router.get('/health', StatusController.getHealth);
router.get('/status', StatusController.getStatus);

// Alerts Endpoints
router.get('/alerts/export/csv', AlertController.exportAlertsCsv);
router.get('/alerts', AlertController.getAlerts);
router.get('/alerts/:id', AlertController.getAlertById);

// Generic Telemetry Events (Flow, DNS, HTTP, TLS, SSH)
router.get('/events', AlertController.getEvents);
router.get('/events/:id', AlertController.getEventById);

// Aggregate Statistics & Analytics
router.get('/stats/overview', StatsController.getOverview);
router.get('/stats/timeline', StatsController.getTimeline);
router.get('/stats/top-talkers', StatsController.getTopTalkers);
router.get('/stats/signatures', StatsController.getSignatures);
router.get('/stats/protocols', StatsController.getProtocols);

// Threat Reports
router.get('/reports/summary', StatsController.getReportSummary);

// Ingestion & Demo Simulation
router.post('/demo/generate', StatusController.generateDemoTraffic);
router.post('/events/ingest', StatusController.ingestManualEvent);

export default router;
