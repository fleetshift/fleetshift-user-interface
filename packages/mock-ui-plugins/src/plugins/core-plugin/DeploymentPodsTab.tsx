import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  Label,
  Spinner,
} from "@patternfly/react-core";
import { Table, Thead, Tbody, Tr, Th, Td } from "@patternfly/react-table";
import { useApiBase } from "./api";
import { formatAge } from "@fleetshift/common";

interface DeploymentTabProps {
  deploymentId: string;
  deploymentName: string;
  namespace: string;
  clusterId: string;
}

interface Pod {
  id: string;
  name: string;
  namespace: string;
  namespace_id: string;
  cluster_id: string;
  status: string;
  restarts: number;
  cpu_usage: number;
  memory_usage: number;
  created_at: string;
}

function statusColor(
  status: string,
): "green" | "blue" | "orange" | "red" | "grey" {
  switch (status) {
    case "Running":
      return "green";
    case "Completed":
    case "Succeeded":
      return "blue";
    case "Pending":
    case "ContainerCreating":
      return "orange";
    case "CrashLoopBackOff":
    case "ImagePullBackOff":
    case "ErrImagePull":
    case "Error":
    case "Failed":
      return "red";
    default:
      return "grey";
  }
}

const DeploymentPodsTab: React.FC<DeploymentTabProps> = ({
  deploymentName,
  namespace,
  clusterId,
}) => {
  const apiBase = useApiBase();
  const [pods, setPods] = useState<Pod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${apiBase}/clusters/${clusterId}/pods`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Pod[]) => {
        const filtered = data.filter(
          (p) =>
            p.name.startsWith(deploymentName + "-") &&
            (p.namespace === namespace ||
              p.namespace_id === namespace ||
              p.namespace_id === `${clusterId}-${namespace}`),
        );
        setPods(filtered);
      })
      .catch(() => setPods([]))
      .finally(() => setLoading(false));
  }, [apiBase, clusterId, deploymentName, namespace]);

  if (loading) {
    return (
      <Bullseye>
        <Spinner size="lg" />
      </Bullseye>
    );
  }

  if (pods.length === 0) {
    return (
      <EmptyState titleText="No pods" headingLevel="h3">
        <EmptyStateBody>No pods found for this deployment.</EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <Table aria-label="Deployment Pods" variant="compact">
      <Thead>
        <Tr>
          <Th>Name</Th>
          <Th>Status</Th>
          <Th>Restarts</Th>
          <Th>CPU</Th>
          <Th>Memory</Th>
          <Th>Age</Th>
        </Tr>
      </Thead>
      <Tbody>
        {pods.map((pod) => (
          <Tr key={pod.id}>
            <Td dataLabel="Name">
              <Link
                to={`/pods/${pod.id}`}
                style={{
                  fontWeight:
                    "var(--pf-t--global--font--weight--heading--default)",
                }}
              >
                {pod.name}
              </Link>
            </Td>
            <Td dataLabel="Status">
              <Label color={statusColor(pod.status)} isCompact>
                {pod.status}
              </Label>
            </Td>
            <Td dataLabel="Restarts">{pod.restarts}</Td>
            <Td dataLabel="CPU">
              <span
                style={{
                  fontFamily: "var(--pf-t--global--font--family--mono)",
                  fontSize: "var(--pf-t--global--font--size--sm)",
                }}
              >
                {pod.cpu_usage > 0
                  ? `${Math.round(pod.cpu_usage * 1000)}m`
                  : "\u2014"}
              </span>
            </Td>
            <Td dataLabel="Memory">
              <span
                style={{
                  fontFamily: "var(--pf-t--global--font--family--mono)",
                  fontSize: "var(--pf-t--global--font--size--sm)",
                }}
              >
                {pod.memory_usage > 0
                  ? `${Math.round(pod.memory_usage)}Mi`
                  : "\u2014"}
              </span>
            </Td>
            <Td dataLabel="Age">
              <span
                style={{
                  fontSize: "var(--pf-t--global--font--size--sm)",
                  color: "var(--pf-t--global--text--color--subtle)",
                }}
              >
                {pod.created_at ? formatAge(pod.created_at) : "\u2014"}
              </span>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};

export default DeploymentPodsTab;
