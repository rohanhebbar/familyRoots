import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import type { FamilyBranch, FamilyTreeData, Person, PersonId, TreeEdge, TreeNode } from "../../types/family";
import { buildTreeLayout, getBranchColor } from "../../lib/familyGraph";
import PersonTile from "./PersonTile";

interface FamilyTreeCanvasProps {
  data: FamilyTreeData;
  selectedPersonId: PersonId | null;
  zoom: number;
  pan: { x: number; y: number };
  branchFilter: "all" | "maternal" | "paternal";
  onSelectPerson: (personId: PersonId) => void;
  onUpdatePerson: (person: Person) => void;
  onZoomChange: (zoom: number) => void;
  onPanChange: (pan: { x: number; y: number }) => void;
}

export default function FamilyTreeCanvas({
  data,
  selectedPersonId,
  zoom,
  pan,
  branchFilter,
  onSelectPerson,
  onUpdatePerson,
  onZoomChange,
  onPanChange,
}: FamilyTreeCanvasProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const [size, setSize] = useState({ width: 1200, height: 800 });
  const layout = useMemo(() => buildTreeLayout(data), [data]);
  const nodeById = useMemo(
    () => new Map(layout.nodes.map((node) => [node.person.id, node])),
    [layout.nodes]
  );

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const origin = { x: size.width / 2 + pan.x, y: size.height * 0.72 + pan.y };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest(".tree-canvas__zoom-dock")) return;
    if (event.button !== 0) return;
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    dragRef.current = { ...drag, x: event.clientX, y: event.clientY };
    onPanChange({ x: pan.x + dx, y: pan.y + dy });
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div
      ref={viewportRef}
      className="tree-canvas"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <BranchBackdrop origin={origin} zoom={zoom} />
      <svg className="tree-canvas__lines" role="img" aria-label="Family tree relationship lines">
        <g transform={`translate(${origin.x} ${origin.y}) scale(${zoom})`}>
          {layout.edges.map((edge) => (
            <RelationshipLine
              key={edge.id}
              edge={edge}
              from={nodeById.get(edge.from)}
              to={nodeById.get(edge.to)}
              dimmed={isDimmed(edge.branch, branchFilter)}
              selectedPersonId={selectedPersonId}
            />
          ))}
        </g>
      </svg>
      <div
        className="tree-canvas__nodes"
        style={{
          transform: `translate(${origin.x}px, ${origin.y}px) scale(${zoom})`,
        }}
      >
        {layout.nodes.map((node) => (
          <div
            key={node.person.id}
            className="tree-node"
            style={{
              left: node.x,
              top: node.y,
              opacity: isDimmed(node.branch, branchFilter) ? 0.22 : 1,
            }}
          >
            <PersonTile
              person={node.person}
              branch={node.branch}
              selected={selectedPersonId === node.person.id}
              zoom={zoom}
              onSelect={() => onSelectPerson(node.person.id)}
              onUpdatePerson={onUpdatePerson}
            />
          </div>
        ))}
      </div>
      <div className="tree-canvas__zoom-dock" role="group" aria-label="Canvas zoom">
        <button
          type="button"
          className="tree-canvas__zoom-btn"
          aria-label="Zoom in"
          onClick={() => onZoomChange(clampZoom(zoom + 0.16))}
        >
          +
        </button>
        <span className="tree-canvas__zoom-readout">{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          className="tree-canvas__zoom-btn"
          aria-label="Zoom out"
          onClick={() => onZoomChange(clampZoom(zoom - 0.16))}
        >
          −
        </button>
      </div>
      <div className="canvas-help">Drag to pan, use + / − to zoom, click a tile to select — type names on the tile when selected.</div>
    </div>
  );
}

const TILE_HALF_H = 72;
const TILE_HALF_W = 88;

function RelationshipLine({
  edge,
  from,
  to,
  dimmed,
  selectedPersonId,
}: {
  edge: TreeEdge;
  from?: TreeNode;
  to?: TreeNode;
  dimmed: boolean;
  selectedPersonId: PersonId | null;
}) {
  if (!from || !to) return null;
  const touchesSelection =
    selectedPersonId !== null && (edge.from === selectedPersonId || edge.to === selectedPersonId);

  let path: string;
  if (edge.edgeKind === "sibling") {
    const left = from.x <= to.x ? from : to;
    const right = from.x <= to.x ? to : from;
    const avgY = (left.y + right.y) / 2;
    const x1 = left.x + TILE_HALF_W;
    const x2 = right.x - TILE_HALF_W;
    const midX = (x1 + x2) / 2;
    const span = Math.abs(x2 - x1);
    const dip = Math.min(56, 24 + span * 0.12);
    path = `M ${x1} ${avgY} Q ${midX} ${avgY + dip} ${x2} ${avgY}`;
  } else {
    const child = to;
    const parent = from;
    const midY = (parent.y + child.y) / 2;
    path = `M ${child.x} ${child.y + TILE_HALF_H} C ${child.x} ${midY}, ${parent.x} ${midY}, ${parent.x} ${parent.y - TILE_HALF_H}`;
  }

  return (
    <path
      d={path}
      fill="none"
      stroke={getBranchColor(edge.branch)}
      strokeLinecap="round"
      strokeDasharray={edge.edgeKind === "sibling" && edge.inferredSibling ? "7 10" : undefined}
      strokeWidth={dimmed ? 1.5 : touchesSelection ? 5 : edge.edgeKind === "sibling" ? 2.6 : 3}
      opacity={dimmed ? 0.18 : touchesSelection ? 0.95 : edge.edgeKind === "sibling" ? 0.62 : 0.7}
    />
  );
}

function BranchBackdrop({
  origin,
  zoom,
}: {
  origin: { x: number; y: number };
  zoom: number;
}) {
  return (
    <>
      <div
        className="branch-glow branch-glow--maternal"
        style={{
          left: origin.x - 760 * zoom,
          top: origin.y - 180 * zoom,
          transform: `scale(${zoom})`,
        }}
      />
      <div
        className="branch-glow branch-glow--paternal"
        style={{
          left: origin.x,
          top: origin.y - 180 * zoom,
          transform: `scale(${zoom})`,
        }}
      />
    </>
  );
}

function isDimmed(branch: FamilyBranch, filter: "all" | "maternal" | "paternal") {
  if (filter === "all" || branch === "root") return false;
  return branch !== filter;
}

function clampZoom(value: number) {
  return Math.min(1.75, Math.max(0.42, value));
}
