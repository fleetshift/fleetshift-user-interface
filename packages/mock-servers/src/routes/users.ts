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

// Live clusters from K8s mode — set by the server at startup
let liveClusters: ClusterInfo[] | null = null;

export function setLiveClusters(clusters: ClusterInfo[]): void {
  liveClusters = clusters;
}

function getClusters(): ClusterInfo[] {
  // In live mode, use the K8s-discovered clusters
  if (liveClusters) return liveClusters;

  // In mock mode, read from SQLite
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

function generateDefaultConfig(
  registry: PluginRegistry,
  clusters: ClusterInfo[],
  userId: string,
) {
  const pages: CanvasPage[] = [];
  const navLayout: Array<{ type: string; pageId?: string }> = [];

  for (const [, entry] of Object.entries(registry.plugins)) {
    // Only include plugins that are installed on at least one cluster
    const isInstalled = clusters.some((c) => c.plugins.includes(entry.key));
    if (!isInstalled) continue;

    const manifest = entry.pluginManifest;
    if (!manifest.extensions) continue;

    for (const ext of manifest.extensions) {
      if (ext.type !== "fleetshift.module") continue;

      const props = ext.properties as {
        label?: string;
        module?: string;
      };
      const label = props.label ?? entry.label;
      const moduleName = props.module ?? "";
      const slug = label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      // Avoid duplicate paths
      if (pages.some((p) => p.path === slug)) continue;

      const pageId = `auto-${entry.name}-${moduleName.replace(/^\.\//, "")}`;
      pages.push({
        id: pageId,
        title: label,
        path: slug,
        modules: [
          {
            i: `${pageId}-1`,
            x: 0,
            y: 0,
            w: 12,
            h: 14,
            moduleRef: {
              scope: entry.name,
              module: moduleName,
              label,
            },
          },
        ],
      });

      navLayout.push({ type: "page", pageId });
    }
  }

  // Persist to DB
  db.prepare(
    "UPDATE users SET canvas_pages = ?, nav_layout = ? WHERE id = ?",
  ).run(JSON.stringify(pages), JSON.stringify(navLayout), userId);

  return { pages, navLayout };
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

  let canvasPages: CanvasPage[] = JSON.parse(user.canvas_pages);
  let navLayout = JSON.parse(user.nav_layout);

  // Auto-generate defaults for new users with empty config
  if (canvasPages.length === 0 && navLayout.length === 0) {
    const generated = generateDefaultConfig(registry, clusters, user.id);
    canvasPages = generated.pages;
    navLayout = generated.navLayout;
  }

  const pluginEntries = Object.values(registry.plugins);

  res.json({
    scalprumConfig,
    canvasPages,
    navLayout,
    pluginEntries,
    assetsHost: registry.assetsHost,
  });
});

// POST /ws/ticket — issue a one-time ticket for WS authentication
router.post("/ws/ticket", (req, res) => {
  // When NO_AUTH=1, skip JWT checks and use a default user
  if (process.env.NO_AUTH === "1") {
    const fallback = db.prepare("SELECT id FROM users LIMIT 1").get() as
      | { id: string }
      | undefined;
    const userId = fallback?.id ?? "user-ops";
    const ticket = createWsTicket(userId);
    res.json({ ticket });
    return;
  }

  // req.user is set by jwtAuthMiddleware (username from JWT)
  const tokenUser = req.user;
  if (!tokenUser) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  // Look up the DB user ID from the JWT username
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

// --- Canvas Pages CRUD ---

interface CanvasPage {
  id: string;
  title: string;
  path: string;
  modules: unknown[];
}

const PATH_RE = /^[a-z0-9][a-z0-9-]*(\/[a-z0-9][a-z0-9-]*)*$/;
const RESERVED_SEGMENTS = new Set(["", "clusters", "navigation", "pages"]);

function getCanvasPages(userId: string): CanvasPage[] {
  const row = db
    .prepare("SELECT canvas_pages FROM users WHERE id = ?")
    .get(userId) as { canvas_pages: string } | undefined;
  if (!row) return [];
  return JSON.parse(row.canvas_pages);
}

function setCanvasPages(userId: string, pages: CanvasPage[]): void {
  db.prepare("UPDATE users SET canvas_pages = ? WHERE id = ?").run(
    JSON.stringify(pages),
    userId,
  );
}

// GET /users/:id/canvas-pages
router.get("/users/:id/canvas-pages", (req, res) => {
  const user = db
    .prepare("SELECT id FROM users WHERE id = ?")
    .get(req.params.id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ pages: getCanvasPages(req.params.id) });
});

// POST /users/:id/canvas-pages
router.post("/users/:id/canvas-pages", (req, res) => {
  const user = db
    .prepare("SELECT id FROM users WHERE id = ?")
    .get(req.params.id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const { title, path } = req.body as { title: string; path: string };

  if (!path || !PATH_RE.test(path)) {
    res.status(400).json({ error: "Invalid path format" });
    return;
  }
  if (RESERVED_SEGMENTS.has(path.split("/")[0])) {
    res.status(400).json({ error: `"${path}" is a reserved path` });
    return;
  }

  const pages = getCanvasPages(req.params.id);
  if (pages.some((p) => p.path === path)) {
    res.status(400).json({ error: `Path "${path}" is already in use` });
    return;
  }

  const page: CanvasPage = {
    id: `canvas-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: title || "Untitled Page",
    path,
    modules: [],
  };
  pages.push(page);
  setCanvasPages(req.params.id, pages);
  const originSessionId = req.headers["x-session-id"] as string | undefined;
  broadcast("canvas_pages", { userId: req.params.id, originSessionId });
  res.json(page);
});

// PUT /users/:id/canvas-pages/:pageId
router.put("/users/:id/canvas-pages/:pageId", (req, res) => {
  const pages = getCanvasPages(req.params.id);
  const idx = pages.findIndex((p) => p.id === req.params.pageId);
  if (idx === -1) {
    res.status(404).json({ error: "Page not found" });
    return;
  }
  const { title, path, modules } = req.body as {
    title?: string;
    path?: string;
    modules?: unknown[];
  };

  if (path !== undefined) {
    if (!PATH_RE.test(path)) {
      res.status(400).json({ error: "Invalid path format" });
      return;
    }
    if (RESERVED_SEGMENTS.has(path.split("/")[0])) {
      res.status(400).json({ error: `"${path}" is a reserved path` });
      return;
    }
    if (pages.some((p) => p.path === path && p.id !== req.params.pageId)) {
      res.status(400).json({ error: `Path "${path}" is already in use` });
      return;
    }
    pages[idx].path = path;
  }

  if (title !== undefined) pages[idx].title = title;
  if (modules !== undefined) pages[idx].modules = modules;
  setCanvasPages(req.params.id, pages);
  const originSessionId = req.headers["x-session-id"] as string | undefined;
  broadcast("canvas_pages", { userId: req.params.id, originSessionId });
  res.json(pages[idx]);
});

// DELETE /users/:id/canvas-pages/:pageId
router.delete("/users/:id/canvas-pages/:pageId", (req, res) => {
  const pages = getCanvasPages(req.params.id);
  const filtered = pages.filter((p) => p.id !== req.params.pageId);
  setCanvasPages(req.params.id, filtered);
  const originSessionId = req.headers["x-session-id"] as string | undefined;
  broadcast("canvas_pages", { userId: req.params.id, originSessionId });
  res.json({ ok: true });
});

export default router;
