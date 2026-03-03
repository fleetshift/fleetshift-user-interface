import type { Extension, CodeRef } from "@openshift/dynamic-plugin-sdk";
import type { ComponentType } from "react";

export type DashboardWidgetExtension = Extension<
  "fleetshift.dashboard-widget",
  {
    component: CodeRef<ComponentType<{ clusterIds: string[] }>>;
  }
>;

export function isDashboardWidget(e: Extension): e is DashboardWidgetExtension {
  return e.type === "fleetshift.dashboard-widget";
}

export type NavItemExtension = Extension<
  "fleetshift.nav-item",
  {
    label: string;
    path: string;
    component: CodeRef<ComponentType<{ clusterIds: string[] }>>;
  }
>;

export function isNavItem(e: Extension): e is NavItemExtension {
  return e.type === "fleetshift.nav-item";
}

/** Derive the plugin key from a plugin name, e.g. "core-plugin" → "core" */
export function pluginKeyFromName(pluginName: string): string {
  return pluginName.replace(/-plugin$/, "");
}
