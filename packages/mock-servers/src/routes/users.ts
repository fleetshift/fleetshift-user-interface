import { Router } from "express";
import db from "../db";
import { broadcast, createWsTicket } from "../ws";
import { getPluginRegistry } from "../pluginRegistry";

const router = Router();

interface UserRow {
  id: string;
  username: string;
  display_name: string;
  role: string;
  nav_layout: string;
  canvas_pages: string;
}

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

// --- Plugin Pages ---
// A plugin page maps a route to a specific plugin module.
interface PluginPage {
  id: string;
  title: string;
  path: string;
  scope: string; // plugin name, e.g. "core-plugin"
  module: string; // exposed module, e.g. "PodList"
  pluginKey: string; // e.g. "core" — used to check if plugin is enabled
}

// Live clusters from K8s mode — set by the server at startup
let liveClusters: ClusterInfo[] | null = null;

export function setLiveClusters(clusters: ClusterInfo[]): void {
  liveClusters = clusters;
}

function getClusters(): ClusterInfo[] {
  if (liveClusters) return liveClusters;

  const rows = db.prepare("SELECT id, plugins FROM clusters").all() as Array<{
    id: string;
    plugins: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    plugins: JSON.parse(r.plugins) as string[],
  }));
}

function buildScalprumConfigServer(
  registry: PluginRegistry,
  clusters: ClusterInfo[],
) {
  const config: Record<string, unknown> = {};

  for (const [name, entry] of Object.entries(registry.plugins)) {
    if (clusters.some((c) => c.plugins.includes(entry.key))) {
      config[name] = {
        name: entry.name,
        pluginManifest: entry.pluginManifest,
        manifestLocation: `${registry.assetsHost}/${entry.name}-manifest.json`,
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

// Built-in pages from core-plugin (always available, not tied to a specific cluster plugin)
const BUILTIN_PAGES: PluginPage[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    path: "",
    scope: "core-plugin",
    module: "Dashboard",
    pluginKey: "core",
  },
  {
    id: "clusters",
    title: "Clusters",
    path: "clusters",
    scope: "core-plugin",
    module: "ClusterListPage",
    pluginKey: "core",
  },
  {
    id: "cluster-detail",
    title: "Cluster Detail",
    path: "clusters/:clusterId",
    scope: "core-plugin",
    module: "ClusterDetailPage",
    pluginKey: "core",
  },
  {
    id: "pod-detail",
    title: "Pod Detail",
    path: "pods/:podId",
    scope: "core-plugin",
    module: "PodDetailPage",
    pluginKey: "core",
  },
  {
    id: "deployment-detail",
    title: "Deployment Detail",
    path: "deployments/:deployId",
    scope: "deployments-plugin",
    module: "DeploymentDetailPage",
    pluginKey: "deployments",
  },
];

function generatePluginPages(
  registry: PluginRegistry,
  clusters: ClusterInfo[],
): PluginPage[] {
  const pages: PluginPage[] = [...BUILTIN_PAGES];

  for (const [, entry] of Object.entries(registry.plugins)) {
    const isInstalled = clusters.some((c) => c.plugins.includes(entry.key));
    if (!isInstalled) continue;

    const manifest = entry.pluginManifest;
    if (!manifest?.extensions) continue;

    for (const ext of manifest.extensions) {
      if (ext.type !== "fleetshift.module") continue;

      const props = ext.properties as {
        label?: string;
        component?: { $codeRef?: string };
      };
      const label = props.label ?? entry.label;
      // Extract module name from $codeRef (e.g. "PodList.default" → "PodList")
      const codeRef = props.component?.$codeRef ?? "";
      const moduleName = codeRef.split(".")[0] || "";
      const slug = label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      // Avoid duplicates
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
  // Exclude built-in pages (dashboard/clusters) — shell handles those separately
  return pages
    .filter(
      (p) =>
        p.id !== "dashboard" &&
        p.id !== "clusters" &&
        p.id !== "cluster-detail" &&
        p.id !== "pod-detail" &&
        p.id !== "deployment-detail",
    )
    .map((p) => ({ type: "page" as const, pageId: p.id }));
}

// GET /users/:id/config — full per-user config payload
router.get("/users/:id/config", (req, res) => {
  const user = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(req.params.id) as UserRow | undefined;

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const registry = getPluginRegistry() as PluginRegistry | null;
  if (!registry) {
    res.status(503).json({ error: "Plugin registry not yet available" });
    return;
  }

  const clusters = getClusters();
  const scalprumConfig = buildScalprumConfigServer(registry, clusters);
  const pluginPages = generatePluginPages(registry, clusters);

  let navLayout = JSON.parse(user.nav_layout);

  // Auto-generate default nav layout for users with empty config
  if (navLayout.length === 0) {
    navLayout = generateDefaultNavLayout(pluginPages);
    db.prepare("UPDATE users SET nav_layout = ? WHERE id = ?").run(
      JSON.stringify(navLayout),
      user.id,
    );
  }

  const pluginEntries = Object.values(registry.plugins);

  res.json({
    scalprumConfig,
    pluginPages,
    navLayout,
    pluginEntries,
    assetsHost: registry.assetsHost,
  });
});

// POST /ws/ticket — issue a one-time ticket for WS authentication
router.post("/ws/ticket", (req, res) => {
  if (process.env.NO_AUTH === "1") {
    const fallback = db.prepare("SELECT id FROM users LIMIT 1").get() as
      | { id: string }
      | undefined;
    const userId = fallback?.id ?? "user-ops";
    const ticket = createWsTicket(userId);
    res.json({ ticket });
    return;
  }

  const tokenUser = req.user;
  if (!tokenUser) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const user = db
    .prepare("SELECT id FROM users WHERE username = ?")
    .get(tokenUser.username) as { id: string } | undefined;

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const ticket = createWsTicket(user.id);
  res.json({ ticket });
});

// POST /auth/login — login by username
router.post("/auth/login", (req, res) => {
  const { username } = req.body as { username: string };
  const user = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username) as UserRow | undefined;

  if (!user) {
    res.status(401).json({ error: "Unknown user" });
    return;
  }

  res.json({
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    role: user.role,
    navLayout: JSON.parse(user.nav_layout),
  });
});

// GET /users/:id/preferences — get nav layout
router.get("/users/:id/preferences", (req, res) => {
  const user = db
    .prepare("SELECT nav_layout FROM users WHERE id = ?")
    .get(req.params.id) as { nav_layout: string } | undefined;

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ navLayout: JSON.parse(user.nav_layout) });
});

// PUT /users/:id/preferences — replace nav layout
router.put("/users/:id/preferences", (req, res) => {
  const { navLayout } = req.body as { navLayout: unknown };
  if (!Array.isArray(navLayout)) {
    res.status(400).json({ error: "navLayout must be an array" });
    return;
  }

  db.prepare("UPDATE users SET nav_layout = ? WHERE id = ?").run(
    JSON.stringify(navLayout),
    req.params.id,
  );

  const originSessionId = req.headers["x-session-id"] as string | undefined;
  broadcast("nav_layout", { userId: req.params.id, originSessionId });
  res.json({ navLayout });
});

export default router;
