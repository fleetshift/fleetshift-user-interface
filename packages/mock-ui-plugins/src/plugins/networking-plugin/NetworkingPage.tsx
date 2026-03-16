import { useState, useMemo } from "react";
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Label,
  Pagination,
  SearchInput,
  Spinner,
  Tab,
  Tabs,
  TabTitleText,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from "@patternfly/react-core";
import { Table, Thead, Tbody, Tr, Th, Td } from "@patternfly/react-table";
import { useServiceStore } from "./serviceStore";
import { useIngressStore } from "./ingressStore";

const PER_PAGE = 20;

interface PortEntry {
  port: number;
  targetPort: number;
  protocol: string;
}

function formatPorts(portsJson: string): string {
  try {
    const parsed: PortEntry[] = JSON.parse(portsJson);
    return parsed.map((p) => `${p.port}/${p.protocol}`).join(", ");
  } catch {
    return portsJson;
  }
}

function typeColor(
  type: string,
): "blue" | "green" | "purple" | "orange" | "grey" {
  switch (type) {
    case "ClusterIP":
      return "blue";
    case "NodePort":
      return "green";
    case "LoadBalancer":
      return "purple";
    case "ExternalName":
      return "orange";
    default:
      return "grey";
  }
}

const ServicesTab: React.FC = () => {
  const { services, loading } = useServiceStore();
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () =>
      services.filter(
        (svc) =>
          !filter || svc.name.toLowerCase().includes(filter.toLowerCase()),
      ),
    [services, filter],
  );

  const paginatedItems = useMemo(
    () => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [filtered, page],
  );

  if (loading) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <>
      <Toolbar>
        <ToolbarContent>
          <ToolbarItem>
            <SearchInput
              placeholder="Filter by name"
              value={filter}
              onChange={(_event, value) => {
                setFilter(value);
                setPage(1);
              }}
              onClear={() => {
                setFilter("");
                setPage(1);
              }}
            />
          </ToolbarItem>
          <ToolbarItem variant="pagination" align={{ default: "alignEnd" }}>
            <Pagination
              itemCount={filtered.length}
              perPage={PER_PAGE}
              page={page}
              onSetPage={(_event, p) => setPage(p)}
              isCompact
            />
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>

      {filtered.length === 0 ? (
        <EmptyState titleText="No services found" headingLevel="h2">
          <EmptyStateBody>
            {services.length > 0
              ? "No services match the current filter."
              : "There are no services available."}
          </EmptyStateBody>
        </EmptyState>
      ) : (
        <>
          <Table aria-label="Services" variant="compact">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Namespace</Th>
                <Th>Type</Th>
                <Th>Cluster IP</Th>
                <Th>Ports</Th>
                <Th>Cluster</Th>
              </Tr>
            </Thead>
            <Tbody>
              {paginatedItems.map((svc) => (
                <Tr key={svc.id}>
                  <Td dataLabel="Name">
                    <span
                      style={{
                        fontWeight:
                          "var(--pf-t--global--font--weight--heading--default)",
                      }}
                    >
                      {svc.name}
                    </span>
                  </Td>
                  <Td dataLabel="Namespace">
                    <span
                      style={{
                        fontSize: "var(--pf-t--global--font--size--sm)",
                        color: "var(--pf-t--global--text--color--subtle)",
                      }}
                    >
                      {svc.namespace}
                    </span>
                  </Td>
                  <Td dataLabel="Type">
                    <Label color={typeColor(svc.type)} isCompact>
                      {svc.type}
                    </Label>
                  </Td>
                  <Td dataLabel="Cluster IP">
                    <span
                      style={{
                        fontFamily: "var(--pf-t--global--font--family--mono)",
                        fontSize: "var(--pf-t--global--font--size--sm)",
                      }}
                    >
                      {svc.cluster_ip}
                    </span>
                  </Td>
                  <Td dataLabel="Ports">
                    <span
                      style={{
                        fontFamily: "var(--pf-t--global--font--family--mono)",
                        fontSize: "var(--pf-t--global--font--size--sm)",
                      }}
                    >
                      {formatPorts(svc.ports)}
                    </span>
                  </Td>
                  <Td dataLabel="Cluster">{svc.cluster_id}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          <Toolbar>
            <ToolbarContent>
              <ToolbarItem variant="pagination" align={{ default: "alignEnd" }}>
                <Pagination
                  itemCount={filtered.length}
                  perPage={PER_PAGE}
                  page={page}
                  onSetPage={(_event, p) => setPage(p)}
                  isCompact
                />
              </ToolbarItem>
            </ToolbarContent>
          </Toolbar>
        </>
      )}
    </>
  );
};

const IngressesTab: React.FC = () => {
  const { ingresses, loading } = useIngressStore();
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () =>
      ingresses.filter(
        (ing) =>
          !filter || ing.name.toLowerCase().includes(filter.toLowerCase()),
      ),
    [ingresses, filter],
  );

  const paginatedItems = useMemo(
    () => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [filtered, page],
  );

  if (loading) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <>
      <Toolbar>
        <ToolbarContent>
          <ToolbarItem>
            <SearchInput
              placeholder="Filter by name"
              value={filter}
              onChange={(_event, value) => {
                setFilter(value);
                setPage(1);
              }}
              onClear={() => {
                setFilter("");
                setPage(1);
              }}
            />
          </ToolbarItem>
          <ToolbarItem variant="pagination" align={{ default: "alignEnd" }}>
            <Pagination
              itemCount={filtered.length}
              perPage={PER_PAGE}
              page={page}
              onSetPage={(_event, p) => setPage(p)}
              isCompact
            />
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>

      {filtered.length === 0 ? (
        <EmptyState titleText="No ingresses found" headingLevel="h2">
          <EmptyStateBody>
            {ingresses.length > 0
              ? "No ingresses match the current filter."
              : "There are no ingresses available."}
          </EmptyStateBody>
        </EmptyState>
      ) : (
        <>
          <Table aria-label="Ingresses" variant="compact">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Namespace</Th>
                <Th>Hosts</Th>
                <Th>TLS</Th>
                <Th>Rules</Th>
                <Th>Cluster</Th>
              </Tr>
            </Thead>
            <Tbody>
              {paginatedItems.map((ing) => (
                <Tr key={ing.id}>
                  <Td dataLabel="Name">
                    <span
                      style={{
                        fontWeight:
                          "var(--pf-t--global--font--weight--heading--default)",
                      }}
                    >
                      {ing.name}
                    </span>
                  </Td>
                  <Td dataLabel="Namespace">
                    <span
                      style={{
                        fontSize: "var(--pf-t--global--font--size--sm)",
                        color: "var(--pf-t--global--text--color--subtle)",
                      }}
                    >
                      {ing.namespace}
                    </span>
                  </Td>
                  <Td dataLabel="Hosts">
                    <span
                      style={{
                        fontFamily: "var(--pf-t--global--font--family--mono)",
                        fontSize: "var(--pf-t--global--font--size--sm)",
                        maxWidth: 200,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        display: "inline-block",
                      }}
                      title={ing.host}
                    >
                      {ing.host || "\u2014"}
                    </span>
                  </Td>
                  <Td dataLabel="TLS">
                    <Label color={ing.tls === 1 ? "green" : "grey"} isCompact>
                      {ing.tls === 1 ? "Yes" : "No"}
                    </Label>
                  </Td>
                  <Td dataLabel="Rules">
                    <span
                      style={{
                        fontSize: "var(--pf-t--global--font--size--sm)",
                        color: "var(--pf-t--global--text--color--subtle)",
                      }}
                    >
                      {ing.path ? "1" : "0"}
                    </span>
                  </Td>
                  <Td dataLabel="Cluster">{ing.cluster_id}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          <Toolbar>
            <ToolbarContent>
              <ToolbarItem variant="pagination" align={{ default: "alignEnd" }}>
                <Pagination
                  itemCount={filtered.length}
                  perPage={PER_PAGE}
                  page={page}
                  onSetPage={(_event, p) => setPage(p)}
                  isCompact
                />
              </ToolbarItem>
            </ToolbarContent>
          </Toolbar>
        </>
      )}
    </>
  );
};

const NetworkingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string | number>(0);

  return (
    <div>
      <Flex
        alignItems={{ default: "alignItemsBaseline" }}
        gap={{ default: "gapSm" }}
        style={{ marginBottom: "var(--pf-t--global--spacer--lg)" }}
      >
        <FlexItem>
          <Title headingLevel="h1">Networking</Title>
        </FlexItem>
      </Flex>

      <Tabs
        activeKey={activeTab}
        onSelect={(_event, tabIndex) => setActiveTab(tabIndex)}
        aria-label="Networking tabs"
      >
        <Tab eventKey={0} title={<TabTitleText>Services</TabTitleText>}>
          <div style={{ paddingTop: "var(--pf-t--global--spacer--md)" }}>
            <ServicesTab />
          </div>
        </Tab>
        <Tab eventKey={1} title={<TabTitleText>Ingresses</TabTitleText>}>
          <div style={{ paddingTop: "var(--pf-t--global--spacer--md)" }}>
            <IngressesTab />
          </div>
        </Tab>
      </Tabs>
    </div>
  );
};

export default NetworkingPage;
