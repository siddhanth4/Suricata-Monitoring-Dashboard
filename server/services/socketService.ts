import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { IngestionStatus, NormalizedSecurityEvent } from '../types/index.ts';

export class SocketService {
  private static io: SocketIOServer | null = null;
  private static connectedClientsCount = 0;
  private static statsTickTimer: NodeJS.Timeout | null = null;
  private static pendingStatsBroadcast = false;

  public static initialize(httpServer: HttpServer, allowedOrigin: string = '*'): void {
    if (this.io) {
      return;
    }

    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: allowedOrigin === '*' ? true : [allowedOrigin, 'http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingInterval: 25000,
      pingTimeout: 20000,
    });

    this.io.on('connection', (socket: Socket) => {
      this.connectedClientsCount++;
      console.log(`[Socket.IO] Client connected: ${socket.id} (Total: ${this.connectedClientsCount})`);

      // Greet newly connected client with initial connection ack
      socket.emit('security:connected', {
        clientId: socket.id,
        connectedAt: new Date().toISOString(),
      });

      socket.on('disconnect', (reason) => {
        this.connectedClientsCount = Math.max(0, this.connectedClientsCount - 1);
        console.log(`[Socket.IO] Client disconnected: ${socket.id} (${reason}) (Total: ${this.connectedClientsCount})`);
      });

      socket.on('error', (err) => {
        console.error(`[Socket.IO] Socket error (${socket.id}):`, err);
      });
    });

    // Schedule throttled stats ticks (every 3 seconds if events arrived)
    this.statsTickTimer = setInterval(() => {
      if (this.pendingStatsBroadcast && this.io) {
        this.io.emit('security:stats_tick', { timestamp: new Date().toISOString() });
        this.pendingStatsBroadcast = false;
      }
    }, 3000);
  }

  public static getConnectedClientsCount(): number {
    return this.connectedClientsCount;
  }

  /**
   * Broadcast a normalized security event
   */
  public static broadcastEvent(event: NormalizedSecurityEvent): void {
    if (!this.io) return;

    // Sanitize event payload to ensure sensitive data is not leaked
    const sanitized = {
      id: event.id,
      timestamp: event.timestamp,
      eventType: event.eventType,
      sourceIP: event.sourceIP,
      sourcePort: event.sourcePort,
      destinationIP: event.destinationIP,
      destinationPort: event.destinationPort,
      protocol: event.protocol,
      appProtocol: event.appProtocol,
      signature: event.signature,
      signatureId: event.signatureId,
      category: event.category,
      severity: event.severity,
      action: event.action,
      actionEvidence: event.actionEvidence,
      flowId: event.flowId,
      interface: event.interface,
      ingestionSource: event.ingestionSource,
    };

    // Broadcast generic event
    this.io.emit('security:event', sanitized);

    // If alert, emit dedicated security:alert channel
    if (event.eventType === 'alert') {
      this.io.emit('security:alert', sanitized);
    }

    this.pendingStatsBroadcast = true;
  }

  /**
   * Broadcast ingestion or database status update
   */
  public static broadcastStatus(status: Partial<IngestionStatus>): void {
    if (!this.io) return;
    this.io.emit('security:status', status);
  }
}
