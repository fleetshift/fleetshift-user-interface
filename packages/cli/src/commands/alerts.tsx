import { Box, Text } from "ink";
import { Badge, StatusMessage } from "@inkjs/ui";
import { fetchAlerts } from "@fleetshift/common";
import type { Command } from "./types.js";
import { resolveCluster } from "./utils.js";

export const alerts: Command = {
  name: "alerts",
  description: "List alerts for a cluster",
  usage: "alerts <cluster>",
  async run({ apiBase, arg }) {
    if (!arg)
      return <StatusMessage variant="warning">Usage: alerts &lt;cluster&gt;</StatusMessage>;

    const cluster = await resolveCluster(apiBase, arg);
    const data = await fetchAlerts(apiBase, cluster.id);
    if (data.length === 0)
      return <StatusMessage variant="success">No alerts in {cluster.name}.</StatusMessage>;

    return (
      <Box flexDirection="column">
        <Text bold>Alerts in {cluster.name}:</Text>
        <Box>
          <Box width={28}><Text bold>Name</Text></Box>
          <Box width={12}><Text bold>Severity</Text></Box>
          <Box width={12}><Text bold>State</Text></Box>
          <Text bold>Message</Text>
        </Box>
        {data.map((a) => (
          <Box key={a.id}>
            <Box width={28}><Text>{a.name}</Text></Box>
            <Box width={12}>
              <Badge color={a.severity === "critical" ? "red" : a.severity === "warning" ? "yellow" : "white"}>
                {a.severity}
              </Badge>
            </Box>
            <Box width={12}><Text>{a.state}</Text></Box>
            <Text>{a.message}</Text>
          </Box>
        ))}
      </Box>
    );
  },
};
