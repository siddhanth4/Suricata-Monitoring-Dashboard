import { io, Socket } from 'socket.io-client';
import { SecurityEvent } from '../types.ts';

export type ConnectionState = 'connected' | 'reconnecting' | 'disconnected';

class SocketClientManager {
  private socket: Socket | null = null;
  private state: ConnectionState = 'disconnected';
  private stateListeners: Set<(state: ConnectionState) => void> = new Set();
  private alertListeners: Set<(event: SecurityEvent) => void> = new Set();
  private eventListeners: Set<(event: SecurityEvent) => void> = new Set();
  private statusListeners: Set<(status: any) => void> = new Set();
  private statsTickListeners: Set<() => void> = new Set();

  public connect(): void {
    if (this.socket) {
      return;
    }

    this.updateState('reconnecting');

    // Connect to current origin
    this.socket = io({
      transports: ['websocket', 'polling'],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected to backend');
      this.updateState('connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('[Socket] Disconnected:', reason);
      this.updateState('disconnected');
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
      this.updateState('reconnecting');
    });

    this.socket.on('security:alert', (data: SecurityEvent) => {
      this.alertListeners.forEach((fn) => fn(data));
    });

    this.socket.on('security:event', (data: SecurityEvent) => {
      this.eventListeners.forEach((fn) => fn(data));
    });

    this.socket.on('security:status', (status: any) => {
      this.statusListeners.forEach((fn) => fn(status));
    });

    this.socket.on('security:stats_tick', () => {
      this.statsTickListeners.forEach((fn) => fn());
    });
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.updateState('disconnected');
  }

  public getState(): ConnectionState {
    return this.state;
  }

  private updateState(newState: ConnectionState): void {
    this.state = newState;
    this.stateListeners.forEach((fn) => fn(newState));
  }

  public onStateChange(listener: (state: ConnectionState) => void): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => this.stateListeners.delete(listener);
  }

  public onAlert(listener: (event: SecurityEvent) => void): () => void {
    this.alertListeners.add(listener);
    return () => this.alertListeners.delete(listener);
  }

  public onEvent(listener: (event: SecurityEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  public onStatus(listener: (status: any) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  public onStatsTick(listener: () => void): () => void {
    this.statsTickListeners.add(listener);
    return () => this.statsTickListeners.delete(listener);
  }
}

export const socketClient = new SocketClientManager();
