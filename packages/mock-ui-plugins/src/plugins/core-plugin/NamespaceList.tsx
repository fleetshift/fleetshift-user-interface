import { useState, useMemo } from "react";
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
import { useNamespaceStore } from "./namespaceStore";

const PER_PAGE = 20;

const NamespaceList: React.FC = () => {
  const { namespaces, loading } = useNamespaceStore();
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () =>
      namespaces.filter((ns) =>
        filter ? ns.name.toLowerCase().includes(filter.toLowerCase()) : true,
      ),
    [namespaces, filter],
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
          <Title headingLevel="h1">Namespaces</Title>
        </FlexItem>
        <FlexItem>
          <span
            style={{
              fontSize: "var(--pf-t--global--font--size--sm)",
              color: "var(--pf-t--global--text--color--subtle)",
            }}
          >
            {namespaces.length} total
          </span>
        </FlexItem>
      </Flex>

      <Toolbar clearAllFilters={() => setFilter("")}>
        <ToolbarContent>
          <ToolbarItem>
            <SearchInput
              placeholder="Filter by name"
              value={filter}
              onChange={(_event, value) => {
                setFilter(value);
                setPage(1);
              }}
              onClear={() => {
                setFilter("");
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
        <EmptyState titleText="No namespaces found" headingLevel="h2">
          <EmptyStateBody>
            {namespaces.length > 0
              ? "No namespaces match the current filter."
              : "There are no namespaces available."}
          </EmptyStateBody>
        </EmptyState>
      ) : (
        <>
          <Table aria-label="Namespaces" variant="compact">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Cluster</Th>
                <Th>Status</Th>
                <Th>Pods</Th>
              </Tr>
            </Thead>
            <Tbody>
              {paginatedItems.map((ns) => (
                <Tr key={ns.id}>
                  <Td dataLabel="Name">
                    <span
                      style={{
                        fontWeight:
                          "var(--pf-t--global--font--weight--heading--default)",
                      }}
                    >
                      {ns.name}
                    </span>
                  </Td>
                  <Td dataLabel="Cluster">{ns.cluster_id}</Td>
                  <Td dataLabel="Status">
                    <Label
                      color={ns.status === "Active" ? "green" : "red"}
                      isCompact
                    >
                      {ns.status}
                    </Label>
                  </Td>
                  <Td dataLabel="Pods">{ns.podCount}</Td>
                </Tr>
              ))}
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

export default NamespaceList;
