import {
  Progress,
  ProgressMeasureLocation,
  Stack,
  StackItem,
} from "@patternfly/react-core";
import { capacityByGroup } from "../mockData";
import "./FleetCapacity.scss";

const variant = (pct: number) =>
  pct >= 80 ? "danger" : pct >= 65 ? "warning" : undefined;

export default function FleetCapacity(_props: { widgetId: string }) {
  return (
    <Stack hasGutter className="ov-capacity-wrap pf-v6-u-pb-lg">
      {capacityByGroup.map((g) => (
        <StackItem key={g.environment}>
          <div className="ov-capacity-row__name">{g.environment}</div>
          <div className="ov-capacity-row__bars">
            <Progress
              value={g.cpuPercent}
              title="CPU"
              size="sm"
              measureLocation={ProgressMeasureLocation.inside}
              variant={variant(g.cpuPercent)}
            />
            <Progress
              value={g.memoryPercent}
              title="Memory"
              size="sm"
              measureLocation={ProgressMeasureLocation.inside}
              variant={variant(g.memoryPercent)}
            />
          </div>
        </StackItem>
      ))}
    </Stack>
  );
}
