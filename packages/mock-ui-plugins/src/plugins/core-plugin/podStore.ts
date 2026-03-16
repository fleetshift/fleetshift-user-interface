import { createSharedStore } from "@scalprum/core";
import { useGetState, useSubscribeStore } from "@scalprum/react-core";
import { useScalprum } from "@scalprum/react-core";
import { useEffect, useRef } from "react";

// --- Pod shape (matches the REST API / transform output) ---

export interface Pod {
  id: string;
  namespace_id: string;
  cluster_id: string;
  name: string;
  namespace: string;
  status: string;
  restarts: number;
  cpu_usage: number;
  memory_usage: number;
  created_at: string;
}

// --- K8s V1Pod → Pod transform (client-side) ---

function getPodStatus(pod: K8sV1Pod): string {
  const containerStatuses = pod.status?.containerStatuses ?? [];
  for (const cs of containerStatuses) {
    if (cs.state?.waiting?.reason) return cs.state.waiting.reason;
  }
  const initStatuses = pod.status?.initContainerStatuses ?? [];
  for (const cs of initStatuses) {
    if (cs.state?.waiting?.reason) return `Init:${cs.state.waiting.reason}`;
  }
  if (
    containerStatuses.length > 0 &&
    containerStatuses.every((cs: ContainerStatus) => cs.state?.terminated)
  ) {
    return "Completed";
  }
  return pod.status?.phase ?? "Unknown";
}

// Minimal types for the raw k8s pod objects coming over WS
interface ContainerStatus {
  restartCount?: number;
  state?: {
    waiting?: { reason?: string };
    terminated?: unknown;
  };
}

interface K8sV1Pod {
  metadata?: {
    uid?: string;
    name?: string;
    namespace?: string;
    creationTimestamp?: string;
  };
  status?: {
    phase?: string;
    containerStatuses?: ContainerStatus[];
    initContainerStatuses?: ContainerStatus[];
  };
}

function transformK8sPod(raw: K8sV1Pod, clusterId: string): Pod {
  const name = raw.metadata?.name ?? "unknown";
  const namespace = raw.metadata?.namespace ?? "default";
  const restarts = (raw.status?.containerStatuses ?? []).reduce(
    (sum: number, cs: ContainerStatus) => sum + (cs.restartCount ?? 0),
    0,
  );

  return {
    id: raw.metadata?.uid ?? `${clusterId}-${namespace}-${name}`,
    namespace_id: `${clusterId}-${namespace}`,
    cluster_id: clusterId,
    name,
    namespace,
    status: getPodStatus(raw),
    restarts,
    cpu_usage: 0,
    memory_usage: 0,
    created_at:
      raw.metadata?.creationTimestamp ??
      new Date().toISOString().replace("T", " ").substring(0, 19),
  };
}

// --- Store ---

const EVENTS = ["INIT", "ADDED", "MODIFIED", "DELETED", "METRICS"] as const;

interface PodMetricContainer {
  name: string;
  usage: { cpu: string; memory: string };
}

interface PodMetricItem {
  metadata: { name: string; namespace: string };
  containers: PodMetricContainer[];
}

function parseCpuString(cpu: string): number {
  if (cpu.endsWith("n")) return parseInt(cpu) / 1e9;
  if (cpu.endsWith("u")) return parseInt(cpu) / 1e6;
  if (cpu.endsWith("m")) return parseInt(cpu) / 1e3;
  return parseFloat(cpu);
}

function parseMemoryString(mem: string): number {
  if (mem.endsWith("Ki")) return parseInt(mem) / 1024;
  if (mem.endsWith("Mi")) return parseInt(mem);
  if (mem.endsWith("Gi")) return parseInt(mem) * 1024;
  return parseInt(mem) / (1024 * 1024);
}

interface PodStoreState {
  pods: Record<string, Pod>;
  loading: boolean;
}

type PodStore = ReturnType<
  typeof createSharedStore<PodStoreState, typeof EVENTS>
>;

let store: PodStore | null = null;
let initializedFor = "";

function getStore(): PodStore {
  if (!store) {
    store = createSharedStore<PodStoreState, typeof EVENTS>({
      initialState: { pods: {}, loading: true },
      events: EVENTS,
      onEventChange: (state, event, payload) => {
        switch (event) {
          case "INIT": {
            const pods = payload as Pod[];
            const podsMap: Record<string, Pod> = {};
            for (const pod of pods) {
              podsMap[pod.id] = pod;
            }
            return { pods: { ...state.pods, ...podsMap }, loading: false };
          }
          case "ADDED":
          case "MODIFIED": {
            const pod = payload as Pod;
            const existing = state.pods[pod.id];
            const merged = existing
              ? {
                  ...pod,
                  cpu_usage: existing.cpu_usage,
                  memory_usage: existing.memory_usage,
                }
              : pod;
            return {
              pods: { ...state.pods, [pod.id]: merged },
              loading: false,
            };
          }
          case "DELETED": {
            const pod = payload as Pod;
            const { [pod.id]: _, ...pods } = state.pods;
            return { pods, loading: false };
          }
          case "METRICS": {
            const items = payload as PodMetricItem[];
            const pods = { ...state.pods };
            for (const item of items) {
              const key = Object.keys(pods).find((k) => {
                const p = pods[k];
                return (
                  p.name === item.metadata.name &&
                  p.namespace === item.metadata.namespace
                );
              });
              if (key) {
                let cpu = 0;
                let mem = 0;
                for (const c of item.containers) {
                  cpu += parseCpuString(c.usage.cpu);
                  mem += parseMemoryString(c.usage.memory);
                }
                pods[key] = { ...pods[key], cpu_usage: cpu, memory_usage: mem };
              }
            }
            return { pods, loading: false };
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
 * Shared pod store hook.
 * On first use: fetches pods via REST, subscribes to WS events.
 * Returns the live pod list.
 */
export function usePodStore(): {
  pods: Pod[];
  loading: boolean;
} {
  const { api } = useScalprum<{ api: FleetShiftApi }>();
  const s = getStore();
  const state = useGetState(s);
  const apiRef = useRef(api);
  apiRef.current = api;

  useEffect(() => {
    const clusterIds = api.fleetshift.getClusterIdsForPlugin("core");
    const clusterKey = clusterIds.sort().join(",");
    if (initializedFor === clusterKey) return;
    initializedFor = clusterKey;

    Promise.all(
      clusterIds.map((id) =>
        fetch(`${api.fleetshift.apiBase}/clusters/${id}/pods`)
          .then((res) => (res.ok ? res.json() : []))
          .then((pods: Array<Pod & { namespace_id?: string }>) =>
            pods.map((p) => ({
              ...p,
              namespace:
                p.namespace ??
                extractNamespace(p.namespace_id ?? "", p.cluster_id),
            })),
          )
          .catch(() => [] as Pod[]),
      ),
    ).then((results) => {
      const allPods = results.flat();
      s.updateState("INIT", allPods);
    });

    const unsubPods = api.fleetshift.on(
      "pods",
      (event: { verb: string; cluster: string; object: K8sV1Pod }) => {
        const pod = transformK8sPod(event.object, event.cluster);
        s.updateState(event.verb as (typeof EVENTS)[number], pod);
      },
    );

    const unsubMetrics = api.fleetshift.on(
      "pod-metrics",
      (event: { items: PodMetricItem[] }) => {
        s.updateState("METRICS", event.items);
      },
    );

    return () => {
      unsubPods();
      unsubMetrics();
      initializedFor = "";
    };
  }, [api, s]);

  return {
    pods: Object.values(state.pods),
    loading: state.loading,
  };
}

/**
 * Subscribe to a specific pod event only (e.g., only "DELETED").
 */
export function usePodStoreEvent(
  event: (typeof EVENTS)[number],
  selector: (state: PodStoreState) => Pod[],
): Pod[] {
  const s = getStore();
  return useSubscribeStore(s, event, selector);
}

function extractNamespace(namespaceId: string, clusterId: string): string {
  return namespaceId.startsWith(clusterId + "-")
    ? namespaceId.slice(clusterId.length + 1)
    : namespaceId;
}

export default usePodStore;
