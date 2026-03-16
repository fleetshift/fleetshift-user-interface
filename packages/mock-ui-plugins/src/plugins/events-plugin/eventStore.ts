import { createSharedStore } from "@scalprum/core";
import { useGetState, useSubscribeStore } from "@scalprum/react-core";
import { useScalprum } from "@scalprum/react-core";
import { useEffect, useRef } from "react";

// --- Event shape (matches the REST API / transform output) ---

export interface K8sEvent {
  id: string;
  cluster_id: string;
  namespace_id: string;
  type: string;
  reason: string;
  message: string;
  source: string;
  created_at: string;
}

// --- K8s CoreV1Event → K8sEvent transform (client-side) ---

interface K8sRawEvent {
  metadata?: { uid?: string; namespace?: string; creationTimestamp?: string };
  type?: string;
  reason?: string;
  message?: string;
  source?: { component?: string };
  lastTimestamp?: string;
  involvedObject?: { name?: string };
}

function transformK8sEvent(raw: K8sRawEvent, clusterId: string): K8sEvent {
  const namespace = raw.metadata?.namespace ?? "default";

  return {
    id:
      raw.metadata?.uid ??
      `${clusterId}-${namespace}-${raw.involvedObject?.name ?? "unknown"}`,
    cluster_id: clusterId,
    namespace_id: `${clusterId}-${namespace}`,
    type: raw.type ?? "Normal",
    reason: raw.reason ?? "",
    message: raw.message ?? "",
    source: raw.source?.component ?? "",
    created_at:
      raw.lastTimestamp ??
      raw.metadata?.creationTimestamp ??
      new Date().toISOString(),
  };
}

// --- Store ---

const EVENTS = ["INIT", "ADDED", "MODIFIED", "DELETED"] as const;

interface EventStoreState {
  events: Record<string, K8sEvent>;
  loading: boolean;
}

type EventStore = ReturnType<
  typeof createSharedStore<EventStoreState, typeof EVENTS>
>;

let store: EventStore | null = null;
let initializedFor = "";

function getStore(): EventStore {
  if (!store) {
    store = createSharedStore<EventStoreState, typeof EVENTS>({
      initialState: { events: {}, loading: true },
      events: EVENTS,
      onEventChange: (state, event, payload) => {
        switch (event) {
          case "INIT": {
            const items = payload as K8sEvent[];
            const itemsMap: Record<string, K8sEvent> = {};
            for (const item of items) {
              itemsMap[item.id] = item;
            }
            return {
              ...state,
              events: { ...state.events, ...itemsMap },
              loading: false,
            };
          }
          case "ADDED":
          case "MODIFIED": {
            const k8sEvent = payload as K8sEvent;
            return {
              events: { ...state.events, [k8sEvent.id]: k8sEvent },
              loading: false,
            };
          }
          case "DELETED": {
            const k8sEvent = payload as K8sEvent;
            const { [k8sEvent.id]: _, ...events } = state.events;
            return { events, loading: false };
          }
          default:
            return state;
        }
      },
    });
  }
  return store;
}

// --- Scalprum API type ---

interface FleetShiftApi {
  fleetshift: {
    apiBase: string;
    getClusterIdsForPlugin: (pluginKey: string) => string[];
    on: (topic: string, callback: (event: any) => void) => () => void;
  };
}

// --- Hook ---

/**
 * Shared event store hook.
 * On first use: fetches events via REST, subscribes to WS events.
 * Returns the live event list.
 */
export function useEventStore(): {
  events: K8sEvent[];
  loading: boolean;
} {
  const { api } = useScalprum<{ api: FleetShiftApi }>();
  const s = getStore();
  const state = useGetState(s);
  const apiRef = useRef(api);
  apiRef.current = api;

  useEffect(() => {
    const clusterIds = api.fleetshift.getClusterIdsForPlugin("events");
    const clusterKey = clusterIds.sort().join(",");
    if (initializedFor === clusterKey) return;
    initializedFor = clusterKey;

    Promise.all(
      clusterIds.map((id) =>
        fetch(`${api.fleetshift.apiBase}/clusters/${id}/events`)
          .then((res) => (res.ok ? res.json() : []))
          .then((events: K8sEvent[]) => events)
          .catch(() => [] as K8sEvent[]),
      ),
    ).then((results) => {
      const allEvents = results.flat();
      s.updateState("INIT", allEvents);
    });

    const unsub = api.fleetshift.on(
      "events",
      (event: { verb: string; cluster: string; object: K8sRawEvent }) => {
        const k8sEvent = transformK8sEvent(event.object, event.cluster);
        s.updateState(event.verb as (typeof EVENTS)[number], k8sEvent);
      },
    );

    return () => {
      unsub();
      initializedFor = "";
    };
  }, [api, s]);

  return {
    events: Object.values(state.events),
    loading: state.loading,
  };
}

/**
 * Subscribe to a specific event store event only (e.g., only "DELETED").
 */
export function useEventStoreEvent(
  event: (typeof EVENTS)[number],
  selector: (state: EventStoreState) => K8sEvent[],
): K8sEvent[] {
  const s = getStore();
  return useSubscribeStore(s, event, selector);
}

export default useEventStore;
