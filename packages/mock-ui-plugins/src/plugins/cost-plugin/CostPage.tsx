import { useEffect, useState } from "react";
import {
  Card,
  CardTitle,
  CardBody,
  Spinner,
  Grid,
  GridItem,
  Title,
} from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import { makeRequest } from "@fleetshift/common";
import { useApiBase } from "./api";

interface NamespaceCost {
  namespace: string;
  cpuCores: number;
  memoryMB: number;
  estimatedMonthlyCost: number;
}

interface CostData {
  clusterId: string;
  totalCpuCores: number;
  totalMemoryMB: number;
  estimatedMonthlyCost: number;
  namespaceBreakdown: NamespaceCost[];
}

interface CostPageProps {
  clusterIds: string[];
}

const CostPage = ({ clusterIds }: CostPageProps) => {
  const apiBase = useApiBase();
  const [costData, setCostData] = useState<CostData[]>([]);
  const [loading, setLoading] = useState(true);
  const multiCluster = clusterIds.length > 1;

  useEffect(() => {
    Promise.all(
      clusterIds.map((id) =>
        makeRequest<CostData>(`${apiBase}/clusters/${id}/cost`),
      ),
    ).then((results) => {
      setCostData(results);
      setLoading(false);
    });
  }, [apiBase, clusterIds]);

  if (loading) return <Spinner size="lg" />;

  return (
    <Grid hasGutter>
      {costData.map((data) => (
        <GridItem key={data.clusterId}>
          <Card>
            <CardTitle>Cluster: {data.clusterId}</CardTitle>
            <CardBody>
              <p>
                <strong>Total CPU Cores:</strong> {data.totalCpuCores}
              </p>
              <p>
                <strong>Total Memory:</strong> {data.totalMemoryMB} MB
              </p>
              <p>
                <strong>Estimated Monthly Cost:</strong> $
                {data.estimatedMonthlyCost.toFixed(2)}
              </p>
            </CardBody>
          </Card>

          <Title headingLevel="h3">Namespace Breakdown</Title>
          <Table aria-label="Namespace cost breakdown" variant="compact">
            <Thead>
              <Tr>
                <Th>Namespace</Th>
                {multiCluster && <Th>Cluster</Th>}
                <Th>CPU Cores</Th>
                <Th>Memory (MB)</Th>
                <Th>Est. Monthly Cost ($)</Th>
              </Tr>
            </Thead>
            <Tbody>
              {data.namespaceBreakdown.map((ns) => (
                <Tr key={`${data.clusterId}-${ns.namespace}`}>
                  <Td>{ns.namespace}</Td>
                  {multiCluster && <Td>{data.clusterId}</Td>}
                  <Td>{ns.cpuCores}</Td>
                  <Td>{ns.memoryMB}</Td>
                  <Td>${ns.estimatedMonthlyCost.toFixed(2)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </GridItem>
      ))}
    </Grid>
  );
};

export default CostPage;
