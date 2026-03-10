import { Box, Text } from "ink";
import { Badge, StatusMessage } from "@inkjs/ui";
import {
  fetchClusters,
  fetchPluginRegistry,
  updateClusterPlugins,
} from "@fleetshift/common";
import type { Command } from "./types.js";
import { resolveCluster } from "./utils.js";

export const disable: Command = {
  name: "disable",
  description: "Disable a plugin on a cluster",
  usage: "disable <cluster-id> <plugin>",
  async run({ apiBase, arg }) {
    const parts = arg.split(/\s+/).filter(Boolean);

    // No args — show clusters with their plugins
    if (parts.length === 0) {
      const installed = await fetchClusters(apiBase);
      return (
        <Box flexDirection="column">
          <Text bold>Usage: disable {"<cluster-id> <plugin>"}</Text>
          <Text> </Text>
          <Text bold>Installed clusters:</Text>
          {installed.length === 0 ? (
            <Text color="gray"> No clusters installed.</Text>
          ) : (
            installed.map((c) => (
              <Box key={c.id}>
                <Box width={20}>
                  <Text color="cyan">{c.id}</Text>
                </Box>
                <Box width={24}>
                  <Text>{c.name}</Text>
                </Box>
                <Text color="gray">{c.plugins.join(", ")}</Text>
              </Box>
            ))
          )}
        </Box>
      );
    }

    // One arg — show cluster's enabled plugins
    if (parts.length === 1) {
      let cluster;
      try {
        cluster = await resolveCluster(apiBase, parts[0]!);
      } catch {
        return (
          <StatusMessage variant="error">
            No installed cluster matching &quot;{parts[0]}&quot;.
          </StatusMessage>
        );
      }

      const removable = cluster.plugins.filter((p) => p !== "core");
      return (
        <Box flexDirection="column">
          <Text bold>{cluster.name} — enabled plugins:</Text>
          <Text>{cluster.plugins.join(", ")}</Text>
          <Text> </Text>
          {removable.length > 0 ? (
            <Text color="gray">
              Run: disable {cluster.id} {"<plugin>"}
            </Text>
          ) : (
            <Text color="gray">Only the core plugin is enabled (cannot be disabled).</Text>
          )}
        </Box>
      );
    }

    // Two args — disable plugin on cluster
    const clusterId = parts[0]!;
    const pluginKey = parts[1]!.toLowerCase();

    let cluster;
    try {
      cluster = await resolveCluster(apiBase, clusterId);
    } catch {
      return (
        <StatusMessage variant="error">
          No installed cluster matching &quot;{clusterId}&quot;.
        </StatusMessage>
      );
    }

    if (pluginKey === "core") {
      return (
        <StatusMessage variant="error">
          Cannot disable the core plugin.
        </StatusMessage>
      );
    }

    if (!cluster.plugins.includes(pluginKey)) {
      const registry = await fetchPluginRegistry(apiBase);
      const knownKeys = Object.values(registry.plugins).map((p) => p.key);
      return (
        <Box flexDirection="column">
          <StatusMessage variant="warning">
            Plugin &quot;{pluginKey}&quot; is not enabled on {cluster.name}.
            {!knownKeys.includes(pluginKey) ? " (unknown plugin)" : ""}
          </StatusMessage>
          <Text color="gray">Enabled: {cluster.plugins.join(", ")}</Text>
        </Box>
      );
    }

    const updated = await updateClusterPlugins(
      apiBase,
      cluster.id,
      cluster.plugins.filter((p) => p !== pluginKey),
    );
    return (
      <Box flexDirection="column">
        <StatusMessage variant="success">
          Disabled &quot;{pluginKey}&quot; on {cluster.name}
        </StatusMessage>
        <Box>
          <Text color="gray">Plugins: </Text>
          {updated.plugins.map((p, i) => (
            <Text key={p}>
              {i > 0 ? ", " : ""}
              <Badge color="cyan">{p}</Badge>
            </Text>
          ))}
        </Box>
      </Box>
    );
  },
};
