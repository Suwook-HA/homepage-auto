"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { LangText } from "@/app/ui/lang-text";
import type { ArticleItem, PatentRecord, ResearchArea } from "@/lib/types";

type NodeType = "center" | "area" | "tech" | "activity";

type GraphNode = {
  id: string;
  label: string;
  rawLabel: string;
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
  articles: ArticleItem[];
  patentRecords: PatentRecord[];
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

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s/-]/g, " ")
    .split(/[\s/-]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);
}

function deriveKeywords(label: string, nodeType: NodeType): string[] {
  const lower = label.toLowerCase();
  const keywords = new Set<string>([lower, ...tokenize(label)]);

  if (nodeType === "center") {
    ["ai", "standard", "standardization", "quality", "governance"].forEach((item) => {
      keywords.add(item);
    });
  }
  if (lower.includes("standard")) {
    ["standard", "standardization", "iso", "iec", "itu", "policy"].forEach((item) => {
      keywords.add(item);
    });
  }
  if (lower.includes("quality")) {
    ["quality", "data", "benchmark", "validation"].forEach((item) => keywords.add(item));
  }
  if (lower.includes("trust")) {
    ["trust", "trustworthy", "safety", "governance"].forEach((item) => keywords.add(item));
  }
  if (lower.includes("governance")) {
    ["governance", "policy", "quality"].forEach((item) => keywords.add(item));
  }
  if (lower.includes("generative")) {
    ["generative", "llm", "foundation"].forEach((item) => keywords.add(item));
  }
  if (lower.includes("agent")) {
    ["agent", "agentic", "autonomous"].forEach((item) => keywords.add(item));
  }
  if (lower.includes("federated")) {
    ["federated", "distributed", "collaboration"].forEach((item) => keywords.add(item));
  }
  if (lower.includes("mlops")) {
    ["mlops", "deployment", "pipeline"].forEach((item) => keywords.add(item));
  }
  if (lower.includes("knowledge")) {
    ["knowledge", "graph", "semantic"].forEach((item) => keywords.add(item));
  }

  return [...keywords];
}

function scoreTextMatch(text: string, label: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  let score = 0;
  if (lower.includes(label.toLowerCase())) score += 5;
  keywords.forEach((keyword) => {
    if (keyword && lower.includes(keyword)) score += 1;
  });
  return score;
}

function useGraphData({
  centerLabel,
  researchAreas,
  relatedTechnologies,
  standardizationActivities,
}: Omit<Props, "articles" | "patentRecords">) {
  return useMemo(() => {
    const width = 760;
    const height = 460;
    const cx = width / 2;
    const cy = height / 2;
    const areaRadius = 140;
    const outerRadius = 220;

    const areas = researchAreas.slice(0, 6);
    const techs = relatedTechnologies.slice(0, 8);
    const activities = standardizationActivities.slice(0, 6);
    const outer = [
      ...techs.map((label) => ({ type: "tech" as const, label })),
      ...activities.map((label) => ({ type: "activity" as const, label })),
    ];

    const nodes: GraphNode[] = [
      {
        id: "center",
        label: compactLabel(centerLabel, 24),
        rawLabel: centerLabel,
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
        rawLabel: area.name,
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
        rawLabel: item.label,
        type: item.type,
        x: point.x,
        y: point.y,
        size: 8,
      });
      edges.push({ from: "center", to: `${item.type}-${index}`, kind: "secondary" });

      if (areas.length > 0) {
        const areaIndex =
          item.type === "tech" ? index % areas.length : (index * 2 + 1) % areas.length;
        edges.push({ from: `area-${areaIndex}`, to: `${item.type}-${index}`, kind: "link" });
      }
    });

    return { width, height, cx, cy, areaRadius, outerRadius, nodes, edges };
  }, [centerLabel, relatedTechnologies, researchAreas, standardizationActivities]);
}

function GraphSvg({
  data,
  activeNodeId,
  onSelect,
  large = false,
}: {
  data: ReturnType<typeof useGraphData>;
  activeNodeId: string;
  onSelect: (id: string) => void;
  large?: boolean;
}) {
  const { width, height, cx, areaRadius, outerRadius, nodes, edges } = data;
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
          cx={data.cx}
          cy={data.cy}
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
        const isActive = edge.from === activeNodeId || edge.to === activeNodeId;
        return (
          <line
            key={`${edge.from}-${edge.to}-${index}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            className={`rdf-edge rdf-edge-${edge.kind}${isActive ? " active" : ""}`}
            strokeLinecap="round"
          />
        );
      })}

      {nodes.map((node) => {
        const isCenter = node.type === "center";
        const anchor = isCenter ? "middle" : node.x > cx ? "start" : "end";
        const isActive = node.id === activeNodeId;
        return (
          <g
            key={node.id}
            className={`rdf-node-group${isActive ? " active" : ""}`}
            onClick={() => onSelect(node.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(node.id);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={`Focus ${node.rawLabel}`}
          >
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

export function RelationshipMap({ articles, patentRecords, ...graphProps }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeNodeId, setActiveNodeId] = useState("center");
  const data = useGraphData(graphProps);

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

  const focus = useMemo(() => {
    const byId = new Map(data.nodes.map((node) => [node.id, node]));
    const activeNode = byId.get(activeNodeId) ?? data.nodes[0];
    const connectedIds = new Set<string>();

    data.edges.forEach((edge) => {
      if (edge.from === activeNode.id) connectedIds.add(edge.to);
      if (edge.to === activeNode.id) connectedIds.add(edge.from);
    });

    const connectedNodes = data.nodes.filter(
      (node) => connectedIds.has(node.id) && node.id !== "center",
    );
    const keywords = deriveKeywords(activeNode.rawLabel, activeNode.type);

    const relatedArticles = [...articles]
      .map((article) => ({
        item: article,
        score: scoreTextMatch(
          [article.title, article.summary, article.source].join(" "),
          activeNode.rawLabel,
          keywords,
        ),
      }))
      .filter((entry) => activeNode.type === "center" || entry.score > 0)
      .sort((a, b) => b.score - a.score || a.item.rank - b.item.rank)
      .slice(0, 3)
      .map((entry) => entry.item);

    const fallbackArticles = relatedArticles.length > 0 ? relatedArticles : articles.slice(0, 3);

    const relatedPatents = [...patentRecords]
      .map((patent) => ({
        item: patent,
        score: scoreTextMatch(
          [patent.title, patent.region, patent.status].join(" "),
          activeNode.rawLabel,
          keywords,
        ),
      }))
      .filter((entry) => activeNode.type === "center" || entry.score > 0)
      .sort((a, b) => b.score - a.score || b.item.filedAt.localeCompare(a.item.filedAt))
      .slice(0, 3)
      .map((entry) => entry.item);

    const fallbackPatents =
      relatedPatents.length > 0
        ? relatedPatents
        : [...patentRecords].sort((a, b) => b.filedAt.localeCompare(a.filedAt)).slice(0, 3);

    return {
      activeNode,
      connectedNodes: connectedNodes.slice(0, 6),
      articles: fallbackArticles,
      patents: fallbackPatents,
    };
  }, [activeNodeId, articles, data.edges, data.nodes, patentRecords]);

  return (
    <>
      <article className="viz-card rdf-card">
        <div className="viz-head">
          <div>
            <h3>
              <LangText ko="RDF 관계도" en="RDF Relationship Map" />
            </h3>
            <p className="hint graph-hint">
              <LangText
                ko="연구 영역, 기술, 표준화 활동 간 연결 구조를 탐색합니다."
                en="Explore the linkage between research domains, technologies, and standards work."
              />
            </p>
          </div>
          <button type="button" className="mini-button" onClick={() => setIsOpen(true)}>
            <LangText ko="확대" en="Expand" inline />
          </button>
        </div>
        <div className="rdf-shell">
          <GraphSvg data={data} activeNodeId={activeNodeId} onSelect={setActiveNodeId} />
        </div>
        <div className="graph-focus-panel">
          <div className="graph-focus-head">
            <span className={`focus-type ${focus.activeNode.type}`}>
              {focus.activeNode.type.toUpperCase()}
            </span>
            <strong>{focus.activeNode.rawLabel}</strong>
            <p className="hint">
              <LangText
                ko="노드를 선택하면 연결된 기술, 기사, 특허를 함께 보여줍니다."
                en="Select a node to filter connected topics, articles, and patents."
              />
            </p>
          </div>
          <div className="graph-focus-grid">
            <section className="graph-focus-card">
              <h4>
                <LangText ko="연결 토픽" en="Connected Topics" />
              </h4>
              <div className="focus-chip-list">
                {focus.connectedNodes.length === 0 ? (
                  <p className="media-empty">
                    <LangText ko="연결된 토픽이 없습니다." en="No connected topics." />
                  </p>
                ) : (
                  focus.connectedNodes.map((node) => (
                    <button
                      key={node.id}
                      type="button"
                      className="focus-chip"
                      onClick={() => setActiveNodeId(node.id)}
                    >
                      {node.rawLabel}
                    </button>
                  ))
                )}
              </div>
            </section>

            <section className="graph-focus-card">
              <h4>
                <LangText ko="관련 기사" en="Related Articles" />
              </h4>
              <div className="focus-list">
                {focus.articles.map((article) => (
                  <article key={article.id} className="focus-list-item">
                    <p className="item-meta">
                      #{article.rank} | {article.source}
                    </p>
                    <h5>
                      <Link href={article.url} target="_blank">
                        {article.title}
                      </Link>
                    </h5>
                  </article>
                ))}
              </div>
            </section>

            <section className="graph-focus-card">
              <h4>
                <LangText ko="관련 특허" en="Related Patents" />
              </h4>
              <div className="focus-list">
                {focus.patents.map((patent) => (
                  <article
                    key={`${patent.patentNumber}-${patent.filedAt}`}
                    className="focus-list-item"
                  >
                    <p className="item-meta">
                      {patent.region} | {patent.status}
                    </p>
                    <h5>{patent.title}</h5>
                    <p className="item-meta">{patent.patentNumber}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>
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
                <h3>
                  <LangText ko="확대 RDF 관계도" en="Expanded RDF Relationship Map" />
                </h3>
                <p className="hint graph-hint">
                  <LangText
                    ko="선택한 노드 기준으로 관계망을 큰 화면에서 확인합니다."
                    en="Inspect the selected node and its connections in a larger view."
                  />
                </p>
              </div>
              <button type="button" className="mini-button" onClick={() => setIsOpen(false)}>
                <LangText ko="닫기" en="Close" inline />
              </button>
            </div>
            <div className="rdf-shell modal-shell">
              <GraphSvg
                data={data}
                activeNodeId={activeNodeId}
                onSelect={setActiveNodeId}
                large
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
