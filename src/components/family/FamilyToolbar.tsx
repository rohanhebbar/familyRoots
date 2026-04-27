import { visualLibraryOptions } from "../../data/visualLibraryOptions";

interface FamilyToolbarProps {
  search: string;
  zoom: number;
  branchFilter: "all" | "maternal" | "paternal";
  csvText: string;
  error: string | null;
  onSearchChange: (value: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onBranchFilterChange: (value: "all" | "maternal" | "paternal") => void;
  onCsvTextChange: (value: string) => void;
  onImportCsv: () => void;
  onExportCsv: () => void;
  onAddParent: (role: "mother" | "father") => void;
}

export default function FamilyToolbar({
  search,
  zoom,
  branchFilter,
  csvText,
  error,
  onSearchChange,
  onZoomIn,
  onZoomOut,
  onResetView,
  onBranchFilterChange,
  onCsvTextChange,
  onImportCsv,
  onExportCsv,
  onAddParent,
}: FamilyToolbarProps) {
  const prototypeChoice = visualLibraryOptions.find((option) => option.fit === "prototype");

  return (
    <div className="toolbar">
      <div>
        <p className="eyebrow">Prototype</p>
        <h1>FamilyRoots</h1>
        <p className="toolbar__intro">
          Zoom out for the ancestry map, then zoom in for photo-forward person tiles.
        </p>
      </div>

      <label className="stacked-field">
        <span>Search</span>
        <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Find a person" />
      </label>

      <div className="segmented">
        <ToolbarButton label="Maternal" active={branchFilter === "maternal"} onClick={() => onBranchFilterChange("maternal")} />
        <ToolbarButton label="All" active={branchFilter === "all"} onClick={() => onBranchFilterChange("all")} />
        <ToolbarButton label="Paternal" active={branchFilter === "paternal"} onClick={() => onBranchFilterChange("paternal")} />
      </div>

      <div className="zoom-controls">
        <ToolbarButton label="-" active={false} onClick={onZoomOut} />
        <span>{Math.round(zoom * 100)}% zoom</span>
        <ToolbarButton label="+" active={false} onClick={onZoomIn} />
        <ToolbarButton label="Reset" active={false} onClick={onResetView} />
      </div>

      <div className="segmented">
        <ToolbarButton label="Add mother" active={false} onClick={() => onAddParent("mother")} />
        <ToolbarButton label="Add father" active={false} onClick={() => onAddParent("father")} />
      </div>

      <details className="csv-panel">
        <summary>CSV import and export</summary>
        <p>Columns: id, name, birthDate, deathDate, photoUrl, motherId, fatherId, notes.</p>
        <textarea value={csvText} onChange={(event) => onCsvTextChange(event.target.value)} placeholder="Paste CSV here" />
        {error && <p className="csv-panel__error">{error}</p>}
        <div className="csv-panel__actions">
          <ToolbarButton label="Import" active={false} onClick={onImportCsv} />
          <ToolbarButton label="Export" active={false} onClick={onExportCsv} />
        </div>
      </details>

      <div className="decision-card">
        <span>Visual choice:</span> {prototypeChoice?.name}. {prototypeChoice?.strengths[0]} and keeps
        the first pass easy to reshape.
      </div>
    </div>
  );
}

function ToolbarButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`toolbar-button ${active ? "is-active" : ""}`} onClick={onClick}>
      {label}
    </button>
  );
}
