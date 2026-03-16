import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Card,
  CardBody,
  CardTitle,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  Icon,
  Label,
  LabelGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Spinner,
  Title,
} from "@patternfly/react-core";
import {
  CheckCircleIcon,
  ClusterIcon,
  CubesIcon,
  RedhatIcon,
  ServerIcon,
} from "@patternfly/react-icons";
import { useApiBase, fetchJson } from "./api";

interface Cluster {
  id: string;
  name: string;
  status: string;
  version: string;
  plugins: string[];
  platform?: "openshift" | "kubernetes";
  server?: string;
  nodeCount?: number;
  created_at: string;
}

const PLUGIN_KEY_MAP: Record<string, string> = {
  core: "Core",
  observability: "Observability",
  nodes: "Nodes",
  networking: "Networking",
  storage: "Storage",
  upgrades: "Upgrades",
  alerts: "Alerts",
  cost: "Cost",
  deployments: "Deployments",
  logs: "Logs",
  pipelines: "Pipelines",
  config: "Config",
  gitops: "GitOps",
  events: "Events",
  routes: "Routes",
};

const OPS_PLUGINS = new Set([
  "core",
  "observability",
  "nodes",
  "networking",
  "storage",
  "upgrades",
  "alerts",
  "cost",
]);

const ClusterDetailPage: React.FC<{ clusterIds: string[] }> = () => {
  const { clusterId } = useParams<{ clusterId: string }>();
  const navigate = useNavigate();
  const apiBase = useApiBase();
  const [cluster, setCluster] = useState<Cluster | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDisconnect, setShowDisconnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    if (!clusterId) return;
    setLoading(true);
    fetchJson<Cluster>(`${apiBase}/clusters/${clusterId}`)
      .then((data) => {
        setCluster(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(String(err));
        setLoading(false);
      });
  }, [apiBase, clusterId]);

  const handleDisconnect = async () => {
    if (!clusterId) return;
    setDisconnecting(true);
    try {
      await fetch(`${apiBase}/clusters/${clusterId}`, { method: "DELETE" });
      navigate("/clusters");
    } catch {
      setDisconnecting(false);
    }
  };

  if (loading) return <Spinner size="xl" />;
  if (error || !cluster) {
    return <Title headingLevel="h1">{error ?? "Cluster not found"}</Title>;
  }

  const isOpenShift = cluster.platform === "openshift";
  const platformLabel = isOpenShift ? "OpenShift" : "Kubernetes";

  const opsPlugins = cluster.plugins.filter((p) => OPS_PLUGINS.has(p));
  const devPlugins = cluster.plugins.filter((p) => !OPS_PLUGINS.has(p));

  const statCards = [
    {
      label: "Status",
      value: cluster.status,
      icon: (
        <CheckCircleIcon color="var(--pf-t--global--color--status--success--default)" />
      ),
    },
    {
      label: "Nodes",
      value: cluster.nodeCount ?? "—",
      icon: <ServerIcon />,
    },
    {
      label: "Version",
      value: cluster.version,
      icon: <CubesIcon />,
    },
    {
      label: "Plugins",
      value: cluster.plugins.length,
      icon: <ClusterIcon />,
    },
  ];

  return (
    <div>
      <Breadcrumb style={{ marginBottom: "var(--pf-t--global--spacer--md)" }}>
        <BreadcrumbItem
          to="/clusters"
          onClick={(e) => {
            e.preventDefault();
            navigate("/clusters");
          }}
        >
          Clusters
        </BreadcrumbItem>
        <BreadcrumbItem isActive>{cluster.name}</BreadcrumbItem>
      </Breadcrumb>

      {/* Identity banner */}
      <Card style={{ marginBottom: "var(--pf-t--global--spacer--lg)" }}>
        <CardBody>
          <Flex
            alignItems={{ default: "alignItemsCenter" }}
            gap={{ default: "gapMd" }}
          >
            <FlexItem>
              <Icon size="xl">
                {isOpenShift ? (
                  <RedhatIcon color="var(--pf-t--global--color--status--danger--default)" />
                ) : (
                  <CubesIcon color="var(--pf-t--global--color--brand--default)" />
                )}
              </Icon>
            </FlexItem>
            <FlexItem>
              <Title headingLevel="h1" size="2xl">
                {cluster.name}
              </Title>
              <Flex
                gap={{ default: "gapSm" }}
                style={{ marginTop: "var(--pf-t--global--spacer--xs)" }}
              >
                <Label color={isOpenShift ? "red" : "blue"} isCompact>
                  {platformLabel}
                </Label>
                <Label color="green" icon={<CheckCircleIcon />} isCompact>
                  {cluster.status}
                </Label>
              </Flex>
            </FlexItem>
            <FlexItem align={{ default: "alignRight" }}>
              <Button
                variant="danger"
                onClick={() => setShowDisconnect(true)}
              >
                Disconnect
              </Button>
            </FlexItem>
          </Flex>
        </CardBody>
      </Card>

      <Modal
        isOpen={showDisconnect}
        onClose={() => setShowDisconnect(false)}
        variant="small"
      >
        <ModalHeader
          title="Disconnect cluster"
          description={`Are you sure you want to disconnect "${cluster.name}"? This will remove it from FleetShift.`}
        />
        <ModalBody />
        <ModalFooter>
          <Button
            variant="danger"
            onClick={handleDisconnect}
            isLoading={disconnecting}
            isDisabled={disconnecting}
          >
            Disconnect
          </Button>
          <Button
            variant="link"
            onClick={() => setShowDisconnect(false)}
            isDisabled={disconnecting}
          >
            Cancel
          </Button>
        </ModalFooter>
      </Modal>

      {/* Stat cards */}
      <Grid
        hasGutter
        style={{ marginBottom: "var(--pf-t--global--spacer--lg)" }}
      >
        {statCards.map((stat) => (
          <GridItem md={3} sm={6} key={stat.label}>
            <Card isFullHeight>
              <CardBody
                style={{
                  textAlign: "center",
                  padding:
                    "var(--pf-t--global--spacer--lg) var(--pf-t--global--spacer--md)",
                }}
              >
                <div
                  style={{
                    marginBottom: "var(--pf-t--global--spacer--sm)",
                    color: "var(--pf-t--global--text--color--subtle)",
                  }}
                >
                  <Icon size="lg">{stat.icon}</Icon>
                </div>
                <div
                  style={{
                    fontSize: "var(--pf-t--global--font--size--2xl)",
                    fontWeight:
                      "var(--pf-t--global--font--weight--heading--default)",
                    lineHeight: 1.2,
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: "var(--pf-t--global--font--size--sm)",
                    color: "var(--pf-t--global--text--color--subtle)",
                    marginTop: "var(--pf-t--global--spacer--xs)",
                  }}
                >
                  {stat.label}
                </div>
              </CardBody>
            </Card>
          </GridItem>
        ))}
      </Grid>

      {/* Details + Plugins */}
      <Grid hasGutter>
        <GridItem md={8} sm={12}>
          <Card isFullHeight>
            <CardTitle>
              <Title headingLevel="h3" size="md">
                Cluster Details
              </Title>
            </CardTitle>
            <CardBody>
              <DescriptionList columnModifier={{ lg: "2Col" }} isHorizontal>
                <DescriptionListGroup>
                  <DescriptionListTerm>Cluster ID</DescriptionListTerm>
                  <DescriptionListDescription>
                    <code
                      style={{
                        fontFamily: "var(--pf-t--global--font--family--mono)",
                        fontSize: "var(--pf-t--global--font--size--sm)",
                        background:
                          "var(--pf-t--global--background--color--secondary--default)",
                        padding: "2px 6px",
                        borderRadius:
                          "var(--pf-t--global--border--radius--small)",
                      }}
                    >
                      {cluster.id}
                    </code>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Platform</DescriptionListTerm>
                  <DescriptionListDescription>
                    {platformLabel}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Version</DescriptionListTerm>
                  <DescriptionListDescription>
                    {cluster.version}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Nodes</DescriptionListTerm>
                  <DescriptionListDescription>
                    {cluster.nodeCount ?? "—"}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                {cluster.server && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>API Server</DescriptionListTerm>
                    <DescriptionListDescription>
                      <code
                        style={{
                          fontFamily: "var(--pf-t--global--font--family--mono)",
                          fontSize: "var(--pf-t--global--font--size--sm)",
                          background:
                            "var(--pf-t--global--background--color--secondary--default)",
                          padding: "2px 6px",
                          borderRadius:
                            "var(--pf-t--global--border--radius--small)",
                        }}
                      >
                        {cluster.server}
                      </code>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                )}
                <DescriptionListGroup>
                  <DescriptionListTerm>Created</DescriptionListTerm>
                  <DescriptionListDescription>
                    {new Date(cluster.created_at).toLocaleDateString(
                      undefined,
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      },
                    )}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem md={4} sm={12}>
          <Card isFullHeight>
            <CardTitle>
              <Title headingLevel="h3" size="md">
                Enabled Plugins ({cluster.plugins.length})
              </Title>
            </CardTitle>
            <CardBody>
              {opsPlugins.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: "var(--pf-t--global--font--size--xs)",
                      fontWeight:
                        "var(--pf-t--global--font--weight--heading--default)",
                      color: "var(--pf-t--global--text--color--subtle)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: "var(--pf-t--global--spacer--sm)",
                    }}
                  >
                    Operations
                  </div>
                  <LabelGroup>
                    {opsPlugins.map((plugin) => (
                      <Label key={plugin} color="blue" isCompact>
                        {PLUGIN_KEY_MAP[plugin] ?? plugin}
                      </Label>
                    ))}
                  </LabelGroup>
                </div>
              )}
              {devPlugins.length > 0 && (
                <div
                  style={{
                    marginTop:
                      opsPlugins.length > 0
                        ? "var(--pf-t--global--spacer--md)"
                        : undefined,
                  }}
                >
                  <div
                    style={{
                      fontSize: "var(--pf-t--global--font--size--xs)",
                      fontWeight:
                        "var(--pf-t--global--font--weight--heading--default)",
                      color: "var(--pf-t--global--text--color--subtle)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: "var(--pf-t--global--spacer--sm)",
                    }}
                  >
                    Developer
                  </div>
                  <LabelGroup>
                    {devPlugins.map((plugin) => (
                      <Label key={plugin} color="purple" isCompact>
                        {PLUGIN_KEY_MAP[plugin] ?? plugin}
                      </Label>
                    ))}
                  </LabelGroup>
                </div>
              )}
            </CardBody>
          </Card>
        </GridItem>
      </Grid>
    </div>
  );
};

export default ClusterDetailPage;
