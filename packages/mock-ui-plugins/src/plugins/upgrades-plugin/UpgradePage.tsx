import { useEffect, useState } from "react";
import {
  Card,
  CardTitle,
  CardBody,
  Label,
  Spinner,
  Grid,
  GridItem,
  List,
  ListItem,
} from "@patternfly/react-core";
import { makeRequest } from "@fleetshift/common";
import { useApiBase } from "./api";

interface UpgradeInfo {
  clusterId: string;
  currentVersion: string;
  latestVersion: string;
  upToDate: boolean;
  availableUpdates: string[];
}

interface UpgradePageProps {
  clusterIds: string[];
}

const UpgradePage = ({ clusterIds }: UpgradePageProps) => {
  const apiBase = useApiBase();
  const [upgrades, setUpgrades] = useState<UpgradeInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all(
      clusterIds.map((id) =>
        makeRequest<UpgradeInfo>(`${apiBase}/clusters/${id}/upgrades`),
      ),
    ).then((results) => {
      setUpgrades(results);
      setLoading(false);
    });
  }, [apiBase, clusterIds]);

  if (loading) return <Spinner size="lg" />;

  return (
    <Grid hasGutter>
      {upgrades.map((info) => (
        <GridItem key={info.clusterId}>
          <Card>
            <CardTitle>
              Cluster: {info.clusterId}{" "}
              <Label color={info.upToDate ? "green" : "orange"}>
                {info.upToDate ? "Up to date" : "Update available"}
              </Label>
            </CardTitle>
            <CardBody>
              <p>
                <strong>Current Version:</strong> {info.currentVersion}
              </p>
              <p>
                <strong>Latest Version:</strong> {info.latestVersion}
              </p>
              {info.availableUpdates.length > 0 && (
                <>
                  <p>
                    <strong>Available Updates:</strong>
                  </p>
                  <List>
                    {info.availableUpdates.map((version) => (
                      <ListItem key={version}>{version}</ListItem>
                    ))}
                  </List>
                </>
              )}
            </CardBody>
          </Card>
        </GridItem>
      ))}
    </Grid>
  );
};

export default UpgradePage;
