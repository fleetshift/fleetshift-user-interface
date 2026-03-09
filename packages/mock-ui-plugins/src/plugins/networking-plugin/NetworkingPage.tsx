import { useEffect, useState } from "react";
import {
  Card,
  CardBody,
  CardTitle,
  Flex,
  FlexItem,
  Label,
  LabelGroup,
  Spinner,
  Stack,
  StackItem,
  Title,
} from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import type { Service, ServicePort, Ingress } from "@fleetshift/common";
import { fetchServices, fetchIngresses } from "@fleetshift/common";
import { useApiBase } from "./api";

interface NetworkingPageProps {
  clusterIds: string[];
}

const formatPorts = (ports: ServicePort[]): string =>
  ports.map((p) => `${p.port}:${p.targetPort}/${p.protocol}`).join(", ");

const stripClusterPrefix = (namespaceId: string, clusterId: string): string =>
  namespaceId.replace(`${clusterId}-`, "");

const typeColor = (type: string) => {
  switch (type) {
    case "LoadBalancer":
      return "blue" as const;
    case "NodePort":
      return "orange" as const;
    default:
      return "grey" as const;
  }
};

const NetworkingPage = ({ clusterIds }: NetworkingPageProps) => {
  const apiBase = useApiBase();
  const [services, setServices] = useState<Service[]>([]);
  const [ingresses, setIngresses] = useState<Ingress[]>([]);
  const [loading, setLoading] = useState(true);
  const multiCluster = clusterIds.length > 1;

  useEffect(() => {
    Promise.all([
      Promise.all(clusterIds.map((id) => fetchServices(apiBase, id))),
      Promise.all(clusterIds.map((id) => fetchIngresses(apiBase, id))),
    ]).then(([svcResults, ingResults]) => {
      setServices(svcResults.flat());
      setIngresses(ingResults.flat());
      setLoading(false);
    });
  }, [apiBase, clusterIds]);

  if (loading) return <Spinner size="lg" />;

  // Summary counts
  const lbCount = services.filter((s) => s.type === "LoadBalancer").length;
  const npCount = services.filter((s) => s.type === "NodePort").length;
  const cipCount = services.filter((s) => s.type === "ClusterIP").length;
  const tlsCount = ingresses.filter((i) => i.tls === 1).length;

  return (
    <Stack hasGutter>
      <StackItem>
        <Flex gap={{ default: "gapSm" }}>
          <FlexItem>
            <LabelGroup categoryName="Summary">
              <Label color="blue">{services.length} Services</Label>
              <Label color="blue">{ingresses.length} Ingresses</Label>
            </LabelGroup>
          </FlexItem>
          <FlexItem>
            <LabelGroup categoryName="Types">
              <Label color="purple">{cipCount} ClusterIP</Label>
              <Label color="orange">{npCount} NodePort</Label>
              <Label color="teal">{lbCount} LoadBalancer</Label>
            </LabelGroup>
          </FlexItem>
          <FlexItem>
            <LabelGroup categoryName="TLS">
              <Label color="green">
                {tlsCount}/{ingresses.length} Secured
              </Label>
            </LabelGroup>
          </FlexItem>
        </Flex>
      </StackItem>

      <StackItem>
        <Card>
          <CardTitle>
            <Title headingLevel="h3">Services</Title>
          </CardTitle>
          <CardBody>
            <Table aria-label="Services" variant="compact">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  {multiCluster && <Th>Cluster</Th>}
                  <Th>Namespace</Th>
                  <Th>Type</Th>
                  <Th>Cluster IP</Th>
                  <Th>Ports</Th>
                </Tr>
              </Thead>
              <Tbody>
                {services.map((svc) => (
                  <Tr key={svc.id}>
                    <Td>{svc.name}</Td>
                    {multiCluster && <Td>{svc.cluster_id}</Td>}
                    <Td>
                      {stripClusterPrefix(svc.namespace_id, svc.cluster_id)}
                    </Td>
                    <Td>
                      <Label color={typeColor(svc.type)}>{svc.type}</Label>
                    </Td>
                    <Td>
                      <code>{svc.cluster_ip}</code>
                    </Td>
                    <Td>
                      <code>{formatPorts(svc.ports)}</code>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardBody>
        </Card>
      </StackItem>

      <StackItem>
        <Card>
          <CardTitle>
            <Title headingLevel="h3">Ingresses</Title>
          </CardTitle>
          <CardBody>
            <Table aria-label="Ingresses" variant="compact">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  {multiCluster && <Th>Cluster</Th>}
                  <Th>Host</Th>
                  <Th>Path</Th>
                  <Th>Service</Th>
                  <Th>TLS</Th>
                </Tr>
              </Thead>
              <Tbody>
                {ingresses.map((ing) => (
                  <Tr key={ing.id}>
                    <Td>{ing.name}</Td>
                    {multiCluster && <Td>{ing.cluster_id}</Td>}
                    <Td>{ing.host}</Td>
                    <Td>
                      <code>{ing.path}</code>
                    </Td>
                    <Td>{ing.service_name}</Td>
                    <Td>
                      <Label color={ing.tls === 1 ? "green" : "red"}>
                        {ing.tls === 1 ? "Secured" : "None"}
                      </Label>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardBody>
        </Card>
      </StackItem>
    </Stack>
  );
};

export default NetworkingPage;
