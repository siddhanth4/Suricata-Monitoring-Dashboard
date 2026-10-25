import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import apiRoutes from './routes/api.ts';

const app = express();

// Security headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled for seamless Vite dev server compatibility and iframe embedding
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
const allowedOrigin = process.env.CLIENT_ORIGIN || '*';
app.use(
  cors({
    origin: allowedOrigin === '*' ? true : [allowedOrigin, 'http://localhost:3000'],
    credentials: true,
  })
);

// Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mount REST API routes
app.use('/api', apiRoutes);

// Simple root API ping
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    service: 'Suricata SOC Monitor API',
    version: '1.0.0',
    status: 'online',
    docs: '/docs/api-reference.md',
  });
});

// Generic 404 for unmatched /api routes
app.use('/api/*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.originalUrl,
  });
});

// Centralized error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Server Error]', err);
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: message });
});

export default app;
