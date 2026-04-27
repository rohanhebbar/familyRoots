import type { CSSProperties } from "react";
import type { FamilyBranch, Person } from "../../types/family";
import { getBranchColor, getBranchLabel, getInitials, getPersonName } from "../../lib/familyGraph";

interface TreeEditPanelProps {
  person: Person | null;
  branch: FamilyBranch;
  rootPersonId: string;
  mother: Person | undefined;
  father: Person | undefined;
  siblings: Person[];
  onUpdatePerson: (person: Person) => void;
  onSelectPerson: (personId: string) => void;
  onAddParent: (role: "mother" | "father") => void;
  onAddSibling: () => void;
  onAddChild: () => void;
  onRemovePerson: () => void;
  onFocusRoot: () => void;
  removeDisabledReason: "root" | "hasChildren" | null;
}

export default function TreeEditPanel({
  person,
  branch,
  rootPersonId,
  mother,
  father,
  siblings,
  onUpdatePerson,
  onSelectPerson,
  onAddParent,
  onAddSibling,
  onAddChild,
  onRemovePerson,
  onFocusRoot,
  removeDisabledReason,
}: TreeEditPanelProps) {
  if (!person) return null;

  const branchColor = getBranchColor(branch);
  const isRoot = person.id === rootPersonId;

  return (
    <aside className="detail-panel">
      <div className="detail-panel__content tree-edit">
        <div className="detail-panel__header">
          <div className="detail-panel__identity">
            <div className="detail-panel__avatar" style={{ "--branch-color": branchColor } as CSSProperties}>
              {person.photoUrl ? <img src={person.photoUrl} alt="" /> : getInitials(person)}
            </div>
            <div>
              <p className="eyebrow">{getBranchLabel(branch)}</p>
              <p className="tree-edit__subtitle">{isRoot ? "Tree anchor" : "Selected person"}</p>
            </div>
          </div>
          <button type="button" className="ghost-button" onClick={onFocusRoot}>
            Root
          </button>
        </div>

        <div className="tree-edit__names">
          <label className="stacked-field">
            <span>First name</span>
            <input
              value={person.givenName}
              onChange={(event) => onUpdatePerson({ ...person, givenName: event.target.value })}
              autoComplete="off"
            />
          </label>
          <label className="stacked-field">
            <span>Family name</span>
            <input
              value={person.familyName ?? ""}
              onChange={(event) => onUpdatePerson({ ...person, familyName: event.target.value })}
              placeholder="Optional"
              autoComplete="off"
            />
          </label>
        </div>

        <div className="tree-edit__section">
          <p className="tree-edit__section-title">Parents of {getPersonName(person)}</p>
          <div className="parent-chips">
            <ParentChip
              label="Mother"
              linked={mother}
              onAdd={() => onAddParent("mother")}
              onOpen={() => mother && onSelectPerson(mother.id)}
            />
            <ParentChip
              label="Father"
              linked={father}
              onAdd={() => onAddParent("father")}
              onOpen={() => father && onSelectPerson(father.id)}
            />
          </div>
        </div>

        <div className="tree-edit__section">
          <p className="tree-edit__section-title">Siblings</p>
          {siblings.length > 0 ? (
            <div className="sibling-chip-row">
              {siblings.map((sibling) => (
                <button
                  key={sibling.id}
                  type="button"
                  className="sibling-chip"
                  onClick={() => onSelectPerson(sibling.id)}
                >
                  {getPersonName(sibling)}
                </button>
              ))}
            </div>
          ) : (
            <p className="tree-edit__hint">
              None listed yet. People with the same parents, or an explicit sibling link, appear here.
            </p>
          )}
          <div className="tree-edit__split-actions">
            <button type="button" className="tree-edit__btn" onClick={onAddSibling}>
              Add sibling
            </button>
            <button type="button" className="tree-edit__btn" onClick={onAddChild}>
              Add child
            </button>
          </div>
        </div>

        <div className="tree-edit__actions">
          <button
            type="button"
            className="tree-edit__btn tree-edit__btn--danger"
            disabled={!!removeDisabledReason}
            onClick={onRemovePerson}
            title={removeTitle(removeDisabledReason)}
          >
            Remove from tree
          </button>
        </div>

        <p className="tree-edit__footnote">
          Birth dates, photos, and stories stay in the data for later. This panel is only for shaping the tree.
        </p>
      </div>
    </aside>
  );
}

function removeTitle(reason: "root" | "hasChildren" | null) {
  if (reason === "root") return "The root person cannot be removed.";
  if (reason === "hasChildren") return "Remove people below this branch first.";
  return "Remove this person and their links to parents.";
}

function ParentChip({
  label,
  linked,
  onAdd,
  onOpen,
}: {
  label: string;
  linked: Person | undefined;
  onAdd: () => void;
  onOpen: () => void;
}) {
  return (
    <div className="parent-chip">
      <span className="parent-chip__label">{label}</span>
      {linked ? (
        <button type="button" className="parent-chip__link" onClick={onOpen}>
          {getPersonName(linked)}
        </button>
      ) : (
        <button type="button" className="parent-chip__add" onClick={onAdd}>
          Add
        </button>
      )}
    </div>
  );
}
