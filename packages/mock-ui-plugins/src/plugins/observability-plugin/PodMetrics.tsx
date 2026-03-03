import { useEffect, useState } from "react";
import { Label, Spinner } from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import { useApiBase, fetchJson } from "./api";

interface PodMetric {
  name: string;
  namespace: string;
  cpu: number;
  memory: number;
  status: string;
}

interface MetricsResponse {
  pods: PodMetric[];
}

interface PodMetricsProps {
  clusterId: string;
}

const statusColor = (status: string) => {
  if (status === "Running") return "green";
  if (status === "Pending") return "blue";
  if (status === "CrashLoopBackOff") return "red";
  return "grey";
};

const PodMetrics = ({ clusterId }: PodMetricsProps) => {
  const apiBase = useApiBase();
  const [pods, setPods] = useState<PodMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson<MetricsResponse>(`${apiBase}/clusters/${clusterId}/metrics`).then(
      (data) => {
        setPods(data.pods);
        setLoading(false);
      },
    );
  }, [apiBase, clusterId]);

  if (loading) return <Spinner size="lg" />;

  return (
    <Table aria-label="Pod metrics" variant="compact">
      <Thead>
        <Tr>
          <Th>Pod</Th>
          <Th>Namespace</Th>
          <Th>Status</Th>
          <Th>CPU (cores)</Th>
          <Th>Memory (MB)</Th>
        </Tr>
      </Thead>
      <Tbody>
        {pods.map((pod) => (
          <Tr key={pod.name}>
            <Td>{pod.name}</Td>
            <Td>{pod.namespace}</Td>
            <Td>
              <Label color={statusColor(pod.status)}>{pod.status}</Label>
            </Td>
            <Td>{pod.cpu}</Td>
            <Td>{pod.memory}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};

export default PodMetrics;
