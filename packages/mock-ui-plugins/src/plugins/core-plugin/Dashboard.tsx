import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  Button,
  Spinner,
  Title,
} from "@patternfly/react-core";
import { useResolvedExtensions } from "@openshift/dynamic-plugin-sdk";
import type { Extension, CodeRef } from "@openshift/dynamic-plugin-sdk";
import type { ComponentType } from "react";
import { useApiBase, fetchJson } from "./api";
import { useScalprum } from "@scalprum/react-core";

type DashboardWidgetExtension = Extension<
  "fleetshift.dashboard-widget",
  { component: CodeRef<ComponentType<{ clusterIds: string[] }>> }
>;

function isDashboardWidget(e: Extension): e is DashboardWidgetExtension {
  return e.type === "fleetshift.dashboard-widget";
}

function pluginKeyFromName(pluginName: string): string {
  return pluginName.replace(/-plugin$/, "");
}

interface FleetShiftApi {
  fleetshift: {
    getClusterIdsForPlugin: (key: string) => string[];
  };
}

interface ClusterSummary {
  id: string;
}

const Dashboard: React.FC<{ clusterIds: string[] }> = () => {
  const apiBase = useApiBase();
  const { api } = useScalprum<{ api: FleetShiftApi }>();
  const [clusters, setClusters] = useState<ClusterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [widgets, widgetsResolved] = useResolvedExtensions(isDashboardWidget);

  useEffect(() => {
    fetchJson<ClusterSummary[]>(`${apiBase}/clusters`)
      .then(setClusters)
      .finally(() => setLoading(false));
  }, [apiBase]);

  if (loading) return <Spinner size="xl" />;

  if (clusters.length === 0) {
    return (
      <EmptyState titleText="No clusters connected" headingLevel="h1">
        <EmptyStateBody>
          Connect a cluster to get started. Each cluster brings its own plugins
          for managing workloads, monitoring, and more.
        </EmptyStateBody>
        <EmptyStateFooter>
          <Button component={(props) => <Link to="/clusters/add" {...props} />}>
            Add Cluster
          </Button>
        </EmptyStateFooter>
      </EmptyState>
    );
  }

  return (
    <>
      <Title
        headingLevel="h1"
        style={{ marginBottom: "var(--pf-t--global--spacer--lg)" }}
      >
        Dashboard
      </Title>
      {widgetsResolved &&
        widgets.map((ext) => {
          const pluginKey = pluginKeyFromName(ext.pluginName);
          const clusterIds = api.fleetshift.getClusterIdsForPlugin(pluginKey);
          if (clusterIds.length === 0) return null;
          const Widget = ext.properties.component;
          return <Widget key={ext.uid} clusterIds={clusterIds} />;
        })}
    </>
  );
};

export default Dashboard;
