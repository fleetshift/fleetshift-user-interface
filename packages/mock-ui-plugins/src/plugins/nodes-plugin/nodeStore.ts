import { createSharedStore } from "@scalprum/core";
import { useGetState } from "@scalprum/react-core";
import { useScalprum } from "@scalprum/react-core";
import { useEffect, useRef } from "react";

// --- Node shape (matches the REST API / transform output) ---

export interface Node {
  id: string;
  cluster_id: string;
  name: string;
  status: string;
  role: string;
  cpu_capacity: number;
  memory_capacity: number;
  cpu_used: number;
  memory_used: number;
  kubelet_version: string;
}

// --- K8s V1Node → Node transform (client-side) ---

interface K8sV1Node {
  metadata?: {
    uid?: string;
    name?: string;
    labels?: Record<string, string>;
  };
  status?: {
    conditions?: Array<{ type?: string; status?: string }>;
    capacity?: { cpu?: string; memory?: string };
    nodeInfo?: { kubeletVersion?: string };
  };
}

function getNodeStatus(raw: K8sV1Node): string {
  const conditions = raw.status?.conditions ?? [];
  const ready = conditions.find((c) => c.type === "Ready");
  return ready?.status === "True" ? "Ready" : "NotReady";
}

function getNodeRole(raw: K8sV1Node): string {
  const labels = raw.metadata?.labels ?? {};
  if (
    "node-role.kubernetes.io/control-plane" in labels ||
    "node-role.kubernetes.io/master" in labels
  ) {
    return "master";
  }
  return "worker";
}

function parseMemoryToMi(mem: string): number {
  if (mem.endsWith("Ki")) return parseInt(mem) / 1024;
  if (mem.endsWith("Mi")) return parseInt(mem);
  if (mem.endsWith("Gi")) return parseInt(mem) * 1024;
  return parseInt(mem) / (1024 * 1024);
}

function transformK8sNode(raw: K8sV1Node, clusterId: string): Node {
  const name = raw.metadata?.name ?? "unknown";
  return {
    id: raw.metadata?.uid ?? `${clusterId}-${name}`,
    cluster_id: clusterId,
    name,
    status: getNodeStatus(raw),
    role: getNodeRole(raw),
    cpu_capacity: parseInt(raw.status?.capacity?.cpu ?? "0"),
    memory_capacity: Math.round(
      parseMemoryToMi(raw.status?.capacity?.memory ?? "0"),
    ),
    cpu_used: 0,
    memory_used: 0,
    kubelet_version: raw.status?.nodeInfo?.kubeletVersion ?? "",
  };
}

// --- Store ---

const EVENTS = ["INIT", "ADDED", "MODIFIED", "DELETED", "METRICS"] as const;

interface NodeMetricItem {
  metadata: { name: string };
  usage: { cpu: string; memory: string };
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

interface NodeStoreState {
  nodes: Record<string, Node>;
  loading: boolean;
}

type NodeStore = ReturnType<
  typeof createSharedStore<NodeStoreState, typeof EVENTS>
>;

let store: NodeStore | null = null;
let initialized = false;

function getStore(): NodeStore {
  if (!store) {
    store = createSharedStore<NodeStoreState, typeof EVENTS>({
      initialState: { nodes: {}, loading: true },
      events: EVENTS,
      onEventChange: (state, event, payload) => {
        switch (event) {
          case "INIT": {
            const items = payload as Node[];
            const itemsMap: Record<string, Node> = {};
            for (const item of items) {
              itemsMap[item.id] = item;
            }
            return {
              ...state,
              nodes: { ...state.nodes, ...itemsMap },
              loading: false,
            };
          }
          case "ADDED":
          case "MODIFIED": {
            const node = payload as Node;
            const existing = state.nodes[node.id];
            const merged = existing
              ? {
                  ...node,
                  cpu_used: existing.cpu_used,
                  memory_used: existing.memory_used,
                }
              : node;
            return {
              nodes: { ...state.nodes, [node.id]: merged },
              loading: false,
            };
          }
          case "DELETED": {
            const node = payload as Node;
            const { [node.id]: _, ...nodes } = state.nodes;
            return { nodes, loading: false };
          }
          case "METRICS": {
            const items = payload as NodeMetricItem[];
            const nodes = { ...state.nodes };
            for (const item of items) {
              const key = Object.keys(nodes).find(
                (k) => nodes[k].name === item.metadata.name,
              );
              if (key) {
                nodes[key] = {
                  ...nodes[key],
                  cpu_used:
                    Math.round(parseCpuString(item.usage.cpu) * 1000) / 1000,
                  memory_used: Math.round(parseMemoryString(item.usage.memory)),
                };
              }
            }
            return { nodes, loading: false };
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
 * Shared node store hook.
 * On first use: fetches nodes via REST, subscribes to WS events.
 * Returns the live node list.
 */
export function useNodeStore(): {
  nodes: Node[];
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

    const clusterIds = api.fleetshift.getClusterIdsForPlugin("nodes");

    Promise.all(
      clusterIds.map((id) =>
        fetch(`${api.fleetshift.apiBase}/clusters/${id}/nodes`)
          .then((res) => (res.ok ? res.json() : []))
          .then((nodes: Node[]) => nodes),
      ),
    ).then((results) => {
      const allNodes = results.flat();
      s.updateState("INIT", allNodes);
    });

    const unsubNodes = api.fleetshift.on(
      "nodes",
      (event: { verb: string; cluster: string; object: K8sV1Node }) => {
        const node = transformK8sNode(event.object, event.cluster);
        s.updateState(event.verb as (typeof EVENTS)[number], node);
      },
    );

    const unsubMetrics = api.fleetshift.on(
      "node-metrics",
      (event: { items: NodeMetricItem[] }) => {
        s.updateState("METRICS", event.items);
      },
    );

    return () => {
      unsubNodes();
      unsubMetrics();
    };
  }, [api, s]);

  return {
    nodes: Object.values(state.nodes),
    loading: state.loading,
  };
}

export default useNodeStore;
