import { useParams, Link } from "react-router-dom";
import {
  Title,
  Spinner,
  Button,
  Label,
  Checkbox,
  Card,
  CardTitle,
  CardBody,
  Flex,
  FlexItem,
} from "@patternfly/react-core";
import { useClusters } from "../contexts/ClusterContext";

export const ClusterDetailPage = () => {
  const { clusterId } = useParams<{ clusterId: string }>();
  const { installed, loading, togglePlugin, uninstall } = useClusters();
  const cluster = installed.find((c) => c.id === clusterId);

  if (loading) return <Spinner size="xl" />;
  if (!cluster) return <div>Cluster not found or not installed.</div>;

  const hasCore = cluster.plugins.includes("core");
  const hasObservability = cluster.plugins.includes("observability");

  return (
    <>
      <Flex>
        <FlexItem>
          <Title headingLevel="h1">{cluster.name}</Title>
        </FlexItem>
        <FlexItem align={{ default: "alignRight" }}>
          <Button
            variant="danger"
            onClick={async () => {
              await uninstall(cluster.id);
            }}
            component={(props) => <Link to="/clusters" {...props} />}
          >
            Uninstall
          </Button>
        </FlexItem>
      </Flex>

      <Card style={{ marginTop: 16 }}>
        <CardTitle>Plugins</CardTitle>
        <CardBody>
          <Checkbox
            id="plugin-core"
            label="Core"
            isChecked={hasCore}
            onChange={() => togglePlugin(cluster.id, "core")}
          />
          <Checkbox
            id="plugin-observability"
            label="Observability"
            isChecked={hasObservability}
            onChange={() => togglePlugin(cluster.id, "observability")}
          />
        </CardBody>
      </Card>

      <Flex style={{ marginTop: 16 }} spaceItems={{ default: "spaceItemsMd" }}>
        <FlexItem>
          <Label>Version: {cluster.version}</Label>
        </FlexItem>
        <FlexItem>
          <Label color="green">{cluster.status}</Label>
        </FlexItem>
      </Flex>
    </>
  );
};
