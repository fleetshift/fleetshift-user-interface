import { Box, Text } from "ink";
import { StatusMessage } from "@inkjs/ui";
import { fetchClusters, uninstallCluster } from "@fleetshift/common";
import type { Command } from "./types.js";
import { resolveCluster } from "./utils.js";

export const uninstall: Command = {
  name: "uninstall",
  description: "Uninstall a cluster",
  usage: "uninstall <cluster>",
  async run({ apiBase, arg }) {
    if (!arg) {
      const installed = await fetchClusters(apiBase);
      if (installed.length === 0) {
        return (
          <StatusMessage variant="info">No clusters installed.</StatusMessage>
        );
      }
      return (
        <Box flexDirection="column">
          <Text bold>Installed clusters:</Text>
          <Text> </Text>
          {installed.map((c) => (
            <Box key={c.id}>
              <Box width={24}>
                <Text>{c.name}</Text>
              </Box>
              <Text color="gray">{c.id}</Text>
            </Box>
          ))}
          <Text> </Text>
          <Text color="gray">
            Usage: uninstall {"<cluster>"} (name matched by prefix)
          </Text>
        </Box>
      );
    }

    const cluster = await resolveCluster(apiBase, arg);
    if (!cluster) {
      return (
        <StatusMessage variant="error">
          No installed cluster matching &quot;{arg}&quot;.
        </StatusMessage>
      );
    }

    await uninstallCluster(apiBase, cluster.id);
    return (
      <StatusMessage variant="success">
        Uninstalled {cluster.name} ({cluster.id})
      </StatusMessage>
    );
  },
};
