import { createSharedStore } from "@scalprum/core";
import { useGetState } from "@scalprum/react-core";
import { useScalprum } from "@scalprum/react-core";
import { useEffect, useRef } from "react";

// --- PVC shape (matches the REST API / transform output) ---

export interface PVC {
  id: string;
  cluster_id: string;
  namespace_id: string;
  name: string;
  namespace: string;
  status: string;
  capacity: string;
  storage_class: string;
  pv_name: string | null;
}

// --- K8s V1PersistentVolumeClaim → PVC transform (client-side) ---

interface K8sV1PVC {
  metadata?: { uid?: string; name?: string; namespace?: string };
  spec?: {
    storageClassName?: string;
    resources?: { requests?: { storage?: string } };
    volumeName?: string;
  };
  status?: { phase?: string };
}

function transformK8sPVC(raw: K8sV1PVC, clusterId: string): PVC {
  const name = raw.metadata?.name ?? "unknown";
  const namespace = raw.metadata?.namespace ?? "default";

  return {
    id: raw.metadata?.uid ?? `${clusterId}-${namespace}-${name}`,
    cluster_id: clusterId,
    namespace_id: `${clusterId}-${namespace}`,
    name,
    namespace,
    status: raw.status?.phase ?? "Pending",
    capacity: raw.spec?.resources?.requests?.storage ?? "0",
    storage_class: raw.spec?.storageClassName ?? "",
    pv_name: raw.spec?.volumeName ?? null,
  };
}

// --- Store ---

const EVENTS = ["ADDED", "MODIFIED", "DELETED"] as const;

interface PVCStoreState {
  pvcs: Record<string, PVC>;
  loading: boolean;
}

type PVCStore = ReturnType<
  typeof createSharedStore<PVCStoreState, typeof EVENTS>
>;

let store: PVCStore | null = null;
let initialized = false;

function getStore(): PVCStore {
  if (!store) {
    store = createSharedStore<PVCStoreState, typeof EVENTS>({
      initialState: { pvcs: {}, loading: true },
      events: EVENTS,
      onEventChange: (state, event, payload) => {
        switch (event) {
          case "ADDED":
          case "MODIFIED": {
            const pvc = payload as PVC;
            return {
              pvcs: { ...state.pvcs, [pvc.id]: pvc },
              loading: false,
            };
          }
          case "DELETED": {
            const pvc = payload as PVC;
            const { [pvc.id]: _, ...pvcs } = state.pvcs;
            return { pvcs, loading: false };
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

function extractNamespace(namespaceId: string, clusterId: string): string {
  return namespaceId.startsWith(clusterId + "-")
    ? namespaceId.slice(clusterId.length + 1)
    : namespaceId;
}

/**
 * Shared PVC store hook.
 * On first use: fetches PVCs via REST, subscribes to WS events.
 * Returns the live PVC list.
 */
export function usePVCStore(): {
  pvcs: PVC[];
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

    const clusterIds = api.fleetshift.getClusterIdsForPlugin("storage");

    Promise.all(
      clusterIds.map((id) =>
        fetch(`${api.fleetshift.apiBase}/clusters/${id}/pvcs`)
          .then((res) => (res.ok ? res.json() : []))
          .then(
            (
              pvcs: Array<
                Omit<PVC, "namespace"> & { namespace_id?: string }
              >,
            ) =>
              pvcs.map((pvc) => ({
                ...pvc,
                namespace:
                  (pvc as PVC).namespace ??
                  extractNamespace(
                    pvc.namespace_id ?? "",
                    pvc.cluster_id,
                  ),
              })),
          ),
      ),
    ).then((results) => {
      for (const pvcs of results) {
        for (const pvc of pvcs) {
          s.updateState("ADDED", pvc);
        }
      }
    });

    const unsub = api.fleetshift.on(
      "persistentvolumeclaims",
      (event: { verb: string; cluster: string; object: K8sV1PVC }) => {
        const pvc = transformK8sPVC(event.object, event.cluster);
        s.updateState(event.verb as (typeof EVENTS)[number], pvc);
      },
    );

    return () => {
      unsub();
    };
  }, [api, s]);

  return {
    pvcs: Object.values(state.pvcs),
    loading: state.loading,
  };
}

export default usePVCStore;
