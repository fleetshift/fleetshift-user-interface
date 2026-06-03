import {
  Divider,
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
    : s === "degraded"
      ? "var(--pf-t--global--color--status--warning--default)"
      : "var(--pf-t--global--color--status--danger--default)";

export default function ServiceTopology(_props: { widgetId: string }) {
  return (
    <Stack>
      {serviceTopology.services.map((svc, i) => (
        <StackItem key={svc.name}>
          {i > 0 && <Divider />}
          <div className="ov-topology-svc">
            <div className="ov-topology-row">
              <strong>{svc.name}</strong>
              <Label color={statusColor(svc.status)} isCompact>
                {svc.status}
              </Label>
            </div>
            <Stack hasGutter className="ov-topology-clusters">
              {svc.clusters.map((cl) => (
                <StackItem key={cl.id}>
                  <div
                    className="ov-topology-cluster"
                    style={{ borderLeftColor: borderVar(cl.status) }}
                  >
                    <span className="ov-topology-row">
                      <strong>{cl.id}</strong>
                      <span className="ov-topology-role">{cl.role}</span>
                      <Label color={statusColor(cl.status)} isCompact>
                        {cl.status}
                      </Label>
                    </span>
                  </div>
                </StackItem>
              ))}
            </Stack>
          </div>
        </StackItem>
      ))}
    </Stack>
  );
}
