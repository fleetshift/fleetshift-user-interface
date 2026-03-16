import { useState, useEffect, useMemo } from "react";
import {
  Bullseye,
  Card,
  CardBody,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Label,
  LabelGroup,
  Pagination,
  Spinner,
  Title,
} from "@patternfly/react-core";
import { Table, Thead, Tbody, Tr, Th, Td } from "@patternfly/react-table";
import { useApiBase, fetchJson } from "./api";

interface UpgradeResponse {
  currentVersion: string;
  latestVersion: string;
  upToDate: boolean;
  availableUpdates: string[];
}

interface UpgradeInfo {
  clusterId: string;
  currentVersion: string;
  latestVersion: string;
  upToDate: boolean;
  availableUpdates: string[];
}

const PER_PAGE = 20;

const UpgradesPage: React.FC<{ clusterIds: string[] }> = ({ clusterIds }) => {
  const apiBase = useApiBase();
  const [upgrades, setUpgrades] = useState<UpgradeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(PER_PAGE);

  useEffect(() => {
    if (clusterIds.length === 0) {
      setUpgrades([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all(
      clusterIds.map((id) =>
        fetchJson<UpgradeResponse>(`${apiBase}/clusters/${id}/upgrades`)
          .then((resp) => ({ clusterId: id, ...resp }))
          .catch(
            () =>
              ({
                clusterId: id,
                currentVersion: "unknown",
                latestVersion: "unknown",
                upToDate: true,
                availableUpdates: [],
              }) as UpgradeInfo,
          ),
      ),
    ).then((results) => {
      setUpgrades(results);
      setLoading(false);
    });
  }, [apiBase, clusterIds]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * perPage;
    return upgrades.slice(start, start + perPage);
  }, [upgrades, page, perPage]);

  // Reset to page 1 when data changes
  useEffect(() => {
    setPage(1);
  }, [upgrades.length]);

  if (loading) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (upgrades.length === 0) {
    return (
      <EmptyState titleText="No upgrade data available" headingLevel="h2">
        <EmptyStateBody>
          There is no upgrade information available for the selected clusters.
        </EmptyStateBody>
      </EmptyState>
    );
  }

  const outdatedCount = upgrades.filter((u) => !u.upToDate).length;

  return (
    <div>
      {/* Page header */}
      <Flex
        alignItems={{ default: "alignItemsBaseline" }}
        gap={{ default: "gapSm" }}
        style={{ marginBottom: "var(--pf-t--global--spacer--lg)" }}
      >
        <FlexItem>
          <Title headingLevel="h1">Upgrades</Title>
        </FlexItem>
        <FlexItem>
          <span
            style={{
              fontSize: "var(--pf-t--global--font--size--sm)",
              color: "var(--pf-t--global--text--color--subtle)",
            }}
          >
            {upgrades.length} {upgrades.length === 1 ? "cluster" : "clusters"}
            {outdatedCount > 0 && (
              <span
                style={{
                  color: "var(--pf-t--global--color--status--warning--default)",
                }}
              >
                {" "}
                &middot; {outdatedCount} update
                {outdatedCount === 1 ? "" : "s"} available
              </span>
            )}
          </span>
        </FlexItem>
      </Flex>

      {/* Upgrades table */}
      <Card>
        <CardBody>
          <Table aria-label="Cluster upgrades" variant="compact">
            <Thead>
              <Tr>
                <Th>Cluster</Th>
                <Th>Current Version</Th>
                <Th>Latest Version</Th>
                <Th>Status</Th>
                <Th>Available Updates</Th>
              </Tr>
            </Thead>
            <Tbody>
              {paginatedRows.map((upgrade) => (
                <Tr key={upgrade.clusterId}>
                  <Td dataLabel="Cluster">
                    <span
                      style={{
                        fontWeight:
                          "var(--pf-t--global--font--weight--heading--default)",
                      }}
                    >
                      {upgrade.clusterId}
                    </span>
                  </Td>
                  <Td dataLabel="Current Version">
                    <code
                      style={{
                        fontFamily: "var(--pf-t--global--font--family--mono)",
                        fontSize: "var(--pf-t--global--font--size--sm)",
                        background:
                          "var(--pf-t--global--background--color--secondary--default)",
                        padding: "2px 6px",
                        borderRadius:
                          "var(--pf-t--global--border--radius--small)",
                      }}
                    >
                      {upgrade.currentVersion}
                    </code>
                  </Td>
                  <Td dataLabel="Latest Version">
                    <code
                      style={{
                        fontFamily: "var(--pf-t--global--font--family--mono)",
                        fontSize: "var(--pf-t--global--font--size--sm)",
                        background:
                          "var(--pf-t--global--background--color--secondary--default)",
                        padding: "2px 6px",
                        borderRadius:
                          "var(--pf-t--global--border--radius--small)",
                      }}
                    >
                      {upgrade.latestVersion}
                    </code>
                  </Td>
                  <Td dataLabel="Status">
                    <Label
                      color={upgrade.upToDate ? "green" : "orange"}
                      isCompact
                    >
                      {upgrade.upToDate ? "Up to date" : "Update available"}
                    </Label>
                  </Td>
                  <Td dataLabel="Available Updates">
                    {upgrade.availableUpdates.length > 0 ? (
                      <LabelGroup>
                        {upgrade.availableUpdates.map((version) => (
                          <Label key={version} color="blue" isCompact>
                            {version}
                          </Label>
                        ))}
                      </LabelGroup>
                    ) : (
                      <span
                        style={{
                          fontSize: "var(--pf-t--global--font--size--sm)",
                          color: "var(--pf-t--global--text--color--subtle)",
                        }}
                      >
                        None
                      </span>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          {upgrades.length > PER_PAGE && (
            <Pagination
              itemCount={upgrades.length}
              perPage={perPage}
              page={page}
              onSetPage={(_e, p) => setPage(p)}
              onPerPageSelect={(_e, pp) => {
                setPerPage(pp);
                setPage(1);
              }}
              variant="bottom"
              style={{ marginTop: "var(--pf-t--global--spacer--md)" }}
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default UpgradesPage;
