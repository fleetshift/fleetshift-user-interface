import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Spinner,
} from "@patternfly/react-core";
import { ExternalLinkAltIcon } from "@patternfly/react-icons";

import ghSigningKeyImg from "../assets/gh-signing-screen.png";

export type GHEnrollProps = {
  githubUsername?: string | null;
};

const GHEnroll = ({ githubUsername }: GHEnrollProps) => {
  return (
    <Card isCompact className="pf-v6-u-mt-lg">
      <CardHeader>
        <CardTitle>Register on GitHub</CardTitle>
      </CardHeader>
      <CardBody>
        <p>
          Copy your public key above and add it as a{" "}
          <strong>Signing Key</strong> on GitHub.
        </p>
        <img
          src={ghSigningKeyImg}
          alt="GitHub SSH key settings page — select Signing Key from the key type dropdown"
          className="fs-setup__screenshot"
        />
        <Button
          variant="secondary"
          icon={<ExternalLinkAltIcon />}
          iconPosition="end"
          component="a"
          href="https://github.com/settings/ssh/new"
          target="_blank"
          rel="noopener noreferrer"
          className="pf-v6-u-mt-sm"
        >
          Open GitHub SSH keys
        </Button>
        <Alert
          variant="info"
          isInline
          isPlain
          title="Waiting for key to appear on GitHub..."
          className="pf-v6-u-mt-md"
        >
          {githubUsername
            ? `Polling github.com/users/${githubUsername}/ssh_signing_keys every few seconds.`
            : "GitHub username not found in token claims. You may need to enroll manually after adding the key."}
          <Spinner size="md" className="pf-v6-u-ml-sm" />
        </Alert>
      </CardBody>
    </Card>
  );
};

export default GHEnroll;
