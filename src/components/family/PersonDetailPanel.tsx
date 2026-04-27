import type { CSSProperties } from "react";
import type { FamilyBranch, Person } from "../../types/family";
import {
  getBranchColor,
  getBranchLabel,
  getInitials,
  getLifeSpan,
  getPersonName,
} from "../../lib/familyGraph";

interface PersonDetailPanelProps {
  person: Person | null;
  branch: FamilyBranch;
  onClose: () => void;
  onUpdatePerson: (person: Person) => void;
}

export default function PersonDetailPanel({
  person,
  branch,
  onClose,
  onUpdatePerson,
}: PersonDetailPanelProps) {
  const branchColor = getBranchColor(branch);

  return (
    <aside className={`detail-panel ${person ? "is-open" : ""}`}>
      {person && (
        <div className="detail-panel__content">
          <div className="detail-panel__header">
            <div className="detail-panel__identity">
              <div className="detail-panel__avatar" style={{ "--branch-color": branchColor } as CSSProperties}>
                {person.photoUrl ? <img src={person.photoUrl} alt="" /> : getInitials(person)}
              </div>
              <div>
                <p className="eyebrow">{getBranchLabel(branch)}</p>
                <h2>{getPersonName(person)}</h2>
                <p className="muted">{getLifeSpan(person)}</p>
              </div>
            </div>
            <button type="button" className="ghost-button" onClick={onClose}>
              Close
            </button>
          </div>

          <div className="detail-grid">
            <EditableField
              label="Given name"
              value={person.givenName}
              onChange={(value) => onUpdatePerson({ ...person, givenName: value })}
            />
            <EditableField
              label="Family name"
              value={person.familyName ?? ""}
              onChange={(value) => onUpdatePerson({ ...person, familyName: value })}
            />
            <EditableField
              label="Born"
              value={person.birth?.date ?? ""}
              onChange={(value) => onUpdatePerson({ ...person, birth: { ...person.birth, date: value } })}
            />
            <EditableField
              label="Died"
              value={person.death?.date ?? ""}
              onChange={(value) => onUpdatePerson({ ...person, death: { ...person.death, date: value } })}
            />
            <EditableField
              label="Birthplace"
              value={person.birth?.place ?? person.birthplace ?? ""}
              wide
              onChange={(value) =>
                onUpdatePerson({ ...person, birth: { ...person.birth, place: value }, birthplace: value })
              }
            />
            <EditableField
              label="Photo URL"
              value={person.photoUrl ?? ""}
              wide
              onChange={(value) => onUpdatePerson({ ...person, photoUrl: value })}
            />
          </div>

          <label className="stacked-field">
            <span>Summary</span>
            <textarea
              value={person.summary ?? ""}
              onChange={(event) => onUpdatePerson({ ...person, summary: event.target.value })}
              placeholder="A short, child-friendly description or story prompt"
            />
          </label>

          <label className="stacked-field">
            <span>Notes</span>
            <textarea
              value={person.notes ?? ""}
              onChange={(event) => onUpdatePerson({ ...person, notes: event.target.value })}
              placeholder="Private notes, open questions, sources to check"
            />
          </label>

          <div className="facts-list">
            <p className="eyebrow">Known facts</p>
            {Object.entries(person.facts ?? {}).map(([label, value]) => (
              <div key={label} className="fact-card">
                <p>{label}</p>
                <span>{value}</span>
              </div>
            ))}
            {Object.keys(person.facts ?? {}).length === 0 && (
              <p className="empty-state">
                Add columns in the CSV or notes here for hobbies, languages, places lived, and stories.
              </p>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}

function EditableField({
  label,
  value,
  wide = false,
  onChange,
}: {
  label: string;
  value: string;
  wide?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className={`editable-field ${wide ? "editable-field--wide" : ""}`}>
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
