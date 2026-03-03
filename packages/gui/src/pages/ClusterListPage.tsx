import { Link } from "react-router-dom";
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
import { useClusters } from "../contexts/ClusterContext";

export const ClusterListPage = () => {
  const { available, installed, loading, install, uninstall } = useClusters();

  if (loading) return <Spinner size="xl" />;

  const installedIds = new Set(installed.map((c) => c.id));

  return (
    <>
      <Title headingLevel="h1" style={{ marginBottom: 16 }}>
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
                        component={(props) => (
                          <Link to={`/clusters/${cluster.id}`} {...props} />
                        )}
                        variant="primary"
                        style={{ marginRight: 8 }}
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
