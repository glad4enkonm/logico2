import React, { useEffect, useState, useRef } from 'react';
import RightPanel from '@/components/RightPanel';
import G6 from '@antv/g6';
import {
  handleRandomEffect,
  handleNewEffect,
  handleSaveAsEffect,
  handleOpenEffect,
  handleJsonDiffEffect,
  handleNeo4jSyncEffect,
  handleAutoLayoutEffect
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
import { postPositions } from '@/api';

// Extract graph_id from a /graphs/<gid>.json path (spec D3/D12).
const extractGraphIdFromPath = (path) => {
  const m = /^\/graphs\/([a-zA-Z0-9_-]+)\.json$/.exec(path || '');
  return m ? m[1] : null;
};

// D9: if any node lacks coordinates we must run a layout instead of
// trusting empty positions.
const graphNeedsLayout = (nodes) => (nodes || []).some((n) => n.x == null || n.y == null);

// D8: debounce window for writing positions back to the backend after a
// layout stabilizes; node:dragend posts immediately.
const POSITION_WRITE_BACK_DELAY_MS = 1000;

const postPositionsSilently = (graphId, nodes) => {
  if (!graphId) return;
  const positions = (nodes || [])
    .map((n) => ({ id: n.id, x: n.x, y: n.y }))
    .filter((p) => p.x != null && p.y != null);
  if (!positions.length) return;
  postPositions(graphId, positions).catch((err) => {
    console.warn('Position write-back failed:', err.message);
  });
};

// Helpers to load graph data from URL parameters (supports local 'p' base64 path)
const parseParamJSON = (value) => {
  if (!value) return null;
  try { return JSON.parse(decodeURIComponent(value)); } catch {}
  try { return JSON.parse(value); } catch {}
  try { const decoded = atob(value); return JSON.parse(decoded); } catch {}
  return null;
};

// Decode URL-safe base64 (p) to a plain string path
const decodeBase64Url = (b64) => {
  try {
    const normalized = decodeURIComponent(b64).replace(/-/g, '+').replace(/_/g, '/');
    const pad = normalized.length % 4 ? 4 - (normalized.length % 4) : 0;
    const padded = normalized + '='.repeat(pad);
    return atob(padded);
  } catch (e) {
    try { return atob(b64); } catch { return null; }
  }
};

const getQueryParams = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    return {
      graph: params.get('graph'),
      g: params.get('g'),
      p: params.get('p'),
    };
  } catch (err) {
    return {};
  }
};

export function App() {
  const containerRef = useRef(null);
  const graphRef = useRef(null);
  const graphDataRef = useRef({ nodes: [], edges: [] });
  const allValuesRef = useRef({});
  const highlitedRef = useRef({ nodes: [], edges: [] });

  const [selectedElementValues, setSelectedElementValues] = useState({});
  const [selectedElementLabel, setSelectedElementLabel] = useState("Select element");
  const [sseConnected, setSseConnected] = useState(false);
  const graphIdRef = useRef(null);
  const positionWriteBackTimerRef = useRef(null);
  // True after a manual Disconnect press; suppresses SSE auto-reconnect (D13)
  // and the mount-time auto-connect so the manual off state survives retries.
  const sseManualDisconnectRef = useRef(false);

  // Helpers to compute viewport and panel sizes
  const getViewportSize = () => {
    const width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    const height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    return { width, height };
  };

  const getPanelWidth = () => {
    const el = document.querySelector('.right-panel');
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect && rect.width) return rect.width;
    }
    return 400; // default expanded width
  };

  useEffect(() => {
    if (!sseConnected) {
      return;
    }

    // D10: multiplexed endpoint; announce our graph via ?g= when known so the
    // backend counts us for layout dispatch and skips other graphs' events.
    // NOTE: this effect runs on mount (auto-connect, spec §1 / D13) and again
    // when the user presses Connect; a manual Disconnect sets sseConnected
    // false, which tears the stream down via this effect's cleanup.
    const url = graphIdRef.current
      ? `${API_BASE_URL}/sse?g=${encodeURIComponent(graphIdRef.current)}`
      : `${API_BASE_URL}/sse`;
    let eventSource = null;
    let retryTimer = null;
    let retryAttempt = 0;
    let closed = false; // set by cleanup: cancels pending retries on teardown

    // D8: debounce ~1s after a graph_update/layout before writing positions back
    const schedulePositionWriteBack = () => {
      if (positionWriteBackTimerRef.current) {
        clearTimeout(positionWriteBackTimerRef.current);
      }
      positionWriteBackTimerRef.current = setTimeout(() => {
        positionWriteBackTimerRef.current = null;
        const graph = graphRef.current;
        if (!graph) return;
        // graph.save() returns rendered items incl. current x/y after layout
        try {
          postPositionsSilently(graphIdRef.current, graph.save().nodes);
        } catch (err) {
          console.warn('Position write-back skipped:', err);
        }
      }, POSITION_WRITE_BACK_DELAY_MS);
    };

    // D9: only force a full re-layout when coordinates are missing; otherwise
    // respect existing positions (incl. coordinates the model set).
    const applyIncomingGraph = (graph) => {
      // Guard against malformed payloads; empty graphs remain valid (they
      // legitimately clear the canvas after the model deletes everything).
      const nodes = Array.isArray(graph && graph.nodes) ? graph.nodes : [];
      const edges = Array.isArray(graph && graph.edges) ? graph.edges : [];
      graphDataRef.current = { nodes, edges };
      allValuesRef.current = (graph && graph.allValues) || {};

      if (graphRef.current) {
        const doLayout = graphNeedsLayout(nodes);
        initializeGraph(graphRef.current, graphDataRef.current, null, doLayout);
        if (doLayout) schedulePositionWriteBack();
      }
    };

    const handleGraphUpdate = (event) => {
      const parsed = JSON.parse(event.data);
      // D10: multiplexed payload {graph_id, event, data}; legacy shape is the
      // raw graph object — support both while tabs may talk to an old backend.
      const graph = (parsed && typeof parsed === 'object' && parsed.data && parsed.data.graph)
        ? parsed.data.graph
        : parsed;
      if (graphIdRef.current && parsed.graph_id && parsed.graph_id !== graphIdRef.current) return;
      applyIncomingGraph(graph);
    };

    // D6: layout executed in the browser on layout_request — identical to
    // pressing the layout button in the UI.
    const handleLayoutRequest = (event) => {
      const parsed = JSON.parse(event.data);
      if (graphIdRef.current && parsed.graph_id && parsed.graph_id !== graphIdRef.current) return;
      const options = (parsed.data && parsed.data.layoutOptions) || null;
      if (!options || !graphRef.current) return;
      handleAutoLayoutEffect(graphRef, graphDataRef)(options);
      schedulePositionWriteBack();
    };

    const handleHighlightUpdate = (event) => {
      if (!graphRef.current) return;
      const parsed = JSON.parse(event.data);
      if (graphIdRef.current && parsed.graph_id && parsed.graph_id !== graphIdRef.current) return;
      const { node_ids, edge_ids } = parsed.data || parsed;
      clearPreviousHighlights(graphRef.current, highlitedRef.current);
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
    };

    const connect = () => {
      if (closed || sseManualDisconnectRef.current) return;
      eventSource = new EventSource(url);
      eventSource.onopen = () => {
        retryAttempt = 0;
      };
      eventSource.addEventListener('graph_update', handleGraphUpdate);
      eventSource.addEventListener('highlight_update', handleHighlightUpdate);
      eventSource.addEventListener('layout_request', handleLayoutRequest);
      // D13: reconnect with exponential backoff instead of closing forever
      eventSource.onerror = () => {
        console.warn('SSE connection lost, retrying...');
        eventSource.close();
        if (closed || sseManualDisconnectRef.current) return;
        const wait = Math.min(1000 * 2 ** retryAttempt, 15000);
        retryAttempt += 1;
        retryTimer = setTimeout(connect, wait);
      };
    };

    connect();

    return () => {
      closed = true; // cancel pending retries (cleanup = full teardown)
      if (retryTimer) clearTimeout(retryTimer);
      if (eventSource) eventSource.close();
    };
  }, [sseConnected]);

  // Auto-connect SSE once on mount (spec §1: the user opens the UI and watches
  // the model edit live; D13 backoff/retry lives in the effect above). The
  // Connect button remains for reconnecting after a deliberate Disconnect.
  useEffect(() => {
    if (sseManualDisconnectRef.current) return; // user chose Disconnect
    setSseConnected(true);
  }, []);

  useEffect(() => {
    const { width: viewportWidth, height: viewportHeight } = getViewportSize();
    

    if (!graphRef.current && containerRef.current) {
      graphRef.current = new G6.Graph({
        container: containerRef.current,
        width: viewportWidth - getPanelWidth(),
        height: viewportHeight,
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

      // D8: persist manual node drags immediately (silent backend merge)
      const nodeDragEndHandler = (e) => {
        const model = e.item && e.item._cfg ? e.item._cfg.model : null;
        if (!model) return;
        postPositionsSilently(graphIdRef.current, [{ id: model.id, x: model.x, y: model.y }]);
      };
      currentGraph.on('node:dragend', nodeDragEndHandler);

      // Resize graph when the panel toggles or window resizes
      const resizeGraphToFit = () => {
        const { width: vw, height: vh } = getViewportSize();
        const panelWidth = getPanelWidth();
        currentGraph.changeSize(vw - panelWidth, vh);
        currentGraph.paint();
      };

      const handleRightPanelToggle = () => {
        // Recalculate after DOM updates and after CSS transition completes
        const schedule = () => {
          resizeGraphToFit();
          setTimeout(resizeGraphToFit, 320);
        };
        if (typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(schedule);
        } else {
          setTimeout(schedule, 0);
        }
      };

      window.addEventListener('rightPanelToggle', handleRightPanelToggle);
      window.addEventListener('resize', resizeGraphToFit);
      window.addEventListener('rightPanelResize', resizeGraphToFit);

      // Initial adjust (in case layout/DOM order causes mismatch)
      resizeGraphToFit();

      return () => {
        if (currentGraph) {
          currentGraph.off('edge:click', edgeClickHandler);
          currentGraph.off('node:click', nodeClickHandler);
          currentGraph.off('canvas:click', canvasClickHandler);
          currentGraph.off('node:dragend', nodeDragEndHandler);
          window.removeEventListener('rightPanelToggle', handleRightPanelToggle);
          window.removeEventListener('resize', resizeGraphToFit);
          window.removeEventListener('rightPanelResize', resizeGraphToFit);
        }
      };
    }
  }, []);

  useEffect(() => {
    if (!graphRef.current) {
      return;
    }

    const currentGraph = graphRef.current;

    // Effect handlers will be called directly in the switch statement to avoid stale closures.

    const handleButtonClick = async (evt) => {
      console.log('[DEBUG] Event received in handleButtonClick. Event detail:', evt.detail);
      const eventType = evt.detail && evt.detail.type ? evt.detail.type : evt.detail;

      switch (eventType) {
        case BUTTON_EVENTS.SSE_CONNECT:
          sseManualDisconnectRef.current = false; // clear manual-off
          setSseConnected(true);
          console.log("SSE connection initiated");
          break;
        case BUTTON_EVENTS.SSE_DISCONNECT:
          sseManualDisconnectRef.current = true; // suppress auto-reconnect
          setSseConnected(false);
          console.log("SSE connection terminated");
          break;
        case BUTTON_EVENTS.RANDOM:
          handleRandomEffect(currentGraph, graphDataRef, allValuesRef, highlitedRef)(evt);
          break;
        case BUTTON_EVENTS.NEW:
          handleNewEffect(currentGraph, graphDataRef.current, allValuesRef.current)(evt);
          break;
        case BUTTON_EVENTS.SAVE_AS:
          handleSaveAsEffect(currentGraph, graphDataRef.current, allValuesRef)(evt);
          break;
        case BUTTON_EVENTS.OPEN:
          handleOpenEffect(graphRef, graphDataRef.current, allValuesRef.current)(evt);
          break;
        case BUTTON_EVENTS.NEO4J_SYNC:
          handleNeo4jSyncEffect()(evt);
          break;
        case BUTTON_EVENTS.AUTO_LAYOUT:
          const { layoutOptions } = evt.detail || {};
          if (!layoutOptions) {
            console.warn('AUTO_LAYOUT called without layoutOptions in event detail');
            return;
          }
          handleAutoLayoutEffect(graphRef, graphDataRef)(layoutOptions);
          break;        
        case BUTTON_EVENTS.JSON_DIFF_DONE:
          const { jsonData: jsonDiffData } = evt.detail || {};
          if (!jsonDiffData) {
            console.warn('JSON_DIFF_DONE called without jsonData in event detail:', evt);
            return;
          }
          handleJsonDiffEffect(currentGraph, graphDataRef, allValuesRef, highlitedRef)(jsonDiffData);
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

  // Load graph from URL parameters (supports local base64 path via ?p= and inline JSON via ?g or ?graph)
  useEffect(() => {
    const { p, graph, g } = getQueryParams();
    const pBase64 = p; const resolvedLocalPath = pBase64 ? decodeBase64Url(pBase64) : null;
    const inlineGraph = graph || g;

    if (!resolvedLocalPath && !inlineGraph) return;

    const loadAndInit = async () => {
      try {
        let payload;
        let loadedGraphId = null;
        if (resolvedLocalPath) {
          // D3/D12: /graphs/<gid>.json path tells us which graph this tab
          // displays — subscribe to exactly that id on the SSE stream.
          loadedGraphId = extractGraphIdFromPath(resolvedLocalPath);
          if (loadedGraphId) graphIdRef.current = loadedGraphId;
          const decodedPath = resolvedLocalPath;
          // Treat as a same-origin local file path (no protocol)
          const normalized = decodedPath.startsWith('/') ? decodedPath : '/' + decodedPath;
          const resp = await fetch(normalized, { cache: 'no-cache' });
          if (!resp.ok) throw new Error(`Failed to fetch path ${normalized}: ${resp.status} ${resp.statusText}`);
          payload = await resp.json();
          // Normalize URL to reflect the path used
          try {
            const url = new URL(window.location.href);
            url.searchParams.set('p', pBase64);
            window.history.replaceState(null, '', url.toString());
          } catch {}
        } else {
          payload = parseParamJSON(inlineGraph);
          if (!payload) throw new Error('Invalid graph JSON in URL param');
        }

        const { nodes = [], edges = [], allValues = {} } = payload;
        graphDataRef.current = { nodes, edges };
        allValuesRef.current = allValues;

        // D9: if any node lacks coordinates, lay out instead of trusting
        // empty positions (e.g. graph saved with no open tab). Positions are
        // written back from the rendered graph AFTER layout (D8).
        const initLoaded = () => {
          if (!graphRef.current) return false;
          const doLayout = graphNeedsLayout(nodes);
          initializeGraph(graphRef.current, graphDataRef.current, allValuesRef.current, doLayout);
          if (doLayout && loadedGraphId) {
            // gForce is iterative: give the layout a moment to settle before
            // writing coordinates back (same debounce as D8).
            setTimeout(() => {
              if (!graphRef.current) return;
              try {
                postPositionsSilently(loadedGraphId, graphRef.current.save().nodes);
              } catch (err) {
                console.warn('Position write-back skipped after open:', err);
              }
            }, POSITION_WRITE_BACK_DELAY_MS);
          }
          return true;
        };

        if (!initLoaded()) {
          // wait one tick for graph to be created
          setTimeout(initLoaded, 0);
        }
      } catch (err) {
        console.error('Failed to load graph from URL parameter:', err);
        alert('Failed to load graph from URL. Please check the path/param.');
      }
    };

    loadAndInit();
  }, []);

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
