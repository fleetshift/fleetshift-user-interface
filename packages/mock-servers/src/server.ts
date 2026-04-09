import "dotenv/config";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";
import db from "./db";
import { seedCluster, AVAILABLE_CLUSTERS } from "./seed";
import { jwtAuthMiddleware, keycloakLoginHandler } from "./middleware/auth";
import { initPluginRegistryWatcher } from "./pluginRegistry";
import { initCliPluginRegistryWatcher } from "./cliPluginRegistry";
import { attachWebSocket, broadcastToAuthenticated } from "./ws";
import { startInformers } from "./k8s/informers";
import { startLogStreaming, handlePodEvent } from "./k8s/logStreamer";
import { initK8sClient, getAllClusterClients } from "./k8s/client";
import type { LiveCluster } from "./k8s/client";
import { createK8sRouter } from "./k8s/routes";
import mockRoutes from "./routes/mock";
import userRoutes from "./routes/users";
import { setLiveClusters } from "./routes/users";
import passkeyRoutes from "./routes/passkey";
import pluginRegistryRoutes from "./routes/pluginRegistry";
import cliPluginRegistryRoutes from "./routes/cliPluginRegistry";

const MODE = process.env.MODE ?? "mock";
const PORT = 4000;

const app = express();
app.use(cors());
// Parse JSON for all routes except the management proxy (proxy needs the raw body stream)
app.use((req, res, next) => {
  if (req.path.startsWith("/api/v1/management")) return next();
  express.json()(req, res, next);
});

// Log every incoming request
app.use((req, _res, next) => {
  console.log(`→ ${req.method} ${req.path}`);
  next();
});

const MANAGEMENT_API =
  process.env.MANAGEMENT_API_TARGET ?? "http://localhost:8085";

async function start() {
  let discoveredClusters: LiveCluster[] = [];

  // Proxy management plane requests to the Go backend (fleetshift-poc)
  app.use(
    "/api/v1/management",
    createProxyMiddleware({
      target: MANAGEMENT_API,
      changeOrigin: true,
      pathRewrite: { "^/": "/v1/" },
      on: {
        error: (err, _req, res) => {
          console.error("Management API proxy error:", err.message);
          if ("writeHead" in res) {
            (res as express.Response).status(502).json({
              error: `Management plane unreachable at ${MANAGEMENT_API}`,
            });
          }
        },
      },
    }),
  );

  app.use("/api/v1", jwtAuthMiddleware);
  app.post("/api/v1/auth/login", keycloakLoginHandler);

  if (MODE === "live") {
    discoveredClusters = await initK8sClient((updatedClusters) => {
      // Hot-reload callback when clusters.yaml changes
      setLiveClusters(updatedClusters);
      console.log(
        `K8s: Cluster config reloaded — ${updatedClusters.length} cluster(s) active`,
      );
    });

    if (discoveredClusters.length === 0) {
      console.log(
        "K8s: No clusters connected yet. Add clusters via the UI at /clusters/add.",
      );
    }

    setLiveClusters(discoveredClusters);
    app.use("/api/v1", createK8sRouter(discoveredClusters));
  } else {
    app.use("/api/v1", mockRoutes);

    // Seed default clusters if none installed
    const clusterCount = (
      db.prepare("SELECT COUNT(*) as c FROM clusters").get() as { c: number }
    ).c;
    if (clusterCount === 0) {
      seedCluster(AVAILABLE_CLUSTERS[0]);
      seedCluster(AVAILABLE_CLUSTERS[1]);

      const opsPlugins = [
        "core",
        "observability",
        "nodes",
        "networking",
        "storage",
        "alerts",
        "upgrades",

        "events",
        "logs",
        "deployments",
      ];
      const devPlugins = [
        "core",
        "deployments",
        "pipelines",
        "config",
        "gitops",
        "events",
        "routes",
        "logs",
        "alerts",
      ];
      db.prepare("UPDATE clusters SET plugins = ? WHERE id = ?").run(
        JSON.stringify(opsPlugins),
        AVAILABLE_CLUSTERS[0].id,
      );
      db.prepare("UPDATE clusters SET plugins = ? WHERE id = ?").run(
        JSON.stringify(devPlugins),
        AVAILABLE_CLUSTERS[1].id,
      );
      console.log("Seeded 2 default clusters with plugins");
    }
  }

  // Shared across both modes
  app.use("/api/v1", userRoutes);
  app.use("/api/v1", passkeyRoutes);
  app.use("/api/v1", pluginRegistryRoutes);
  app.use("/api/v1", cliPluginRegistryRoutes);

  initPluginRegistryWatcher();
  initCliPluginRegistryWatcher();

  const server = createServer(app);
  attachWebSocket(server);
  server.listen(PORT, () => {
    console.log(
      `FleetShift server running on http://localhost:${PORT} [${MODE} mode]`,
    );

    // Start K8s informers after WS is ready (live mode only)
    if (MODE === "live" && discoveredClusters.length > 0) {
      // Start informers for all connected clusters
      const clients = getAllClusterClients();
      for (const client of clients) {
        startInformers([client.live], (event) => {
          broadcastToAuthenticated(event);

          if (event.type === "k8s" && event.resource === "pods") {
            handlePodEvent(event.verb, event.object);
          }
        });

        startLogStreaming(client.live.id, (logEvent) => {
          broadcastToAuthenticated(logEvent);
        });
      }
    }
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
