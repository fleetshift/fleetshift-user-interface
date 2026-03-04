import { Router } from "express";
import db from "../db";

const router = Router();

interface UserRow {
  id: string;
  username: string;
  display_name: string;
  role: string;
  nav_layout: string;
}

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
  res.json(pages[idx]);
});

// DELETE /users/:id/canvas-pages/:pageId
router.delete("/users/:id/canvas-pages/:pageId", (req, res) => {
  const pages = getCanvasPages(req.params.id);
  const filtered = pages.filter((p) => p.id !== req.params.pageId);
  setCanvasPages(req.params.id, filtered);
  res.json({ ok: true });
});

export default router;
