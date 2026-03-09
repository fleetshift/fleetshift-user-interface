import type { ReactNode } from "react";

export type CommandResult = ReactNode;

export interface CommandContext {
  apiBase: string;
  arg: string;
}

export interface Command {
  name: string;
  aliases?: string[];
  description: string;
  usage?: string;
  run: (ctx: CommandContext) => Promise<CommandResult>;
}
