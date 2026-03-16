import { useState, useEffect, useMemo } from "react";
import {
  Bullseye,
  Card,
  CardBody,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  Icon,
  Pagination,
  Spinner,
  Title,
} from "@patternfly/react-core";
import { CpuIcon, DollarSignIcon, MemoryIcon } from "@patternfly/react-icons";
import { Table, Thead, Tbody, Tr, Th, Td } from "@patternfly/react-table";
import { useApiBase, fetchJson } from "./api";

interface NamespaceCost {
  namespace: string;
  cpuCores: number;
  memoryMB: number;
  estimatedMonthlyCost: number;
}

interface ClusterCostResponse {
  clusterId: string;
  totalCpuCores: number;
  totalMemoryMB: number;
  estimatedMonthlyCost: number;
  namespaceBreakdown: NamespaceCost[];
}

interface ClusterCostData {
  clusterId: string;
  totalCpuCores: number;
  totalMemoryMB: number;
  estimatedMonthlyCost: number;
  namespaceBreakdown: NamespaceCost[];
}

function formatCost(value: number): string {
  return `$${value.toFixed(2)}`;
}

const PER_PAGE = 20;

const CostPage: React.FC<{ clusterIds: string[] }> = ({ clusterIds }) => {
  const apiBase = useApiBase();
  const [data, setData] = useState<ClusterCostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(PER_PAGE);

  useEffect(() => {
    if (clusterIds.length === 0) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all(
      clusterIds.map((id) =>
        fetchJson<ClusterCostResponse>(`${apiBase}/clusters/${id}/cost`)
          .then((resp) => ({
            clusterId: resp.clusterId ?? id,
            totalCpuCores: resp.totalCpuCores ?? 0,
            totalMemoryMB: resp.totalMemoryMB ?? 0,
            estimatedMonthlyCost: resp.estimatedMonthlyCost ?? 0,
            namespaceBreakdown: resp.namespaceBreakdown ?? [],
          }))
          .catch(
            () =>
              ({
                clusterId: id,
                totalCpuCores: 0,
                totalMemoryMB: 0,
                estimatedMonthlyCost: 0,
                namespaceBreakdown: [],
              }) as ClusterCostData,
          ),
      ),
    ).then((results) => {
      setData(results);
      setLoading(false);
    });
  }, [apiBase, clusterIds]);

  const totals = useMemo(() => {
    let cpu = 0;
    let memory = 0;
    let cost = 0;
    for (const cluster of data) {
      cpu += cluster.totalCpuCores;
      memory += cluster.totalMemoryMB;
      cost += cluster.estimatedMonthlyCost;
    }
    return {
      cpu: Math.round(cpu * 100) / 100,
      memory: Math.round(memory),
      cost,
    };
  }, [data]);

  const namespaceRows = useMemo(() => {
    const rows: (NamespaceCost & { clusterId: string })[] = [];
    for (const cluster of data) {
      for (const ns of cluster.namespaceBreakdown ?? []) {
        rows.push({ ...ns, clusterId: cluster.clusterId });
      }
    }
    return rows;
  }, [data]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * perPage;
    return namespaceRows.slice(start, start + perPage);
  }, [namespaceRows, page, perPage]);

  // Reset to page 1 when data changes
  useEffect(() => {
    setPage(1);
  }, [namespaceRows.length]);

  if (loading) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState titleText="No cost data available" headingLevel="h2">
        <EmptyStateBody>
          There is no cost data available for the selected clusters.
        </EmptyStateBody>
      </EmptyState>
    );
  }

  const statCards = [
    {
      label: "Total CPU",
      value: `${totals.cpu}`,
      icon: <CpuIcon />,
    },
    {
      label: "Total Memory",
      value: `${totals.memory} MB`,
      icon: <MemoryIcon />,
    },
    {
      label: "Est. Monthly Cost",
      value: formatCost(totals.cost),
      icon: (
        <DollarSignIcon color="var(--pf-t--global--color--status--success--default)" />
      ),
    },
  ];

  return (
    <div>
      {/* Page header */}
      <Flex
        alignItems={{ default: "alignItemsBaseline" }}
        gap={{ default: "gapSm" }}
        style={{ marginBottom: "var(--pf-t--global--spacer--lg)" }}
      >
        <FlexItem>
          <Title headingLevel="h1">Cost</Title>
        </FlexItem>
        <FlexItem>
          <span
            style={{
              fontSize: "var(--pf-t--global--font--size--sm)",
              color: "var(--pf-t--global--text--color--subtle)",
            }}
          >
            Est. {formatCost(totals.cost)} / month across {data.length}{" "}
            {data.length === 1 ? "cluster" : "clusters"}
          </span>
        </FlexItem>
      </Flex>

      {/* Stat cards */}
      <Grid
        hasGutter
        style={{ marginBottom: "var(--pf-t--global--spacer--lg)" }}
      >
        {statCards.map((stat) => (
          <GridItem md={4} sm={12} key={stat.label}>
            <Card isFullHeight>
              <CardBody
                style={{
                  textAlign: "center",
                  padding:
                    "var(--pf-t--global--spacer--lg) var(--pf-t--global--spacer--md)",
                }}
              >
                <div
                  style={{
                    marginBottom: "var(--pf-t--global--spacer--sm)",
                    color: "var(--pf-t--global--text--color--subtle)",
                  }}
                >
                  <Icon size="lg">{stat.icon}</Icon>
                </div>
                <div
                  style={{
                    fontSize: "var(--pf-t--global--font--size--2xl)",
                    fontWeight:
                      "var(--pf-t--global--font--weight--heading--default)",
                    lineHeight: 1.2,
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: "var(--pf-t--global--font--size--sm)",
                    color: "var(--pf-t--global--text--color--subtle)",
                    marginTop: "var(--pf-t--global--spacer--xs)",
                  }}
                >
                  {stat.label}
                </div>
              </CardBody>
            </Card>
          </GridItem>
        ))}
      </Grid>

      {/* Namespace breakdown table */}
      <Card>
        <CardBody>
          <Title
            headingLevel="h3"
            size="md"
            style={{ marginBottom: "var(--pf-t--global--spacer--md)" }}
          >
            Namespace Breakdown ({namespaceRows.length})
          </Title>
          <Table aria-label="Namespace cost breakdown" variant="compact">
            <Thead>
              <Tr>
                <Th>Namespace</Th>
                <Th>Cluster</Th>
                <Th>CPU Cores</Th>
                <Th>Memory (MB)</Th>
                <Th>Est. Monthly Cost</Th>
              </Tr>
            </Thead>
            <Tbody>
              {paginatedRows.map((row) => (
                <Tr key={`${row.clusterId}-${row.namespace}`}>
                  <Td dataLabel="Namespace">
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
                      {row.namespace}
                    </code>
                  </Td>
                  <Td dataLabel="Cluster">{row.clusterId}</Td>
                  <Td dataLabel="CPU Cores">{row.cpuCores}</Td>
                  <Td dataLabel="Memory (MB)">{row.memoryMB}</Td>
                  <Td dataLabel="Est. Monthly Cost">
                    {formatCost(row.estimatedMonthlyCost)}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          {namespaceRows.length > PER_PAGE && (
            <Pagination
              itemCount={namespaceRows.length}
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

export default CostPage;
