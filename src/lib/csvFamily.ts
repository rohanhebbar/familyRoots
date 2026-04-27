import type { FamilyTreeData, ParentRole, Person, Relationship } from "../types/family";

const CSV_COLUMNS = ["id", "name", "birthDate", "deathDate", "photoUrl", "motherId", "fatherId", "notes"];

export function exportFamilyCsv(data: FamilyTreeData) {
  const parentsByChild = new Map<string, Partial<Record<ParentRole, string>>>();
  for (const relationship of data.relationships) {
    if (relationship.kind !== "biological-parent") continue;
    const entry = parentsByChild.get(relationship.to) ?? {};
    if (relationship.role === "mother" || relationship.role === "father") {
      entry[relationship.role] = relationship.from;
    }
    parentsByChild.set(relationship.to, entry);
  }

  const rows = data.people.map((person) => {
    const parents = parentsByChild.get(person.id);
    return [
      person.id,
      getCsvName(person),
      person.birth?.date ?? "",
      person.death?.date ?? "",
      person.photoUrl ?? "",
      parents?.mother ?? "",
      parents?.father ?? "",
      person.notes ?? person.summary ?? "",
    ];
  });

  return [CSV_COLUMNS, ...rows].map((row) => row.map(escapeCsvValue).join(",")).join("\n");
}

export function importFamilyCsv(csvText: string, fallbackRootPersonId: string): FamilyTreeData {
  const rows = parseCsv(csvText.trim());
  if (rows.length < 2) throw new Error("CSV needs a header row and at least one person row.");

  const headers = rows[0].map((header) => header.trim());
  const people: Person[] = [];
  const relationships: Relationship[] = [];

  for (const row of rows.slice(1)) {
    const record = Object.fromEntries(headers.map((header, index) => [header, row[index]?.trim() ?? ""]));
    if (!record.id || !record.name) continue;

    const [givenName, ...familyNameParts] = record.name.split(" ").filter(Boolean);
    people.push({
      id: record.id,
      givenName: givenName || record.name,
      familyName: familyNameParts.join(" ") || undefined,
      photoUrl: record.photoUrl || undefined,
      birth: record.birthDate ? { date: record.birthDate } : undefined,
      death: record.deathDate ? { date: record.deathDate } : undefined,
      summary: record.notes || undefined,
      notes: record.notes || undefined,
      tags: record.id === fallbackRootPersonId ? ["root"] : undefined,
    });

    addParentRelationship(relationships, record.motherId, record.id, "mother");
    addParentRelationship(relationships, record.fatherId, record.id, "father");
  }

  const rootPersonId = people.some((person) => person.id === fallbackRootPersonId)
    ? fallbackRootPersonId
    : people[0]?.id ?? fallbackRootPersonId;

  return {
    rootPersonId,
    people,
    relationships,
    sources: [
      {
        id: "csv-import",
        title: "Spreadsheet import",
        type: "record",
        note: "Imported from the prototype CSV format.",
      },
    ],
  };
}

function addParentRelationship(
  relationships: Relationship[],
  parentId: string | undefined,
  childId: string,
  role: ParentRole
) {
  if (!parentId) return;
  relationships.push({
    id: `${parentId}-to-${childId}`,
    kind: "biological-parent",
    from: parentId,
    to: childId,
    role,
    confidence: "likely",
    sourceIds: ["csv-import"],
  });
}

function getCsvName(person: Person) {
  return [person.preferredName || person.givenName, person.familyName].filter(Boolean).join(" ");
}

function escapeCsvValue(value: string) {
  if (!/[",\n]/.test(value)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  row.push(field);
  rows.push(row);
  return rows.filter((csvRow) => csvRow.some((cell) => cell.trim().length > 0));
}
