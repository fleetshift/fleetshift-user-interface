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

const ExamplePlugin = new DynamicRemotePlugin({
  extensions: [],
  sharedModules,
  entryScriptFilename: "example-plugin.[contenthash].js",
  moduleFederationSettings: {
    libraryType: "global",
    pluginOverride: {
      // @ts-ignore
      ModuleFederationPlugin,
      ContainerPlugin,
    },
  },
  pluginMetadata: {
    name: "example-plugin",
    version: "1.0.0",
    exposedModules: {
      "./ExamplePage": path.resolve(
        __dirname,
        "./src/plugins/example-plugin/ExamplePage.tsx",
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
  plugins: [ExamplePlugin],
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
