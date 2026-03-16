import { useState, useMemo } from "react";
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
import { useNodeStore } from "./nodeStore";

function statusColor(status: string): "green" | "red" | "grey" {
  switch (status) {
    case "Ready":
      return "green";
    case "NotReady":
      return "red";
    default:
      return "grey";
  }
}

function roleColor(role: string): "blue" | "purple" | "teal" | "grey" {
  switch (role) {
    case "master":
      return "purple";
    case "worker":
      return "blue";
    case "infra":
      return "teal";
    default:
      return "grey";
  }
}

function formatCpu(used: number, capacity: number): string {
  return `${used}/${capacity} cores`;
}

function formatMemory(used: number, capacity: number): string {
  return `${used}/${capacity} Mi`;
}

const NodeList: React.FC = () => {
  const { nodes, loading } = useNodeStore();
  const [nameFilter, setNameFilter] = useState("");

  const filtered = useMemo(
    () =>
      nodes.filter((node) => {
        if (
          nameFilter &&
          !node.name.toLowerCase().includes(nameFilter.toLowerCase())
        )
          return false;
        return true;
      }),
    [nodes, nameFilter],
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
      <Toolbar clearAllFilters={() => setNameFilter("")}>
        <ToolbarContent>
          <ToolbarItem>
            <SearchInput
              placeholder="Filter by name"
              value={nameFilter}
              onChange={(_event, value) => setNameFilter(value)}
              onClear={() => setNameFilter("")}
            />
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>

      {filtered.length === 0 ? (
        <EmptyState titleText="No nodes found" headingLevel="h2">
          <EmptyStateBody>
            {nodes.length > 0
              ? "No nodes match the current filter."
              : "There are no nodes available."}
          </EmptyStateBody>
        </EmptyState>
      ) : (
        <Table aria-label="Nodes" variant="compact">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Cluster</Th>
              <Th>Status</Th>
              <Th>Role</Th>
              <Th>CPU</Th>
              <Th>Memory</Th>
              <Th>Version</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filtered.map((node) => (
              <Tr key={node.id}>
                <Td dataLabel="Name">{node.name}</Td>
                <Td dataLabel="Cluster">{node.cluster_id}</Td>
                <Td dataLabel="Status">
                  <Label color={statusColor(node.status)}>{node.status}</Label>
                </Td>
                <Td dataLabel="Role">
                  <Label color={roleColor(node.role)}>{node.role}</Label>
                </Td>
                <Td dataLabel="CPU">
                  {formatCpu(node.cpu_used, node.cpu_capacity)}
                </Td>
                <Td dataLabel="Memory">
                  {formatMemory(node.memory_used, node.memory_capacity)}
                </Td>
                <Td dataLabel="Version">{node.kubelet_version}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </>
  );
};

export default NodeList;
