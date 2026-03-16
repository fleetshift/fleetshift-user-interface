import { useState, useMemo } from "react";
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  Label,
  SearchInput,
  Spinner,
  ToggleGroup,
  ToggleGroupItem,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Tooltip,
} from "@patternfly/react-core";
import { Table, Thead, Tbody, Tr, Th, Td } from "@patternfly/react-table";
import { useEventStore } from "./eventStore";

type TypeFilter = "All" | "Normal" | "Warning";

function formatAge(createdAt: string): string {
  const raw = createdAt.includes("T")
    ? createdAt
    : createdAt.replace(" ", "T") + "Z";
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

function typeColor(type: string): "green" | "orange" {
  return type === "Normal" ? "green" : "orange";
}

function truncateMessage(message: string, maxLen: number): string {
  if (message.length <= maxLen) return message;
  return message.slice(0, maxLen) + "...";
}

const EventList: React.FC = () => {
  const { events, loading } = useEventStore();
  const [searchFilter, setSearchFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("All");

  const filtered = useMemo(
    () =>
      events.filter((event) => {
        if (typeFilter !== "All" && event.type !== typeFilter) return false;
        if (searchFilter) {
          const term = searchFilter.toLowerCase();
          if (
            !event.message.toLowerCase().includes(term) &&
            !event.reason.toLowerCase().includes(term)
          ) {
            return false;
          }
        }
        return true;
      }),
    [events, searchFilter, typeFilter],
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
          setSearchFilter("");
          setTypeFilter("All");
        }}
      >
        <ToolbarContent>
          <ToolbarItem>
            <SearchInput
              placeholder="Filter by message or reason"
              value={searchFilter}
              onChange={(_event, value) => setSearchFilter(value)}
              onClear={() => setSearchFilter("")}
            />
          </ToolbarItem>
          <ToolbarItem>
            <ToggleGroup aria-label="Event type filter">
              <ToggleGroupItem
                text="All"
                isSelected={typeFilter === "All"}
                onChange={() => setTypeFilter("All")}
              />
              <ToggleGroupItem
                text="Normal"
                isSelected={typeFilter === "Normal"}
                onChange={() => setTypeFilter("Normal")}
              />
              <ToggleGroupItem
                text="Warning"
                isSelected={typeFilter === "Warning"}
                onChange={() => setTypeFilter("Warning")}
              />
            </ToggleGroup>
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>

      {filtered.length === 0 ? (
        <EmptyState titleText="No events found" headingLevel="h2">
          <EmptyStateBody>
            {events.length > 0
              ? "No events match the current filters."
              : "There are no events available."}
          </EmptyStateBody>
        </EmptyState>
      ) : (
        <Table aria-label="Kubernetes events" variant="compact">
          <Thead>
            <Tr>
              <Th>Type</Th>
              <Th>Cluster</Th>
              <Th>Reason</Th>
              <Th>Message</Th>
              <Th>Source</Th>
              <Th>Age</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filtered.map((event) => {
              const truncated = truncateMessage(event.message, 120);
              const needsTooltip = event.message.length > 120;

              return (
                <Tr key={event.id}>
                  <Td dataLabel="Type">
                    <Label color={typeColor(event.type)}>{event.type}</Label>
                  </Td>
                  <Td dataLabel="Cluster">{event.cluster_id}</Td>
                  <Td dataLabel="Reason">{event.reason}</Td>
                  <Td dataLabel="Message">
                    {needsTooltip ? (
                      <Tooltip content={event.message}>
                        <span>{truncated}</span>
                      </Tooltip>
                    ) : (
                      truncated
                    )}
                  </Td>
                  <Td dataLabel="Source">{event.source}</Td>
                  <Td dataLabel="Age">{formatAge(event.created_at)}</Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      )}
    </>
  );
};

export default EventList;
