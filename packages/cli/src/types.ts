import type { ReactNode } from "react";

export interface OutputBlock {
  id: number;
  command: string;
  content: ReactNode;
}
