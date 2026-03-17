import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  Title,
  Content,
  Grid,
  GridItem,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Label,
  Form,
  FormGroup,
  ActionGroup,
  TextInput,
  Checkbox,
  Button,
  Stack,
  StackItem,
  Icon,
  HelperText,
  HelperTextItem,
} from "@patternfly/react-core";
import {
  CubesIcon,
  RedhatIcon,
  CheckCircleIcon,
} from "@patternfly/react-icons";
import { createCluster } from "../../../utils/api";
import { subscribe } from "../../../hooks/useInvalidationSocket";
import { ConnectProgressModal } from "./ConnectProgressModal";
import type { ClusterType, StepKey, StepStatus, StepState } from "./types";
import { INITIAL_STEPS } from "./types";

export const AddClusterPage = () => {
  const navigate = useNavigate();

  const [clusterType, setClusterType] = useState<ClusterType>(null);
  const [name, setName] = useState("");
  const [context, setContext] = useState("minikube");
  const [server, setServer] = useState("");
  const [token, setToken] = useState("");
  const [skipTLS, setSkipTLS] = useState(true);

  const [showProgress, setShowProgress] = useState(false);
  const [steps, setSteps] = useState<StepState[]>(INITIAL_STEPS);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [clusterId, setClusterId] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const isValid =
    clusterType &&
    name.trim() &&
    (clusterType === "kubeconfig"
      ? context.trim()
      : server.trim() && token.trim());

  // Subscribe to WS progress events
  useEffect(() => {
    if (!showProgress) return;

    return subscribe(
      "cluster-progress",
      (msg: { step: StepKey; status: string; detail?: string }) => {
        setSteps((prev) =>
          prev.map((s) =>
            s.key === msg.step
              ? {
                  ...s,
                  status: msg.status as StepStatus,
                  detail: msg.detail ?? s.detail,
                }
              : s,
          ),
        );
      },
    );
  }, [showProgress]);

  const handleSubmit = useCallback(async () => {
    if (!isValid || !clusterType || submittingRef.current) return;

    submittingRef.current = true;
    setSteps(
      INITIAL_STEPS.map((s) => ({
        ...s,
        status: "pending",
        detail: undefined,
      })),
    );
    setConnectError(null);
    setClusterId(null);
    setShowProgress(true);

    try {
      const result = await createCluster(
        clusterType === "kubeconfig"
          ? { name: name.trim(), type: "kubeconfig", context: context.trim() }
          : {
              name: name.trim(),
              type: "token",
              server: server.trim(),
              token: token.trim(),
              skipTLSVerify: skipTLS,
            },
      );

      setClusterId(result.id);
      // Mark all steps done (in case some WS events were missed)
      setSteps((prev) => prev.map((s) => ({ ...s, status: "done" })));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      setConnectError(message);
      // Mark currently running step as error, leave rest as pending
      setSteps((prev) =>
        prev.map((s) =>
          s.status === "running" ? { ...s, status: "error" } : s,
        ),
      );
    } finally {
      submittingRef.current = false;
    }
  }, [isValid, clusterType, name, context, server, token, skipTLS]);

  const handleRetry = useCallback(() => {
    handleSubmit();
  }, [handleSubmit]);

  const handleCancel = useCallback(() => {
    setShowProgress(false);
    setConnectError(null);
  }, []);

  return (
    <Stack hasGutter>
      <StackItem>
        <Breadcrumb>
          <BreadcrumbItem>
            <Link to="/clusters">Clusters</Link>
          </BreadcrumbItem>
          <BreadcrumbItem isActive>Add Cluster</BreadcrumbItem>
        </Breadcrumb>
      </StackItem>

      <StackItem>
        <Title headingLevel="h1" size="2xl">
          Add Cluster
        </Title>
        <Content
          component="p"
          style={{ color: "var(--pf-t--global--color--subtle)" }}
        >
          Connect a Kubernetes cluster to FleetShift. Select the cluster type
          and provide connection details.
        </Content>
      </StackItem>

      <StackItem>
        <Grid hasGutter md={6}>
          <GridItem>
            <Card
              isSelectable
              isSelected={clusterType === "kubeconfig"}
              isClickable
            >
              <CardHeader
                selectableActions={{
                  selectableActionId: "select-minikube",
                  selectableActionAriaLabel: "Select Minikube cluster type",
                  name: "cluster-type",
                  variant: "single",
                  onChange: () => !showProgress && setClusterType("kubeconfig"),
                }}
              >
                <Icon size="xl">
                  <CubesIcon color="var(--pf-t--global--color--brand--default)" />
                </Icon>
              </CardHeader>
              <CardTitle>Minikube</CardTitle>
              <CardBody>
                <Content component="p">
                  Connect a local Kubernetes cluster using a kubeconfig context.
                </Content>
                <Label color="blue" isCompact>
                  Kubernetes
                </Label>
              </CardBody>
            </Card>
          </GridItem>
          <GridItem>
            <Card isSelectable isSelected={clusterType === "token"} isClickable>
              <CardHeader
                selectableActions={{
                  selectableActionId: "select-openshift",
                  selectableActionAriaLabel: "Select OpenShift cluster type",
                  name: "cluster-type",
                  variant: "single",
                  onChange: () => !showProgress && setClusterType("token"),
                }}
              >
                <Icon size="xl">
                  <RedhatIcon color="#EE0000" />
                </Icon>
              </CardHeader>
              <CardTitle>OpenShift</CardTitle>
              <CardBody>
                <Content component="p">
                  Connect an OpenShift cluster using API server URL and bearer
                  token.
                </Content>
                <Label color="red" isCompact>
                  OpenShift
                </Label>
              </CardBody>
            </Card>
          </GridItem>
        </Grid>
      </StackItem>

      {clusterType && (
        <StackItem>
          <Form style={{ maxWidth: 600 }} onSubmit={(e) => e.preventDefault()}>
            <FormGroup label="Display Name" isRequired fieldId="cluster-name">
              <TextInput
                id="cluster-name"
                value={name}
                onChange={(_e, val) => setName(val)}
                placeholder={
                  clusterType === "kubeconfig" ? "My Local Dev" : "HCC Stage"
                }
                isDisabled={showProgress}
                isRequired
              />
            </FormGroup>

            {clusterType === "kubeconfig" && (
              <FormGroup
                label="Kubeconfig Context"
                isRequired
                fieldId="cluster-context"
              >
                <TextInput
                  id="cluster-context"
                  value={context}
                  onChange={(_e, val) => setContext(val)}
                  placeholder="minikube"
                  isDisabled={showProgress}
                  isRequired
                  autoComplete="off"
                />
              </FormGroup>
            )}

            {clusterType === "token" && (
              <>
                <FormGroup
                  label="API Server URL"
                  isRequired
                  fieldId="cluster-server"
                >
                  <TextInput
                    name="cluster-server"
                    id="cluster-server"
                    value={server}
                    onChange={(_e, val) => setServer(val)}
                    placeholder="https://api.cluster.example.com:443"
                    isDisabled={showProgress}
                    isRequired
                    autoComplete="off"
                  />
                </FormGroup>
                <FormGroup
                  label="Bearer Token"
                  isRequired
                  fieldId="cluster-token"
                >
                  <TextInput
                    id="cluster-token"
                    name="cluster-token"
                    type="password"
                    value={token}
                    onChange={(_e, val) => setToken(val)}
                    isDisabled={showProgress}
                    isRequired
                    autoComplete="new-password"
                  />
                </FormGroup>
                <FormGroup fieldId="cluster-tls">
                  <Checkbox
                    id="cluster-tls"
                    label="Skip TLS verification"
                    isChecked={skipTLS}
                    onChange={(_e, checked) => setSkipTLS(checked)}
                    isDisabled={showProgress}
                  />
                  <HelperText>
                    <HelperTextItem variant="warning">
                      Only enable for development or self-signed certificates.
                    </HelperTextItem>
                  </HelperText>
                </FormGroup>
              </>
            )}

            <ActionGroup>
              <Button
                variant="primary"
                onClick={handleSubmit}
                isDisabled={!isValid || showProgress}
                icon={<CheckCircleIcon />}
              >
                Connect Cluster
              </Button>
              <Button
                variant="link"
                onClick={() => navigate("/clusters")}
                isDisabled={showProgress}
              >
                Cancel
              </Button>
            </ActionGroup>
          </Form>
        </StackItem>
      )}

      <ConnectProgressModal
        isOpen={showProgress}
        clusterName={name}
        steps={steps}
        connectError={connectError}
        clusterId={clusterId}
        onRetry={handleRetry}
        onCancel={handleCancel}
      />
    </Stack>
  );
};
