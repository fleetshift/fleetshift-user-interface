import type { CodeRef, Extension } from "@openshift/dynamic-plugin-sdk";
import type { ComponentType } from "react";

export interface SearchResultProps {
  title: string;
  description: string;
}

export type SearchIndexExtension = Extension<
  "fleetshift.search-index",
  {
    id: string;
    title: string;
    description: string;
    category: "nav" | "action" | "cluster" | "setting";
    meta?: string;
    component: CodeRef<ComponentType<SearchResultProps>>;
  }
>;

export function isSearchIndexExtension(
  e: Extension,
): e is SearchIndexExtension {
  return e.type === "fleetshift.search-index";
}
