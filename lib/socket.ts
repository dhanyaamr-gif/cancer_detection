/**
 * NovaDx Socket.IO Client
 * 
 * Real-time connection for live dashboard updates,
 * notifications, and data synchronization.
 */

import { getToken } from './api';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

// We use a dynamic import approach to avoid issues with SSR
let io: any = null;
let socket: any = null;
let listeners: Map<string, Set<(...args: any[]) => void>> = new Map();
let reconnectTimer: NodeJS.Timeout | null = null;

/**
 * Get the Socket.IO instance (lazy loaded)
 */
async function getIO() {
  if (!io) {
    try {
      const socketIO = await import('socket.io-client');
      io = socketIO.default || socketIO;
    } catch {
      console.warn('Socket.IO client not available');
      return null;
    }
  }
  return io;
}

/**
 * Connect to the Socket.IO server
 */
export async function connectSocket(): Promise<boolean> {
  if (socket?.connected) return true;

  const token = getToken();
  if (!token) return false;

  const ioClient = await getIO();
  if (!ioClient) return false;

  try {
    socket = ioClient(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    });

    socket.on('disconnect', (reason: string) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (error: Error) => {
      console.error('[Socket] Connection error:', error.message);
    });

// Re-register all listeners on reconnect
    socket.on('connect', () => {
      // No need to re-register - listeners are already registered directly on the socket
      // via onSocketEvent. The listeners map is kept for cleanup purposes.
    });

    return true;
  } catch (error) {
    console.error('[Socket] Failed to connect:', error);
    return false;
  }
}

/**
 * Disconnect from the Socket.IO server
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  listeners.clear();
}

/**
 * Listen for an event
 */
export function onSocketEvent(
  event: string,
  callback: (...args: any[]) => void
): () => void {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event)!.add(callback);

  if (socket) {
    socket.on(event, callback);
  }

  // Return unsubscribe function
  return () => {
    if (socket) {
      socket.off(event, callback);
    }
    listeners.get(event)?.delete(callback);
  };
}

/**
 * Emit an event
 */
export function emitSocketEvent(event: string, ...args: any[]): void {
  if (socket?.connected) {
    socket.emit(event, ...args);
  }
}

/**
 * Subscribe to updates for a specific patient
 */
export function subscribeToPatient(patientId: string): void {
  emitSocketEvent('subscribe:patient', patientId);
}

/**
 * Unsubscribe from patient updates
 */
export function unsubscribeFromPatient(patientId: string): void {
  emitSocketEvent('unsubscribe:patient', patientId);
}

/**
 * Check if socket is connected
 */
export function isConnected(): boolean {
  return socket?.connected || false;
}

// ============================================================
// EVENT CONSTANTS
// ============================================================

export const SOCKET_EVENTS = {
  ANALYSIS_COMPLETED: 'analysis:completed',
  NOTIFICATION_NEW: 'notification:new',
  DASHBOARD_UPDATE: 'dashboard:update',
  PATIENTS_UPDATE: 'patients:update',
  HISTORY_UPDATE: 'history:update',
  REPORTS_UPDATE: 'reports:update',
} as const;

