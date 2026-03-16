import { useState, useEffect, useMemo } from "react";
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Label,
  Pagination,
  SearchInput,
  Spinner,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from "@patternfly/react-core";
import { Table, Thead, Tbody, Tr, Th, Td } from "@patternfly/react-table";
import { useApiBase, fetchJson } from "./api";

interface Route {
  id: string;
  cluster_id: string;
  namespace_id: string;
  name: string;
  host: string;
  path: string;
  service_name: string;
  tls: 0 | 1;
  status: string;
}

const PER_PAGE = 20;

function extractNamespace(namespaceId: string, clusterId: string): string {
  if (namespaceId.startsWith(clusterId + "-")) {
    return namespaceId.slice(clusterId.length + 1);
  }
  return namespaceId;
}

const RouteList: React.FC<{ clusterIds: string[] }> = ({ clusterIds }) => {
  const apiBase = useApiBase();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (clusterIds.length === 0) {
      setRoutes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all(
      clusterIds.map((id) =>
        fetchJson<Route[]>(`${apiBase}/clusters/${id}/routes`).catch(
          () => [] as Route[],
        ),
      ),
    ).then((results) => {
      setRoutes(results.flat());
      setLoading(false);
    });
  }, [apiBase, clusterIds]);

  const filtered = useMemo(
    () =>
      routes.filter(
        (route) =>
          !filter || route.name.toLowerCase().includes(filter.toLowerCase()),
      ),
    [routes, filter],
  );

  const paginated = useMemo(
    () => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [filtered, page],
  );

  useEffect(() => {
    setPage(1);
  }, [filter]);

  if (loading) {
    return (
      <Bullseye style={{ padding: "var(--pf-t--global--spacer--2xl) 0" }}>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <div>
      <Flex
        alignItems={{ default: "alignItemsBaseline" }}
        gap={{ default: "gapSm" }}
        style={{ marginBottom: "var(--pf-t--global--spacer--lg)" }}
      >
        <FlexItem>
          <Title headingLevel="h1">Routes</Title>
        </FlexItem>
        <FlexItem>
          <span
            style={{
              fontSize: "var(--pf-t--global--font--size--sm)",
              color: "var(--pf-t--global--text--color--subtle)",
            }}
          >
            {routes.length} routes
          </span>
        </FlexItem>
      </Flex>

      <Toolbar>
        <ToolbarContent>
          <ToolbarItem>
            <SearchInput
              placeholder="Filter by name"
              value={filter}
              onChange={(_event, value) => setFilter(value)}
              onClear={() => setFilter("")}
            />
          </ToolbarItem>
          <ToolbarItem variant="pagination" align={{ default: "alignEnd" }}>
            <Pagination
              itemCount={filtered.length}
              perPage={PER_PAGE}
              page={page}
              onSetPage={(_e, p) => setPage(p)}
              isCompact
            />
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>

      {filtered.length === 0 ? (
        <EmptyState
          titleText={
            routes.length > 0 ? "No matching routes" : "No routes found"
          }
          headingLevel="h2"
        >
          <EmptyStateBody>
            {routes.length > 0
              ? "No routes match the current filter."
              : "There are no OpenShift Routes available for the selected clusters."}
          </EmptyStateBody>
        </EmptyState>
      ) : (
        <Table aria-label="OpenShift Routes" variant="compact">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Host / Path</Th>
              <Th>Service</Th>
              <Th>TLS</Th>
              <Th>Status</Th>
              <Th>Cluster</Th>
              <Th>Namespace</Th>
            </Tr>
          </Thead>
          <Tbody>
            {paginated.map((route) => (
              <Tr key={route.id}>
                <Td dataLabel="Name">
                  <span
                    style={{
                      fontWeight:
                        "var(--pf-t--global--font--weight--heading--default)",
                    }}
                  >
                    {route.name}
                  </span>
                </Td>
                <Td dataLabel="Host / Path">
                  <span
                    style={{
                      fontSize: "var(--pf-t--global--font--size--sm)",
                      color: "var(--pf-t--global--text--color--subtle)",
                    }}
                  >
                    {route.host}
                    {route.path}
                  </span>
                </Td>
                <Td dataLabel="Service">{route.service_name}</Td>
                <Td dataLabel="TLS">
                  <Label color={route.tls === 1 ? "green" : "grey"} isCompact>
                    {route.tls === 1 ? "Yes" : "No"}
                  </Label>
                </Td>
                <Td dataLabel="Status">
                  <Label
                    color={route.status === "Admitted" ? "green" : "red"}
                    isCompact
                  >
                    {route.status}
                  </Label>
                </Td>
                <Td dataLabel="Cluster">{route.cluster_id}</Td>
                <Td dataLabel="Namespace">
                  {extractNamespace(route.namespace_id, route.cluster_id)}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  );
};

export default RouteList;
