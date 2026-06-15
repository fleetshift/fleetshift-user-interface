import "./ExtensionEnablePage.scss";

import {
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
} from "@patternfly/react-core";
import { OptimizeIcon } from "@patternfly/react-icons";
import { useCallback, useState } from "react";

import InstallProgress from "../components/InstallProgress/InstallProgress";

type Phase = "idle" | "installing" | "done";

interface ExtensionEnablePageProps {
  label: string;
  description: string;
  onInstall: () => void;
}

export const ExtensionEnablePage = ({
  label,
  description,
  onInstall,
}: ExtensionEnablePageProps) => {
  const [phase, setPhase] = useState<Phase>("idle");

  const handleEnable = useCallback(() => {
    setPhase("installing");
  }, []);

  const handleComplete = useCallback(() => {
    setPhase("done");
    onInstall();
  }, [onInstall]);

  if (phase === "installing") {
    return (
      <div className="ome-enable-page">
        <EmptyState
          icon={OptimizeIcon}
          headingLevel="h2"
          titleText={`Enabling ${label}...`}
          variant="lg"
        >
          <EmptyStateBody>
            <InstallProgress onComplete={handleComplete} />
          </EmptyStateBody>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="ome-enable-page">
      <EmptyState
        icon={OptimizeIcon}
        headingLevel="h2"
        titleText={`Enable ${label}`}
        variant="lg"
      >
        <EmptyStateBody>{description}</EmptyStateBody>
        <EmptyStateFooter>
          <EmptyStateActions>
            <Button variant="primary" onClick={handleEnable}>
              Enable
            </Button>
          </EmptyStateActions>
        </EmptyStateFooter>
      </EmptyState>
    </div>
  );
};
