import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ClipboardCopy,
  Icon,
  Spinner,
  Title,
} from "@patternfly/react-core";
import { KeyIcon } from "@patternfly/react-icons";
import { useSigningKeyEnrollment } from "./useSigningKeyEnrollment";
import "./SetupPage.scss";
import EnrolledCard from "./components/EnrolledCard";
import EnrollmentError from "./components/EnrollmentError";
import GHEnroll from "./components/GHEnroll";
import OIDCEnroll from "./components/OIDCEnroll";

const messages: Record<string, string> = {
  loading: "Loading configuration...",
  generating: "Generating ECDSA P-256 signing key...",
  verifying: "Verifying signature with the server...",
};

const SigningKeyEnrollment = () => {
  const {
    step,
    sshPublicKey,
    registry,
    error,
    enrollmentName,
    githubUsername,
    isSetupFlow,
    enrollOidc,
    retry,
    handleReenroll,
    setGhPollEnabled,
  } = useSigningKeyEnrollment();

  if (step === "loading" || step === "generating" || step === "verifying") {
    return (
      <div className="fs-setup">
        <Title headingLevel="h1" className="fs-setup__title">
          Signing Key Enrollment
        </Title>
        <Spinner aria-label={messages[step]} />
        <p className="pf-v6-u-mt-md">{messages[step]}</p>
      </div>
    );
  }

  if (step === "error") {
    return <EnrollmentError error={error} onRetry={retry} />;
  }

  if (step === "enrolled") {
    return (
      <EnrolledCard
        registry={registry}
        enrollmentName={enrollmentName}
        sshPublicKey={sshPublicKey}
        isSetupFlow={isSetupFlow}
        handleReenroll={handleReenroll}
      />
    );
  }

  return (
    <div className="fs-setup">
      <Title headingLevel="h1" className="fs-setup__title">
        Signing Key Enrollment
      </Title>
      <p className="fs-setup__subtitle">
        Register your signing key to sign deployments and policies.
      </p>

      <Card isCompact className="pf-v6-u-mt-lg">
        <CardHeader>
          <CardTitle>
            <Icon>
              <KeyIcon />
            </Icon>{" "}
            Your signing key
          </CardTitle>
        </CardHeader>
        <CardBody>
          {sshPublicKey && (
            <ClipboardCopy isReadOnly isCode>
              {sshPublicKey}
            </ClipboardCopy>
          )}
        </CardBody>
      </Card>

      {registry === "github" && (
        <GHEnroll
          githubUsername={githubUsername}
          setGhPollEnabled={setGhPollEnabled}
        />
      )}

      {registry === "oidc" && (
        <OIDCEnroll step={step} enrollOidc={enrollOidc} />
      )}

      <Button variant="link" component="a" href="/" className="pf-v6-u-mt-xl">
        Skip to console
      </Button>
    </div>
  );
};

export default SigningKeyEnrollment;
