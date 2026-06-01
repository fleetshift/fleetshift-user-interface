import { Grid, GridItem } from "@patternfly/react-core";
import { clusters } from "../mockData";

const total = clusters.length;
const healthy = clusters.filter((c) => c.status === "healthy").length;
const degraded = clusters.filter(
  (c) => c.status === "degraded" || c.status === "critical",
).length;
const edgeSites = clusters.filter((c) => c.type === "edge").length;

interface StatCellProps {
  value: number;
  label: string;
  variant?: "success" | "warning";
}

function StatCell({ value, label, variant }: StatCellProps) {
  const valueClass = variant
    ? `ov-stat-cell__value ov-stat-cell__value--${variant}`
    : "ov-stat-cell__value";

  return (
    <div className="ov-stat-cell">
      <div className={valueClass}>{value}</div>
      <div className="ov-stat-cell__label">{label}</div>
    </div>
  );
}

export default function ClusterFleetHealth(_props: { widgetId: string }) {
  return (
    <Grid hasGutter>
      <GridItem span={6}>
        <StatCell value={total} label="Total Clusters" />
      </GridItem>
      <GridItem span={6}>
        <StatCell value={healthy} label="Healthy" variant="success" />
      </GridItem>
      <GridItem span={6}>
        <StatCell value={degraded} label="Degraded" variant="warning" />
      </GridItem>
      <GridItem span={6}>
        <StatCell value={edgeSites} label="Edge Sites" />
      </GridItem>
    </Grid>
  );
}
