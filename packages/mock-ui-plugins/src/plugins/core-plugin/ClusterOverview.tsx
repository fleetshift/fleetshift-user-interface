import { useMemo } from "react";
import {
  Card,
  CardBody,
  CardTitle,
  Grid,
  GridItem,
  Spinner,
  Title,
  Icon,
} from "@patternfly/react-core";
import {
  CubesIcon,
  ProjectDiagramIcon,
  ServerIcon,
} from "@patternfly/react-icons";
import { useRemoteHook } from "@scalprum/react-core";
import { usePodStore } from "./podStore";
import { useNamespaceStore } from "./namespaceStore";

interface StatCardProps {
  title: string;
  icon: React.ComponentType;
  loading: boolean;
  children: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  icon: IconComponent,
  loading,
  children,
}) => (
  <Card isFullHeight>
    <CardTitle>
      <Title headingLevel="h3" size="md">
        <Icon isInline style={{ marginRight: "0.5rem" }}>
          <IconComponent />
        </Icon>
        {title}
      </Title>
    </CardTitle>
    <CardBody>
      {loading ? (
        <div
          style={{ display: "flex", justifyContent: "center", padding: "1rem" }}
        >
          <Spinner size="lg" />
        </div>
      ) : (
        children
      )}
    </CardBody>
  </Card>
);

const ClusterOverview: React.FC = () => {
  const { pods, loading: podsLoading } = usePodStore();
  const { namespaces, loading: nsLoading } = useNamespaceStore();

  // Use node store from nodes-plugin via remote hook
  const { hookResult: nodeStoreResult, loading: nodesRemoteLoading } =
    useRemoteHook<{
      nodes: Array<{ id: string; name: string; status: string }>;
      loading: boolean;
    }>({
      scope: "nodes-plugin",
      module: "useNodeStore",
    });

  const nodes = nodeStoreResult?.nodes ?? [];
  const nodesLoading = nodesRemoteLoading || (nodeStoreResult?.loading ?? true);

  const podStats = useMemo(() => {
    const running = pods.filter((p) => p.status === "Running").length;
    const pending = pods.filter(
      (p) => p.status === "Pending" || p.status === "ContainerCreating",
    ).length;
    const failing = pods.filter((p) =>
      [
        "CrashLoopBackOff",
        "ImagePullBackOff",
        "ErrImagePull",
        "Error",
        "Failed",
      ].includes(p.status),
    ).length;
    return { total: pods.length, running, pending, failing };
  }, [pods]);

  const nodeStats = useMemo(() => {
    const ready = nodes.filter((n) => n.status === "Ready").length;
    return { total: nodes.length, ready, notReady: nodes.length - ready };
  }, [nodes]);

  const countStyle: React.CSSProperties = {
    fontSize: "2.5rem",
    fontWeight: 700,
    lineHeight: 1.2,
  };

  const breakdownStyle: React.CSSProperties = {
    fontSize: "0.85rem",
    marginTop: "0.25rem",
  };

  return (
    <Grid hasGutter>
      <GridItem md={4} sm={12}>
        <StatCard title="Pods" icon={CubesIcon} loading={podsLoading}>
          <div style={countStyle}>{podStats.total}</div>
          <div style={breakdownStyle}>
            <span
              style={{
                color: "var(--pf-t--global--color--status--success--default)",
              }}
            >
              {podStats.running} running
            </span>
            {" / "}
            <span
              style={{
                color: "var(--pf-t--global--color--status--warning--default)",
              }}
            >
              {podStats.pending} pending
            </span>
            {" / "}
            <span
              style={{
                color: "var(--pf-t--global--color--status--danger--default)",
              }}
            >
              {podStats.failing} failing
            </span>
          </div>
        </StatCard>
      </GridItem>

      <GridItem md={4} sm={12}>
        <StatCard
          title="Namespaces"
          icon={ProjectDiagramIcon}
          loading={nsLoading}
        >
          <div style={countStyle}>{namespaces.length}</div>
          <div style={breakdownStyle}>
            <span
              style={{
                color: "var(--pf-t--global--color--nonstatus--gray--default)",
              }}
            >
              across cluster
            </span>
          </div>
        </StatCard>
      </GridItem>

      <GridItem md={4} sm={12}>
        <StatCard title="Nodes" icon={ServerIcon} loading={nodesLoading}>
          <div style={countStyle}>{nodeStats.total}</div>
          <div style={breakdownStyle}>
            <span
              style={{
                color: "var(--pf-t--global--color--status--success--default)",
              }}
            >
              {nodeStats.ready} ready
            </span>
            {" / "}
            <span
              style={{
                color: "var(--pf-t--global--color--status--danger--default)",
              }}
            >
              {nodeStats.notReady} not ready
            </span>
          </div>
        </StatCard>
      </GridItem>
    </Grid>
  );
};

export default ClusterOverview;
