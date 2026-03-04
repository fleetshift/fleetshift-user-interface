import { useEffect, useState } from "react";
import {
  Card,
  CardTitle,
  CardBody,
  Label,
  Flex,
  FlexItem,
  Spinner,
  Grid,
  GridItem,
} from "@patternfly/react-core";
import { CheckCircleIcon } from "@patternfly/react-icons";
import { useApiBase, fetchJson } from "./api";

interface PodAggregate {
  cluster_id: string;
  total: number;
  running: number;
  pending: number;
  failing: number;
  avg_cpu: number;
  avg_memory: number;
}

interface ClusterMeta {
  id: string;
  name: string;
  status: string;
  version: string;
  plugins: string[];
  created_at: string;
}

interface ClusterOverviewProps {
  clusterIds: string[];
}

const statusColor = (status: string) => {
  if (status === "ready") return "green";
  if (status === "error") return "red";
  return "blue";
};

const StatBox = ({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color?: "green" | "blue" | "red";
}) => (
  <div style={{ textAlign: "center" }}>
    <div
      style={{
        fontSize: "var(--pf-t--global--font--size--2xl)",
        fontWeight: "var(--pf-t--global--font--weight--heading--default)",
        color: color
          ? `var(--pf-t--global--color--status--${color}--default)`
          : undefined,
      }}
    >
      {value}
    </div>
    <div
      style={{
        fontSize: "var(--pf-t--global--font--size--xs)",
        color: "var(--pf-t--global--text--color--subtle)",
      }}
    >
      {label}
    </div>
  </div>
);

const ClusterOverview = ({ clusterIds }: ClusterOverviewProps) => {
  const apiBase = useApiBase();
  const [clusters, setClusters] = useState<ClusterMeta[]>([]);
  const [podStats, setPodStats] = useState<PodAggregate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      Promise.all(
        clusterIds.map((id) =>
          fetchJson<ClusterMeta>(`${apiBase}/clusters/${id}`),
        ),
      ),
      fetchJson<PodAggregate[]>(`${apiBase}/pods/aggregate`),
    ]).then(([clusterData, aggregateData]) => {
      setClusters(clusterData);
      setPodStats(
        aggregateData.filter((d) => clusterIds.includes(d.cluster_id)),
      );
      setLoading(false);
    });
  }, [apiBase, clusterIds]);

  if (loading) return <Spinner size="md" />;

  return (
    <Grid hasGutter>
      {clusters.map((cluster) => {
        const stats = podStats.find((d) => d.cluster_id === cluster.id);
        return (
          <GridItem key={cluster.id} md={6}>
            <Card>
              <CardTitle>
                <Flex
                  justifyContent={{ default: "justifyContentSpaceBetween" }}
                  alignItems={{ default: "alignItemsCenter" }}
                >
                  <FlexItem>
                    <span
                      style={{
                        fontWeight:
                          "var(--pf-t--global--font--weight--heading--default)",
                      }}
                    >
                      {cluster.name}
                    </span>
                    <div
                      style={{
                        fontSize: "var(--pf-t--global--font--size--sm)",
                        color: "var(--pf-t--global--text--color--subtle)",
                        fontWeight: "normal",
                      }}
                    >
                      {cluster.version}
                    </div>
                  </FlexItem>
                  <FlexItem>
                    <Label
                      color={statusColor(cluster.status)}
                      icon={
                        cluster.status === "ready" ? (
                          <CheckCircleIcon />
                        ) : undefined
                      }
                      isCompact
                    >
                      {cluster.status}
                    </Label>
                  </FlexItem>
                </Flex>
              </CardTitle>
              <CardBody>
                <Flex
                  justifyContent={{ default: "justifyContentSpaceAround" }}
                  alignItems={{ default: "alignItemsCenter" }}
                >
                  <FlexItem>
                    <StatBox value={stats?.total ?? 0} label="Total Pods" />
                  </FlexItem>
                  <FlexItem>
                    <StatBox
                      value={stats?.running ?? 0}
                      label="Running"
                      color="green"
                    />
                  </FlexItem>
                  <FlexItem>
                    <StatBox
                      value={stats?.pending ?? 0}
                      label="Pending"
                      color="blue"
                    />
                  </FlexItem>
                  <FlexItem>
                    <StatBox
                      value={stats?.failing ?? 0}
                      label="Failing"
                      color="red"
                    />
                  </FlexItem>
                </Flex>
              </CardBody>
            </Card>
          </GridItem>
        );
      })}
    </Grid>
  );
};

export default ClusterOverview;
