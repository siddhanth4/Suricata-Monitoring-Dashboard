import http from 'http';
import path from 'path';
import fs from 'fs';
import express from 'express';
import dotenv from 'dotenv';
import app from './server/app.ts';
import { DatabaseService } from './server/config/database.ts';
import { SocketService } from './server/services/socketService.ts';
import { SuricataReader } from './server/services/suricataReader.ts';

// Load environment variables
dotenv.config();

const PORT = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

async function bootstrap() {
  const httpServer = http.createServer(app);

  // Initialize Socket.IO
  const clientOrigin = process.env.CLIENT_ORIGIN || '*';
  SocketService.initialize(httpServer, clientOrigin);

  // Initialize Database (MongoDB with resilient fallback)
  DatabaseService.initialize();

  // Initialize Suricata log reader & telemetry engine
  SuricataReader.initialize();

  // Vite middleware in development vs static serving in production
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[Server] Vite middleware mounted for development.');
  } else {
    const distPath = path.resolve('dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
      console.log(`[Server] Serving production build from ${distPath}`);
    } else {
      console.warn(`[Server] Production dist directory not found at ${distPath}`);
    }
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`  🛡️  Suricata SOC Monitor Server Running`);
    console.log(`  🌐  URL: http://localhost:${PORT}`);
    console.log(`  📊  REST API: http://localhost:${PORT}/api/health`);
    console.log(`  ⚡  Socket.IO: Ready for real-time alert broadcasts`);
    console.log(`=======================================================`);
  });
}

bootstrap().catch((err) => {
  console.error('[Server] Fatal bootstrap error:', err);
  process.exit(1);
});
