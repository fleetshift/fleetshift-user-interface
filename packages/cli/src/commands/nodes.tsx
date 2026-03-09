import { Box, Text } from "ink";
import { Badge, StatusMessage } from "@inkjs/ui";
import { fetchNodes } from "@fleetshift/common";
import type { Command } from "./types.js";
import { resolveCluster } from "./utils.js";

export const nodes: Command = {
  name: "nodes",
  description: "List nodes for a cluster",
  usage: "nodes <cluster>",
  async run({ apiBase, arg }) {
    if (!arg)
      return <StatusMessage variant="warning">Usage: nodes &lt;cluster&gt;</StatusMessage>;

    const cluster = await resolveCluster(apiBase, arg);
    const data = await fetchNodes(apiBase, cluster.id);
    if (data.length === 0)
      return <StatusMessage variant="info">No nodes in {cluster.name}.</StatusMessage>;

    return (
      <Box flexDirection="column">
        <Text bold>Nodes in {cluster.name}:</Text>
        <Box>
          <Box width={24}><Text bold>Name</Text></Box>
          <Box width={10}><Text bold>Role</Text></Box>
          <Box width={10}><Text bold>Status</Text></Box>
          <Box width={16}><Text bold>CPU</Text></Box>
          <Text bold>Memory</Text>
        </Box>
        {data.map((n) => {
          const cpuPct = n.cpu_capacity > 0 ? ((n.cpu_used / n.cpu_capacity) * 100).toFixed(0) : "0";
          const memPct = n.memory_capacity > 0 ? ((n.memory_used / n.memory_capacity) * 100).toFixed(0) : "0";
          return (
            <Box key={n.id}>
              <Box width={24}><Text>{n.name}</Text></Box>
              <Box width={10}><Text>{n.role}</Text></Box>
              <Box width={10}>
                <Badge color={n.status === "Ready" ? "green" : "yellow"}>
                  {n.status}
                </Badge>
              </Box>
              <Box width={16}><Text>{n.cpu_used}/{n.cpu_capacity} ({cpuPct}%)</Text></Box>
              <Text>{n.memory_used}/{n.memory_capacity}Mi ({memPct}%)</Text>
            </Box>
          );
        })}
      </Box>
    );
  },
};
