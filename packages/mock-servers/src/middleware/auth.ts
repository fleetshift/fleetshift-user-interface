import { Request, Response, NextFunction } from "express";
import { createRemoteJWKSet, jwtVerify, JWTPayload } from "jose";
import db from "../db";

const KEYCLOAK_URL = process.env.KEYCLOAK_URL ?? "http://localhost:8080";
const JWKS_URL = `${KEYCLOAK_URL}/realms/fleetshift/protocol/openid-connect/certs`;

interface TokenUser {
  username: string;
  roles: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: TokenUser;
    }
  }
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(JWKS_URL));
  }
  return jwks;
}

interface KeycloakJWTPayload extends JWTPayload {
  preferred_username?: string;
  realm_access?: { roles?: string[] };
}

export async function jwtAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    console.warn(`Auth: ${req.method} ${req.path} — 401 (no Bearer token)`);
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader.slice(7);

  try {
    // Skip issuer validation — the token may be issued by localhost:8080
    // (browser) while the server reaches Keycloak via the Docker hostname.
    // The JWKS signature check is sufficient.
    const { payload } = await jwtVerify(token, getJWKS());

    const kc = payload as KeycloakJWTPayload;
    const username = kc.preferred_username ?? "unknown";
    const roles = kc.realm_access?.roles ?? [];

    console.log(`Auth: ${req.method} ${req.path} — user=${username} roles=[${roles.join(",")}]`);

    req.user = { username, roles };

    // Auto-create user in DB if not present
    const existing = db
      .prepare("SELECT id FROM users WHERE username = ?")
      .get(username) as { id: string } | undefined;

    if (!existing) {
      const role = roles.includes("ops") ? "ops" : "dev";
      const displayName = username.charAt(0).toUpperCase() + username.slice(1);
      db.prepare(
        "INSERT INTO users (id, username, display_name, role, nav_layout, canvas_pages) VALUES (?, ?, ?, ?, ?, ?)",
      ).run(`user-${username}`, username, displayName, role, "[]", "[]");
      console.log(`Auth: auto-created user "${username}" (${role})`);
    }

    next();
  } catch (err) {
    console.warn(`Auth: ${req.method} ${req.path} — 401 (${err instanceof Error ? err.message : "unknown error"})`);
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * /auth/login handler: returns the user info derived from the JWT.
 */
export function keycloakLoginHandler(req: Request, res: Response): void {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  interface UserRow {
    id: string;
    username: string;
    display_name: string;
    role: string;
    nav_layout: string;
  }

  const user = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(req.user.username) as UserRow | undefined;

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    role: user.role,
    navLayout: JSON.parse(user.nav_layout),
  });
}
