import { Router } from "express";
import type { LiveCluster, ClusterConfig } from "../client";
import {
  connectCluster,
  registerClusterClient,
  unregisterClusterClient,
  addClusterToDb,
  removeClusterFromDb,
  getClusterClient,
  getDiscoveryDetails,
  listConsolePlugins,
} from "../client";
import { startInformers, stopClusterInformers } from "../informers";
import { startLogStreaming, handlePodEvent } from "../logStreamer";
import { setLiveClusters } from "../../routes/users";
import { broadcastToAuthenticated, sendToSession } from "../../ws";

function clusterToJson(c: LiveCluster) {
  return {
    id: c.id,
    name: c.name,
    status: "ready",
    version: c.version,
    plugins: c.plugins,
    platform: c.platform,
    server: c.server,
    nodeCount: c.nodeCount,
    created_at: new Date().toISOString().replace("T", " ").substring(0, 19),
  };
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function clusterRoutes(liveClusters: LiveCluster[]): Router {
  const router = Router();
  const clusterMap = new Map(liveClusters.map((c) => [c.id, c]));

  router.get("/clusters/available", (_req, res) => {
    res.json(
      liveClusters.map((c) => ({
        ...clusterToJson(c),
        installed: true,
      })),
    );
  });

  router.get("/clusters", (_req, res) => {
    res.json(liveClusters.map(clusterToJson));
  });

  router.post("/clusters", async (req, res) => {
    const { name, type, context, server, token, skipTLSVerify } = req.body;

    if (!name || !type) {
      res.status(400).json({ error: "name and type are required" });
      return;
    }

    const id = slugify(name);
    if (clusterMap.has(id)) {
      res.status(409).json({ error: `Cluster "${id}" already exists` });
      return;
    }

    const cfg: ClusterConfig = {
      id,
      name,
      type,
    };

    if (type === "kubeconfig") {
      cfg.context = context || "minikube";
    } else if (type === "token") {
      if (!server || !token) {
        res
          .status(400)
          .json({ error: "server and token are required for token auth" });
        return;
      }
      cfg.server = server;
      cfg.tokenValue = token;
      cfg.skipTLSVerify = skipTLSVerify ?? true;
    } else {
      res.status(400).json({ error: `Invalid type: ${type}` });
      return;
    }

    try {
      const originSession = req.headers["x-session-id"] as string | undefined;
      const onProgress = originSession
        ? (step: string, status: string, detail?: string) => {
            sendToSession(originSession, {
              type: "cluster-progress",
              step,
              status,
              detail,
            });
          }
        : undefined;

      const client = await connectCluster(cfg, onProgress);
      if (!client) {
        res
          .status(400)
          .json({ error: "Failed to connect to cluster. Check credentials." });
        return;
      }

      // Register in the runtime
      registerClusterClient(client);

      // Update the in-memory arrays used by route closures
      liveClusters.push(client.live);
      clusterMap.set(client.live.id, client.live);

      // Persist to database
      addClusterToDb(cfg);

      // Update users.ts cluster list
      setLiveClusters(liveClusters);

      // Start informers and log streaming for the new cluster
      startInformers([client.live], (event) => {
        broadcastToAuthenticated(event);
        if (event.type === "k8s" && event.resource === "pods") {
          handlePodEvent(event.verb, event.object);
        }
      });
      startLogStreaming(client.live.id, (logEvent) => {
        broadcastToAuthenticated(logEvent);
      });

      // Notify all connected clients (including the originator)
      broadcastToAuthenticated({ resource: "clusters" });

      res.status(201).json(clusterToJson(client.live));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ error: msg });
    }
  });

  router.get("/clusters/:id", (req, res) => {
    const cluster =
      clusterMap.get(req.params.id) ??
      liveClusters.find((c) => c.id === req.params.id);
    if (!cluster) {
      res.status(404).json({ error: "Cluster not found" });
      return;
    }
    res.json(clusterToJson(cluster));
  });

  router.get("/clusters/:id/console-plugins", async (req, res) => {
    const client = getClusterClient(req.params.id);
    if (!client) {
      res.status(404).json({ error: "Cluster not found" });
      return;
    }
    try {
      const plugins = await listConsolePlugins(client.kc);
      res.json(plugins);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  router.get("/clusters/:id/discovery", async (req, res) => {
    const client = getClusterClient(req.params.id);
    if (!client) {
      res.status(404).json({ error: "Cluster not found" });
      return;
    }
    try {
      const details = await getDiscoveryDetails(client.kc);
      res.json(details);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  router.patch("/clusters/:id", async (req, res) => {
    const id = req.params.id;
    const existing = getClusterClient(id);
    if (!existing) {
      res.status(404).json({ error: "Cluster not found" });
      return;
    }

    const { token } = req.body;
    if (!token) {
      res.status(400).json({ error: "token is required" });
      return;
    }

    // Build updated config from existing
    const cfg: ClusterConfig = {
      ...existing.config,
      tokenValue: token,
    };

    try {
      const client = await connectCluster(cfg);
      if (!client) {
        res.status(400).json({ error: "Failed to reconnect. Check token." });
        return;
      }

      // Stop old informers before replacing the client
      stopClusterInformers(id);

      // Replace in runtime
      unregisterClusterClient(id);
      registerClusterClient(client);

      // Update in-memory arrays
      const idx = liveClusters.findIndex((c) => c.id === id);
      if (idx !== -1) {
        liveClusters[idx] = client.live;
        clusterMap.set(id, client.live);
      }

      // Update DB
      addClusterToDb(cfg);

      // Update users.ts cluster list
      setLiveClusters(liveClusters);

      // Restart informers with new client
      startInformers([client.live], (event) => {
        broadcastToAuthenticated(event);
        if (event.type === "k8s" && event.resource === "pods") {
          handlePodEvent(event.verb, event.object);
        }
      });
      startLogStreaming(client.live.id, (logEvent) => {
        broadcastToAuthenticated(logEvent);
      });

      // Notify
      broadcastToAuthenticated({ resource: "clusters" });

      res.json(clusterToJson(client.live));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ error: msg });
    }
  });

  router.delete("/clusters/:id", (req, res) => {
    const id = req.params.id;
    const idx = liveClusters.findIndex((c) => c.id === id);
    if (idx === -1) {
      res.status(404).json({ error: "Cluster not found" });
      return;
    }

    // Stop informers for this cluster
    stopClusterInformers(id);

    // Remove from runtime
    liveClusters.splice(idx, 1);
    clusterMap.delete(id);
    unregisterClusterClient(id);

    // Remove from database
    removeClusterFromDb(id);

    // Update users.ts cluster list
    setLiveClusters(liveClusters);

    // Notify all connected clients
    broadcastToAuthenticated({ resource: "clusters" });

    res.status(204).end();
  });

  return router;
}
