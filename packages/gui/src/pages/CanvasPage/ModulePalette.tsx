import { Button, Title } from "@patternfly/react-core";
import { PlusIcon } from "@patternfly/react-icons";
import { pluginKeyFromName } from "../../utils/extensions";
import type { ModuleRef } from "../../utils/extensions";
import "./CanvasPage.scss";

interface ModulePaletteProps {
  modules: ModuleRef[];
  clusterIdsForPlugin: (key: string) => string[];
  onAdd: (ref: ModuleRef) => void;
}

export function ModulePalette({
  modules,
  clusterIdsForPlugin,
  onAdd,
}: ModulePaletteProps) {
  return (
    <div className="fs-module-palette">
      <Title headingLevel="h3" className="pf-v6-u-mb-sm">
        Module Palette
      </Title>
      {modules.length === 0 && (
        <p className="pf-v6-u-text-color-subtle">
          No plugin modules available. Install clusters with plugins first.
        </p>
      )}
      {modules.map((ref) => {
        const pluginKey = pluginKeyFromName(ref.scope);
        const hasCluster = clusterIdsForPlugin(pluginKey).length > 0;
        return (
          <div
            key={`${ref.scope}/${ref.module}`}
            className="fs-module-palette__item"
            style={{ opacity: hasCluster ? 1 : 0.5 }}
          >
            <span className="fs-module-palette__label">{ref.label}</span>
            <span className="fs-module-palette__scope">{ref.scope}</span>
            <Button
              variant="plain"
              size="sm"
              aria-label={`Add ${ref.label}`}
              onClick={() => onAdd(ref)}
              isDisabled={!hasCluster}
              icon={<PlusIcon />}
            />
          </div>
        );
      })}
    </div>
  );
}
