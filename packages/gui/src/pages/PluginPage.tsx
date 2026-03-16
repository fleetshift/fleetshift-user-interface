import {
  Spinner,
  EmptyState,
  EmptyStateBody,
  Bullseye,
} from "@patternfly/react-core";
import { CubesIcon } from "@patternfly/react-icons";
import { ScalprumComponent, useScalprum } from "@scalprum/react-core";
import { useScope } from "../contexts/ScopeContext";
import { pluginKeyFromName } from "../utils/extensions";

interface PluginPageProps {
  scope: string;
  module: string;
  pluginKey?: string;
}

export const PluginPage = ({ scope, module, pluginKey }: PluginPageProps) => {
  const { config: scalprumConfig } = useScalprum();
  const { clusterIdsForPlugin } = useScope();

  const key = pluginKey ?? pluginKeyFromName(scope);
  const clusterIds = clusterIdsForPlugin(key);
  const isAvailable = scope in scalprumConfig;

  if (!isAvailable) {
    return (
      <EmptyState
        icon={CubesIcon}
        headingLevel="h2"
        titleText="Plugin unavailable"
      >
        <EmptyStateBody>
          The <strong>{scope}</strong> plugin is not currently loaded. It may
          not be enabled on any connected cluster.
        </EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <ScalprumComponent
      key={`${scope}:${module}:${clusterIds.join(",")}`}
      scope={scope}
      module={module}
      fallback={
        <Bullseye>
          <Spinner size="xl" />
        </Bullseye>
      }
      ErrorComponent={
        <EmptyState
          icon={CubesIcon}
          headingLevel="h2"
          titleText="Failed to load"
        >
          <EmptyStateBody>
            An error occurred loading <strong>{module}</strong> from{" "}
            <strong>{scope}</strong>.
          </EmptyStateBody>
        </EmptyState>
      }
      {...{ clusterIds }}
    />
  );
};
