import { useEffect, useState } from "react";
import { Label, Spinner } from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import { useApiBase, fetchJson } from "./api";

interface Namespace {
  id: string;
  cluster_id: string;
  name: string;
  status: string;
  podCount: number;
}

interface NamespaceListProps {
  clusterIds: string[];
}

const NamespaceList = ({ clusterIds }: NamespaceListProps) => {
  const apiBase = useApiBase();
  const [namespaces, setNamespaces] = useState<Namespace[]>([]);
  const [loading, setLoading] = useState(true);
  const multiCluster = clusterIds.length > 1;

  useEffect(() => {
    Promise.all(
      clusterIds.map((id) =>
        fetchJson<Namespace[]>(`${apiBase}/clusters/${id}/namespaces`),
      ),
    ).then((results) => {
      setNamespaces(results.flat());
      setLoading(false);
    });
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
