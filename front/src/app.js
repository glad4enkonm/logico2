import React, { useEffect, useState, useRef } from 'react';
import RightPanel from '@/components/RightPanel';
import G6 from '@antv/g6';
import {
  handleRandomEffect,
  handleNewEffect,
  handleSaveAsEffect,
  handleOpenEffect,
  handleJsonDiffEffect
} from '@/effects';
import findByEmbeddingEffect from '@/effects/findByEmbedding';
import findAllEffect from '@/effects/findAll';
import { initializeGraph, highlightGraphElements, clearPreviousHighlights } from '@/utils/graphUtil';
import {
  API_BASE_URL,
  HIGHLIGHT_STYLE,
  DEFAULT_EDGE,
  DEFAULT_NODE,
  GRAPH_MODES,
  BUTTON_EVENTS
} from '@/constants/appConstants';

export function App() {
  const containerRef = useRef(null);
  const graphRef = useRef(null);
  const graphDataRef = useRef({ nodes: [], edges: [] });
  const allValuesRef = useRef({});
  const highlitedRef = useRef({ nodes: [], edges: [] });

  const [selectedElementValues, setSelectedElementValues] = useState({});
  const [selectedElementLabel, setSelectedElementLabel] = useState("Select element");
  const [sseConnected, setSseConnected] = useState(false);

  useEffect(() => {
    if (!sseConnected) {
      return;
    }

    const eventSource = new EventSource(`${API_BASE_URL}/sse`);

    eventSource.onmessage = (event) => {
        // Default message handler
    };
    
    eventSource.addEventListener('graph_update', (event) => {
        const parsedData = JSON.parse(event.data);
        graphDataRef.current = { nodes: parsedData.nodes, edges: parsedData.edges };
        allValuesRef.current = parsedData.allValues;
        
        if (graphRef.current) {
            graphRef.current.changeData(graphDataRef.current);
            setTimeout(() => graphRef.current.fitView(50), 100);
        }
    });

    eventSource.addEventListener('highlight_update', (event) => {
        if (graphRef.current) {
            clearPreviousHighlights(graphRef.current, highlitedRef.current);
            const { node_ids, edge_ids } = JSON.parse(event.data);
            highlightGraphElements(graphRef.current, node_ids, edge_ids, highlitedRef.current);

            if (node_ids.length === 1 && edge_ids.length === 0) {
                const nodeId = node_ids[0];
                const node = graphDataRef.current.nodes.find(n => n.id === nodeId);
                if (node) {
                    setSelectedElementValues(allValuesRef.current[nodeId] || {});
                    setSelectedElementLabel(node.label || "Node");
                }
            } else if (edge_ids.length === 1 && node_ids.length === 0) {
                const edgeId = edge_ids[0];
                const edge = graphDataRef.current.edges.find(e => e.id === edgeId);
                if (edge) {
                    setSelectedElementValues(allValuesRef.current[edgeId] || {});
                    setSelectedElementLabel(edge.label || "Edge");
                }
            } else {
                setSelectedElementValues({});
                setSelectedElementLabel("Select element");
            }
        }
    });

    eventSource.onerror = (err) => {
      console.error("EventSource failed:", err);
      eventSource.close();
      setSseConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [sseConnected]);

  useEffect(() => {
    const width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    const height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

    if (!graphRef.current && containerRef.current) {
      graphRef.current = new G6.Graph({
        container: containerRef.current,
        width: width - 300,
        height: height * 0.95,
        modes: GRAPH_MODES,
        defaultNode: DEFAULT_NODE,
        defaultEdge: DEFAULT_EDGE,
      });
    }

    const currentGraph = graphRef.current;

    if (currentGraph) {
      initializeGraph(currentGraph, graphDataRef.current, false);

      const edgeClickHandler = (e) => {
        setSelectedElementValues(allValuesRef.current[e.item._cfg.id] || {});
        setSelectedElementLabel(e.item._cfg.model.label || "Edge");

        clearPreviousHighlights(currentGraph, highlitedRef.current);

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

        clearPreviousHighlights(currentGraph, highlitedRef.current);

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
        clearPreviousHighlights(currentGraph, highlitedRef.current);
        currentGraph.paint();
      };

      currentGraph.on('edge:click', edgeClickHandler);
      currentGraph.on('node:click', nodeClickHandler);
      currentGraph.on('canvas:click', canvasClickHandler);

      return () => {
        if (currentGraph) {
          currentGraph.off('edge:click', edgeClickHandler);
          currentGraph.off('node:click', nodeClickHandler);
          currentGraph.off('canvas:click', canvasClickHandler);
        }
      };
    }
  }, []);

  useEffect(() => {
    if (!graphRef.current) {
      return;
    }

    const currentGraph = graphRef.current;
    
    const randomHandler = handleRandomEffect(currentGraph, graphDataRef, allValuesRef, highlitedRef);
    const newHandler = handleNewEffect(currentGraph, graphDataRef.current, allValuesRef.current);
    const saveAsHandler = handleSaveAsEffect(currentGraph, graphDataRef.current, allValuesRef);
    const openHandler = handleOpenEffect(graphRef, graphDataRef.current, allValuesRef.current);
    const jsonHandler = handleJsonDiffEffect(currentGraph, graphDataRef, allValuesRef, highlitedRef);

    const handleButtonClick = async (evt) => {
      const eventType = evt.detail && evt.detail.type ? evt.detail.type : evt.detail;
      switch (eventType) {
        case BUTTON_EVENTS.SSE_CONNECT:
            setSseConnected(true);
            console.log("SSE connection initiated");
            break;
        case BUTTON_EVENTS.SSE_DISCONNECT:
            setSseConnected(false);
            console.log("SSE connection terminated");
            break;
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
          openHandler(evt);
          break;
        case BUTTON_EVENTS.JSON_DIFF_DONE:
          const { jsonData } = evt.detail || {};
          if (!jsonData) {
            console.warn('jsonHandler called without jsonData in event detail:', evt);
            return;
          }
          jsonHandler(jsonData);
          break;
        case 'EFFECT_CALL_FINDBYEMBEDDING':
          const { inputText: embeddingInput } = evt.detail || {};
          if (!embeddingInput) {
            console.warn('findByEmbedding called without inputText');
            return;
          }
          try {
            const result = await findByEmbeddingEffect(embeddingInput, {
              nodes: graphDataRef.current.nodes,
              edges: graphDataRef.current.edges,
              allValues: allValuesRef.current
            });

            const currentGraph = graphRef.current;
            if (currentGraph) {
              highlightGraphElements(currentGraph, result.nodes, result.edges, highlitedRef.current);
            }

            const doneEvent = new CustomEvent('buttonClick', {
              detail: {
                type: 'EFFECT_DONE_FINDBYEMBEDDING',
                result
              }
            });
            window.dispatchEvent(doneEvent);
          } catch (error) {
            console.error('Error in findByEmbeddingEffect:', error);
          }
          break;
        case 'EFFECT_CALL_FINDALL':
          const { inputText: findAllInput } = evt.detail || {};
          if (!findAllInput) {
            console.warn('findAllEffect called without inputText');
            return;
          }
          try {
            const result = await findAllEffect(findAllInput, {
              nodes: graphDataRef.current.nodes,
              edges: graphDataRef.current.edges,
              allValues: allValuesRef.current
            });

            const currentGraph = graphRef.current;
            if (currentGraph) {
              highlightGraphElements(currentGraph, result.nodes, result.edges, highlitedRef.current);
            }

            const doneEvent = new CustomEvent('buttonClick', {
              detail: {
                type: 'EFFECT_DONE_FINDALL',
                result
              }
            });
            window.dispatchEvent(doneEvent);
          } catch (error) {
            console.error('Error in findAllEffect:', error);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('buttonClick', handleButtonClick);

    return () => {
      window.removeEventListener('buttonClick', handleButtonClick);
    };
  }, [graphRef.current]);

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div ref={containerRef} style={{ flex: 1 }}>
        {/* G6 Graph is mounted here by the G6.Graph constructor */}
      </div>
      <RightPanel
        data={selectedElementValues}
        caption={selectedElementLabel}
        sseConnected={sseConnected}
      />
    </div>
  );
}
