import { Box, Text } from "ink";
import { Badge, StatusMessage } from "@inkjs/ui";
import { fetchAvailableClusters, installCluster } from "@fleetshift/common";
import type { Command } from "./types.js";

export const install: Command = {
  name: "install",
  description: "Install a cluster",
  usage: "install [cluster]",
  async run({ apiBase, arg }) {
    const available = await fetchAvailableClusters(apiBase);

    // No argument — list available clusters
    if (!arg) {
      const notInstalled = available.filter((c) => !c.installed);
      if (notInstalled.length === 0) {
        return (
          <StatusMessage variant="success">
            All clusters are already installed.
          </StatusMessage>
        );
      }
      return (
        <Box flexDirection="column">
          <Text bold>Available clusters to install:</Text>
          <Text> </Text>
          {available.map((c) => (
            <Box key={c.id}>
              <Box width={24}>
                <Text>{c.name}</Text>
              </Box>
              <Box width={12}>
                <Text>{c.version}</Text>
              </Box>
              <Box width={14}>
                {c.installed ? (
                  <Badge color="green">installed</Badge>
                ) : (
                  <Badge color="gray">available</Badge>
                )}
              </Box>
              <Text color="gray">{c.id}</Text>
            </Box>
          ))}
          <Text> </Text>
          <Text color="gray">
            Usage: install {"<cluster>"} (name matched by prefix)
          </Text>
        </Box>
      );
    }

    // Find matching cluster
    const query = arg.toLowerCase();
    const match = available.find(
      (c) =>
        c.id.toLowerCase() === query || c.name.toLowerCase().startsWith(query),
    );

    if (!match) {
      return (
        <StatusMessage variant="error">
          No cluster matching &quot;{arg}&quot;. Run &apos;install&apos; to see
          available clusters.
        </StatusMessage>
      );
    }

    if (match.installed) {
      return (
        <StatusMessage variant="warning">
          {match.name} is already installed.
        </StatusMessage>
      );
    }

    const cluster = await installCluster(apiBase, match.id);
    return (
      <Box flexDirection="column">
        <StatusMessage variant="success">
          Installed {cluster.name}
        </StatusMessage>
        <Box>
          <Box width={14}>
            <Text color="gray">ID:</Text>
          </Box>
          <Text>{cluster.id}</Text>
        </Box>
        <Box>
          <Box width={14}>
            <Text color="gray">Version:</Text>
          </Box>
          <Text>{cluster.version}</Text>
        </Box>
        <Box>
          <Box width={14}>
            <Text color="gray">Status:</Text>
          </Box>
          <Badge color="green">{cluster.status}</Badge>
        </Box>
        <Box>
          <Box width={14}>
            <Text color="gray">Plugins:</Text>
          </Box>
          <Text>{cluster.plugins.join(", ")}</Text>
        </Box>
      </Box>
    );
  },
};
