import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { IncomingMessage } from "http";
import crypto from "crypto";

type Resource = "canvas_pages" | "nav_layout" | "clusters";

interface InvalidationMessage {
  resource: Resource;
}

interface Session {
  ws: WebSocket;
  userId: string | null;
}

let wss: WebSocketServer;

// Map sessionId → session info for origin exclusion + user scoping
const sessions = new Map<string, Session>();

// --- Ticket-based WS auth ---
// ticket → { userId, expiresAt }
interface Ticket {
  userId: string;
  expiresAt: number;
}

const pendingTickets = new Map<string, Ticket>();
const TICKET_TTL_MS = 30_000; // 30 seconds to use the ticket

/**
 * Create a one-time ticket for WS authentication.
 * Called from an authenticated HTTP endpoint.
 */
export function createWsTicket(userId: string): string {
  const ticket = crypto.randomUUID();
  pendingTickets.set(ticket, {
    userId,
    expiresAt: Date.now() + TICKET_TTL_MS,
  });
  return ticket;
}

/**
 * Validate and consume a ticket. Returns the userId or null.
 */
function consumeTicket(ticket: string): string | null {
  const entry = pendingTickets.get(ticket);
  if (!entry) return null;

  // Always delete — one-time use
  pendingTickets.delete(ticket);

  if (Date.now() > entry.expiresAt) return null;
  return entry.userId;
}

// Periodically clean expired tickets
setInterval(() => {
  const now = Date.now();
  for (const [ticket, entry] of pendingTickets) {
    if (now > entry.expiresAt) pendingTickets.delete(ticket);
  }
}, 60_000);

export function attachWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws, req: IncomingMessage) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const ticket = url.searchParams.get("ticket");

    // Authenticate via ticket
    const userId = ticket ? consumeTicket(ticket) : null;
    if (!userId) {
      ws.close(4401, "Unauthorized");
      return;
    }

    // Assign a unique session ID and send it to the client
    const sessionId = crypto.randomUUID();
    sessions.set(sessionId, { ws, userId });
    ws.send(JSON.stringify({ type: "session", sessionId }));

    ws.on("close", () => {
      sessions.delete(sessionId);
    });
  });
}

/**
 * Broadcast an invalidation signal to connected clients.
 *
 * - Skips the socket identified by `originSessionId` (the tab that made
 *   the mutation — it already updated optimistically).
 * - If `userId` is provided, only sends to sockets authenticated as
 *   that user (for per-user resources like canvas_pages / nav_layout).
 * - If `userId` is omitted, sends to all sockets (for global resources
 *   like clusters).
 */
export function broadcast(
  resource: Resource,
  opts?: { userId?: string; originSessionId?: string },
) {
  if (!wss) return;
  const msg = JSON.stringify({ resource } satisfies InvalidationMessage);

  for (const [sid, session] of sessions) {
    if (sid === opts?.originSessionId) continue; // skip origin
    // User-scoped: only send to sockets belonging to that user
    if (opts?.userId && session.userId !== opts.userId) continue;
    if (session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(msg);
    }
  }
}

/**
 * Send a message to a specific session by its session ID.
 * Used for targeted progress events during cluster connection.
 */
export function sendToSession(sessionId: string, message: unknown) {
  const session = sessions.get(sessionId);
  if (session && session.ws.readyState === WebSocket.OPEN) {
    session.ws.send(JSON.stringify(message));
  }
}

/**
 * Send a message to all authenticated sessions (those with a userId).
 * Used for K8s informer/metrics events.
 */
export function broadcastToAuthenticated(message: unknown) {
  if (!wss) return;
  const msg = JSON.stringify(message);
  for (const [, session] of sessions) {
    if (session.userId && session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(msg);
    }
  }
}
