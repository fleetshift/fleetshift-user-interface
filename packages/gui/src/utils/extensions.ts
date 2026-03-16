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

// --- Deployment detail tab extension ---

export interface DeploymentTabProps {
  deploymentId: string;
  deploymentName: string;
  namespace: string;
  clusterId: string;
}

export type DeploymentDetailTabExtension = Extension<
  "fleetshift.deployment-detail-tab",
  {
    label: string;
    priority: number;
    component: CodeRef<ComponentType<DeploymentTabProps>>;
    isApplicable?: CodeRef<(props: DeploymentTabProps) => boolean>;
  }
>;

export function isDeploymentDetailTab(
  e: Extension,
): e is DeploymentDetailTabExtension {
  return e.type === "fleetshift.deployment-detail-tab";
}

/** Derive the plugin key from a plugin name, e.g. "core-plugin" → "core" */
export function pluginKeyFromName(pluginName: string): string {
  return pluginName.replace(/-plugin$/, "");
}

// --- Canvas composition types ---

/** Reference to a plugin module for ScalprumComponent rendering */
export interface ModuleRef {
  scope: string; // plugin name, e.g. "core-plugin"
  module: string; // exposed module, e.g. "./PodList"
  label: string; // display name for palette
}

/** A module placed on the canvas grid */
export interface CanvasModule {
  i: string; // unique instance ID
  x: number;
  y: number;
  w: number;
  h: number;
  moduleRef: ModuleRef;
}

/** A composed page */
export interface CanvasPage {
  id: string;
  title: string;
  path: string; // user-chosen slug, e.g. "pods"
  modules: CanvasModule[];
}

// --- Nav Layout types ---

export interface NavLayoutPage {
  type: "page";
  pageId: string;
}

export interface NavLayoutSection {
  type: "section";
  id: string;
  label: string;
  children: { pageId: string }[];
}

export type NavLayoutEntry = NavLayoutPage | NavLayoutSection;

/** Check whether a page exists anywhere in the layout (top-level or inside a section) */
export function isPageInLayout(
  layout: NavLayoutEntry[],
  pageId: string,
): boolean {
  return layout.some(
    (entry) =>
      (entry.type === "page" && entry.pageId === pageId) ||
      (entry.type === "section" &&
        entry.children.some((child) => child.pageId === pageId)),
  );
}

const RESERVED_SEGMENTS = new Set(["", "clusters", "navigation", "pages"]);

/** Validate a canvas page path slug. Returns error message or null if valid. */
export function validatePagePath(
  path: string,
  existingPages: CanvasPage[],
  excludeId?: string,
): string | null {
  if (!path) return "Path is required";
  if (!/^[a-z0-9][a-z0-9-]*(\/[a-z0-9][a-z0-9-]*)*$/.test(path))
    return "Path must be lowercase alphanumeric segments separated by /";
  const firstSegment = path.split("/")[0];
  if (RESERVED_SEGMENTS.has(firstSegment))
    return `Paths starting with "${firstSegment}" are reserved`;
  const conflict = existingPages.find(
    (p) => p.path === path && p.id !== excludeId,
  );
  if (conflict) return `Path "${path}" is already used by "${conflict.title}"`;
  return null;
}
