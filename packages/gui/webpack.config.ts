import path from "path";
import * as mf from "@module-federation/enhanced";
const { ModuleFederationPlugin } = mf;
import HtmlWebpackPlugin from "html-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import * as buildUtils from "@fleetshift/build-utils";
const { getDynamicModules, createTsLoaderRule } = buildUtils;
import webpack from "webpack";
import type { Configuration } from "webpack";
import type { Configuration as DevServerConfiguration } from "webpack-dev-server";

const configDir = typeof __dirname === "string" ? __dirname : process.cwd();
const monorepoRoot = path.resolve(configDir, "../..");
const nodeModulesRoot = path.resolve(monorepoRoot, "node_modules");
const pfSharedModules = getDynamicModules(configDir, monorepoRoot);
const tsLoaderRule = createTsLoaderRule({ nodeModulesRoot });

const config: Configuration & { devServer?: DevServerConfiguration } = {
  entry: "./src/index.ts",
  output: {
    publicPath: "/",
    path: path.resolve(configDir, "dist"),
    clean: true,
  },
  mode: "development",
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    // Don't follow symlinks so workspace packages resolve via their package.json exports
    symlinks: false,
  },
  module: {
    rules: [
      { ...tsLoaderRule, exclude: [/node_modules/, /__tests__/] },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
      {
        test: /\.s[ac]ss$/,
        use: [MiniCssExtractPlugin.loader, "css-loader", "sass-loader"],
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/,
        type: "asset/resource",
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "fleetshift_shell",
      remotes: {},
      shared: {
        react: { singleton: true, requiredVersion: "^18" },
        "react-dom": { singleton: true, requiredVersion: "^18" },
        "react-router-dom": { singleton: true, requiredVersion: "^6" },
        "@scalprum/core": { singleton: true },
        "@scalprum/react-core": { singleton: true },
        "@openshift/dynamic-plugin-sdk": { singleton: true },
        "@fleetshift/common": { requiredVersion: "*", version: "*" },
        ...pfSharedModules,
      },
    }),
    new MiniCssExtractPlugin(),
    new webpack.DefinePlugin({
      "process.env.KEYCLOAK_URL": JSON.stringify(
        process.env.KEYCLOAK_URL ?? "http://localhost:8080",
      ),
    }),
    new HtmlWebpackPlugin({
      template: "./src/index.html",
    }),
  ],
  devServer: {
    historyApiFallback: true,
    port: 3000,
    proxy: [
      {
        context: ["/api"],
        target: process.env.API_PROXY_TARGET ?? "http://localhost:4000",
      },
    ],
  },
};

export default config;
