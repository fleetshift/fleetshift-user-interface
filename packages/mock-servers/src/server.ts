import { createServer } from "http";
import express from "express";
import cors from "cors";
import db from "./db";
import { seedCluster, AVAILABLE_CLUSTERS } from "./seed";
import { jwtAuthMiddleware, keycloakLoginHandler } from "./middleware/auth";
import { initPluginRegistryWatcher } from "./pluginRegistry";
import { initCliPluginRegistryWatcher } from "./cliPluginRegistry";
import { attachWebSocket, broadcastToAuthenticated } from "./ws";
import { startInformers } from "./k8s/informers";
import { startLogStreaming, handlePodEvent } from "./k8s/logStreamer";
import { initK8sClient } from "./k8s/client";
import type { LiveCluster } from "./k8s/client";
import { createK8sRouter } from "./k8s/routes";
import mockRoutes from "./routes/mock";
import userRoutes from "./routes/users";
import { setLiveClusters } from "./routes/users";
import pluginRegistryRoutes from "./routes/pluginRegistry";
import cliPluginRegistryRoutes from "./routes/cliPluginRegistry";

const MODE = process.env.MODE ?? "mock";
const PORT = 4000;

const app = express();
app.use(cors());
app.use(express.json());

async function start() {
  let discoveredClusters: LiveCluster[] = [];

  // Auth (optional in live mode via NO_AUTH=1)
  if (process.env.NO_AUTH !== "1") {
    app.use("/api/v1", jwtAuthMiddleware);
    app.post("/api/v1/auth/login", keycloakLoginHandler);
  }

  if (MODE === "live") {
    discoveredClusters = await initK8sClient();

    if (discoveredClusters.length === 0) {
      console.error(
        "MODE=live but no Kubernetes cluster is reachable. Start minikube or switch to MODE=mock.",
      );
      process.exit(1);
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
        "alerts",
        "operator",
      ];
      const devPlugins = [
        "core",
        "deployments",
        "pipelines",
        "gitops",
        "alerts",
        "operator",
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
      const clusterId = discoveredClusters[0]?.id ?? "unknown";

      startInformers(discoveredClusters, (event) => {
        broadcastToAuthenticated(event);

        // Pipe pod events to log streamer so it can start/stop streams
        if (event.type === "k8s" && event.resource === "pods") {
          handlePodEvent(event.verb, event.object);
        }
      });

      // Start log streaming (follows pod logs via K8s API)
      startLogStreaming(clusterId, (logEvent) => {
        broadcastToAuthenticated(logEvent);
      });
    }
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
