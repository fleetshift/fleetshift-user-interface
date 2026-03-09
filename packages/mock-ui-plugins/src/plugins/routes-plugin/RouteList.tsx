import { useEffect, useState } from "react";
import { Label, Spinner } from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import type { Route } from "@fleetshift/common";
import { fetchRoutes } from "@fleetshift/common";
import { useApiBase } from "./api";

interface RouteListProps {
  clusterIds: string[];
}

const RouteList = ({ clusterIds }: RouteListProps) => {
  const apiBase = useApiBase();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const multiCluster = clusterIds.length > 1;

  useEffect(() => {
    Promise.all(clusterIds.map((id) => fetchRoutes(apiBase, id))).then(
      (results) => {
        setRoutes(results.flat());
        setLoading(false);
      },
    );
  }, [apiBase, clusterIds]);

  if (loading) return <Spinner size="lg" />;

  return (
    <Table aria-label="Route list" variant="compact">
      <Thead>
        <Tr>
          <Th>Name</Th>
          {multiCluster && <Th>Cluster</Th>}
          <Th>Host</Th>
          <Th>Path</Th>
          <Th>Service</Th>
          <Th>TLS</Th>
          <Th>Status</Th>
        </Tr>
      </Thead>
      <Tbody>
        {routes.map((route) => (
          <Tr key={route.id}>
            <Td>{route.name}</Td>
            {multiCluster && <Td>{route.cluster_id}</Td>}
            <Td>{route.host}</Td>
            <Td>{route.path}</Td>
            <Td>{route.service_name}</Td>
            <Td>
              <Label color={route.tls === 1 ? "green" : "grey"}>
                {route.tls === 1 ? "Yes" : "No"}
              </Label>
            </Td>
            <Td>
              <Label color={route.status === "Admitted" ? "green" : "red"}>
                {route.status}
              </Label>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};

export default RouteList;
