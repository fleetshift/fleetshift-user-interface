import { useEffect, useState } from "react";
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  Label,
  Spinner,
  Tooltip,
} from "@patternfly/react-core";
import { Table, Thead, Tbody, Tr, Th, Td } from "@patternfly/react-table";
import { useApiBase } from "./api";
import { formatRelativeTime, truncate } from "@fleetshift/common";

interface DeploymentTabProps {
  deploymentId: string;
  deploymentName: string;
  namespace: string;
  clusterId: string;
}

interface K8sEvent {
  id: string;
  cluster_id: string;
  namespace_id: string;
  type: string;
  reason: string;
  message: string;
  source: string;
  created_at: string;
}

function typeColor(type: string): "green" | "orange" {
  return type === "Normal" ? "green" : "orange";
}

const DeploymentEventsTab: React.FC<DeploymentTabProps> = ({
  namespace,
  clusterId,
}) => {
  const apiBase = useApiBase();
  const [events, setEvents] = useState<K8sEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${apiBase}/clusters/${clusterId}/events`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: K8sEvent[]) => {
        const filtered = data
          .filter(
            (e) =>
              e.namespace_id === namespace ||
              e.namespace_id === `${clusterId}-${namespace}`,
          )
          .sort((a, b) => b.created_at.localeCompare(a.created_at));
        setEvents(filtered);
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [apiBase, clusterId, namespace]);

  if (loading) {
    return (
      <Bullseye>
        <Spinner size="lg" />
      </Bullseye>
    );
  }

  if (events.length === 0) {
    return (
      <EmptyState titleText="No events" headingLevel="h3">
        <EmptyStateBody>No events found for this namespace.</EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <Table aria-label="Deployment Events" variant="compact">
      <Thead>
        <Tr>
          <Th>Type</Th>
          <Th>Reason</Th>
          <Th>Message</Th>
          <Th>Source</Th>
          <Th>Last Seen</Th>
        </Tr>
      </Thead>
      <Tbody>
        {events.map((event) => {
          const shortMessage = truncate(event.message, 80);
          const needsTooltip = event.message.length > 80;

          return (
            <Tr key={event.id}>
              <Td dataLabel="Type">
                <Label color={typeColor(event.type)} isCompact>
                  {event.type}
                </Label>
              </Td>
              <Td dataLabel="Reason">
                <span
                  style={{
                    fontWeight:
                      "var(--pf-t--global--font--weight--heading--default)",
                  }}
                >
                  {event.reason}
                </span>
              </Td>
              <Td dataLabel="Message">
                {needsTooltip ? (
                  <Tooltip content={event.message}>
                    <span>{shortMessage}</span>
                  </Tooltip>
                ) : (
                  shortMessage
                )}
              </Td>
              <Td dataLabel="Source">
                <span
                  style={{
                    fontSize: "var(--pf-t--global--font--size--sm)",
                    color: "var(--pf-t--global--text--color--subtle)",
                  }}
                >
                  {event.source}
                </span>
              </Td>
              <Td dataLabel="Last Seen">
                <span
                  style={{
                    fontSize: "var(--pf-t--global--font--size--sm)",
                    color: "var(--pf-t--global--text--color--subtle)",
                  }}
                >
                  {formatRelativeTime(event.created_at)}
                </span>
              </Td>
            </Tr>
          );
        })}
      </Tbody>
    </Table>
  );
};

export default DeploymentEventsTab;
