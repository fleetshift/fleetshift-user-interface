import type { RuleSetRule } from "webpack";
import { createTransformer } from "./tsc-transform-imports";

export interface TsLoaderRuleOptions {
  /** Absolute path to the node_modules directory where PF packages live. */
  nodeModulesRoot: string;
}

/**
 * Creates a ts-loader webpack rule with the PF dynamic import transformer
 * configured for the given node_modules root.
 */
export default function createTsLoaderRule(
  options: TsLoaderRuleOptions,
): RuleSetRule {
  const transformer = createTransformer({
    nodeModulesRoot: options.nodeModulesRoot,
  });

  return {
    test: /\.(js|ts)x?$/,
    exclude: /node_modules/,
    use: {
      loader: "ts-loader",
      options: {
        getCustomTransformers: () => ({
          before: [transformer],
        }),
      },
    },
  };
}
