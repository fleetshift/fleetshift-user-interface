import { AppsConfig } from "@scalprum/core";
import { InstalledCluster } from "./api";

const PLUGIN_HOST = "http://localhost:8001";

const PLUGIN_DEFS: { key: string; name: string }[] = [
  { key: "core", name: "core-plugin" },
  { key: "observability", name: "observability-plugin" },
  { key: "nodes", name: "nodes-plugin" },
  { key: "networking", name: "networking-plugin" },
  { key: "storage", name: "storage-plugin" },
  { key: "upgrades", name: "upgrades-plugin" },
  { key: "alerts", name: "alerts-plugin" },
  { key: "cost", name: "cost-plugin" },
  { key: "deployments", name: "deployments-plugin" },
  { key: "logs", name: "logs-plugin" },
  { key: "pipelines", name: "pipelines-plugin" },
  { key: "config", name: "config-plugin" },
  { key: "gitops", name: "gitops-plugin" },
  { key: "events", name: "events-plugin" },
  { key: "routes", name: "routes-plugin" },
  { key: "operator", name: "operator-plugin" },
];

export function buildScalprumConfig(
  clusters: InstalledCluster[],
): AppsConfig<{ assetsHost: string }> {
  const config: AppsConfig<{ assetsHost: string }> = {};

  for (const def of PLUGIN_DEFS) {
    const hasPlugin = clusters.some((c) => c.plugins.includes(def.key));
    if (hasPlugin) {
      config[def.name] = {
        name: def.name,
        manifestLocation: `${PLUGIN_HOST}/${def.name}-manifest.json`,
        assetsHost: PLUGIN_HOST,
      };
    }
  }

  return config;
}
