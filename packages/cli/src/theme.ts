import { defaultTheme, extendTheme } from "@inkjs/ui";

export const fleetshiftTheme = extendTheme(defaultTheme, {
  components: {
    Spinner: {
      styles: {
        frame: () => ({
          color: "cyan",
        }),
      },
    },
  },
});
