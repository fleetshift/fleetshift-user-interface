# FleetShift User Interface

Multi-cluster Kubernetes management dashboard. Composable pages built from dynamically loaded plugins via Module Federation and Scalprum.

## Prerequisites

- Node.js 22+
- npm 10+
- Go 1.22+ (for the management plane backend at `../fleetshift-poc`)
- Docker (for Keycloak, optional)

## Quick Start (Mock Mode)

Install dependencies and start everything (mock server, plugins, GUI) in one command:

```bash
npm install
npm run dev
```

This runs three processes concurrently:

| Service | Port | What it does |
|---------|------|--------------|
| Mock API server | 4000 | Express + SQLite REST API with seeded cluster/pod/metrics data |
| Mock UI plugins | 8001 | 15+ Module Federation remote plugins, built and served via http-server |
| GUI dev server | 3000 | Webpack dev server for the React shell app |

Open [http://localhost:3000](http://localhost:3000) once all three are up (plugins take the longest to build).

## Full Stack (with Management Plane)

To use the management plane features (Auth Methods, Targets, Orchestration Deployments), you also need the Go backend running. Start each in a separate terminal:

**1. Go management plane backend**

```bash
cd ../fleetshift-poc
make build                        # builds ./bin/fleetshift + ./bin/fleetctl
./bin/fleetshift serve            # gRPC :50051, HTTP :8085
```

**2. Mock UI plugins**

```bash
npm run build --workspace=packages/mock-ui-plugins
npm run serve --workspace=packages/mock-ui-plugins   # :8001
```

**3. Express mock server**

```bash
npm run dev --workspace=packages/mock-servers          # :4000
```

The Express server proxies `/api/v1/management/*` to the Go backend at `:8085`. Configure with `MANAGEMENT_API_TARGET` env var if needed.

**4. GUI dev server**

```bash
npm run dev --workspace=packages/gui                   # :3000
```

### Port Map

| Service | Port |
|---------|------|
| GUI dev server | 3000 |
| Express mock server | 4000 |
| Mock UI plugins (static) | 8001 |
| Go backend (HTTP/JSON gateway) | 8085 |
| Go backend (gRPC) | 50051 |
| Keycloak (Docker) | 8180 |

### Auth Bootstrap

The Go backend validates JWTs from external OIDC issuers — it does not run its own IDP. When no auth methods are registered, requests are allowed anonymously (bootstrap mode).

Register your first OIDC issuer via the CLI. If using the Docker Compose Keycloak:

```bash
cd ../fleetshift-poc
./bin/fleetctl auth setup \
  --issuer-url http://localhost:8180/realms/fleetshift \
  --client-id fleetshift-ui \
  --audience fleetshift-ui
```

Or use the **Auth Methods** page in the UI at `/auth-methods`.

### Docker Compose (Keycloak + Live K8s Mode)

```bash
docker compose -f docker-compose.dev.yml up --build
```

Starts Keycloak (:8180), mock-servers in live K8s mode (:4000), and mock-ui-plugins (:8001). The GUI still runs on the host.

## Starting Services Individually

```bash
# Mock API server only
npm run dev --workspace=packages/mock-servers

# Mock plugins — build + watch + serve on port 8001
npm run serve --workspace=packages/mock-ui-plugins

# GUI dev server only (requires server + plugins to be running)
npm run dev --workspace=packages/gui
```

## Default State

The mock server seeds two users on first run:

- **Ops** — 5 pre-built pages: Pods, Namespaces, Overview (observability + networking + CPU trend), Nodes, Alerts
- **Dev** — 3 pre-built pages: Deployments, Pipelines, GitOps

Switch between personas with the Ops/Dev toggle in the masthead. Delete the DB file (`packages/mock-servers/fleetshift.db`) to re-seed from scratch.

## Production Build

```bash
npm run build --workspace=packages/gui
```

Output goes to `packages/gui/dist/`.

## Lint

```bash
npm run lint          # check
npm run lint:fix      # auto-fix
```

## Packages

| Package | Description |
|---------|-------------|
| `@fleetshift/gui` | React SPA shell — composable dashboard with Module Federation and Scalprum plugin loading |
| `@fleetshift/mock-servers` | Express + SQLite mock API server. Proxies management plane requests to the Go backend |
| `@fleetshift/mock-ui-plugins` | Webpack Module Federation remote plugins (16 plugins). Built and served on port 8001 |
| `@fleetshift/common` | Shared utilities — formatting helpers, types |
| `@fleetshift/build-utils` | Shared webpack helpers — PatternFly dynamic module sharing and ts-loader import transforms |
| `@fleetshift/cli` | CLI tool with OIDC auth, PKCE login, and keyring token storage |

## Key Concepts

**Composed Pages** — Users create pages in the Composer, drag plugin modules onto a grid canvas, then add pages to their navigation layout.

**Plugin Architecture** — Each plugin is a Module Federation remote. The shell loads them via Scalprum based on which clusters have the plugin enabled. Plugins expose React components that receive `clusterIds: string[]`.

**Scope Model** — Users switch between "All Clusters" and a specific cluster via the masthead dropdown. Components receive the appropriate cluster IDs based on the current scope.

**Dark Mode** — Toggle via the moon/sun icon in the masthead. Uses PatternFly's `pf-v6-theme-dark` class.

## Documentation

- [Shell Architecture](docs/shell-architecture.md) — bootstrap chain, provider tree, ScalprumProvider, bridge pattern
- [Plugin System](docs/plugin-system.md) — how plugins are built, registered, discovered, and loaded
- [Build System](docs/build-system.md) — PatternFly import transforms, Module Federation sharing, monorepo setup
- [Scope Model](docs/scope-model.md) — "All Clusters" vs single-cluster scoping, `clusterIds` prop
- [Navigation System](docs/navigation-system.md) — drag-drop nav editor, layout model, @dnd-kit
- [Mock Server](docs/mock-server.md) — Express + SQLite API, DB schema, seed data, WebSocket events
- [Cross-Plugin Routing](docs/routing-plugin.md) — runtime path resolution between plugins
- [Canvas Pages](docs/canvas-pages.md) — composable grid pages (experimental)
