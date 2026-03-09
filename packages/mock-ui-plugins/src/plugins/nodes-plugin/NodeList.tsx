import { useEffect, useState } from "react";
import { Label, Spinner } from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import type { Node } from "@fleetshift/common";
import { fetchNodes } from "@fleetshift/common";
import { useApiBase } from "./api";

interface NodeListProps {
  clusterIds: string[];
}

const NodeList = ({ clusterIds }: NodeListProps) => {
  const apiBase = useApiBase();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const multiCluster = clusterIds.length > 1;

  useEffect(() => {
    Promise.all(clusterIds.map((id) => fetchNodes(apiBase, id))).then(
      (results) => {
        setNodes(results.flat());
        setLoading(false);
      },
    );
  }, [apiBase, clusterIds]);

  if (loading) return <Spinner size="lg" />;

  return (
    <Table aria-label="Node list" variant="compact">
      <Thead>
        <Tr>
          <Th>Name</Th>
          {multiCluster && <Th>Cluster</Th>}
          <Th>Role</Th>
          <Th>Status</Th>
          <Th>CPU</Th>
          <Th>Memory (MB)</Th>
          <Th>Kubelet Version</Th>
        </Tr>
      </Thead>
      <Tbody>
        {nodes.map((node) => (
          <Tr key={node.id}>
            <Td>{node.name}</Td>
            {multiCluster && <Td>{node.cluster_id}</Td>}
            <Td>{node.role}</Td>
            <Td>
              <Label color={node.status === "Ready" ? "green" : "red"}>
                {node.status}
              </Label>
            </Td>
            <Td>
              {node.cpu_used}/{node.cpu_capacity}
            </Td>
            <Td>
              {node.memory_used}/{node.memory_capacity}
            </Td>
            <Td>{node.kubelet_version}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};

export default NodeList;
