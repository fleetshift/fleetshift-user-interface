import { useState, useMemo } from "react";
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  Label,
  MenuToggle,
  SearchInput,
  Select,
  SelectList,
  SelectOption,
  Spinner,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from "@patternfly/react-core";
import { Table, Thead, Tbody, Tr, Th, Td } from "@patternfly/react-table";
import { usePodStore } from "./podStore";

function formatAge(createdAt: string): string {
  const raw = createdAt.includes("T") ? createdAt : createdAt.replace(" ", "T") + "Z";
  const created = new Date(raw);
  const now = Date.now();
  const diffMs = now - created.getTime();
  if (diffMs < 0) return "just now";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function statusColor(
  status: string,
): "green" | "blue" | "orange" | "red" | "grey" {
  switch (status) {
    case "Running":
      return "green";
    case "Completed":
    case "Succeeded":
      return "blue";
    case "Pending":
    case "ContainerCreating":
      return "orange";
    case "CrashLoopBackOff":
    case "ImagePullBackOff":
    case "ErrImagePull":
    case "Error":
    case "Failed":
      return "red";
    default:
      return "grey";
  }
}

const PodList: React.FC = () => {
  const { pods, loading } = usePodStore();
  const [nameFilter, setNameFilter] = useState("");
  const [nsFilter, setNsFilter] = useState<string | null>(null);
  const [nsSelectOpen, setNsSelectOpen] = useState(false);

  const namespaces = useMemo(
    () => [...new Set(pods.map((p) => p.namespace))].sort(),
    [pods],
  );

  const filtered = useMemo(
    () =>
      pods.filter((pod) => {
        if (
          nameFilter &&
          !pod.name.toLowerCase().includes(nameFilter.toLowerCase())
        )
          return false;
        if (nsFilter && pod.namespace !== nsFilter) return false;
        return true;
      }),
    [pods, nameFilter, nsFilter],
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
      <Toolbar
        clearAllFilters={() => {
          setNameFilter("");
          setNsFilter(null);
        }}
      >
        <ToolbarContent>
          <ToolbarItem>
            <SearchInput
              placeholder="Filter by name"
              value={nameFilter}
              onChange={(_event, value) => setNameFilter(value)}
              onClear={() => setNameFilter("")}
            />
          </ToolbarItem>
          <ToolbarItem>
            <Select
              isOpen={nsSelectOpen}
              onOpenChange={setNsSelectOpen}
              onSelect={(_event, value) => {
                setNsFilter(value as string);
                setNsSelectOpen(false);
              }}
              selected={nsFilter}
              toggle={(toggleRef) => (
                <MenuToggle
                  ref={toggleRef}
                  onClick={() => setNsSelectOpen((prev) => !prev)}
                  isExpanded={nsSelectOpen}
                  style={{ minWidth: "180px" }}
                >
                  {nsFilter ?? "All namespaces"}
                </MenuToggle>
              )}
            >
              <SelectList>
                {namespaces.map((ns) => (
                  <SelectOption key={ns} value={ns}>
                    {ns}
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>

      {filtered.length === 0 ? (
        <EmptyState titleText="No pods found" headingLevel="h2">
          <EmptyStateBody>
            {pods.length > 0
              ? "No pods match the current filters."
              : "There are no pods available."}
          </EmptyStateBody>
        </EmptyState>
      ) : (
        <Table aria-label="Pods" variant="compact">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Namespace</Th>
              <Th>Status</Th>
              <Th>Restarts</Th>
              <Th>CPU</Th>
              <Th>Memory</Th>
              <Th>Age</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filtered.map((pod) => (
              <Tr key={pod.id}>
                <Td dataLabel="Name">{pod.name}</Td>
                <Td dataLabel="Namespace">{pod.namespace}</Td>
                <Td dataLabel="Status">
                  <Label color={statusColor(pod.status)}>{pod.status}</Label>
                </Td>
                <Td dataLabel="Restarts">{pod.restarts}</Td>
                <Td dataLabel="CPU">
                  {pod.cpu_usage > 0
                    ? `${Math.round(pod.cpu_usage * 1000)}m`
                    : "—"}
                </Td>
                <Td dataLabel="Memory">
                  {pod.memory_usage > 0
                    ? `${Math.round(pod.memory_usage)}Mi`
                    : "—"}
                </Td>
                <Td dataLabel="Age">{formatAge(pod.created_at)}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </>
  );
};

export default PodList;
