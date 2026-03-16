import { useState, useMemo, useEffect } from "react";
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
import { useApiBase, fetchJson } from "./api";

// --- Types ---

interface ConfigMap {
  id: string;
  cluster_id: string;
  namespace_id: string;
  name: string;
  data_keys: string[];
}

interface Secret {
  id: string;
  cluster_id: string;
  namespace_id: string;
  name: string;
  type: string;
  data_keys: string[];
}

// --- Helpers ---

const PER_PAGE = 20;

function extractNamespace(namespaceId: string, clusterId: string): string {
  const prefix = `${clusterId}-`;
  return namespaceId.startsWith(prefix)
    ? namespaceId.slice(prefix.length)
    : namespaceId;
}

// --- ConfigMaps Tab ---

const ConfigMapsTab: React.FC<{ clusterIds: string[] }> = ({ clusterIds }) => {
  const apiBase = useApiBase();
  const [configMaps, setConfigMaps] = useState<ConfigMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [nameFilter, setNameFilter] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (clusterIds.length === 0) {
      setConfigMaps([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all(
      clusterIds.map((id) =>
        fetchJson<ConfigMap[]>(`${apiBase}/clusters/${id}/configmaps`).catch(
          () => [] as ConfigMap[],
        ),
      ),
    ).then((results) => {
      setConfigMaps(results.flat());
      setLoading(false);
    });
  }, [apiBase, clusterIds]);

  const filtered = useMemo(
    () =>
      configMaps.filter((cm) =>
        nameFilter
          ? cm.name.toLowerCase().includes(nameFilter.toLowerCase())
          : true,
      ),
    [configMaps, nameFilter],
  );

  const paginated = useMemo(
    () => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [filtered, page],
  );

  useEffect(() => {
    setPage(1);
  }, [nameFilter]);

  if (loading) {
    return (
      <Bullseye style={{ padding: "var(--pf-t--global--spacer--2xl) 0" }}>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <div style={{ paddingTop: "var(--pf-t--global--spacer--md)" }}>
      <Toolbar>
        <ToolbarContent>
          <ToolbarItem>
            <SearchInput
              placeholder="Filter by name"
              value={nameFilter}
              onChange={(_event, value) => setNameFilter(value)}
              onClear={() => setNameFilter("")}
            />
          </ToolbarItem>
          <ToolbarItem variant="pagination" align={{ default: "alignEnd" }}>
            <Pagination
              itemCount={filtered.length}
              perPage={PER_PAGE}
              page={page}
              onSetPage={(_e, p) => setPage(p)}
              isCompact
            />
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>

      {filtered.length === 0 ? (
        <EmptyState titleText="No ConfigMaps found" headingLevel="h2">
          <EmptyStateBody>
            {configMaps.length > 0
              ? "No ConfigMaps match the current filter."
              : "There are no ConfigMaps available."}
          </EmptyStateBody>
        </EmptyState>
      ) : (
        <Table aria-label="ConfigMaps" variant="compact">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Cluster</Th>
              <Th>Namespace</Th>
              <Th>Keys</Th>
            </Tr>
          </Thead>
          <Tbody>
            {paginated.map((cm) => (
              <Tr key={cm.id}>
                <Td dataLabel="Name">
                  <span
                    style={{
                      fontWeight:
                        "var(--pf-t--global--font--weight--heading--default)",
                    }}
                  >
                    {cm.name}
                  </span>
                </Td>
                <Td dataLabel="Cluster">{cm.cluster_id}</Td>
                <Td dataLabel="Namespace">
                  {extractNamespace(cm.namespace_id, cm.cluster_id)}
                </Td>
                <Td dataLabel="Keys">
                  <Label color="blue" isCompact>
                    {cm.data_keys.length}
                  </Label>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  );
};

// --- Secrets Tab ---

const SecretsTab: React.FC<{ clusterIds: string[] }> = ({ clusterIds }) => {
  const apiBase = useApiBase();
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [nameFilter, setNameFilter] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (clusterIds.length === 0) {
      setSecrets([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all(
      clusterIds.map((id) =>
        fetchJson<Secret[]>(`${apiBase}/clusters/${id}/secrets`).catch(
          () => [] as Secret[],
        ),
      ),
    ).then((results) => {
      setSecrets(results.flat());
      setLoading(false);
    });
  }, [apiBase, clusterIds]);

  const filtered = useMemo(
    () =>
      secrets.filter((s) =>
        nameFilter
          ? s.name.toLowerCase().includes(nameFilter.toLowerCase())
          : true,
      ),
    [secrets, nameFilter],
  );

  const paginated = useMemo(
    () => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [filtered, page],
  );

  useEffect(() => {
    setPage(1);
  }, [nameFilter]);

  if (loading) {
    return (
      <Bullseye style={{ padding: "var(--pf-t--global--spacer--2xl) 0" }}>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <div style={{ paddingTop: "var(--pf-t--global--spacer--md)" }}>
      <Toolbar>
        <ToolbarContent>
          <ToolbarItem>
            <SearchInput
              placeholder="Filter by name"
              value={nameFilter}
              onChange={(_event, value) => setNameFilter(value)}
              onClear={() => setNameFilter("")}
            />
          </ToolbarItem>
          <ToolbarItem variant="pagination" align={{ default: "alignEnd" }}>
            <Pagination
              itemCount={filtered.length}
              perPage={PER_PAGE}
              page={page}
              onSetPage={(_e, p) => setPage(p)}
              isCompact
            />
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>

      {filtered.length === 0 ? (
        <EmptyState titleText="No Secrets found" headingLevel="h2">
          <EmptyStateBody>
            {secrets.length > 0
              ? "No Secrets match the current filter."
              : "There are no Secrets available."}
          </EmptyStateBody>
        </EmptyState>
      ) : (
        <Table aria-label="Secrets" variant="compact">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Cluster</Th>
              <Th>Namespace</Th>
              <Th>Type</Th>
              <Th>Keys</Th>
            </Tr>
          </Thead>
          <Tbody>
            {paginated.map((secret) => (
              <Tr key={secret.id}>
                <Td dataLabel="Name">
                  <span
                    style={{
                      fontWeight:
                        "var(--pf-t--global--font--weight--heading--default)",
                    }}
                  >
                    {secret.name}
                  </span>
                </Td>
                <Td dataLabel="Cluster">{secret.cluster_id}</Td>
                <Td dataLabel="Namespace">
                  {extractNamespace(secret.namespace_id, secret.cluster_id)}
                </Td>
                <Td dataLabel="Type">
                  <Label color="grey" isCompact>
                    {secret.type}
                  </Label>
                </Td>
                <Td dataLabel="Keys">
                  <Label color="blue" isCompact>
                    {secret.data_keys.length}
                  </Label>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  );
};

// --- Main Page ---

const ConfigPage: React.FC<{ clusterIds: string[] }> = ({ clusterIds }) => {
  const apiBase = useApiBase();
  const [activeTab, setActiveTab] = useState<string | number>(0);
  const [cmCount, setCmCount] = useState(0);
  const [secretCount, setSecretCount] = useState(0);

  useEffect(() => {
    if (clusterIds.length === 0) {
      setCmCount(0);
      setSecretCount(0);
      return;
    }

    Promise.all(
      clusterIds.map((id) =>
        fetchJson<ConfigMap[]>(`${apiBase}/clusters/${id}/configmaps`).catch(
          () => [] as ConfigMap[],
        ),
      ),
    ).then((results) => setCmCount(results.flat().length));

    Promise.all(
      clusterIds.map((id) =>
        fetchJson<Secret[]>(`${apiBase}/clusters/${id}/secrets`).catch(
          () => [] as Secret[],
        ),
      ),
    ).then((results) => setSecretCount(results.flat().length));
  }, [apiBase, clusterIds]);

  const totalCount = cmCount + secretCount;

  return (
    <div>
      <Flex
        alignItems={{ default: "alignItemsBaseline" }}
        gap={{ default: "gapSm" }}
        style={{ marginBottom: "var(--pf-t--global--spacer--lg)" }}
      >
        <FlexItem>
          <Title headingLevel="h1">Config</Title>
        </FlexItem>
        <FlexItem>
          <span
            style={{
              fontSize: "var(--pf-t--global--font--size--sm)",
              color: "var(--pf-t--global--text--color--subtle)",
            }}
          >
            {totalCount} resources
          </span>
        </FlexItem>
      </Flex>

      <Tabs
        activeKey={activeTab}
        onSelect={(_event, tabIndex) => setActiveTab(tabIndex)}
        aria-label="Config tabs"
      >
        <Tab eventKey={0} title={<TabTitleText>ConfigMaps</TabTitleText>}>
          <ConfigMapsTab clusterIds={clusterIds} />
        </Tab>
        <Tab eventKey={1} title={<TabTitleText>Secrets</TabTitleText>}>
          <SecretsTab clusterIds={clusterIds} />
        </Tab>
      </Tabs>
    </div>
  );
};

export default ConfigPage;
