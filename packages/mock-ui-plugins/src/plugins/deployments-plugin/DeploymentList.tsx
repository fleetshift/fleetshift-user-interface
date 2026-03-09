import { useEffect, useState } from "react";
import { Label, Spinner } from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import type { Deployment } from "@fleetshift/common";
import { fetchDeployments } from "@fleetshift/common";
import { useApiBase } from "./api";

interface DeploymentListProps {
  clusterIds: string[];
}

const DeploymentList = ({ clusterIds }: DeploymentListProps) => {
  const apiBase = useApiBase();
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const multiCluster = clusterIds.length > 1;

  useEffect(() => {
    Promise.all(clusterIds.map((id) => fetchDeployments(apiBase, id))).then(
      (results) => {
        setDeployments(results.flat());
        setLoading(false);
      },
    );
  }, [apiBase, clusterIds]);

  if (loading) return <Spinner size="lg" />;

  return (
    <Table aria-label="Deployment list" variant="compact">
      <Thead>
        <Tr>
          <Th>Name</Th>
          {multiCluster && <Th>Cluster</Th>}
          <Th>Namespace</Th>
          <Th>Replicas</Th>
          <Th>Available</Th>
          <Th>Strategy</Th>
          <Th>Image</Th>
        </Tr>
      </Thead>
      <Tbody>
        {deployments.map((dep) => (
          <Tr key={dep.id}>
            <Td>{dep.name}</Td>
            {multiCluster && <Td>{dep.cluster_id}</Td>}
            <Td>
              {dep.namespace_id?.replace(`${dep.cluster_id}-`, "") ?? "N/A"}
            </Td>
            <Td>
              <Label
                color={dep.available === dep.replicas ? "green" : "orange"}
              >
                {dep.ready}/{dep.replicas}
              </Label>
            </Td>
            <Td>{dep.available}</Td>
            <Td>{dep.strategy}</Td>
            <Td>{dep.image}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};

export default DeploymentList;
