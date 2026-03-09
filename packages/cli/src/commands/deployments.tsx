import { Box, Text } from "ink";
import { Badge, StatusMessage } from "@inkjs/ui";
import { fetchDeployments } from "@fleetshift/common";
import type { Command } from "./types.js";
import { resolveCluster } from "./utils.js";

export const deployments: Command = {
  name: "deployments",
  aliases: ["deploy"],
  description: "List deployments for a cluster",
  usage: "deployments <cluster>",
  async run({ apiBase, arg }) {
    if (!arg)
      return <StatusMessage variant="warning">Usage: deployments &lt;cluster&gt;</StatusMessage>;

    const cluster = await resolveCluster(apiBase, arg);
    const data = await fetchDeployments(apiBase, cluster.id);
    if (data.length === 0)
      return <StatusMessage variant="info">No deployments in {cluster.name}.</StatusMessage>;

    return (
      <Box flexDirection="column">
        <Text bold>Deployments in {cluster.name}:</Text>
        <Box>
          <Box width={24}><Text bold>Name</Text></Box>
          <Box width={12}><Text bold>Ready</Text></Box>
          <Box width={12}><Text bold>Available</Text></Box>
          <Text bold>Image</Text>
        </Box>
        {data.map((d) => (
          <Box key={d.id}>
            <Box width={24}><Text>{d.name}</Text></Box>
            <Box width={12}>
              <Badge color={d.ready === d.replicas ? "green" : d.ready === 0 ? "red" : "yellow"}>
                {d.ready}/{d.replicas}
              </Badge>
            </Box>
            <Box width={12}>
              <Badge color={d.available === d.replicas ? "green" : d.available === 0 ? "red" : "yellow"}>
                {d.available}/{d.replicas}
              </Badge>
            </Box>
            <Text>{d.image}</Text>
          </Box>
        ))}
      </Box>
    );
  },
};
