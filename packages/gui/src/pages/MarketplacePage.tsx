import {
  Card,
  CardTitle,
  CardBody,
  Gallery,
  GalleryItem,
  Switch,
  Title,
} from "@patternfly/react-core";
import { useResolvedExtensions } from "@openshift/dynamic-plugin-sdk";
import { isNavItem, pluginKeyFromName } from "../utils/extensions";
import { useUserPreferences } from "../contexts/UserPreferencesContext";
import { useScope } from "../contexts/ScopeContext";

export const MarketplacePage = () => {
  const [navExtensions, resolved] = useResolvedExtensions(isNavItem);
  const { isPathEnabled, togglePath } = useUserPreferences();
  const { clusterIdsForPlugin } = useScope();

  // Deduplicate by path, only show extensions where at least one cluster has the plugin
  const seen = new Set<string>();
  const extensions = resolved
    ? navExtensions.filter((ext) => {
        if (seen.has(ext.properties.path)) return false;
        seen.add(ext.properties.path);
        const pluginKey = pluginKeyFromName(ext.pluginName);
        return clusterIdsForPlugin(pluginKey).length > 0;
      })
    : [];

  // Group by plugin origin (ops vs dev heuristic based on plugin name)
  const opsPlugins = [
    "core",
    "observability",
    "nodes",
    "networking",
    "storage",
    "upgrades",
    "alerts",
    "cost",
  ];

  const opsExtensions = extensions.filter((ext) =>
    opsPlugins.includes(pluginKeyFromName(ext.pluginName)),
  );
  const devExtensions = extensions.filter(
    (ext) => !opsPlugins.includes(pluginKeyFromName(ext.pluginName)),
  );

  const renderCard = (ext: (typeof extensions)[0]) => (
    <GalleryItem key={ext.uid}>
      <Card isCompact>
        <CardTitle>{ext.properties.label}</CardTitle>
        <CardBody>
          <p style={{ marginBottom: 8, color: "#6a6e73", fontSize: 14 }}>
            Plugin: {ext.pluginName}
          </p>
          <Switch
            id={`toggle-${ext.properties.path}`}
            label="Show in nav"
            isChecked={isPathEnabled(ext.properties.path)}
            onChange={() => togglePath(ext.properties.path)}
          />
        </CardBody>
      </Card>
    </GalleryItem>
  );

  return (
    <>
      <Title headingLevel="h1" style={{ marginBottom: 16 }}>
        Marketplace
      </Title>

      {opsExtensions.length > 0 && (
        <>
          <Title headingLevel="h2" style={{ marginBottom: 8 }}>
            Ops
          </Title>
          <Gallery hasGutter style={{ marginBottom: 24 }}>
            {opsExtensions.map(renderCard)}
          </Gallery>
        </>
      )}

      {devExtensions.length > 0 && (
        <>
          <Title headingLevel="h2" style={{ marginBottom: 8 }}>
            Dev
          </Title>
          <Gallery hasGutter>{devExtensions.map(renderCard)}</Gallery>
        </>
      )}
    </>
  );
};
