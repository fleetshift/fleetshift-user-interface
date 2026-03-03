import { useEffect, useState } from "react";
import {
  Card,
  CardTitle,
  CardBody,
  Label,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Spinner,
  Grid,
  GridItem,
} from "@patternfly/react-core";
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
      setPodStats(aggregateData.filter((d) => clusterIds.includes(d.cluster_id)));
      setLoading(false);
    });
  }, [apiBase, clusterIds]);

  if (loading) return <Spinner size="md" />;

  return (
    <Grid hasGutter>
      {clusters.map((cluster) => {
        const stats = podStats.find((d) => d.cluster_id === cluster.id);
        return (
          <GridItem key={cluster.id}>
            <Card>
              <CardTitle>
                {cluster.name}{" "}
                <Label color={statusColor(cluster.status)}>
                  {cluster.status}
                </Label>
              </CardTitle>
              <CardBody>
                <DescriptionList>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Version</DescriptionListTerm>
                    <DescriptionListDescription>
                      {cluster.version}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Total Pods</DescriptionListTerm>
                    <DescriptionListDescription>
                      {stats?.total ?? 0}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Running</DescriptionListTerm>
                    <DescriptionListDescription>
                      <Label color="green">{stats?.running ?? 0}</Label>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Pending</DescriptionListTerm>
                    <DescriptionListDescription>
                      <Label color="blue">{stats?.pending ?? 0}</Label>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Failing</DescriptionListTerm>
                    <DescriptionListDescription>
                      <Label color="red">{stats?.failing ?? 0}</Label>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
              </CardBody>
            </Card>
          </GridItem>
        );
      })}
    </Grid>
  );
};

export default ClusterOverview;
