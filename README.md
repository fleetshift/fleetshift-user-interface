# FleetShift User Interface

Multi-cluster Kubernetes management dashboard. Composable pages built from dynamically loaded plugins via Module Federation and Scalprum.

## Prerequisites

- Node.js 20+
- npm 10+

## Quick Start

Install dependencies and start everything (mock server, plugins, GUI) in one command:

```bash
npm install
npm run dev
```

This runs three processes concurrently:

| Service | Port | What it does |
|---------|------|--------------|
| Mock API server | 4000 | Express + SQLite REST API with seeded cluster/pod/metrics data |
| Mock UI plugins | 8001 | 15 Module Federation remote plugins, built and served via http-server |
| GUI dev server | 3000 | Webpack dev server for the React shell app |

Open [http://localhost:3000](http://localhost:3000) once all three are up (plugins take the longest to build).

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
| `@fleetshift/mock-servers` | Express + SQLite mock API server. Seeds clusters, pods, namespaces, metrics, and user data on startup |
| `@fleetshift/mock-ui-plugins` | Webpack Module Federation remote plugins (15 plugins). Built and served on port 8001 |
| `@fleetshift/build-utils` | Shared webpack helpers — PatternFly dynamic module sharing and ts-loader import transforms |
| `@fleetshift/cli` | CLI tool (scaffolding only, no source yet) |

## Key Concepts

**Composed Pages** — Users create pages in the Composer, drag plugin modules onto a grid canvas, then add pages to their navigation layout.

**Plugin Architecture** — Each plugin is a Module Federation remote. The shell loads them via Scalprum based on which clusters have the plugin enabled. Plugins expose React components that receive `clusterIds: string[]`.

**Scope Model** — Users switch between "All Clusters" and a specific cluster via the masthead dropdown. Components receive the appropriate cluster IDs based on the current scope.

**Dark Mode** — Toggle via the moon/sun icon in the masthead. Uses PatternFly's `pf-v6-theme-dark` class.

## Documentation

- [Routing Plugin — Cross-Plugin Linking](docs/routing-plugin.md)
