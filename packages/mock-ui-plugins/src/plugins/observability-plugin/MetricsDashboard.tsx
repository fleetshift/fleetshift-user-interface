import { useMemo, useEffect, useRef } from "react";
import {
  Card,
  CardBody,
  CardTitle,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  Icon,
  Spinner,
  Title,
} from "@patternfly/react-core";
import {
  CpuIcon,
  MemoryIcon,
  CubesIcon,
  ServerIcon,
} from "@patternfly/react-icons";
import { createSharedStore } from "@scalprum/core";
import { useGetState, useRemoteHook } from "@scalprum/react-core";
import { useScalprum } from "@scalprum/react-core";

interface FleetShiftApi {
  fleetshift: {
    apiBase: string;
    getClusterIdsForPlugin: (pluginKey: string) => string[];
    on: (topic: string, callback: (event: any) => void) => () => void;
  };
}

interface PodMetricContainer {
  name: string;
  usage: { cpu: string; memory: string };
}

interface PodMetricItem {
  metadata: { name: string; namespace: string };
  containers: PodMetricContainer[];
}

interface NodeMetricItem {
  metadata: { name: string };
  usage: { cpu: string; memory: string };
}

interface PodMetricEntry {
  name: string;
  namespace: string;
  cluster: string;
  cpu: number;
  memory: number;
}

interface NodeMetricEntry {
  name: string;
  cluster: string;
  cpu: number;
  memory: number;
  cpuCapacity: number;
  memoryCapacity: number;
}

interface MetricsState {
  /** Keyed by "clusterId/namespace/podName" */
  podMetrics: Record<string, PodMetricEntry>;
  /** Keyed by "clusterId/nodeName" */
  nodeMetrics: Record<string, NodeMetricEntry>;
  loading: boolean;
}

const EVENTS = ["POD_METRICS", "NODE_METRICS", "NODES_INIT"] as const;

type MetricsStore = ReturnType<
  typeof createSharedStore<MetricsState, typeof EVENTS>
>;

let store: MetricsStore | null = null;
let initialized = false;

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

function getStore(): MetricsStore {
  if (!store) {
    store = createSharedStore<MetricsState, typeof EVENTS>({
      initialState: {
        podMetrics: {},
        nodeMetrics: {},
        loading: false,
      },
      events: EVENTS,
      onEventChange: (state, event, payload) => {
        switch (event) {
          case "POD_METRICS": {
            const { clusterId, items } = payload as {
              clusterId: string;
              items: PodMetricItem[];
            };
            const podMetrics = { ...state.podMetrics };
            for (const key of Object.keys(podMetrics)) {
              if (key.startsWith(`${clusterId}/`)) {
                delete podMetrics[key];
              }
            }
            for (const item of items) {
              let cpu = 0;
              let mem = 0;
              for (const c of item.containers) {
                cpu += parseCpuString(c.usage.cpu);
                mem += parseMemoryString(c.usage.memory);
              }
              const key = `${clusterId}/${item.metadata.namespace}/${item.metadata.name}`;
              podMetrics[key] = {
                name: item.metadata.name,
                namespace: item.metadata.namespace,
                cluster: clusterId,
                cpu,
                memory: mem,
              };
            }
            return { ...state, podMetrics, loading: false };
          }
          case "NODE_METRICS": {
            const { clusterId, items } = payload as {
              clusterId: string;
              items: NodeMetricItem[];
            };
            const nodeMetrics = { ...state.nodeMetrics };
            for (const item of items) {
              const key = `${clusterId}/${item.metadata.name}`;
              const existing = nodeMetrics[key];
              nodeMetrics[key] = {
                name: item.metadata.name,
                cluster: clusterId,
                cpu: parseCpuString(item.usage.cpu),
                memory: parseMemoryString(item.usage.memory),
                cpuCapacity: existing?.cpuCapacity ?? 0,
                memoryCapacity: existing?.memoryCapacity ?? 0,
              };
            }
            return { ...state, nodeMetrics, loading: false };
          }
          case "NODES_INIT": {
            const { clusterId, nodes } = payload as {
              clusterId: string;
              nodes: Array<{
                name: string;
                cpu_capacity: number;
                memory_capacity: number;
              }>;
            };
            const nodeMetrics = { ...state.nodeMetrics };
            for (const n of nodes) {
              const key = `${clusterId}/${n.name}`;
              const existing = nodeMetrics[key];
              nodeMetrics[key] = {
                name: n.name,
                cluster: clusterId,
                cpu: existing?.cpu ?? 0,
                memory: existing?.memory ?? 0,
                cpuCapacity: n.cpu_capacity,
                memoryCapacity: n.memory_capacity,
              };
            }
            return { ...state, nodeMetrics };
          }
          default:
            return state;
        }
      },
    });
  }
  return store;
}

function useMetricsStore() {
  const { api } = useScalprum<{ api: FleetShiftApi }>();
  const s = getStore();
  const state = useGetState(s);
  const apiRef = useRef(api);
  apiRef.current = api;

  useEffect(() => {
    if (initialized) return;
    initialized = true;

    const clusterIds = api.fleetshift.getClusterIdsForPlugin("observability");

    Promise.all(
      clusterIds.map((id) =>
        fetch(`${api.fleetshift.apiBase}/clusters/${id}/metrics`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => (data ? { ...data, clusterId: id } : null)),
      ),
    ).then((results) => {
      for (const data of results) {
        if (!data) continue;
        const clusterId = data.clusterId as string;
        if (data.pods) {
          const items: PodMetricItem[] = data.pods.map(
            (p: {
              name: string;
              namespace: string;
              cpu: number;
              memory: number;
            }) => ({
              metadata: { name: p.name, namespace: p.namespace },
              containers: [
                {
                  name: "main",
                  usage: {
                    cpu: `${Math.round(p.cpu * 1000)}m`,
                    memory: `${Math.round(p.memory)}Mi`,
                  },
                },
              ],
            }),
          );
          s.updateState("POD_METRICS", { clusterId, items });
        }
        if (data.maxCpu || data.maxMemory) {
          s.updateState("NODES_INIT", {
            clusterId,
            nodes: [
              {
                name: "cluster-total",
                cpu_capacity: data.maxCpu ?? 0,
                memory_capacity: data.maxMemory ?? 0,
              },
            ],
          });
        }
      }
    });

    const unsubPod = api.fleetshift.on(
      "pod-metrics",
      (event: { cluster: string; items: PodMetricItem[] }) => {
        s.updateState("POD_METRICS", {
          clusterId: event.cluster,
          items: event.items,
        });
      },
    );

    const unsubNode = api.fleetshift.on(
      "node-metrics",
      (event: { cluster: string; items: NodeMetricItem[] }) => {
        s.updateState("NODE_METRICS", {
          clusterId: event.cluster,
          items: event.items,
        });
      },
    );

    return () => {
      unsubPod();
      unsubNode();
    };
  }, [api, s]);

  return state;
}

interface ClusterStats {
  clusterId: string;
  cpuUsage: number;
  cpuCapacity: number;
  memoryUsage: number;
  memoryCapacity: number;
  podCount: number;
  nodeCount: number;
}

const StatBox: React.FC<{
  value: string;
  label: string;
  icon: React.ReactNode;
}> = ({ value, label, icon }) => (
  <div
    style={{
      textAlign: "center",
      padding: "var(--pf-t--global--spacer--md)",
    }}
  >
    <div
      style={{
        marginBottom: "var(--pf-t--global--spacer--xs)",
        color: "var(--pf-t--global--text--color--subtle)",
      }}
    >
      <Icon size="md">{icon}</Icon>
    </div>
    <div
      style={{
        fontSize: "var(--pf-t--global--font--size--2xl)",
        fontWeight: "var(--pf-t--global--font--weight--heading--default)",
        lineHeight: 1.2,
      }}
    >
      {value}
    </div>
    <div
      style={{
        fontSize: "var(--pf-t--global--font--size--sm)",
        color: "var(--pf-t--global--text--color--subtle)",
        marginTop: "var(--pf-t--global--spacer--xs)",
      }}
    >
      {label}
    </div>
  </div>
);

const MetricsDashboard: React.FC = () => {
  const state = useMetricsStore();
  const loading = state.loading;

  const { hookResult: podStoreResult } = useRemoteHook<{
    pods: Array<{
      id: string;
      name: string;
      namespace: string;
      status: string;
    }>;
    loading: boolean;
  }>({
    scope: "core-plugin",
    module: "usePodStore",
  });

  const podList = useMemo(
    () => Object.values(state.podMetrics),
    [state.podMetrics],
  );

  const nodeList = useMemo(
    () => Object.values(state.nodeMetrics),
    [state.nodeMetrics],
  );

  // Group metrics by cluster
  const clusterStats = useMemo(() => {
    const statsMap: Record<string, ClusterStats> = {};

    // Aggregate pod metrics per cluster
    for (const pod of podList) {
      if (!statsMap[pod.cluster]) {
        statsMap[pod.cluster] = {
          clusterId: pod.cluster,
          cpuUsage: 0,
          cpuCapacity: 0,
          memoryUsage: 0,
          memoryCapacity: 0,
          podCount: 0,
          nodeCount: 0,
        };
      }
      statsMap[pod.cluster].cpuUsage += pod.cpu;
      statsMap[pod.cluster].memoryUsage += pod.memory;
      statsMap[pod.cluster].podCount += 1;
    }

    // Override pod counts from core-plugin store if available
    if (podStoreResult?.pods) {
      const podsByCluster: Record<string, number> = {};
      for (const pod of podStoreResult.pods) {
        const clusterId = (pod as Record<string, unknown>).cluster_id as
          | string
          | undefined;
        if (clusterId) {
          podsByCluster[clusterId] = (podsByCluster[clusterId] ?? 0) + 1;
        }
      }
      for (const [clusterId, count] of Object.entries(podsByCluster)) {
        if (statsMap[clusterId]) {
          statsMap[clusterId].podCount = count;
        }
      }
    }

    // Aggregate node metrics per cluster
    for (const node of nodeList) {
      if (!statsMap[node.cluster]) {
        statsMap[node.cluster] = {
          clusterId: node.cluster,
          cpuUsage: 0,
          cpuCapacity: 0,
          memoryUsage: 0,
          memoryCapacity: 0,
          podCount: 0,
          nodeCount: 0,
        };
      }
      statsMap[node.cluster].cpuCapacity += node.cpuCapacity;
      statsMap[node.cluster].memoryCapacity += node.memoryCapacity;
      statsMap[node.cluster].nodeCount += 1;
    }

    return Object.values(statsMap).sort((a, b) =>
      a.clusterId.localeCompare(b.clusterId),
    );
  }, [podList, nodeList, podStoreResult]);

  const clusterCount = clusterStats.length;
  const isSingleCluster = clusterCount === 1;

  if (loading && clusterStats.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "var(--pf-t--global--spacer--2xl)",
        }}
      >
        <Spinner size="xl" />
      </div>
    );
  }

  return (
    <div>
      <Flex
        alignItems={{ default: "alignItemsBaseline" }}
        gap={{ default: "gapSm" }}
        style={{ marginBottom: "var(--pf-t--global--spacer--lg)" }}
      >
        <FlexItem>
          <Title headingLevel="h1">Observability</Title>
        </FlexItem>
        <FlexItem>
          <span
            style={{
              fontSize: "var(--pf-t--global--font--size--sm)",
              color: "var(--pf-t--global--text--color--subtle)",
            }}
          >
            {clusterCount} cluster{clusterCount !== 1 ? "s" : ""}
          </span>
        </FlexItem>
      </Flex>

      <Grid hasGutter>
        {clusterStats.map((stats) => (
          <GridItem md={isSingleCluster ? 12 : 6} sm={12} key={stats.clusterId}>
            <Card isFullHeight>
              <CardTitle>
                <Title headingLevel="h3" size="md">
                  {stats.clusterId}
                </Title>
              </CardTitle>
              <CardBody>
                <Grid hasGutter>
                  <GridItem span={6}>
                    <StatBox
                      value={`${stats.cpuUsage.toFixed(1)}/${stats.cpuCapacity || "\u2014"}`}
                      label="CPU (cores)"
                      icon={
                        <CpuIcon color="var(--pf-t--global--color--brand--default)" />
                      }
                    />
                  </GridItem>
                  <GridItem span={6}>
                    <StatBox
                      value={`${(stats.memoryUsage / 1024).toFixed(1)}/${stats.memoryCapacity ? (stats.memoryCapacity / 1024).toFixed(1) : "\u2014"}`}
                      label="Memory (GB)"
                      icon={
                        <MemoryIcon color="var(--pf-t--global--color--status--info--default)" />
                      }
                    />
                  </GridItem>
                  <GridItem span={6}>
                    <StatBox
                      value={String(stats.podCount)}
                      label="Pods"
                      icon={
                        <CubesIcon color="var(--pf-t--global--color--status--success--default)" />
                      }
                    />
                  </GridItem>
                  <GridItem span={6}>
                    <StatBox
                      value={String(stats.nodeCount)}
                      label="Nodes"
                      icon={
                        <ServerIcon color="var(--pf-t--global--text--color--subtle)" />
                      }
                    />
                  </GridItem>
                </Grid>
              </CardBody>
            </Card>
          </GridItem>
        ))}
      </Grid>
    </div>
  );
};

export default MetricsDashboard;
