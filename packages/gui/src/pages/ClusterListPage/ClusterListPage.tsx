import {
  Grid,
  GridItem,
  Card,
  CardBody,
  Button,
  Label,
  Title,
  Spinner,
} from "@patternfly/react-core";
import { CheckCircleIcon } from "@patternfly/react-icons";
import { useClusters } from "../../contexts/ClusterContext";
import { useDrawer } from "../../contexts/DrawerContext";
import { ClusterManagerDrawerContent } from "./ClusterManagerDrawerContent";
import "./ClusterListPage.scss";

export const ClusterListPage = () => {
  const { available, installed, loading, install, uninstall } = useClusters();
  const { openDrawer } = useDrawer();

  if (loading) return <Spinner size="xl" />;

  const installedMap = new Map(installed.map((c) => [c.id, c]));

  return (
    <>
      <Title headingLevel="h1" className="cluster-list__title">
        Available Clusters
      </Title>
      <Grid hasGutter>
        {available.map((cluster) => {
          const inst = installedMap.get(cluster.id);
          const isInstalled = !!inst;
          return (
            <GridItem md={6} key={cluster.id}>
              <Card>
                <CardBody>
                  <div className="cluster-card__header">
                    <div>
                      <div className="cluster-card__name">{cluster.name}</div>
                      <div className="cluster-card__subtitle">
                        OpenShift Cluster
                      </div>
                    </div>
                    {isInstalled ? (
                      <Label color="green" icon={<CheckCircleIcon />} isCompact>
                        Installed
                      </Label>
                    ) : (
                      <Label color="grey" isCompact>
                        Available
                      </Label>
                    )}
                  </div>

                  <div className="cluster-card__meta">
                    <div>
                      <div className="cluster-card__meta-label">Version</div>
                      <div className="cluster-card__meta-value">
                        {cluster.version}
                      </div>
                    </div>
                    <div>
                      <div className="cluster-card__meta-label">Cluster ID</div>
                      <div className="cluster-card__meta-value">
                        {cluster.id}
                      </div>
                    </div>
                    {inst && (
                      <>
                        <div>
                          <div className="cluster-card__meta-label">Status</div>
                          <div className="cluster-card__meta-value">
                            {inst.status}
                          </div>
                        </div>
                        <div>
                          <div className="cluster-card__meta-label">
                            Plugins
                          </div>
                          <div className="cluster-card__meta-value">
                            {inst.plugins.length}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="cluster-card__actions">
                    {isInstalled ? (
                      <>
                        <Button
                          variant="link"
                          isInline
                          onClick={() =>
                            openDrawer(<ClusterManagerDrawerContent />)
                          }
                        >
                          Manage plugins
                        </Button>
                        <Button
                          variant="link"
                          isDanger
                          isInline
                          onClick={() => uninstall(cluster.id)}
                          style={{
                            marginLeft: "var(--pf-t--global--spacer--lg)",
                          }}
                        >
                          Uninstall
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="link"
                        isInline
                        onClick={() => install(cluster.id)}
                      >
                        Install cluster
                      </Button>
                    )}
                  </div>
                </CardBody>
              </Card>
            </GridItem>
          );
        })}
      </Grid>
    </>
  );
};
