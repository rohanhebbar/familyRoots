import { useMemo, useState } from "react";
import FamilyToolbar from "./components/family/FamilyToolbar";
import FamilyTreeCanvas from "./components/family/FamilyTreeCanvas";
import PersonDetailPanel from "./components/family/PersonDetailPanel";
import { initialFamilyTree } from "./data/familyTree";
import { exportFamilyCsv, importFamilyCsv } from "./lib/csvFamily";
import { buildTreeLayout, createEmptyPerson, getPersonName } from "./lib/familyGraph";
import type { FamilyTreeData, ParentRole, Person, PersonId, Relationship } from "./types/family";

export default function App() {
  const [familyTree, setFamilyTree] = useState<FamilyTreeData>(initialFamilyTree);
  const [selectedPersonId, setSelectedPersonId] = useState<PersonId>(initialFamilyTree.rootPersonId);
  const [search, setSearch] = useState("");
  const [zoom, setZoom] = useState(0.92);
  const [pan, setPan] = useState({ x: 0, y: 170 });
  const [branchFilter, setBranchFilter] = useState<"all" | "maternal" | "paternal">("all");
  const [csvText, setCsvText] = useState(() => exportFamilyCsv(initialFamilyTree));
  const [csvError, setCsvError] = useState<string | null>(null);

  const layout = useMemo(() => buildTreeLayout(familyTree), [familyTree]);
  const selectedPerson = familyTree.people.find((person) => person.id === selectedPersonId) ?? null;
  const selectedBranch = layout.nodes.find((node) => node.person.id === selectedPersonId)?.branch ?? "unknown";

  return (
    <div className="app-shell">
      <FamilyTreeCanvas
        data={familyTree}
        selectedPersonId={selectedPersonId}
        zoom={zoom}
        pan={pan}
        branchFilter={branchFilter}
        onSelectPerson={setSelectedPersonId}
        onZoomChange={setZoom}
        onPanChange={setPan}
      />

      <FamilyToolbar
        search={search}
        zoom={zoom}
        branchFilter={branchFilter}
        csvText={csvText}
        error={csvError}
        onSearchChange={(value) => {
          setSearch(value);
          const searchTerm = value.trim().toLowerCase();
          const match = layout.nodes.find((node) =>
            getPersonName(node.person).toLowerCase().includes(searchTerm)
          );
          if (match && searchTerm) {
            setPan({ x: -match.x * zoom, y: 170 - match.y * zoom });
            setSelectedPersonId(match.person.id);
          }
        }}
        onZoomIn={() => setZoom((current) => Math.min(1.75, current + 0.16))}
        onZoomOut={() => setZoom((current) => Math.max(0.42, current - 0.16))}
        onResetView={() => {
          setZoom(0.92);
          setPan({ x: 0, y: 170 });
        }}
        onBranchFilterChange={setBranchFilter}
        onCsvTextChange={(value) => {
          setCsvText(value);
          setCsvError(null);
        }}
        onImportCsv={() => {
          try {
            const imported = importFamilyCsv(csvText, familyTree.rootPersonId);
            setFamilyTree(imported);
            setSelectedPersonId(imported.rootPersonId);
            setCsvError(null);
          } catch (error) {
            setCsvError(error instanceof Error ? error.message : "Unable to import CSV.");
          }
        }}
        onExportCsv={() => {
          setCsvText(exportFamilyCsv(familyTree));
          setCsvError(null);
        }}
        onAddParent={(role) => {
          const next = addParentToSelected(familyTree, selectedPersonId, role);
          setFamilyTree(next.tree);
          setSelectedPersonId(next.personId);
        }}
      />

      <PersonDetailPanel
        person={selectedPerson}
        branch={selectedBranch}
        onClose={() => setSelectedPersonId(familyTree.rootPersonId)}
        onUpdatePerson={(person) => {
          setFamilyTree((current) => ({
            ...current,
            people: current.people.map((existing) => (existing.id === person.id ? person : existing)),
          }));
        }}
      />
    </div>
  );
}

function addParentToSelected(tree: FamilyTreeData, childId: PersonId, role: ParentRole) {
  const suffix = `${role}-${Date.now()}`;
  const personId = `${childId}-${suffix}`;
  const person: Person = {
    ...createEmptyPerson(personId),
    givenName: role === "mother" ? "New mother" : "New father",
    tags: [role, "draft"],
  };
  const relationship: Relationship = {
    id: `${personId}-to-${childId}`,
    kind: "biological-parent",
    from: personId,
    to: childId,
    role,
    confidence: "unknown",
  };

  return {
    personId,
    tree: {
      ...tree,
      people: [...tree.people, person],
      relationships: [...tree.relationships, relationship],
    },
  };
}
