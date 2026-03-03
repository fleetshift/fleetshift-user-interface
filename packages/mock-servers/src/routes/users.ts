import { Router } from "express";
import db from "../db";

const router = Router();

interface UserRow {
  id: string;
  username: string;
  display_name: string;
  role: string;
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

  const prefs = db
    .prepare("SELECT extension_path FROM user_nav_prefs WHERE user_id = ?")
    .all(user.id) as { extension_path: string }[];

  res.json({
    ...user,
    enabledPaths: prefs.map((p) => p.extension_path),
  });
});

// GET /users/:id/preferences — get enabled paths
router.get("/users/:id/preferences", (req, res) => {
  const prefs = db
    .prepare("SELECT extension_path FROM user_nav_prefs WHERE user_id = ?")
    .all(req.params.id) as { extension_path: string }[];

  res.json({ enabledPaths: prefs.map((p) => p.extension_path) });
});

// PUT /users/:id/preferences — replace enabled paths
router.put("/users/:id/preferences", (req, res) => {
  const { paths } = req.body as { paths: string[] };
  if (!Array.isArray(paths)) {
    res.status(400).json({ error: "paths must be an array" });
    return;
  }

  const deleteAll = db.prepare("DELETE FROM user_nav_prefs WHERE user_id = ?");
  const insertPref = db.prepare(
    "INSERT INTO user_nav_prefs (user_id, extension_path) VALUES (?, ?)",
  );

  db.transaction(() => {
    deleteAll.run(req.params.id);
    for (const p of paths) {
      insertPref.run(req.params.id, p);
    }
  })();

  res.json({ enabledPaths: paths });
});

export default router;
