import { useState, useEffect, useRef } from "react";
import { Box, Text, useStdout, useInput } from "ink";
import { TextInput, Spinner } from "@inkjs/ui";
import { ScrollView, type ScrollViewRef } from "ink-scroll-view";
import { OutputBlock } from "../types.js";
import { CompletionMenu } from "./CompletionMenu.js";
import { useCommandInput } from "../hooks/useCommandInput.js";

// Header: border top (1) + content (1) + border bottom (1) = 3
// Footer: border top (1) + input (1) + border bottom (1) = 3
const BASE_CHROME_ROWS = 6;
// Completion menu when open: items row (1) + hint row (1) = 2
const MENU_ROWS = 2;
// Debug pane: state line (1) + log lines (up to 8) + border (2) = 11
const DEBUG_ROWS = 11;

export interface FrameProps {
  blocks: OutputBlock[];
  running: boolean;
  handleSubmit: (input: string) => void;
  suggestions: string[];
  onInputChange: (value: string) => void;
}

export const FullScreenFrame = ({
  blocks,
  running,
  handleSubmit,
  suggestions,
  onInputChange,
}: FrameProps) => {
  const { stdout } = useStdout();
  const scrollRef = useRef<ScrollViewRef>(null);

  const input = useCommandInput({
    suggestions,
    onInputChange,
    onSubmit: handleSubmit,
  });

  // Track terminal dimensions
  const [size, setSize] = useState({
    columns: stdout.columns,
    rows: stdout.rows - 1,
  });

  // Prevent default input echo from shifting the fullscreen layout
  useInput(() => {});

  useEffect(() => {
    const onResize = () => {
      setSize({
        columns: stdout.columns,
        rows: stdout.rows - 1,
      });
      scrollRef.current?.remeasure();
    };
    stdout.on("resize", onResize);
    return () => {
      stdout.off("resize", onResize);
    };
  }, [stdout]);

  // Auto-scroll to bottom when new blocks arrive or command is running
  useEffect(() => {
    scrollRef.current?.scrollToBottom();
  }, [blocks.length, running]);

  const menuVisible = input.menuOpen && input.matches.length > 0;
  const chromeRows =
    BASE_CHROME_ROWS + (menuVisible ? MENU_ROWS : 0) + DEBUG_ROWS;
  const maxContentRows = Math.max(1, size.rows - chromeRows);

  // Remeasure when menu opens/closes since content area height changes
  useEffect(() => {
    scrollRef.current?.remeasure();
  }, [menuVisible]);

  return (
    <Box
      width={size.columns}
      height={size.rows}
      flexDirection="column"
      overflow="hidden"
    >
      {/* Header */}
      <Box borderStyle="single" borderColor="cyan" paddingX={1}>
        <Text bold color="cyan">
          FleetShift CLI
        </Text>
        <Text dimColor>
          {" "}
          — type &apos;help&apos; for commands, &apos;quit&apos; to exit
        </Text>
      </Box>

      {/* Debug pane */}
      <Box
        borderStyle="single"
        borderColor="yellow"
        flexDirection="column"
        paddingX={1}
        height={DEBUG_ROWS}
        overflow="hidden"
      >
        <Text bold color="yellow">
          DEBUG inputKey={input.inputKey} defaultValue=
          {JSON.stringify(input.defaultValue)} currentValue=
          {JSON.stringify(input.currentValue)}
        </Text>
        {input.debugEntries.slice(-8).map((e, i) => {
          const age = Date.now() - e.ts;
          const ageStr =
            age < 1000 ? `${age}ms` : `${(age / 1000).toFixed(1)}s`;
          return (
            <Text key={i} dimColor wrap="truncate">
              {`${ageStr} ${e.event} ${JSON.stringify(e.data)}`}
            </Text>
          );
        })}
      </Box>

      {/* Main Content Area — ScrollView handles overflow */}
      <Box height={maxContentRows} paddingX={2}>
        <ScrollView ref={scrollRef} flexGrow={1}>
          {blocks.map((block) => (
            <Box key={block.id} flexDirection="column" marginBottom={1}>
              <Text dimColor>
                {">"} {block.command}
              </Text>
              {block.content}
            </Box>
          ))}
          {running && (
            <Box key="__spinner__">
              <Spinner label="Running..." />
            </Box>
          )}
        </ScrollView>
      </Box>

      {/* Completion menu — rendered between content and footer */}
      {menuVisible && (
        <Box paddingX={2}>
          <CompletionMenu
            items={input.matches}
            selectedIndex={input.menuIndex}
          />
        </Box>
      )}

      {/* Footer / Input Bar */}
      <Box borderStyle="single" borderColor="gray" paddingX={1}>
        <Text color="cyan">{"> "}</Text>
        <TextInput
          key={input.inputKey}
          defaultValue={input.defaultValue}
          suggestions={suggestions}
          onChange={input.onChange}
          onSubmit={input.handleSubmit}
        />
      </Box>
      {input.exitPending && <Text dimColor> press Ctrl+C again to exit</Text>}
    </Box>
  );
};
