import {
  Card,
  CardBody,
  CardTitle,
  Label,
  Stack,
  StackItem,
} from "@patternfly/react-core";
import { serviceTopology } from "../mockData";

const statusColor = (s: "healthy" | "degraded" | "critical") =>
  s === "healthy" ? "green" : s === "degraded" ? "orange" : "red";

const borderVar = (s: "healthy" | "degraded" | "critical") =>
  s === "healthy"
    ? "var(--pf-t--global--color--status--success--default)"
    : "var(--pf-t--global--color--status--warning--default)";

export default function ServiceTopology(_props: { widgetId: string }) {
  return (
    <Stack hasGutter>
      {serviceTopology.services.map((svc) => (
        <StackItem key={svc.name}>
          <Card isCompact>
            <CardTitle>
              <span className="ov-topology-row">
                {svc.name}
                <Label color={statusColor(svc.status)} isCompact>
                  {svc.status}
                </Label>
              </span>
            </CardTitle>
            <CardBody>
              <Stack hasGutter>
                {svc.clusters.map((cl) => (
                  <StackItem key={cl.id} className="ov-topology-cluster">
                    <Card
                      isCompact
                      style={{
                        borderLeft: `3px solid ${borderVar(cl.status)}`,
                      }}
                    >
                      <CardBody className="ov-topology-cluster-inner">
                        <span className="ov-topology-row">
                          <strong>{cl.id}</strong>
                          <span className="ov-topology-role">{cl.role}</span>
                          <Label color={statusColor(cl.status)} isCompact>
                            {cl.status}
                          </Label>
                        </span>
                      </CardBody>
                    </Card>
                  </StackItem>
                ))}
              </Stack>
            </CardBody>
          </Card>
        </StackItem>
      ))}
    </Stack>
  );
}
