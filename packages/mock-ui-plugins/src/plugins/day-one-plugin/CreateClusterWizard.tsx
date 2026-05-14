import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  PageSection,
  Stack,
  StackItem,
  Title,
  Content,
  Wizard,
  WizardStep,
} from "@patternfly/react-core";
import { buildSignedInputEnvelope } from "@fleetshift/common";
import { createDeployment } from "../management-plugin/api";
import { useSigningKey } from "../management-plugin/useSigningKey";
import ClusterDetailsStep from "./ClusterDetailsStep";
import NetworkingStep from "./NetworkingStep";
import NodesStep from "./NodesStep";
import SettingsStep from "./SettingsStep";
import ReviewStep from "./ReviewStep";

export interface NodeEntry {
  role: "control-plane" | "worker";
  image: string;
}

export interface ClusterFormData {
  name: string;
  nodeImage: string;
  apiServerPort: number;
  podSubnet: string;
  serviceSubnet: string;
  nodes: NodeEntry[];
  signDeployment: boolean;
}

const initialFormData: ClusterFormData = {
  name: "",
  nodeImage: "",
  apiServerPort: 0,
  podSubnet: "",
  serviceSubnet: "",
  nodes: [{ role: "control-plane", image: "" }],
  signDeployment: false,
};

export default function CreateClusterWizard() {
  const navigate = useNavigate();
  const { loaded: signingLoaded, enrolled, signDeployment } = useSigningKey();
  const [formData, setFormData] = useState<ClusterFormData>(initialFormData);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = useCallback(
    <K extends keyof ClusterFormData>(field: K, value: ClusterFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleCancel = useCallback(() => {
    navigate("/day-one/welcome");
  }, [navigate]);

  const handleSubmit = useCallback(async () => {
    if (!formData.name.trim()) {
      setError("Cluster name is required.");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const spec: Record<string, unknown> = {
        name: formData.name.trim(),
      };

      const nodes = formData.nodes
        .filter((n) => n.role)
        .map((n) => ({
          role: n.role,
          ...(n.image || formData.nodeImage
            ? { image: n.image || formData.nodeImage }
            : {}),
        }));
      if (nodes.length > 0) {
        spec.nodes = nodes;
      }

      const networking: Record<string, unknown> = {};
      if (formData.apiServerPort > 0) {
        networking.apiServerPort = formData.apiServerPort;
      }
      if (formData.podSubnet.trim()) {
        networking.podSubnet = formData.podSubnet.trim();
      }
      if (formData.serviceSubnet.trim()) {
        networking.serviceSubnet = formData.serviceSubnet.trim();
      }
      if (Object.keys(networking).length > 0) {
        spec.networking = networking;
      }

      const specJson = JSON.stringify(spec);
      const rawBase64 = btoa(specJson);

      let userSignature: string | undefined;
      let validUntil: string | undefined;
      let expectedGeneration: number | undefined;

      if (formData.signDeployment && enrolled) {
        const validUntilDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
        validUntil = validUntilDate.toISOString();
        expectedGeneration = 1;

        const envelope = buildSignedInputEnvelope(
          formData.name.trim(),
          {
            type: "inline",
            manifests: [
              {
                resourceType: "api.kind.cluster",
                content: JSON.parse(specJson),
              },
            ],
          },
          { type: "all" },
          validUntilDate,
          [],
          expectedGeneration,
        );

        const envelopeBytes = new TextEncoder().encode(envelope);
        userSignature = await signDeployment(envelopeBytes);
      }

      await createDeployment({
        deploymentId: formData.name.trim(),
        deployment: {
          manifestStrategy: {
            type: "TYPE_INLINE",
            manifests: [
              { resourceType: "api.kind.cluster", raw: rawBase64 },
            ],
          },
          placementStrategy: { type: "TYPE_ALL" },
        },
        userSignature,
        validUntil,
        expectedGeneration,
      });

      navigate("/day-one/welcome");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  }, [formData, enrolled, signDeployment, navigate]);

  const isStep1Valid = formData.name.trim().length > 0;

  return (
    <PageSection>
      <Stack hasGutter>
        <StackItem>
          <Title headingLevel="h1" size="xl">
            Create a cluster for OpenShift Management Engine
          </Title>
          <Content component="p">
            Configuring a dedicated cluster to offload management engine
            operations and add-ons.
          </Content>
        </StackItem>

        {error && (
          <StackItem>
            <Alert
              variant="danger"
              title="Cluster creation failed"
              isInline
              actionClose={
                <button
                  className="pf-v6-c-alert__action-close"
                  onClick={() => setError(null)}
                />
              }
            >
              {error}
            </Alert>
          </StackItem>
        )}

        <StackItem>
          <Wizard onClose={handleCancel} height={500}>
            <WizardStep
              name="Cluster details"
              id="cluster-details"
              status={isStep1Valid ? "default" : "error"}
              isDisabled={creating}
            >
              <ClusterDetailsStep
                formData={formData}
                onChange={updateField}
              />
            </WizardStep>

            <WizardStep
              name="Networking"
              id="networking"
              isDisabled={!isStep1Valid || creating}
            >
              <NetworkingStep formData={formData} onChange={updateField} />
            </WizardStep>

            <WizardStep
              name="Nodes"
              id="nodes"
              isDisabled={!isStep1Valid || creating}
            >
              <NodesStep formData={formData} onChange={updateField} />
            </WizardStep>

            <WizardStep
              name="Settings"
              id="settings"
              isDisabled={!isStep1Valid || creating}
            >
              <SettingsStep
                formData={formData}
                onChange={updateField}
                signingLoaded={signingLoaded}
                signingEnrolled={enrolled}
              />
            </WizardStep>

            <WizardStep
              name="Review"
              id="review"
              isDisabled={!isStep1Valid || creating}
              footer={{
                nextButtonText: creating
                  ? "Creating..."
                  : "Create cluster",
                onNext: handleSubmit,
                isNextDisabled: creating,
              }}
            >
              <ReviewStep formData={formData} />
            </WizardStep>
          </Wizard>
        </StackItem>
      </Stack>
    </PageSection>
  );
}
