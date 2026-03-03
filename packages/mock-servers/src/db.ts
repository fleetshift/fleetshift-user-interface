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

  CREATE TABLE IF NOT EXISTS nodes (
    id TEXT PRIMARY KEY,
    cluster_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Ready',
    role TEXT NOT NULL DEFAULT 'worker',
    cpu_capacity REAL NOT NULL DEFAULT 4,
    memory_capacity REAL NOT NULL DEFAULT 16384,
    cpu_used REAL NOT NULL DEFAULT 0,
    memory_used REAL NOT NULL DEFAULT 0,
    kubelet_version TEXT NOT NULL,
    FOREIGN KEY (cluster_id) REFERENCES clusters(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    cluster_id TEXT NOT NULL,
    namespace_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'ClusterIP',
    cluster_ip TEXT NOT NULL,
    ports TEXT NOT NULL DEFAULT '[]',
    FOREIGN KEY (cluster_id) REFERENCES clusters(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ingresses (
    id TEXT PRIMARY KEY,
    cluster_id TEXT NOT NULL,
    namespace_id TEXT NOT NULL,
    name TEXT NOT NULL,
    host TEXT NOT NULL,
    path TEXT NOT NULL DEFAULT '/',
    service_name TEXT NOT NULL,
    tls INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (cluster_id) REFERENCES clusters(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS pvs (
    id TEXT PRIMARY KEY,
    cluster_id TEXT NOT NULL,
    name TEXT NOT NULL,
    capacity TEXT NOT NULL DEFAULT '10Gi',
    access_mode TEXT NOT NULL DEFAULT 'ReadWriteOnce',
    status TEXT NOT NULL DEFAULT 'Bound',
    storage_class TEXT NOT NULL DEFAULT 'gp3',
    FOREIGN KEY (cluster_id) REFERENCES clusters(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS pvcs (
    id TEXT PRIMARY KEY,
    cluster_id TEXT NOT NULL,
    namespace_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Bound',
    capacity TEXT NOT NULL DEFAULT '10Gi',
    storage_class TEXT NOT NULL DEFAULT 'gp3',
    pv_name TEXT,
    FOREIGN KEY (cluster_id) REFERENCES clusters(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    cluster_id TEXT NOT NULL,
    name TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'warning',
    state TEXT NOT NULL DEFAULT 'firing',
    message TEXT NOT NULL,
    fired_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (cluster_id) REFERENCES clusters(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS deployments (
    id TEXT PRIMARY KEY,
    cluster_id TEXT NOT NULL,
    namespace_id TEXT NOT NULL,
    name TEXT NOT NULL,
    replicas INTEGER NOT NULL DEFAULT 1,
    available INTEGER NOT NULL DEFAULT 1,
    ready INTEGER NOT NULL DEFAULT 1,
    strategy TEXT NOT NULL DEFAULT 'RollingUpdate',
    image TEXT NOT NULL,
    FOREIGN KEY (cluster_id) REFERENCES clusters(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS pipelines (
    id TEXT PRIMARY KEY,
    cluster_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Succeeded',
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    duration_seconds INTEGER NOT NULL DEFAULT 120,
    stages TEXT NOT NULL DEFAULT '[]',
    FOREIGN KEY (cluster_id) REFERENCES clusters(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS configmaps (
    id TEXT PRIMARY KEY,
    cluster_id TEXT NOT NULL,
    namespace_id TEXT NOT NULL,
    name TEXT NOT NULL,
    data_keys TEXT NOT NULL DEFAULT '[]',
    FOREIGN KEY (cluster_id) REFERENCES clusters(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS secrets (
    id TEXT PRIMARY KEY,
    cluster_id TEXT NOT NULL,
    namespace_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Opaque',
    data_keys TEXT NOT NULL DEFAULT '[]',
    FOREIGN KEY (cluster_id) REFERENCES clusters(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS gitops_apps (
    id TEXT PRIMARY KEY,
    cluster_id TEXT NOT NULL,
    name TEXT NOT NULL,
    repo TEXT NOT NULL,
    path TEXT NOT NULL DEFAULT '/',
    sync_status TEXT NOT NULL DEFAULT 'Synced',
    health_status TEXT NOT NULL DEFAULT 'Healthy',
    last_synced TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (cluster_id) REFERENCES clusters(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    cluster_id TEXT NOT NULL,
    namespace_id TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Normal',
    reason TEXT NOT NULL,
    message TEXT NOT NULL,
    source TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (cluster_id) REFERENCES clusters(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS routes (
    id TEXT PRIMARY KEY,
    cluster_id TEXT NOT NULL,
    namespace_id TEXT NOT NULL,
    name TEXT NOT NULL,
    host TEXT NOT NULL,
    path TEXT NOT NULL DEFAULT '/',
    service_name TEXT NOT NULL,
    tls INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'Admitted',
    FOREIGN KEY (cluster_id) REFERENCES clusters(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_nav_prefs (
    user_id TEXT NOT NULL,
    extension_path TEXT NOT NULL,
    PRIMARY KEY (user_id, extension_path),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Seed default users if they don't exist
const userCount = (
  db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number }
).c;
if (userCount === 0) {
  const insertUser = db.prepare(
    "INSERT INTO users (id, username, display_name, role) VALUES (?, ?, ?, ?)",
  );
  const insertPref = db.prepare(
    "INSERT INTO user_nav_prefs (user_id, extension_path) VALUES (?, ?)",
  );

  insertUser.run("ops-user", "ops", "Ops Admin", "ops");
  insertUser.run("dev-user", "dev", "Dev User", "dev");

  const opsDefaults = [
    "pods",
    "ns",
    "metrics",
    "nodes",
    "networking",
    "storage",
    "upgrades",
    "alerts",
    "cost",
  ];
  const devDefaults = [
    "pods",
    "ns",
    "deployments",
    "logs",
    "pipelines",
    "config",
    "gitops",
    "events",
    "routes",
  ];

  for (const p of opsDefaults) insertPref.run("ops-user", p);
  for (const p of devDefaults) insertPref.run("dev-user", p);
}

export default db;
