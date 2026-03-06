import { AppsConfig } from "@scalprum/core";
import { InstalledCluster } from "./api";
import { PluginRegistry } from "../contexts/PluginRegistryContext";

export function buildScalprumConfig(
  registry: PluginRegistry,
  clusters: InstalledCluster[],
): AppsConfig<{ assetsHost: string }> {
  const config: AppsConfig<{ assetsHost: string }> = {};

  for (const [name, entry] of Object.entries(registry.plugins)) {
    if (clusters.some((c) => c.plugins.includes(entry.key))) {
      config[name] = {
        name: entry.name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pluginManifest: entry.pluginManifest as any,
        assetsHost: registry.assetsHost,
      };
    }
  }

  // Always include utility plugins (not cluster-specific)
  config["routing-plugin"] = {
    name: "routing-plugin",
    manifestLocation: `${registry.assetsHost}/routing-plugin-manifest.json`,
    assetsHost: registry.assetsHost,
  };

  return config;
}
