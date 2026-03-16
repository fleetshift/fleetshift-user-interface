import { useState } from "react";
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
  Alert,
  AlertActionCloseButton,
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
import { createCluster } from "../../utils/api";

type ClusterType = "kubeconfig" | "token" | null;

export const AddClusterPage = () => {
  const navigate = useNavigate();

  const [clusterType, setClusterType] = useState<ClusterType>(null);
  const [name, setName] = useState("");
  const [context, setContext] = useState("minikube");
  const [server, setServer] = useState("");
  const [token, setToken] = useState("");
  const [skipTLS, setSkipTLS] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isValid =
    clusterType &&
    name.trim() &&
    (clusterType === "kubeconfig"
      ? context.trim()
      : server.trim() && token.trim());

  const handleSubmit = async () => {
    if (!isValid || !clusterType) return;

    setSubmitting(true);
    setError(null);

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

      setSuccess(true);
      setTimeout(() => navigate(`/clusters/${result.id}`), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setSubmitting(false);
    }
  };

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

      {error && (
        <StackItem>
          <Alert
            variant="danger"
            title="Connection failed"
            actionClose={
              <AlertActionCloseButton onClose={() => setError(null)} />
            }
          >
            {error}
          </Alert>
        </StackItem>
      )}

      {success && (
        <StackItem>
          <Alert variant="success" title={`Successfully connected to ${name}`}>
            Redirecting to cluster details…
          </Alert>
        </StackItem>
      )}

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
                  onChange: () =>
                    !submitting && !success && setClusterType("kubeconfig"),
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
                  onChange: () =>
                    !submitting && !success && setClusterType("token"),
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
                isDisabled={submitting || success}
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
                  isDisabled={submitting || success}
                  isRequired
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
                    id="cluster-server"
                    value={server}
                    onChange={(_e, val) => setServer(val)}
                    placeholder="https://api.cluster.example.com:443"
                    isDisabled={submitting || success}
                    isRequired
                  />
                </FormGroup>
                <FormGroup
                  label="Bearer Token"
                  isRequired
                  fieldId="cluster-token"
                >
                  <TextInput
                    id="cluster-token"
                    type="password"
                    value={token}
                    onChange={(_e, val) => setToken(val)}
                    isDisabled={submitting || success}
                    isRequired
                  />
                </FormGroup>
                <FormGroup fieldId="cluster-tls">
                  <Checkbox
                    id="cluster-tls"
                    label="Skip TLS verification"
                    isChecked={skipTLS}
                    onChange={(_e, checked) => setSkipTLS(checked)}
                    isDisabled={submitting || success}
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
                isDisabled={!isValid || submitting || success}
                isLoading={submitting}
                icon={success ? <CheckCircleIcon /> : undefined}
              >
                {submitting
                  ? "Connecting…"
                  : success
                    ? "Connected"
                    : "Connect Cluster"}
              </Button>
              <Button
                variant="link"
                onClick={() => navigate("/clusters")}
                isDisabled={success}
              >
                Cancel
              </Button>
            </ActionGroup>
          </Form>
        </StackItem>
      )}
    </Stack>
  );
};
