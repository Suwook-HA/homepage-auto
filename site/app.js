/* global document, window, fetch, Intl */

const STORAGE_KEY = "homepage-lang";
const state = { profile: null, content: null, promotion: null, activeTab: "articles", activeGraphNodeId: "center" };

function text(v) { return typeof v === "string" ? v : ""; }
function formatDate(iso) {
  if (!iso) return "N/A";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "N/A";
  const locale = document.documentElement.dataset.lang === "en" ? "en-US" : "ko-KR";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(d);
}
function formatShortDate(iso) {
  if (!iso) return "N/A";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "N/A";
  const locale = document.documentElement.dataset.lang === "en" ? "en-US" : "ko-KR";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(d);
}
function formatNumber(v) { return new Intl.NumberFormat("en-US").format(Number(v) || 0); }
function toPercent(v, max) { return !max || max <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((v / max) * 100))); }
function toSqrtPercent(v, max) { return !max || v <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((Math.sqrt(v) / Math.sqrt(max)) * 100))); }
function compactLabel(v, max = 24) { const raw = text(v); return !raw || raw.length <= max ? raw : `${raw.slice(0, max - 3).trimEnd()}...`; }
function clearChildren(node) { while (node.firstChild) node.removeChild(node.firstChild); }
function svgEl(tag) { return document.createElementNS("http://www.w3.org/2000/svg", tag); }
function polar(cx, cy, radius, angleDeg) { const rad = (angleDeg * Math.PI) / 180; return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) }; }
function iconMarkup(kind) {
  if (kind === "shield") return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5.5 5.6v5.5c0 4.3 2.7 8.2 6.5 9.8 3.8-1.6 6.5-5.5 6.5-9.8V5.6z"></path><path d="m9.1 12.3 2 2 3.8-4.5"></path></svg>';
  if (kind === "chip") return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2"></rect><path d="M9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M1 15h4M19 9h4M19 15h4"></path></svg>';
  if (kind === "globe") return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"></circle><path d="M3.8 9.5h16.4M3.8 14.5h16.4M12 3.5c2.4 2.2 3.7 5.2 3.7 8.5S14.4 18.3 12 20.5M12 3.5C9.6 5.7 8.3 8.7 8.3 12S9.6 18.3 12 20.5"></path></svg>';
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="2.5"></circle><circle cx="18" cy="6" r="2.5"></circle><circle cx="18" cy="18" r="2.5"></circle><path d="M8 12h7.5M8 11l7.8-4M8 13l7.8 4"></path></svg>';
}
function tokenize(v) { return text(v).toLowerCase().replace(/[^a-z0-9\s/-]/g, " ").split(/[\s/-]+/).map((item) => item.trim()).filter((item) => item.length >= 2); }
function deriveKeywords(label, nodeType) {
  const lower = text(label).toLowerCase();
  const keywords = new Set([lower, ...tokenize(label)]);
  if (nodeType === "center") ["ai", "standard", "standardization", "quality", "governance"].forEach((item) => keywords.add(item));
  if (lower.includes("standard")) ["standard", "standardization", "iso", "iec", "itu", "policy"].forEach((item) => keywords.add(item));
  if (lower.includes("quality")) ["quality", "data", "benchmark", "validation"].forEach((item) => keywords.add(item));
  if (lower.includes("trust")) ["trust", "trustworthy", "safety", "governance"].forEach((item) => keywords.add(item));
  if (lower.includes("governance")) ["governance", "policy", "quality"].forEach((item) => keywords.add(item));
  if (lower.includes("generative")) ["generative", "llm", "foundation"].forEach((item) => keywords.add(item));
  if (lower.includes("agent")) ["agent", "agentic", "autonomous"].forEach((item) => keywords.add(item));
  if (lower.includes("federated")) ["federated", "distributed", "collaboration"].forEach((item) => keywords.add(item));
  if (lower.includes("mlops")) ["mlops", "deployment", "pipeline"].forEach((item) => keywords.add(item));
  if (lower.includes("knowledge")) ["knowledge", "graph", "semantic"].forEach((item) => keywords.add(item));
  return [...keywords];
}
function scoreTextMatch(rawText, label, keywords) {
  const lower = text(rawText).toLowerCase();
  let score = lower.includes(text(label).toLowerCase()) ? 5 : 0;
  keywords.forEach((keyword) => { if (keyword && lower.includes(keyword)) score += 1; });
  return score;
}
function setLanguage(lang) {
  document.documentElement.dataset.lang = lang;
  window.localStorage.setItem(STORAGE_KEY, lang);
  document.querySelectorAll("[data-lang-option]").forEach((button) => button.classList.toggle("active", button.getAttribute("data-lang-option") === lang));
}
function initLanguage() {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  const lang = saved === "ko" || saved === "en" || saved === "bi" ? saved : "bi";
  setLanguage(lang);
  document.querySelectorAll("[data-lang-option]").forEach((button) => button.addEventListener("click", () => setLanguage(button.getAttribute("data-lang-option"))));
}
function getGraphData(profile) {
  const width = 760, height = 460, cx = width / 2, cy = height / 2, areaRadius = 140, outerRadius = 220;
  const areas = Array.isArray(profile.researchAreas) ? profile.researchAreas.slice(0, 6) : [];
  const techs = Array.isArray(profile.relatedTechnologies) ? profile.relatedTechnologies.slice(0, 8) : [];
  const activities = Array.isArray(profile.standardizationActivities) ? profile.standardizationActivities.slice(0, 6) : [];
  const outer = [...techs.map((label) => ({ type: "tech", label })), ...activities.map((label) => ({ type: "activity", label }))];
  const nodes = [{ id: "center", label: compactLabel(profile.localName || profile.name || "Ha Suwook", 24), rawLabel: profile.localName || profile.name || "Ha Suwook", type: "center", x: cx, y: cy, size: 16 }];
  const edges = [];
  areas.forEach((area, index) => {
    const point = polar(cx, cy, areaRadius, (index * 360) / Math.max(areas.length, 1) - 90);
    nodes.push({ id: `area-${index}`, label: compactLabel(area.name, 24), rawLabel: area.name, type: "area", x: point.x, y: point.y, size: 11 });
    edges.push({ from: "center", to: `area-${index}`, kind: "primary" });
  });
  outer.forEach((item, index) => {
    const point = polar(cx, cy, outerRadius, (index * 360) / Math.max(outer.length, 1) - 90);
    nodes.push({ id: `${item.type}-${index}`, label: compactLabel(item.label, 24), rawLabel: item.label, type: item.type, x: point.x, y: point.y, size: 8 });
    edges.push({ from: "center", to: `${item.type}-${index}`, kind: "secondary" });
    if (areas.length > 0) edges.push({ from: `area-${item.type === "tech" ? index % areas.length : (index * 2 + 1) % areas.length}`, to: `${item.type}-${index}`, kind: "link" });
  });
  return { width, height, cx, cy, areaRadius, outerRadius, nodes, edges };
}
function getGraphFocus(profile, content, activeNodeId) {
  const data = getGraphData(profile);
  const byId = new Map(data.nodes.map((node) => [node.id, node]));
  const activeNode = byId.get(activeNodeId) || data.nodes[0];
  const connectedIds = new Set();
  data.edges.forEach((edge) => { if (edge.from === activeNode.id) connectedIds.add(edge.to); if (edge.to === activeNode.id) connectedIds.add(edge.from); });
  const connectedNodes = data.nodes.filter((node) => connectedIds.has(node.id) && node.id !== "center");
  const keywords = deriveKeywords(activeNode.rawLabel, activeNode.type);
  const articles = Array.isArray(content.articles) ? content.articles : [];
  const patents = Array.isArray(profile.patentRecords) ? profile.patentRecords : [];
  const relatedArticles = [...articles].map((article) => ({ item: article, score: scoreTextMatch([article.title, article.summary, article.source].join(" "), activeNode.rawLabel, keywords) })).filter((entry) => activeNode.type === "center" || entry.score > 0).sort((a, b) => b.score - a.score || a.item.rank - b.item.rank).slice(0, 3).map((entry) => entry.item);
  const relatedPatents = [...patents].map((patent) => ({ item: patent, score: scoreTextMatch([patent.title, patent.region, patent.status].join(" "), activeNode.rawLabel, keywords) })).filter((entry) => activeNode.type === "center" || entry.score > 0).sort((a, b) => b.score - a.score || text(b.item.filedAt).localeCompare(text(a.item.filedAt))).slice(0, 3).map((entry) => entry.item);
  return { data, activeNode, connectedNodes: connectedNodes.slice(0, 6), articles: relatedArticles.length > 0 ? relatedArticles : articles.slice(0, 3), patents: relatedPatents.length > 0 ? relatedPatents : [...patents].sort((a, b) => text(b.filedAt).localeCompare(text(a.filedAt))).slice(0, 3) };
}
function createCard(meta, title, body, href, linkLabel, className = "item") {
  const article = document.createElement("article");
  article.className = className;
  if (meta) { const p = document.createElement("p"); p.className = "item-meta"; p.textContent = meta; article.appendChild(p); }
  if (title) { const h3 = document.createElement("h3"); h3.textContent = title; article.appendChild(h3); }
  if (body) { const p = document.createElement("p"); p.textContent = body; article.appendChild(p); }
  if (href) {
    const a = document.createElement("a");
    a.className = "source-link";
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = linkLabel || "Open";
    article.appendChild(a);
  }
  return article;
}

function renderHero(profile, content) {
  const organization = text(profile.location).split(",")[0].trim() || "ETRI";
  const patent = profile.patentStats || { domestic: { applications: 0, registrations: 0 }, international: { applications: 0, registrations: 0 } };
  const patentAssets = (Number(patent.domestic?.applications) || 0) + (Number(patent.domestic?.registrations) || 0) + (Number(patent.international?.applications) || 0) + (Number(patent.international?.registrations) || 0);
  document.getElementById("name").textContent = text(profile.name) || "Ha Suwook";
  document.getElementById("name-local").textContent = `${text(profile.name)} | ${text(profile.localName)} | ${organization}`;
  document.getElementById("headline").textContent = text(profile.headline);
  document.getElementById("bio").textContent = text(profile.bio);
  document.getElementById("intro-ko").textContent = text(profile.introKo);
  document.getElementById("intro-en").textContent = text(profile.introEn);
  document.getElementById("location").textContent = text(profile.location);
  document.getElementById("hero-org").textContent = organization;
  document.getElementById("updatedAtHero").textContent = `Last refresh: ${formatDate(content.updatedAt)}`;
  const email = document.getElementById("email");
  email.href = `mailto:${text(profile.email)}`;
  email.textContent = text(profile.email) || "Email";
  const websiteUrl = text(profile.website) || "https://www.etri.re.kr";
  document.getElementById("website").href = websiteUrl;
  document.getElementById("profile-link").href = websiteUrl;
  document.getElementById("profile-action").href = websiteUrl;
  const scholarUrl = text(profile.googleScholarUrl);
  if (scholarUrl) {
    const scholarLink = document.getElementById("scholar-link");
    const scholarAction = document.getElementById("scholar-action");
    scholarLink.href = scholarUrl; scholarAction.href = scholarUrl; scholarLink.hidden = false; scholarAction.hidden = false;
  }
  document.getElementById("hero-citations").textContent = formatNumber(profile.researchMetrics?.citations);
  document.getElementById("hero-publications").textContent = formatNumber(profile.researchMetrics?.publications);
  document.getElementById("hero-tracks").textContent = formatNumber((profile.standardizationActivities || []).length);
  document.getElementById("hero-patents").textContent = formatNumber(patentAssets);
  const chips = document.getElementById("interest-chips");
  clearChildren(chips);
  (profile.interests || []).slice(0, 4).forEach((label, index) => {
    const span = document.createElement("span");
    span.className = "hero-interest-pill";
    span.innerHTML = `<span class="hero-interest-icon">${iconMarkup(["mesh", "shield", "chip", "globe"][index % 4])}</span>${text(label)}`;
    chips.appendChild(span);
  });
  document.querySelectorAll("[data-glyph]").forEach((node) => { node.innerHTML = iconMarkup(node.getAttribute("data-glyph")); });
  const floats = document.getElementById("hero-floats");
  clearChildren(floats);
  [profile.researchAreas?.[0]?.name || "AI Standardization", profile.relatedTechnologies?.[0] || "Generative AI", profile.standardizationActivities?.[0] || "ISO/IEC SC 42", profile.relatedTechnologies?.[1] || "Trustworthy AI"].forEach((label, index) => {
    const div = document.createElement("div");
    div.className = `hero-float hero-float-${String.fromCharCode(97 + index)}`;
    div.textContent = compactLabel(label, 26);
    floats.appendChild(div);
  });
}

function renderCredibility(profile, content) {
  const root = document.getElementById("credibility-strip");
  clearChildren(root);
  const organization = text(profile.location).split(",")[0].trim() || "ETRI";
  const patent = profile.patentStats || { domestic: { applications: 0, registrations: 0 }, international: { applications: 0, registrations: 0 } };
  const patentAssets = (Number(patent.domestic?.applications) || 0) + (Number(patent.domestic?.registrations) || 0) + (Number(patent.international?.applications) || 0) + (Number(patent.international?.registrations) || 0);
  [
    { label: "Institution", value: organization, note: text(profile.headline), href: text(profile.website), linkLabel: "Open Profile", kind: "globe" },
    { label: "Scholar Impact", value: `${formatNumber(profile.researchMetrics?.citations)} citations`, note: `h-index ${formatNumber(profile.researchMetrics?.hIndex)} | i10 ${formatNumber(profile.researchMetrics?.i10Index)}`, href: text(profile.googleScholarUrl), linkLabel: "Scholar", kind: "mesh" },
    { label: "Open Source", value: text(profile.githubUsername), note: `${formatNumber((content.projects || []).length)} ranked repositories`, href: `https://github.com/${text(profile.githubUsername)}`, linkLabel: "GitHub", kind: "chip" },
    { label: "Patent Portfolio", value: formatNumber(patentAssets), note: `KR ${formatNumber((Number(patent.domestic?.applications) || 0) + (Number(patent.domestic?.registrations) || 0))} | Global ${formatNumber((Number(patent.international?.applications) || 0) + (Number(patent.international?.registrations) || 0))}`, href: "", linkLabel: "Verified", kind: "shield" },
  ].forEach((item) => {
    const article = document.createElement("article");
    article.className = "cred-card";
    article.innerHTML = `<span class="cred-icon">${iconMarkup(item.kind)}</span><div class="cred-copy"><p class="cred-label">${item.label}</p><strong class="cred-value">${item.value}</strong><p class="cred-note">${item.note}</p></div>${item.href ? `<a class="cred-link" href="${item.href}" target="_blank" rel="noopener noreferrer">${item.linkLabel}</a>` : `<span class="cred-link passive">${item.linkLabel}</span>`}`;
    root.appendChild(article);
  });
}

function renderResearchAreas(profile) {
  const root = document.getElementById("research-areas");
  clearChildren(root);
  const areas = Array.isArray(profile.researchAreas) ? profile.researchAreas : [];
  if (areas.length === 0) { root.textContent = "No research areas configured."; return; }
  const max = Math.max(...areas.map((item) => Number(item.score) || 0), 1);
  areas.forEach((area) => {
    const row = document.createElement("div");
    row.className = "domain-row";
    row.innerHTML = `<div class="domain-head"><span>${text(area.name)}</span><span>${Number(area.score) || 0}</span></div><div class="domain-track"><span class="domain-fill" style="width:${toPercent(Number(area.score) || 0, max)}%"></span></div>`;
    root.appendChild(row);
  });
}
function renderResearchSignals(profile, content) {
  const root = document.getElementById("research-signals");
  clearChildren(root);
  const signals = [
    { label: "Citations", value: Number(profile.researchMetrics?.citations) || 0 },
    { label: "Publications", value: Number(profile.researchMetrics?.publications) || 0 },
    { label: "Top Projects", value: (content.projects || []).length },
    { label: "Ranked Articles", value: Math.min((content.articles || []).length, 8) },
    { label: "Top Videos", value: Math.min((content.videos || []).length, 8) },
  ];
  const max = Math.max(...signals.map((item) => item.value), 1);
  signals.forEach((item) => {
    const col = document.createElement("div");
    col.className = "signal-column";
    col.innerHTML = `<span class="signal-bar" style="height:${Math.max(10, toSqrtPercent(item.value, max))}%"></span><span class="signal-value">${formatNumber(item.value)}</span><span class="signal-label">${item.label}</span>`;
    root.appendChild(col);
  });
}
function renderTech(profile) {
  const root = document.getElementById("related-tech");
  clearChildren(root);
  (profile.relatedTechnologies || []).forEach((item, index) => {
    const span = document.createElement("span");
    span.className = "tech-pill";
    span.textContent = text(item);
    span.style.fontSize = `${1 + (index % 4) * 0.12}rem`;
    root.appendChild(span);
  });
}
function renderActivities(profile) {
  const root = document.getElementById("standardization-activities");
  clearChildren(root);
  (profile.standardizationActivities || []).forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "standard-item";
    row.innerHTML = `<span class="standard-index">${String(index + 1).padStart(2, "0")}</span><span>${text(item)}</span>`;
    root.appendChild(row);
  });
}

function renderPatentStatus(profile) {
  const summaryRoot = document.getElementById("patent-summary");
  const yearlyRoot = document.getElementById("patent-yearly");
  const recordsRoot = document.getElementById("patent-records");
  clearChildren(summaryRoot); clearChildren(yearlyRoot); clearChildren(recordsRoot);
  const patent = profile.patentStats || { domestic: { applications: 0, registrations: 0 }, international: { applications: 0, registrations: 0 }, yearly: [] };
  const summary = [{ label: "Domestic", applications: Number(patent.domestic?.applications) || 0, registrations: Number(patent.domestic?.registrations) || 0 }, { label: "International", applications: Number(patent.international?.applications) || 0, registrations: Number(patent.international?.registrations) || 0 }];
  const summaryMax = Math.max(...summary.map((item) => Math.max(item.applications, item.registrations)), 1);
  summary.forEach((item) => {
    const card = document.createElement("article");
    card.className = "patent-summary-card";
    card.innerHTML = `<p class="metric-label">${item.label}</p><div class="patent-metric-row"><span>출원</span><strong>${formatNumber(item.applications)}</strong></div><div class="patent-track"><span class="patent-fill applications" style="width:${toPercent(item.applications, summaryMax)}%"></span></div><div class="patent-metric-row"><span>등록</span><strong>${formatNumber(item.registrations)}</strong></div><div class="patent-track"><span class="patent-fill registrations" style="width:${toPercent(item.registrations, summaryMax)}%"></span></div>`;
    summaryRoot.appendChild(card);
  });
  const yearly = Array.isArray(patent.yearly) ? [...patent.yearly].sort((a, b) => text(a.year).localeCompare(text(b.year))) : [];
  const yearlyMax = Math.max(...yearly.map((item) => Math.max(Number(item.applications) || 0, Number(item.registrations) || 0)), 1);
  yearly.forEach((item) => {
    const applications = Number(item.applications) || 0; const registrations = Number(item.registrations) || 0;
    const card = document.createElement("article");
    card.className = "patent-year-card";
    card.innerHTML = `<p class="item-meta">${text(item.year)}</p><div class="patent-year-bars"><span class="patent-bar applications" style="height:${Math.max(10, toSqrtPercent(applications, yearlyMax))}%"></span><span class="patent-bar registrations" style="height:${Math.max(10, toSqrtPercent(registrations, yearlyMax))}%"></span></div><p class="patent-year-values">A ${formatNumber(applications)} / R ${formatNumber(registrations)}</p>`;
    yearlyRoot.appendChild(card);
  });
  const records = Array.isArray(profile.patentRecords) ? [...profile.patentRecords].sort((a, b) => text(b.filedAt).localeCompare(text(a.filedAt))) : [];
  if (records.length === 0) { const empty = document.createElement("p"); empty.className = "empty"; empty.textContent = "No patent records configured yet."; recordsRoot.appendChild(empty); return; }
  records.slice(0, 12).forEach((item) => {
    const card = document.createElement("article");
    card.className = "patent-record-item";
    card.innerHTML = `<p class="item-meta">${text(item.region)} | ${text(item.status)} | ${text(item.patentNumber)}</p><h3>${text(item.title)}</h3><p class="item-meta">Filed: ${formatDate(text(item.filedAt))}</p>`;
    recordsRoot.appendChild(card);
  });
}
function renderGraphFocus(profile, content) {
  const focus = getGraphFocus(profile, content, state.activeGraphNodeId);
  const type = document.getElementById("graph-focus-type");
  const label = document.getElementById("graph-focus-label");
  const topics = document.getElementById("graph-focus-topics");
  const articles = document.getElementById("graph-focus-articles");
  const patents = document.getElementById("graph-focus-patents");
  type.textContent = text(focus.activeNode.type).toUpperCase();
  type.className = `focus-type ${text(focus.activeNode.type)}`;
  label.textContent = text(focus.activeNode.rawLabel);
  clearChildren(topics); clearChildren(articles); clearChildren(patents);
  if (focus.connectedNodes.length === 0) {
    const p = document.createElement("p"); p.className = "media-empty"; p.textContent = "No connected topics."; topics.appendChild(p);
  } else {
    focus.connectedNodes.forEach((node) => {
      const button = document.createElement("button");
      button.type = "button"; button.className = "focus-chip"; button.textContent = node.rawLabel;
      button.addEventListener("click", () => {
        state.activeGraphNodeId = node.id;
        renderRdfGraph(profile, "rdf-graph");
        if (!document.getElementById("graph-modal").hidden) renderRdfGraph(profile, "rdf-graph-modal");
        renderGraphFocus(profile, content);
      });
      topics.appendChild(button);
    });
  }
  focus.articles.forEach((item) => {
    const article = document.createElement("article");
    article.className = "focus-list-item";
    article.innerHTML = `<p class="item-meta">#${item.rank} | ${text(item.source)}</p><h5><a href="${item.url}" target="_blank" rel="noopener noreferrer">${text(item.title)}</a></h5>`;
    articles.appendChild(article);
  });
  focus.patents.forEach((item) => {
    const article = document.createElement("article");
    article.className = "focus-list-item";
    article.innerHTML = `<p class="item-meta">${text(item.region)} | ${text(item.status)}</p><h5>${text(item.title)}</h5><p class="item-meta">${text(item.patentNumber)}</p>`;
    patents.appendChild(article);
  });
}

function renderRdfGraph(profile, targetId) {
  const svg = document.getElementById(targetId);
  clearChildren(svg);
  const data = getGraphData(profile);
  const activeNodeId = state.activeGraphNodeId;
  const nodeById = new Map(data.nodes.map((node) => [node.id, node]));
  [data.areaRadius, data.outerRadius].forEach((radius) => {
    const ring = svgEl("circle");
    ring.setAttribute("cx", String(data.cx)); ring.setAttribute("cy", String(data.cy)); ring.setAttribute("r", String(radius)); ring.setAttribute("class", "rdf-ring");
    svg.appendChild(ring);
  });
  data.edges.forEach((edge, index) => {
    const a = nodeById.get(edge.from), b = nodeById.get(edge.to);
    if (!a || !b) return;
    const line = svgEl("line");
    line.setAttribute("x1", String(a.x)); line.setAttribute("y1", String(a.y)); line.setAttribute("x2", String(b.x)); line.setAttribute("y2", String(b.y));
    line.setAttribute("class", `rdf-edge rdf-edge-${edge.kind}${edge.from === activeNodeId || edge.to === activeNodeId ? " active" : ""}`);
    line.setAttribute("data-index", String(index));
    svg.appendChild(line);
  });
  data.nodes.forEach((node) => {
    const isCenter = node.type === "center";
    const group = svgEl("g");
    group.setAttribute("class", `rdf-node-group${node.id === activeNodeId ? " active" : ""}`);
    group.setAttribute("role", "button"); group.setAttribute("tabindex", "0"); group.setAttribute("aria-label", `Focus ${node.rawLabel}`);
    const circle = svgEl("circle");
    circle.setAttribute("cx", String(node.x)); circle.setAttribute("cy", String(node.y)); circle.setAttribute("r", String(node.size)); circle.setAttribute("class", `rdf-node rdf-node-${node.type}`);
    group.appendChild(circle);
    const label = svgEl("text");
    label.setAttribute("x", String(isCenter ? node.x : node.x + (node.x > data.cx ? 14 : -14)));
    label.setAttribute("y", String(node.y + 4));
    label.setAttribute("text-anchor", isCenter ? "middle" : node.x > data.cx ? "start" : "end");
    label.setAttribute("class", `rdf-label rdf-label-${node.type}`);
    label.textContent = node.label;
    group.appendChild(label);
    const selectNode = () => {
      state.activeGraphNodeId = node.id;
      renderRdfGraph(profile, "rdf-graph");
      if (!document.getElementById("graph-modal").hidden) renderRdfGraph(profile, "rdf-graph-modal");
      renderGraphFocus(profile, state.content);
    };
    group.addEventListener("click", selectNode);
    group.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectNode(); } });
    svg.appendChild(group);
  });
  [{ cls: "area", label: "Research Area" }, { cls: "tech", label: "Technology" }, { cls: "activity", label: "Standardization" }].forEach((item, index) => {
    const dot = svgEl("circle");
    dot.setAttribute("cx", String(20 + index * 165)); dot.setAttribute("cy", String(data.height - 20)); dot.setAttribute("r", "5"); dot.setAttribute("class", `rdf-node rdf-node-${item.cls}`);
    svg.appendChild(dot);
    const label = svgEl("text");
    label.setAttribute("x", String(30 + index * 165)); label.setAttribute("y", String(data.height - 16)); label.setAttribute("class", "rdf-legend-text"); label.textContent = item.label;
    svg.appendChild(label);
  });
}

function setupGraphModal(profile) {
  const modal = document.getElementById("graph-modal");
  const openButton = document.getElementById("expand-graph");
  const closeButton = document.getElementById("close-graph");
  const backdrop = modal.querySelector(".graph-modal-backdrop");
  function close() { modal.hidden = true; document.body.classList.remove("graph-modal-open"); }
  function open() { modal.hidden = false; document.body.classList.add("graph-modal-open"); renderRdfGraph(profile, "rdf-graph-modal"); }
  openButton.addEventListener("click", open); closeButton.addEventListener("click", close); backdrop.addEventListener("click", close);
  window.addEventListener("keydown", (event) => { if (event.key === "Escape" && !modal.hidden) close(); });
}
function renderHighlights(promotion) {
  const root = document.getElementById("highlights");
  clearChildren(root);
  document.getElementById("highlight-updated").textContent = `Updated from curated public sources: ${text(promotion.updatedAt) || "N/A"}`;
  (promotion.highlights || []).forEach((item) => {
    const article = createCard([text(item.date), text(item.sourceName)].filter(Boolean).join(" | "), text(item.title), text(item.summary), text(item.sourceUrl), "Open Source", "highlight-item");
    const impact = document.createElement("p"); impact.className = "impact"; impact.textContent = text(item.impact);
    article.insertBefore(impact, article.querySelector("a"));
    root.appendChild(article);
  });
}
function renderProjects(profile, content) {
  document.getElementById("projects-title").innerHTML = `<span class="lang-switch inline"><span class="lang-ko">GitHub 프로젝트 (${text(profile.githubUsername)})</span><span class="lang-en">GitHub Projects (${text(profile.githubUsername)})</span></span>`;
  const root = document.getElementById("projects");
  clearChildren(root);
  (content.projects || []).forEach((item) => {
    const article = document.createElement("article");
    article.className = "item";
    article.innerHTML = `<p class="item-meta">${text(item.language)} | stars ${formatNumber(item.stars)} | forks ${formatNumber(item.forks)}</p><h3><a href="${item.url}" target="_blank" rel="noopener noreferrer">${text(item.name)}</a></h3><p>${text(item.description)}</p><p class="item-meta">updated ${formatDate(item.updatedAt)}</p>`;
    root.appendChild(article);
  });
}
function renderPhotos(profile, content) {
  const heading = document.querySelector(".photos-section h2");
  heading.innerHTML = `<span class="lang-switch inline"><span class="lang-ko">사진 (Google Photos 키워드: \"${text(profile.googlePhotos?.filterKeyword)}\")</span><span class="lang-en">Photos (Google Photos keyword: \"${text(profile.googlePhotos?.filterKeyword)}\")</span></span>`;
  const root = document.getElementById("photos");
  clearChildren(root);
  (content.photos || []).forEach((item) => {
    const figure = document.createElement("figure");
    figure.className = "photo-item";
    figure.innerHTML = `<img src="${text(item.url)}" alt="${text(item.description)}" loading="lazy"><figcaption>${text(item.description)}</figcaption>`;
    root.appendChild(figure);
  });
}
function renderLinks(profile) {
  const root = document.getElementById("links");
  clearChildren(root);
  (profile.links || []).forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `<a href="${item.url}" target="_blank" rel="noopener noreferrer">${text(item.label)}</a>`;
    root.appendChild(li);
  });
}
function renderRefresh(content) {
  document.getElementById("updatedAt").textContent = `Last refresh: ${formatDate(content.updatedAt)}`;
  document.getElementById("counts").textContent = `Cached now: articles ${(content.articles || []).length}, videos ${(content.videos || []).length}, photos ${(content.photos || []).length}, projects ${(content.projects || []).length}`;
}
function renderMediaTabs(content) {
  const root = document.getElementById("media-tabs");
  clearChildren(root);
  const tabs = [
    { id: "articles", ko: "기사", en: "Articles", count: Math.min((content.articles || []).length, 8) },
    { id: "videos", ko: "동영상", en: "Videos", count: Math.min((content.videos || []).length, 8) },
    { id: "photos", ko: "사진", en: "Photos", count: (content.photos || []).length },
  ];
  const tablist = document.createElement("div");
  tablist.className = "media-tablist";
  tablist.setAttribute("role", "tablist");
  tabs.forEach((tab) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `media-tab${state.activeTab === tab.id ? " active" : ""}`;
    button.setAttribute("role", "tab");
    button.innerHTML = `<span class="lang-switch inline"><span class="lang-ko">${tab.ko}</span><span class="lang-en">${tab.en}</span></span><strong>${tab.count}</strong>`;
    button.addEventListener("click", () => { state.activeTab = tab.id; renderMediaTabs(content); });
    tablist.appendChild(button);
  });
  const stage = document.createElement("div");
  stage.className = "media-stage";
  if (state.activeTab === "articles") {
    const layout = document.createElement("div");
    layout.className = "media-layout";
    const articles = content.articles || [];
    if (articles[0]) {
      const feature = document.createElement("article");
      feature.className = "media-feature";
      feature.innerHTML = `<p class="media-kicker"><span class="lang-switch inline"><span class="lang-ko">대표 기사</span><span class="lang-en">Lead Story</span></span></p><h3><a href="${articles[0].url}" target="_blank" rel="noopener noreferrer">${text(articles[0].title)}</a></h3><p>${text(articles[0].summary)}</p><p class="item-meta">#${articles[0].rank} | ${text(articles[0].source)} | ${formatShortDate(articles[0].publishedAt)}</p>`;
      layout.appendChild(feature);
    }
    const list = document.createElement("div");
    list.className = "media-list";
    articles.slice(1, 6).forEach((article) => {
      const item = document.createElement("article");
      item.className = "media-list-item";
      item.innerHTML = `<p class="item-meta">#${article.rank} | ${text(article.source)} | ${formatShortDate(article.publishedAt)}</p><h4><a href="${article.url}" target="_blank" rel="noopener noreferrer">${text(article.title)}</a></h4><p>${text(article.summary)}</p>`;
      list.appendChild(item);
    });
    if (!articles[0]) { const empty = document.createElement("p"); empty.className = "media-empty"; empty.textContent = "No ranked articles collected yet."; layout.appendChild(empty); }
    layout.appendChild(list); stage.appendChild(layout);
  }
  if (state.activeTab === "videos") {
    const layout = document.createElement("div");
    layout.className = "media-layout";
    const videos = content.videos || [];
    if (videos[0]) {
      const feature = document.createElement("article");
      feature.className = "media-feature video-feature";
      feature.innerHTML = `${videos[0].thumbnail ? `<img class="media-feature-thumb" src="${videos[0].thumbnail}" alt="${text(videos[0].title)}" loading="lazy">` : ""}<div class="media-feature-body"><p class="media-kicker"><span class="lang-switch inline"><span class="lang-ko">대표 동영상</span><span class="lang-en">Featured Video</span></span></p><h3><a href="${videos[0].url}" target="_blank" rel="noopener noreferrer">${text(videos[0].title)}</a></h3><p class="item-meta">${text(videos[0].channel)} | views ${formatNumber(videos[0].viewCount)} | ${formatShortDate(videos[0].publishedAt)}</p></div>`;
      layout.appendChild(feature);
    }
    const list = document.createElement("div");
    list.className = "media-list";
    videos.slice(1, 6).forEach((video, index) => {
      const item = document.createElement("article");
      item.className = "media-list-item compact";
      item.innerHTML = `<p class="item-meta">#${index + 2} | ${text(video.channel)} | views ${formatNumber(video.viewCount)}</p><h4><a href="${video.url}" target="_blank" rel="noopener noreferrer">${text(video.title)}</a></h4><p>${formatShortDate(video.publishedAt)}</p>`;
      list.appendChild(item);
    });
    if (!videos[0]) { const empty = document.createElement("p"); empty.className = "media-empty"; empty.textContent = "No ranked videos collected yet."; layout.appendChild(empty); }
    layout.appendChild(list); stage.appendChild(layout);
  }
  if (state.activeTab === "photos") {
    const grid = document.createElement("div");
    grid.className = "media-photo-grid";
    const photos = content.photos || [];
    if (photos.length === 0) { const empty = document.createElement("p"); empty.className = "media-empty"; empty.textContent = "No matching photos found. Enable Google Photos and set album/keyword in admin."; grid.appendChild(empty); }
    else {
      photos.slice(0, 6).forEach((photo) => {
        const figure = document.createElement("figure");
        figure.className = "media-photo-item";
        figure.innerHTML = `<img class="media-photo" src="${text(photo.url)}" alt="${text(photo.description)}" loading="lazy"><figcaption>${text(photo.description)}</figcaption>`;
        grid.appendChild(figure);
      });
    }
    stage.appendChild(grid);
  }
  root.appendChild(tablist); root.appendChild(stage);
}

async function load() {
  initLanguage();
  const cacheBust = `ts=${Date.now()}`;
  const [profileRes, contentRes, promotionRes] = await Promise.all([
    fetch(`./data/profile.json?${cacheBust}`, { cache: "no-store" }),
    fetch(`./data/content.json?${cacheBust}`, { cache: "no-store" }),
    fetch(`./data/promotion-highlights.json?${cacheBust}`, { cache: "no-store" }),
  ]);
  state.profile = await profileRes.json();
  state.content = await contentRes.json();
  state.promotion = await promotionRes.json();
  renderHero(state.profile, state.content);
  renderCredibility(state.profile, state.content);
  document.getElementById("research-summary").textContent = text(state.profile.researchSummary) || text(state.profile.bio);
  document.getElementById("metric-citations").textContent = formatNumber(state.profile.researchMetrics?.citations);
  document.getElementById("metric-hindex").textContent = formatNumber(state.profile.researchMetrics?.hIndex);
  document.getElementById("metric-i10index").textContent = formatNumber(state.profile.researchMetrics?.i10Index);
  document.getElementById("metric-publications").textContent = formatNumber(state.profile.researchMetrics?.publications);
  document.getElementById("metric-tracks").textContent = formatNumber((state.profile.standardizationActivities || []).length);
  renderResearchAreas(state.profile); renderResearchSignals(state.profile, state.content); renderTech(state.profile); renderActivities(state.profile); renderPatentStatus(state.profile); renderRdfGraph(state.profile, "rdf-graph"); renderGraphFocus(state.profile, state.content); setupGraphModal(state.profile); renderHighlights(state.promotion); renderMediaTabs(state.content); renderProjects(state.profile, state.content); renderPhotos(state.profile, state.content); renderLinks(state.profile); renderRefresh(state.content);
}

load().catch((error) => {
  const target = document.getElementById("updatedAt") || document.body;
  target.textContent = `Failed to load page data: ${error && error.message ? error.message : "Unknown error"}`;
});


