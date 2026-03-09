import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useApp } from "ink";
import { StatusMessage, ThemeProvider } from "@inkjs/ui";
import { fleetshiftTheme } from "./theme.js";
import {
  runCommand,
  getCommandNames,
  needsClusterArg,
} from "./commands/index.js";
import { fetchClusters } from "@fleetshift/common";
import { FullScreenFrame } from "./components/FullScreenFrame.js";
import { ScrollingFrame } from "./components/ScrollingFrame.js";
import { OutputBlock } from "./types.js";

export type AppMode = "fullscreen" | "scrolling";

interface AppProps {
  apiBase: string;
  mode: AppMode;
}

let blockId = 0;

export const App = ({ apiBase, mode }: AppProps) => {
  const { exit } = useApp();
  const [blocks, setBlocks] = useState<OutputBlock[]>([]);
  const [running, setRunning] = useState(false);
  const [input, setInput] = useState("");
  const clusterNamesRef = useRef<string[]>([]);

  // Pre-fetch cluster names for tab completion
  useEffect(() => {
    fetchClusters(apiBase)
      .then((data) => {
        clusterNamesRef.current = data.map((c) => c.name);
      })
      .catch(() => {});
  }, [apiBase]);

  // Compute suggestions for TextInput + completion menu.
  // Command names get a trailing space so Tab completes "pods" → "pods "
  // which then triggers cluster-name suggestions on the next Tab.
  const suggestions = useMemo(() => {
    const parts = input.split(/\s+/);

    if (parts.length <= 1 && !input.endsWith(" ")) {
      return getCommandNames().map((n) => n + " ");
    }

    const cmd = parts[0]!.toLowerCase();
    if (!needsClusterArg(cmd)) return [];

    return clusterNamesRef.current.map((name) => `${cmd} ${name}`);
  }, [input]);

  const handleSubmit = useCallback(
    async (value: string) => {
      setRunning(true);
      setInput("");
      try {
        const result = await runCommand(value, apiBase);

        if (result === "exit") {
          exit();
          return;
        }

        if (result === "clear") {
          setBlocks([]);
          setRunning(false);
          return;
        }

        setBlocks((prev) => [
          ...prev,
          { id: blockId++, command: value, content: result },
        ]);
      } catch (err) {
        setBlocks((prev) => [
          ...prev,
          {
            id: blockId++,
            command: value,
            content: (
              <StatusMessage variant="error">
                {err instanceof Error ? err.message : String(err)}
              </StatusMessage>
            ),
          },
        ]);
      }
      // Refresh cluster names cache after each command
      fetchClusters(apiBase)
        .then((data) => {
          clusterNamesRef.current = data.map((c) => c.name);
        })
        .catch(() => {});
      setRunning(false);
    },
    [apiBase, exit],
  );

  const frameProps = {
    blocks,
    running,
    handleSubmit,
    suggestions,
    onInputChange: setInput,
  };

  const Frame = mode === "fullscreen" ? FullScreenFrame : ScrollingFrame;

  return (
    <ThemeProvider theme={fleetshiftTheme}>
      <Frame {...frameProps} />
    </ThemeProvider>
  );
};
