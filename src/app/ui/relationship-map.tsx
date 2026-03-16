"use client";

import { useEffect, useMemo, useState } from "react";

import type { ResearchArea } from "@/lib/types";

type NodeType = "center" | "area" | "tech" | "activity";

type GraphNode = {
  id: string;
  label: string;
  type: NodeType;
  x: number;
  y: number;
  size: number;
};

type GraphEdge = {
  from: string;
  to: string;
  kind: "primary" | "secondary" | "link";
};

type Props = {
  centerLabel: string;
  researchAreas: ResearchArea[];
  relatedTechnologies: string[];
  standardizationActivities: string[];
};

function polar(cx: number, cy: number, radius: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function compactLabel(value: string, max = 28): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3).trimEnd()}...`;
}

function useGraphData({
  centerLabel,
  researchAreas,
  relatedTechnologies,
  standardizationActivities,
}: Props) {
  return useMemo(() => {
    const width = 760;
    const height = 460;
    const cx = width / 2;
    const cy = height / 2;
    const areaRadius = 140;
    const outerRadius = 220;

    const areas = researchAreas.slice(0, 6);
    const techs = relatedTechnologies.slice(0, 8);
    const acts = standardizationActivities.slice(0, 6);
    const outer = [
      ...techs.map((label) => ({ type: "tech" as const, label })),
      ...acts.map((label) => ({ type: "activity" as const, label })),
    ];

    const nodes: GraphNode[] = [
      {
        id: "center",
        label: centerLabel,
        type: "center",
        x: cx,
        y: cy,
        size: 16,
      },
    ];
    const edges: GraphEdge[] = [];

    areas.forEach((area, index) => {
      const point = polar(cx, cy, areaRadius, (index * 360) / Math.max(areas.length, 1) - 90);
      nodes.push({
        id: `area-${index}`,
        label: compactLabel(area.name, 24),
        type: "area",
        x: point.x,
        y: point.y,
        size: 11,
      });
      edges.push({ from: "center", to: `area-${index}`, kind: "primary" });
    });

    outer.forEach((item, index) => {
      const point = polar(cx, cy, outerRadius, (index * 360) / Math.max(outer.length, 1) - 90);
      nodes.push({
        id: `${item.type}-${index}`,
        label: compactLabel(item.label, 24),
        type: item.type,
        x: point.x,
        y: point.y,
        size: 8,
      });
      edges.push({ from: "center", to: `${item.type}-${index}`, kind: "secondary" });

      if (areas.length > 0) {
        const areaIdx =
          item.type === "tech" ? index % areas.length : (index * 2 + 1) % areas.length;
        edges.push({ from: `area-${areaIdx}`, to: `${item.type}-${index}`, kind: "link" });
      }
    });

    return { width, height, cx, cy, areaRadius, outerRadius, nodes, edges };
  }, [centerLabel, relatedTechnologies, researchAreas, standardizationActivities]);
}

function GraphSvg({ data, large = false }: { data: ReturnType<typeof useGraphData>; large?: boolean }) {
  const { width, height, cx, cy, areaRadius, outerRadius, nodes, edges } = data;
  const byId = new Map(nodes.map((node) => [node.id, node]));

  return (
    <svg
      className={`rdf-graph${large ? " large" : ""}`}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Research domain, technology, and standardization relationship map"
    >
      <defs>
        <filter id={large ? "nodeGlowLarge" : "nodeGlow"}>
          <feGaussianBlur stdDeviation="3.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {[areaRadius, outerRadius].map((radius) => (
        <circle
          key={radius}
          cx={cx}
          cy={cy}
          r={radius}
          className="rdf-ring"
          fill="none"
          strokeDasharray="4 6"
          opacity="0.8"
        />
      ))}

      {edges.map((edge, index) => {
        const a = byId.get(edge.from);
        const b = byId.get(edge.to);
        if (!a || !b) return null;
        return (
          <line
            key={`${edge.from}-${edge.to}-${index}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            className={`rdf-edge rdf-edge-${edge.kind}`}
            strokeLinecap="round"
          />
        );
      })}

      {nodes.map((node) => {
        const isCenter = node.type === "center";
        const anchor = isCenter ? "middle" : node.x > cx ? "start" : "end";
        return (
          <g key={node.id} className="rdf-node-group">
            <circle
              cx={node.x}
              cy={node.y}
              r={node.size}
              className={`rdf-node rdf-node-${node.type}`}
              filter={`url(#${large ? "nodeGlowLarge" : "nodeGlow"})`}
            />
            <text
              x={isCenter ? node.x : node.x + (node.x > cx ? 14 : -14)}
              y={node.y + 4}
              textAnchor={anchor}
              className={`rdf-label rdf-label-${node.type}`}
            >
              {node.label}
            </text>
          </g>
        );
      })}

      {[
        { cls: "area", label: "Research Area" },
        { cls: "tech", label: "Technology" },
        { cls: "activity", label: "Standardization" },
      ].map((item, index) => (
        <g key={item.label}>
          <circle
            cx={20 + index * 165}
            cy={height - 20}
            r={5}
            className={`rdf-node rdf-node-${item.cls}`}
          />
          <text x={30 + index * 165} y={height - 16} className="rdf-legend-text">
            {item.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function RelationshipMap(props: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const data = useGraphData(props);

  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add("graph-modal-open");

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.classList.remove("graph-modal-open");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <article className="viz-card rdf-card">
        <div className="viz-head">
          <div>
            <h3>RDF Relationship Map</h3>
            <p className="hint graph-hint">
              Research domain, technology, and standardization linkage graph
            </p>
          </div>
          <button type="button" className="mini-button" onClick={() => setIsOpen(true)}>
            Expand
          </button>
        </div>
        <div className="rdf-shell">
          <GraphSvg data={data} />
        </div>
      </article>
      {isOpen ? (
        <div className="graph-modal" role="dialog" aria-modal="true" aria-label="Expanded relationship map">
          <button
            type="button"
            className="graph-modal-backdrop"
            aria-label="Close expanded map"
            onClick={() => setIsOpen(false)}
          />
          <div className="graph-modal-panel">
            <div className="viz-head">
              <div>
                <h3>Expanded RDF Relationship Map</h3>
                <p className="hint graph-hint">
                  Research domain, technology, and standardization linkage view
                </p>
              </div>
              <button type="button" className="mini-button" onClick={() => setIsOpen(false)}>
                Close
              </button>
            </div>
            <div className="rdf-shell modal-shell">
              <GraphSvg data={data} large />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
