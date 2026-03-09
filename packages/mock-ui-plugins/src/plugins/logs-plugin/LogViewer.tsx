import { useEffect, useState } from "react";
import { Label, Spinner } from "@patternfly/react-core";
import { makeRequest } from "@fleetshift/common";
import { useApiBase } from "./api";

interface LogEntry {
  timestamp: string;
  pod: string;
  namespace: string;
  level: string;
  message: string;
}

interface LogViewerProps {
  clusterIds: string[];
}

const levelColor = (level: string) => {
  if (level === "INFO") return "blue";
  if (level === "WARN") return "orange";
  if (level === "ERROR") return "red";
  return "grey";
};

const LogViewer = ({ clusterIds }: LogViewerProps) => {
  const apiBase = useApiBase();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all(
      clusterIds.map((id) =>
        makeRequest<LogEntry[]>(`${apiBase}/clusters/${id}/logs`),
      ),
    ).then((results) => {
      setLogs(results.flat());
      setLoading(false);
    });
  }, [apiBase, clusterIds]);

  if (loading) return <Spinner size="lg" />;

  return (
    <pre
      style={{
        backgroundColor: "#1e1e1e",
        color: "#d4d4d4",
        padding: "16px",
        borderRadius: "6px",
        overflow: "auto",
        maxHeight: "600px",
        fontSize: "13px",
        lineHeight: "1.6",
      }}
    >
      <code>
        {logs.map((entry, i) => (
          <div
            key={i}
            style={{ display: "flex", gap: "8px", alignItems: "center" }}
          >
            <span style={{ color: "#888" }}>[{entry.timestamp}]</span>
            <Label color={levelColor(entry.level)} isCompact>
              {entry.level}
            </Label>
            <span>
              {entry.pod}/{entry.namespace}: {entry.message}
            </span>
          </div>
        ))}
      </code>
    </pre>
  );
};

export default LogViewer;
