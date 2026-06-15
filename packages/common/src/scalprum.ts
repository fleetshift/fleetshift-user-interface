export interface NavPage {
  id: string;
  scope: string;
  title: string;
}

export interface FleetShiftApi {
  fleetshift: {
    getPluginPagePath: (scope: string, module: string) => string | undefined;
    getNavPages: () => NavPage[];
  };
}
