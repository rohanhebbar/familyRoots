export type PersonId = string;
export type RelationshipId = string;
export type RelationshipKind =
  | "biological-parent"
  | "adoptive-parent"
  | "step-parent"
  | "partner"
  /** Undirected: store once with `from` & `to` in any order; readers treat as unordered. */
  | "sibling";
export type ParentRole = "mother" | "father" | "parent";
export type FamilyBranch = "root" | "maternal" | "paternal" | "shared" | "unknown";

export interface LifeEvent {
  date?: string;
  place?: string;
}

export interface Person {
  id: PersonId;
  givenName: string;
  familyName?: string;
  preferredName?: string;
  photoUrl?: string;
  birth?: LifeEvent;
  death?: LifeEvent;
  birthplace?: string;
  summary?: string;
  notes?: string;
  tags?: string[];
  facts?: Record<string, string>;
}

export interface Relationship {
  id: RelationshipId;
  kind: RelationshipKind;
  from: PersonId;
  to: PersonId;
  role?: ParentRole;
  label?: string;
  confidence?: "confirmed" | "likely" | "unknown";
  sourceIds?: string[];
}

export interface Source {
  id: string;
  title: string;
  type: "story" | "document" | "photo" | "record";
  note?: string;
}

export interface FamilyTreeData {
  rootPersonId: PersonId;
  people: Person[];
  relationships: Relationship[];
  sources: Source[];
}

export interface TreeNode {
  person: Person;
  branch: FamilyBranch;
  generation: number;
  x: number;
  y: number;
}

export interface TreeEdge {
  id: string;
  from: PersonId;
  to: PersonId;
  branch: FamilyBranch;
  label?: string;
  edgeKind: "parent" | "sibling";
  /** Present when the line is synthesized from shared parents (not a stored `sibling` relationship). */
  inferredSibling?: boolean;
}
