export interface VisualLibraryOption {
  name: string;
  fit: "prototype" | "later";
  strengths: string[];
  tradeoffs: string[];
}

export const visualLibraryOptions: VisualLibraryOption[] = [
  {
    name: "Native SVG + HTML tiles",
    fit: "prototype",
    strengths: [
      "No new dependency",
      "Easy to tune person cards and relationship lines",
      "Works well for dozens to hundreds of visible nodes",
    ],
    tradeoffs: ["Manual layout code", "Will need optimization for very large trees"],
  },
  {
    name: "React Flow",
    fit: "later",
    strengths: [
      "Great interaction primitives",
      "Built-in pan, zoom, selection, and minimap patterns",
      "Useful once editing relationships becomes central",
    ],
    tradeoffs: ["Heavier abstraction", "Node layout still needs custom ancestry rules"],
  },
  {
    name: "D3",
    fit: "later",
    strengths: [
      "Strong tree and graph layout algorithms",
      "Excellent for custom visual encodings",
      "Good migration path when the layout gets more complex",
    ],
    tradeoffs: ["More imperative code", "More work to blend with React components"],
  },
  {
    name: "Canvas or WebGL",
    fit: "later",
    strengths: [
      "Best fit for very large family graphs",
      "Smooth performance with thousands of nodes",
      "Can support advanced spatial interactions",
    ],
    tradeoffs: ["Harder accessibility", "More custom hit testing and text rendering"],
  },
];
