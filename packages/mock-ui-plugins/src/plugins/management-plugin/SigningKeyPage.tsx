import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardTitle,
  ClipboardCopy,
  CodeBlock,
  CodeBlockCode,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  Flex,
  FlexItem,
  Icon,
  Label,
  Radio,
  Spinner,
  Title,
  Wizard,
  WizardFooterWrapper,
  WizardStep,
} from "@patternfly/react-core";
import {
  CheckCircleIcon,
  ExternalLinkAltIcon,
  KeyIcon,
  TrashIcon,
} from "@patternfly/react-icons";
import { useSigningKeyStore } from "./signingKeyStore";

const OIDC_SETUP_CMD = `fleetctl auth setup \\
  --key-enrollment-client-id fleetshift-ui \\
  --registry-id oidc \\
  --registry-subject-expression 'claims.preferred_username'`;

const GH_SETUP_CMD = `fleetctl auth setup \\
  --key-enrollment-client-id fleetshift-ui \\
  --registry-id github.com \\
  --registry-subject-expression 'claims.github_username'`;

export default function SigningKeyPage() {
  const store = useSigningKeyStore();
  const [wizardOpen, setWizardOpen] = useState(false);

  const isInWizard =
    store.step === "generating" ||
    store.step === "pick-registry" ||
    store.step === "enrolling";

  // Close wizard when store leaves wizard steps
  if (wizardOpen && !isInWizard) {
    queueMicrotask(() => setWizardOpen(false));
  }

  if (store.step === "loading") {
    return (
      <div style={{ padding: "var(--pf-t--global--spacer--xl)" }}>
        <Spinner size="lg" aria-label="Checking signing key status" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <Flex
        alignItems={{ default: "alignItemsBaseline" }}
        gap={{ default: "gapSm" }}
        style={{ marginBottom: "var(--pf-t--global--spacer--lg)" }}
      >
        <FlexItem>
          <Title headingLevel="h1">Signing Keys</Title>
        </FlexItem>
        <FlexItem>
          <span
            style={{
              fontSize: "var(--pf-t--global--font--size--sm)",
              color: "var(--pf-t--global--text--color--subtle)",
            }}
          >
            ECDSA P-256 deployment signing
          </span>
        </FlexItem>
      </Flex>

      {/* Alerts */}
      {store.success && (
        <Alert
          variant="success"
          title={store.success}
          isInline
          actionClose={
            <Button variant="plain" onClick={store.dismissSuccess}>
              &times;
            </Button>
          }
          style={{ marginBottom: "var(--pf-t--global--spacer--md)" }}
        />
      )}
      {store.error && (
        <Alert
          variant="danger"
          title={store.error}
          isInline
          actionClose={
            <Button variant="plain" onClick={store.dismissError}>
              &times;
            </Button>
          }
          style={{ marginBottom: "var(--pf-t--global--spacer--md)" }}
        />
      )}

      {/* Enrolled state */}
      {store.step === "enrolled" && store.sshPublicKey && (
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
                  Signing key enrolled
                </Title>
                <span
                  style={{
                    fontSize: "var(--pf-t--global--font--size--sm)",
                    color: "var(--pf-t--global--text--color--subtle)",
                  }}
                >
                  Deployments can be cryptographically signed from this browser.
                </span>
              </FlexItem>
              <FlexItem align={{ default: "alignRight" }}>
                <Button
                  variant="danger"
                  icon={<TrashIcon />}
                  onClick={store.remove}
                >
                  Remove
                </Button>
              </FlexItem>
            </Flex>

            <DescriptionList isHorizontal isCompact>
              <DescriptionListGroup>
                <DescriptionListTerm>Algorithm</DescriptionListTerm>
                <DescriptionListDescription>
                  <Label color="blue" isCompact>
                    ECDSA P-256
                  </Label>
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Storage</DescriptionListTerm>
                <DescriptionListDescription>
                  Browser IndexedDB (non-extractable)
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>SSH Public Key</DescriptionListTerm>
                <DescriptionListDescription>
                  <ClipboardCopy
                    isReadOnly
                    isCode
                    variant="expansion"
                    hoverTip="Copy"
                    clickTip="Copied"
                  >
                    {store.sshPublicKey}
                  </ClipboardCopy>
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </CardBody>
        </Card>
      )}

      {/* Empty state */}
      {(store.step === "empty" || store.step === "removing") && (
        <EmptyState headingLevel="h2" icon={KeyIcon} titleText="No signing key">
          <EmptyStateBody>
            Generate an ECDSA P-256 signing key to cryptographically sign
            deployments from the browser. The private key is stored in your
            browser&apos;s IndexedDB and never leaves the device.
          </EmptyStateBody>
          <EmptyStateFooter>
            <EmptyStateActions>
              <Button
                variant="primary"
                isDisabled={store.step === "removing"}
                isLoading={store.step === "removing"}
                onClick={async () => {
                  setWizardOpen(true);
                  await store.generate();
                }}
              >
                Generate signing key
              </Button>
            </EmptyStateActions>
          </EmptyStateFooter>
        </EmptyState>
      )}

      {/* Enrollment wizard */}
      {wizardOpen && isInWizard && (
        <Wizard
          height={420}
          onClose={() => {
            store.remove();
            setWizardOpen(false);
          }}
          isProgressive
        >
          <WizardStep
            name="Generate key"
            id="generate"
            status={store.step === "generating" ? "default" : "success"}
            footer={{
              isNextDisabled: store.step === "generating",
              isBackHidden: true,
              nextButtonText:
                store.step === "generating" ? "Generating..." : "Next",
            }}
          >
            {store.step === "generating" ? (
              <Flex
                alignItems={{ default: "alignItemsCenter" }}
                gap={{ default: "gapMd" }}
              >
                <Spinner size="lg" />
                <span>Generating ECDSA P-256 key pair...</span>
              </Flex>
            ) : (
              <Flex
                alignItems={{ default: "alignItemsCenter" }}
                gap={{ default: "gapMd" }}
              >
                <Icon>
                  <CheckCircleIcon color="var(--pf-t--global--color--status--success--default)" />
                </Icon>
                <span>Key pair generated and stored in IndexedDB.</span>
              </Flex>
            )}
          </WizardStep>

          <WizardStep
            name="Store public key"
            id="registry"
            isDisabled={store.step === "generating"}
            footer={
              <WizardFooterWrapper>
                <Button
                  variant="primary"
                  onClick={() => store.enroll()}
                  isLoading={store.step === "enrolling"}
                  isDisabled={store.step === "enrolling"}
                  icon={
                    store.selectedRegistry === "github.com" ? (
                      <ExternalLinkAltIcon />
                    ) : undefined
                  }
                >
                  {store.selectedRegistry === "oidc"
                    ? "Store in IdP & enroll"
                    : store.selectedRegistry === "github.com"
                      ? "Copy key & open GitHub"
                      : "Enroll"}
                </Button>
                <Button
                  variant="link"
                  onClick={() => {
                    store.remove();
                    setWizardOpen(false);
                  }}
                >
                  Cancel
                </Button>
              </WizardFooterWrapper>
            }
          >
            <Title
              headingLevel="h3"
              size="md"
              style={{ marginBottom: "var(--pf-t--global--spacer--md)" }}
            >
              Where should the public key live?
            </Title>
            <p
              style={{
                marginBottom: "var(--pf-t--global--spacer--lg)",
                color: "var(--pf-t--global--text--color--subtle)",
              }}
            >
              The private key stays in your browser. Choose where to store the
              public key so the server can verify your signatures. The registry
              mapping is configured by the admin via{" "}
              <code>fleetctl auth setup</code>.
            </p>

            <Flex
              direction={{ default: "column" }}
              gap={{ default: "gapMd" }}
              style={{ marginBottom: "var(--pf-t--global--spacer--lg)" }}
            >
              <Radio
                id="registry-oidc"
                name="registry"
                label="OIDC (recommended)"
                description="Automatically stores the public key as an IdP user attribute. No manual steps."
                isChecked={store.selectedRegistry === "oidc"}
                onChange={() => store.selectRegistry("oidc")}
              />
              <Radio
                id="registry-github"
                name="registry"
                label="GitHub"
                description="Copies the SSH public key to your clipboard and opens GitHub's SSH key settings. Add it as a Signing Key (not Authentication Key)."
                isChecked={store.selectedRegistry === "github.com"}
                onChange={() => store.selectRegistry("github.com")}
              />
              <Radio
                id="registry-manual"
                name="registry"
                label="Manual"
                description="Shows the SSH public key for you to copy and add to your key registry manually."
                isChecked={store.selectedRegistry === "manual"}
                onChange={() => store.selectRegistry("manual")}
              />
            </Flex>

            {store.selectedRegistry === "github.com" && (
              <Alert
                variant="info"
                title="GitHub requires a Signing Key"
                isInline
                isPlain
              >
                When pasting the key on GitHub, select{" "}
                <strong>Signing Key</strong> from the Key type dropdown.
                Authentication keys cannot be used for signature verification.
                The admin must also configure the registry mapping to use{" "}
                <code>github.com</code> (see setup commands below).
              </Alert>
            )}

            {store.selectedRegistry === "manual" && store.sshPublicKey && (
              <ClipboardCopy
                isReadOnly
                isCode
                variant="expansion"
                hoverTip="Copy"
                clickTip="Copied"
              >
                {store.sshPublicKey}
              </ClipboardCopy>
            )}
          </WizardStep>
        </Wizard>
      )}

      {/* Admin setup reference */}
      <div style={{ marginTop: "var(--pf-t--global--spacer--2xl)" }}>
        <Title
          headingLevel="h2"
          size="lg"
          style={{ marginBottom: "var(--pf-t--global--spacer--md)" }}
        >
          Admin Setup
        </Title>
        <p
          style={{
            marginBottom: "var(--pf-t--global--spacer--lg)",
            color: "var(--pf-t--global--text--color--subtle)",
          }}
        >
          The server derives the key registry and subject from a CEL claim
          mapping configured by the admin. Run one of the following commands
          depending on where users store their public keys.
        </p>
        <Flex direction={{ default: "column" }} gap={{ default: "gapLg" }}>
          <Card isCompact>
            <CardTitle>OIDC registry</CardTitle>
            <CardBody>
              <p style={{ marginBottom: "var(--pf-t--global--spacer--sm)" }}>
                The public key is embedded as a <code>signing_public_key</code>{" "}
                claim in the enrollment ID token. Works with any OIDC IdP
                (Keycloak, Auth0, etc.) that supports custom claims.
              </p>
              <ClipboardCopy
                isReadOnly
                isCode
                variant="expansion"
                hoverTip="Copy"
                clickTip="Copied"
              >
                {OIDC_SETUP_CMD}
              </ClipboardCopy>
            </CardBody>
          </Card>
          <Card isCompact>
            <CardTitle>GitHub registry</CardTitle>
            <CardBody>
              <p style={{ marginBottom: "var(--pf-t--global--spacer--sm)" }}>
                Maps <code>github_username</code> from the ID token to fetch SSH
                signing keys from GitHub. Requires a{" "}
                <code>github_username</code> claim from your IdP.
              </p>
              <ClipboardCopy
                isReadOnly
                isCode
                variant="expansion"
                hoverTip="Copy"
                clickTip="Copied"
              >
                {GH_SETUP_CMD}
              </ClipboardCopy>
            </CardBody>
          </Card>
        </Flex>
      </div>
    </div>
  );
}
