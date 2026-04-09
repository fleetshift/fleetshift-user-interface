import { useState, useCallback } from "react";
import {
  Alert,
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
  Form,
  FormGroup,
  Icon,
  Label,
  TextInput,
  Title,
} from "@patternfly/react-core";
import {
  CheckCircleIcon,
  KeyIcon,
  TrashIcon,
} from "@patternfly/react-icons";
import { createAuthMethod } from "./api";
import {
  useAuthState,
  setStoredAuthMethod,
  clearStoredAuthMethod,
  type StoredAuthMethod,
} from "./authState";

export default function AuthMethodsPage() {
  const { method: stored } = useAuthState();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form fields — pre-filled with local Keycloak defaults
  const [issuerUrl, setIssuerUrl] = useState(
    "http://localhost:8180/realms/fleetshift",
  );
  const [authMethodId, setAuthMethodId] = useState("default");
  const [audience, setAudience] = useState("fleetshift-ui");
  const [keyEnrollmentAudience, setKeyEnrollmentAudience] = useState("");

  const handleSubmit = useCallback(async () => {
    if (!authMethodId.trim() || !issuerUrl.trim() || !audience.trim()) {
      setError("Auth Method ID, Issuer URL, and Audience are required.");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const result = await createAuthMethod({
        authMethodId: authMethodId.trim(),
        authMethod: {
          type: "TYPE_OIDC",
          oidcConfig: {
            issuerUrl: issuerUrl.trim(),
            audience: audience.trim(),
            ...(keyEnrollmentAudience.trim()
              ? { keyEnrollmentAudience: keyEnrollmentAudience.trim() }
              : {}),
          },
        },
      });

      const method: StoredAuthMethod = {
        name: result.name,
        issuerUrl: issuerUrl.trim(),
        audience: audience.trim(),
        configuredAt: new Date().toISOString(),
      };
      setStoredAuthMethod(method);
      setSuccess("Auth method registered. The management plane is now validating tokens.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create auth method",
      );
    } finally {
      setCreating(false);
    }
  }, [authMethodId, issuerUrl, audience, keyEnrollmentAudience]);

  const handleReset = useCallback(() => {
    clearStoredAuthMethod();
    setSuccess(null);
    setError(null);
  }, []);

  return (
    <div>
      <Flex
        alignItems={{ default: "alignItemsBaseline" }}
        gap={{ default: "gapSm" }}
        style={{ marginBottom: "var(--pf-t--global--spacer--lg)" }}
      >
        <FlexItem>
          <Title headingLevel="h1">Auth Methods</Title>
        </FlexItem>
        <FlexItem>
          <span
            style={{
              fontSize: "var(--pf-t--global--font--size--sm)",
              color: "var(--pf-t--global--text--color--subtle)",
            }}
          >
            OIDC configuration
          </span>
        </FlexItem>
      </Flex>

      {success && (
        <Alert
          variant="success"
          title={success}
          isInline
          actionClose={
            <Button variant="plain" onClick={() => setSuccess(null)}>
              &times;
            </Button>
          }
          style={{ marginBottom: "var(--pf-t--global--spacer--md)" }}
        />
      )}

      {error && (
        <Alert
          variant="danger"
          title={error}
          isInline
          actionClose={
            <Button variant="plain" onClick={() => setError(null)}>
              &times;
            </Button>
          }
          style={{ marginBottom: "var(--pf-t--global--spacer--md)" }}
        />
      )}

      {stored ? (
        /* Auth is configured — show status card */
        <Card>
          <CardBody>
            <Flex
              alignItems={{ default: "alignItemsCenter" }}
              gap={{ default: "gapMd" }}
              style={{ marginBottom: "var(--pf-t--global--spacer--lg)" }}
            >
              <FlexItem>
                <Icon size="xl">
                  <CheckCircleIcon color="var(--pf-t--global--color--status--success--default)" />
                </Icon>
              </FlexItem>
              <FlexItem>
                <Title headingLevel="h2" size="xl">
                  Authentication configured
                </Title>
                <span
                  style={{
                    fontSize: "var(--pf-t--global--font--size--sm)",
                    color: "var(--pf-t--global--text--color--subtle)",
                  }}
                >
                  The management plane is validating OIDC tokens.
                </span>
              </FlexItem>
              <FlexItem align={{ default: "alignRight" }}>
                <Button
                  variant="danger"
                  icon={<TrashIcon />}
                  onClick={handleReset}
                >
                  Reset
                </Button>
              </FlexItem>
            </Flex>

            <DescriptionList isHorizontal isCompact>
              <DescriptionListGroup>
                <DescriptionListTerm>Method</DescriptionListTerm>
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
                    {stored.name}
                  </code>
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Issuer URL</DescriptionListTerm>
                <DescriptionListDescription>
                  <code
                    style={{
                      fontFamily: "var(--pf-t--global--font--family--mono)",
                      fontSize: "var(--pf-t--global--font--size--sm)",
                    }}
                  >
                    {stored.issuerUrl}
                  </code>
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Audience</DescriptionListTerm>
                <DescriptionListDescription>
                  <code
                    style={{
                      fontFamily: "var(--pf-t--global--font--family--mono)",
                      fontSize: "var(--pf-t--global--font--size--sm)",
                    }}
                  >
                    {stored.audience}
                  </code>
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Configured</DescriptionListTerm>
                <DescriptionListDescription>
                  {new Date(stored.configuredAt).toLocaleString()}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </CardBody>
        </Card>
      ) : (
        /* Auth not configured — show pre-filled form */
        <Card>
          <CardTitle>
            <Flex
              alignItems={{ default: "alignItemsCenter" }}
              gap={{ default: "gapSm" }}
            >
              <Icon>
                <KeyIcon />
              </Icon>
              <Title headingLevel="h2" size="lg">
                Register OIDC Auth Method
              </Title>
            </Flex>
          </CardTitle>
          <CardBody>
            <p
              style={{
                marginBottom: "var(--pf-t--global--spacer--lg)",
                color: "var(--pf-t--global--text--color--subtle)",
              }}
            >
              Register an OIDC issuer so the management plane can validate
              tokens. Pre-filled with local Keycloak defaults.
            </p>

            <Form
              style={{ maxWidth: "600px" }}
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
            >
              <FormGroup label="Auth Method ID" isRequired fieldId="auth-method-id">
                <TextInput
                  id="auth-method-id"
                  isRequired
                  value={authMethodId}
                  onChange={(_e, v) => setAuthMethodId(v)}
                  placeholder="primary"
                />
              </FormGroup>

              <FormGroup label="Issuer URL" isRequired fieldId="issuer-url">
                <TextInput
                  id="issuer-url"
                  isRequired
                  value={issuerUrl}
                  onChange={(_e, v) => setIssuerUrl(v)}
                  placeholder="https://accounts.google.com"
                />
              </FormGroup>

              <FormGroup label="Audience" isRequired fieldId="audience">
                <TextInput
                  id="audience"
                  isRequired
                  value={audience}
                  onChange={(_e, v) => setAudience(v)}
                  placeholder="my-app-client-id"
                />
              </FormGroup>

              <FormGroup
                label="Key Enrollment Audience"
                fieldId="key-enrollment-audience"
              >
                <TextInput
                  id="key-enrollment-audience"
                  value={keyEnrollmentAudience}
                  onChange={(_e, v) => setKeyEnrollmentAudience(v)}
                  placeholder="Optional"
                />
              </FormGroup>

              <Button
                variant="primary"
                onClick={handleSubmit}
                isDisabled={creating}
                isLoading={creating}
                style={{ marginTop: "var(--pf-t--global--spacer--sm)" }}
              >
                {creating ? "Registering..." : "Register auth method"}
              </Button>
            </Form>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
