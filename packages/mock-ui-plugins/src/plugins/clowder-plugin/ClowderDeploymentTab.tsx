import { useMemo } from "react";
import {
  Bullseye,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  EmptyState,
  EmptyStateBody,
  Label,
  LabelGroup,
  Spinner,
  Stack,
  StackItem,
  Title,
} from "@patternfly/react-core";
import { useClowderStore } from "./clowderStore";

interface DeploymentTabProps {
  deploymentId: string;
  deploymentName: string;
  namespace: string;
  clusterId: string;
}

const ClowderDeploymentTab: React.FC<DeploymentTabProps> = ({
  deploymentName,
}) => {
  const { apps, loading } = useClowderStore();

  const matchedApp = useMemo(
    () =>
      apps.find((app) =>
        app.deployments.some((d) => `${app.name}-${d.name}` === deploymentName),
      ),
    [apps, deploymentName],
  );

  if (loading) {
    return (
      <Bullseye style={{ padding: "var(--pf-t--global--spacer--2xl) 0" }}>
        <Spinner />
      </Bullseye>
    );
  }

  if (!matchedApp) {
    return (
      <EmptyState titleText="Not a ClowdApp deployment" headingLevel="h3">
        <EmptyStateBody>
          This deployment is not managed by a ClowdApp.
        </EmptyStateBody>
      </EmptyState>
    );
  }

  const matchedDeploy = matchedApp.deployments.find(
    (d) => `${matchedApp.name}-${d.name}` === deploymentName,
  );

  return (
    <Stack hasGutter>
      <StackItem>
        <Title headingLevel="h3" size="lg">
          ClowdApp: {matchedApp.name}
        </Title>
      </StackItem>
      <StackItem>
        <DescriptionList isCompact isHorizontal>
          <DescriptionListGroup>
            <DescriptionListTerm>ClowdApp</DescriptionListTerm>
            <DescriptionListDescription>
              <Label color="blue" isCompact>
                {matchedApp.name}
              </Label>
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Environment</DescriptionListTerm>
            <DescriptionListDescription>
              <Label color="blue" isCompact>
                {matchedApp.envName}
              </Label>
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Namespace</DescriptionListTerm>
            <DescriptionListDescription>
              {matchedApp.namespace}
            </DescriptionListDescription>
          </DescriptionListGroup>
          {matchedDeploy && (
            <>
              <DescriptionListGroup>
                <DescriptionListTerm>Image</DescriptionListTerm>
                <DescriptionListDescription>
                  <code
                    style={{
                      fontSize: "var(--pf-t--global--font--size--xs)",
                      wordBreak: "break-all",
                    }}
                  >
                    {matchedDeploy.image}
                  </code>
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Public</DescriptionListTerm>
                <DescriptionListDescription>
                  <Label
                    color={matchedDeploy.public ? "green" : "grey"}
                    isCompact
                  >
                    {matchedDeploy.public ? "Yes" : "No"}
                  </Label>
                </DescriptionListDescription>
              </DescriptionListGroup>
            </>
          )}
          <DescriptionListGroup>
            <DescriptionListTerm>Status</DescriptionListTerm>
            <DescriptionListDescription>
              <Label
                color={
                  matchedApp.readyDeployments === matchedApp.managedDeployments
                    ? "green"
                    : "orange"
                }
                isCompact
              >
                {matchedApp.readyDeployments}/{matchedApp.managedDeployments}{" "}
                ready
              </Label>
            </DescriptionListDescription>
          </DescriptionListGroup>
          {matchedApp.dependencies.length > 0 && (
            <DescriptionListGroup>
              <DescriptionListTerm>Dependencies</DescriptionListTerm>
              <DescriptionListDescription>
                <LabelGroup>
                  {matchedApp.dependencies.map((d) => (
                    <Label key={d} color="blue" isCompact>
                      {d}
                    </Label>
                  ))}
                </LabelGroup>
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {matchedApp.optionalDependencies.length > 0 && (
            <DescriptionListGroup>
              <DescriptionListTerm>Optional Deps</DescriptionListTerm>
              <DescriptionListDescription>
                <LabelGroup>
                  {matchedApp.optionalDependencies.map((d) => (
                    <Label key={d} color="grey" isCompact>
                      {d}
                    </Label>
                  ))}
                </LabelGroup>
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {matchedApp.database && (
            <DescriptionListGroup>
              <DescriptionListTerm>Database</DescriptionListTerm>
              <DescriptionListDescription>
                {matchedApp.database.name ?? "yes"}
                {matchedApp.database.version
                  ? ` (v${matchedApp.database.version})`
                  : ""}
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {matchedApp.inMemoryDb && (
            <DescriptionListGroup>
              <DescriptionListTerm>In-Memory DB</DescriptionListTerm>
              <DescriptionListDescription>
                <Label color="blue" isCompact>
                  Enabled
                </Label>
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {matchedApp.kafkaTopics.length > 0 && (
            <DescriptionListGroup>
              <DescriptionListTerm>Kafka Topics</DescriptionListTerm>
              <DescriptionListDescription>
                <LabelGroup>
                  {matchedApp.kafkaTopics.map((t) => (
                    <Label key={t.topicName} color="purple" isCompact>
                      {t.topicName}
                      {t.partitions ? ` (${t.partitions}p)` : ""}
                    </Label>
                  ))}
                </LabelGroup>
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {matchedApp.featureFlags && (
            <DescriptionListGroup>
              <DescriptionListTerm>Feature Flags</DescriptionListTerm>
              <DescriptionListDescription>
                <Label color="blue" isCompact>
                  Enabled
                </Label>
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {matchedApp.jobs.length > 0 && (
            <DescriptionListGroup>
              <DescriptionListTerm>Jobs</DescriptionListTerm>
              <DescriptionListDescription>
                <LabelGroup>
                  {matchedApp.jobs.map((j) => (
                    <Label key={j} color="grey" isCompact>
                      {j}
                    </Label>
                  ))}
                </LabelGroup>
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
        </DescriptionList>
      </StackItem>
    </Stack>
  );
};

export default ClowderDeploymentTab;
