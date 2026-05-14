import {
  Alert,
  Form,
  FormGroup,
  Spinner,
  Switch,
} from "@patternfly/react-core";
import type { ClusterFormData } from "./CreateClusterWizard";

interface SettingsStepProps {
  formData: ClusterFormData;
  onChange: <K extends keyof ClusterFormData>(
    field: K,
    value: ClusterFormData[K],
  ) => void;
  signingLoaded: boolean;
  signingEnrolled: boolean;
}

export default function SettingsStep({
  formData,
  onChange,
  signingLoaded,
  signingEnrolled,
}: SettingsStepProps) {
  return (
    <Form>
      <FormGroup label="Deployment signing" fieldId="sign-deployment">
        {!signingLoaded ? (
          <Spinner size="md" />
        ) : !signingEnrolled ? (
          <Alert
            variant="info"
            isInline
            isPlain
            title="No signing key enrolled. Enroll a key on the Signing Keys page to sign deployments."
          />
        ) : (
          <Switch
            id="sign-deployment"
            label="Sign this deployment"
            isChecked={formData.signDeployment}
            onChange={(_e, checked) => onChange("signDeployment", checked)}
          />
        )}
      </FormGroup>

      <FormGroup label="Placement" fieldId="placement">
        <Alert
          variant="info"
          isInline
          isPlain
          title="Cluster will be created on all available targets (kind-local)."
        />
      </FormGroup>
    </Form>
  );
}
