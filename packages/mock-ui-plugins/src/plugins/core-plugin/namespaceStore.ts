import { createSharedStore } from "@scalprum/core";
import { useGetState } from "@scalprum/react-core";
import { useScalprum } from "@scalprum/react-core";
import { useEffect, useRef } from "react";

// --- Namespace shape (matches the REST API / transform output) ---

export interface Namespace {
  id: string;
  cluster_id: string;
  name: string;
  status: string;
  podCount: number;
}

// --- K8s V1Namespace → Namespace transform (client-side) ---

interface K8sV1Namespace {
  metadata?: {
    uid?: string;
    name?: string;
  };
  status?: {
    phase?: string;
  };
}

function transformK8sNamespace(
  raw: K8sV1Namespace,
  clusterId: string,
): Namespace {
  const name = raw.metadata?.name ?? "unknown";
  return {
    id: raw.metadata?.uid ?? `${clusterId}-${name}`,
    cluster_id: clusterId,
    name,
    status: raw.status?.phase ?? "Active",
    podCount: 0,
  };
}

// --- Store ---

const EVENTS = ["ADDED", "MODIFIED", "DELETED"] as const;

interface NamespaceStoreState {
  namespaces: Record<string, Namespace>;
  loading: boolean;
}

type NamespaceStore = ReturnType<
  typeof createSharedStore<NamespaceStoreState, typeof EVENTS>
>;

let store: NamespaceStore | null = null;
let initialized = false;

function getStore(): NamespaceStore {
  if (!store) {
    store = createSharedStore<NamespaceStoreState, typeof EVENTS>({
      initialState: { namespaces: {}, loading: true },
      events: EVENTS,
      onEventChange: (state, event, payload) => {
        switch (event) {
          case "ADDED":
          case "MODIFIED": {
            const ns = payload as Namespace;
            return {
              namespaces: { ...state.namespaces, [ns.id]: ns },
              loading: false,
            };
          }
          case "DELETED": {
            const ns = payload as Namespace;
            const { [ns.id]: _, ...namespaces } = state.namespaces;
            return { namespaces, loading: false };
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
 * Shared namespace store hook.
 * On first use: fetches namespaces via REST, subscribes to WS events.
 * Returns the live namespace list.
 */
export function useNamespaceStore(): {
  namespaces: Namespace[];
  loading: boolean;
} {
  const { api } = useScalprum<{ api: FleetShiftApi }>();
  const s = getStore();
  const state = useGetState(s);
  const apiRef = useRef(api);
  apiRef.current = api;

  useEffect(() => {
    if (initialized) return;
    initialized = true;

    const clusterIds = api.fleetshift.getClusterIdsForPlugin("core");

    Promise.all(
      clusterIds.map((id) =>
        fetch(`${api.fleetshift.apiBase}/clusters/${id}/namespaces`)
          .then((res) => (res.ok ? res.json() : []))
          .then((namespaces: Namespace[]) => namespaces),
      ),
    ).then((results) => {
      for (const namespaces of results) {
        for (const ns of namespaces) {
          s.updateState("ADDED", ns);
        }
      }
    });

    const unsubNamespaces = api.fleetshift.on(
      "namespaces",
      (event: { verb: string; cluster: string; object: K8sV1Namespace }) => {
        const ns = transformK8sNamespace(event.object, event.cluster);
        s.updateState(event.verb as (typeof EVENTS)[number], ns);
      },
    );

    return () => {
      unsubNamespaces();
    };
  }, [api, s]);

  return {
    namespaces: Object.values(state.namespaces),
    loading: state.loading,
  };
}

export default useNamespaceStore;
