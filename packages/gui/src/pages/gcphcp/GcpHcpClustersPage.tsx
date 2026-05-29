import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Alert,
  Button,
  Label,
  PageSection,
  Spinner,
  Stack,
  StackItem,
  Title,
  Content,
} from "@patternfly/react-core";
import {
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  ActionsColumn,
} from "@patternfly/react-table";
import {
  type GcpHcpCluster,
  listGcpHcpClusters,
  deleteGcpHcpCluster,
  extractClusterId,
} from "./api";

const STATE_COLORS: Record<string, "blue" | "green" | "orange" | "red" | "grey"> = {
  CREATING: "blue",
  ACTIVE: "green",
  DELETING: "orange",
  FAILED: "red",
  PAUSED_AUTH: "orange",
};

function formatTime(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export default function GcpHcpClustersPage() {
  const [clusters, setClusters] = useState<GcpHcpCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchClusters = useCallback(async () => {
    try {
      const data = await listGcpHcpClusters();
      setClusters(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClusters();
    const interval = setInterval(fetchClusters, 5000);
    return () => clearInterval(interval);
  }, [fetchClusters]);

  const handleDelete = useCallback(
    async (cluster: GcpHcpCluster) => {
      const id = extractClusterId(cluster.name);
      if (!confirm(`Delete cluster "${id}"?`)) return;
      setDeleting(id);
      try {
        await deleteGcpHcpCluster(id);
        await fetchClusters();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setDeleting(null);
      }
    },
    [fetchClusters],
  );

  return (
    <PageSection>
      <Stack hasGutter>
        <StackItem>
          <Title headingLevel="h1" size="xl">
            GCP HCP Clusters
          </Title>
          <Content component="p">
            Managed OpenShift clusters on Google Cloud Platform (temporary debug
            view).
          </Content>
        </StackItem>

        {error && (
          <StackItem>
            <Alert
              variant="danger"
              title="Error"
              isInline
              actionClose={
                <button
                  className="pf-v6-c-alert__action-close"
                  onClick={() => setError(null)}
                />
              }
            >
              {error}
            </Alert>
          </StackItem>
        )}

        {loading ? (
          <StackItem>
            <Spinner size="lg" />
          </StackItem>
        ) : clusters.length === 0 ? (
          <StackItem>
            <Content component="p">No GCP HCP clusters found.</Content>
          </StackItem>
        ) : (
          <StackItem>
            <Table aria-label="GCP HCP clusters">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>State</Th>
                  <Th>Version</Th>
                  <Th>Node Pools</Th>
                  <Th>Created</Th>
                  <Th />
                </Tr>
              </Thead>
              <Tbody>
                {clusters.map((cluster) => {
                  const id = extractClusterId(cluster.name);
                  const isDeleting = deleting === id;
                  return (
                    <Tr key={cluster.uid}>
                      <Td dataLabel="Name">
                        <Button
                          variant="link"
                          isInline
                          component={(props) => (
                            <Link {...props} to={`/gcphcp/${id}`} />
                          )}
                        >
                          {id}
                        </Button>
                      </Td>
                      <Td dataLabel="State">
                        <Label color={STATE_COLORS[cluster.state] ?? "grey"}>
                          {cluster.state}
                          {cluster.reconciling ? " (reconciling)" : ""}
                        </Label>
                      </Td>
                      <Td dataLabel="Version">
                        {cluster.spec.releaseVersion}
                      </Td>
                      <Td dataLabel="Node Pools">
                        {cluster.spec.nodepools?.length ?? 0}
                      </Td>
                      <Td dataLabel="Created">
                        {formatTime(cluster.createTime)}
                      </Td>
                      <Td isActionCell>
                        <ActionsColumn
                          items={[
                            {
                              title: isDeleting ? "Deleting..." : "Delete",
                              onClick: () => handleDelete(cluster),
                              isDisabled: isDeleting,
                            },
                          ]}
                        />
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </StackItem>
        )}
      </Stack>
    </PageSection>
  );
}
