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
  onNewBlankTree: () => void;
  onCsvTextChange: (value: string) => void;
  onImportCsv: () => void;
  onExportCsv: () => void;
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
  onNewBlankTree,
  onCsvTextChange,
  onImportCsv,
  onExportCsv,
}: FamilyToolbarProps) {
  return (
    <div className="toolbar">
      <div>
        <p className="eyebrow">Prototype</p>
        <h1>FamilyRoots</h1>
        <p className="toolbar__intro">
          Pan and zoom the tree, click someone to edit connections, and use the right panel to add or remove people.
          Select a tile to type names on the canvas, or start over with a blank tree.
        </p>
        <button type="button" className="toolbar-button toolbar-button--wide" onClick={onNewBlankTree}>
          New blank tree
        </button>
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
