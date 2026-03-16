import { useEffect, useState, useMemo } from "react";
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
  Tooltip,
} from "@patternfly/react-core";
import { Table, Thead, Tbody, Tr, Th, Td } from "@patternfly/react-table";
import { useApiBase, useClusterIds } from "./api";
import { formatRelativeTime, truncate } from "@fleetshift/common";

interface K8sEvent {
  id: string;
  cluster_id: string;
  namespace_id: string;
  type: string;
  reason: string;
  message: string;
  source: string;
  created_at: string;
}

function typeColor(type: string): "green" | "orange" {
  return type === "Normal" ? "green" : "orange";
}

const PER_PAGE = 20;

const EventList: React.FC<{ clusterIds: string[] }> = () => {
  const apiBase = useApiBase();
  const clusterIds = useClusterIds();
  const [events, setEvents] = useState<K8sEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (clusterIds.length === 0) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all(
      clusterIds.map((id) =>
        fetch(`${apiBase}/clusters/${id}/events`)
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => []),
      ),
    )
      .then((results: K8sEvent[][]) => {
        const all = results.flat();
        all.sort((a, b) => b.created_at.localeCompare(a.created_at));
        setEvents(all);
      })
      .finally(() => setLoading(false));
  }, [apiBase, clusterIds]);

  const filtered = useMemo(() => {
    if (!filter) return events;
    const lc = filter.toLowerCase();
    return events.filter(
      (e) =>
        e.reason.toLowerCase().includes(lc) ||
        e.message.toLowerCase().includes(lc) ||
        e.source.toLowerCase().includes(lc) ||
        e.namespace_id.toLowerCase().includes(lc),
    );
  }, [events, filter]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PER_PAGE;
    return filtered.slice(start, start + PER_PAGE);
  }, [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  if (loading) {
    return (
      <Bullseye>
        <Spinner size="xl" />
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
          <Title headingLevel="h1">Events</Title>
        </FlexItem>
        <FlexItem>
          <span
            style={{
              fontSize: "var(--pf-t--global--font--size--sm)",
              color: "var(--pf-t--global--text--color--subtle)",
            }}
          >
            {events.length} total
          </span>
        </FlexItem>
      </Flex>

      <Toolbar clearAllFilters={() => setFilter("")}>
        <ToolbarContent>
          <ToolbarItem>
            <SearchInput
              placeholder="Filter by reason, message, or source"
              value={filter}
              onChange={(_event, value) => setFilter(value)}
              onClear={() => setFilter("")}
              style={{ minWidth: 300 }}
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
          titleText={events.length === 0 ? "No events" : "No matching events"}
          headingLevel="h2"
        >
          <EmptyStateBody>
            {events.length === 0
              ? "There are no events available."
              : "No events match the current filter."}
          </EmptyStateBody>
        </EmptyState>
      ) : (
        <Table aria-label="Events" variant="compact">
          <Thead>
            <Tr>
              <Th>Type</Th>
              <Th>Reason</Th>
              <Th>Namespace</Th>
              <Th>Message</Th>
              <Th>Source</Th>
              <Th>Last Seen</Th>
            </Tr>
          </Thead>
          <Tbody>
            {paginated.map((event) => {
              const shortMessage = truncate(event.message, 80);
              const needsTooltip = event.message.length > 80;

              return (
                <Tr key={event.id}>
                  <Td dataLabel="Type">
                    <Label color={typeColor(event.type)} isCompact>
                      {event.type}
                    </Label>
                  </Td>
                  <Td dataLabel="Reason">
                    <span
                      style={{
                        fontWeight:
                          "var(--pf-t--global--font--weight--heading--default)",
                      }}
                    >
                      {event.reason}
                    </span>
                  </Td>
                  <Td dataLabel="Namespace">
                    <span
                      style={{
                        fontSize: "var(--pf-t--global--font--size--sm)",
                        color: "var(--pf-t--global--text--color--subtle)",
                      }}
                    >
                      {event.namespace_id}
                    </span>
                  </Td>
                  <Td dataLabel="Message">
                    {needsTooltip ? (
                      <Tooltip content={event.message}>
                        <span>{shortMessage}</span>
                      </Tooltip>
                    ) : (
                      shortMessage
                    )}
                  </Td>
                  <Td dataLabel="Source">
                    <span
                      style={{
                        fontSize: "var(--pf-t--global--font--size--sm)",
                        color: "var(--pf-t--global--text--color--subtle)",
                      }}
                    >
                      {event.source}
                    </span>
                  </Td>
                  <Td dataLabel="Last Seen">
                    <span
                      style={{
                        fontSize: "var(--pf-t--global--font--size--sm)",
                        color: "var(--pf-t--global--text--color--subtle)",
                      }}
                    >
                      {formatRelativeTime(event.created_at)}
                    </span>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      )}
    </div>
  );
};

export default EventList;
