import { useState, type CSSProperties } from "react";
import type { FamilyBranch, Person } from "../../types/family";
import { getBranchColor, getInitials, getLifeSpan, getPersonName } from "../../lib/familyGraph";

interface PersonTileProps {
  person: Person;
  branch: FamilyBranch;
  selected: boolean;
  zoom: number;
  onSelect: () => void;
}

export default function PersonTile({ person, branch, selected, zoom, onSelect }: PersonTileProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const branchColor = getBranchColor(branch);
  const detailLevel = zoom > 1.25 ? "rich" : zoom > 0.72 ? "compact" : "overview";

  return (
    <button
      type="button"
      onClick={onSelect}
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

      <span className="person-tile__name">
        {detailLevel === "overview" ? person.preferredName || person.givenName : getPersonName(person)}
      </span>

      {detailLevel !== "overview" && <span className="person-tile__dates">{getLifeSpan(person)}</span>}

      {detailLevel === "rich" && (
        <>
          <span className="person-tile__summary">
            {person.summary || person.notes || "Add a short story or memory for this person."}
          </span>
          <span className="person-tile__cta">Open profile</span>
        </>
      )}
    </button>
  );
}
