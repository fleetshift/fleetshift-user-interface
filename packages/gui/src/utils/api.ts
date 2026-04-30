import type { NavLayoutEntry, CanvasPage, CanvasModule } from "./extensions";

export type { NavLayoutEntry, CanvasPage, CanvasModule };

export interface User {
  id: string;
  username: string;
  display_name: string;
  role: string;
  navLayout: NavLayoutEntry[];
}
