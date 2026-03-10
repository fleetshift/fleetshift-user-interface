import { Box, Text } from "ink";
import { Badge, StatusMessage } from "@inkjs/ui";
import {
  fetchClusters,
  fetchPluginRegistry,
  updateClusterPlugins,
} from "@fleetshift/common";
import type { Command } from "./types.js";
import { resolveCluster } from "./utils.js";

export const enable: Command = {
  name: "enable",
  description: "Enable a plugin on a cluster",
  usage: "enable <cluster-id> <plugin>",
  async run({ apiBase, arg }) {
    const registry = await fetchPluginRegistry(apiBase);
    const plugins = Object.values(registry.plugins);
    const knownKeys = plugins.map((p) => p.key);

    const parts = arg.split(/\s+/).filter(Boolean);

    // No args — show clusters and available plugins
    if (parts.length === 0) {
      const installed = await fetchClusters(apiBase);
      return (
        <Box flexDirection="column">
          <Text bold>Usage: enable {"<cluster-id> <plugin>"}</Text>
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
          <Text> </Text>
          <Text bold>Available plugins:</Text>
          {plugins.map((p) => (
            <Box key={p.key}>
              <Box width={18}>
                <Text>{p.key}</Text>
              </Box>
              <Box width={20}>
                <Text>{p.label}</Text>
              </Box>
              <Badge color={p.persona === "ops" ? "cyan" : "magenta"}>
                {p.persona}
              </Badge>
            </Box>
          ))}
        </Box>
      );
    }

    // One arg — show cluster's plugins and what can be enabled
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

      const disabled = plugins.filter(
        (p) => !cluster.plugins.includes(p.key),
      );
      return (
        <Box flexDirection="column">
          <Text bold>{cluster.name} — enabled plugins:</Text>
          <Text>{cluster.plugins.join(", ")}</Text>
          <Text> </Text>
          {disabled.length > 0 ? (
            <>
              <Text bold>Available to enable:</Text>
              {disabled.map((p) => (
                <Box key={p.key}>
                  <Box width={18}>
                    <Text>{p.key}</Text>
                  </Box>
                  <Badge color={p.persona === "ops" ? "cyan" : "magenta"}>
                    {p.persona}
                  </Badge>
                </Box>
              ))}
              <Text> </Text>
              <Text color="gray">
                Run: enable {cluster.id} {"<plugin>"}
              </Text>
            </>
          ) : (
            <StatusMessage variant="success">
              All plugins are already enabled.
            </StatusMessage>
          )}
        </Box>
      );
    }

    // Two args — enable plugin on cluster
    const clusterId = parts[0]!;
    const pluginKey = parts[1]!.toLowerCase();

    if (!knownKeys.includes(pluginKey)) {
      return (
        <Box flexDirection="column">
          <StatusMessage variant="error">
            Unknown plugin &quot;{pluginKey}&quot;.
          </StatusMessage>
          <Text color="gray">Available: {knownKeys.join(", ")}</Text>
        </Box>
      );
    }

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

    if (cluster.plugins.includes(pluginKey)) {
      return (
        <StatusMessage variant="warning">
          Plugin &quot;{pluginKey}&quot; is already enabled on {cluster.name}.
        </StatusMessage>
      );
    }

    const updated = await updateClusterPlugins(apiBase, cluster.id, [
      ...cluster.plugins,
      pluginKey,
    ]);
    return (
      <Box flexDirection="column">
        <StatusMessage variant="success">
          Enabled &quot;{pluginKey}&quot; on {cluster.name}
        </StatusMessage>
        <Box>
          <Text color="gray">Plugins: </Text>
          {updated.plugins.map((p, i) => (
            <Text key={p}>
              {i > 0 ? ", " : ""}
              <Badge color={p === pluginKey ? "green" : "cyan"}>{p}</Badge>
            </Text>
          ))}
        </Box>
      </Box>
    );
  },
};
