import { Box, Text, Static } from "ink";
import { TextInput, Spinner } from "@inkjs/ui";
import { CompletionMenu } from "./CompletionMenu.js";
import { useCommandInput } from "../hooks/useCommandInput";
import type { FrameProps } from "./FullScreenFrame";

export const ScrollingFrame = ({
  blocks,
  running,
  handleSubmit,
  suggestions,
  onInputChange,
}: FrameProps) => {
  const input = useCommandInput({
    suggestions,
    onInputChange,
    onSubmit: handleSubmit,
  });

  return (
    <Box flexDirection="column">
      {/* Past output — rendered once, scrolls naturally */}
      <Static items={blocks}>
        {(block) => (
          <Box key={block.id} flexDirection="column" marginBottom={1}>
            <Text color="gray">
              {">"} {block.command}
            </Text>
            {block.content}
          </Box>
        )}
      </Static>

      {/* Live area — re-rendered each frame */}
      {running && <Spinner label="Running..." />}

      <Box flexDirection="column">
        <Box>
          <Text color="cyan">{"> "}</Text>
          <TextInput
            key={input.inputKey}
            defaultValue={input.defaultValue}
            suggestions={suggestions}
            onChange={input.onChange}
            onSubmit={input.handleSubmit}
          />
        </Box>
        {input.menuOpen && input.matches.length > 0 && (
          <Box marginLeft={2}>
            <CompletionMenu
              items={input.matches}
              selectedIndex={input.menuIndex}
            />
          </Box>
        )}
        {input.exitPending && <Text color="gray"> press Ctrl+C again to exit</Text>}
      </Box>
    </Box>
  );
};
