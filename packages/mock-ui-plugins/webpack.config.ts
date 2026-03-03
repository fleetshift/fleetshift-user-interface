/* eslint-disable @typescript-eslint/ban-ts-comment */
import path from "path";
import {
  ModuleFederationPlugin,
  ContainerPlugin,
} from "@module-federation/enhanced";
import { DynamicRemotePlugin } from "@openshift/dynamic-plugin-sdk-webpack";
import { getDynamicModules, createTsLoaderRule } from "@fleetshift/build-utils";
import type { Configuration } from "webpack";

const monorepoRoot = path.resolve(__dirname, "../..");
const nodeModulesRoot = path.resolve(monorepoRoot, "node_modules");
const pfSharedModules = getDynamicModules(__dirname, monorepoRoot);
const tsLoaderRule = createTsLoaderRule({ nodeModulesRoot });

const sharedModules = {
  react: { singleton: true, requiredVersion: "*" },
  "react-dom": { singleton: true, requiredVersion: "*" },
  "@scalprum/core": { singleton: true, requiredVersion: "*" },
  "@scalprum/react-core": { singleton: true, requiredVersion: "*" },
  "@openshift/dynamic-plugin-sdk": { singleton: true, requiredVersion: "*" },
  ...pfSharedModules,
};

// @ts-ignore — @module-federation/enhanced types differ from SDK expectations
const mfOverride = {
  libraryType: "global",
  pluginOverride: {
    ModuleFederationPlugin,
    ContainerPlugin,
  },
};

const CorePlugin = new DynamicRemotePlugin({
  extensions: [
    {
      type: "fleetshift.dashboard-widget",
      properties: {
        component: { $codeRef: "ClusterOverview.default" },
      },
    },
    {
      type: "fleetshift.nav-item",
      properties: {
        label: "Pods",
        path: "pods",
        component: { $codeRef: "PodList.default" },
      },
    },
    {
      type: "fleetshift.nav-item",
      properties: {
        label: "Namespaces",
        path: "ns",
        component: { $codeRef: "NamespaceList.default" },
      },
    },
  ],
  sharedModules,
  entryScriptFilename: "core-plugin.[contenthash].js",
  pluginManifestFilename: "core-plugin-manifest.json",
  // @ts-ignore — enhanced MF types differ from SDK expectations
  moduleFederationSettings: mfOverride,
  pluginMetadata: {
    name: "core-plugin",
    version: "1.0.0",
    exposedModules: {
      ClusterOverview: path.resolve(
        __dirname,
        "./src/plugins/core-plugin/ClusterOverview.tsx",
      ),
      PodList: path.resolve(__dirname, "./src/plugins/core-plugin/PodList.tsx"),
      NamespaceList: path.resolve(
        __dirname,
        "./src/plugins/core-plugin/NamespaceList.tsx",
      ),
    },
  },
});

const ObservabilityPlugin = new DynamicRemotePlugin({
  extensions: [
    {
      type: "fleetshift.nav-item",
      properties: {
        label: "Observability",
        path: "metrics",
        component: { $codeRef: "MetricsDashboard.default" },
      },
    },
  ],
  sharedModules,
  entryScriptFilename: "observability-plugin.[contenthash].js",
  pluginManifestFilename: "observability-plugin-manifest.json",
  // @ts-ignore — enhanced MF types differ from SDK expectations
  moduleFederationSettings: mfOverride,
  pluginMetadata: {
    name: "observability-plugin",
    version: "1.0.0",
    exposedModules: {
      MetricsDashboard: path.resolve(
        __dirname,
        "./src/plugins/observability-plugin/MetricsDashboard.tsx",
      ),
      PodMetrics: path.resolve(
        __dirname,
        "./src/plugins/observability-plugin/PodMetrics.tsx",
      ),
    },
  },
});

const config: Configuration = {
  entry: {
    mock: path.resolve(__dirname, "./src/index.ts"),
  },
  output: {
    publicPath: "auto",
  },
  mode: "development",
  plugins: [CorePlugin, ObservabilityPlugin],
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
  },
  module: {
    rules: [
      tsLoaderRule,
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
};

export default config;
