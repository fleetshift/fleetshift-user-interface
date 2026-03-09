import { type ReactNode, useState, useEffect } from "react";
import { useApp } from "ink";
import { Spinner, StatusMessage } from "@inkjs/ui";
import { runCommand } from "../commands/index.js";

interface SingleCommandProps {
  input: string;
  apiBase: string;
}

export const SingleCommand = ({ input, apiBase }: SingleCommandProps) => {
  const { exit } = useApp();
  const [result, setResult] = useState<ReactNode>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    runCommand(input, apiBase)
      .then((r) => {
        if (r === "exit" || r === "clear") {
          exit();
          return;
        }
        setResult(r);
        setDone(true);
      })
      .catch((err: unknown) => {
        setResult(
          <StatusMessage variant="error">
            {err instanceof Error ? err.message : String(err)}
          </StatusMessage>,
        );
        setDone(true);
      });
  }, [input, apiBase, exit]);

  // Exit after result is rendered
  useEffect(() => {
    if (done) {
      // Small delay to let Ink flush the final render
      const timer = setTimeout(() => exit(), 50);
      return () => clearTimeout(timer);
    }
  }, [done, exit]);

  if (!result) return <Spinner label="Loading..." />;
  return <>{result}</>;
};
