import { getStore } from "./clowderStore";

export function isApplicable(props: { deploymentName: string }): boolean {
  const { apps } = getStore().getState();
  return apps.some((app) =>
    app.deployments.some(
      (d) => `${app.name}-${d.name}` === props.deploymentName,
    ),
  );
}
