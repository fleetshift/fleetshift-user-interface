import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
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
import { fetchCluster, InstalledCluster } from "../../utils/api";
import { usePluginRegistry } from "../../contexts/PluginRegistryContext";
import "./ClusterDetailPage.scss";

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

export const ClusterDetailPage = () => {
  const { clusterId } = useParams<{ clusterId: string }>();
  const navigate = useNavigate();
  const { pluginEntries } = usePluginRegistry();
  const [cluster, setCluster] = useState<InstalledCluster | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clusterId) return;
    setLoading(true);
    fetchCluster(clusterId)
      .then((data) => {
        setCluster(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [clusterId]);

  if (loading) return <Spinner size="xl" />;
  if (error || !cluster) {
    return <Title headingLevel="h1">{error ?? "Cluster not found"}</Title>;
  }

  const isOpenShift = cluster.platform === "openshift";
  const platformLabel = isOpenShift ? "OpenShift" : "Kubernetes";

  // Build plugin registry lookup for persona info
  const pluginPersonaMap: Record<string, "ops" | "dev"> = {};
  for (const entry of pluginEntries) {
    pluginPersonaMap[entry.key] = entry.persona;
  }

  const opsPlugins = cluster.plugins.filter(
    (p) => pluginPersonaMap[p] === "ops" || !pluginPersonaMap[p],
  );
  const devPlugins = cluster.plugins.filter(
    (p) => pluginPersonaMap[p] === "dev",
  );

  const statCards: Array<{
    label: string;
    value: string | number;
    icon: React.ReactNode;
  }> = [
    {
      label: "Status",
      value: cluster.status,
      icon: <CheckCircleIcon color="var(--pf-t--global--color--status--success--default)" />,
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
    <div className="cluster-detail">
      <Breadcrumb className="cluster-detail__breadcrumb">
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

      {/* Zone A — Identity banner */}
      <Card className="cluster-detail__banner">
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
                className="cluster-detail__banner-labels"
              >
                <Label
                  color={isOpenShift ? "red" : "blue"}
                  isCompact
                >
                  {platformLabel}
                </Label>
                <Label color="green" icon={<CheckCircleIcon />} isCompact>
                  {cluster.status}
                </Label>
              </Flex>
            </FlexItem>
          </Flex>
        </CardBody>
      </Card>

      {/* Zone B — Stat cards */}
      <Grid hasGutter className="cluster-detail__stats">
        {statCards.map((stat) => (
          <GridItem md={3} sm={6} key={stat.label}>
            <Card isFullHeight className="cluster-detail__stat-card">
              <CardBody>
                <div className="cluster-detail__stat-icon">
                  <Icon size="lg">{stat.icon}</Icon>
                </div>
                <div className="cluster-detail__stat-value">{stat.value}</div>
                <div className="cluster-detail__stat-label">{stat.label}</div>
              </CardBody>
            </Card>
          </GridItem>
        ))}
      </Grid>

      {/* Zone C — Details + Plugins */}
      <Grid hasGutter>
        <GridItem md={8} sm={12}>
          <Card isFullHeight>
            <CardTitle>
              <Title headingLevel="h3" size="md">
                Cluster Details
              </Title>
            </CardTitle>
            <CardBody>
              <DescriptionList
                columnModifier={{ lg: "2Col" }}
                isHorizontal
              >
                <DescriptionListGroup>
                  <DescriptionListTerm>Cluster ID</DescriptionListTerm>
                  <DescriptionListDescription>
                    <code className="cluster-detail__code">{cluster.id}</code>
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
                      <code className="cluster-detail__code">
                        {cluster.server}
                      </code>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                )}
                <DescriptionListGroup>
                  <DescriptionListTerm>Created</DescriptionListTerm>
                  <DescriptionListDescription>
                    {new Date(cluster.created_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
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
                <div className="cluster-detail__plugin-group">
                  <div className="cluster-detail__plugin-group-label">
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
                <div className="cluster-detail__plugin-group">
                  <div className="cluster-detail__plugin-group-label">
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
