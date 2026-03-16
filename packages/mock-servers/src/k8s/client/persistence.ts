import type Database from "better-sqlite3";
import type { ClusterConfig } from "./types";

// Lazy DB import to avoid circular dependency at module load time
let _db: ReturnType<typeof Database> | null = null;
function getDb() {
  if (!_db) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _db = require("../../db").default;
  }
  return _db!;
}

/** Persist a cluster config to the database */
export function addClusterToDb(cfg: ClusterConfig): void {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO cluster_configs (id, name, type, context, server, token_env, token_value, skip_tls_verify)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    cfg.id,
    cfg.name,
    cfg.type,
    cfg.context ?? null,
    cfg.server ?? null,
    cfg.tokenEnv ?? null,
    cfg.tokenValue ?? null,
    cfg.skipTLSVerify ? 1 : 0,
  );
  console.log(`K8s: Saved cluster "${cfg.name}" to database`);
}

/** Remove a cluster config from the database */
export function removeClusterFromDb(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM cluster_configs WHERE id = ?").run(id);
  console.log(`K8s: Removed cluster "${id}" from database`);
}

/** Load cluster configs from the database */
export function loadClusterConfigsFromDb(): ClusterConfig[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM cluster_configs")
    .all() as Array<{
    id: string;
    name: string;
    type: "kubeconfig" | "token";
    context: string | null;
    server: string | null;
    token_env: string | null;
    token_value: string | null;
    skip_tls_verify: number;
  }>;

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    ...(r.context ? { context: r.context } : {}),
    ...(r.server ? { server: r.server } : {}),
    ...(r.token_env ? { tokenEnv: r.token_env } : {}),
    ...(r.token_value ? { tokenValue: r.token_value } : {}),
    skipTLSVerify: r.skip_tls_verify === 1,
  }));
}
