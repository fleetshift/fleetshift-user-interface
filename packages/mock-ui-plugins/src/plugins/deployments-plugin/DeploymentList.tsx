import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
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
import { useDeploymentStore } from "./deploymentStore";

const PER_PAGE = 20;

const DeploymentList: React.FC = () => {
  const { deployments, loading } = useDeploymentStore();
  const [nameFilter, setNameFilter] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () =>
      deployments.filter((dep) =>
        nameFilter
          ? dep.name.toLowerCase().includes(nameFilter.toLowerCase())
          : true,
      ),
    [deployments, nameFilter],
  );

  const paginatedItems = useMemo(
    () => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [filtered, page],
  );

  if (loading) {
    return (
      <Bullseye>
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
          <Title headingLevel="h1">Deployments</Title>
        </FlexItem>
        <FlexItem>
          <span
            style={{
              fontSize: "var(--pf-t--global--font--size--sm)",
              color: "var(--pf-t--global--text--color--subtle)",
            }}
          >
            {deployments.length} total
          </span>
        </FlexItem>
      </Flex>

      <Toolbar clearAllFilters={() => setNameFilter("")}>
        <ToolbarContent>
          <ToolbarItem>
            <SearchInput
              placeholder="Filter by name"
              value={nameFilter}
              onChange={(_event, value) => {
                setNameFilter(value);
                setPage(1);
              }}
              onClear={() => {
                setNameFilter("");
                setPage(1);
              }}
            />
          </ToolbarItem>
          <ToolbarItem variant="pagination" align={{ default: "alignEnd" }}>
            <Pagination
              itemCount={filtered.length}
              perPage={PER_PAGE}
              page={page}
              onSetPage={(_event, p) => setPage(p)}
              isCompact
            />
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>

      {filtered.length === 0 ? (
        <EmptyState titleText="No deployments found" headingLevel="h2">
          <EmptyStateBody>
            {deployments.length > 0
              ? "No deployments match the current filter."
              : "There are no deployments available."}
          </EmptyStateBody>
        </EmptyState>
      ) : (
        <>
          <Table aria-label="Deployments" variant="compact">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Namespace</Th>
                <Th>Cluster</Th>
                <Th>Ready</Th>
                <Th>Strategy</Th>
              </Tr>
            </Thead>
            <Tbody>
              {paginatedItems.map((dep) => {
                const allReady = dep.ready === dep.replicas && dep.replicas > 0;
                return (
                  <Tr key={dep.id}>
                    <Td dataLabel="Name">
                      <Link
                        to={`/deployments/${dep.id}`}
                        style={{
                          fontWeight:
                            "var(--pf-t--global--font--weight--heading--default)",
                        }}
                      >
                        {dep.name}
                      </Link>
                    </Td>
                    <Td dataLabel="Namespace">
                      <span
                        style={{
                          fontSize: "var(--pf-t--global--font--size--sm)",
                          color: "var(--pf-t--global--text--color--subtle)",
                        }}
                      >
                        {dep.namespace}
                      </span>
                    </Td>
                    <Td dataLabel="Cluster">{dep.cluster_id}</Td>
                    <Td dataLabel="Ready">
                      <Label color={allReady ? "green" : "orange"} isCompact>
                        {dep.ready}/{dep.replicas}
                      </Label>
                    </Td>
                    <Td dataLabel="Strategy">
                      <Label color="blue" isCompact>
                        {dep.strategy}
                      </Label>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
          <Toolbar>
            <ToolbarContent>
              <ToolbarItem variant="pagination" align={{ default: "alignEnd" }}>
                <Pagination
                  itemCount={filtered.length}
                  perPage={PER_PAGE}
                  page={page}
                  onSetPage={(_event, p) => setPage(p)}
                  isCompact
                />
              </ToolbarItem>
            </ToolbarContent>
          </Toolbar>
        </>
      )}
    </div>
  );
};

export default DeploymentList;
