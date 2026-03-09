import { Box, Text } from "ink";

interface CompletionMenuProps {
  items: string[];
  selectedIndex: number;
}

export const CompletionMenu = ({
  items,
  selectedIndex,
}: CompletionMenuProps) => (
  <Box flexDirection="column">
    <Box flexDirection="row" flexWrap="wrap">
      {items.map((item, i) => {
        const selected = i === selectedIndex;
        return (
          <Box key={item} paddingX={1}>
            <Text
              backgroundColor={selected ? "blue" : "gray"}
              color={selected ? "white" : "black"}
              bold={selected}
            >
              {" "}
              {item}{" "}
            </Text>
          </Box>
        );
      })}
    </Box>
    <Text color="gray">
      {"  "}
      {"<- ->"}
      {" navigate · tab/enter select · esc cancel"}
    </Text>
  </Box>
);
