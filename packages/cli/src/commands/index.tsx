import { Box, Text } from "ink";
import type { Command, CommandResult } from "./types.js";
import { clusters } from "./clusters.js";
import { pods } from "./pods.js";
import { nodes } from "./nodes.js";
import { alerts } from "./alerts.js";
import { deployments } from "./deployments.js";
import { install } from "./install.js";
import { uninstall } from "./uninstall.js";
import { enable } from "./enable.js";
import { disable } from "./disable.js";
import { getPluginCommands, getAllPluginCommands } from "../plugins.js";

export type { CommandResult } from "./types.js";

const builtinCommands: Command[] = [
  clusters,
  install,
  uninstall,
  enable,
  disable,
  pods,
  nodes,
  alerts,
  deployments,
];

function getAllCommands(
  clusters: Array<{ plugins?: string[] }>,
): Command[] {
  return [
    ...builtinCommands,
    ...getPluginCommands(clusters).map((pc) => pc.command),
  ];
}

function getCommandMap(
  clusters: Array<{ plugins?: string[] }>,
): Map<string, Command> {
  const map = new Map<string, Command>();
  for (const cmd of getAllCommands(clusters)) {
    map.set(cmd.name, cmd);
    for (const alias of cmd.aliases ?? []) {
      map.set(alias, cmd);
    }
  }
  return map;
}

function buildHelp(
  clusters: Array<{ plugins?: string[] }>,
): CommandResult {
  return (
    <Box flexDirection="column">
      <Text bold>Available commands:</Text>
      <Text> </Text>
      {getAllCommands(clusters).map((cmd) => (
        <Box key={cmd.name}>
          <Box width={24}>
            <Text>{cmd.usage ?? cmd.name}</Text>
          </Box>
          <Text>{cmd.description}</Text>
        </Box>
      ))}
      <Box>
        <Box width={24}>
          <Text>help</Text>
        </Box>
        <Text>Show this help</Text>
      </Box>
      <Box>
        <Box width={24}>
          <Text>clear</Text>
        </Box>
        <Text>Clear output</Text>
      </Box>
      <Box>
        <Box width={24}>
          <Text>quit / exit</Text>
        </Box>
        <Text>Exit the CLI</Text>
      </Box>
      <Text> </Text>
      <Text color="gray">
        Cluster names are matched by prefix (e.g. &apos;pods us&apos; matches
        &apos;US East Production&apos;).
      </Text>
    </Box>
  );
}

/** All top-level command names + aliases + builtins for tab completion. */
export function getCommandNames(
  clusters: Array<{ plugins?: string[] }>,
): string[] {
  const names = getAllCommands(clusters).flatMap((c) => [
    c.name,
    ...(c.aliases ?? []),
  ]);
  names.push("help", "clear", "quit", "exit");
  return names;
}

/** Commands that accept a cluster argument (for second-word completion). */
export function needsClusterArg(cmd: string): boolean {
  // Check builtins
  const builtin = builtinCommands.find(
    (c) => c.name === cmd || c.aliases?.includes(cmd),
  );
  if (builtin) return !!builtin.usage?.includes("<cluster>");
  // Check all plugin commands (unfiltered — we just need the usage shape)
  const pc = getAllPluginCommands().find(
    (p) => p.command.name === cmd || p.command.aliases?.includes(cmd),
  );
  return !!pc?.command.usage?.includes("<cluster>");
}

/** If cmd is a plugin command, return its required plugin key; otherwise undefined. */
export function getPluginKeyForCommand(cmd: string): string | undefined {
  const pc = getAllPluginCommands().find(
    (p) => p.command.name === cmd || p.command.aliases?.includes(cmd),
  );
  return pc?.pluginKey;
}

export async function runCommand(
  input: string,
  apiBase: string,
  clusters: Array<{ plugins?: string[] }>,
): Promise<CommandResult | "clear" | "exit"> {
  const parts = input.split(/\s+/);
  const name = parts[0]!.toLowerCase();
  const arg = parts.slice(1).join(" ");

  if (name === "help") return buildHelp(clusters);
  if (name === "clear") return "clear";
  if (name === "quit" || name === "exit") return "exit";

  const cmd = getCommandMap(clusters).get(name);
  if (!cmd) {
    return (
      <Text color="yellow">
        Unknown command: {name}. Type &apos;help&apos; for available commands.
      </Text>
    );
  }

  return cmd.run({ apiBase, arg });
}
