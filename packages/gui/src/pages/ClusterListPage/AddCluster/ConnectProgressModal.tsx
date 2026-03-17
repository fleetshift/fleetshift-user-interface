import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ProgressStepper,
  ProgressStep,
} from "@patternfly/react-core";
import type { StepState, StepStatus } from "./types";

function stepVariant(
  status: StepStatus,
): "pending" | "info" | "success" | "danger" {
  switch (status) {
    case "pending":
      return "pending";
    case "running":
      return "info";
    case "done":
      return "success";
    case "error":
      return "danger";
  }
}

export const ConnectProgressModal: React.FC<{
  isOpen: boolean;
  clusterName: string;
  steps: StepState[];
  connectError: string | null;
  clusterId: string | null;
  onRetry: () => void;
  onCancel: () => void;
}> = ({
  isOpen,
  clusterName,
  steps,
  connectError,
  clusterId,
  onRetry,
  onCancel,
}) => {
  const navigate = useNavigate();
  const allDone = steps.every((s) => s.status === "done");
  const hasError = !!connectError;

  useEffect(() => {
    if (allDone && clusterId) {
      const timer = setTimeout(() => navigate(`/clusters/${clusterId}`), 2000);
      return () => clearTimeout(timer);
    }
  }, [allDone, clusterId, navigate]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={hasError ? onCancel : undefined}
      aria-labelledby="add-cluster-progress"
      aria-describedby="add-cluster-progress-description"
      onEscapePress={hasError ? onCancel : (e) => e.preventDefault()}
      variant="medium"
    >
      <ModalHeader
        title={
          hasError
            ? "Connection failed"
            : allDone
              ? "Cluster connected"
              : `Connecting to ${clusterName}...`
        }
        titleIconVariant={hasError ? "danger" : allDone ? "success" : undefined}
        labelId="add-cluster-progress"
      />
      <ModalBody id="add-cluster-progress-description">
        <ProgressStepper>
          {steps.map((step) => (
            <ProgressStep
              key={step.key}
              id={step.key}
              titleId={`${step.key}-title`}
              variant={stepVariant(step.status)}
              isCurrent={step.status === "running"}
              description={step.detail}
            >
              {step.label}
            </ProgressStep>
          ))}
        </ProgressStepper>
        {connectError && (
          <Alert
            variant="danger"
            isInline
            title={connectError}
            style={{ marginTop: "var(--pf-t--global--spacer--md)" }}
          />
        )}
        {allDone && (
          <Alert
            variant="success"
            isInline
            title="Cluster connected successfully"
            style={{ marginTop: "var(--pf-t--global--spacer--md)" }}
          >
            Redirecting to cluster details...
          </Alert>
        )}
      </ModalBody>
      <ModalFooter>
        <div tabIndex={0}>
          {hasError ? (
            <>
              <Button variant="primary" onClick={onRetry}>
                Retry
              </Button>
              <Button variant="link" onClick={onCancel}>
                Cancel
              </Button>
            </>
          ) : allDone && clusterId ? (
            <Button
              variant="primary"
              onClick={() => navigate(`/clusters/${clusterId}`)}
            >
              View Cluster
            </Button>
          ) : (
            <Button variant="link" isDisabled>
              Connecting...
            </Button>
          )}
        </div>
      </ModalFooter>
    </Modal>
  );
};
