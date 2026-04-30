import { Router } from "express";
import { getPluginRegistry } from "../pluginRegistry";

const router = Router();

interface ClusterInfo {
  id: string;
  plugins: string[];
}

interface PluginManifest {
  name: string;
  version: string;
  extensions: Array<{
    type: string;
    properties: Record<string, unknown>;
  }>;
  registrationMethod: string;
  baseURL: string;
  loadScripts: string[];
}

interface PluginEntry {
  name: string;
  key: string;
  label: string;
  persona: "ops" | "dev";
  pluginManifest: PluginManifest;
}

interface PluginRegistry {
  assetsHost: string;
  plugins: Record<string, PluginEntry>;
}

interface PluginPage {
  id: string;
  title: string;
  path: string;
  scope: string;
  module: string;
  pluginKey: string;
}

function getClusters(): ClusterInfo[] {
  return [{ id: "management", plugins: ["management"] }];
}

function buildScalprumConfigServer(
  registry: PluginRegistry,
  clusters: ClusterInfo[],
) {
  const config: Record<string, unknown> = {};

  for (const [name, entry] of Object.entries(registry.plugins)) {
    const isAlwaysOn = entry.key === "management";
    const isInstalled = clusters.some((c) => c.plugins.includes(entry.key));
    if (isAlwaysOn || isInstalled) {
      config[name] = {
        name: entry.name,
        pluginManifest: entry.pluginManifest,
        manifestLocation: `${registry.assetsHost}/${entry.name}-manifest.json`,
        assetsHost: registry.assetsHost,
      };
    }
  }

  config["routing-plugin"] = {
    name: "routing-plugin",
    manifestLocation: `${registry.assetsHost}/routing-plugin-manifest.json`,
    assetsHost: registry.assetsHost,
  };

  return config;
}

const BUILTIN_PAGES: PluginPage[] = [
  {
    id: "orchestration-detail",
    title: "Orchestration Detail",
    path: "orchestration/:deploymentId",
    scope: "management-plugin",
    module: "DeploymentDetailPage",
    pluginKey: "management",
  },
];

function generatePluginPages(
  registry: PluginRegistry,
  clusters: ClusterInfo[],
): PluginPage[] {
  const pages: PluginPage[] = [...BUILTIN_PAGES];

  for (const [, entry] of Object.entries(registry.plugins)) {
    const isAlwaysOn = entry.key === "management";
    const isInstalled = clusters.some((c) => c.plugins.includes(entry.key));
    if (!isAlwaysOn && !isInstalled) continue;

    const manifest = entry.pluginManifest;
    if (!manifest?.extensions) continue;

    for (const ext of manifest.extensions) {
      if (ext.type !== "fleetshift.module") continue;

      const props = ext.properties as {
        label?: string;
        component?: { $codeRef?: string };
      };
      const label = props.label ?? entry.label;
      const codeRef = props.component?.$codeRef ?? "";
      const moduleName = codeRef.split(".")[0] || "";
      const slug = label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      if (pages.some((p) => p.path === slug)) continue;

      const pageId = `${entry.key}-${moduleName
        .replace(/^\.\//, "")
        .toLowerCase()}`;

      pages.push({
        id: pageId,
        title: label,
        path: slug,
        scope: entry.name,
        module: moduleName,
        pluginKey: entry.key,
      });
    }
  }

  return pages;
}

function generateDefaultNavLayout(
  pages: PluginPage[],
): Array<{ type: string; pageId: string }> {
  return pages
    .filter((p) => p.id !== "orchestration-detail")
    .map((p) => ({ type: "page" as const, pageId: p.id }));
}

router.get("/users/:id/config", (_req, res) => {
  const registry = getPluginRegistry() as PluginRegistry | null;
  if (!registry) {
    res.status(503).json({ error: "Plugin registry not yet available" });
    return;
  }

  const clusters = getClusters();
  const scalprumConfig = buildScalprumConfigServer(registry, clusters);
  const pluginPages = generatePluginPages(registry, clusters);
  const navLayout = generateDefaultNavLayout(pluginPages);
  const pluginEntries = Object.values(registry.plugins);

  res.json({
    scalprumConfig,
    pluginPages,
    navLayout,
    pluginEntries,
    assetsHost: registry.assetsHost,
  });
});

export default router;
