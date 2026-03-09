import { useEffect, useState } from "react";
import { Label, Spinner } from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import type { Pipeline } from "@fleetshift/common";
import { fetchPipelines } from "@fleetshift/common";
import { useApiBase } from "./api";

interface PipelineListProps {
  clusterIds: string[];
}

const statusColor = (status: string) => {
  if (status === "Succeeded") return "green";
  if (status === "Failed") return "red";
  if (status === "Running") return "blue";
  return "grey";
};

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
};

const PipelineList = ({ clusterIds }: PipelineListProps) => {
  const apiBase = useApiBase();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const multiCluster = clusterIds.length > 1;

  useEffect(() => {
    Promise.all(clusterIds.map((id) => fetchPipelines(apiBase, id))).then(
      (results) => {
        setPipelines(results.flat());
        setLoading(false);
      },
    );
  }, [apiBase, clusterIds]);

  if (loading) return <Spinner size="lg" />;

  return (
    <Table aria-label="Pipeline list" variant="compact">
      <Thead>
        <Tr>
          <Th>Name</Th>
          {multiCluster && <Th>Cluster</Th>}
          <Th>Status</Th>
          <Th>Started At</Th>
          <Th>Duration</Th>
          <Th>Stages</Th>
        </Tr>
      </Thead>
      <Tbody>
        {pipelines.map((p) => (
          <Tr key={p.id}>
            <Td>{p.name}</Td>
            {multiCluster && <Td>{p.cluster_id}</Td>}
            <Td>
              <Label color={statusColor(p.status)}>{p.status}</Label>
            </Td>
            <Td>{p.started_at}</Td>
            <Td>{formatDuration(p.duration_seconds)}</Td>
            <Td>{p.stages.join(" \u2192 ")}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};

export default PipelineList;
