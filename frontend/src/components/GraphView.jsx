import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import axios from 'axios';

function GraphView() {
  const svgRef = useRef(null);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });

  useEffect(() => {
    const fetchGraph = async () => {
      try {
        const res = await axios.get('http://localhost:8000/graph');
        setGraphData(res.data);
      } catch (e) {
        console.error("Failed to fetch graph", e);
      }
    };
    fetchGraph();
  }, []);

  useEffect(() => {
    if (graphData.nodes.length === 0) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 600;
    const height = 400;

    const simulation = d3.forceSimulation(graphData.nodes)
      .force('link', d3.forceLink(graphData.links).id(d => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const link = svg.append('g')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(graphData.links)
      .join('line')
      .attr('stroke-width', 2);

    link.append("title")
        .text(d => d.reasoning);

    const node = svg.append('g')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .selectAll('circle')
      .data(graphData.nodes)
      .join('circle')
      .attr('r', 15)
      .attr('fill', '#69b3a2')
      .call(drag(simulation));

    node.append("title")
        .text(d => d.name || d.id);

    const labels = svg.append("g")
        .selectAll("text")
        .data(graphData.nodes)
        .join("text")
        .text(d => d.name || d.id)
        .attr('x', 20)
        .attr('y', 5)
        .style("font-size", "10px");

    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);

      labels
        .attr('x', d => d.x + 20)
        .attr('y', d => d.y + 5);
    });

    function drag(simulation) {
      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
      return d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended);
    }
  }, [graphData]);

  return (
    <div className="card">
      <h3>Knowledge Graph</h3>
      <svg ref={svgRef} width="600" height="400" style={{ border: '1px solid #ccc', background: '#f9f9f9', width: '100%' }}></svg>
    </div>
  );
}

export default GraphView;
