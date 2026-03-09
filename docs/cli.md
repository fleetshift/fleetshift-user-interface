# CLI

A terminal dashboard for FleetShift built with [Ink](https://github.com/vadimdemedes/ink) and [@inkjs/ui](https://github.com/vadimdemedes/ink-ui). Connects to the same mock server API as the GUI.

## Three Modes

```
$ fleetshift                        # scrolling interactive (default)
$ fleetshift --fullscreen / -f      # fullscreen TUI with alt-screen buffer
$ fleetshift pods "US East"         # single command, print result, exit
```

**Scrolling** — output scrolls naturally in the terminal. Uses Ink's `Static` component so past output is rendered once and never re-rendered.

**Fullscreen** — alternate screen buffer TUI with a fixed header, scrollable content area (`ink-scroll-view`), completion menu, and input bar. Terminal resize is handled automatically.

**Single command** — non-interactive. Runs one command, prints the result, and exits. Useful for scripting or quick lookups.

## Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `clusters` | | List installed clusters |
| `pods <cluster>` | | List pods for a cluster |
| `nodes <cluster>` | | List nodes for a cluster |
| `alerts <cluster>` | | List alerts for a cluster |
| `deployments <cluster>` | `deploy` | List deployments for a cluster |
| `help` | | Show available commands |
| `clear` | | Clear output |
| `quit` / `exit` | | Exit the CLI |

Cluster names are matched by prefix (e.g. `pods us` matches `US East Production`).

## Tab Completion

- Typing a partial command and pressing **Tab** completes it (e.g. `po` → `pods `).
- After a command that takes a `<cluster>` argument, Tab completes cluster names fetched from the API.
- When multiple matches exist, Tab opens a **completion menu** navigable with arrow keys. **Tab** or **Enter** accepts the highlighted item, **Escape** closes the menu.

## Key Bindings

| Key | Action |
|-----|--------|
| Tab | Autocomplete / open completion menu |
| Enter | Submit command / accept menu selection |
| Arrow keys | Navigate completion menu |
| Escape | Close completion menu |
| Ctrl+C (×2) | Exit (double-tap required) |

## Tech Stack

- **Ink 5** — React renderer for the terminal
- **@inkjs/ui** — `TextInput`, `Spinner`, `Badge`, `StatusMessage`, `ThemeProvider`
- **ink-scroll-view** — scrollable content area in fullscreen mode
- **meow** — CLI argument parsing
- **@fleetshift/common** — shared API client (`fetchClusters`, etc.)

## Architecture

```
cli.tsx                          Entry point — parses flags, picks mode
├─ App.tsx                       Interactive shell state (blocks, suggestions)
│  ├─ FullScreenFrame.tsx        Alt-screen TUI with ScrollView
│  └─ ScrollingFrame.tsx         Natural terminal scrolling with Static
├─ SingleCommand.tsx             Non-interactive one-shot mode
├─ hooks/useCommandInput.ts      Shared input, completion menu, Ctrl+C logic
├─ commands/                     Command implementations (clusters, pods, …)
└─ theme.ts                      @inkjs/ui theme overrides
```
