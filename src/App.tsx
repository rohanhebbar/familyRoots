import { useMemo, useState } from "react";
import FamilyToolbar from "./components/family/FamilyToolbar";
import FamilyTreeCanvas from "./components/family/FamilyTreeCanvas";
import TreeEditPanel from "./components/family/TreeEditPanel";
import { initialFamilyTree } from "./data/familyTree";
import { exportFamilyCsv, importFamilyCsv } from "./lib/csvFamily";
import { buildTreeLayout, createBlankFamilyTree, createEmptyPerson, getPersonName } from "./lib/familyGraph";
import {
  findParentId,
  getSiblingPersonIds,
  isParentRelationship,
  nextSelectionAfterRemove,
  removePersonFromTree,
} from "./lib/treeEdits";
import type { FamilyTreeData, ParentRole, Person, PersonId, Relationship } from "./types/family";

export default function App() {
  const [familyTree, setFamilyTree] = useState<FamilyTreeData>(initialFamilyTree);
  const [selectedPersonId, setSelectedPersonId] = useState<PersonId>(initialFamilyTree.rootPersonId);
  const [search, setSearch] = useState("");
  const [zoom, setZoom] = useState(0.92);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [branchFilter, setBranchFilter] = useState<"all" | "maternal" | "paternal">("all");
  const [csvText, setCsvText] = useState(() => exportFamilyCsv(initialFamilyTree));
  const [csvError, setCsvError] = useState<string | null>(null);

  const layout = useMemo(() => buildTreeLayout(familyTree), [familyTree]);
  const selectedPerson = familyTree.people.find((person) => person.id === selectedPersonId) ?? null;
  const selectedBranch = layout.nodes.find((node) => node.person.id === selectedPersonId)?.branch ?? "unknown";

  const parentsOfSelected = useMemo(() => {
    const rels = familyTree.relationships.filter(
      (relationship) => isParentRelationship(relationship) && relationship.to === selectedPersonId
    );
    const motherId = rels.find((relationship) => relationship.role === "mother")?.from;
    const fatherId = rels.find((relationship) => relationship.role === "father")?.from;
    return {
      mother: motherId ? familyTree.people.find((person) => person.id === motherId) : undefined,
      father: fatherId ? familyTree.people.find((person) => person.id === fatherId) : undefined,
    };
  }, [familyTree, selectedPersonId]);

  const siblingsOfSelected = useMemo(() => {
    const ids = getSiblingPersonIds(familyTree, selectedPersonId);
    return ids
      .map((id) => familyTree.people.find((person) => person.id === id))
      .filter((person): person is Person => Boolean(person));
  }, [familyTree, selectedPersonId]);

  const updatePersonInTree = (person: Person) => {
    setFamilyTree((current) => ({
      ...current,
      people: current.people.map((existing) => (existing.id === person.id ? person : existing)),
    }));
  };

  const removeDisabledReason =
    selectedPersonId === familyTree.rootPersonId
      ? ("root" as const)
      : familyTree.relationships.some(
            (relationship) => isParentRelationship(relationship) && relationship.from === selectedPersonId
          )
        ? ("hasChildren" as const)
        : null;

  return (
    <div className="app-shell">
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
            setPan({ x: -match.x * zoom, y: -match.y * zoom });
            setSelectedPersonId(match.person.id);
          }
        }}
        onZoomIn={() => setZoom((current) => Math.min(1.75, current + 0.16))}
        onZoomOut={() => setZoom((current) => Math.max(0.42, current - 0.16))}
        onResetView={() => {
          setZoom(0.92);
          setPan({ x: 0, y: 0 });
        }}
        onBranchFilterChange={setBranchFilter}
        onNewBlankTree={() => {
          if (
            !window.confirm(
              "Replace the current tree with a blank one? All people and relationships in the editor will be cleared."
            )
          ) {
            return;
          }
          const next = createBlankFamilyTree();
          setFamilyTree(next);
          setSelectedPersonId(next.rootPersonId);
          setSearch("");
          setZoom(0.92);
          setPan({ x: 0, y: 0 });
          setBranchFilter("all");
          setCsvText(exportFamilyCsv(next));
          setCsvError(null);
        }}
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
      />

      <main className="tree-stage">
        <FamilyTreeCanvas
          data={familyTree}
          selectedPersonId={selectedPersonId}
          zoom={zoom}
          pan={pan}
          branchFilter={branchFilter}
          onSelectPerson={setSelectedPersonId}
          onUpdatePerson={updatePersonInTree}
          onZoomChange={setZoom}
          onPanChange={setPan}
        />
      </main>

      <TreeEditPanel
        person={selectedPerson}
        branch={selectedBranch}
        rootPersonId={familyTree.rootPersonId}
        mother={parentsOfSelected.mother}
        father={parentsOfSelected.father}
        onUpdatePerson={updatePersonInTree}
        onSelectPerson={setSelectedPersonId}
        onAddParent={(role) => {
          const existingId = findParentId(familyTree, selectedPersonId, role);
          if (existingId) {
            setSelectedPersonId(existingId);
            return;
          }
          const next = addParentToSelected(familyTree, selectedPersonId, role);
          setFamilyTree(next.tree);
          setSelectedPersonId(next.personId);
        }}
        siblings={siblingsOfSelected}
        onAddSibling={() => {
          const next = addSiblingToSelected(familyTree, selectedPersonId);
          setFamilyTree(next.tree);
          setSelectedPersonId(next.personId);
        }}
        onAddChild={() => {
          const next = addChildToSelected(familyTree, selectedPersonId);
          setFamilyTree(next.tree);
          setSelectedPersonId(next.personId);
        }}
        onRemovePerson={() => {
          const removedId = selectedPersonId;
          const result = removePersonFromTree(familyTree, removedId);
          if (!result.ok) return;
          const nextId = nextSelectionAfterRemove(familyTree, removedId);
          setFamilyTree(result.tree);
          setSelectedPersonId(nextId);
        }}
        onFocusRoot={() => setSelectedPersonId(familyTree.rootPersonId)}
        removeDisabledReason={removeDisabledReason}
      />
    </div>
  );
}

function addSiblingToSelected(tree: FamilyTreeData, personId: PersonId) {
  const newId = `sibling-${Date.now()}`;
  const person: Person = {
    ...createEmptyPerson(newId),
    givenName: "New sibling",
    tags: ["draft", "sibling"],
  };
  const [a, b] = [personId, newId].sort((left, right) => left.localeCompare(right));
  const relationship: Relationship = {
    id: `sibling-${a}-${b}`,
    kind: "sibling",
    from: a,
    to: b,
    confidence: "unknown",
  };

  return {
    personId: newId,
    tree: {
      ...tree,
      people: [...tree.people, person],
      relationships: [...tree.relationships, relationship],
    },
  };
}

function addChildToSelected(tree: FamilyTreeData, parentId: PersonId) {
  const newId = `child-${Date.now()}`;
  const person: Person = {
    ...createEmptyPerson(newId),
    givenName: "New child",
    tags: ["draft", "child"],
  };
  const relationship: Relationship = {
    id: `${parentId}-to-${newId}`,
    kind: "biological-parent",
    from: parentId,
    to: newId,
    role: "parent",
    confidence: "unknown",
  };

  return {
    personId: newId,
    tree: {
      ...tree,
      people: [...tree.people, person],
      relationships: [...tree.relationships, relationship],
    },
  };
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
