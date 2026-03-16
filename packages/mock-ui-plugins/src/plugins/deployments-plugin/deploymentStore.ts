import { createSharedStore } from "@scalprum/core";
import { useGetState, useSubscribeStore } from "@scalprum/react-core";
import { useScalprum } from "@scalprum/react-core";
import { useEffect, useRef } from "react";

// --- Deployment shape (matches the REST API / transform output) ---

export interface Deployment {
  id: string;
  cluster_id: string;
  namespace_id: string;
  name: string;
  namespace: string;
  replicas: number;
  available: number;
  ready: number;
  strategy: string;
  image: string;
}

// --- K8s V1Deployment → Deployment transform (client-side) ---

interface K8sV1Deployment {
  metadata?: { uid?: string; name?: string; namespace?: string };
  spec?: {
    replicas?: number;
    strategy?: { type?: string };
    template?: { spec?: { containers?: Array<{ image?: string }> } };
  };
  status?: { availableReplicas?: number; readyReplicas?: number };
}

function transformK8sDeployment(
  raw: K8sV1Deployment,
  clusterId: string,
): Deployment {
  const name = raw.metadata?.name ?? "unknown";
  const namespace = raw.metadata?.namespace ?? "default";

  return {
    id: raw.metadata?.uid ?? `${clusterId}-${namespace}-${name}`,
    namespace_id: `${clusterId}-${namespace}`,
    cluster_id: clusterId,
    name,
    namespace,
    replicas: raw.spec?.replicas ?? 0,
    available: raw.status?.availableReplicas ?? 0,
    ready: raw.status?.readyReplicas ?? 0,
    strategy: raw.spec?.strategy?.type ?? "RollingUpdate",
    image: raw.spec?.template?.spec?.containers?.[0]?.image ?? "",
  };
}

// --- Store ---

const EVENTS = ["ADDED", "MODIFIED", "DELETED"] as const;

interface DeploymentStoreState {
  deployments: Record<string, Deployment>;
  loading: boolean;
}

type DeploymentStore = ReturnType<
  typeof createSharedStore<DeploymentStoreState, typeof EVENTS>
>;

let store: DeploymentStore | null = null;
let initialized = false;

function getStore(): DeploymentStore {
  if (!store) {
    store = createSharedStore<DeploymentStoreState, typeof EVENTS>({
      initialState: { deployments: {}, loading: true },
      events: EVENTS,
      onEventChange: (state, event, payload) => {
        switch (event) {
          case "ADDED":
          case "MODIFIED": {
            const deployment = payload as Deployment;
            return {
              deployments: {
                ...state.deployments,
                [deployment.id]: deployment,
              },
              loading: false,
            };
          }
          case "DELETED": {
            const deployment = payload as Deployment;
            const { [deployment.id]: _, ...deployments } = state.deployments;
            return { deployments, loading: false };
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
    on: (
      topic: string,
      callback: (event: any) => void,
    ) => () => void;
  };
}

// --- Hook ---

/**
 * Shared deployment store hook.
 * On first use: fetches deployments via REST, subscribes to WS events.
 * Returns the live deployment list.
 */
export function useDeploymentStore(): {
  deployments: Deployment[];
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

    const clusterIds = api.fleetshift.getClusterIdsForPlugin("deployments");

    Promise.all(
      clusterIds.map((id) =>
        fetch(`${api.fleetshift.apiBase}/clusters/${id}/deployments`)
          .then((res) => (res.ok ? res.json() : []))
          .then(
            (
              deployments: Array<Deployment & { namespace_id?: string }>,
            ) =>
              deployments.map((d) => ({
                ...d,
                namespace:
                  d.namespace ??
                  extractNamespace(d.namespace_id ?? "", d.cluster_id),
              })),
          ),
      ),
    ).then((results) => {
      for (const deployments of results) {
        for (const deployment of deployments) {
          s.updateState("ADDED", deployment);
        }
      }
    });

    const unsub = api.fleetshift.on(
      "deployments",
      (event: {
        verb: string;
        cluster: string;
        object: K8sV1Deployment;
      }) => {
        const deployment = transformK8sDeployment(event.object, event.cluster);
        s.updateState(event.verb as (typeof EVENTS)[number], deployment);
      },
    );

    return () => {
      unsub();
    };
  }, [api, s]);

  return {
    deployments: Object.values(state.deployments),
    loading: state.loading,
  };
}

/**
 * Subscribe to a specific deployment event only (e.g., only "DELETED").
 */
export function useDeploymentStoreEvent(
  event: (typeof EVENTS)[number],
  selector: (state: DeploymentStoreState) => Deployment[],
): Deployment[] {
  const s = getStore();
  return useSubscribeStore(s, event, selector);
}

function extractNamespace(namespaceId: string, clusterId: string): string {
  return namespaceId.startsWith(clusterId + "-")
    ? namespaceId.slice(clusterId.length + 1)
    : namespaceId;
}

export default useDeploymentStore;
