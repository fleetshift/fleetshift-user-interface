import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from "@patternfly/react-core";

export type OIDCEnrollProps = {
  step: string;
  enrollOidc: () => void;
};

const OIDCEnroll = ({ step, enrollOidc }: OIDCEnrollProps) => {
  return (
    <Card isCompact className="pf-v6-u-mt-lg">
      <CardHeader>
        <CardTitle>Register via OIDC provider</CardTitle>
      </CardHeader>
      <CardBody>
        <p>
          Your public key will be stored in your identity provider profile and a
          fresh token issued with the key claim.
        </p>
        <Button
          variant="primary"
          isLoading={step === "enrolling"}
          isDisabled={step === "enrolling"}
          onClick={enrollOidc}
          className="pf-v6-u-mt-sm"
        >
          Enroll signing key
        </Button>
      </CardBody>
    </Card>
  );
};

export default OIDCEnroll;
