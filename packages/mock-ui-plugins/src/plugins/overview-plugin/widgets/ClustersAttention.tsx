import { Label, Stack, StackItem } from "@patternfly/react-core";
import {
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
} from "@patternfly/react-icons";
import { attentionClusters } from "../mockData";
import "./ClustersAttention.scss";

export default function ClustersAttention(_props: { widgetId: string }) {
  return (
    <Stack hasGutter className="ov-attention-wrap">
      {attentionClusters.map((c) => (
        <StackItem key={c.clusterId}>
          <div className="ov-attention-row">
            <div className="ov-attention-row__name">{c.clusterName}</div>
            <Label
              color={c.severity === "danger" ? "red" : "orange"}
              icon={
                c.severity === "danger" ? (
                  <ExclamationCircleIcon />
                ) : (
                  <ExclamationTriangleIcon />
                )
              }
              isCompact
            >
              {c.reason}
            </Label>
          </div>
        </StackItem>
      ))}
    </Stack>
  );
}
