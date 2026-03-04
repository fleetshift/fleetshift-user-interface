import { useEffect, useState, type ComponentType } from "react";
import {
  Card,
  CardTitle,
  CardBody,
  Grid,
  GridItem,
  Progress,
  Title,
  Spinner,
} from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import {
  type Extension,
  type CodeRef,
  useResolvedExtensions,
} from "@openshift/dynamic-plugin-sdk";
import { useApiBase, fetchJson } from "./api";

interface MetricsData {
  clusterId: string;
  podCount: number;
  totalCpu: number;
  totalMemory: number;
  avgCpu: number;
  avgMemory: number;
  maxCpu: number;
  maxMemory: number;
  topCpuConsumers: { name: string; namespace: string; cpu: number }[];
  topMemoryConsumers: { name: string; namespace: string; memory: number }[];
}

interface MetricsDashboardProps {
  clusterIds: string[];
}

// Extension point type: other plugins can contribute charts here
type ObservabilityChartExtension = Extension<
  "fleetshift.observability-chart",
  {
    component: CodeRef<ComponentType<{ clusterIds: string[] }>>;
    label: string;
  }
>;

function isObservabilityChart(e: Extension): e is ObservabilityChartExtension {
  return e.type === "fleetshift.observability-chart";
}

const ClusterMetricsSection = ({ metrics }: { metrics: MetricsData }) => {
  const cpuPercent = Math.round((metrics.totalCpu / metrics.maxCpu) * 100);
  const memPercent = Math.round(
    (metrics.totalMemory / metrics.maxMemory) * 100,
  );

  return (
    <>
      <GridItem>
        <Title headingLevel="h3">
          Cluster: {metrics.clusterId} — {metrics.podCount} pods
        </Title>
      </GridItem>
      <GridItem md={6}>
        <Card>
          <CardTitle>CPU Usage</CardTitle>
          <CardBody>
            <Progress
              value={cpuPercent}
              title="Total CPU"
              label={`${metrics.totalCpu} / ${metrics.maxCpu} cores`}
            />
          </CardBody>
        </Card>
      </GridItem>
      <GridItem md={6}>
        <Card>
          <CardTitle>Memory Usage</CardTitle>
          <CardBody>
            <Progress
              value={memPercent}
              title="Total Memory"
              label={`${metrics.totalMemory} / ${metrics.maxMemory} MB`}
            />
          </CardBody>
        </Card>
      </GridItem>
      <GridItem md={6}>
        <Card>
          <CardTitle>Top CPU Consumers</CardTitle>
          <CardBody>
            <Table aria-label="Top CPU consumers" variant="compact">
              <Thead>
                <Tr>
                  <Th>Pod</Th>
                  <Th>Namespace</Th>
                  <Th>CPU (cores)</Th>
                </Tr>
              </Thead>
              <Tbody>
                {metrics.topCpuConsumers.map((p) => (
                  <Tr key={p.name}>
                    <Td>{p.name}</Td>
                    <Td>{p.namespace}</Td>
                    <Td>{p.cpu}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardBody>
        </Card>
      </GridItem>
      <GridItem md={6}>
        <Card>
          <CardTitle>Top Memory Consumers</CardTitle>
          <CardBody>
            <Table aria-label="Top memory consumers" variant="compact">
              <Thead>
                <Tr>
                  <Th>Pod</Th>
                  <Th>Namespace</Th>
                  <Th>Memory (MB)</Th>
                </Tr>
              </Thead>
              <Tbody>
                {metrics.topMemoryConsumers.map((p) => (
                  <Tr key={p.name}>
                    <Td>{p.name}</Td>
                    <Td>{p.namespace}</Td>
                    <Td>{p.memory}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardBody>
        </Card>
      </GridItem>
    </>
  );
};

const MetricsDashboard = ({ clusterIds }: MetricsDashboardProps) => {
  const apiBase = useApiBase();
  const [allMetrics, setAllMetrics] = useState<MetricsData[]>([]);
  const [loading, setLoading] = useState(true);

  // Consume chart extensions from other plugins (e.g. operator-plugin)
  const [chartExtensions, chartsResolved] =
    useResolvedExtensions(isObservabilityChart);

  useEffect(() => {
    Promise.all(
      clusterIds.map((id) =>
        fetchJson<MetricsData>(`${apiBase}/clusters/${id}/metrics`),
      ),
    ).then((results) => {
      setAllMetrics(results);
      setLoading(false);
    });
  }, [apiBase, clusterIds]);

  if (loading) return <Spinner size="lg" />;
  if (allMetrics.length === 0) return <div>No metrics data available</div>;

  return (
    <Grid hasGutter>
      {allMetrics.map((metrics) => (
        <ClusterMetricsSection key={metrics.clusterId} metrics={metrics} />
      ))}
      {chartsResolved &&
        chartExtensions.map((ext) => {
          const ChartComponent = ext.properties.component;
          return (
            <GridItem key={ext.uid}>
              <ChartComponent clusterIds={clusterIds} />
            </GridItem>
          );
        })}
    </Grid>
  );
};

export default MetricsDashboard;
