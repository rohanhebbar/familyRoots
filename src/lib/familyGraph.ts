import type {
  FamilyBranch,
  FamilyTreeData,
  Person,
  PersonId,
  Relationship,
  TreeEdge,
  TreeNode,
} from "../types/family";

const CARD_WIDTH = 176;
const GENERATION_GAP = 220;
const BRANCH_GAP = 320;
const SIBLING_GAP = 190;

export function getPersonName(person: Person) {
  return [person.preferredName || person.givenName, person.familyName]
    .filter(Boolean)
    .join(" ");
}

export function getInitials(person: Person) {
  const first = (person.preferredName || person.givenName).at(0) ?? "";
  const last = person.familyName?.at(0) ?? "";
  return `${first}${last}`.toUpperCase();
}

export function getLifeSpan(person: Person) {
  const born = person.birth?.date;
  const died = person.death?.date;
  if (born && died) return `${born} - ${died}`;
  if (born) return `b. ${born}`;
  if (died) return `d. ${died}`;
  return "Dates unknown";
}

export function getBranchLabel(branch: FamilyBranch) {
  switch (branch) {
    case "maternal":
      return "Mother's side";
    case "paternal":
      return "Father's side";
    case "root":
      return "Root profile";
    case "shared":
      return "Shared";
    case "unknown":
      return "Unknown branch";
  }
}

export function getBranchColor(branch: FamilyBranch) {
  switch (branch) {
    case "maternal":
      return "#f0a8ff";
    case "paternal":
      return "#88d7ff";
    case "root":
      return "#f8d889";
    case "shared":
      return "#b9f8c8";
    case "unknown":
      return "#d7dce8";
  }
}

export function buildTreeLayout(data: FamilyTreeData) {
  const peopleById = new Map(data.people.map((person) => [person.id, person]));
  const parentRelationships = data.relationships.filter(isParentRelationship);
  const parentsByChild = new Map<PersonId, Relationship[]>();

  for (const relationship of parentRelationships) {
    const parents = parentsByChild.get(relationship.to) ?? [];
    parents.push(relationship);
    parentsByChild.set(relationship.to, parents);
  }

  const metadata = new Map<PersonId, { branch: FamilyBranch; generation: number }>();
  const queue: PersonId[] = [data.rootPersonId];
  metadata.set(data.rootPersonId, { branch: "root", generation: 0 });

  for (let index = 0; index < queue.length; index += 1) {
    const childId = queue[index];
    const childMeta = metadata.get(childId);
    if (!childMeta) continue;

    for (const relationship of parentsByChild.get(childId) ?? []) {
      if (!peopleById.has(relationship.from)) continue;
      const nextBranch = getParentBranch(childMeta.branch, relationship, childId, data.rootPersonId);
      const existing = metadata.get(relationship.from);
      if (existing && existing.generation <= childMeta.generation + 1) continue;
      metadata.set(relationship.from, {
        branch: nextBranch,
        generation: childMeta.generation + 1,
      });
      queue.push(relationship.from);
    }
  }

  const nodes = Array.from(metadata.entries())
    .map(([personId, meta]) => {
      const person = peopleById.get(personId);
      if (!person) return null;
      return {
        person,
        branch: meta.branch,
        generation: meta.generation,
        x: 0,
        y: -meta.generation * GENERATION_GAP,
      } satisfies TreeNode;
    })
    .filter((node): node is TreeNode => node !== null);

  positionNodes(nodes);

  const nodeIds = new Set(nodes.map((node) => node.person.id));
  const edges: TreeEdge[] = parentRelationships
    .filter((relationship) => nodeIds.has(relationship.from) && nodeIds.has(relationship.to))
    .map((relationship) => {
      const parent = nodes.find((node) => node.person.id === relationship.from);
      const child = nodes.find((node) => node.person.id === relationship.to);
      return {
        id: relationship.id,
        from: relationship.from,
        to: relationship.to,
        branch: parent?.branch === "root" ? child?.branch ?? "unknown" : parent?.branch ?? "unknown",
        label: relationship.role,
      };
    });

  return { nodes, edges, peopleById };
}

export function createEmptyPerson(id: string): Person {
  return {
    id,
    givenName: "New relative",
    summary: "Add dates, notes, photos, and relationship details.",
    tags: ["draft"],
  };
}

function isParentRelationship(relationship: Relationship) {
  return (
    relationship.kind === "biological-parent" ||
    relationship.kind === "adoptive-parent" ||
    relationship.kind === "step-parent"
  );
}

function getParentBranch(
  childBranch: FamilyBranch,
  relationship: Relationship,
  childId: PersonId,
  rootPersonId: PersonId
): FamilyBranch {
  if (childId !== rootPersonId) return childBranch === "root" ? "unknown" : childBranch;
  if (relationship.role === "mother") return "maternal";
  if (relationship.role === "father") return "paternal";
  return "unknown";
}

function positionNodes(nodes: TreeNode[]) {
  const byGeneration = new Map<number, TreeNode[]>();
  for (const node of nodes) {
    const group = byGeneration.get(node.generation) ?? [];
    group.push(node);
    byGeneration.set(node.generation, group);
  }

  for (const [generation, generationNodes] of byGeneration) {
    if (generation === 0) {
      generationNodes[0].x = 0;
      generationNodes[0].y = 0;
      continue;
    }

    for (const branch of ["maternal", "paternal", "unknown", "shared"] as FamilyBranch[]) {
      const branchNodes = generationNodes
        .filter((node) => node.branch === branch)
        .sort(sortAncestors);
      const baseX = getBranchBaseX(branch, generation);
      const start = -((branchNodes.length - 1) * SIBLING_GAP) / 2;
      branchNodes.forEach((node, index) => {
        node.x = baseX + start + index * SIBLING_GAP;
        node.y = -generation * GENERATION_GAP;
      });
    }
  }
}

function getBranchBaseX(branch: FamilyBranch, generation: number) {
  if (branch === "maternal") return -Math.max(1, generation) * BRANCH_GAP;
  if (branch === "paternal") return Math.max(1, generation) * BRANCH_GAP;
  if (branch === "shared") return 0;
  return generation % 2 === 0 ? 0 : CARD_WIDTH;
}

function sortAncestors(a: TreeNode, b: TreeNode) {
  return getPersonName(a.person).localeCompare(getPersonName(b.person));
}
