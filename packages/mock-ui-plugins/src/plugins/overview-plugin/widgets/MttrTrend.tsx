import {
  Chart,
  ChartAxis,
  ChartGroup,
  ChartLine,
  ChartThemeColor,
  ChartVoronoiContainer,
} from "@patternfly/react-charts/victory";
import { mttrHistory } from "../mockData";

export default function MttrTrend(_props: { widgetId: string }) {
  return (
    <div className="ov-mttr">
      <Chart
        height={250}
        padding={{ top: 20, bottom: 50, left: 60, right: 30 }}
        themeColor={ChartThemeColor.blue}
        containerComponent={
          <ChartVoronoiContainer
            labels={({ datum }) => `${datum.x}: ${datum.y} min`}
          />
        }
      >
        <ChartAxis
          tickValues={mttrHistory.map((_, i) => i)}
          tickFormat={mttrHistory.map((d) => d.month)}
        />
        <ChartAxis
          dependentAxis
          tickFormat={(t: number) => `${t}m`}
          domain={[0, 260]}
        />
        <ChartGroup>
          <ChartLine
            data={mttrHistory.map((d, i) => ({ x: i, y: d.minutes }))}
            style={{ data: { strokeWidth: 3 } }}
          />
        </ChartGroup>
      </Chart>
    </div>
  );
}
