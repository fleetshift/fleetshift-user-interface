import { useState } from "react";
import {
  Select,
  SelectOption,
  SelectList,
  MenuToggle,
  MenuToggleElement,
} from "@patternfly/react-core";
import { useClusters } from "../contexts/ClusterContext";
import { useScope } from "../contexts/ScopeContext";

export const ClusterSwitcher = () => {
  const { installed } = useClusters();
  const { scope, setScope } = useScope();
  const [isOpen, setIsOpen] = useState(false);

  const selectedLabel =
    scope === "all"
      ? "All Clusters"
      : installed.find((c) => c.id === scope)?.name ?? "All Clusters";

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      onClick={() => setIsOpen((o) => !o)}
      isExpanded={isOpen}
    >
      {selectedLabel}
    </MenuToggle>
  );

  return (
    <Select
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      toggle={toggle}
      onSelect={(_event, value) => {
        setScope(value as string);
        setIsOpen(false);
      }}
      selected={scope}
    >
      <SelectList>
        <SelectOption value="all">All Clusters</SelectOption>
        {installed.map((cluster) => (
          <SelectOption key={cluster.id} value={cluster.id}>
            {cluster.name}
          </SelectOption>
        ))}
      </SelectList>
    </Select>
  );
};
