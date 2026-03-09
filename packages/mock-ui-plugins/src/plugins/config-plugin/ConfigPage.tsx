import { useEffect, useState } from "react";
import { Spinner, Title } from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import type { ConfigMap, Secret } from "@fleetshift/common";
import { fetchConfigMaps, fetchSecrets } from "@fleetshift/common";
import { useApiBase } from "./api";

interface ConfigPageProps {
  clusterIds: string[];
}

const ConfigPage = ({ clusterIds }: ConfigPageProps) => {
  const apiBase = useApiBase();
  const [configMaps, setConfigMaps] = useState<ConfigMap[]>([]);
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const multiCluster = clusterIds.length > 1;

  useEffect(() => {
    Promise.all([
      Promise.all(clusterIds.map((id) => fetchConfigMaps(apiBase, id))),
      Promise.all(clusterIds.map((id) => fetchSecrets(apiBase, id))),
    ]).then(([cmResults, secretResults]) => {
      setConfigMaps(cmResults.flat());
      setSecrets(secretResults.flat());
      setLoading(false);
    });
  }, [apiBase, clusterIds]);

  if (loading) return <Spinner size="lg" />;

  return (
    <>
      <Title headingLevel="h2" style={{ marginBottom: "16px" }}>
        ConfigMaps
      </Title>
      <Table aria-label="ConfigMap list" variant="compact">
        <Thead>
          <Tr>
            <Th>Name</Th>
            {multiCluster && <Th>Cluster</Th>}
            <Th>Namespace</Th>
            <Th>Keys</Th>
          </Tr>
        </Thead>
        <Tbody>
          {configMaps.map((cm) => (
            <Tr key={cm.id}>
              <Td>{cm.name}</Td>
              {multiCluster && <Td>{cm.cluster_id}</Td>}
              <Td>{cm.namespace_id.replace(`${cm.cluster_id}-`, "")}</Td>
              <Td>{cm.data_keys.join(", ")}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <Title
        headingLevel="h2"
        style={{ marginTop: "32px", marginBottom: "16px" }}
      >
        Secrets
      </Title>
      <Table aria-label="Secret list" variant="compact">
        <Thead>
          <Tr>
            <Th>Name</Th>
            {multiCluster && <Th>Cluster</Th>}
            <Th>Namespace</Th>
            <Th>Type</Th>
            <Th>Keys</Th>
          </Tr>
        </Thead>
        <Tbody>
          {secrets.map((s) => (
            <Tr key={s.id}>
              <Td>{s.name}</Td>
              {multiCluster && <Td>{s.cluster_id}</Td>}
              <Td>{s.namespace_id.replace(`${s.cluster_id}-`, "")}</Td>
              <Td>{s.type}</Td>
              <Td>{s.data_keys.join(", ")}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </>
  );
};

export default ConfigPage;
