import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  Card,
  CardBody,
  CardTitle,
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
  Title,
} from "@patternfly/react-core";
import {
  CubeIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  SyncAltIcon,
  CpuIcon,
  MemoryIcon,
} from "@patternfly/react-icons";
import { formatAge } from "@fleetshift/common";
import { useApiBase, fetchJson } from "./api";
import { usePodStore } from "./podStore";
import type { Pod } from "./podStore";

function statusColor(
  status: string,
): "green" | "blue" | "orange" | "red" | "grey" {
  switch (status) {
    case "Running":
      return "green";
    case "Completed":
    case "Succeeded":
      return "blue";
    case "Pending":
    case "ContainerCreating":
      return "orange";
    case "CrashLoopBackOff":
    case "ImagePullBackOff":
    case "ErrImagePull":
    case "Error":
    case "Failed":
      return "red";
    default:
      return "grey";
  }
}

function statusIcon(status: string) {
  switch (statusColor(status)) {
    case "green":
    case "blue":
      return (
        <CheckCircleIcon color="var(--pf-t--global--color--status--success--default)" />
      );
    case "red":
      return (
        <ExclamationCircleIcon color="var(--pf-t--global--color--status--danger--default)" />
      );
    default:
      return (
        <SyncAltIcon color="var(--pf-t--global--color--status--warning--default)" />
      );
  }
}

const PodDetailPage: React.FC<{ clusterIds: string[] }> = () => {
  const { podId } = useParams<{ podId: string }>();
  const navigate = useNavigate();
  const apiBase = useApiBase();
  const { pods, loading: storeLoading } = usePodStore();
  const [fetchedPod, setFetchedPod] = useState<Pod | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);

  // Try to find pod in store first
  const storePod = pods.find((p) => p.id === podId);
  const pod = storePod ?? fetchedPod;

  // Fallback: fetch from API if not in store after store finishes loading
  useEffect(() => {
    if (storePod || storeLoading || !podId || fetching || fetchedPod) return;

    setFetching(true);
    // We don't know which cluster has this pod, so try to find it
    // The pod ID should be in the store if the user navigated from PodList
    // For direct navigation, we'd need a dedicated endpoint
    // For now, search across cluster pod lists
    const clusterIds = pods
      .map((p) => p.cluster_id)
      .filter((v, i, a) => a.indexOf(v) === i);

    if (clusterIds.length === 0) {
      setFetchError("Pod not found");
      setFetching(false);
      return;
    }

    Promise.all(
      clusterIds.map((cid) =>
        fetchJson<Pod[]>(`${apiBase}/clusters/${cid}/pods`).catch(
          () => [] as Pod[],
        ),
      ),
    )
      .then((results) => {
        const allPods = results.flat();
        const found = allPods.find((p) => p.id === podId);
        if (found) {
          setFetchedPod(found);
        } else {
          setFetchError("Pod not found");
        }
      })
      .finally(() => setFetching(false));
  }, [storePod, storeLoading, podId, apiBase, pods, fetching, fetchedPod]);

  const loading = storeLoading || fetching;

  if (loading && !pod) {
    return <Spinner size="xl" />;
  }

  if (fetchError || !pod) {
    return <Title headingLevel="h1">{fetchError ?? "Pod not found"}</Title>;
  }

  const statCards = [
    {
      label: "Status",
      value: pod.status,
      icon: statusIcon(pod.status),
    },
    {
      label: "Restarts",
      value: pod.restarts,
      icon: <SyncAltIcon />,
    },
    {
      label: "CPU",
      value:
        pod.cpu_usage > 0 ? `${Math.round(pod.cpu_usage * 1000)}m` : "\u2014",
      icon: <CpuIcon />,
    },
    {
      label: "Memory",
      value:
        pod.memory_usage > 0 ? `${Math.round(pod.memory_usage)}Mi` : "\u2014",
      icon: <MemoryIcon />,
    },
  ];

  return (
    <div>
      <Breadcrumb style={{ marginBottom: "var(--pf-t--global--spacer--md)" }}>
        <BreadcrumbItem
          to="/pods"
          onClick={(e) => {
            e.preventDefault();
            navigate("/pods");
          }}
        >
          Pods
        </BreadcrumbItem>
        <BreadcrumbItem isActive>{pod.name}</BreadcrumbItem>
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
                <CubeIcon color="var(--pf-t--global--color--brand--default)" />
              </Icon>
            </FlexItem>
            <FlexItem>
              <Title headingLevel="h1" size="2xl">
                {pod.name}
              </Title>
              <Flex
                gap={{ default: "gapSm" }}
                style={{ marginTop: "var(--pf-t--global--spacer--xs)" }}
              >
                <Label color={statusColor(pod.status)} isCompact>
                  {pod.status}
                </Label>
                <Label color="blue" isCompact>
                  {pod.namespace}
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

      {/* Details */}
      <Card>
        <CardTitle>
          <Title headingLevel="h3" size="md">
            Pod Details
          </Title>
        </CardTitle>
        <CardBody>
          <DescriptionList columnModifier={{ lg: "2Col" }} isHorizontal>
            <DescriptionListGroup>
              <DescriptionListTerm>Pod ID</DescriptionListTerm>
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
                  {pod.id}
                </code>
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Cluster</DescriptionListTerm>
              <DescriptionListDescription>
                {pod.cluster_id}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Namespace</DescriptionListTerm>
              <DescriptionListDescription>
                {pod.namespace}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Status</DescriptionListTerm>
              <DescriptionListDescription>
                <Label color={statusColor(pod.status)} isCompact>
                  {pod.status}
                </Label>
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Restarts</DescriptionListTerm>
              <DescriptionListDescription>
                {pod.restarts}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>CPU Usage</DescriptionListTerm>
              <DescriptionListDescription>
                <span
                  style={{
                    fontFamily: "var(--pf-t--global--font--family--mono)",
                    fontSize: "var(--pf-t--global--font--size--sm)",
                  }}
                >
                  {pod.cpu_usage > 0
                    ? `${Math.round(pod.cpu_usage * 1000)}m`
                    : "\u2014"}
                </span>
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Memory Usage</DescriptionListTerm>
              <DescriptionListDescription>
                <span
                  style={{
                    fontFamily: "var(--pf-t--global--font--family--mono)",
                    fontSize: "var(--pf-t--global--font--size--sm)",
                  }}
                >
                  {pod.memory_usage > 0
                    ? `${Math.round(pod.memory_usage)}Mi`
                    : "\u2014"}
                </span>
              </DescriptionListDescription>
            </DescriptionListGroup>
            {pod.created_at && (
              <DescriptionListGroup>
                <DescriptionListTerm>Age</DescriptionListTerm>
                <DescriptionListDescription>
                  {formatAge(pod.created_at)}
                </DescriptionListDescription>
              </DescriptionListGroup>
            )}
          </DescriptionList>
        </CardBody>
      </Card>
    </div>
  );
};

export default PodDetailPage;
