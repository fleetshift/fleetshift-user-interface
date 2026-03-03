import { AppsConfig } from "@scalprum/core";
import { InstalledCluster } from "./api";

const PLUGIN_HOST = "http://localhost:8001";

export function buildScalprumConfig(
  clusters: InstalledCluster[],
): AppsConfig<{ assetsHost: string }> {
  const config: AppsConfig<{ assetsHost: string }> = {};

  const hasCore = clusters.some((c) => c.plugins.includes("core"));
  const hasObservability = clusters.some((c) =>
    c.plugins.includes("observability"),
  );

  if (hasCore) {
    config["core-plugin"] = {
      name: "core-plugin",
      manifestLocation: `${PLUGIN_HOST}/core-plugin-manifest.json`,
      assetsHost: PLUGIN_HOST,
    };
  }

  if (hasObservability) {
    config["observability-plugin"] = {
      name: "observability-plugin",
      manifestLocation: `${PLUGIN_HOST}/observability-plugin-manifest.json`,
      assetsHost: PLUGIN_HOST,
    };
  }

  return config;
}
