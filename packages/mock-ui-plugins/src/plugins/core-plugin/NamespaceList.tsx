import { useEffect, useState } from "react";
import { Label, Spinner } from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import type { Namespace } from "@fleetshift/common";
import * as common from "@fleetshift/common";
import { useApiBase } from "./api";

const { fetchNamespaces } = common;
interface NamespaceListProps {
  clusterIds: string[];
}

const NamespaceList = ({ clusterIds }: NamespaceListProps) => {
  const apiBase = useApiBase();
  const [namespaces, setNamespaces] = useState<Namespace[]>([]);
  const [loading, setLoading] = useState(true);
  const multiCluster = clusterIds.length > 1;

  useEffect(() => {
    Promise.all(clusterIds.map((id) => fetchNamespaces(apiBase, id))).then(
      (results) => {
        setNamespaces(results.flat());
        setLoading(false);
      },
    );
  }, [apiBase, clusterIds]);

  if (loading) return <Spinner size="lg" />;

  return (
    <Table aria-label="Namespace list" variant="compact">
      <Thead>
        <Tr>
          <Th>Name</Th>
          {multiCluster && <Th>Cluster</Th>}
          <Th>Status</Th>
          <Th>Pods</Th>
        </Tr>
      </Thead>
      <Tbody>
        {namespaces.map((ns) => (
          <Tr key={ns.id}>
            <Td>{ns.name}</Td>
            {multiCluster && <Td>{ns.cluster_id}</Td>}
            <Td>
              <Label color={ns.status === "Active" ? "green" : "orange"}>
                {ns.status}
              </Label>
            </Td>
            <Td>{ns.podCount}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};

export default NamespaceList;
