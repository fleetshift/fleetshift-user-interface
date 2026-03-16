import { useEffect, useState } from "react";
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  Label,
  Spinner,
} from "@patternfly/react-core";
import { Table, Thead, Tbody, Tr, Th, Td } from "@patternfly/react-table";
import { useApiBase } from "./api";

interface DeploymentTabProps {
  deploymentId: string;
  deploymentName: string;
  namespace: string;
  clusterId: string;
}

interface LogLine {
  timestamp: string;
  pod: string;
  namespace: string;
  level: string;
  message: string;
}

function levelColor(level: string): "red" | "orange" | "blue" | "grey" {
  switch (level.toUpperCase()) {
    case "ERROR":
      return "red";
    case "WARN":
      return "orange";
    case "INFO":
      return "blue";
    default:
      return "grey";
  }
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  });
}

const DeploymentLogsTab: React.FC<DeploymentTabProps> = ({
  namespace,
  clusterId,
}) => {
  const apiBase = useApiBase();
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${apiBase}/clusters/${clusterId}/logs`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: LogLine[]) => {
        const filtered = data
          .filter((l) => l.namespace === namespace)
          .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
          .slice(0, 200);
        setLogs(filtered);
      })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [apiBase, clusterId, namespace]);

  if (loading) {
    return (
      <Bullseye>
        <Spinner size="lg" />
      </Bullseye>
    );
  }

  if (logs.length === 0) {
    return (
      <EmptyState titleText="No logs" headingLevel="h3">
        <EmptyStateBody>No logs found for this namespace.</EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <Table aria-label="Deployment Logs" variant="compact">
      <Thead>
        <Tr>
          <Th>Timestamp</Th>
          <Th>Level</Th>
          <Th>Pod</Th>
          <Th>Message</Th>
        </Tr>
      </Thead>
      <Tbody>
        {logs.map((log, idx) => (
          <Tr key={`${log.timestamp}-${log.pod}-${idx}`}>
            <Td dataLabel="Timestamp">
              <span
                style={{
                  fontFamily: "var(--pf-t--global--font--family--mono)",
                  fontSize: "var(--pf-t--global--font--size--sm)",
                  color: "var(--pf-t--global--text--color--subtle)",
                  whiteSpace: "nowrap",
                }}
              >
                {formatTimestamp(log.timestamp)}
              </span>
            </Td>
            <Td dataLabel="Level">
              <Label color={levelColor(log.level)} isCompact>
                {log.level}
              </Label>
            </Td>
            <Td dataLabel="Pod">
              <span
                style={{
                  fontWeight:
                    "var(--pf-t--global--font--weight--heading--default)",
                  fontSize: "var(--pf-t--global--font--size--sm)",
                }}
              >
                {log.pod}
              </span>
            </Td>
            <Td dataLabel="Message">
              <span
                style={{
                  fontFamily: "var(--pf-t--global--font--family--mono)",
                  fontSize: "var(--pf-t--global--font--size--sm)",
                }}
              >
                {log.message}
              </span>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};

export default DeploymentLogsTab;
