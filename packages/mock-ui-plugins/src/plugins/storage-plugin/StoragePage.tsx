import { useState, useMemo } from "react";
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  Label,
  SearchInput,
  Spinner,
  Tab,
  Tabs,
  TabTitleText,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from "@patternfly/react-core";
import { Table, Thead, Tbody, Tr, Th, Td } from "@patternfly/react-table";
import { usePVStore } from "./pvStore";
import { usePVCStore } from "./pvcStore";

function pvStatusColor(status: string): "green" | "orange" | "red" | "grey" {
  switch (status) {
    case "Available":
    case "Bound":
      return "green";
    case "Released":
      return "orange";
    case "Failed":
      return "red";
    default:
      return "grey";
  }
}

function pvcStatusColor(status: string): "green" | "orange" | "red" | "grey" {
  switch (status) {
    case "Bound":
      return "green";
    case "Pending":
      return "orange";
    case "Lost":
      return "red";
    default:
      return "grey";
  }
}

const PVTab: React.FC = () => {
  const { pvs, loading } = usePVStore();
  const [nameFilter, setNameFilter] = useState("");

  const filtered = useMemo(
    () =>
      pvs.filter((pv) =>
        nameFilter
          ? pv.name.toLowerCase().includes(nameFilter.toLowerCase())
          : true,
      ),
    [pvs, nameFilter],
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
              value={nameFilter}
              onChange={(_event, value) => setNameFilter(value)}
              onClear={() => setNameFilter("")}
            />
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>

      {filtered.length === 0 ? (
        <EmptyState titleText="No persistent volumes found" headingLevel="h2">
          <EmptyStateBody>
            {pvs.length > 0
              ? "No persistent volumes match the current filter."
              : "There are no persistent volumes available."}
          </EmptyStateBody>
        </EmptyState>
      ) : (
        <Table aria-label="Persistent Volumes" variant="compact">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Capacity</Th>
              <Th>Access Mode</Th>
              <Th>Status</Th>
              <Th>Storage Class</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filtered.map((pv) => (
              <Tr key={pv.id}>
                <Td dataLabel="Name">{pv.name}</Td>
                <Td dataLabel="Capacity">{pv.capacity}</Td>
                <Td dataLabel="Access Mode">{pv.access_mode}</Td>
                <Td dataLabel="Status">
                  <Label color={pvStatusColor(pv.status)}>{pv.status}</Label>
                </Td>
                <Td dataLabel="Storage Class">{pv.storage_class}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </>
  );
};

const PVCTab: React.FC = () => {
  const { pvcs, loading } = usePVCStore();
  const [nameFilter, setNameFilter] = useState("");

  const filtered = useMemo(
    () =>
      pvcs.filter((pvc) =>
        nameFilter
          ? pvc.name.toLowerCase().includes(nameFilter.toLowerCase())
          : true,
      ),
    [pvcs, nameFilter],
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
              value={nameFilter}
              onChange={(_event, value) => setNameFilter(value)}
              onClear={() => setNameFilter("")}
            />
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>

      {filtered.length === 0 ? (
        <EmptyState
          titleText="No persistent volume claims found"
          headingLevel="h2"
        >
          <EmptyStateBody>
            {pvcs.length > 0
              ? "No persistent volume claims match the current filter."
              : "There are no persistent volume claims available."}
          </EmptyStateBody>
        </EmptyState>
      ) : (
        <Table aria-label="Persistent Volume Claims" variant="compact">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Namespace</Th>
              <Th>Status</Th>
              <Th>Capacity</Th>
              <Th>Storage Class</Th>
              <Th>Volume</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filtered.map((pvc) => (
              <Tr key={pvc.id}>
                <Td dataLabel="Name">{pvc.name}</Td>
                <Td dataLabel="Namespace">{pvc.namespace}</Td>
                <Td dataLabel="Status">
                  <Label color={pvcStatusColor(pvc.status)}>{pvc.status}</Label>
                </Td>
                <Td dataLabel="Capacity">{pvc.capacity}</Td>
                <Td dataLabel="Storage Class">{pvc.storage_class}</Td>
                <Td dataLabel="Volume">{pvc.pv_name ?? "\u2014"}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </>
  );
};

const StoragePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string | number>(0);

  return (
    <Tabs
      activeKey={activeTab}
      onSelect={(_event, tabIndex) => setActiveTab(tabIndex)}
      aria-label="Storage tabs"
    >
      <Tab eventKey={0} title={<TabTitleText>Persistent Volumes</TabTitleText>}>
        <PVTab />
      </Tab>
      <Tab
        eventKey={1}
        title={<TabTitleText>Persistent Volume Claims</TabTitleText>}
      >
        <PVCTab />
      </Tab>
    </Tabs>
  );
};

export default StoragePage;
