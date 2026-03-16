import { useState, useMemo } from "react";
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Label,
  LabelGroup,
  Pagination,
  SearchInput,
  Spinner,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from "@patternfly/react-core";
import { Table, Thead, Tbody, Tr, Th, Td } from "@patternfly/react-table";
import { useNodeStore } from "./nodeStore";

const PER_PAGE = 20;

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

function roleLabel(role: string): {
  color: "blue" | "purple" | "teal" | "grey";
  text: string;
} {
  switch (role) {
    case "master":
      return { color: "purple", text: "control-plane" };
    case "worker":
      return { color: "blue", text: "worker" };
    case "infra":
      return { color: "teal", text: "infra" };
    default:
      return { color: "grey", text: role };
  }
}

function formatMemoryGb(mi: number): string {
  return (mi / 1024).toFixed(1);
}

const NodeList: React.FC = () => {
  const { nodes, loading } = useNodeStore();
  const [nameFilter, setNameFilter] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () =>
      nodes.filter((node) =>
        nameFilter
          ? node.name.toLowerCase().includes(nameFilter.toLowerCase())
          : true,
      ),
    [nodes, nameFilter],
  );

  const readyCount = useMemo(
    () => filtered.filter((n) => n.status === "Ready").length,
    [filtered],
  );
  const notReadyCount = filtered.length - readyCount;

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
          <Title headingLevel="h1">Nodes</Title>
        </FlexItem>
        <FlexItem>
          <span
            style={{
              fontSize: "var(--pf-t--global--font--size--sm)",
              color: "var(--pf-t--global--text--color--subtle)",
            }}
          >
            {readyCount} ready
            {notReadyCount > 0 ? ` / ${notReadyCount} not ready` : ""}
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
        <EmptyState titleText="No nodes found" headingLevel="h2">
          <EmptyStateBody>
            {nodes.length > 0
              ? "No nodes match the current filter."
              : "There are no nodes available."}
          </EmptyStateBody>
        </EmptyState>
      ) : (
        <>
          <Table aria-label="Nodes" variant="compact">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Cluster</Th>
                <Th>Status</Th>
                <Th>Roles</Th>
                <Th>CPU</Th>
                <Th>Memory</Th>

                <Th>Version</Th>
              </Tr>
            </Thead>
            <Tbody>
              {paginatedItems.map((node) => {
                const roles = node.role
                  .split(",")
                  .map((r) => r.trim())
                  .filter(Boolean);
                return (
                  <Tr key={node.id}>
                    <Td dataLabel="Name">
                      <span
                        style={{
                          fontWeight:
                            "var(--pf-t--global--font--weight--heading--default)",
                        }}
                      >
                        {node.name}
                      </span>
                    </Td>
                    <Td dataLabel="Cluster">{node.cluster_id}</Td>
                    <Td dataLabel="Status">
                      <Label color={statusColor(node.status)}>
                        {node.status}
                      </Label>
                    </Td>
                    <Td dataLabel="Roles">
                      <LabelGroup>
                        {roles.map((r) => {
                          const rl = roleLabel(r);
                          return (
                            <Label key={r} color={rl.color} isCompact>
                              {rl.text}
                            </Label>
                          );
                        })}
                      </LabelGroup>
                    </Td>
                    <Td dataLabel="CPU">
                      <span
                        style={{
                          color:
                            node.cpu_used > node.cpu_capacity * 0.9
                              ? "var(--pf-t--global--color--status--danger--default)"
                              : "var(--pf-t--global--text--color--regular)",
                        }}
                      >
                        {node.cpu_used}/{node.cpu_capacity} cores
                      </span>
                    </Td>
                    <Td dataLabel="Memory">
                      <span
                        style={{
                          color:
                            node.memory_used > node.memory_capacity * 0.9
                              ? "var(--pf-t--global--color--status--danger--default)"
                              : "var(--pf-t--global--text--color--regular)",
                        }}
                      >
                        {formatMemoryGb(node.memory_used)}/
                        {formatMemoryGb(node.memory_capacity)} GB
                      </span>
                    </Td>
                    <Td dataLabel="Version">
                      <span
                        style={{
                          fontFamily: "var(--pf-t--global--font--family--mono)",
                          fontSize: "var(--pf-t--global--font--size--sm)",
                        }}
                      >
                        {node.kubelet_version}
                      </span>
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

export default NodeList;
