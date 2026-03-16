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
import { formatRelativeTime, formatDuration } from "@fleetshift/common";

interface Pipeline {
  id: string;
  cluster_id: string;
  name: string;
  status: string;
  started_at: string;
  duration_seconds: number;
  stages: string[];
}

const PER_PAGE = 20;

function statusColor(status: string): "green" | "red" | "blue" | "grey" {
  switch (status) {
    case "Succeeded":
      return "green";
    case "Failed":
      return "red";
    case "Running":
      return "blue";
    case "Pending":
      return "grey";
    default:
      return "grey";
  }
}

interface PipelineListProps {
  clusterIds: string[];
}

const PipelineList: React.FC<PipelineListProps> = ({ clusterIds }) => {
  const apiBase = useApiBase();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [nameFilter, setNameFilter] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (clusterIds.length === 0) {
      setPipelines([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all(
      clusterIds.map((id) =>
        fetchJson<Pipeline[]>(`${apiBase}/clusters/${id}/pipelines`).catch(
          () => [] as Pipeline[],
        ),
      ),
    ).then((results) => {
      setPipelines(results.flat());
      setLoading(false);
    });
  }, [apiBase, clusterIds]);

  const filtered = useMemo(
    () =>
      pipelines.filter((p) => {
        if (!nameFilter) return true;
        return p.name.toLowerCase().includes(nameFilter.toLowerCase());
      }),
    [pipelines, nameFilter],
  );

  const paginated = useMemo(
    () => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [filtered, page],
  );

  useEffect(() => {
    setPage(1);
  }, [nameFilter]);

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
          <Title headingLevel="h1">Pipelines</Title>
        </FlexItem>
        <FlexItem>
          <span
            style={{
              fontSize: "var(--pf-t--global--font--size--sm)",
              color: "var(--pf-t--global--text--color--subtle)",
            }}
          >
            {pipelines.length} runs
          </span>
        </FlexItem>
      </Flex>

      <Toolbar>
        <ToolbarContent>
          <ToolbarItem>
            <SearchInput
              placeholder="Filter by name"
              value={nameFilter}
              onChange={(_event, value) => setNameFilter(value)}
              onClear={() => setNameFilter("")}
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
        <EmptyState titleText="No pipelines found" headingLevel="h2">
          <EmptyStateBody>
            {pipelines.length > 0
              ? "No pipelines match the current filter."
              : "There are no pipelines available."}
          </EmptyStateBody>
        </EmptyState>
      ) : (
        <Table aria-label="Pipelines" variant="compact">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Cluster</Th>
              <Th>Status</Th>
              <Th>Duration</Th>
              <Th>Started</Th>
            </Tr>
          </Thead>
          <Tbody>
            {paginated.map((pipeline) => (
              <Tr key={pipeline.id}>
                <Td dataLabel="Name">
                  <span
                    style={{
                      fontWeight:
                        "var(--pf-t--global--font--weight--heading--default)",
                    }}
                  >
                    {pipeline.name}
                  </span>
                </Td>
                <Td dataLabel="Cluster">{pipeline.cluster_id}</Td>
                <Td dataLabel="Status">
                  <Label color={statusColor(pipeline.status)} isCompact>
                    {pipeline.status}
                  </Label>
                </Td>
                <Td dataLabel="Duration">
                  {formatDuration(pipeline.duration_seconds)}
                </Td>
                <Td dataLabel="Started">
                  <span
                    style={{
                      fontSize: "var(--pf-t--global--font--size--sm)",
                      color: "var(--pf-t--global--text--color--subtle)",
                    }}
                  >
                    {formatRelativeTime(pipeline.started_at)}
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

export default PipelineList;
