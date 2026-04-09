import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
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
  LabelGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Spinner,
  Title,
} from "@patternfly/react-core";
import {
  CheckCircleIcon,
  ClockIcon,
  CubesIcon,
  ExclamationCircleIcon,
  InProgressIcon,
  ServerIcon,
  SyncAltIcon,
  TrashIcon,
} from "@patternfly/react-icons";
import { getDeployment, deleteDeployment, resumeDeployment } from "./api";
import type { MgmtDeployment, DeploymentState } from "./api";

const STATE_LABELS: Record<
  DeploymentState,
  { text: string; color: "blue" | "green" | "red" | "orange" | "grey" }
> = {
  STATE_UNSPECIFIED: { text: "Unknown", color: "grey" },
  STATE_CREATING: { text: "Creating", color: "blue" },
  STATE_ACTIVE: { text: "Active", color: "green" },
  STATE_DELETING: { text: "Deleting", color: "orange" },
  STATE_FAILED: { text: "Failed", color: "red" },
  STATE_PAUSED_AUTH: { text: "Paused (Auth)", color: "orange" },
};

const STATE_ICONS: Record<DeploymentState, React.ReactNode> = {
  STATE_UNSPECIFIED: <SyncAltIcon />,
  STATE_CREATING: (
    <InProgressIcon color="var(--pf-t--global--color--status--info--default)" />
  ),
  STATE_ACTIVE: (
    <CheckCircleIcon color="var(--pf-t--global--color--status--success--default)" />
  ),
  STATE_DELETING: (
    <SyncAltIcon color="var(--pf-t--global--color--status--warning--default)" />
  ),
  STATE_FAILED: (
    <ExclamationCircleIcon color="var(--pf-t--global--color--status--danger--default)" />
  ),
  STATE_PAUSED_AUTH: (
    <ExclamationCircleIcon color="var(--pf-t--global--color--status--warning--default)" />
  ),
};

function shortName(name: string): string {
  return name.replace(/^deployments\//, "");
}

function formatTime(ts: string): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function decodeManifest(raw: string): string {
  try {
    const decoded = atob(raw);
    return JSON.stringify(JSON.parse(decoded), null, 2);
  } catch {
    return raw;
  }
}

const DeploymentDetailPage: React.FC<{ clusterIds: string[] }> = () => {
  const { deploymentId } = useParams<{ deploymentId: string }>();
  const navigate = useNavigate();
  const [deployment, setDeployment] = useState<MgmtDeployment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resuming, setResuming] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!deploymentId) return;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await getDeployment(deploymentId);
      setDeployment(data);
    } catch (err) {
      if (!silent) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch deployment",
        );
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [deploymentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll while deployment is in a transient state
  const isTransient =
    deployment?.state === "STATE_CREATING" ||
    deployment?.state === "STATE_DELETING";
  useEffect(() => {
    if (!isTransient) return;
    const id = setInterval(() => fetchData(true), 5000);
    return () => clearInterval(id);
  }, [isTransient, fetchData]);

  const handleDelete = async () => {
    if (!deploymentId) return;
    setDeleting(true);
    try {
      await deleteDeployment(deploymentId);
      navigate("/orchestration");
    } catch {
      setDeleting(false);
    }
  };

  const handleResume = async () => {
    if (!deploymentId) return;
    setResuming(true);
    try {
      await resumeDeployment(deploymentId);
      await fetchData();
    } catch {
      // ignore
    } finally {
      setResuming(false);
    }
  };

  if (loading) return <Spinner size="xl" />;
  if (error || !deployment) {
    return <Title headingLevel="h1">{error ?? "Deployment not found"}</Title>;
  }

  const name = shortName(deployment.name);
  const stateInfo = STATE_LABELS[deployment.state] ?? STATE_LABELS.STATE_UNSPECIFIED;
  const stateIcon = STATE_ICONS[deployment.state] ?? STATE_ICONS.STATE_UNSPECIFIED;
  const canResume =
    deployment.state === "STATE_PAUSED_AUTH" ||
    deployment.state === "STATE_FAILED";
  const canDelete = deployment.state !== "STATE_DELETING";

  const targets = deployment.resolvedTargetIds ?? [];
  const manifests = deployment.manifestStrategy?.manifests ?? [];

  const statCards = [
    {
      label: "State",
      value: stateInfo.text,
      icon: stateIcon,
    },
    {
      label: "Targets",
      value: targets.length,
      icon: <ServerIcon />,
    },
    {
      label: "Generation",
      value: deployment.etag || "—",
      icon: <CubesIcon />,
    },
    {
      label: "Created",
      value: formatTime(deployment.createTime),
      icon: <ClockIcon />,
    },
  ];

  return (
    <div>
      <Breadcrumb style={{ marginBottom: "var(--pf-t--global--spacer--md)" }}>
        <BreadcrumbItem
          to="/orchestration"
          onClick={(e) => {
            e.preventDefault();
            navigate("/orchestration");
          }}
        >
          Orchestration
        </BreadcrumbItem>
        <BreadcrumbItem isActive>{name}</BreadcrumbItem>
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
                <CubesIcon color="var(--pf-t--global--color--brand--default)" />
              </Icon>
            </FlexItem>
            <FlexItem>
              <Title headingLevel="h1" size="2xl">
                {name}
              </Title>
              <Flex
                gap={{ default: "gapSm" }}
                style={{ marginTop: "var(--pf-t--global--spacer--xs)" }}
              >
                <Label color={stateInfo.color} icon={stateIcon} isCompact>
                  {stateInfo.text}
                  {deployment.reconciling ? " (reconciling)" : ""}
                </Label>
                {manifests[0] && (
                  <Label color="grey" isCompact>
                    {manifests[0].resourceType}
                  </Label>
                )}
              </Flex>
            </FlexItem>
            <FlexItem align={{ default: "alignRight" }}>
              <Flex gap={{ default: "gapSm" }}>
                {canResume && (
                  <Button
                    variant="secondary"
                    onClick={handleResume}
                    isLoading={resuming}
                    isDisabled={resuming}
                  >
                    Resume
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="danger"
                    icon={<TrashIcon />}
                    onClick={() => setShowDelete(true)}
                  >
                    Delete
                  </Button>
                )}
              </Flex>
            </FlexItem>
          </Flex>
        </CardBody>
      </Card>

      <Modal
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        variant="small"
      >
        <ModalHeader
          title="Delete deployment"
          description={`Are you sure you want to delete "${name}"? This will terminate the provisioned cluster.`}
        />
        <ModalBody />
        <ModalFooter>
          <Button
            variant="danger"
            onClick={handleDelete}
            isLoading={deleting}
            isDisabled={deleting}
          >
            Delete
          </Button>
          <Button
            variant="link"
            onClick={() => setShowDelete(false)}
            isDisabled={deleting}
          >
            Cancel
          </Button>
        </ModalFooter>
      </Modal>

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

      {/* Details + Placement */}
      <Grid
        hasGutter
        style={{ marginBottom: "var(--pf-t--global--spacer--lg)" }}
      >
        <GridItem md={8} sm={12}>
          <Card isFullHeight>
            <CardTitle>
              <Title headingLevel="h3" size="md">
                Deployment Details
              </Title>
            </CardTitle>
            <CardBody>
              <DescriptionList columnModifier={{ lg: "2Col" }} isHorizontal>
                <DescriptionListGroup>
                  <DescriptionListTerm>Name</DescriptionListTerm>
                  <DescriptionListDescription>
                    <code
                      style={{
                        fontFamily: "var(--pf-t--global--font--family--mono)",
                        fontSize: "var(--pf-t--global--font--size--sm)",
                        background:
                          "var(--pf-t--global--background--color--secondary--default)",
                        padding: "2px 6px",
                        borderRadius:
                          "var(--pf-t--global--border--radius--small)",
                      }}
                    >
                      {deployment.name}
                    </code>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>UID</DescriptionListTerm>
                  <DescriptionListDescription>
                    <code
                      style={{
                        fontFamily: "var(--pf-t--global--font--family--mono)",
                        fontSize: "var(--pf-t--global--font--size--sm)",
                        background:
                          "var(--pf-t--global--background--color--secondary--default)",
                        padding: "2px 6px",
                        borderRadius:
                          "var(--pf-t--global--border--radius--small)",
                      }}
                    >
                      {deployment.uid}
                    </code>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>State</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Label color={stateInfo.color} isCompact>
                      {stateInfo.text}
                    </Label>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Reconciling</DescriptionListTerm>
                  <DescriptionListDescription>
                    {deployment.reconciling ? "Yes" : "No"}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Created</DescriptionListTerm>
                  <DescriptionListDescription>
                    {formatTime(deployment.createTime)}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Updated</DescriptionListTerm>
                  <DescriptionListDescription>
                    {formatTime(deployment.updateTime)}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>ETag</DescriptionListTerm>
                  <DescriptionListDescription>
                    <code
                      style={{
                        fontFamily: "var(--pf-t--global--font--family--mono)",
                        fontSize: "var(--pf-t--global--font--size--sm)",
                        background:
                          "var(--pf-t--global--background--color--secondary--default)",
                        padding: "2px 6px",
                        borderRadius:
                          "var(--pf-t--global--border--radius--small)",
                      }}
                    >
                      {deployment.etag}
                    </code>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Rollout</DescriptionListTerm>
                  <DescriptionListDescription>
                    {deployment.rolloutStrategy?.type?.replace("TYPE_", "") ??
                      "—"}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem md={4} sm={12}>
          <Card isFullHeight>
            <CardTitle>
              <Title headingLevel="h3" size="md">
                Placement
              </Title>
            </CardTitle>
            <CardBody>
              <div
                style={{
                  fontSize: "var(--pf-t--global--font--size--xs)",
                  fontWeight:
                    "var(--pf-t--global--font--weight--heading--default)",
                  color: "var(--pf-t--global--text--color--subtle)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "var(--pf-t--global--spacer--sm)",
                }}
              >
                Strategy:{" "}
                {deployment.placementStrategy?.type?.replace("TYPE_", "") ??
                  "—"}
              </div>

              {deployment.placementStrategy?.targetIds &&
                deployment.placementStrategy.targetIds.length > 0 && (
                  <div
                    style={{
                      marginBottom: "var(--pf-t--global--spacer--md)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "var(--pf-t--global--font--size--sm)",
                        color: "var(--pf-t--global--text--color--subtle)",
                        marginBottom: "var(--pf-t--global--spacer--xs)",
                      }}
                    >
                      Requested Targets
                    </div>
                    <LabelGroup>
                      {deployment.placementStrategy.targetIds.map((t) => (
                        <Label key={t} color="blue" isCompact>
                          {t}
                        </Label>
                      ))}
                    </LabelGroup>
                  </div>
                )}

              {targets.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: "var(--pf-t--global--font--size--sm)",
                      color: "var(--pf-t--global--text--color--subtle)",
                      marginBottom: "var(--pf-t--global--spacer--xs)",
                    }}
                  >
                    Resolved Targets
                  </div>
                  <LabelGroup>
                    {targets.map((t) => (
                      <Label key={t} color="green" isCompact>
                        {t}
                      </Label>
                    ))}
                  </LabelGroup>
                </div>
              )}
            </CardBody>
          </Card>
        </GridItem>
      </Grid>

      {/* Manifest */}
      {manifests.length > 0 && (
        <Card>
          <CardTitle>
            <Title headingLevel="h3" size="md">
              Manifest
            </Title>
          </CardTitle>
          <CardBody>
            {manifests.map((m, i) => (
              <div key={i}>
                <Label color="grey" isCompact style={{ marginBottom: "var(--pf-t--global--spacer--sm)" }}>
                  {m.resourceType}
                </Label>
                <pre
                  style={{
                    fontFamily: "var(--pf-t--global--font--family--mono)",
                    fontSize: "var(--pf-t--global--font--size--sm)",
                    background:
                      "var(--pf-t--global--background--color--secondary--default)",
                    padding: "var(--pf-t--global--spacer--md)",
                    borderRadius:
                      "var(--pf-t--global--border--radius--small)",
                    overflow: "auto",
                    maxHeight: "400px",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    margin: 0,
                  }}
                >
                  {decodeManifest(m.raw)}
                </pre>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
};

export default DeploymentDetailPage;
