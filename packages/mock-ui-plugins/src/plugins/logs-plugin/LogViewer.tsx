import { useState, useMemo, useRef, useEffect } from "react";
import {
  Card,
  CardBody,
  CardTitle,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  SearchInput,
  Spinner,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  ToggleGroup,
  ToggleGroupItem,
  Switch,
} from "@patternfly/react-core";
import { useLogStore } from "./logStore";
import { LogEntry } from "./LogEntry";

type LevelFilter = "All" | "INFO" | "WARN" | "ERROR" | "DEBUG";

const LEVELS: LevelFilter[] = ["All", "INFO", "WARN", "ERROR", "DEBUG"];

const LogViewer: React.FC = () => {
  const { lines, loading } = useLogStore();
  const [searchText, setSearchText] = useState("");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("All");
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredLogs = useMemo(
    () =>
      lines.filter((log) => {
        if (levelFilter !== "All" && log.level !== levelFilter) return false;
        if (
          searchText &&
          !log.message.toLowerCase().includes(searchText.toLowerCase())
        )
          return false;
        return true;
      }),
    [lines, levelFilter, searchText],
  );

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLogs.length, autoScroll]);

  return (
    <Card>
      <CardTitle>Logs</CardTitle>
      <CardBody>
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <SearchInput
                placeholder="Filter by message"
                value={searchText}
                onChange={(_event, value) => setSearchText(value)}
                onClear={() => setSearchText("")}
              />
            </ToolbarItem>
            <ToolbarItem>
              <ToggleGroup aria-label="Log level filter">
                {LEVELS.map((level) => (
                  <ToggleGroupItem
                    key={level}
                    text={level}
                    buttonId={`log-level-${level}`}
                    isSelected={levelFilter === level}
                    onChange={() => setLevelFilter(level)}
                  />
                ))}
              </ToggleGroup>
            </ToolbarItem>
            <ToolbarItem>
              <Switch
                id="auto-scroll"
                label="Auto-scroll"
                isChecked={autoScroll}
                onChange={(_event, checked) => setAutoScroll(checked)}
              />
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>

        {loading && lines.length === 0 ? (
          <Spinner aria-label="Loading logs" />
        ) : filteredLogs.length === 0 ? (
          <EmptyState
            titleText="No logs available"
            headingLevel="h2"
            variant={EmptyStateVariant.sm}
          >
            <EmptyStateBody>
              {lines.length === 0
                ? "Waiting for log data from the cluster..."
                : "No logs match the current filters."}
            </EmptyStateBody>
          </EmptyState>
        ) : (
          <div
            ref={scrollRef}
            style={{
              overflow: "auto",
              maxHeight: 600,
              fontFamily: "monospace",
              fontSize: "0.85rem",
            }}
          >
            <pre style={{ margin: 0 }}>
              <code>
                {filteredLogs.map((log, index) => (
                  <LogEntry key={index} log={log} />
                ))}
              </code>
            </pre>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default LogViewer;
