import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { navFactory } from "../../../common/DetailsPage/HorizontalNav";
import { DetailsPage } from "../../../common/DetailsPage/DetailsPage";
import {
  DeploymentModel,
  getReferenceForModel as referenceForModel,
} from "../../../common/utils";
import { DeploymentDetails, DeploymentKind } from "./DeploymenDetails";
import DeploymentPods from "./DeploymentPods";
import DeploymentMetrics from "./DeploymentMetrics";
import {
  ClusterScopeProvider,
  useClusterScope,
} from "../../../common/ClusterScopeContext";
import ClusterGate from "../../../common/ClusterGate";
import { transformDeployment } from "../../../common/transformers";

const kind = referenceForModel(DeploymentModel);

export const DeploymentsDetailsPage = ({
  deployment,
}: {
  deployment: DeploymentKind;
}) => {
  return (
    <DetailsPage
      kind={kind}
      obj={{ data: deployment, loaded: true, loadError: "" }}
      name={deployment.metadata?.name}
      namespace={deployment.metadata?.namespace}
      pages={[
        navFactory.details(DeploymentDetails),
        navFactory.metrics(DeploymentMetrics),
        navFactory.editYaml(),
        navFactory.pods(DeploymentPods),
      ]}
    />
  );
};

/** Inner component that fetches deployments once a cluster is selected. */
const DeploymentDetailsInner = () => {
  const { clusterId, apiBase } = useClusterScope();
  const [searchParams] = useSearchParams();
  const namespace = searchParams.get("namespace");
  const [deployments, setDeployments] = useState<DeploymentKind[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!clusterId) return;
    let cancelled = false;

    const doFetch = () => {
      const url = namespace
        ? `${apiBase}/clusters/${clusterId}/deployments?namespace=${namespace}`
        : `${apiBase}/clusters/${clusterId}/deployments`;
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
          return res.json();
        })
        .then((rows: never[]) => {
          if (cancelled) return;
          setDeployments(
            rows.map(transformDeployment as (r: never) => DeploymentKind),
          );
          setLoaded(true);
        })
        .catch(() => {
          if (!cancelled) setLoaded(true);
        });
    };

    doFetch();
    const interval = setInterval(doFetch, 10_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [apiBase, clusterId, namespace]);

  if (!loaded) return <div>Loading deployments...</div>;
  if (deployments.length === 0) return <div>No deployments found.</div>;

  return <DeploymentsDetailsPage deployment={deployments[0]} />;
};

/** Default export — entry point for the Scalprum-exposed module. */
const DeploymentDetailsPageWrapper = ({}: { clusterIds: string[] }) => (
  <ClusterScopeProvider>
    <ClusterGate>
      <DeploymentDetailsInner />
    </ClusterGate>
  </ClusterScopeProvider>
);

export default DeploymentDetailsPageWrapper;
