import Database from "better-sqlite3";
import path from "path";

const dbPath = path.resolve(__dirname, "../fleetshift.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS clusters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ready',
    version TEXT NOT NULL,
    plugins TEXT NOT NULL DEFAULT '["core"]',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS namespaces (
    id TEXT PRIMARY KEY,
    cluster_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active',
    FOREIGN KEY (cluster_id) REFERENCES clusters(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS pods (
    id TEXT PRIMARY KEY,
    namespace_id TEXT NOT NULL,
    cluster_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Running',
    restarts INTEGER NOT NULL DEFAULT 0,
    cpu_usage REAL NOT NULL DEFAULT 0,
    memory_usage REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (namespace_id) REFERENCES namespaces(id) ON DELETE CASCADE,
    FOREIGN KEY (cluster_id) REFERENCES clusters(id) ON DELETE CASCADE
  );
`);

export default db;
