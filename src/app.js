import React, { useEffect, useState, useRef } from 'react';
import RightPanel from '@/components/RightPanel';
import G6 from '@antv/g6';
import { handleRandomEffect, handleNewEffect, handleSaveAsEffect, handleOpenEffect } from '@/effects';
import { initializeGraph } from '@/utils/graphUtil';
import {
  HIGHLIGHT_STYLE,
  DEFAULT_EDGE,
  DEFAULT_NODE,
  GRAPH_MODES,
  BUTTON_EVENTS
} from '@/constants/appConstants';

// Note: The `highlitedRef` (previously `highlited` as a module-level variable)
// is now managed as a ref within the App component. This improves encapsulation.
// It's used for direct G6 updates without triggering re-renders, which is suitable
// for this use case where changes are applied directly to the G6 graph instance.



export function App() {
 const containerRef = useRef(null); // For the G6 graph container DOM element
 const graphRef = useRef(null); // To hold the G6 graph instance
 const graphDataRef = useRef({ nodes: [], edges: [] }); // To hold the current graph data
 const allValuesRef = useRef({}); // To hold key-value data for nodes/edges
 const highlitedRef = useRef({ nodes: [], edges: [] }); // To hold highlighted elements

  const [selectedElementValues, setSelectedElementValues] = useState({});
  const [selectedElementLabel, setSelectedElementLabel] = useState("Select element");

  // Effect for initializing G6 graph and its event listeners
  useEffect(() => {
    const width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    const height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

    if (!graphRef.current && containerRef.current) {
      graphRef.current = new G6.Graph({
        container: containerRef.current,
        width: width - 300, // Adjust as needed
        height: height * 0.95, // Adjust as needed
        modes: GRAPH_MODES,
        defaultNode: DEFAULT_NODE,
        defaultEdge: DEFAULT_EDGE,
      });
    }

    const currentGraph = graphRef.current; // Use a local const for handlers and cleanup

    if (currentGraph) {
      // Initialize with current (likely empty) data, `doLayout = false` to respect existing coords if any.
      // If graphDataRef.current is empty and has no coords, G6's `GRAPH_LAYOUT_OPTIONS` will apply.
      // If `initializeGraph` uses `graph.read()`, it will preserve x/y from graphDataRef.current.
      initializeGraph(currentGraph, graphDataRef.current, false);

      const edgeClickHandler = (e) => {
        setSelectedElementValues(allValuesRef.current[e.item._cfg.id] || {});
        setSelectedElementLabel(e.item._cfg.model.label || "Edge");
        
        // Clear previous highlights before applying new ones for simplicity
        highlitedRef.current.edges.forEach(el => currentGraph.updateItem(el, { style: DEFAULT_EDGE.style }));
        highlitedRef.current.nodes.forEach(el => currentGraph.updateItem(el, { style: DEFAULT_NODE.style }));
        highlitedRef.current.edges = [];
        highlitedRef.current.nodes = [];

        highlitedRef.current.edges.push(e.item);
        highlitedRef.current.nodes.push(e.item.getSource(), e.item.getTarget());

        const elementsToUpdate = highlitedRef.current.edges.concat(highlitedRef.current.nodes);
        elementsToUpdate.forEach(el => currentGraph.updateItem(el, { style: HIGHLIGHT_STYLE }));
        currentGraph.paint();
      };

      const nodeClickHandler = (e) => {
        const node = e.item;
        setSelectedElementValues(allValuesRef.current[e.item._cfg.id] || {});
        setSelectedElementLabel(e.item._cfg.model.label || "Node");

        // Clear previous highlights
        highlitedRef.current.edges.forEach(el => currentGraph.updateItem(el, { style: DEFAULT_EDGE.style }));
        highlitedRef.current.nodes.forEach(el => currentGraph.updateItem(el, { style: DEFAULT_NODE.style }));
        highlitedRef.current.edges = [];
        highlitedRef.current.nodes = [];
        
        highlitedRef.current.nodes.push(node);

        const connectedEdges = currentGraph.getEdges().filter(edge =>
          edge.getSource() === node || edge.getTarget() === node
        );

        connectedEdges.forEach(edge => {
          highlitedRef.current.edges.push(edge);
          const source = edge.getSource();
          const target = edge.getTarget();
          if (source !== node && !highlitedRef.current.nodes.some(n => n === source)) highlitedRef.current.nodes.push(source);
          if (target !== node && !highlitedRef.current.nodes.some(n => n === target)) highlitedRef.current.nodes.push(target);
        });

        const elementsToUpdate = highlitedRef.current.edges.concat(highlitedRef.current.nodes);
        elementsToUpdate.forEach(el => currentGraph.updateItem(el, { style: HIGHLIGHT_STYLE }));
        currentGraph.paint();
      };

      const canvasClickHandler = () => {
        setSelectedElementValues({});
        setSelectedElementLabel("Select element");
        highlitedRef.current.edges.forEach(el => currentGraph.updateItem(el, { style: DEFAULT_EDGE.style }));
        highlitedRef.current.nodes.forEach(el => currentGraph.updateItem(el, { style: DEFAULT_NODE.style }));
        highlitedRef.current.edges = [];
        highlitedRef.current.nodes = [];
        currentGraph.paint();
      };

      currentGraph.on('edge:click', edgeClickHandler);
      currentGraph.on('node:click', nodeClickHandler);
      currentGraph.on('canvas:click', canvasClickHandler);

      // Cleanup G6 event listeners
      return () => {
        if (currentGraph) {
          currentGraph.off('edge:click', edgeClickHandler);
          currentGraph.off('node:click', nodeClickHandler);
          currentGraph.off('canvas:click', canvasClickHandler);
          // Optional: Destroy the graph if the App component unmounts
          // currentGraph.destroy();
          // graphRef.current = null;
        }
      };
    }
  }, []); // Empty dependency array: run this effect once on mount.

  // Effect for handling custom button events
  useEffect(() => {
    if (!graphRef.current) {
      return; // Graph not yet initialized
    }

    const currentGraph = graphRef.current;
    // Pass the refs themselves to the effect handlers

    const randomHandler = handleRandomEffect(currentGraph, graphDataRef, allValuesRef, highlitedRef);
    // TODO: Update newHandler and openHandler similarly if they also need to clear highlights
    const newHandler = handleNewEffect(currentGraph, graphDataRef.current, allValuesRef.current); // Keeping old signature for now
    const saveAsHandler = handleSaveAsEffect(currentGraph, graphDataRef.current, allValuesRef.current); // `graphDataRef.current` will be read inside
    const openHandler = handleOpenEffect(graphRef, graphDataRef.current, allValuesRef.current); // `graphDataRef.current` will be mutated inside

    const handleButtonClick = (evt) => {
      switch (evt.detail) {
        case BUTTON_EVENTS.RANDOM:
          randomHandler(evt);
          break;
        case BUTTON_EVENTS.NEW:
          newHandler(evt);
          break;
        case BUTTON_EVENTS.SAVE_AS:
          saveAsHandler(evt);
          break;
        case BUTTON_EVENTS.OPEN:
          openHandler(evt); // This will update graphDataRef.current and allValuesRef.current
          break;
        default:
          break;
      }
    };

    window.addEventListener('buttonClick', handleButtonClick);

    return () => {
      window.removeEventListener('buttonClick', handleButtonClick);
    };
  }, [graphRef.current]); // Rerun if graphRef.current changes (e.g., if it were re-initialized)

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div ref={containerRef} style={{ flex: 1 }}>
        {/* G6 Graph is mounted here by the G6.Graph constructor */}
      </div>
      <RightPanel data={selectedElementValues} caption={selectedElementLabel} />
    </div>
  );
}
