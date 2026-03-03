import { useParams } from "react-router-dom";
import { Spinner } from "@patternfly/react-core";
import { useResolvedExtensions } from "@openshift/dynamic-plugin-sdk";
import { isNavItem, pluginKeyFromName } from "../utils/extensions";
import { useScope } from "../contexts/ScopeContext";

export const ExtensionPage = () => {
  const { extensionPath } = useParams<{ extensionPath: string }>();
  const { clusterIdsForPlugin } = useScope();
  const [navExtensions, resolved] = useResolvedExtensions(isNavItem);

  if (!resolved) return <Spinner size="xl" />;

  const match = navExtensions.find((e) => e.properties.path === extensionPath);

  if (!match) return <div>Page not found.</div>;

  const pluginKey = pluginKeyFromName(match.pluginName);
  const clusterIds = clusterIdsForPlugin(pluginKey);

  const Component = match.properties.component;
  return <Component clusterIds={clusterIds} />;
};
