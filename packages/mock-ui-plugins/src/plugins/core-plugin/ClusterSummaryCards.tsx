import {
  Card,
  CardBody,
  Content,
  Grid,
  GridItem,
  Title,
} from "@patternfly/react-core";
import type { GcpHcpClusterRow } from "../gcphcp-plugin/gcpHcpUtils";

interface SummaryCard {
  label: string;
  value: number;
  color?: string;
}

const FAILURE_STATES = ["ERROR", "DEGRADED", "FAILED"];

function buildSummary(rows: GcpHcpClusterRow[]): SummaryCard[] {
  const healthy = rows.filter((r) => r.cluster.state === "ACTIVE").length;
  const needsAttention = rows.filter((r) =>
    FAILURE_STATES.includes(r.cluster.state),
  ).length;
  const totalNodePools = rows.reduce((sum, r) => sum + r.nodePoolCount, 0);

  return [
    { label: "Total Clusters", value: rows.length },
    { label: "Total Node Pools", value: totalNodePools },
    {
      label: "Healthy",
      value: healthy,
      color: "var(--pf-t--global--color--status--success--default)",
    },
    {
      label: "Needs Attention",
      value: needsAttention,
      color:
        needsAttention > 0
          ? "var(--pf-t--global--color--status--danger--default)"
          : undefined,
    },
  ];
}

export default function ClusterSummaryCards({
  rows,
}: {
  rows: GcpHcpClusterRow[];
}) {
  const cards = buildSummary(rows);

  return (
    <Grid hasGutter>
      {cards.map((card) => (
        <GridItem key={card.label} span={3}>
          <Card isPlain isCompact>
            <CardBody>
              <Content component="p">{card.label}</Content>
              <Title headingLevel="h2" size="2xl" style={{ color: card.color }}>
                {card.value}
              </Title>
            </CardBody>
          </Card>
        </GridItem>
      ))}
    </Grid>
  );
}
