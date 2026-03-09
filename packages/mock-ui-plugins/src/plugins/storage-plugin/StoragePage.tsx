import { useEffect, useState } from "react";
import {
  EmptyState,
  EmptyStateBody,
  Label,
  Spinner,
  Title,
} from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import type {
  PersistentVolume,
  PersistentVolumeClaim,
} from "@fleetshift/common";
import {
  fetchPersistentVolumes,
  fetchPersistentVolumeClaims,
} from "@fleetshift/common";
import { useApiBase } from "./api";

interface StoragePageProps {
  clusterIds: string[];
}

const statusColor = (status: string) => {
  if (status === "Bound") return "green";
  if (status === "Available") return "blue";
  if (status === "Pending") return "orange";
  return "grey";
};

const stripClusterPrefix = (namespaceId: string, clusterId: string): string =>
  namespaceId.replace(`${clusterId}-`, "");

const StoragePage = ({ clusterIds }: StoragePageProps) => {
  const apiBase = useApiBase();
  const [pvs, setPvs] = useState<PersistentVolume[]>([]);
  const [pvcs, setPvcs] = useState<PersistentVolumeClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const multiCluster = clusterIds.length > 1;

  useEffect(() => {
    Promise.all([
      Promise.all(clusterIds.map((id) => fetchPersistentVolumes(apiBase, id))),
      Promise.all(
        clusterIds.map((id) => fetchPersistentVolumeClaims(apiBase, id)),
      ),
    ]).then(([pvResults, pvcResults]) => {
      setPvs(pvResults.flat());
      setPvcs(pvcResults.flat());
      setLoading(false);
    });
  }, [apiBase, clusterIds]);

  if (loading) return <Spinner size="lg" />;

  if (pvs.length === 0 && pvcs.length === 0) {
    return (
      <EmptyState titleText="No storage resources" headingLevel="h2">
        <EmptyStateBody>
          No persistent volumes or claims found for the selected clusters. Try
          reinstalling the cluster to generate storage data.
        </EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <>
      <Title headingLevel="h2" style={{ marginBottom: 8 }}>
        Persistent Volumes
      </Title>
      {pvs.length === 0 ? (
        <p>No persistent volumes found.</p>
      ) : (
        <Table aria-label="Persistent Volumes" variant="compact">
          <Thead>
            <Tr>
              <Th>Name</Th>
              {multiCluster && <Th>Cluster</Th>}
              <Th>Capacity</Th>
              <Th>Access Mode</Th>
              <Th>Status</Th>
              <Th>Storage Class</Th>
            </Tr>
          </Thead>
          <Tbody>
            {pvs.map((pv) => (
              <Tr key={pv.id}>
                <Td>{pv.name}</Td>
                {multiCluster && <Td>{pv.cluster_id}</Td>}
                <Td>{pv.capacity}</Td>
                <Td>{pv.access_mode}</Td>
                <Td>
                  <Label color={statusColor(pv.status)}>{pv.status}</Label>
                </Td>
                <Td>{pv.storage_class}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      <Title headingLevel="h2" style={{ marginTop: 24, marginBottom: 8 }}>
        Persistent Volume Claims
      </Title>
      {pvcs.length === 0 ? (
        <p>No persistent volume claims found.</p>
      ) : (
        <Table aria-label="Persistent Volume Claims" variant="compact">
          <Thead>
            <Tr>
              <Th>Name</Th>
              {multiCluster && <Th>Cluster</Th>}
              <Th>Namespace</Th>
              <Th>Status</Th>
              <Th>Capacity</Th>
              <Th>Storage Class</Th>
              <Th>PV</Th>
            </Tr>
          </Thead>
          <Tbody>
            {pvcs.map((pvc) => (
              <Tr key={pvc.id}>
                <Td>{pvc.name}</Td>
                {multiCluster && <Td>{pvc.cluster_id}</Td>}
                <Td>{stripClusterPrefix(pvc.namespace_id, pvc.cluster_id)}</Td>
                <Td>
                  <Label color={statusColor(pvc.status)}>{pvc.status}</Label>
                </Td>
                <Td>{pvc.capacity}</Td>
                <Td>{pvc.storage_class}</Td>
                <Td>{pvc.pv_name}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </>
  );
};

export default StoragePage;
