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

export default router;
