import { useEffect, useState } from "react";
import { Label, Spinner } from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import type { Alert } from "@fleetshift/common";
import { fetchAlerts } from "@fleetshift/common";
import { useApiBase } from "./api";

interface AlertListProps {
  clusterIds: string[];
}

const severityColor = (severity: string) => {
  if (severity === "critical") return "red";
  if (severity === "warning") return "orange";
  if (severity === "info") return "blue";
  return "grey";
};

const stateColor = (state: string) => {
  if (state === "firing") return "red";
  if (state === "pending") return "orange";
  if (state === "resolved") return "green";
  return "grey";
};

const AlertList = ({ clusterIds }: AlertListProps) => {
  const apiBase = useApiBase();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const multiCluster = clusterIds.length > 1;

  useEffect(() => {
    Promise.all(clusterIds.map((id) => fetchAlerts(apiBase, id))).then(
      (results) => {
        setAlerts(results.flat());
        setLoading(false);
      },
    );
  }, [apiBase, clusterIds]);

  if (loading) return <Spinner size="lg" />;

  return (
    <Table aria-label="Alert list" variant="compact">
      <Thead>
        <Tr>
          <Th>Name</Th>
          {multiCluster && <Th>Cluster</Th>}
          <Th>Severity</Th>
          <Th>State</Th>
          <Th>Message</Th>
          <Th>Fired At</Th>
        </Tr>
      </Thead>
      <Tbody>
        {alerts.map((alert) => (
          <Tr key={alert.id}>
            <Td>{alert.name}</Td>
            {multiCluster && <Td>{alert.cluster_id}</Td>}
            <Td>
              <Label color={severityColor(alert.severity)}>
                {alert.severity}
              </Label>
            </Td>
            <Td>
              <Label color={stateColor(alert.state)}>{alert.state}</Label>
            </Td>
            <Td>{alert.message}</Td>
            <Td>{alert.fired_at}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};

export default AlertList;
