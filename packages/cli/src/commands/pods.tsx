import { Box, Text } from "ink";
import { Badge, StatusMessage } from "@inkjs/ui";
import { fetchPods } from "@fleetshift/common";
import type { Command } from "./types.js";
import { resolveCluster } from "./utils.js";

export const pods: Command = {
  name: "pods",
  description: "List pods for a cluster",
  usage: "pods <cluster>",
  async run({ apiBase, arg }) {
    if (!arg)
      return (
        <StatusMessage variant="warning">
          Usage: pods &lt;cluster&gt;
        </StatusMessage>
      );

    const cluster = await resolveCluster(apiBase, arg);
    const data = await fetchPods(apiBase, cluster.id);
    if (data.length === 0)
      return (
        <StatusMessage variant="info">No pods in {cluster.name}.</StatusMessage>
      );

    return (
      <Box flexDirection="column">
        <Text bold>Pods in {cluster.name}:</Text>
        <Box>
          <Box width={32}>
            <Text bold>Name</Text>
          </Box>
          <Box width={20}>
            <Text bold>Namespace</Text>
          </Box>
          <Box width={18}>
            <Text bold>Status</Text>
          </Box>
          <Box width={8}>
            <Text bold>CPU</Text>
          </Box>
          <Text bold>Memory</Text>
        </Box>
        {data.map((p) => (
          <Box key={p.id}>
            <Box width={32}>
              <Text>{p.name}</Text>
            </Box>
            <Box width={20}>
              <Text>{p.namespace_name ?? "-"}</Text>
            </Box>
            <Box width={18}>
              <Badge
                color={
                  p.status === "Running"
                    ? "green"
                    : p.status === "CrashLoopBackOff"
                      ? "red"
                      : "yellow"
                }
              >
                {p.status}
              </Badge>
            </Box>
            <Box width={8}>
              <Text>{p.cpu_usage.toFixed(2)}</Text>
            </Box>
            <Text>{p.memory_usage}Mi</Text>
          </Box>
        ))}
        <Text color="gray">
          {"\n"}
          {data.length} pod(s)
        </Text>
      </Box>
    );
  },
};
