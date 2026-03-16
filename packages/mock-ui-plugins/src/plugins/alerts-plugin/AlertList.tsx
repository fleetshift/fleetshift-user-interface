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
} from "@patternfly/react-core";
import { Table, Thead, Tbody, Tr, Th, Td } from "@patternfly/react-table";
import { useApiBase, useClusterIds } from "./api";
import { formatRelativeTime } from "@fleetshift/common";

interface Alert {
  id: string;
  cluster_id: string;
  name: string;
  severity: string;
  state: string;
  message: string;
  fired_at: string;
}

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

function severityColor(severity: string): "red" | "orange" | "blue" {
  if (severity === "critical") return "red";
  if (severity === "warning") return "orange";
  return "blue";
}

function stateColor(state: string): "red" | "orange" | "green" {
  if (state === "firing") return "red";
  if (state === "pending") return "orange";
  return "green";
}

const PER_PAGE = 20;

const AlertList: React.FC<{ clusterIds: string[] }> = () => {
  const apiBase = useApiBase();
  const clusterIds = useClusterIds();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (clusterIds.length === 0) {
      setAlerts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all(
      clusterIds.map((id) =>
        fetch(`${apiBase}/clusters/${id}/alerts`)
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => []),
      ),
    )
      .then((results: Alert[][]) => {
        const all = results.flat();
        all.sort(
          (a, b) =>
            (SEVERITY_ORDER[a.severity] ?? 99) -
            (SEVERITY_ORDER[b.severity] ?? 99),
        );
        setAlerts(all);
      })
      .finally(() => setLoading(false));
  }, [apiBase, clusterIds]);

  const filtered = useMemo(() => {
    if (!filter) return alerts;
    const lc = filter.toLowerCase();
    return alerts.filter(
      (a) =>
        a.name.toLowerCase().includes(lc) ||
        a.message.toLowerCase().includes(lc) ||
        a.cluster_id.toLowerCase().includes(lc),
    );
  }, [alerts, filter]);

  const activeCount = useMemo(
    () =>
      alerts.filter((a) => a.state === "firing" || a.state === "pending")
        .length,
    [alerts],
  );

  const paginated = useMemo(() => {
    const start = (page - 1) * PER_PAGE;
    return filtered.slice(start, start + PER_PAGE);
  }, [filtered, page]);

  // Reset page when filter changes
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
          <Title headingLevel="h1">Alerts</Title>
        </FlexItem>
        <FlexItem>
          <span
            style={{
              fontSize: "var(--pf-t--global--font--size--sm)",
              color: "var(--pf-t--global--text--color--subtle)",
            }}
          >
            {activeCount} active
          </span>
        </FlexItem>
      </Flex>

      <Toolbar clearAllFilters={() => setFilter("")}>
        <ToolbarContent>
          <ToolbarItem>
            <SearchInput
              placeholder="Filter by name, message, or cluster"
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
          titleText={alerts.length === 0 ? "No alerts" : "No matching alerts"}
          headingLevel="h2"
        >
          <EmptyStateBody>
            {alerts.length === 0
              ? "All systems are healthy. There are no active alerts at this time."
              : "No alerts match the current filter."}
          </EmptyStateBody>
        </EmptyState>
      ) : (
        <Table aria-label="Alerts" variant="compact">
          <Thead>
            <Tr>
              <Th>Severity</Th>
              <Th>Alert Name</Th>
              <Th>Cluster</Th>
              <Th>State</Th>
              <Th>Message</Th>
              <Th>Fired At</Th>
            </Tr>
          </Thead>
          <Tbody>
            {paginated.map((alert) => (
              <Tr key={alert.id}>
                <Td dataLabel="Severity">
                  <Label color={severityColor(alert.severity)} isCompact>
                    {alert.severity}
                  </Label>
                </Td>
                <Td dataLabel="Alert Name">
                  <span
                    style={{
                      fontWeight:
                        "var(--pf-t--global--font--weight--heading--default)",
                    }}
                  >
                    {alert.name}
                  </span>
                </Td>
                <Td dataLabel="Cluster">
                  <span
                    style={{
                      fontSize: "var(--pf-t--global--font--size--sm)",
                      color: "var(--pf-t--global--text--color--subtle)",
                    }}
                  >
                    {alert.cluster_id}
                  </span>
                </Td>
                <Td dataLabel="State">
                  <Label color={stateColor(alert.state)} isCompact>
                    {alert.state}
                  </Label>
                </Td>
                <Td dataLabel="Message">{alert.message}</Td>
                <Td dataLabel="Fired At">
                  <span
                    style={{
                      fontSize: "var(--pf-t--global--font--size--sm)",
                      color: "var(--pf-t--global--text--color--subtle)",
                    }}
                  >
                    {formatRelativeTime(alert.fired_at)}
                  </span>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  );
};

export default AlertList;
