import {
  Card,
  CardBody,
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
  RedhatIcon,
  ServerIcon,
} from "@patternfly/react-icons";
import { useNavigate } from "react-router-dom";
import { useClusters } from "../../contexts/ClusterContext";
import "./ClusterListPage.scss";

export const ClusterListPage = () => {
  const { installed, loading } = useClusters();
  const navigate = useNavigate();

  if (loading) return <Spinner size="xl" />;

  return (
    <div className="cluster-list">
      <Flex
        alignItems={{ default: "alignItemsBaseline" }}
        gap={{ default: "gapSm" }}
        className="cluster-list__header"
      >
        <FlexItem>
          <Title headingLevel="h1">Clusters</Title>
        </FlexItem>
        <FlexItem>
          <span className="cluster-list__count">
            {installed.length} connected
          </span>
        </FlexItem>
      </Flex>

      <Grid hasGutter>
        {installed.map((cluster) => {
          const isOpenShift = cluster.platform === "openshift";
          const platformLabel = isOpenShift ? "OpenShift" : "Kubernetes";
          return (
            <GridItem md={6} key={cluster.id}>
              <Card
                isClickable
                isSelectable
                onClick={() => navigate(`/clusters/${cluster.id}`)}
                className="cluster-card"
              >
                <CardBody>
                  <Flex
                    alignItems={{ default: "alignItemsFlexStart" }}
                    gap={{ default: "gapMd" }}
                  >
                    <FlexItem>
                      <div className="cluster-card__icon-wrapper">
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
                          <div className="cluster-card__name">
                            {cluster.name}
                          </div>
                          <div className="cluster-card__subtitle">
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

                      <div className="cluster-card__stats">
                        <div className="cluster-card__stat">
                          <Icon size="sm" className="cluster-card__stat-icon">
                            <ServerIcon />
                          </Icon>
                          <span className="cluster-card__stat-value">
                            {cluster.nodeCount ?? "—"}
                          </span>
                          <span className="cluster-card__stat-label">Nodes</span>
                        </div>
                        <div className="cluster-card__stat">
                          <span className="cluster-card__stat-value">
                            {cluster.plugins.length}
                          </span>
                          <span className="cluster-card__stat-label">
                            Plugins
                          </span>
                        </div>
                      </div>

                      <LabelGroup className="cluster-card__plugins">
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
