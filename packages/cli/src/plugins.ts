import { makeRequest } from "@fleetshift/common";
import { createInstance } from "@module-federation/enhanced/runtime";
import type { ReactNode } from "react";
import type { Command } from "./commands/types.js";

const mfInstance = createInstance({
  name: "cli-host",
  remotes: [],
});

/** Loaded plugin entries for startup display. */
const loadedPlugins: Array<{ label: string; name: string; exposes: string[] }> =
  [];

interface CliPluginMfManifest {
  name: string;
  remoteEntry: string;
  remoteEntryType: string;
  exposes: Array<{ name: string; path: string }>;
}

interface CliPluginEntry {
  name: string;
  key: string;
  label: string;
  persona: "ops" | "dev";
  mfManifest: CliPluginMfManifest;
}

interface CliPluginRegistry {
  assetsHost: string;
  plugins: Record<string, CliPluginEntry>;
}

export interface PluginCommand {
  command: Command;
  /** Plugin key — command only available for clusters with this plugin enabled. */
  pluginKey: string;
}

let registry: CliPluginRegistry | null = null;
const pluginCommands: PluginCommand[] = [];

/**
 * Fetch the CLI plugin registry from the server and initialize plugins.
 * Called once during CLI startup.
 */
export async function initPlugins(apiBase: string): Promise<void> {
  try {
    registry = await makeRequest<CliPluginRegistry>(
      `${apiBase}/cli-plugin-registry`,
    );
  } catch {
    // Registry not available — CLI works fine without plugins
    registry = null;
    return;
  }

  const entries = Object.values(registry.plugins);
  if (entries.length === 0) return;

  for (const plugin of entries) {
    await initPlugin(plugin, registry.assetsHost);
  }
}

/** Info about plugins loaded at startup, for rendering in the UI. */
export function getLoadedPlugins(): Array<{ label: string; name: string; exposes: string[] }> {
  return loadedPlugins;
}

/**
 * Initialize a single CLI plugin via Module Federation.
 * Loads exposed modules and registers them as CLI commands.
 */
async function initPlugin(
  plugin: CliPluginEntry,
  _assetsHost: string,
): Promise<void> {
  mfInstance.registerRemotes([
    {
      name: plugin.mfManifest.name,
      entry: `http://localhost:8002/${plugin.mfManifest.remoteEntry}`,
      type: plugin.mfManifest.remoteEntryType,
    },
  ]);

  const exposedNames: string[] = [];

  for (const exposed of plugin.mfManifest.exposes) {
    try {
      const mod = await mfInstance.loadRemote(
        `${plugin.mfManifest.name}/${exposed.name}`,
      );
      const fn = (mod as Record<string, unknown>).default as
        | ((apiBase: string, clusterId: string) => Promise<ReactNode>)
        | undefined;

      if (typeof fn !== "function") continue;

      exposedNames.push(exposed.name);

      pluginCommands.push({
        pluginKey: plugin.key,
        command: {
          name: exposed.name,
          description: `${plugin.label}: ${exposed.name} (plugin)`,
          usage: `${exposed.name} <cluster>`,
          async run({ apiBase, arg }) {
            const { resolveCluster } = await import("./commands/utils.js");
            const { StatusMessage } = await import("@inkjs/ui");
            const React = await import("react");

            if (!arg) {
              return React.createElement(StatusMessage, {
                variant: "warning",
                children: `Usage: ${exposed.name} <cluster>`,
              });
            }

            const cluster = await resolveCluster(apiBase, arg);
            if (!cluster.plugins?.includes(plugin.key)) {
              return React.createElement(StatusMessage, {
                variant: "error",
                children: `Plugin "${plugin.label}" is not enabled on ${cluster.name}.`,
              });
            }

            return fn(apiBase, cluster.id);
          },
        },
      });
    } catch (err) {
      console.error(
        `[plugins] Failed to load ${plugin.name}/${exposed.name}:`,
        err,
      );
    }
  }

  if (exposedNames.length > 0) {
    loadedPlugins.push({
      label: plugin.label,
      name: plugin.name,
      exposes: exposedNames,
    });
  }
}

/** Get ALL registered plugin commands (unfiltered). Use for metadata lookups only. */
export function getAllPluginCommands(): PluginCommand[] {
  return pluginCommands;
}

/** Get plugin commands filtered to only those with at least one cluster enabled. */
export function getPluginCommands(
  clusters: Array<{ plugins?: string[] }>,
): PluginCommand[] {
  return pluginCommands.filter((pc) =>
    clusters.some((c) => c.plugins?.includes(pc.pluginKey)),
  );
}

/** Get the loaded registry (null if not yet initialized or unavailable). */
export function getCliPluginRegistry(): CliPluginRegistry | null {
  return registry;
}
