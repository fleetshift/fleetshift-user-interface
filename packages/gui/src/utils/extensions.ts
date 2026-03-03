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

// --- Nav Layout types ---

export interface NavLayoutItem {
  type: "item";
  path: string;
}

export interface NavLayoutSection {
  type: "section";
  id: string;
  label: string;
  children: { path: string }[];
}

export type NavLayoutEntry = NavLayoutItem | NavLayoutSection;

/** Check whether a path exists anywhere in the layout (top-level or inside a section) */
export function isPathInLayout(
  layout: NavLayoutEntry[],
  path: string,
): boolean {
  return layout.some(
    (entry) =>
      (entry.type === "item" && entry.path === path) ||
      (entry.type === "section" &&
        entry.children.some((child) => child.path === path)),
  );
}
