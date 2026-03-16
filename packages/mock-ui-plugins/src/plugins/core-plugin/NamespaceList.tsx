import { useState } from "react";
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  Label,
  SearchInput,
  Spinner,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from "@patternfly/react-core";
import { Table, Thead, Tbody, Tr, Th, Td } from "@patternfly/react-table";
import { useNamespaceStore } from "./namespaceStore";

const columnNames = {
  name: "Name",
  status: "Status",
  podCount: "Pod Count",
};

const NamespaceList: React.FC = () => {
  const { namespaces, loading } = useNamespaceStore();
  const [filter, setFilter] = useState("");

  const filtered = namespaces.filter((ns) =>
    ns.name.toLowerCase().includes(filter.toLowerCase()),
  );

  if (loading) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <>
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
        <Table aria-label="Namespaces" variant="compact">
          <Thead>
            <Tr>
              <Th>{columnNames.name}</Th>
              <Th>{columnNames.status}</Th>
              <Th>{columnNames.podCount}</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filtered.map((ns) => (
              <Tr key={ns.id}>
                <Td dataLabel={columnNames.name}>{ns.name}</Td>
                <Td dataLabel={columnNames.status}>
                  <Label color={ns.status === "Active" ? "green" : "red"}>
                    {ns.status}
                  </Label>
                </Td>
                <Td dataLabel={columnNames.podCount}>{ns.podCount}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </>
  );
};

export default NamespaceList;
