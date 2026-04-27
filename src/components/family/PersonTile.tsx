import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import type { FamilyBranch, Person } from "../../types/family";
import { getBranchColor, getInitials, getLifeSpan, getPersonName } from "../../lib/familyGraph";

interface PersonTileProps {
  person: Person;
  branch: FamilyBranch;
  selected: boolean;
  zoom: number;
  onSelect: () => void;
  onUpdatePerson: (person: Person) => void;
}

function isFromTileInput(target: EventTarget | null) {
  return Boolean(target && (target as HTMLElement).closest(".person-tile__field"));
}

export default function PersonTile({
  person,
  branch,
  selected,
  zoom,
  onSelect,
  onUpdatePerson,
}: PersonTileProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const givenRef = useRef<HTMLInputElement>(null);
  const branchColor = getBranchColor(branch);
  const detailLevel = zoom > 1.25 ? "rich" : zoom > 0.72 ? "compact" : "overview";

  useEffect(() => {
    if (!selected) return;
    const input = givenRef.current;
    if (!input) return;
    input.focus();
    const empty = !person.givenName.trim() && !(person.familyName || "").trim();
    if (empty) input.select();
    // Intentionally only when selection or person node changes — not on each keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, person.id]);

  const handleTilePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (isFromTileInput(event.target)) return;
    event.stopPropagation();
    onSelect();
  };

  const handleTileKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (selected || isFromTileInput(event.target)) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  };

  const label = getPersonName(person) || "Unnamed person";

  return (
    <div
      role={selected ? "group" : "button"}
      tabIndex={selected ? -1 : 0}
      aria-label={selected ? undefined : label}
      onPointerDown={handleTilePointerDown}
      onKeyDown={handleTileKeyDown}
      className={`person-tile person-tile--${detailLevel} ${selected ? "is-selected" : ""}`}
      style={{ "--branch-color": branchColor } as CSSProperties}
    >
      <span className="person-tile__stripe" />
      <span className="person-tile__avatar">
        {person.photoUrl && !imageFailed ? (
          <img src={person.photoUrl} alt="" onError={() => setImageFailed(true)} />
        ) : (
          getInitials(person)
        )}
      </span>

      {selected ? (
        <div className="person-tile__name-edit">
          <input
            ref={givenRef}
            className="person-tile__field"
            value={person.givenName}
            aria-label="First name"
            placeholder="First name"
            autoComplete="off"
            onPointerDown={(event) => event.stopPropagation()}
            onChange={(event) => onUpdatePerson({ ...person, givenName: event.target.value })}
          />
          <input
            className="person-tile__field"
            value={person.familyName ?? ""}
            aria-label="Family name"
            placeholder="Family name"
            autoComplete="off"
            onPointerDown={(event) => event.stopPropagation()}
            onChange={(event) =>
              onUpdatePerson({
                ...person,
                familyName: event.target.value.trim() === "" ? undefined : event.target.value,
              })
            }
          />
        </div>
      ) : (
        <span className="person-tile__name">
          {detailLevel === "overview" ? person.preferredName || person.givenName || "…" : getPersonName(person) || "…"}
        </span>
      )}

      {detailLevel !== "overview" && <span className="person-tile__dates">{getLifeSpan(person)}</span>}

      {detailLevel === "rich" && (
        <>
          <span className="person-tile__summary">
            {person.summary || "Use the tree panel to add parents or remove this person."}
          </span>
          <span className="person-tile__cta">Edit tree</span>
        </>
      )}
    </div>
  );
}
