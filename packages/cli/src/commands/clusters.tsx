import { Box, Text } from "ink";
import { Badge, StatusMessage } from "@inkjs/ui";
import { fetchClusters } from "@fleetshift/common";
import type { Command } from "./types.js";

export const clusters: Command = {
  name: "clusters",
  description: "List installed clusters",
  async run({ apiBase }) {
    const data = await fetchClusters(apiBase);
    if (data.length === 0)
      return <StatusMessage variant="info">No clusters installed.</StatusMessage>;

    return (
      <Box flexDirection="column">
        <Box>
          <Box width={24}><Text bold>Name</Text></Box>
          <Box width={12}><Text bold>Status</Text></Box>
          <Box width={12}><Text bold>Version</Text></Box>
          <Text bold>Plugins</Text>
        </Box>
        {data.map((c) => (
          <Box key={c.id}>
            <Box width={24}><Text>{c.name}</Text></Box>
            <Box width={12}>
              <Badge color={c.status === "ready" ? "green" : c.status === "error" ? "red" : "yellow"}>
                {c.status}
              </Badge>
            </Box>
            <Box width={12}><Text>{c.version}</Text></Box>
            <Text>{(c.plugins ?? []).join(", ")}</Text>
          </Box>
        ))}
        <Text dimColor>{"\n"}{data.length} cluster(s) installed</Text>
      </Box>
    );
  },
};
