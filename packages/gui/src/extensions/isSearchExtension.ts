import type { CodeRef, Extension } from "@openshift/dynamic-plugin-sdk";
import type { ComponentType } from "react";
import type { SearchResultProps } from "./isSearchIndexExtension";

export type SearchExtension = Extension<
  "fleetshift.search-extension",
  {
    id: string;
    title: string;
    description: string;
    feature: string;
    icon?: string;
    meta?: string[];
    to?: { pathname?: string; search?: string };
    iconComponent?: CodeRef<ComponentType>;
    component?: CodeRef<ComponentType<SearchResultProps>>;
  }
>;

export function isSearchExtension(e: Extension): e is SearchExtension {
  return e.type === "fleetshift.search-extension";
}
