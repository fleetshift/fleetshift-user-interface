#!/usr/bin/env node
import meow from "meow";
import { render } from "ink";
import { App } from "./App.js";
import { SingleCommand } from "./components/SingleCommand.js";
import { ThemeProvider } from "@inkjs/ui";
import { fleetshiftTheme } from "./theme.js";
import { ENTER_ALT_SCREEN, LEAVE_ALT_SCREEN } from "./utils/fullscreen.js";

const cli = meow(
  `
  Usage
    $ fleetshift                        Interactive mode (scrolling)
    $ fleetshift --fullscreen           Interactive mode (fullscreen TUI)
    $ fleetshift <command> [args]       Run a single command and exit

  Commands
    clusters                            List installed clusters
    pods <cluster>                      List pods for a cluster
    nodes <cluster>                     List nodes for a cluster
    alerts <cluster>                    List alerts for a cluster
    deployments <cluster>               List deployments for a cluster

  Options
    -f, --fullscreen    Use fullscreen TUI mode
    --api-base          Mock server URL (default: http://localhost:4000/api/v1)
`,
  {
    importMeta: import.meta,
    flags: {
      fullscreen: {
        type: "boolean",
        shortFlag: "f",
        default: false,
      },
      apiBase: {
        type: "string",
        default: "http://localhost:4000/api/v1",
      },
    },
  },
);

const { apiBase, fullscreen } = cli.flags;

if (cli.input.length > 0) {
  // Non-interactive: run single command, print result, exit
  const input = cli.input.join(" ");
  render(
    <ThemeProvider theme={fleetshiftTheme}>
      <SingleCommand input={input} apiBase={apiBase} />
    </ThemeProvider>,
  );
} else if (fullscreen) {
  // Fullscreen TUI — enter alt screen before render, exit on quit
  process.stdout.write(ENTER_ALT_SCREEN);
  const instance = render(<App apiBase={apiBase} mode="fullscreen" />, {
    exitOnCtrlC: false,
  });
  instance.waitUntilExit().then(() => {
    process.stdout.write(LEAVE_ALT_SCREEN);
  });
} else {
  // Scrolling interactive mode
  render(<App apiBase={apiBase} mode="scrolling" />, {
    exitOnCtrlC: false,
  });
}
