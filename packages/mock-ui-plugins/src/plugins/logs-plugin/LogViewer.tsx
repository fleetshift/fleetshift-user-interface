import { useEffect, useState, useMemo } from "react";
import {
  Banner,
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

interface LogLine {
  timestamp: string;
  pod: string;
  namespace: string;
  level: string;
  message: string;
  cluster: string;
}

const MAX_ENTRIES = 500;
const PER_PAGE = 50;

function levelColor(level: string): "red" | "orange" | "blue" | "grey" {
  switch (level.toUpperCase()) {
    case "ERROR":
      return "red";
    case "WARN":
      return "orange";
    case "INFO":
      return "blue";
    default:
      return "grey";
  }
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  });
}

const LogViewer: React.FC<{ clusterIds: string[] }> = () => {
  const apiBase = useApiBase();
  const clusterIds = useClusterIds();
  const [allLogs, setAllLogs] = useState<LogLine[]>([]);
  const [totalFetched, setTotalFetched] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (clusterIds.length === 0) {
      setAllLogs([]);
      setTotalFetched(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all(
      clusterIds.map((clusterId) =>
        fetch(`${apiBase}/clusters/${clusterId}/logs`)
          .then((r) => (r.ok ? r.json() : []))
          .then((data: Omit<LogLine, "cluster">[]) =>
            data.map((line) => ({ ...line, cluster: clusterId })),
          )
          .catch(() => [] as LogLine[]),
      ),
    )
      .then((results) => {
        const all = results.flat();
        all.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        setTotalFetched(all.length);
        // Truncate to last MAX_ENTRIES
        setAllLogs(all.slice(0, MAX_ENTRIES));
      })
      .finally(() => setLoading(false));
  }, [apiBase, clusterIds]);

  const filtered = useMemo(() => {
    if (!filter) return allLogs;
    const lc = filter.toLowerCase();
    return allLogs.filter(
      (l) =>
        l.message.toLowerCase().includes(lc) ||
        l.pod.toLowerCase().includes(lc) ||
        l.namespace.toLowerCase().includes(lc) ||
        l.level.toLowerCase().includes(lc),
    );
  }, [allLogs, filter]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PER_PAGE;
    return filtered.slice(start, start + PER_PAGE);
  }, [filtered, page]);

  const isTruncated = totalFetched > MAX_ENTRIES;

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
          <Title headingLevel="h1">Logs</Title>
        </FlexItem>
        <FlexItem>
          <span
            style={{
              fontSize: "var(--pf-t--global--font--size--sm)",
              color: "var(--pf-t--global--text--color--subtle)",
            }}
          >
            {allLogs.length} entries
          </span>
        </FlexItem>
      </Flex>

      {isTruncated && (
        <Banner
          color="blue"
          style={{ marginBottom: "var(--pf-t--global--spacer--md)" }}
        >
          Showing last {MAX_ENTRIES} of {totalFetched} entries
        </Banner>
      )}

      <Toolbar clearAllFilters={() => setFilter("")}>
        <ToolbarContent>
          <ToolbarItem>
            <SearchInput
              placeholder="Filter by message, pod, namespace, or level"
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
          titleText={allLogs.length === 0 ? "No logs" : "No matching logs"}
          headingLevel="h2"
        >
          <EmptyStateBody>
            {allLogs.length === 0
              ? "Waiting for log data from the cluster..."
              : "No logs match the current filter."}
          </EmptyStateBody>
        </EmptyState>
      ) : (
        <Table aria-label="Logs" variant="compact">
          <Thead>
            <Tr>
              <Th>Timestamp</Th>
              <Th>Level</Th>
              <Th>Pod</Th>
              <Th>Container</Th>
              <Th>Message</Th>
            </Tr>
          </Thead>
          <Tbody>
            {paginated.map((log, idx) => (
              <Tr key={`${log.timestamp}-${log.pod}-${idx}`}>
                <Td dataLabel="Timestamp">
                  <span
                    style={{
                      fontFamily: "var(--pf-t--global--font--family--mono)",
                      fontSize: "var(--pf-t--global--font--size--sm)",
                      color: "var(--pf-t--global--text--color--subtle)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatTimestamp(log.timestamp)}
                  </span>
                </Td>
                <Td dataLabel="Level">
                  <Label color={levelColor(log.level)} isCompact>
                    {log.level}
                  </Label>
                </Td>
                <Td dataLabel="Pod">
                  <span
                    style={{
                      fontWeight:
                        "var(--pf-t--global--font--weight--heading--default)",
                      fontSize: "var(--pf-t--global--font--size--sm)",
                    }}
                  >
                    {log.pod}
                  </span>
                </Td>
                <Td dataLabel="Container">
                  <span
                    style={{
                      fontSize: "var(--pf-t--global--font--size--sm)",
                      color: "var(--pf-t--global--text--color--subtle)",
                    }}
                  >
                    {log.namespace}
                  </span>
                </Td>
                <Td dataLabel="Message">
                  <span
                    style={{
                      fontFamily: "var(--pf-t--global--font--family--mono)",
                      fontSize: "var(--pf-t--global--font--size--sm)",
                    }}
                  >
                    {log.message}
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

export default LogViewer;
