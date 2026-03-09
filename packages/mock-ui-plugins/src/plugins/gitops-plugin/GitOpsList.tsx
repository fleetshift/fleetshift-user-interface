import { useEffect, useState } from "react";
import { Label, Spinner } from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import type { GitOpsApp } from "@fleetshift/common";
import { fetchGitOpsApps } from "@fleetshift/common";
import { useApiBase } from "./api";

interface GitOpsListProps {
  clusterIds: string[];
}

const syncColor = (status: string) => {
  if (status === "Synced") return "green";
  if (status === "OutOfSync") return "orange";
  return "grey";
};

const healthColor = (status: string) => {
  if (status === "Healthy") return "green";
  if (status === "Degraded") return "red";
  if (status === "Progressing") return "blue";
  return "grey";
};

const GitOpsList = ({ clusterIds }: GitOpsListProps) => {
  const apiBase = useApiBase();
  const [apps, setApps] = useState<GitOpsApp[]>([]);
  const [loading, setLoading] = useState(true);
  const multiCluster = clusterIds.length > 1;

  useEffect(() => {
    Promise.all(clusterIds.map((id) => fetchGitOpsApps(apiBase, id))).then(
      (results) => {
        setApps(results.flat());
        setLoading(false);
      },
    );
  }, [apiBase, clusterIds]);

  if (loading) return <Spinner size="lg" />;

  return (
    <Table aria-label="GitOps application list" variant="compact">
      <Thead>
        <Tr>
          <Th>App Name</Th>
          {multiCluster && <Th>Cluster</Th>}
          <Th>Repository</Th>
          <Th>Path</Th>
          <Th>Sync Status</Th>
          <Th>Health</Th>
          <Th>Last Synced</Th>
        </Tr>
      </Thead>
      <Tbody>
        {apps.map((app) => (
          <Tr key={app.id}>
            <Td>{app.name}</Td>
            {multiCluster && <Td>{app.cluster_id}</Td>}
            <Td>{app.repo}</Td>
            <Td>{app.path}</Td>
            <Td>
              <Label color={syncColor(app.sync_status)}>
                {app.sync_status}
              </Label>
            </Td>
            <Td>
              <Label color={healthColor(app.health_status)}>
                {app.health_status}
              </Label>
            </Td>
            <Td>{app.last_synced}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};

export default GitOpsList;
