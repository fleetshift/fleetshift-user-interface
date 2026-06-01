import { Label } from "@patternfly/react-core";
import { Table, Thead, Tbody, Tr, Th, Td } from "@patternfly/react-table";
import { useLiveServices } from "../useLiveData";

const fmtReqs = (n: number) => n.toLocaleString();
const fmtErrorRate = (rate: number) => `${rate.toFixed(2)}%`;
const errorColor = (rate: number) =>
  rate < 0.05 ? "green" : rate < 0.5 ? "orange" : "red";
const fmtLatency = (ms: number) => `${ms}ms`;

export default function TopServices(_props: { widgetId: string }) {
  const getServices = useLiveServices();
  const liveServices = getServices();

  return (
    <Table aria-label="Top services" variant="compact">
      <Thead>
        <Tr>
          <Th>Service Name</Th>
          <Th>Req/sec</Th>
          <Th>Error Rate</Th>
          <Th>P99 Latency</Th>
        </Tr>
      </Thead>
      <Tbody>
        {liveServices.map((svc) => (
          <Tr key={svc.name}>
            <Td dataLabel="Service Name">{svc.name}</Td>
            <Td dataLabel="Req/sec">{fmtReqs(svc.requestsPerSec)}</Td>
            <Td dataLabel="Error Rate">
              <Label color={errorColor(svc.errorRate)} isCompact>
                {fmtErrorRate(svc.errorRate)}
              </Label>
            </Td>
            <Td dataLabel="P99 Latency">{fmtLatency(svc.p99Latency)}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
