import { useState, useEffect, useCallback, useMemo } from "react";
import { PluginLink } from "@fleetshift/common";
import {
  Button,
  Content,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  Label,
  Pagination,
  Stack,
  StackItem,
  Title,
} from "@patternfly/react-core";
import { ActionsColumn, Tbody, Td, Tr } from "@patternfly/react-table";
import { CubesIcon } from "@patternfly/react-icons";
import {
  SkeletonTableHead,
  SkeletonTableBody,
} from "@patternfly/react-component-groups";
import "./ClustersPage.css";
import {
  useDataViewFilters,
  useDataViewPagination,
} from "@patternfly/react-data-view/dist/dynamic/Hooks";
import {
  DataView,
  DataViewState,
} from "@patternfly/react-data-view/dist/dynamic/DataView";
import {
  DataViewTable,
  type DataViewTr,
  type DataViewTh,
} from "@patternfly/react-data-view/dist/dynamic/DataViewTable";
import { DataViewToolbar } from "@patternfly/react-data-view/dist/dynamic/DataViewToolbar";
import { DataViewFilters } from "@patternfly/react-data-view/dist/dynamic/DataViewFilters";
import { DataViewTextFilter } from "@patternfly/react-data-view/dist/dynamic/DataViewTextFilter";

import { listDeployments, deleteDeployment } from "../management-plugin/api";
import {
  STATE_LABELS,
  toClusterRow,
  formatTime,
  type ClusterRow,
} from "./clusterUtils";
import ClusterSummaryCards from "./ClusterSummaryCards";

interface ClusterFilters {
  name: string;
}

const columns: DataViewTh[] = [
  "Name",
  "Type",
  "Status",
  "Nodes",
  "Created",
  "",
];

const PER_PAGE_OPTIONS = [
  { title: "10", value: 10 },
  { title: "25", value: 25 },
  { title: "50", value: 50 },
];

export default function ClustersPage() {
  const [rows, setRows] = useState<ClusterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const { filters, onSetFilters, clearAllFilters } =
    useDataViewFilters<ClusterFilters>({ initialFilters: { name: "" } });
  const pagination = useDataViewPagination({ perPage: 10 });
  const { page, perPage } = pagination;

  const fetchClusters = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await listDeployments();
      const clusterDeps = (resp.deployments ?? []).filter((d) =>
        d.manifestStrategy?.manifests?.some(
          (m) => m.resourceType === "api.kind.cluster",
        ),
      );
      setRows(clusterDeps.map(toClusterRow));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load clusters");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClusters();
  }, [fetchClusters]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          !filters.name ||
          r.clusterName.toLowerCase().includes(filters.name.toLowerCase()),
      ),
    [rows, filters],
  );

  const handleDelete = async (name: string) => {
    setDeleting(name);
    try {
      await deleteDeployment(name);
      await fetchClusters();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  const pageRows: DataViewTr[] = useMemo(
    () =>
      filtered
        .slice((page - 1) * perPage, (page - 1) * perPage + perPage)
        .map((r) => {
          const depName = r.deployment.name.replace(/^deployments\//, "");
          const stateLabel =
            STATE_LABELS[r.deployment.state] ?? STATE_LABELS.STATE_UNSPECIFIED;
          const isDeleting = deleting === depName;

          return [
            {
              cell: (
                <PluginLink
                  scope="core-plugin"
                  module="ClustersModule"
                  to={depName}
                >
                  <strong>{r.clusterName}</strong>
                </PluginLink>
              ),
            },
            {
              cell: (
                <Label color="blue" isCompact>
                  Kind
                </Label>
              ),
            },
            {
              cell: (
                <Label color={stateLabel.color} isCompact>
                  {stateLabel.text}
                  {r.deployment.reconciling ? " (reconciling)" : ""}
                </Label>
              ),
            },
            r.nodeCount,
            formatTime(r.deployment.createTime),
            {
              cell:
                r.deployment.state !== "STATE_DELETING" ? (
                  <ActionsColumn
                    items={[
                      {
                        title: "Delete",
                        onClick: () => handleDelete(depName),
                        isDisabled: isDeleting,
                      },
                    ]}
                  />
                ) : null,
              props: { isActionCell: true },
            },
          ];
        }),
    [filtered, page, perPage, deleting],
  );

  const activeState = loading
    ? DataViewState.loading
    : error
      ? "error"
      : filtered.length === 0
        ? "empty"
        : undefined;

  const emptyBody = (
    <Tbody>
      <Tr>
        <Td colSpan={columns.length}>
          <EmptyState
            headingLevel="h2"
            icon={CubesIcon}
            titleText="No clusters found"
          >
            <EmptyStateBody>
              {rows.length === 0
                ? "Get started by creating your first cluster."
                : "No clusters match the current filter criteria."}
            </EmptyStateBody>
            <EmptyStateFooter>
              <EmptyStateActions>
                {rows.length === 0 ? (
                  <Button
                    variant="primary"
                    component={(props) => (
                      <PluginLink
                        {...props}
                        scope="core-plugin"
                        module="ClustersModule"
                        to="create"
                      />
                    )}
                  >
                    Create cluster
                  </Button>
                ) : (
                  <Button variant="link" onClick={clearAllFilters}>
                    Clear filters
                  </Button>
                )}
              </EmptyStateActions>
            </EmptyStateFooter>
          </EmptyState>
        </Td>
      </Tr>
    </Tbody>
  );

  const errorBody = (
    <Tbody>
      <Tr>
        <Td colSpan={columns.length}>
          <EmptyState headingLevel="h2" titleText="Unable to load clusters">
            <EmptyStateBody>{error}</EmptyStateBody>
            <EmptyStateFooter>
              <EmptyStateActions>
                <Button variant="primary" onClick={fetchClusters}>
                  Try again
                </Button>
              </EmptyStateActions>
            </EmptyStateFooter>
          </EmptyState>
        </Td>
      </Tr>
    </Tbody>
  );

  return (
    <Stack hasGutter>
      <StackItem>
        <div>
          <Title headingLevel="h1">Clusters</Title>
          <Content component="p">
            Manage and monitor your OpenShift clusters
          </Content>
        </div>
      </StackItem>

      <StackItem>
        <ClusterSummaryCards rows={rows} />
      </StackItem>

      <StackItem>
        <DataView activeState={activeState}>
          <DataViewToolbar
            clearAllFilters={clearAllFilters}
            className="clusters-toolbar"
            actions={
              <Button
                variant="primary"
                component={(props) => (
                  <PluginLink
                    {...props}
                    scope="core-plugin"
                    module="ClustersModule"
                    to="create"
                  />
                )}
              >
                Create cluster
              </Button>
            }
            pagination={
              <Pagination
                perPageOptions={PER_PAGE_OPTIONS}
                itemCount={filtered.length}
                {...pagination}
              />
            }
            filters={
              <DataViewFilters
                onChange={(_e, values) => onSetFilters(values)}
                values={filters}
              >
                <DataViewTextFilter
                  filterId="name"
                  title="Name"
                  placeholder="Filter by name"
                />
              </DataViewFilters>
            }
          />
          <DataViewTable
            aria-label="Clusters table"
            columns={columns}
            rows={pageRows}
            headStates={{
              loading: <SkeletonTableHead columns={columns} />,
            }}
            bodyStates={{
              loading: (
                <SkeletonTableBody
                  rowsCount={5}
                  columnsCount={columns.length}
                />
              ),
              empty: emptyBody,
              error: errorBody,
            }}
          />
          <DataViewToolbar
            pagination={
              <Pagination
                isCompact
                perPageOptions={PER_PAGE_OPTIONS}
                itemCount={filtered.length}
                {...pagination}
              />
            }
          />
        </DataView>
      </StackItem>
    </Stack>
  );
}
