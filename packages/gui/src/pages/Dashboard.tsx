import { Link } from "react-router-dom";
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  Button,
  Title,
} from "@patternfly/react-core";
import { useResolvedExtensions } from "@openshift/dynamic-plugin-sdk";
import { useClusters } from "../contexts/ClusterContext";
import { isDashboardWidget, pluginKeyFromName } from "../utils/extensions";
import { useScope } from "../contexts/ScopeContext";

export const Dashboard = () => {
  const { installed, loading } = useClusters();
  const { clusterIdsForPlugin } = useScope();
  const [widgets, widgetsResolved] = useResolvedExtensions(isDashboardWidget);

  if (loading) return null;

  if (installed.length === 0) {
    return (
      <EmptyState titleText="No clusters installed" headingLevel="h1">
        <EmptyStateBody>
          Install an OpenShift cluster to get started. Each cluster brings its
          own plugins for managing workloads, monitoring, and more.
        </EmptyStateBody>
        <EmptyStateFooter>
          <Button component={(props) => <Link to="/clusters" {...props} />}>
            Browse Clusters
          </Button>
        </EmptyStateFooter>
      </EmptyState>
    );
  }

  return (
    <>
      <Title headingLevel="h1" className="fs-page-header">
        Dashboard
      </Title>
      {widgetsResolved &&
        widgets.map((ext) => {
          const pluginKey = pluginKeyFromName(ext.pluginName);
          const clusterIds = clusterIdsForPlugin(pluginKey);
          if (clusterIds.length === 0) return null;
          const Widget = ext.properties.component;
          return <Widget key={ext.uid} clusterIds={clusterIds} />;
        })}
    </>
  );
};
