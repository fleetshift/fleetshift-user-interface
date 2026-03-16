import { createSharedStore } from "@scalprum/core";
import { useGetState } from "@scalprum/react-core";
import { useScalprum } from "@scalprum/react-core";
import { useEffect, useRef } from "react";

// --- Service shape (matches the REST API / transform output) ---

export interface Service {
  id: string;
  cluster_id: string;
  namespace_id: string;
  name: string;
  namespace: string;
  type: string;
  cluster_ip: string;
  ports: string; // JSON string
}

// --- K8s V1Service → Service transform (client-side) ---

interface K8sV1Service {
  metadata?: { uid?: string; name?: string; namespace?: string };
  spec?: {
    type?: string;
    clusterIP?: string;
    ports?: Array<{
      port?: number;
      targetPort?: number | string;
      protocol?: string;
    }>;
  };
}

function transformK8sService(raw: K8sV1Service, clusterId: string): Service {
  const name = raw.metadata?.name ?? "unknown";
  const namespace = raw.metadata?.namespace ?? "default";

  return {
    id: raw.metadata?.uid ?? `${clusterId}-${namespace}-${name}`,
    cluster_id: clusterId,
    namespace_id: `${clusterId}-${namespace}`,
    name,
    namespace,
    type: raw.spec?.type ?? "ClusterIP",
    cluster_ip: raw.spec?.clusterIP ?? "",
    ports: JSON.stringify(
      raw.spec?.ports?.map((p) => ({
        port: p.port ?? 0,
        targetPort: p.targetPort ?? 0,
        protocol: p.protocol ?? "TCP",
      })) ?? [],
    ),
  };
}

// --- Store ---

const EVENTS = ["INIT", "ADDED", "MODIFIED", "DELETED"] as const;

interface ServiceStoreState {
  services: Record<string, Service>;
  loading: boolean;
}

type ServiceStore = ReturnType<
  typeof createSharedStore<ServiceStoreState, typeof EVENTS>
>;

let store: ServiceStore | null = null;
let initializedFor = "";

function getStore(): ServiceStore {
  if (!store) {
    store = createSharedStore<ServiceStoreState, typeof EVENTS>({
      initialState: { services: {}, loading: true },
      events: EVENTS,
      onEventChange: (state, event, payload) => {
        switch (event) {
          case "INIT": {
            const items = payload as Service[];
            const itemsMap: Record<string, Service> = {};
            for (const item of items) {
              itemsMap[item.id] = item;
            }
            return {
              ...state,
              services: { ...state.services, ...itemsMap },
              loading: false,
            };
          }
          case "ADDED":
          case "MODIFIED": {
            const svc = payload as Service;
            return {
              services: { ...state.services, [svc.id]: svc },
              loading: false,
            };
          }
          case "DELETED": {
            const svc = payload as Service;
            const { [svc.id]: _, ...services } = state.services;
            return { services, loading: false };
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
 * Shared service store hook.
 * On first use: fetches services via REST, subscribes to WS events.
 * Returns the live service list.
 */
export function useServiceStore(): {
  services: Service[];
  loading: boolean;
} {
  const { api } = useScalprum<{ api: FleetShiftApi }>();
  const s = getStore();
  const state = useGetState(s);
  const apiRef = useRef(api);
  apiRef.current = api;

  useEffect(() => {
    const clusterIds = api.fleetshift.getClusterIdsForPlugin("networking");
    const clusterKey = clusterIds.sort().join(",");
    if (initializedFor === clusterKey) return;
    initializedFor = clusterKey;

    Promise.all(
      clusterIds.map((id) =>
        fetch(`${api.fleetshift.apiBase}/clusters/${id}/services`)
          .then((res) => (res.ok ? res.json() : []))
          .then(
            (
              services: Array<
                Omit<Service, "namespace"> & { namespace_id?: string }
              >,
            ) =>
              services.map((svc) => ({
                ...svc,
                namespace:
                  (svc as Service).namespace ??
                  extractNamespace(svc.namespace_id ?? "", svc.cluster_id),
              })),
          )
          .catch(() => [] as Service[]),
      ),
    ).then((results) => {
      const allServices = results.flat();
      s.updateState("INIT", allServices);
    });

    const unsub = api.fleetshift.on(
      "services",
      (event: { verb: string; cluster: string; object: K8sV1Service }) => {
        const svc = transformK8sService(event.object, event.cluster);
        s.updateState(event.verb as (typeof EVENTS)[number], svc);
      },
    );

    return () => {
      unsub();
      initializedFor = "";
    };
  }, [api, s]);

  return {
    services: Object.values(state.services),
    loading: state.loading,
  };
}

export default useServiceStore;
