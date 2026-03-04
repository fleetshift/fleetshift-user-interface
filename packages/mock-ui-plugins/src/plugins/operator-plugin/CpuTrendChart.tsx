import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardTitle,
  CardBody,
  Grid,
  GridItem,
  Spinner,
} from "@patternfly/react-core";
import {
  Chart,
  ChartArea,
  ChartAxis,
  ChartGroup,
  ChartVoronoiContainer,
} from "@patternfly/react-charts/victory";
import { useScalprum } from "@scalprum/react-core";
import { useApiBase, fetchJson } from "./api";

interface MetricsData {
  clusterId: string;
  topCpuConsumers: { name: string; namespace: string; cpu: number }[];
}

interface CpuTrendChartProps {
  clusterIds: string[];
}

interface ClusterTrend {
  clusterId: string;
  series: { name: string; data: { x: string; y: number }[] }[];
}

// Generate synthetic trend data from the snapshot values
function buildTrendData(consumers: { name: string; cpu: number }[]) {
  const top3 = consumers.slice(0, 3);
  return top3.map((pod) => ({
    name: pod.name.split("-")[0],
    data: Array.from({ length: 6 }, (_, i) => ({
      x: `${(i + 1) * 10}m ago`,
      y: Math.max(0.1, pod.cpu * (0.6 + Math.random() * 0.8)),
    })),
  }));
}

const SingleClusterChart = ({ trend }: { trend: ClusterTrend }) => (
  <Card>
    <CardTitle>CPU Trend — {trend.clusterId} (Operator Plugin)</CardTitle>
    <CardBody>
      <div style={{ height: 250 }}>
        <Chart
          ariaTitle={`CPU usage trend for ${trend.clusterId}`}
          containerComponent={
            <ChartVoronoiContainer
              labels={({ datum }: { datum: { y: number } }) =>
                `${datum.y.toFixed(2)} cores`
              }
            />
          }
          height={250}
          padding={{ bottom: 50, left: 60, right: 20, top: 20 }}
        >
          <ChartAxis />
          <ChartAxis dependentAxis showGrid label="CPU (cores)" />
          <ChartGroup>
            {trend.series.map((s) => (
              <ChartArea key={s.name} data={s.data} name={s.name} />
            ))}
          </ChartGroup>
        </Chart>
      </div>
    </CardBody>
  </Card>
);

const CpuTrendChart = ({ clusterIds }: CpuTrendChartProps) => {
  const apiBase = useApiBase();
  const { api } = useScalprum<{
    api: {
      fleetshift: { getClusterIdsForPlugin: (key: string) => string[] };
    };
  }>();
  const [clusterTrends, setClusterTrends] = useState<ClusterTrend[]>([]);
  const [loading, setLoading] = useState(true);

  // Only show charts for clusters that have the operator plugin enabled
  const filteredIds = useMemo(() => {
    const operatorIds = new Set(
      api.fleetshift.getClusterIdsForPlugin("operator"),
    );
    return clusterIds.filter((id) => operatorIds.has(id));
  }, [api, clusterIds]);

  useEffect(() => {
    if (filteredIds.length === 0) {
      setClusterTrends([]);
      setLoading(false);
      return;
    }

    Promise.all(
      filteredIds.map((id) =>
        fetchJson<MetricsData>(`${apiBase}/clusters/${id}/metrics`),
      ),
    ).then((results) => {
      setClusterTrends(
        results.map((r) => ({
          clusterId: r.clusterId,
          series: buildTrendData(r.topCpuConsumers),
        })),
      );
      setLoading(false);
    });
  }, [apiBase, filteredIds]);

  if (loading) return <Spinner size="lg" />;
  if (clusterTrends.length === 0) return null;

  return (
    <Grid hasGutter>
      {clusterTrends.map((trend) => (
        <GridItem key={trend.clusterId} md={6}>
          <SingleClusterChart trend={trend} />
        </GridItem>
      ))}
    </Grid>
  );
};

export default CpuTrendChart;
