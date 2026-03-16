import { createSharedStore } from "@scalprum/core";
import { useGetState } from "@scalprum/react-core";
import { useScalprum } from "@scalprum/react-core";
import { useEffect, useRef } from "react";

// --- PV shape (matches the REST API / transform output) ---

export interface PV {
  id: string;
  cluster_id: string;
  name: string;
  capacity: string;
  access_mode: string;
  status: string;
  storage_class: string;
}

// --- K8s V1PersistentVolume → PV transform (client-side) ---

interface K8sV1PV {
  metadata?: { uid?: string; name?: string };
  spec?: {
    capacity?: { storage?: string };
    accessModes?: string[];
    storageClassName?: string;
  };
  status?: { phase?: string };
}

function transformK8sPV(raw: K8sV1PV, clusterId: string): PV {
  const name = raw.metadata?.name ?? "unknown";

  return {
    id: raw.metadata?.uid ?? `${clusterId}-${name}`,
    cluster_id: clusterId,
    name,
    capacity: raw.spec?.capacity?.storage ?? "0",
    access_mode: raw.spec?.accessModes?.[0] ?? "ReadWriteOnce",
    status: raw.status?.phase ?? "Available",
    storage_class: raw.spec?.storageClassName ?? "",
  };
}

// --- Store ---

const EVENTS = ["INIT", "ADDED", "MODIFIED", "DELETED"] as const;

interface PVStoreState {
  pvs: Record<string, PV>;
  loading: boolean;
}

type PVStore = ReturnType<
  typeof createSharedStore<PVStoreState, typeof EVENTS>
>;

let store: PVStore | null = null;
let initializedFor = "";

function getStore(): PVStore {
  if (!store) {
    store = createSharedStore<PVStoreState, typeof EVENTS>({
      initialState: { pvs: {}, loading: true },
      events: EVENTS,
      onEventChange: (state, event, payload) => {
        switch (event) {
          case "INIT": {
            const items = payload as PV[];
            const itemsMap: Record<string, PV> = {};
            for (const item of items) {
              itemsMap[item.id] = item;
            }
            return {
              ...state,
              pvs: { ...state.pvs, ...itemsMap },
              loading: false,
            };
          }
          case "ADDED":
          case "MODIFIED": {
            const pv = payload as PV;
            return {
              pvs: { ...state.pvs, [pv.id]: pv },
              loading: false,
            };
          }
          case "DELETED": {
            const pv = payload as PV;
            const { [pv.id]: _, ...pvs } = state.pvs;
            return { pvs, loading: false };
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
 * Shared PV store hook.
 * On first use: fetches PVs via REST, subscribes to WS events.
 * Returns the live PV list.
 */
export function usePVStore(): {
  pvs: PV[];
  loading: boolean;
} {
  const { api } = useScalprum<{ api: FleetShiftApi }>();
  const s = getStore();
  const state = useGetState(s);
  const apiRef = useRef(api);
  apiRef.current = api;

  useEffect(() => {
    const clusterIds = api.fleetshift.getClusterIdsForPlugin("storage");
    const clusterKey = clusterIds.sort().join(",");
    if (initializedFor === clusterKey) return;
    initializedFor = clusterKey;

    Promise.all(
      clusterIds.map((id) =>
        fetch(`${api.fleetshift.apiBase}/clusters/${id}/pvs`)
          .then((res) => (res.ok ? res.json() : []))
          .then((pvs: PV[]) => pvs)
          .catch(() => [] as PV[]),
      ),
    ).then((results) => {
      const allPVs = results.flat();
      s.updateState("INIT", allPVs);
    });

    const unsub = api.fleetshift.on(
      "persistentvolumes",
      (event: { verb: string; cluster: string; object: K8sV1PV }) => {
        const pv = transformK8sPV(event.object, event.cluster);
        s.updateState(event.verb as (typeof EVENTS)[number], pv);
      },
    );

    return () => {
      unsub();
      initializedFor = "";
    };
  }, [api, s]);

  return {
    pvs: Object.values(state.pvs),
    loading: state.loading,
  };
}

export default usePVStore;
