import { useEffect, useRef } from "react";

const API_BASE = "http://localhost:4000/api/v1";

// --- Unified event emitter ---
// topic → Set of callbacks

type EventCallback = (event: any) => void;
const subscribers = new Map<string, Set<EventCallback>>();

/**
 * Subscribe to events for a given topic.
 * Returns an unsubscribe function.
 *
 * Topics come directly from WS messages:
 *  - K8s informer: "pods", "nodes", etc. — payload: { type, verb, resource, cluster, object }
 *  - K8s metrics: "pod-metrics", "node-metrics" — payload: { type, resource, cluster, items }
 *  - Invalidation: "canvas_pages", "nav_layout", "clusters" — payload: { resource }
 */
export function subscribe(topic: string, callback: EventCallback): () => void {
  let subs = subscribers.get(topic);
  if (!subs) {
    subs = new Set();
    subscribers.set(topic, subs);
  }
  subs.add(callback);
  return () => {
    subs!.delete(callback);
    if (subs!.size === 0) subscribers.delete(topic);
  };
}

function emit(topic: string, event: unknown) {
  const subs = subscribers.get(topic);
  if (subs) {
    for (const cb of subs) cb(event);
  }
}

// --- WS connection ---

let sessionId: string | null = null;
let ws: WebSocket | null = null;
let activeUserId: string | null = null;
let connecting = false;

/** Returns the current session ID (available after WS handshake). */
export function getSessionId(): string | null {
  return sessionId;
}

async function fetchTicket(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/ws/ticket`, { method: "POST" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.ticket;
  } catch {
    return null;
  }
}

async function ensureConnection(userId: string) {
  if ((ws || connecting) && activeUserId === userId) return;

  if (ws) {
    ws.close();
    ws = null;
    sessionId = null;
  }

  activeUserId = userId;
  connecting = true;

  const ticket = await fetchTicket();
  if (!ticket) {
    console.error("Failed to obtain WS ticket");
    connecting = false;
    return;
  }

  const socket = new WebSocket(
    `ws://localhost:4000/ws?ticket=${encodeURIComponent(ticket)}`,
  );

  socket.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    if (msg.type === "session") {
      sessionId = msg.sessionId;
      return;
    }

    // K8s informer events — topic is the resource (e.g. "pods")
    if (msg.type === "k8s") {
      emit(msg.resource, msg);
      return;
    }

    // K8s metrics — topic is the resource (e.g. "pod-metrics")
    if (msg.type === "k8s-metrics") {
      emit(msg.resource, msg);
      return;
    }

    // Cluster connection progress events
    if (msg.type === "cluster-progress") {
      emit("cluster-progress", msg);
      return;
    }

    // Custom derived events — topic is the resource (e.g. "alerts", "logs")
    if (msg.type === "alerts" || msg.type === "logs") {
      emit(msg.resource, msg);
      return;
    }

    // Invalidation events — topic is the resource (e.g. "canvas_pages")
    if (msg.resource) {
      emit(msg.resource, msg);
    }
  };

  socket.onopen = () => {
    connecting = false;
  };

  socket.onclose = () => {
    connecting = false;
    if (ws === socket) {
      ws = null;
      sessionId = null;
      activeUserId = null;
    }
  };

  ws = socket;
}

/**
 * React hook that ensures the WS connection is open for the given user
 * and subscribes to invalidation-style events.
 * Kept for backward compat with UserPreferencesProvider.
 */
export function useInvalidationSocket(
  userId: string | undefined,
  onInvalidate: (resource: "canvas_pages" | "nav_layout" | "clusters") => void,
) {
  const handlerRef = useRef(onInvalidate);
  handlerRef.current = onInvalidate;

  useEffect(() => {
    if (!userId) return;

    ensureConnection(userId);

    const unsub1 = subscribe("canvas_pages", () =>
      handlerRef.current("canvas_pages"),
    );
    const unsub2 = subscribe("nav_layout", () =>
      handlerRef.current("nav_layout"),
    );
    const unsub3 = subscribe("clusters", () => handlerRef.current("clusters"));

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [userId]);
}
