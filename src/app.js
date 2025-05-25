import React, { useEffect, useState } from 'react';
import RightPanel from '@/components/RightPanel';
import ButtonPanel from '@/components/ButtonPanel';
import G6 from '@antv/g6';
import { handleRandomEffect, handleNewEffect, handleSaveAsEffect, handleOpenEffect } from '@/effects';
import {
  HIGHLIGHT_STYLE,
  DEFAULT_EDGE,
  DEFAULT_NODE,
  GRAPH_LAYOUT_OPTIONS,
  GRAPH_MODES,
  BUTTON_EVENTS
} from '@/constants/appConstants';

const highlited = { nodes: [], edges: [] };

export function App() {
  const ref = React.useRef(null);
  let graph = null;
  let graphData = { nodes: [], edges: [] };
  let allValues = {};

  const width = window.innerWidth
    || document.documentElement.clientWidth
    || document.body.clientWidth;

  const height = window.innerHeight
    || document.documentElement.clientHeight
    || document.body.clientHeight;

  const [selectedElementValues, setSelectedElementValues] = useState({});
  const [selectedElementLabel, setSelectedElementLabel] = useState("Select element");

  useEffect(() => {
    if (!graph) {
      graph = new G6.Graph({
        container: ref.current,
        width: width - 300,
        height: height * 0.95,
        modes: GRAPH_MODES,
        defaultNode: DEFAULT_NODE,
        defaultEdge: DEFAULT_EDGE,
        layout: GRAPH_LAYOUT_OPTIONS,
      });
    }

    // Initialize graph data
    graph.data(graphData);
    graph.render();
    graph.paint();

    graph.on('edge:click', (e) => {
      setSelectedElementValues(allValues[e.item._cfg.id]);
      setSelectedElementLabel(e.item._cfg.model.label);
      highlited.edges.push(e.item);
      highlited.nodes.push(e.item.getSource(), e.item.getTarget());

      const elements = highlited.edges.concat(highlited.nodes);
      elements.forEach(el => graph.updateItem(el, {
        style: HIGHLIGHT_STYLE,
      }));

      graph.paint();
    });

    graph.on('node:click', (e) => {
      const node = e.item; // The clicked node
      setSelectedElementValues(allValues[e.item._cfg.id]);
      setSelectedElementLabel(e.item._cfg.model.label);
      highlited.nodes.push(node);

      // Get connected edges for the clicked node
      const edges = graph.getEdges().filter(edge => {
        return edge.getSource() === node || edge.getTarget() === node;
      });

      // Add the connected edges to the highlighted list
      edges.forEach(edge => {
        highlited.edges.push(edge);

        // Additionally, highlight the opposite node of each edge
        const source = edge.getSource();
        const target = edge.getTarget();
        if (source !== node && highlited.nodes.indexOf(source) === -1) {
          highlited.nodes.push(source);
        }
        if (target !== node && highlited.nodes.indexOf(target) === -1) {
          highlited.nodes.push(target);
        }
      });

      // Apply the highlight style to all highlighted elements
      const elements = highlited.edges.concat(highlited.nodes);
      elements.forEach(el => graph.updateItem(el, {
        style: HIGHLIGHT_STYLE,
      }));

      graph.paint();
    });

    // Reset styles when clicking elsewhere on the canvas
    graph.on('canvas:click', () => {
      setSelectedElementValues({});
      setSelectedElementLabel("");
      highlited.edges.forEach(el => graph.updateItem(el, {
        style: DEFAULT_EDGE.style,
      }));

      highlited.nodes.forEach(el => graph.updateItem(el, {
        style: DEFAULT_NODE.style,
      }));

      highlited.edges = [];
      highlited.nodes = [];

      graph.paint();
    });

  }, []);

  // Add event listeners for button clicks
  useEffect(() => {
    const handleRandomClick = handleRandomEffect(graph, graphData, allValues);
    const handleNewClick = handleNewEffect(graph, graphData, allValues);
    const handleSaveAsClick = handleSaveAsEffect(graph, graphData);
    const handleOpenClick = handleOpenEffect(graph, graphData, allValues);

    const handleButtonClick = (evt) => {
      switch (evt.detail) {
        case BUTTON_EVENTS.RANDOM:
          handleRandomClick(evt);
          break;
        case BUTTON_EVENTS.NEW:
          handleNewClick(evt);
          break;
        case BUTTON_EVENTS.SAVE_AS:
          handleSaveAsClick(evt);
          break;
        case BUTTON_EVENTS.OPEN:
          handleOpenClick(evt);
          break;
        default:
          break;
      }
    };

    window.addEventListener('buttonClick', handleButtonClick);

    return () => {
      window.removeEventListener('buttonClick', handleButtonClick);
    };
  }, [graph]);

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div ref={ref} style={{ flex: 1 }}>
      </div>
      <RightPanel data={selectedElementValues} caption={selectedElementLabel} />
    </div>
  );
}