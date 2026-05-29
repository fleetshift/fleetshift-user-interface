import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Alert,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  CodeBlock,
  CodeBlockCode,
  Label,
  PageSection,
  Spinner,
  Split,
  SplitItem,
  Stack,
  StackItem,
  Title,
} from "@patternfly/react-core";
import { PlayIcon } from "@patternfly/react-icons";
import {
  type GcpHcpCluster,
  getGcpHcpCluster,
  deleteGcpHcpCluster,
  resumeGcpHcpCluster,
} from "./api";

const STATE_COLORS: Record<
  string,
  "blue" | "green" | "orange" | "red" | "grey"
> = {
  CREATING: "blue",
  ACTIVE: "green",
  DELETING: "orange",
  FAILED: "red",
  PAUSED_AUTH: "orange",
};

interface DeliveryEvent {
  type: string;
  deliveryId: string;
  targetId: string;
  targetType: string;
  eventKind: string;
  message: string;
  timestamp: number;
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString();
}

export default function GcpHcpClusterDetailPage() {
  const { clusterId } = useParams<{ clusterId: string }>();
  const navigate = useNavigate();
  const [cluster, setCluster] = useState<GcpHcpCluster | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [events, setEvents] = useState<DeliveryEvent[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const eventsEndRef = useRef<HTMLDivElement>(null);

  const fetchCluster = useCallback(async () => {
    if (!clusterId) return;
    try {
      const data = await getGcpHcpCluster(clusterId);
      setCluster(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [clusterId]);

  useEffect(() => {
    fetchCluster();
    const interval = setInterval(fetchCluster, 5000);
    return () => clearInterval(interval);
  }, [fetchCluster]);

  useEffect(() => {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${proto}//${window.location.host}/api/ui/events/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onerror = () => setWsConnected(false);

    ws.onmessage = (e) => {
      try {
        const event: DeliveryEvent = JSON.parse(e.data);
        if (event.targetType === "gcphcp") {
          setEvents((prev) => [...prev, event]);
        }
      } catch {
        // ignore malformed messages
      }
    };

    return () => ws.close();
  }, []);

  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  const handleDelete = useCallback(async () => {
    if (!clusterId || !confirm(`Delete cluster "${clusterId}"?`)) return;
    setDeleting(true);
    try {
      await deleteGcpHcpCluster(clusterId);
      navigate("/gcphcp");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setDeleting(false);
    }
  }, [clusterId, navigate]);

  const handleResume = useCallback(async () => {
    if (!clusterId) return;
    setResuming(true);
    setError(null);
    try {
      await resumeGcpHcpCluster(clusterId);
      await fetchCluster();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setResuming(false);
    }
  }, [clusterId, fetchCluster]);

  if (loading) {
    return (
      <PageSection>
        <Spinner size="lg" />
      </PageSection>
    );
  }

  return (
    <PageSection>
      <Stack hasGutter>
        <StackItem>
          <Breadcrumb>
            <BreadcrumbItem
              onClick={() => navigate("/gcphcp")}
              component="button"
            >
              GCP HCP Clusters
            </BreadcrumbItem>
            <BreadcrumbItem isActive>{clusterId}</BreadcrumbItem>
          </Breadcrumb>
        </StackItem>

        <StackItem>
          <Split hasGutter>
            <SplitItem isFilled>
              <Title headingLevel="h1" size="xl">
                {clusterId}
                {cluster && (
                  <>
                    {" "}
                    <Label color={STATE_COLORS[cluster.state] ?? "grey"}>
                      {cluster.state}
                      {cluster.reconciling ? " (reconciling)" : ""}
                    </Label>
                  </>
                )}
              </Title>
            </SplitItem>
            {cluster?.state === "PAUSED_AUTH" && (
              <SplitItem>
                <Button
                  variant="primary"
                  icon={<PlayIcon />}
                  onClick={handleResume}
                  isDisabled={resuming}
                  isLoading={resuming}
                >
                  {resuming ? "Resuming..." : "Resume"}
                </Button>
              </SplitItem>
            )}
            <SplitItem>
              <Button
                variant="danger"
                onClick={handleDelete}
                isDisabled={deleting}
                isLoading={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </SplitItem>
          </Split>
        </StackItem>

        {error && (
          <StackItem>
            <Alert variant="danger" title="Error" isInline>
              {error}
            </Alert>
          </StackItem>
        )}

        <StackItem>
          <Title headingLevel="h2" size="lg">
            Delivery Events{" "}
            <Label color={wsConnected ? "green" : "red"}>
              {wsConnected ? "live" : "disconnected"}
            </Label>
          </Title>
          <div
            style={{
              maxHeight: 300,
              overflow: "auto",
              background: "var(--pf-t--global--background--color--secondary--default)",
              padding: "var(--pf-t--global--spacer--sm)",
              borderRadius: "var(--pf-t--global--border--radius--small)",
              fontFamily: "var(--pf-t--global--font--family--mono)",
              fontSize: "var(--pf-t--global--font--size--sm)",
            }}
          >
            {events.length === 0 ? (
              <div style={{ color: "var(--pf-t--global--text--color--subtle)" }}>
                Waiting for delivery events...
              </div>
            ) : (
              events.map((ev, i) => (
                <div key={i} style={{ marginBottom: 2 }}>
                  <span
                    style={{ color: "var(--pf-t--global--text--color--subtle)" }}
                  >
                    [{formatTimestamp(ev.timestamp)}]
                  </span>{" "}
                  <span
                    style={{
                      color:
                        ev.eventKind === "error"
                          ? "var(--pf-t--global--color--status--danger--default)"
                          : ev.eventKind === "warning"
                            ? "var(--pf-t--global--color--status--warning--default)"
                            : "var(--pf-t--global--text--color--regular)",
                    }}
                  >
                    {ev.message}
                  </span>
                </div>
              ))
            )}
            <div ref={eventsEndRef} />
          </div>
        </StackItem>

        {cluster && (
          <StackItem>
            <Title headingLevel="h2" size="lg">
              Cluster Data
            </Title>
            <CodeBlock>
              <CodeBlockCode>
                {JSON.stringify(cluster, null, 2)}
              </CodeBlockCode>
            </CodeBlock>
          </StackItem>
        )}
      </Stack>
    </PageSection>
  );
}
