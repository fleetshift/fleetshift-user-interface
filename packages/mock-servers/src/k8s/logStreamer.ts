import * as k8s from "@kubernetes/client-node";
import { Writable } from "node:stream";
import { getClusterClient } from "./client";

export interface LogLineEvent {
  type: "logs";
  resource: "logs";
  cluster: string;
  line: {
    timestamp: string;
    pod: string;
    namespace: string;
    level: string;
    message: string;
  };
}

export type LogEventHandler = (event: LogLineEvent) => void;

interface ActiveStream {
  abort: AbortController;
  podName: string;
  namespace: string;
}

const activeStreams = new Map<string, ActiveStream>();
let onLogEvent: LogEventHandler | null = null;
let clusterId = "unknown";

const MAX_STREAMS = 20;

function detectLevel(line: string): string {
  if (/\berror\b/i.test(line)) return "ERROR";
  if (/\bwarn(ing)?\b/i.test(line)) return "WARN";
  if (/\bdebug\b/i.test(line)) return "DEBUG";
  return "INFO";
}

function parseLogLine(
  raw: string,
  podName: string,
  namespace: string,
): LogLineEvent["line"] | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Try to extract timestamp from beginning of line (ISO 8601 format)
  const tsMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2}T[\d:.]+Z?)\s+(.*)/);
  const timestamp = tsMatch ? tsMatch[1] : new Date().toISOString();
  const message = tsMatch ? tsMatch[2] : trimmed;

  return {
    timestamp,
    pod: podName,
    namespace,
    level: detectLevel(message),
    message: message.substring(0, 500),
  };
}

function startPodStream(podName: string, namespace: string, container: string) {
  const key = `${namespace}/${podName}`;
  if (activeStreams.has(key)) return;
  if (activeStreams.size >= MAX_STREAMS) return;

  const client = getClusterClient(clusterId);
  if (!client) return;
  const kc = client.kc;

  const log = new k8s.Log(kc);

  // Buffer for partial lines (data may arrive split across chunks)
  let buffer = "";

  const writable = new Writable({
    write(chunk, _encoding, callback) {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      // Keep the last element (may be incomplete)
      buffer = lines.pop() ?? "";

      for (const rawLine of lines) {
        const parsed = parseLogLine(rawLine, podName, namespace);
        if (parsed && onLogEvent) {
          onLogEvent({
            type: "logs",
            resource: "logs",
            cluster: clusterId,
            line: parsed,
          });
        }
      }
      callback();
    },
  });

  log
    .log(namespace, podName, container, writable, {
      follow: true,
      tailLines: 10,
      timestamps: true,
    })
    .then((abort) => {
      activeStreams.set(key, { abort, podName, namespace });
    })
    .catch(() => {
      // Pod might not support logging (e.g., completed pods)
    });
}

function stopPodStream(podName: string, namespace: string) {
  const key = `${namespace}/${podName}`;
  const stream = activeStreams.get(key);
  if (stream) {
    stream.abort.abort();
    activeStreams.delete(key);
  }
}

export async function startLogStreaming(
  clusterIdParam: string,
  handler: LogEventHandler,
) {
  clusterId = clusterIdParam;
  onLogEvent = handler;

  try {
    const client = getClusterClient(clusterId);
    if (!client) return;
    const podResponse = await client.core.listPodForAllNamespaces();
    const runningPods = (podResponse.items ?? []).filter(
      (p) => p.status?.phase === "Running",
    );

    // Start streams for a subset of running pods
    for (const pod of runningPods.slice(0, MAX_STREAMS)) {
      const name = pod.metadata?.name ?? "";
      const ns = pod.metadata?.namespace ?? "";
      const container = pod.spec?.containers?.[0]?.name ?? "";
      if (name && ns && container) {
        startPodStream(name, ns, container);
      }
    }

    console.log(
      `K8s log streaming started for ${Math.min(runningPods.length, MAX_STREAMS)} pods`,
    );
  } catch (err) {
    console.error(
      "Log streaming init error:",
      err instanceof Error ? err.message : err,
    );
  }
}

/**
 * Called when a pod informer event arrives.
 * Starts streaming for new running pods, stops for deleted ones.
 */
export function handlePodEvent(verb: string, pod: k8s.KubernetesObject) {
  const name = pod.metadata?.name ?? "";
  const ns = pod.metadata?.namespace ?? "";
  const phase = (pod as k8s.V1Pod).status?.phase;
  const container = (pod as k8s.V1Pod).spec?.containers?.[0]?.name ?? "";

  if (!name || !ns) return;

  if (verb === "DELETED") {
    stopPodStream(name, ns);
    return;
  }

  if (
    (verb === "ADDED" || verb === "MODIFIED") &&
    phase === "Running" &&
    container
  ) {
    startPodStream(name, ns, container);
  }
}

export function stopLogStreaming() {
  for (const [key, stream] of activeStreams) {
    stream.abort.abort();
  }
  activeStreams.clear();
  onLogEvent = null;
}
