import { createSharedStore } from "@scalprum/core";
import { useGetState } from "@scalprum/react-core";
import { useScalprum } from "@scalprum/react-core";
import { useEffect, useRef } from "react";

// --- Ingress shape (matches the REST API / transform output) ---

export interface Ingress {
  id: string;
  cluster_id: string;
  namespace_id: string;
  name: string;
  namespace: string;
  host: string;
  path: string;
  service_name: string;
  tls: number; // 0 or 1
}

// --- K8s V1Ingress → Ingress transform (client-side) ---

interface K8sV1Ingress {
  metadata?: { uid?: string; name?: string; namespace?: string };
  spec?: {
    tls?: unknown[];
    rules?: Array<{
      host?: string;
      http?: {
        paths?: Array<{
          path?: string;
          backend?: { service?: { name?: string } };
        }>;
      };
    }>;
  };
}

function transformK8sIngress(raw: K8sV1Ingress, clusterId: string): Ingress {
  const name = raw.metadata?.name ?? "unknown";
  const namespace = raw.metadata?.namespace ?? "default";

  return {
    id: raw.metadata?.uid ?? `${clusterId}-${namespace}-${name}`,
    cluster_id: clusterId,
    namespace_id: `${clusterId}-${namespace}`,
    name,
    namespace,
    host: raw.spec?.rules?.[0]?.host ?? "",
    path: raw.spec?.rules?.[0]?.http?.paths?.[0]?.path ?? "/",
    service_name:
      raw.spec?.rules?.[0]?.http?.paths?.[0]?.backend?.service?.name ?? "",
    tls: (raw.spec?.tls?.length ?? 0) > 0 ? 1 : 0,
  };
}

// --- Store ---

const EVENTS = ["INIT", "ADDED", "MODIFIED", "DELETED"] as const;

interface IngressStoreState {
  ingresses: Record<string, Ingress>;
  loading: boolean;
}

type IngressStore = ReturnType<
  typeof createSharedStore<IngressStoreState, typeof EVENTS>
>;

let store: IngressStore | null = null;
let initializedFor = "";

function getStore(): IngressStore {
  if (!store) {
    store = createSharedStore<IngressStoreState, typeof EVENTS>({
      initialState: { ingresses: {}, loading: true },
      events: EVENTS,
      onEventChange: (state, event, payload) => {
        switch (event) {
          case "INIT": {
            const items = payload as Ingress[];
            const itemsMap: Record<string, Ingress> = {};
            for (const item of items) {
              itemsMap[item.id] = item;
            }
            return {
              ...state,
              ingresses: { ...state.ingresses, ...itemsMap },
              loading: false,
            };
          }
          case "ADDED":
          case "MODIFIED": {
            const ing = payload as Ingress;
            return {
              ingresses: { ...state.ingresses, [ing.id]: ing },
              loading: false,
            };
          }
          case "DELETED": {
            const ing = payload as Ingress;
            const { [ing.id]: _, ...ingresses } = state.ingresses;
            return { ingresses, loading: false };
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
 * Shared ingress store hook.
 * On first use: fetches ingresses via REST, subscribes to WS events.
 * Returns the live ingress list.
 */
export function useIngressStore(): {
  ingresses: Ingress[];
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
        fetch(`${api.fleetshift.apiBase}/clusters/${id}/ingresses`)
          .then((res) => (res.ok ? res.json() : []))
          .then(
            (
              ingresses: Array<
                Omit<Ingress, "namespace"> & { namespace_id?: string }
              >,
            ) =>
              ingresses.map((ing) => ({
                ...ing,
                namespace:
                  (ing as Ingress).namespace ??
                  extractNamespace(ing.namespace_id ?? "", ing.cluster_id),
              })),
          )
          .catch(() => [] as Ingress[]),
      ),
    ).then((results) => {
      const allIngresses = results.flat();
      s.updateState("INIT", allIngresses);
    });

    const unsub = api.fleetshift.on(
      "ingresses",
      (event: { verb: string; cluster: string; object: K8sV1Ingress }) => {
        const ing = transformK8sIngress(event.object, event.cluster);
        s.updateState(event.verb as (typeof EVENTS)[number], ing);
      },
    );

    return () => {
      unsub();
      initializedFor = "";
    };
  }, [api, s]);

  return {
    ingresses: Object.values(state.ingresses),
    loading: state.loading,
  };
}

export default useIngressStore;
