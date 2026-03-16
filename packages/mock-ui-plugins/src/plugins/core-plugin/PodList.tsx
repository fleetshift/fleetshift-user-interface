import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Label,
  MenuToggle,
  Pagination,
  SearchInput,
  Select,
  SelectList,
  SelectOption,
  Spinner,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from "@patternfly/react-core";
import { Table, Thead, Tbody, Tr, Th, Td } from "@patternfly/react-table";
import { usePodStore } from "./podStore";
import { formatAge } from "@fleetshift/common";

const PER_PAGE = 20;

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
  const [page, setPage] = useState(1);

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
          <Title headingLevel="h1">Pods</Title>
        </FlexItem>
        <FlexItem>
          <span
            style={{
              fontSize: "var(--pf-t--global--font--size--sm)",
              color: "var(--pf-t--global--text--color--subtle)",
            }}
          >
            {pods.length} total
          </span>
        </FlexItem>
      </Flex>

      <Toolbar
        clearAllFilters={() => {
          setNameFilter("");
          setNsFilter(null);
          setPage(1);
        }}
      >
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
          <ToolbarItem>
            <Select
              isOpen={nsSelectOpen}
              onOpenChange={setNsSelectOpen}
              onSelect={(_event, value) => {
                setNsFilter(value as string);
                setNsSelectOpen(false);
                setPage(1);
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
        <EmptyState titleText="No pods found" headingLevel="h2">
          <EmptyStateBody>
            {pods.length > 0
              ? "No pods match the current filters."
              : "There are no pods available."}
          </EmptyStateBody>
        </EmptyState>
      ) : (
        <>
          <Table aria-label="Pods" variant="compact">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Cluster</Th>
                <Th>Namespace</Th>
                <Th>Status</Th>
                <Th>Restarts</Th>
                <Th>CPU</Th>
                <Th>Memory</Th>
                <Th>Age</Th>
              </Tr>
            </Thead>
            <Tbody>
              {paginatedItems.map((pod) => (
                <Tr key={pod.id}>
                  <Td dataLabel="Name">
                    <Link
                      to={`/pods/${pod.id}`}
                      style={{
                        fontWeight:
                          "var(--pf-t--global--font--weight--heading--default)",
                      }}
                    >
                      {pod.name}
                    </Link>
                  </Td>
                  <Td dataLabel="Cluster">{pod.cluster_id}</Td>
                  <Td dataLabel="Namespace">
                    <span
                      style={{
                        fontSize: "var(--pf-t--global--font--size--sm)",
                        color: "var(--pf-t--global--text--color--subtle)",
                      }}
                    >
                      {pod.namespace}
                    </span>
                  </Td>
                  <Td dataLabel="Status">
                    <Label color={statusColor(pod.status)} isCompact>
                      {pod.status}
                    </Label>
                  </Td>
                  <Td dataLabel="Restarts">{pod.restarts}</Td>
                  <Td dataLabel="CPU">
                    <span
                      style={{
                        fontFamily: "var(--pf-t--global--font--family--mono)",
                        fontSize: "var(--pf-t--global--font--size--sm)",
                      }}
                    >
                      {pod.cpu_usage > 0
                        ? `${Math.round(pod.cpu_usage * 1000)}m`
                        : "\u2014"}
                    </span>
                  </Td>
                  <Td dataLabel="Memory">
                    <span
                      style={{
                        fontFamily: "var(--pf-t--global--font--family--mono)",
                        fontSize: "var(--pf-t--global--font--size--sm)",
                      }}
                    >
                      {pod.memory_usage > 0
                        ? `${Math.round(pod.memory_usage)}Mi`
                        : "\u2014"}
                    </span>
                  </Td>
                  <Td dataLabel="Age">{formatAge(pod.created_at)}</Td>
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

export default PodList;
