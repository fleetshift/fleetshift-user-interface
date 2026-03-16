import { useEffect, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
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
  CubesIcon,
  PlusCircleIcon,
  RedhatIcon,
  ServerIcon,
} from "@patternfly/react-icons";
import { useNavigate, Link } from "react-router-dom";
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
}

const ClusterListPage: React.FC<{ clusterIds: string[] }> = () => {
  const apiBase = useApiBase();
  const navigate = useNavigate();
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson<Cluster[]>(`${apiBase}/clusters`)
      .then(setClusters)
      .finally(() => setLoading(false));
  }, [apiBase]);

  if (loading) return <Spinner size="xl" />;

  if (clusters.length === 0) {
    return (
      <EmptyState
        icon={PlusCircleIcon}
        titleText="No clusters connected"
        headingLevel="h1"
      >
        <EmptyStateBody>
          Connect a Kubernetes or OpenShift cluster to get started.
        </EmptyStateBody>
        <EmptyStateFooter>
          <Button
            variant="primary"
            component={(props) => <Link to="/clusters/add" {...props} />}
          >
            Add Cluster
          </Button>
        </EmptyStateFooter>
      </EmptyState>
    );
  }

  return (
    <div>
      <Flex
        alignItems={{ default: "alignItemsBaseline" }}
        gap={{ default: "gapSm" }}
        style={{ marginBottom: "var(--pf-t--global--spacer--lg)" }}
      >
        <FlexItem>
          <Title headingLevel="h1">Clusters</Title>
        </FlexItem>
        <FlexItem>
          <span
            style={{
              fontSize: "var(--pf-t--global--font--size--sm)",
              color: "var(--pf-t--global--text--color--subtle)",
            }}
          >
            {clusters.length} connected
          </span>
        </FlexItem>
        <FlexItem align={{ default: "alignRight" }}>
          <Button
            variant="primary"
            component={(props) => <Link to="/clusters/add" {...props} />}
          >
            Add Cluster
          </Button>
        </FlexItem>
      </Flex>

      <Grid hasGutter>
        {clusters.map((cluster) => {
          const isOpenShift = cluster.platform === "openshift";
          const platformLabel = isOpenShift ? "OpenShift" : "Kubernetes";
          return (
            <GridItem md={6} key={cluster.id}>
              <Card
                isClickable
                isSelectable
                onClick={() => navigate(`/clusters/${cluster.id}`)}
                style={{ cursor: "pointer" }}
              >
                <CardBody>
                  <Flex
                    alignItems={{ default: "alignItemsFlexStart" }}
                    gap={{ default: "gapMd" }}
                  >
                    <FlexItem>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 48,
                          height: 48,
                          borderRadius:
                            "var(--pf-t--global--border--radius--small)",
                          background:
                            "var(--pf-t--global--background--color--secondary--default)",
                          flexShrink: 0,
                        }}
                      >
                        <Icon size="xl">
                          {isOpenShift ? (
                            <RedhatIcon color="var(--pf-t--global--color--status--danger--default)" />
                          ) : (
                            <CubesIcon color="var(--pf-t--global--color--brand--default)" />
                          )}
                        </Icon>
                      </div>
                    </FlexItem>
                    <FlexItem flex={{ default: "flex_1" }}>
                      <Flex
                        justifyContent={{
                          default: "justifyContentSpaceBetween",
                        }}
                        alignItems={{ default: "alignItemsFlexStart" }}
                      >
                        <FlexItem>
                          <div
                            style={{
                              fontSize: "var(--pf-t--global--font--size--lg)",
                              fontWeight:
                                "var(--pf-t--global--font--weight--heading--default)",
                              lineHeight: 1.3,
                            }}
                          >
                            {cluster.name}
                          </div>
                          <div
                            style={{
                              fontSize: "var(--pf-t--global--font--size--sm)",
                              color: "var(--pf-t--global--text--color--subtle)",
                              marginTop: 2,
                            }}
                          >
                            {platformLabel} {cluster.version}
                          </div>
                        </FlexItem>
                        <FlexItem>
                          <Label
                            color="green"
                            icon={<CheckCircleIcon />}
                            isCompact
                          >
                            {cluster.status}
                          </Label>
                        </FlexItem>
                      </Flex>

                      <div
                        style={{
                          display: "flex",
                          gap: "var(--pf-t--global--spacer--lg)",
                          marginTop: "var(--pf-t--global--spacer--md)",
                          paddingTop: "var(--pf-t--global--spacer--md)",
                          borderTop:
                            "var(--pf-t--global--border--width--regular) solid var(--pf-t--global--border--color--default)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "var(--pf-t--global--spacer--xs)",
                          }}
                        >
                          <Icon size="sm">
                            <ServerIcon color="var(--pf-t--global--text--color--subtle)" />
                          </Icon>
                          <span
                            style={{
                              fontWeight:
                                "var(--pf-t--global--font--weight--heading--default)",
                            }}
                          >
                            {cluster.nodeCount ?? "—"}
                          </span>
                          <span
                            style={{
                              fontSize: "var(--pf-t--global--font--size--sm)",
                              color: "var(--pf-t--global--text--color--subtle)",
                            }}
                          >
                            Nodes
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "var(--pf-t--global--spacer--xs)",
                          }}
                        >
                          <span
                            style={{
                              fontWeight:
                                "var(--pf-t--global--font--weight--heading--default)",
                            }}
                          >
                            {cluster.plugins.length}
                          </span>
                          <span
                            style={{
                              fontSize: "var(--pf-t--global--font--size--sm)",
                              color: "var(--pf-t--global--text--color--subtle)",
                            }}
                          >
                            Plugins
                          </span>
                        </div>
                      </div>

                      <LabelGroup
                        style={{ marginTop: "var(--pf-t--global--spacer--md)" }}
                      >
                        {cluster.plugins.slice(0, 5).map((plugin) => (
                          <Label key={plugin} color="blue" isCompact>
                            {plugin}
                          </Label>
                        ))}
                        {cluster.plugins.length > 5 && (
                          <Label color="grey" isCompact>
                            +{cluster.plugins.length - 5} more
                          </Label>
                        )}
                      </LabelGroup>
                    </FlexItem>
                  </Flex>
                </CardBody>
              </Card>
            </GridItem>
          );
        })}
      </Grid>
    </div>
  );
};

export default ClusterListPage;
