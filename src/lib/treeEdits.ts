import type { FamilyTreeData, PersonId, Relationship } from "../types/family";

export function isParentRelationship(relationship: Relationship) {
  return (
    relationship.kind === "biological-parent" ||
    relationship.kind === "adoptive-parent" ||
    relationship.kind === "step-parent"
  );
}

export function isSiblingRelationship(relationship: Relationship) {
  return relationship.kind === "sibling";
}

export function getSiblingPersonIds(tree: FamilyTreeData, personId: PersonId): PersonId[] {
  const out = new Set<PersonId>();

  for (const relationship of tree.relationships) {
    if (!isSiblingRelationship(relationship)) continue;
    if (relationship.from === personId) out.add(relationship.to);
    if (relationship.to === personId) out.add(relationship.from);
  }

  for (const relationship of tree.relationships) {
    if (!isParentRelationship(relationship) || relationship.to !== personId) continue;
    const parentId = relationship.from;
    for (const other of tree.relationships) {
      if (!isParentRelationship(other) || other.from !== parentId || other.to === personId) continue;
      out.add(other.to);
    }
  }

  return [...out].filter((id) => tree.people.some((person) => person.id === id));
}


export function findParentId(tree: FamilyTreeData, childId: PersonId, role: "mother" | "father") {
  return tree.relationships.find(
    (relationship) =>
      isParentRelationship(relationship) &&
      relationship.to === childId &&
      relationship.role === role
  )?.from;
}

export function personIsParentOfAnyone(tree: FamilyTreeData, personId: PersonId) {
  return tree.relationships.some(
    (relationship) => isParentRelationship(relationship) && relationship.from === personId
  );
}

export function removePersonFromTree(tree: FamilyTreeData, personId: PersonId) {
  if (personId === tree.rootPersonId) return { ok: false as const, reason: "root" as const };
  if (personIsParentOfAnyone(tree, personId)) return { ok: false as const, reason: "hasChildren" as const };

  return {
    ok: true as const,
    tree: {
      ...tree,
      people: tree.people.filter((person) => person.id !== personId),
      relationships: tree.relationships.filter(
        (relationship) => relationship.from !== personId && relationship.to !== personId
      ),
    },
  };
}

export function nextSelectionAfterRemove(tree: FamilyTreeData, removedId: PersonId) {
  const parentEdge = tree.relationships.find(
    (relationship) =>
      isParentRelationship(relationship) && relationship.to === removedId && relationship.role === "mother"
  );
  const fatherEdge = tree.relationships.find(
    (relationship) =>
      isParentRelationship(relationship) && relationship.to === removedId && relationship.role === "father"
  );
  const fallback = parentEdge?.from ?? fatherEdge?.from ?? tree.rootPersonId;
  return tree.people.some((person) => person.id === fallback) ? fallback : tree.rootPersonId;
}
