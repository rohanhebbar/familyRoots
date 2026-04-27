import type {
  FamilyBranch,
  FamilyTreeData,
  Person,
  PersonId,
  Relationship,
  TreeEdge,
  TreeNode,
} from "../types/family";
import { getSiblingPersonIds, isParentRelationship } from "./treeEdits";

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
  const initials = `${first}${last}`.toUpperCase();
  return initials || "?";
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
      return "Both sides / extended";
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

  const maxAncestorGen = Math.max(0, ...[...metadata.values()].map((meta) => meta.generation));
  const minGen = -2;
  const maxGen = Math.max(maxAncestorGen + 1, 4);

  expandCollaterals(metadata, data, peopleById, parentRelationships, minGen, maxGen);

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
  const nodeById = new Map(nodes.map((node) => [node.person.id, node]));

  const edges: TreeEdge[] = parentRelationships
    .filter((relationship) => nodeIds.has(relationship.from) && nodeIds.has(relationship.to))
    .map((relationship) => {
      const parent = nodeById.get(relationship.from);
      const child = nodeById.get(relationship.to);
      return {
        id: relationship.id,
        from: relationship.from,
        to: relationship.to,
        branch: parent?.branch === "root" ? child?.branch ?? "unknown" : parent?.branch ?? "unknown",
        label: relationship.role,
        edgeKind: "parent" as const,
      };
    });

  const siblingPairKeys = new Set(
    data.relationships
      .filter((relationship) => relationship.kind === "sibling")
      .map((relationship) => siblingPairKey(relationship.from, relationship.to))
  );

  for (const relationship of data.relationships) {
    if (relationship.kind !== "sibling") continue;
    if (!nodeIds.has(relationship.from) || !nodeIds.has(relationship.to)) continue;
    const a = nodeById.get(relationship.from);
    const b = nodeById.get(relationship.to);
    const branch = siblingEdgeBranch(a?.branch, b?.branch);
    edges.push({
      id: relationship.id,
      from: relationship.from,
      to: relationship.to,
      branch,
      edgeKind: "sibling",
    });
  }

  for (const node of nodes) {
    const personId = node.person.id;
    for (const sibId of getSiblingPersonIds(data, personId)) {
      if (personId >= sibId) continue;
      if (!nodeIds.has(sibId)) continue;
      const key = siblingPairKey(personId, sibId);
      if (siblingPairKeys.has(key)) continue;
      siblingPairKeys.add(key);
      const a = nodeById.get(personId);
      const b = nodeById.get(sibId);
      edges.push({
        id: `inferred-sibling-${key}`,
        from: personId,
        to: sibId,
        branch: siblingEdgeBranch(a?.branch, b?.branch),
        edgeKind: "sibling",
        inferredSibling: true,
      });
    }
  }

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

/** Single root person, no relationships — for rebuilding the tree from the UI. */
export function createBlankFamilyTree(): FamilyTreeData {
  const id = `person-${Date.now()}`;
  return {
    rootPersonId: id,
    people: [
      {
        id,
        givenName: "",
        summary: "Type a name on this tile or in the side panel, then add relatives.",
        tags: ["root", "draft"],
      },
    ],
    relationships: [],
    sources: [],
  };
}

function expandCollaterals(
  metadata: Map<PersonId, { branch: FamilyBranch; generation: number }>,
  data: FamilyTreeData,
  peopleById: Map<PersonId, Person>,
  parentRelationships: Relationship[],
  minGen: number,
  maxGen: number
) {
  let changed = true;
  while (changed) {
    changed = false;
    for (const [personId, meta] of [...metadata.entries()]) {
      for (const siblingId of getSiblingPersonIds(data, personId)) {
        if (!peopleById.has(siblingId) || metadata.has(siblingId)) continue;
        const nextGen = meta.generation;
        if (nextGen < minGen || nextGen > maxGen) continue;
        metadata.set(siblingId, {
          generation: nextGen,
          branch: collateralBranch(meta.branch),
        });
        changed = true;
      }

      for (const relationship of parentRelationships) {
        if (relationship.from !== personId) continue;
        const childId = relationship.to;
        if (!peopleById.has(childId) || metadata.has(childId)) continue;
        const nextGen = meta.generation - 1;
        if (nextGen < minGen || nextGen > maxGen) continue;
        metadata.set(childId, {
          generation: nextGen,
          branch: meta.branch === "root" ? "shared" : meta.branch,
        });
        changed = true;
      }
    }
  }
}

function collateralBranch(branch: FamilyBranch): FamilyBranch {
  if (branch === "root") return "shared";
  return branch;
}

function siblingPairKey(a: PersonId, b: PersonId) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function siblingEdgeBranch(a?: FamilyBranch, b?: FamilyBranch): FamilyBranch {
  if (a === "maternal" || b === "maternal") return "maternal";
  if (a === "paternal" || b === "paternal") return "paternal";
  if (a === "root" || b === "root") return "shared";
  return a ?? b ?? "shared";
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
  const generations = [...new Set(nodes.map((node) => node.generation))].sort((a, b) => a - b);

  for (const generation of generations) {
    const generationNodes = nodes.filter((node) => node.generation === generation);
    const branchOrder: FamilyBranch[] = ["maternal", "root", "shared", "paternal", "unknown"];

    for (const branch of branchOrder) {
      const bucket = generationNodes
        .filter((node) => node.branch === branch)
        .sort((a, b) => getPersonName(a.person).localeCompare(getPersonName(b.person)));
      if (bucket.length === 0) continue;

      const baseX = getBranchBaseX(branch, generation);
      const start = -((bucket.length - 1) * SIBLING_GAP) / 2;
      bucket.forEach((node, index) => {
        node.x = baseX + start + index * SIBLING_GAP;
        node.y = -generation * GENERATION_GAP;
      });
    }
  }
}

function getBranchBaseX(branch: FamilyBranch, generation: number) {
  const depth = Math.max(1, Math.abs(generation));
  if (branch === "maternal") return -depth * BRANCH_GAP;
  if (branch === "paternal") return depth * BRANCH_GAP;
  if (branch === "shared") return 0;
  if (branch === "root") return 0;
  return generation % 2 === 0 ? 0 : 120;
}
