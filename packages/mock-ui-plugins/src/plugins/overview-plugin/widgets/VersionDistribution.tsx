import { ChartDonut } from "@patternfly/react-charts/victory";
import { clusters } from "../mockData";
import "./VersionDistribution.scss";

const versionCounts = clusters.reduce<Record<string, number>>((acc, c) => {
  const minor = c.version.split(".").slice(0, 2).join(".");
  acc[minor] = (acc[minor] || 0) + 1;
  return acc;
}, {});

const chartData = Object.entries(versionCounts)
  .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
  .map(([version, count]) => ({ x: version, y: count }));

const legendData = chartData.map((d) => ({
  name: `${d.x} (${d.y})`,
}));

export default function VersionDistribution(_props: { widgetId: string }) {
  return (
    <div className="ov-version-dist">
      <ChartDonut
        data={chartData}
        title={`${clusters.length}`}
        subTitle="clusters"
        labels={({ datum }) => `OCP ${datum.x}: ${datum.y}`}
        legendData={legendData}
        legendOrientation="vertical"
        legendPosition="right"
        height={200}
        width={350}
        padding={{ top: 20, bottom: 20, left: 20, right: 140 }}
      />
    </div>
  );
}
