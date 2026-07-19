import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import axios from 'axios';
import './index.css';

const API = 'http://127.0.0.1:8000';

// ─── Utility ──────────────────────────────────────────────────────────────────

function timestamp() {
  return new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function uid() { return Math.random().toString(36).slice(2, 9); }

// ─── Model constants ──────────────────────────────────────────────────────────

const PROVIDERS = ['openrouter', 'ollama'];

const OPENROUTER_LLM = [
  'meta-llama/llama-3.3-70b-instruct',
  'anthropic/claude-3.5-sonnet',
  'google/gemini-flash-1.5-8b',
  'openai/gpt-4o-mini',
];
const OPENROUTER_EMBED = [
  'nvidia/llama-nemotron-embed-vl-1b-v2:free',
  'openai/text-embedding-3-small',
  'openai/text-embedding-3-large',
  'cohere/embed-v4',
];

// ─── Rich-text renderer ───────────────────────────────────────────────────────

function MarkdownText({ text }) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let listItems = [];

  const flushList = () => {
    if (listItems.length) {
      elements.push(<ul key={`ul-${elements.length}`} className="md-list">{listItems.map((li, i) => <li key={i}>{renderInline(li)}</li>)}</ul>);
      listItems = [];
    }
  };

  const renderInline = (str) => {
    const parts = str.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((p, i) => {
      if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>;
      if (p.startsWith('`') && p.endsWith('`')) return <code key={i} className="md-code">{p.slice(1, -1)}</code>;
      return p;
    });
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) { flushList(); if (i > 0) elements.push(<br key={`br-${i}`} />); return; }

    const bulletMatch = trimmed.match(/^[-*•]\s+(.+)/);
    const numMatch = trimmed.match(/^\d+\.\s+(.+)/);
    const h3Match = trimmed.match(/^###\s+(.+)/);
    const h2Match = trimmed.match(/^##\s+(.+)/);

    if (h3Match) { flushList(); elements.push(<div key={i} className="md-h3">{renderInline(h3Match[1])}</div>); }
    else if (h2Match) { flushList(); elements.push(<div key={i} className="md-h2">{renderInline(h2Match[1])}</div>); }
    else if (bulletMatch) { listItems.push(bulletMatch[1]); }
    else if (numMatch) { listItems.push(numMatch[1]); }
    else { flushList(); elements.push(<p key={i} className="md-p">{renderInline(trimmed)}</p>); }
  });
  flushList();
  return <div className="md-body">{elements}</div>;
}

// ─── Logo SVG ─────────────────────────────────────────────────────────────────

function LogoIcon() {
  return (
    <svg width="84" height="84" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, margin: '0 auto 8px' }}>
      {/* Background glow of the cyan side */}
      <circle cx="68" cy="50" r="22" fill="url(#sparkGlow)" opacity="0.15" filter="blur(8px)"/>

      {/* ─── LEFT SIDE: Purple/Indigo Wireframe (Plain lines, no nodes) ─── */}
      <g stroke="url(#purpleMeshGrad)" strokeWidth="1" strokeLinecap="round" opacity="0.75">
        {/* Left Outline */}
        <line x1="14" y1="50" x2="18" y2="38" />
        <line x1="18" y1="38" x2="28" y2="28" />
        <line x1="28" y1="28" x2="40" y2="25" />
        <line x1="40" y1="25" x2="50" y2="24" />

        <line x1="14" y1="50" x2="18" y2="60" />
        <line x1="18" y1="60" x2="24" y2="64" />
        <line x1="24" y1="64" x2="30" y2="64" />
        <line x1="30" y1="64" x2="34" y2="70" />
        <line x1="34" y1="70" x2="42" y2="70" />
        <line x1="42" y1="70" x2="50" y2="72" />

        {/* Left Inner Mesh */}
        <line x1="18" y1="38" x2="24" y2="48" />
        <line x1="28" y1="28" x2="24" y2="48" />
        <line x1="28" y1="28" x2="34" y2="38" />
        <line x1="40" y1="25" x2="34" y2="38" />
        <line x1="40" y1="25" x2="44" y2="36" />
        <line x1="50" y1="24" x2="44" y2="36" />

        <line x1="24" y1="48" x2="34" y2="38" />
        <line x1="34" y1="38" x2="44" y2="36" />
        <line x1="44" y1="36" x2="44" y2="48" />
        <line x1="24" y1="48" x2="34" y2="50" />
        <line x1="34" y1="38" x2="34" y2="50" />
        <line x1="34" y1="50" x2="44" y2="48" />

        <line x1="18" y1="60" x2="24" y2="48" />
        <line x1="24" y1="64" x2="30" y2="60" />
        <line x1="30" y1="64" x2="30" y2="60" />
        <line x1="34" y1="70" x2="30" y2="60" />
        <line x1="42" y1="70" x2="40" y2="60" />
        <line x1="50" y1="72" x2="40" y2="60" />

        <line x1="34" y1="50" x2="30" y2="60" />
        <line x1="44" y1="48" x2="40" y2="60" />
        <line x1="30" y1="60" x2="40" y2="60" />
      </g>

      {/* ─── SEAM BRIDGING CONNECTIONS (Purple to Cyan boundary) ─── */}
      <g strokeWidth="1.2">
        <line x1="50" y1="24" x2="54" y2="34" stroke="url(#purpleToCyanGrad)" />
        <line x1="44" y1="36" x2="54" y2="34" stroke="url(#purpleToCyanGrad)" />
        <line x1="44" y1="48" x2="56" y2="56" stroke="url(#purpleToCyanGrad)" />
        <line x1="40" y1="60" x2="56" y2="56" stroke="url(#purpleToCyanGrad)" strokeDasharray="2 2" opacity="0.7" />
        <line x1="40" y1="60" x2="60" y2="66" stroke="url(#purpleToCyanGrad)" />
        <line x1="50" y1="72" x2="60" y2="66" stroke="url(#purpleToCyanGrad)" />
      </g>

      {/* ─── RIGHT SIDE: Glowing Cyan Graph (Lines + Glowing circular nodes) ─── */}
      {/* Cyan Graph Links */}
      <g stroke="#22d3ee" strokeWidth="1.3" opacity="0.9" filter="url(#glow)">
        {/* Right Outline */}
        <line x1="50" y1="24" x2="62" y2="25" />
        <line x1="62" y1="25" x2="74" y2="30" />
        <line x1="74" y1="30" x2="84" y2="40" />
        <line x1="84" y1="40" x2="88" y2="52" />
        <line x1="88" y1="52" x2="86" y2="62" />
        <line x1="86" y1="62" x2="80" y2="70" />
        <line x1="80" y1="70" x2="70" y2="74" />
        <line x1="70" y1="74" x2="58" y2="86" />
        <line x1="58" y1="86" x2="50" y2="72" />

        {/* Right Inner Mesh */}
        <line x1="62" y1="25" x2="64" y2="34" />
        <line x1="74" y1="30" x2="64" y2="34" />
        <line x1="74" y1="30" x2="74" y2="38" />
        <line x1="84" y1="40" x2="74" y2="38" />
        <line x1="84" y1="40" x2="78" y2="48" />
        <line x1="88" y1="52" x2="78" y2="48" />
        <line x1="88" y1="52" x2="76" y2="58" />
        <line x1="86" y1="62" x2="76" y2="58" />
        <line x1="80" y1="70" x2="76" y2="58" />
        <line x1="80" y1="70" x2="70" y2="66" />

        <line x1="54" y1="34" x2="64" y2="34" />
        <line x1="64" y1="34" x2="74" y2="38" />
        <line x1="74" y1="38" x2="78" y2="48" />
        <line x1="78" y1="48" x2="76" y2="58" />
        <line x1="76" y1="58" x2="70" y2="66" />
        <line x1="70" y1="66" x2="70" y2="74" />

        <line x1="54" y1="34" x2="60" y2="46" />
        <line x1="64" y1="34" x2="60" y2="46" />
        <line x1="64" y1="34" x2="70" y2="48" />
        <line x1="74" y1="38" x2="70" y2="48" />
        <line x1="78" y1="48" x2="70" y2="48" />
        <line x1="78" y1="48" x2="66" y2="58" />
        <line x1="76" y1="58" x2="66" y2="58" />

        <line x1="60" y1="46" x2="56" y2="56" />
        <line x1="70" y1="48" x2="66" y2="58" />
        <line x1="56" y1="56" x2="66" y2="58" />
        <line x1="56" y1="56" x2="60" y2="66" />
        <line x1="66" y1="58" x2="60" y2="66" />
        <line x1="66" y1="58" x2="70" y2="66" />

        <line x1="60" y1="66" x2="58" y2="86" />
        <line x1="70" y1="66" x2="58" y2="86" />
      </g>

      {/* Cyan Graph Nodes (Spheres with white-cyan core) */}
      <g fill="#e0f2fe" stroke="#22d3ee" strokeWidth="1.2" filter="url(#glow)">
        {/* Outlines */}
        <circle cx="50" cy="24" r="2.2" />
        <circle cx="62" cy="25" r="2.2" />
        <circle cx="74" cy="30" r="2.2" />
        <circle cx="84" cy="40" r="2.2" />
        <circle cx="88" cy="52" r="2.2" />
        <circle cx="86" cy="62" r="2.2" />
        <circle cx="80" cy="70" r="2.2" />
        <circle cx="70" cy="74" r="2.2" />
        <circle cx="58" cy="86" r="2.2" fill="#22d3ee" /> {/* stem bottom */}
        <circle cx="50" cy="72" r="2.2" />

        {/* Inner nodes */}
        <circle cx="54" cy="34" r="2.2" />
        <circle cx="64" cy="34" r="2.2" />
        <circle cx="74" cy="38" r="2.2" />
        <circle cx="78" cy="48" r="2.5" />
        <circle cx="70" cy="48" r="2.2" />
        <circle cx="60" cy="46" r="2.2" />
        <circle cx="56" cy="56" r="2.2" />
        <circle cx="66" cy="58" r="2.5" />
        <circle cx="76" cy="58" r="2.2" />
        <circle cx="70" cy="66" r="2.2" />
        <circle cx="60" cy="66" r="2.2" />
      </g>

      <defs>
        {/* Glow filter for right-side elements */}
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <radialGradient id="sparkGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8"/>
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0"/>
        </radialGradient>
        <linearGradient id="purpleMeshGrad" x1="14" y1="24" x2="50" y2="72">
          <stop offset="0%" stopColor="#818cf8"/>
          <stop offset="100%" stopColor="#a78bfa"/>
        </linearGradient>
        <linearGradient id="purpleToCyanGrad" x1="40" y1="36" x2="60" y2="66">
          <stop offset="0%" stopColor="#a78bfa"/>
          <stop offset="100%" stopColor="#22d3ee"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

// ─── Graph shared helpers ─────────────────────────────────────────────────────

const GRAPH_LAYOUTS = [
  { id: 'disjoint', label: 'Disjoint', icon: '⬡' },
  { id: 'force',    label: 'Force',    icon: '⊕' },
  { id: 'radial',   label: 'Radial',   icon: '◎' },
];

const COLOR_MAP = {
  'Person': '#7c3aed', 'Organization': '#0891b2', 'Concept': '#059669',
  'Technology': '#d97706', 'Process': '#db2777',
};
const getColor = (d) => COLOR_MAP[d.group] || '#4f46e5';

function addArrow(svg) {
  svg.select('defs').remove();
  svg.append('defs').append('marker')
    .attr('id', 'arrowhead').attr('viewBox', '0 -5 10 10')
    .attr('refX', 28).attr('refY', 0).attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto')
    .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', 'rgba(99,110,140,0.5)');
}

function attachLinkInteractions(sel, setTooltip) {
  sel
    .on('mouseover', function (event, d) {
      d3.select(this).attr('stroke', '#a78bfa').attr('stroke-width', 2.5);
      setTooltip({ x: event.clientX + 14, y: event.clientY - 10, type: 'relationship', name: d.value || d.predicate || 'RELATION', body: d.reasoning || 'No reasoning.' });
    })
    .on('mousemove', function (event) { setTooltip(t => t ? { ...t, x: event.clientX + 14, y: event.clientY - 10 } : null); })
    .on('mouseout', function () { d3.select(this).attr('stroke', 'rgba(99,110,140,0.35)').attr('stroke-width', 1.5); setTooltip(null); });
}

function attachNodeInteractions(sel, setTooltip, onNodeClick) {
  sel
    .on('mouseover', function (event, d) {
      d3.select(this).select('circle.main').attr('r', 22).attr('stroke-width', 2.5);
      const nd = d.data || d;
      setTooltip({ x: event.clientX + 14, y: event.clientY - 10, type: 'entity', group: nd.group || 'Entity', name: nd.name || nd.id, body: nd.summary || '' });
    })
    .on('mousemove', function (event) { setTooltip(t => t ? { ...t, x: event.clientX + 14, y: event.clientY - 10 } : null); })
    .on('mouseout', function () { d3.select(this).select('circle.main').attr('r', 18).attr('stroke-width', 1.5); setTooltip(null); })
    .on('click', (event, d) => { event.stopPropagation(); onNodeClick && onNodeClick(d.data || d); });
}

function drawNodeCircles(sel) {
  sel.append('circle').attr('r', 26).attr('fill', d => getColor(d.data || d) + '18').style('pointer-events', 'none');
  sel.append('circle').classed('main', true).attr('r', 18).attr('fill', d => getColor(d.data || d) + '22').attr('stroke', d => getColor(d.data || d)).attr('stroke-width', 1.5);
  sel.append('text')
    .text(d => { const l = (d.data?.name || d.name || d.data?.id || d.id || ''); return l.length > 12 ? l.slice(0, 12) + '…' : l; })
    .attr('text-anchor', 'middle').attr('dy', '0.35em').attr('font-size', '9px')
    .attr('font-family', "'Inter', sans-serif").attr('font-weight', '600')
    .attr('fill', d => getColor(d.data || d)).style('pointer-events', 'none');
}

function autoFit(svg, g, zoomBehavior) {
  const box = g.node()?.getBBox?.();
  const el = svg.node();
  if (!box || !el || box.width === 0) return;
  const W = el.clientWidth || 800, H = el.clientHeight || 600;
  const scale = Math.min(0.9 * W / box.width, 0.9 * H / box.height, 2.5);
  const tx = W / 2 - scale * (box.x + box.width / 2);
  const ty = H / 2 - scale * (box.y + box.height / 2);
  svg.transition().duration(600).call(zoomBehavior.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
}

// ─── Layout: Disjoint ─────────────────────────────────────────────────────────

function renderDisjoint(svg, g, graphData, W, H, setTooltip, onNodeClick, zoomBehavior) {
  const nodes = graphData.nodes.map(d => ({ ...d }));
  const nodeIds = new Set(nodes.map(n => n.id));
  const links = graphData.links
    .map(d => ({ ...d }))
    .filter(l => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      return nodeIds.has(s) && nodeIds.has(t);
    });

  const componentOf = new Map(); let compIdx = 0; const visited = new Set();
  function bfs(startId) {
    const queue = [startId]; const comp = new Set();
    while (queue.length) {
      const id = queue.shift(); if (visited.has(id)) continue;
      visited.add(id); comp.add(id);
      links.forEach(l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        if (s === id && !visited.has(t)) queue.push(t);
        if (t === id && !visited.has(s)) queue.push(s);
      });
    }
    return comp;
  }
  nodes.forEach(n => { if (!visited.has(n.id)) { const c = bfs(n.id); c.forEach(id => componentOf.set(id, compIdx)); compIdx++; } });
  const cols = Math.ceil(Math.sqrt(compIdx || 1));
  const cellW = W / cols, cellH = H / (Math.ceil(compIdx / cols) || 1);
  const sim = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(100))
    .force('charge', d3.forceManyBody().strength(-280))
    .force('collision', d3.forceCollide(36))
    .force('x', d3.forceX(d => ((componentOf.get(d.id) || 0) % cols + 0.5) * cellW).strength(0.15))
    .force('y', d3.forceY(d => (Math.floor((componentOf.get(d.id) || 0) / cols) + 0.5) * cellH).strength(0.15));
  const link = g.append('g').selectAll('line').data(links).join('line')
    .attr('stroke', 'rgba(99,110,140,0.35)').attr('stroke-width', 1.5).attr('marker-end', 'url(#arrowhead)').style('cursor', 'pointer');
  attachLinkInteractions(link, setTooltip);
  const linkLabel = g.append('g').selectAll('text').data(links).join('text')
    .text(d => d.value ? (d.value.length > 14 ? d.value.slice(0, 14) + '…' : d.value) : '')
    .attr('font-size', '9px').attr('fill', 'rgba(139,148,158,0.65)').attr('text-anchor', 'middle').style('pointer-events', 'none').attr('font-family', "'JetBrains Mono', monospace");
  const nodeGroup = g.append('g').selectAll('g').data(nodes).join('g').style('cursor', 'pointer')
    .call(d3.drag()
      .on('start', (ev, d) => { if (!ev.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on('drag', (ev, d) => { d.fx = ev.x; d.fy = ev.y; })
      .on('end', (ev, d) => { if (!ev.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }));
  attachNodeInteractions(nodeGroup, setTooltip, onNodeClick); drawNodeCircles(nodeGroup);

  nodeGroup.on('click', (event, d) => {
    event.stopPropagation();
    onNodeClick && onNodeClick(d.data || d);
    
    const clickedId = d.id;
    const neighbors = new Set([clickedId]);
    links.forEach(l => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      if (s === clickedId) neighbors.add(t);
      if (t === clickedId) neighbors.add(s);
    });

    nodeGroup.transition().duration(200)
      .style('opacity', n => neighbors.has(n.id) ? 1.0 : 0.15)
      .style('filter', n => n.id === clickedId ? 'drop-shadow(0 0 8px var(--accent-light))' : 'none');
      
    link.transition().duration(200)
      .style('opacity', l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        return (s === clickedId || t === clickedId) ? 1.0 : 0.05;
      })
      .attr('stroke', l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        return (s === clickedId || t === clickedId) ? 'var(--cyan)' : 'rgba(99,110,140,0.35)';
      })
      .attr('stroke-width', l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        return (s === clickedId || t === clickedId) ? 2.5 : 1.5;
      });

    linkLabel.transition().duration(200)
      .style('opacity', l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        return (s === clickedId || t === clickedId) ? 1.0 : 0.05;
      });
  });

  svg.on('click', () => {
    nodeGroup.transition().duration(200).style('opacity', 1.0).style('filter', 'none');
    link.transition().duration(200).style('opacity', 1.0).attr('stroke', 'rgba(99,110,140,0.35)').attr('stroke-width', 1.5);
    linkLabel.transition().duration(200).style('opacity', 1.0);
  });

  sim.on('tick', () => {
    link.attr('x1', d => d.source.x).attr('y1', d => d.source.y).attr('x2', d => d.target.x).attr('y2', d => d.target.y);
    linkLabel.attr('x', d => (d.source.x + d.target.x) / 2).attr('y', d => (d.source.y + d.target.y) / 2 - 5);
    nodeGroup.attr('transform', d => `translate(${d.x},${d.y})`);
  });
  sim.on('end', () => autoFit(svg, g, zoomBehavior));
  setTimeout(() => autoFit(svg, g, zoomBehavior), 1400);
  return sim;
}

// ─── Layout: Force ────────────────────────────────────────────────────────────

function renderForce(svg, g, graphData, W, H, setTooltip, onNodeClick, zoomBehavior) {
  const nodes = graphData.nodes.map(d => ({ ...d }));
  const nodeIds = new Set(nodes.map(n => n.id));
  const links = graphData.links
    .map(d => ({ ...d }))
    .filter(l => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      return nodeIds.has(s) && nodeIds.has(t);
    });

  const sim = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(130))
    .force('charge', d3.forceManyBody().strength(-350))
    .force('center', d3.forceCenter(W / 2, H / 2))
    .force('collision', d3.forceCollide(40));
  const link = g.append('g').selectAll('line').data(links).join('line')
    .attr('stroke', 'rgba(99,110,140,0.35)').attr('stroke-width', 1.5).attr('marker-end', 'url(#arrowhead)').style('cursor', 'pointer');
  attachLinkInteractions(link, setTooltip);
  const linkLabel = g.append('g').selectAll('text').data(links).join('text')
    .text(d => d.value ? (d.value.length > 14 ? d.value.slice(0, 14) + '…' : d.value) : '')
    .attr('font-size', '9px').attr('fill', 'rgba(139,148,158,0.65)').attr('text-anchor', 'middle').style('pointer-events', 'none').attr('font-family', "'JetBrains Mono', monospace");
  const nodeGroup = g.append('g').selectAll('g').data(nodes).join('g').style('cursor', 'pointer')
    .call(d3.drag()
      .on('start', (ev, d) => { if (!ev.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on('drag', (ev, d) => { d.fx = ev.x; d.fy = ev.y; })
      .on('end', (ev, d) => { if (!ev.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }));
  attachNodeInteractions(nodeGroup, setTooltip, onNodeClick); drawNodeCircles(nodeGroup);

  nodeGroup.on('click', (event, d) => {
    event.stopPropagation();
    onNodeClick && onNodeClick(d.data || d);
    
    const clickedId = d.id;
    const neighbors = new Set([clickedId]);
    links.forEach(l => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      if (s === clickedId) neighbors.add(t);
      if (t === clickedId) neighbors.add(s);
    });

    nodeGroup.transition().duration(200)
      .style('opacity', n => neighbors.has(n.id) ? 1.0 : 0.15)
      .style('filter', n => n.id === clickedId ? 'drop-shadow(0 0 8px var(--accent-light))' : 'none');
      
    link.transition().duration(200)
      .style('opacity', l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        return (s === clickedId || t === clickedId) ? 1.0 : 0.05;
      })
      .attr('stroke', l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        return (s === clickedId || t === clickedId) ? 'var(--cyan)' : 'rgba(99,110,140,0.35)';
      })
      .attr('stroke-width', l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        return (s === clickedId || t === clickedId) ? 2.5 : 1.5;
      });

    linkLabel.transition().duration(200)
      .style('opacity', l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        return (s === clickedId || t === clickedId) ? 1.0 : 0.05;
      });
  });

  svg.on('click', () => {
    nodeGroup.transition().duration(200).style('opacity', 1.0).style('filter', 'none');
    link.transition().duration(200).style('opacity', 1.0).attr('stroke', 'rgba(99,110,140,0.35)').attr('stroke-width', 1.5);
    linkLabel.transition().duration(200).style('opacity', 1.0);
  });

  sim.on('tick', () => {
    link.attr('x1', d => d.source.x).attr('y1', d => d.source.y).attr('x2', d => d.target.x).attr('y2', d => d.target.y);
    linkLabel.attr('x', d => (d.source.x + d.target.x) / 2).attr('y', d => (d.source.y + d.target.y) / 2 - 5);
    nodeGroup.attr('transform', d => `translate(${d.x},${d.y})`);
  });
  sim.on('end', () => autoFit(svg, g, zoomBehavior));
  setTimeout(() => autoFit(svg, g, zoomBehavior), 1400);
  return sim;
}

// ─── Layout: Radial ───────────────────────────────────────────────────────────

function renderRadial(svg, g, graphData, W, H, setTooltip, onNodeClick, zoomBehavior) {
  const nodeIds = new Set(graphData.nodes.map(n => n.id));
  const validLinks = graphData.links.filter(l => {
    const s = typeof l.source === 'object' ? l.source.id : l.source;
    const t = typeof l.target === 'object' ? l.target.id : l.target;
    return nodeIds.has(s) && nodeIds.has(t);
  });

  // To prevent circular recursion crashes in d3.hierarchy, we build a cycle-free Spanning Forest
  const visited = new Set();
  const treeNodes = new Map(graphData.nodes.map(n => [n.id, { ...n, children: [] }]));

  const adj = new Map(graphData.nodes.map(n => [n.id, []]));
  validLinks.forEach(l => {
    const sid = typeof l.source === 'object' ? l.source.id : l.source;
    const tid = typeof l.target === 'object' ? l.target.id : l.target;
    if (adj.has(sid) && adj.has(tid)) {
      adj.get(sid).push(tid);
    }
  });

  const roots = [];
  function buildSpanningTree(nodeId) {
    visited.add(nodeId);
    const node = treeNodes.get(nodeId);
    const childrenIds = adj.get(nodeId) || [];
    childrenIds.forEach(cid => {
      if (!visited.has(cid)) {
        node.children.push(buildSpanningTree(cid));
      }
    });
    return node;
  }

  // Pre-sort nodes by in-degree (0-in-degree nodes make ideal root choices)
  const inDegree = new Map(graphData.nodes.map(n => [n.id, 0]));
  validLinks.forEach(l => {
    const tid = typeof l.target === 'object' ? l.target.id : l.target;
    if (inDegree.has(tid)) inDegree.set(tid, inDegree.get(tid) + 1);
  });

  const sortedNodes = [...graphData.nodes].sort((a, b) => {
    return (inDegree.get(a.id) || 0) - (inDegree.get(b.id) || 0);
  });

  sortedNodes.forEach(n => {
    if (!visited.has(n.id)) {
      roots.push(buildSpanningTree(n.id));
    }
  });

  const fakeRoot = { id: '__root__', name: '', children: roots };
  const cx = W / 2, cy = H / 2, radius = Math.min(W, H) / 2 - 80;
  const tree = d3.tree().size([2 * Math.PI, radius]).separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth);
  const root = d3.hierarchy(fakeRoot); tree(root);
  const linkGen = d3.linkRadial().angle(d => d.x).radius(d => d.y);
  const allLinks = root.links().filter(l => l.source.data.id !== '__root__');
  const treeNodeById = new Map(root.descendants().map(d => [d.data.id, d]));
  const linkGroup = g.append('g').attr('transform', `translate(${cx},${cy})`);
  linkGroup.selectAll('path.tree-link').data(allLinks).join('path').classed('tree-link', true)
    .attr('fill', 'none').attr('stroke', 'rgba(99,110,140,0.3)').attr('stroke-width', 1.2).attr('d', linkGen).style('pointer-events', 'none');
  const crossEdges = validLinks.filter(l => {
    const s = typeof l.source === 'object' ? l.source.id : l.source;
    const t = typeof l.target === 'object' ? l.target.id : l.target;
    return treeNodeById.has(s) && treeNodeById.has(t);
  });
  const crossSel = linkGroup.selectAll('line.cross').data(crossEdges).join('line').classed('cross', true)
    .attr('stroke', 'rgba(167,139,250,0.25)').attr('stroke-width', 1).attr('stroke-dasharray', '4 3').attr('marker-end', 'url(#arrowhead)').style('pointer-events', 'none')
    .attr('x1', d => { const n = treeNodeById.get(typeof d.source === 'object' ? d.source.id : d.source); return n ? n.y * Math.cos(n.x - Math.PI / 2) : 0; })
    .attr('y1', d => { const n = treeNodeById.get(typeof d.source === 'object' ? d.source.id : d.source); return n ? n.y * Math.sin(n.x - Math.PI / 2) : 0; })
    .attr('x2', d => { const n = treeNodeById.get(typeof d.target === 'object' ? d.target.id : d.target); return n ? n.y * Math.cos(n.x - Math.PI / 2) : 0; })
    .attr('y2', d => { const n = treeNodeById.get(typeof d.target === 'object' ? d.target.id : d.target); return n ? n.y * Math.sin(n.x - Math.PI / 2) : 0; });
  attachLinkInteractions(crossSel, setTooltip);
  const descendants = root.descendants().filter(d => d.data.id !== '__root__');
  const nodeGroup = linkGroup.selectAll('g.rnode').data(descendants).join('g').classed('rnode', true)
    .attr('transform', d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`).style('cursor', 'pointer');
  attachNodeInteractions(nodeGroup, setTooltip, onNodeClick); drawNodeCircles(nodeGroup);

  nodeGroup.on('click', (event, d) => {
    event.stopPropagation();
    onNodeClick && onNodeClick(d.data);
    
    const clickedId = d.data.id;
    const neighbors = new Set([clickedId]);
    validLinks.forEach(l => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      if (s === clickedId) neighbors.add(t);
      if (t === clickedId) neighbors.add(s);
    });

    nodeGroup.transition().duration(200)
      .style('opacity', n => neighbors.has(n.data.id) ? 1.0 : 0.15);

    linkGroup.selectAll('path.tree-link').transition().duration(200)
      .style('opacity', l => {
        const s = l.source.data.id;
        const t = l.target.data.id;
        return (s === clickedId || t === clickedId) ? 1.0 : 0.08;
      });

    crossSel.transition().duration(200)
      .style('opacity', l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        return (s === clickedId || t === clickedId) ? 1.0 : 0.08;
      })
      .attr('stroke', l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        return (s === clickedId || t === clickedId) ? 'var(--cyan)' : 'rgba(167,139,250,0.25)';
      });
  });

  svg.on('click', () => {
    nodeGroup.transition().duration(200).style('opacity', 1.0);
    linkGroup.selectAll('path.tree-link').transition().duration(200).style('opacity', 1.0);
    crossSel.transition().duration(200).style('opacity', 1.0).attr('stroke', 'rgba(167,139,250,0.25)');
  });

  nodeGroup.select('text').attr('transform', d => `rotate(${-(d.x * 180 / Math.PI - 90)})`);
  setTimeout(() => autoFit(svg, g, zoomBehavior), 100);
  return null;
}

// ─── KnowledgeGraph Component ─────────────────────────────────────────────────

function KnowledgeGraph({ graphData, onNodeClick }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [layout, setLayout] = useState('disjoint');
  const zoomRef = useRef(null);
  const simRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    const W = containerRef.current.clientWidth || 800;
    const H = containerRef.current.clientHeight || 600;
    if (simRef.current) { simRef.current.stop(); simRef.current = null; }
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); addArrow(svg);
    const g = svg.append('g');
    const zb = d3.zoom().scaleExtent([0.05, 8])
      .on('zoom', ev => { g.attr('transform', ev.transform); setZoom(Math.round(ev.transform.k * 100)); });
    zoomRef.current = zb; svg.call(zb);
    if (!graphData || graphData.nodes.length === 0) return;
    let sim = null;
    if (layout === 'disjoint') sim = renderDisjoint(svg, g, graphData, W, H, setTooltip, onNodeClick, zb);
    else if (layout === 'force') sim = renderForce(svg, g, graphData, W, H, setTooltip, onNodeClick, zb);
    else renderRadial(svg, g, graphData, W, H, setTooltip, onNodeClick, zb);
    simRef.current = sim;
  }, [graphData, layout]);

  const doZoom = f => { if (svgRef.current && zoomRef.current) d3.select(svgRef.current).call(zoomRef.current.scaleBy, f); };
  const doFit = () => { if (!svgRef.current || !zoomRef.current) return; autoFit(d3.select(svgRef.current), d3.select(svgRef.current).select('g'), zoomRef.current); };

  return (
    <div ref={containerRef} className="graph-panel">
      <div className="graph-toolbar">
        <button className="btn btn-icon" onClick={() => doZoom(1.3)} title="Zoom In">＋</button>
        <button className="btn btn-icon" onClick={() => doZoom(0.7)} title="Zoom Out">－</button>
        <button className="btn btn-ghost" style={{ fontSize: 11, padding: '6px 10px' }} onClick={doFit}>⊙ Fit</button>
      </div>
      {graphData && (graphData.nodes?.length > 0 || graphData.total_nodes > 0) && (
        <div className="graph-stats">
          <div className="graph-stat"><span>◈</span> <strong>{graphData.total_nodes !== undefined ? graphData.total_nodes : graphData.nodes.length}</strong> entities</div>
          <div className="graph-stat"><span>↗</span> <strong>{graphData.total_links !== undefined ? graphData.total_links : graphData.links.length}</strong> relations</div>
          <div className="graph-stat"><span>◎</span> <strong style={{ textTransform: 'capitalize' }}>{layout}</strong></div>
          <div className="graph-stat"><span>⊕</span> <strong>{zoom}%</strong></div>
        </div>
      )}
      <svg ref={svgRef} className="graph-svg" />
      {(!graphData || graphData.nodes.length === 0) && (
        <div className="graph-empty">
          <div className="graph-empty-icon">◈</div>
          <p className="graph-empty-text">Upload and process a document to visualize your knowledge graph here.</p>
        </div>
      )}
      <div className="graph-layout-bar">
        {GRAPH_LAYOUTS.map(l => (
          <button key={l.id} className={`btn ${layout === l.id ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 11, padding: '5px 12px', gap: 5 }} onClick={() => setLayout(l.id)}>
            <span>{l.icon}</span> {l.label}
          </button>
        ))}
      </div>
      {tooltip && (
        <div className="graph-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          <div className="tooltip-type">{tooltip.type === 'relationship' ? '⟶ Relationship' : `● ${tooltip.group || 'Entity'}`}</div>
          <div className="tooltip-name">{tooltip.name}</div>
          {tooltip.body && (<><div className="tooltip-divider" /><div className="tooltip-body">{tooltip.body}</div></>)}
        </div>
      )}
    </div>
  );
}

// ─── Intelligence card with rich text ─────────────────────────────────────────

function StepCard({ icon, label, statusColor, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="intel-step">
      <div className="intel-step-header" onClick={() => setOpen(o => !o)}>
        <span className="intel-step-icon" style={{ color: statusColor }}>{icon}</span>
        <span className="intel-step-label">{label}</span>
        <span className="intel-step-toggle">{open ? '▾' : '▸'}</span>
      </div>
      {open && <div className="intel-step-body">{children}</div>}
    </div>
  );
}

function IntelligenceCard({ data }) {
  const { mapped_terms, nodes, relationships, synthesis, response } = data;
  return (
    <div className="msg-bubble intel-card">
      <StepCard icon="◈" label={`Mapped query → ${mapped_terms?.length || 0} terms`} statusColor="var(--cyan)">
        <div className="msg-entities">
          {(mapped_terms || []).map((t, i) => <span key={i} className="entity-chip">◈ {t}</span>)}
        </div>
      </StepCard>
      <StepCard icon="↗" label={`Found ${nodes?.length || 0} nodes · ${relationships?.length || 0} relationships`} statusColor="var(--accent-light)">
        {nodes?.slice(0, 5).map((n, i) => (
          <div key={i} className="intel-row">
            <span className="intel-row-type" style={{ color: getColor(n) }}>◈ {n.type || 'Entity'}</span>
            <span className="intel-row-name">{n.name}</span>
          </div>
        ))}
        {relationships?.slice(0, 4).map((r, i) => (
          <div key={i} className="intel-row rel">
            <span className="intel-row-name">{r.subject}</span>
            <span className="intel-row-pred">→ {r.predicate} →</span>
            <span className="intel-row-name">{r.object}</span>
          </div>
        ))}
      </StepCard>
      {synthesis && (
        <StepCard icon="✦" label="Synthesising from knowledge graph context…" statusColor="var(--green)" defaultOpen>
          <MarkdownText text={synthesis} />
        </StepCard>
      )}
      {response && (
        <div className="intel-answer">
          <div className="intel-answer-label">✦ Final Answer</div>
          <MarkdownText text={response} />
        </div>
      )}
    </div>
  );
}

// ─── Chat Overlay ─────────────────────────────────────────────────────────────

const INITIAL_MSG = { role: 'assistant', isWelcome: true };
function createConvo() { return { id: uid(), title: 'New conversation', messages: [INITIAL_MSG], createdAt: Date.now() }; }

function ChatOverlay({ open, onClose }) {
  const [convos, setConvos] = useState([createConvo()]);
  const [activeId, setActiveId] = useState(convos[0].id);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const bottomRef = useRef(null);
  const activeConvo = convos.find(c => c.id === activeId) || convos[0];

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [activeConvo?.messages, loading]);

  const updateConvo = (id, fn) => setConvos(cs => cs.map(c => c.id === id ? fn(c) : c));
  const addMsg = (id, msg) => updateConvo(id, c => ({ ...c, messages: [...c.messages, msg] }));

  const send = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim(); setInput('');
    const cid = activeId;
    updateConvo(cid, c => ({ ...c, title: c.title === 'New conversation' ? text.slice(0, 38) : c.title }));
    addMsg(cid, { role: 'user', content: text, time: timestamp() });
    setLoading(true);
    try {
      const res = await axios.post(`${API}/chat`, { message: text });
      addMsg(cid, { role: 'assistant', isIntel: true, data: res.data, time: timestamp() });
    } catch {
      addMsg(cid, { role: 'assistant', content: '⚠ Could not reach the knowledge graph.', time: timestamp() });
    }
    setLoading(false);
  };

  const newChat = () => { const c = createConvo(); setConvos(cs => [c, ...cs]); setActiveId(c.id); setShowHistory(false); };

  if (!open) return null;
  return (
    <div className="chat-overlay">
      <div className="chat-header">
        <div className="chat-header-icon">✦</div>
        <div style={{ flex: 1 }}>
          <div className="chat-header-title">Knowledge Agent</div>
          <div className="chat-header-sub">Graph-powered RAG · Llama 3.3 70B</div>
        </div>
        <button className="btn btn-icon" style={{ borderRadius: 8, fontSize: 13 }} onClick={() => setShowHistory(h => !h)} title="History">⏱</button>
        <button className="btn btn-icon" style={{ borderRadius: 8, fontSize: 13 }} onClick={newChat} title="New chat">＋</button>
        <button className="btn btn-icon" style={{ borderRadius: 8 }} onClick={onClose}>✕</button>
      </div>
      {showHistory && (
        <div className="chat-history-popup">
          <div className="chat-history-header">
            <span>Conversation History</span>
            <button className="btn btn-icon" style={{ fontSize: 12 }} onClick={() => setShowHistory(false)}>✕</button>
          </div>
          <div className="chat-history-list">
            {convos.map(c => (
              <div key={c.id} className={`chat-history-item ${c.id === activeId ? 'active' : ''}`}
                onClick={() => { setActiveId(c.id); setShowHistory(false); }}>
                <div className="chat-history-title">{c.title}</div>
                <div className="chat-history-meta">{fmtDate(c.createdAt)} · {c.messages.filter(m => m.role === 'user').length} messages</div>
              </div>
            ))}
          </div>
          <button className="btn btn-primary" style={{ margin: '8px', justifyContent: 'center' }} onClick={newChat}>＋ New Chat</button>
        </div>
      )}
      <div className="chat-messages">
        {activeConvo.messages.map((msg, i) => (
          <div key={i} className={`chat-msg ${msg.role}`}>
            {msg.isWelcome ? (
              <div className="msg-bubble">
                <div style={{ marginBottom: 6, fontWeight: 600, color: 'var(--accent-light)' }}>✦ Knowledge Agent</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Ask anything about your documents. I'll map your query to the graph, extract nodes and relationships, and synthesise a structured answer.
                </div>
                <div className="msg-entities" style={{ marginTop: 8 }}>
                  <span className="entity-chip">◈ Entity search</span>
                  <span className="entity-chip">↗ Relationship mapping</span>
                  <span className="entity-chip">✦ Graph synthesis</span>
                </div>
              </div>
            ) : msg.isIntel ? (
              <IntelligenceCard data={msg.data} />
            ) : (
              <div className="msg-bubble"><MarkdownText text={msg.content} /></div>
            )}
            <div className="msg-meta">{msg.role === 'assistant' ? '✦ Agent' : 'You'}{msg.time ? ` · ${msg.time}` : ''}</div>
          </div>
        ))}
        {loading && (
          <div className="chat-msg assistant">
            <div className="msg-bubble" style={{ padding: '10px 14px' }}>
              <div style={{ fontSize: 11, color: 'var(--cyan)', marginBottom: 8 }}>◈ Mapping query to knowledge graph…</div>
              <div className="typing-indicator"><div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" /></div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-area">
        <div className="chat-input-row">
          <textarea className="chat-textarea" rows={1}
            placeholder="Ask about entities, relationships, concepts…"
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
          <button className="chat-send-btn" onClick={send} disabled={loading || !input.trim()}>↑</button>
        </div>
      </div>
    </div>
  );
}

// ─── Upload + Pipeline Sidebar ────────────────────────────────────────────────

function UploadSidebar({ onGraphRefresh, fileHistory, setFileHistory }) {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [phase, setPhase] = useState('idle'); // idle | uploading | processing | done | error
  const [logs, setLogs] = useState([]);
  const intervalRef = useRef(null);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const handleDrop = e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) setFile(f); };

  const handleUpload = async () => {
    if (!file || uploading) return;
    setUploading(true); setPhase('uploading');
    setLogs([
      { type: 'info', msg: `Ingesting: ${file.name}`, time: timestamp() },
      { type: 'processing', msg: 'Extracting reasoning and building graph...', time: timestamp() }
    ]);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post(`${API}/documents`, formData);
      const docId = res.data.document_id;
      setPhase('processing');
      const newEntry = { name: file.name, date: Date.now(), status: 'processing', docId };
      setFileHistory(h => [newEntry, ...h]);

      intervalRef.current = setInterval(async () => {
        try {
          const st = await axios.get(`${API}/documents/${docId}/status`);
          const { status, message, overall_summary, entities, relationships } = st.data;
          if (status === 'completed') {
            clearInterval(intervalRef.current);
            setLogs([
              { type: 'info', msg: `Ingested: ${file.name}`, time: timestamp() },
              { type: 'success', msg: '✓ Ingestion complete. Graph updated.', time: timestamp() }
            ]);
            setFileHistory(h => h.map(f => f.docId === docId ? {
              ...f,
              status: 'done',
              overall_summary,
              entities,
              relationships
            } : f));
            setUploading(false); setPhase('done');
            onGraphRefresh();
          } else if (status === 'error') {
            clearInterval(intervalRef.current);
            setLogs([
              { type: 'info', msg: `Failed: ${file.name}`, time: timestamp() },
              { type: 'error', msg: `Failed: ${message}`, time: timestamp() }
            ]);
            setFileHistory(h => h.map(f => f.docId === docId ? { ...f, status: 'error' } : f));
            setUploading(false); setPhase('error');
          } else if (status === 'not_found') {
            // Guard against backend uvicorn restarts or dead processes
            clearInterval(intervalRef.current);
            setLogs([
              { type: 'error', msg: 'Processing state reset. Pipeline restarted.', time: timestamp() }
            ]);
            setFileHistory(h => h.map(f => f.docId === docId ? { ...f, status: 'error' } : f));
            setUploading(false); setPhase('error');
          }
        } catch {
          setLogs([
            { type: 'error', msg: 'Status poll failed.', time: timestamp() }
          ]);
          clearInterval(intervalRef.current); setUploading(false); setPhase('error');
        }
      }, 3000);
    } catch (err) {
      setLogs([
        { type: 'error', msg: 'Upload failed: ' + (err.message || 'Unknown'), time: timestamp() }
      ]);
      setUploading(false); setPhase('error');
    }
  };

  const logIcon = { info: '◦', success: '✓', processing: '◌', error: '✗' };

  return (
    <div className="ingest-sidebar-container">
      <div className="sidebar-section">
        <div className="section-label">📥 Ingest Document</div>
        <div className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)} onDrop={handleDrop}>
          <input type="file" accept=".pdf,.docx,.txt" onChange={e => setFile(e.target.files[0])} />
          <div className="drop-zone-icon">{file ? '📄' : '⬆'}</div>
          <div className="drop-zone-text">
            {file ? <strong>{file.name}</strong> : <><strong>Drop file</strong> or click to browse</>}
            <br /><span style={{ color: 'var(--text-muted)', fontSize: 11 }}>.pdf · .docx · .txt</span>
          </div>
        </div>
        {file && (
          <button className="btn btn-primary w-full" style={{ marginTop: 10, justifyContent: 'center' }}
            onClick={handleUpload} disabled={uploading}>
            {uploading ? '⟳ Processing…' : '▶ Process Document'}
          </button>
        )}
        {phase === 'processing' && (
          <div className="processing-status">
            <div className="processing-dots"><span/><span/><span/></div>
            <span>Building knowledge graph…</span>
          </div>
        )}
        {phase === 'done' && <div className="processing-status done">✓ Graph updated successfully</div>}
      </div>

      <div className="sidebar-section" style={{ flex: 1, overflowY: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="section-label">⚡ Pipeline Log</div>
        <div className="processing-log">
          {logs.length === 0 && <div className="log-entry info"><span className="log-icon">◦</span><span>Awaiting upload…</span></div>}
          {logs.map((l, i) => (
            <div key={i} className={`log-entry ${l.type}`}>
              <span className="log-icon">{logIcon[l.type] || '◦'}</span>
              <span className="log-time">{l.time}</span>
              <span>{l.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Ingest Dashboard ─────────────────────────────────────────────────────────

function IngestDashboard({ fileHistory }) {
  const [expandedDocs, setExpandedDocs] = useState({});

  const toggleExpand = (docId) => {
    setExpandedDocs(prev => ({ ...prev, [docId]: !prev[docId] }));
  };

  if (!fileHistory || fileHistory.length === 0) {
    return (
      <div className="ingest-empty-dashboard">
        <div style={{ fontSize: 56, opacity: 0.1, marginBottom: 12 }}>📥</div>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: 6 }}>Ingestion Dashboard</h3>
        <p style={{ fontSize: 13, maxWidth: 280, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.7 }}>
          Upload a document using the left panel to begin extracting entities and relationships.
        </p>
      </div>
    );
  }

  return (
    <div className="ingest-dashboard">
      <div className="ingest-dashboard-header">
        <h2>Ingestion History & Analytics</h2>
        <span className="ingest-dashboard-count">{fileHistory.length} processed files</span>
      </div>
      <div className="ingest-dashboard-list">
        {fileHistory.map((doc) => {
          const isExpanded = !!expandedDocs[doc.docId];
          return (
            <div key={doc.docId} className={`doc-card ${isExpanded ? 'expanded' : ''}`}>
              <div className="doc-card-header" onClick={() => toggleExpand(doc.docId)}>
                <div className="doc-header-left">
                  <div className="doc-icon">📄</div>
                  <div>
                    <div className="doc-name">{doc.name}</div>
                    <div className="doc-meta">{fmtDate(doc.date)}</div>
                  </div>
                </div>
                <div className="doc-header-right">
                  {doc.status === 'processing' ? (
                    <div className="status-badge-processing">
                      <div className="processing-dots mini"><span/><span/><span/></div>
                      <span>Processing</span>
                    </div>
                  ) : doc.status === 'error' ? (
                    <span className="file-badge error">Failed</span>
                  ) : (
                    <>
                      <div className="doc-stat-tag">◈ {doc.entities?.length || 0} nodes</div>
                      <div className="doc-stat-tag">↗ {doc.relationships?.length || 0} links</div>
                      <span className="file-badge done">Completed</span>
                    </>
                  )}
                  <button className="btn btn-icon doc-expand-btn">
                    {isExpanded ? '▾' : '▸'}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="doc-card-body">
                  {doc.overall_summary && (
                    <div className="doc-section">
                      <h4>Overall Summary</h4>
                      <p className="doc-summary-text">{doc.overall_summary}</p>
                    </div>
                  )}
                  
                  <div className="doc-details-grid">
                    <div className="doc-details-column">
                      <h4>Extracted Entities ({doc.entities?.length || 0})</h4>
                      {doc.entities && doc.entities.length > 0 ? (
                        <div className="doc-entities-list">
                          {doc.entities.map((ent, idx) => (
                            <div key={idx} className="doc-entity-item">
                              <span className="doc-entity-type" style={{ color: getColor(ent) }}>◈ {ent.type}</span>
                              <span className="doc-entity-name">{ent.name}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="no-data-text">No entities extracted.</span>
                      )}
                    </div>
                    
                    <div className="doc-details-column">
                      <h4>Extracted Relationships ({doc.relationships?.length || 0})</h4>
                      {doc.relationships && doc.relationships.length > 0 ? (
                        <div className="doc-relationships-list">
                          {doc.relationships.map((rel, idx) => (
                            <div key={idx} className="doc-rel-item">
                              <div className="doc-rel-triple">
                                <span className="doc-rel-name">{rel.subject}</span>
                                <span className="doc-rel-pred">⟶ {rel.predicate} ⟶</span>
                                <span className="doc-rel-name">{rel.object}</span>
                              </div>
                              {rel.reasoning && (
                                <p className="doc-rel-reasoning">{rel.reasoning}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="no-data-text">No relationships mapped.</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Config Panel (Compact & Beautifully Aligned) ─────────────────────────────

const MODULE_META = {
  extraction: {
    icon: '⚙',
    label: 'Extraction Pipeline',
    cls: 'icon-extraction',
    desc: 'Analyzes text chunks to extract unique entities and discover factual connections.'
  },
  reasoning: {
    icon: '◈',
    label: 'Factual Link Reasoning',
    cls: 'icon-reasoning',
    desc: 'Generates detailed context explanation for every extracted link to prevent hallucination.'
  },
  conversation: {
    icon: '✦',
    label: 'RAG Chat Agent',
    cls: 'icon-conversation',
    desc: 'Powers natural conversation using context mapped from the knowledge graph nodes.'
  },
  embedding: {
    icon: '⊕',
    label: 'Vector Embeddings',
    cls: 'icon-embedding',
    isEmbed: true,
    desc: 'Computes multi-dimensional representations of explanations for high-performance retrieval.'
  },
};

function ModelSelect({ provider, value, isEmbed, ollamaModels, onChange }) {
  const options = provider === 'openrouter'
    ? (isEmbed ? OPENROUTER_EMBED : OPENROUTER_LLM)
    : ollamaModels;
  return (
    <select className="config-input config-select" value={value} onChange={e => onChange(e.target.value)}>
      {options.map(m => <option key={m} value={m}>{m}</option>)}
      {!options.includes(value) && value && <option value={value}>{value}</option>}
    </select>
  );
}

function ConfigPanel() {
  const [config, setConfig] = useState({
    extraction:   { provider: 'openrouter', model: OPENROUTER_LLM[0] },
    reasoning:    { provider: 'openrouter', model: OPENROUTER_LLM[0] },
    conversation: { provider: 'openrouter', model: OPENROUTER_LLM[0] },
    embedding:    { provider: 'openrouter', model: OPENROUTER_EMBED[0], dimensions: 2048 }
  });
  const [ollamaModels, setOllamaModels] = useState([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    axios.get(`${API}/config`).then(r => { if (r.data && Object.keys(r.data).length) setConfig(r.data); }).catch(() => {});
    axios.get('http://localhost:11434/api/tags', { timeout: 2000 })
      .then(r => { const models = (r.data?.models || []).map(m => m.name); if (models.length) setOllamaModels(models); })
      .catch(() => {});
  }, []);

  const set = (key, field, val) => setConfig(c => ({ ...c, [key]: { ...c[key], [field]: field === 'dimensions' ? (parseInt(val) || 0) : val } }));
  const save = async () => { await axios.post(`${API}/config`, config).catch(() => {}); setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div className="config-panel">
      <div className="config-header-sec">
        <h2>System Configuration</h2>
        <p>Set credentials and model selections for all stages of the Reasoning-First Knowledge Graph pipeline.</p>
      </div>

      <div className="config-compact-grid">
        {Object.entries(config).map(([key, val]) => {
          const meta = MODULE_META[key];
          return (
            <div key={key} className="config-row-card">
              <div className="config-row-header-wrapper">
                <div className="config-row-header">
                  <span className={`config-module-icon ${meta.cls}`} style={{ width: 22, height: 22, fontSize: 11 }}>{meta.icon}</span>
                  <span className="config-module-name">{meta.label}</span>
                  <span className={`config-module-tag tag-${val.provider}`}>{val.provider}</span>
                </div>
                <div className="config-module-desc">{meta.desc}</div>
              </div>
              
              <div className="config-inline-fields">
                <div className="config-inline-field">
                  <label className="config-label">Provider</label>
                  <select className="config-input config-select" value={val.provider} onChange={e => set(key, 'provider', e.target.value)}>
                    {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="config-inline-field" style={{ flex: 2 }}>
                  <label className="config-label">Model Endpoint</label>
                  <ModelSelect provider={val.provider} value={val.model} isEmbed={meta.isEmbed} ollamaModels={ollamaModels} onChange={v => set(key, 'model', v)} />
                </div>
                {meta.isEmbed && (
                  <div className="config-inline-field" style={{ flex: '0 0 90px' }}>
                    <label className="config-label">Dimensions</label>
                    <input className="config-input" type="number" value={val.dimensions || ''} onChange={e => set(key, 'dimensions', e.target.value)} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="config-save-row">
        <button className="btn btn-primary" onClick={save}>{saved ? '✓ Saved!' : '⊕ Save Configuration'}</button>
      </div>
    </div>
  );
}

// ─── Home & Architecture Panel ────────────────────────────────────────────────

function HomePanel() {
  return (
    <div className="home-panel">
      <div className="home-hero">
        <h1>Reasoning-First Knowledge Graph Console</h1>
        <p className="home-hero-subtitle">
          An enterprise-grade system that builds facts with transparency, explaining the context behind every connection.
        </p>
      </div>

      <div className="home-grid">
        <div className="home-card">
          <div className="home-card-icon" style={{ color: 'var(--accent-light)' }}>◈</div>
          <h3>Factual Link Explanations</h3>
          <p>
            Unlike traditional graphs, this pipeline generates step-by-step reasoning for every relationship created, making graph traces fully explainable.
          </p>
        </div>
        <div className="home-card">
          <div className="home-card-icon" style={{ color: 'var(--cyan)' }}>📥</div>
          <h3>Chunked Data Ingestion</h3>
          <p>
            Uploads `.pdf`, `.docx`, or `.txt` documents. Texts are split into smart chunks to extract entities and connections without context loss.
          </p>
        </div>
        <div className="home-card">
          <div className="home-card-icon" style={{ color: 'var(--green)' }}>⊕</div>
          <h3>Vector Search Index</h3>
          <p>
            Relationships are embedded using Nemotron and queried via cosine similarity for high-performance multi-hop context mapping.
          </p>
        </div>
        <div className="home-card">
          <div className="home-card-icon" style={{ color: 'var(--amber)' }}>✦</div>
          <h3>Augmented Chat Agent</h3>
          <p>
            The RAG agent maps queries to close entities, shows mapped nodes and relationships in trace steps, and synthesises answers from pure graph context.
          </p>
        </div>
      </div>

      <div className="home-section">
        <h2>System Architecture & Flow</h2>
        <div className="arch-flow">
          <div className="arch-node">📄 Document Source</div>
          <div className="arch-arrow">⟶</div>
          <div className="arch-node">🔍 Parser & Chunker</div>
          <div className="arch-arrow">⟶</div>
          <div className="arch-node">🧠 Entity Extractor (Llama 3.3)</div>
          <div className="arch-arrow">⟶</div>
          <div className="arch-node">⚙ Reasoning (LLM)</div>
          <div className="arch-arrow">⟶</div>
          <div className="arch-node">⊕ Embeddings (Nemotron)</div>
          <div className="arch-arrow">⟶</div>
          <div className="arch-node">⬡ Neo4j Graph DB</div>
        </div>
      </div>

      <div className="home-section">
        <h2>Getting Started Guide</h2>
        <div className="guide-steps">
          <div className="guide-step">
            <span className="guide-step-num">1</span>
            <div>
              <strong>Configure your endpoints</strong>
              <p>Go to the Configuration panel to select your LLM provider (Ollama or OpenRouter) and save settings.</p>
            </div>
          </div>
          <div className="guide-step">
            <span className="guide-step-num">2</span>
            <div>
              <strong>Ingest raw data</strong>
              <p>Drag and drop a document in the Ingest tab. View status updates and log outputs directly in the dashboard.</p>
            </div>
          </div>
          <div className="guide-step">
            <span className="guide-step-num">3</span>
            <div>
              <strong>Explore the Graph</strong>
              <p>Switch to the Knowledge Graph tab. Toggle between Disjoint, standard Force-directed, or Radial tree layouts.</p>
            </div>
          </div>
          <div className="guide-step">
            <span className="guide-step-num">4</span>
            <div>
              <strong>Query the Chat Agent</strong>
              <p>Click the floating chat badge at the bottom-right. Ask questions to view extracted node maps and synthesised answers.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── App Root (Left Panel Dashboard Layout) ───────────────────────────────────

export default function App() {
  const [activeTab, setActiveTab] = useState('home'); // Home default
  const [chatOpen, setChatOpen] = useState(false);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [graphLoading, setGraphLoading] = useState(false);
  const [backendAlive, setBackendAlive] = useState(false);
  const [fileHistory, setFileHistory] = useState([]);

  const fetchGraph = useCallback(async () => {
    setGraphLoading(true);
    try {
      const res = await axios.get(`${API}/graph`);
      setGraphData(res.data); setBackendAlive(true);
    } catch { setBackendAlive(false); }
    setGraphLoading(false);
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/documents`);
      setFileHistory(res.data);
    } catch (err) {
      console.error("Failed to fetch documents history", err);
    }
  }, []);

  const refreshAll = useCallback(() => {
    fetchGraph();
    fetchHistory();
  }, [fetchGraph, fetchHistory]);

  useEffect(() => {
    fetchGraph();
    fetchHistory();
  }, [fetchGraph, fetchHistory]);

  const tabs = [
    { id: 'home',   label: 'Home & Architecture', icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1.5 6l5.5-4.5 5.5 4.5v6a1 1 0 01-1 1h-9a1 1 0 01-1-1v-6z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M5.5 13V8h3v5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
    )},
    { id: 'config', label: 'Configuration', icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.4"/><path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.93 2.93l1.06 1.06M10.01 10.01l1.06 1.06M2.93 11.07l1.06-1.06M10.01 3.99l1.06-1.06" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
    )},
    { id: 'ingest', label: 'Ingest & Pipeline', icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v8M4 6l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 10v2a1 1 0 001 1h8a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
    )},
    { id: 'graph',  label: 'Knowledge Graph', icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="1.8" fill="currentColor" opacity="0.9"/><circle cx="7" cy="1.5" r="1.2" stroke="currentColor" strokeWidth="1.1"/><circle cx="12" cy="4.5" r="1.2" stroke="currentColor" strokeWidth="1.1"/><circle cx="12" cy="9.5" r="1.2" stroke="currentColor" strokeWidth="1.1"/><circle cx="7" cy="12.5" r="1.2" stroke="currentColor" strokeWidth="1.1"/><circle cx="2" cy="9.5" r="1.2" stroke="currentColor" strokeWidth="1.1"/><circle cx="2" cy="4.5" r="1.2" stroke="currentColor" strokeWidth="1.1"/><line x1="7" y1="5.2" x2="7" y2="2.7" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.7"/><line x1="8.55" y1="6.1" x2="10.85" y2="5" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.7"/><line x1="8.55" y1="7.9" x2="10.85" y2="9" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.7"/><line x1="7" y1="8.8" x2="7" y2="11.3" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.7"/><line x1="5.45" y1="7.9" x2="3.15" y2="9" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.7"/><line x1="5.45" y1="6.1" x2="3.15" y2="5" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.7"/></svg>
    )},
  ];

  return (
    <div className="app-container">
      {/* Permanent Left Navigation Sidebar */}
      <aside className="nav-sidebar">
        <div className="sidebar-brand">
          <LogoIcon />
          <div className="brand-text">RF-KG</div>
          <div className="brand-sub">Reasoning-First Knowledge Graph</div>
        </div>

        <nav className="sidebar-tabs">
          {tabs.map(t => (
            <button key={t.id} className={`sidebar-tab-btn ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
              {t.icon} <span>{t.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className={`status-pill ${backendAlive ? 'online' : ''}`}
            style={!backendAlive ? { background: 'rgba(248,113,113,0.1)', color: 'var(--red)', border: '1px solid rgba(248,113,113,0.25)' } : {}}>
            <div className="status-dot" /> <span>{backendAlive ? 'API Online' : 'API Offline'}</span>
          </div>
          <button className="btn btn-ghost w-full" style={{ justifyContent: 'center', marginTop: 8 }} onClick={fetchGraph} disabled={graphLoading}>
            {graphLoading ? '⟳' : '↺'} Refresh Graph
          </button>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <main className="content-workspace">
        <div className="tab-content" style={{ flex: 1 }}>
          {activeTab === 'home' && <HomePanel />}
          {activeTab === 'config' && <ConfigPanel />}
          
          {/* Dual-column split layout for ingest tab */}
          <div className="ingest-split-view" style={{ display: activeTab === 'ingest' ? 'flex' : 'none', flex: 1, height: '100%' }}>
            <aside className="ingest-left-uploader">
              <UploadSidebar onGraphRefresh={refreshAll} fileHistory={fileHistory} setFileHistory={setFileHistory} />
            </aside>
            <div className="ingest-right-dashboard" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <IngestDashboard fileHistory={fileHistory} />
            </div>
          </div>

          {activeTab === 'graph' && <KnowledgeGraph graphData={graphData} onNodeClick={() => setChatOpen(true)} />}
        </div>
      </main>

      {/* Floating Chat Agent Toggle */}
      <button className="chat-toggle-btn" onClick={() => setChatOpen(o => !o)} title="Open Knowledge Agent">
        {chatOpen ? '✕' : '✦'}
      </button>
      <ChatOverlay open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
