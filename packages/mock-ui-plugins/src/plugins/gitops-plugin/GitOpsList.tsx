import { useEffect, useMemo, useState } from "react";
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
import { useApiBase, fetchJson } from "./api";
import { formatRelativeTime } from "@fleetshift/common";

interface GitOpsApp {
  id: string;
  cluster_id: string;
  name: string;
  repo: string;
  path: string;
  sync_status: string;
  health_status: string;
  last_synced: string;
}

const PER_PAGE = 20;

function syncStatusColor(status: string): "green" | "orange" | "grey" {
  switch (status) {
    case "Synced":
      return "green";
    case "OutOfSync":
      return "orange";
    default:
      return "grey";
  }
}

function healthStatusColor(
  status: string,
): "green" | "red" | "orange" | "grey" {
  switch (status) {
    case "Healthy":
      return "green";
    case "Degraded":
      return "red";
    case "Missing":
      return "orange";
    default:
      return "grey";
  }
}

function repoSummary(repo: string): string {
  const lastSegment =
    repo
      .replace(/\.git$/, "")
      .split("/")
      .pop() ?? repo;
  return lastSegment;
}

interface GitOpsListProps {
  clusterIds: string[];
}

const GitOpsList: React.FC<GitOpsListProps> = ({ clusterIds }) => {
  const apiBase = useApiBase();
  const [apps, setApps] = useState<GitOpsApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (clusterIds.length === 0) {
      setApps([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all(
      clusterIds.map((id) =>
        fetchJson<GitOpsApp[]>(`${apiBase}/clusters/${id}/gitops`).catch(
          () => [] as GitOpsApp[],
        ),
      ),
    ).then((results) => {
      setApps(results.flat());
      setLoading(false);
    });
  }, [apiBase, clusterIds]);

  const filtered = useMemo(
    () =>
      apps.filter((app) => {
        if (!filter) return true;
        return app.name.toLowerCase().includes(filter.toLowerCase());
      }),
    [apps, filter],
  );

  const paginated = useMemo(
    () => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [filtered, page],
  );

  useEffect(() => {
    setPage(1);
  }, [filter]);

  if (loading) {
    return (
      <Bullseye style={{ padding: "var(--pf-t--global--spacer--2xl) 0" }}>
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
          <Title headingLevel="h1">GitOps</Title>
        </FlexItem>
        <FlexItem>
          <span
            style={{
              fontSize: "var(--pf-t--global--font--size--sm)",
              color: "var(--pf-t--global--text--color--subtle)",
            }}
          >
            {apps.length} applications
          </span>
        </FlexItem>
      </Flex>

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
        <EmptyState titleText="No GitOps applications found" headingLevel="h2">
          <EmptyStateBody>
            {apps.length > 0
              ? "No applications match the current filter."
              : "There are no GitOps applications available."}
          </EmptyStateBody>
        </EmptyState>
      ) : (
        <Table aria-label="GitOps applications" variant="compact">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Repository</Th>
              <Th>Sync Status</Th>
              <Th>Health</Th>
              <Th>Cluster</Th>
              <Th>Last Synced</Th>
            </Tr>
          </Thead>
          <Tbody>
            {paginated.map((app) => (
              <Tr key={app.id}>
                <Td dataLabel="Name">
                  <span
                    style={{
                      fontWeight:
                        "var(--pf-t--global--font--weight--heading--default)",
                    }}
                  >
                    {app.name}
                  </span>
                </Td>
                <Td dataLabel="Repository">
                  <span
                    style={{
                      fontSize: "var(--pf-t--global--font--size--sm)",
                      color: "var(--pf-t--global--text--color--subtle)",
                    }}
                    title={app.repo}
                  >
                    {repoSummary(app.repo)}
                  </span>
                </Td>
                <Td dataLabel="Sync Status">
                  <Label color={syncStatusColor(app.sync_status)} isCompact>
                    {app.sync_status}
                  </Label>
                </Td>
                <Td dataLabel="Health">
                  <Label color={healthStatusColor(app.health_status)} isCompact>
                    {app.health_status}
                  </Label>
                </Td>
                <Td dataLabel="Cluster">{app.cluster_id}</Td>
                <Td dataLabel="Last Synced">
                  <span
                    style={{
                      fontSize: "var(--pf-t--global--font--size--sm)",
                      color: "var(--pf-t--global--text--color--subtle)",
                    }}
                  >
                    {formatRelativeTime(app.last_synced)}
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

export default GitOpsList;
