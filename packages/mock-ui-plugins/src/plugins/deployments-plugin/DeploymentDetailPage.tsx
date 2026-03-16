import { useEffect, useState, useMemo, createElement } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  Card,
  CardBody,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  Icon,
  Label,
  Spinner,
  Tab,
  TabTitleText,
  Tabs,
  Title,
} from "@patternfly/react-core";
import {
  BundleIcon,
  CheckCircleIcon,
  CubesIcon,
  ExclamationTriangleIcon,
  InProgressIcon,
  OutlinedImageIcon,
} from "@patternfly/react-icons";
import { useResolvedExtensions } from "@openshift/dynamic-plugin-sdk";
import type { Extension, CodeRef } from "@openshift/dynamic-plugin-sdk";
import type { ComponentType } from "react";
import { useScalprum } from "@scalprum/react-core";
import { useDeploymentStore } from "./deploymentStore";
import type { Deployment } from "./deploymentStore";
import { useApiBase } from "./api";

// --- Local duplicates of extension types (plugins can't import from GUI) ---

interface DeploymentTabProps {
  deploymentId: string;
  deploymentName: string;
  namespace: string;
  clusterId: string;
}

type DeploymentDetailTabExtension = Extension<
  "fleetshift.deployment-detail-tab" & string,
  {
    label: string;
    priority: number;
    component: CodeRef<ComponentType<DeploymentTabProps>>;
    isApplicable?: CodeRef<(props: DeploymentTabProps) => boolean>;
  }
>;

function isDeploymentDetailTab(
  e: Extension,
): e is DeploymentDetailTabExtension {
  return e.type === "fleetshift.deployment-detail-tab";
}

function pluginKeyFromName(pluginName: string): string {
  return pluginName.replace(/-plugin(-ext)?$/, "");
}

interface FleetShiftApi {
  fleetshift: {
    apiBase: string;
    getClusterIdsForPlugin: (key: string) => string[];
  };
}

// Resolved extension shape — after useResolvedExtensions, CodeRef<T> becomes T
interface ResolvedTab {
  uid: string;
  pluginName: string;
  properties: {
    label: string;
    priority: number;
    component: ComponentType<DeploymentTabProps>;
    isApplicable?: (props: DeploymentTabProps) => boolean;
  };
}

const DetailsTab: React.FC<{
  deploy: Deployment;
  readyColor: "green" | "orange";
}> = ({ deploy, readyColor }) => (
  <div style={{ paddingTop: "var(--pf-t--global--spacer--md)" }}>
    <DescriptionList columnModifier={{ lg: "2Col" }} isHorizontal>
      <DescriptionListGroup>
        <DescriptionListTerm>Deployment ID</DescriptionListTerm>
        <DescriptionListDescription>
          <code
            style={{
              fontFamily: "var(--pf-t--global--font--family--mono)",
              fontSize: "var(--pf-t--global--font--size--sm)",
              background:
                "var(--pf-t--global--background--color--secondary--default)",
              padding: "2px 6px",
              borderRadius: "var(--pf-t--global--border--radius--small)",
            }}
          >
            {deploy.id}
          </code>
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Cluster</DescriptionListTerm>
        <DescriptionListDescription>
          {deploy.cluster_id}
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Namespace</DescriptionListTerm>
        <DescriptionListDescription>
          {deploy.namespace}
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Replicas</DescriptionListTerm>
        <DescriptionListDescription>
          {deploy.replicas}
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Ready</DescriptionListTerm>
        <DescriptionListDescription>
          <Label color={readyColor} isCompact>
            {deploy.ready}/{deploy.replicas}
          </Label>
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Available</DescriptionListTerm>
        <DescriptionListDescription>
          {deploy.available}
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Strategy</DescriptionListTerm>
        <DescriptionListDescription>
          <Label color="blue" isCompact>
            {deploy.strategy}
          </Label>
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Image</DescriptionListTerm>
        <DescriptionListDescription>
          <code
            style={{
              fontFamily: "var(--pf-t--global--font--family--mono)",
              fontSize: "var(--pf-t--global--font--size--sm)",
              background:
                "var(--pf-t--global--background--color--secondary--default)",
              padding: "2px 6px",
              borderRadius: "var(--pf-t--global--border--radius--small)",
            }}
          >
            {deploy.image || "\u2014"}
          </code>
        </DescriptionListDescription>
      </DescriptionListGroup>
    </DescriptionList>
  </div>
);

const DeploymentDetailPage: React.FC<{ clusterIds: string[] }> = () => {
  const { deployId } = useParams<{ deployId: string }>();
  const navigate = useNavigate();
  const apiBase = useApiBase();
  const { api } = useScalprum<{ api: FleetShiftApi }>();
  const { deployments, loading: storeLoading } = useDeploymentStore();
  const [fetchedDeploy, setFetchedDeploy] = useState<Deployment | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState(0);

  // Resolve dynamic tab extensions
  const [tabExtensions, tabsResolved] = useResolvedExtensions(
    isDeploymentDetailTab,
  );

  // Try to find deployment in store first — match by id, then fallback to name
  const storeDeploy =
    deployments.find((d) => d.id === deployId) ??
    deployments.find((d) => d.name === deployId);
  const deploy = storeDeploy ?? fetchedDeploy;

  // Fallback: fetch from API if not in store
  useEffect(() => {
    if (storeDeploy || storeLoading || !deployId || fetching || fetchedDeploy)
      return;

    setFetching(true);
    const clusterIds = deployments
      .map((d) => d.cluster_id)
      .filter((v, i, a) => a.indexOf(v) === i);

    if (clusterIds.length === 0) {
      const allClusterIds =
        api.fleetshift.getClusterIdsForPlugin("deployments");
      Promise.all(
        allClusterIds.map((cid) =>
          fetch(`${apiBase}/clusters/${cid}/deployments/${deployId}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ),
      )
        .then((results) => {
          const found = results.find((r) => r !== null) as Deployment | null;
          if (found) {
            setFetchedDeploy({
              ...found,
              namespace:
                found.namespace ??
                extractNamespace(found.namespace_id, found.cluster_id),
            });
          } else {
            setFetchError("Deployment not found");
          }
        })
        .finally(() => setFetching(false));
      return;
    }

    Promise.all(
      clusterIds.map((cid) =>
        fetch(`${apiBase}/clusters/${cid}/deployments/${deployId}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ),
    )
      .then((results) => {
        const found = results.find((r) => r !== null) as Deployment | null;
        if (found) {
          setFetchedDeploy({
            ...found,
            namespace:
              found.namespace ??
              extractNamespace(found.namespace_id, found.cluster_id),
          });
        } else {
          setFetchError("Deployment not found");
        }
      })
      .finally(() => setFetching(false));
  }, [
    storeDeploy,
    storeLoading,
    deployId,
    apiBase,
    deployments,
    fetching,
    fetchedDeploy,
    api,
  ]);

  // Filter tab extensions: only show tabs from plugins enabled on this deployment's cluster
  const filteredTabs = useMemo((): ResolvedTab[] => {
    if (!deploy || !tabsResolved) return [];
    return (tabExtensions as unknown as ResolvedTab[])
      .filter((ext) => {
        const pluginKey = pluginKeyFromName(ext.pluginName);
        const pluginClusterIds =
          api.fleetshift.getClusterIdsForPlugin(pluginKey);
        if (!pluginClusterIds.includes(deploy.cluster_id)) return false;
        if (ext.properties.isApplicable) {
          return ext.properties.isApplicable({
            deploymentId: deploy.id,
            deploymentName: deploy.name,
            namespace: deploy.namespace,
            clusterId: deploy.cluster_id,
          });
        }
        return true;
      })
      .sort(
        (a, b) =>
          (a.properties.priority ?? 999) - (b.properties.priority ?? 999),
      );
  }, [deploy, tabExtensions, tabsResolved, api]);

  const loading = storeLoading || fetching;

  if (loading && !deploy) {
    return <Spinner size="xl" />;
  }

  if (fetchError || !deploy) {
    return (
      <Title headingLevel="h1">{fetchError ?? "Deployment not found"}</Title>
    );
  }

  const allReady = deploy.ready === deploy.replicas && deploy.replicas > 0;
  const readyColor = allReady ? "green" : "orange";
  const readyIcon = allReady ? (
    <CheckCircleIcon color="var(--pf-t--global--color--status--success--default)" />
  ) : (
    <ExclamationTriangleIcon color="var(--pf-t--global--color--status--warning--default)" />
  );

  const statCards = [
    {
      label: "Ready",
      value: `${deploy.ready}/${deploy.replicas}`,
      icon: readyIcon,
    },
    {
      label: "Available",
      value: deploy.available,
      icon: (
        <InProgressIcon
          color={
            deploy.available === deploy.replicas
              ? "var(--pf-t--global--color--status--success--default)"
              : "var(--pf-t--global--color--status--warning--default)"
          }
        />
      ),
    },
    {
      label: "Strategy",
      value: deploy.strategy,
      icon: <CubesIcon />,
    },
    {
      label: "Image",
      value: deploy.image
        ? (deploy.image.split("/").pop()?.split(":")[0] ?? deploy.image)
        : "\u2014",
      icon: <OutlinedImageIcon />,
    },
  ];

  // Build tabs array — avoids TabsChild type issue with inline .map()
  const allTabs = [
    <Tab
      key="details"
      eventKey={0}
      title={<TabTitleText>Details</TabTitleText>}
    >
      <DetailsTab deploy={deploy} readyColor={readyColor} />
    </Tab>,
    ...filteredTabs.map((ext, idx) => (
      <Tab
        key={ext.uid}
        eventKey={idx + 1}
        title={<TabTitleText>{ext.properties.label}</TabTitleText>}
      >
        <div style={{ paddingTop: "var(--pf-t--global--spacer--md)" }}>
          {createElement(ext.properties.component, {
            deploymentId: deploy.id,
            deploymentName: deploy.name,
            namespace: deploy.namespace,
            clusterId: deploy.cluster_id,
          })}
        </div>
      </Tab>
    )),
  ];

  return (
    <div>
      <Breadcrumb style={{ marginBottom: "var(--pf-t--global--spacer--md)" }}>
        <BreadcrumbItem
          to="/deployments"
          onClick={(e) => {
            e.preventDefault();
            navigate("/deployments");
          }}
        >
          Deployments
        </BreadcrumbItem>
        <BreadcrumbItem isActive>{deploy.name}</BreadcrumbItem>
      </Breadcrumb>

      {/* Identity banner */}
      <Card style={{ marginBottom: "var(--pf-t--global--spacer--lg)" }}>
        <CardBody>
          <Flex
            alignItems={{ default: "alignItemsCenter" }}
            gap={{ default: "gapMd" }}
          >
            <FlexItem>
              <Icon size="xl">
                <BundleIcon color="var(--pf-t--global--color--brand--default)" />
              </Icon>
            </FlexItem>
            <FlexItem>
              <Title headingLevel="h1" size="2xl">
                {deploy.name}
              </Title>
              <Flex
                gap={{ default: "gapSm" }}
                style={{ marginTop: "var(--pf-t--global--spacer--xs)" }}
              >
                <Label color={readyColor} isCompact>
                  {allReady ? "Ready" : "Updating"}
                </Label>
                <Label color="blue" isCompact>
                  {deploy.namespace}
                </Label>
                <Label
                  color="grey"
                  isCompact
                  style={{
                    fontFamily: "var(--pf-t--global--font--family--mono)",
                    fontSize: "var(--pf-t--global--font--size--xs)",
                  }}
                >
                  {deploy.cluster_id}
                </Label>
              </Flex>
            </FlexItem>
          </Flex>
        </CardBody>
      </Card>

      {/* Stat cards */}
      <Grid
        hasGutter
        style={{ marginBottom: "var(--pf-t--global--spacer--lg)" }}
      >
        {statCards.map((stat) => (
          <GridItem md={3} sm={6} key={stat.label}>
            <Card isFullHeight>
              <CardBody
                style={{
                  textAlign: "center",
                  padding:
                    "var(--pf-t--global--spacer--lg) var(--pf-t--global--spacer--md)",
                }}
              >
                <div
                  style={{
                    marginBottom: "var(--pf-t--global--spacer--sm)",
                    color: "var(--pf-t--global--text--color--subtle)",
                  }}
                >
                  <Icon size="lg">{stat.icon}</Icon>
                </div>
                <div
                  style={{
                    fontSize: "var(--pf-t--global--font--size--2xl)",
                    fontWeight:
                      "var(--pf-t--global--font--weight--heading--default)",
                    lineHeight: 1.2,
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: "var(--pf-t--global--font--size--sm)",
                    color: "var(--pf-t--global--text--color--subtle)",
                    marginTop: "var(--pf-t--global--spacer--xs)",
                  }}
                >
                  {stat.label}
                </div>
              </CardBody>
            </Card>
          </GridItem>
        ))}
      </Grid>

      {/* Tabs: Details (built-in) + dynamic tabs from extensions */}
      <Card>
        <CardBody>
          <Tabs
            activeKey={activeTabKey}
            onSelect={(_e, key) => setActiveTabKey(key as number)}
          >
            {allTabs}
          </Tabs>
        </CardBody>
      </Card>
    </div>
  );
};

function extractNamespace(namespaceId: string, clusterId: string): string {
  return namespaceId.startsWith(clusterId + "-")
    ? namespaceId.slice(clusterId.length + 1)
    : namespaceId;
}

export default DeploymentDetailPage;
