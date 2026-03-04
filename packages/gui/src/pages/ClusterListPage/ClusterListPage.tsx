import {
  Grid,
  GridItem,
  Card,
  CardTitle,
  CardBody,
  CardFooter,
  Button,
  Label,
  Title,
  Spinner,
} from "@patternfly/react-core";
import { useClusters } from "../../contexts/ClusterContext";
import { useDrawer } from "../../contexts/DrawerContext";
import { ClusterManagerDrawerContent } from "./ClusterManagerDrawerContent";
import "./ClusterListPage.scss";

export const ClusterListPage = () => {
  const { available, installed, loading, install, uninstall } = useClusters();
  const { openDrawer } = useDrawer();

  if (loading) return <Spinner size="xl" />;

  const installedIds = new Set(installed.map((c) => c.id));

  return (
    <>
      <Title headingLevel="h1" className="cluster-list__title">
        Available Clusters
      </Title>
      <Grid hasGutter>
        {available.map((cluster) => {
          const isInstalled = installedIds.has(cluster.id);
          return (
            <GridItem md={4} key={cluster.id}>
              <Card>
                <CardTitle>
                  {cluster.name}{" "}
                  {isInstalled && <Label color="green">Installed</Label>}
                </CardTitle>
                <CardBody>
                  <div>Version: {cluster.version}</div>
                  <div>ID: {cluster.id}</div>
                </CardBody>
                <CardFooter>
                  {isInstalled ? (
                    <>
                      <Button
                        variant="primary"
                        style={{ marginRight: 8 }}
                        onClick={() =>
                          openDrawer(<ClusterManagerDrawerContent />)
                        }
                      >
                        Manage
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => uninstall(cluster.id)}
                      >
                        Uninstall
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={() => install(cluster.id)}
                    >
                      Install
                    </Button>
                  )}
                </CardFooter>
              </Card>
            </GridItem>
          );
        })}
      </Grid>
    </>
  );
};
