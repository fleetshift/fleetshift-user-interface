import { useMemo, useEffect, useRef } from "react";
import {
  Card,
  CardBody,
  CardTitle,
  Grid,
  GridItem,
  Progress,
  Spinner,
  Title,
  Content,
} from "@patternfly/react-core";
import { Table, Thead, Tbody, Tr, Th, Td } from "@patternfly/react-table";
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
            // Merge: replace only this cluster's pods, keep others
            const podMetrics = { ...state.podMetrics };
            // Remove stale entries for this cluster
            for (const key of Object.keys(podMetrics)) {
              if (key.startsWith(`${clusterId}/`)) {
                delete podMetrics[key];
              }
            }
            // Add fresh entries
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

    // Fetch initial metrics + node capacities via REST so the page isn't blank
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
        // Seed pod metrics from the REST response
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
        // Seed node capacities
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

const LoadingCard: React.FC<{
  title: string;
  children: React.ReactNode;
  loading: boolean;
}> = ({ title, children, loading }) => (
  <Card isFullHeight>
    <CardTitle>
      <Title headingLevel="h3" size="md">
        {title}
      </Title>
    </CardTitle>
    <CardBody>
      {loading ? (
        <div
          style={{ display: "flex", justifyContent: "center", padding: "1rem" }}
        >
          <Spinner size="lg" />
        </div>
      ) : (
        children
      )}
    </CardBody>
  </Card>
);

const MetricsDashboard: React.FC = () => {
  const state = useMetricsStore();
  const loading = state.loading;

  // Use pod store from core-plugin via remote hook for accurate pod count
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

  const podCount = podStoreResult?.pods.length ?? podList.length;
  const totalCpu = useMemo(
    () => podList.reduce((s, p) => s + p.cpu, 0),
    [podList],
  );
  const totalMemory = useMemo(
    () => podList.reduce((s, p) => s + p.memory, 0),
    [podList],
  );

  const nodeList = useMemo(
    () => Object.values(state.nodeMetrics),
    [state.nodeMetrics],
  );

  const maxCpu =
    useMemo(
      () => nodeList.reduce((s, n) => s + n.cpuCapacity, 0),
      [nodeList],
    ) || 1;
  const maxMemory =
    useMemo(
      () => nodeList.reduce((s, n) => s + n.memoryCapacity, 0),
      [nodeList],
    ) || 1;

  const topCpu = useMemo(
    () => [...podList].sort((a, b) => b.cpu - a.cpu).slice(0, 5),
    [podList],
  );

  const topMemory = useMemo(
    () => [...podList].sort((a, b) => b.memory - a.memory).slice(0, 5),
    [podList],
  );

  const cpuPercent = Math.round((totalCpu / maxCpu) * 100);
  const memPercent = Math.round((totalMemory / maxMemory) * 100);

  return (
    <Grid hasGutter>
      <GridItem md={4} sm={12}>
        <LoadingCard title="CPU Usage" loading={loading}>
          <Content component="p" style={{ marginBottom: "0.5rem" }}>
            {totalCpu.toFixed(2)} / {maxCpu} cores
          </Content>
          <Progress
            value={cpuPercent}
            title="CPU usage"
            aria-label="CPU usage"
          />
        </LoadingCard>
      </GridItem>

      <GridItem md={4} sm={12}>
        <LoadingCard title="Memory Usage" loading={loading}>
          <Content component="p" style={{ marginBottom: "0.5rem" }}>
            {Math.round(totalMemory)} / {Math.round(maxMemory)} Mi
          </Content>
          <Progress
            value={memPercent}
            title="Memory usage"
            aria-label="Memory usage"
          />
        </LoadingCard>
      </GridItem>

      <GridItem md={4} sm={12}>
        <LoadingCard title="Pod Count" loading={loading}>
          <div style={{ fontSize: "2.5rem", fontWeight: 700, lineHeight: 1.2 }}>
            {podCount}
          </div>
        </LoadingCard>
      </GridItem>

      <GridItem md={6} sm={12}>
        <LoadingCard title="Top CPU Consumers" loading={loading}>
          <Table aria-label="Top CPU consumers" variant="compact">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Cluster</Th>
                <Th>Namespace</Th>
                <Th>CPU (millicores)</Th>
              </Tr>
            </Thead>
            <Tbody>
              {topCpu.map((p) => (
                <Tr key={`${p.cluster}/${p.namespace}/${p.name}`}>
                  <Td dataLabel="Name">{p.name}</Td>
                  <Td dataLabel="Cluster">{p.cluster}</Td>
                  <Td dataLabel="Namespace">{p.namespace}</Td>
                  <Td dataLabel="CPU (millicores)">
                    {Math.round(p.cpu * 1000)}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </LoadingCard>
      </GridItem>

      <GridItem md={6} sm={12}>
        <LoadingCard title="Top Memory Consumers" loading={loading}>
          <Table aria-label="Top memory consumers" variant="compact">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Cluster</Th>
                <Th>Namespace</Th>
                <Th>Memory (Mi)</Th>
              </Tr>
            </Thead>
            <Tbody>
              {topMemory.map((p) => (
                <Tr key={`${p.cluster}/${p.namespace}/${p.name}`}>
                  <Td dataLabel="Name">{p.name}</Td>
                  <Td dataLabel="Cluster">{p.cluster}</Td>
                  <Td dataLabel="Namespace">{p.namespace}</Td>
                  <Td dataLabel="Memory (Mi)">{Math.round(p.memory)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </LoadingCard>
      </GridItem>
    </Grid>
  );
};

export default MetricsDashboard;
