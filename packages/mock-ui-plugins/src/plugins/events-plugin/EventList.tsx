import { useEffect, useState } from "react";
import { Label, Spinner } from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import type { Event } from "@fleetshift/common";
import { fetchEvents } from "@fleetshift/common";
import { useApiBase } from "./api";

interface EventListProps {
  clusterIds: string[];
}

const EventList = ({ clusterIds }: EventListProps) => {
  const apiBase = useApiBase();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const multiCluster = clusterIds.length > 1;

  useEffect(() => {
    Promise.all(clusterIds.map((id) => fetchEvents(apiBase, id))).then(
      (results) => {
        setEvents(results.flat());
        setLoading(false);
      },
    );
  }, [apiBase, clusterIds]);

  if (loading) return <Spinner size="lg" />;

  return (
    <Table aria-label="Event list" variant="compact">
      <Thead>
        <Tr>
          <Th>Type</Th>
          {multiCluster && <Th>Cluster</Th>}
          <Th>Reason</Th>
          <Th>Message</Th>
          <Th>Namespace</Th>
          <Th>Source</Th>
          <Th>Time</Th>
        </Tr>
      </Thead>
      <Tbody>
        {events.map((evt) => (
          <Tr key={evt.id}>
            <Td>
              <Label color={evt.type === "Normal" ? "blue" : "orange"}>
                {evt.type}
              </Label>
            </Td>
            {multiCluster && <Td>{evt.cluster_id}</Td>}
            <Td>{evt.reason}</Td>
            <Td>{evt.message}</Td>
            <Td>{evt.namespace_id.replace(`${evt.cluster_id}-`, "")}</Td>
            <Td>{evt.source}</Td>
            <Td>{evt.created_at}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};

export default EventList;
