import { useState, useMemo } from "react";
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  Label,
  MenuToggle,
  SearchInput,
  Select,
  SelectList,
  SelectOption,
  Spinner,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from "@patternfly/react-core";
import { Table, Thead, Tbody, Tr, Th, Td } from "@patternfly/react-table";
import { useDeploymentStore } from "./deploymentStore";

const DeploymentList: React.FC = () => {
  const { deployments, loading } = useDeploymentStore();
  const [nameFilter, setNameFilter] = useState("");
  const [nsFilter, setNsFilter] = useState<string | null>(null);
  const [nsSelectOpen, setNsSelectOpen] = useState(false);

  const namespaces = useMemo(
    () => [...new Set(deployments.map((d) => d.namespace))].sort(),
    [deployments],
  );

  const filtered = useMemo(
    () =>
      deployments.filter((dep) => {
        if (
          nameFilter &&
          !dep.name.toLowerCase().includes(nameFilter.toLowerCase())
        )
          return false;
        if (nsFilter && dep.namespace !== nsFilter) return false;
        return true;
      }),
    [deployments, nameFilter, nsFilter],
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
      <Toolbar
        clearAllFilters={() => {
          setNameFilter("");
          setNsFilter(null);
        }}
      >
        <ToolbarContent>
          <ToolbarItem>
            <SearchInput
              placeholder="Filter by name"
              value={nameFilter}
              onChange={(_event, value) => setNameFilter(value)}
              onClear={() => setNameFilter("")}
            />
          </ToolbarItem>
          <ToolbarItem>
            <Select
              isOpen={nsSelectOpen}
              onOpenChange={setNsSelectOpen}
              onSelect={(_event, value) => {
                setNsFilter(value as string);
                setNsSelectOpen(false);
              }}
              selected={nsFilter}
              toggle={(toggleRef) => (
                <MenuToggle
                  ref={toggleRef}
                  onClick={() => setNsSelectOpen((prev) => !prev)}
                  isExpanded={nsSelectOpen}
                  style={{ minWidth: "180px" }}
                >
                  {nsFilter ?? "All namespaces"}
                </MenuToggle>
              )}
            >
              <SelectList>
                {namespaces.map((ns) => (
                  <SelectOption key={ns} value={ns}>
                    {ns}
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>

      {filtered.length === 0 ? (
        <EmptyState titleText="No deployments found" headingLevel="h2">
          <EmptyStateBody>
            {deployments.length > 0
              ? "No deployments match the current filters."
              : "There are no deployments available."}
          </EmptyStateBody>
        </EmptyState>
      ) : (
        <Table aria-label="Deployments" variant="compact">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Cluster</Th>
              <Th>Namespace</Th>
              <Th>Ready</Th>
              <Th>Available</Th>
              <Th>Strategy</Th>
              <Th>Image</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filtered.map((dep) => (
              <Tr key={dep.id}>
                <Td dataLabel="Name">{dep.name}</Td>
                <Td dataLabel="Cluster">{dep.cluster_id}</Td>
                <Td dataLabel="Namespace">{dep.namespace}</Td>
                <Td dataLabel="Ready">
                  <span
                    style={{
                      color:
                        dep.ready === dep.replicas
                          ? "var(--pf-t--global--color--status--success--default)"
                          : "var(--pf-t--global--color--status--warning--default)",
                    }}
                  >
                    {dep.ready}/{dep.replicas}
                  </span>
                </Td>
                <Td dataLabel="Available">{dep.available}</Td>
                <Td dataLabel="Strategy">
                  <Label>{dep.strategy}</Label>
                </Td>
                <Td dataLabel="Image">{dep.image}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </>
  );
};

export default DeploymentList;
