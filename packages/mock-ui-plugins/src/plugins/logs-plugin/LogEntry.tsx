import { Label } from "@patternfly/react-core";

interface LogLine {
  timestamp: string;
  pod: string;
  namespace: string;
  level: string;
  message: string;
  cluster: string;
}

export interface LogEntryProps {
  log: LogLine;
}

const LEVEL_COLORS: Record<string, "green" | "orange" | "red" | "blue"> = {
  INFO: "green",
  WARN: "orange",
  ERROR: "red",
  DEBUG: "blue",
};

export const LogEntry: React.FC<LogEntryProps> = ({ log }) => (
  <div style={{ whiteSpace: "pre-wrap", marginBottom: 2 }}>
    <span>[{log.timestamp}] </span>
    <Label color={LEVEL_COLORS[log.level] ?? "grey"} isCompact>
      {log.level}
    </Label>{" "}
    <Label color="purple" isCompact>
      {log.cluster}
    </Label>
    <span>
      {" "}
      {log.pod}/{log.namespace}: {log.message}
    </span>
    {"\n"}
  </div>
);
