import G6 from '@antv/g6';
import { GRAPH_LAYOUT_OPTIONS, GRAPH_LAYOUT_OPTIONS_NO_GFORCE, HIGHLIGHT_STYLE, DEFAULT_EDGE, DEFAULT_NODE, GRAPH_GENERATION_DEFAULTS } from '../constants/appConstants';

/**
 * Highlight nodes and edges in the graph
 * @param {G6.Graph} graph - The G6 graph instance
 * @param {Array<string>} nodeIds - Array of node IDs to highlight
 * @param {Array<string>} edgeIds - Array of edge IDs to highlight
 * @param {Object} highlitedRef - Reference object containing currently highlighted edges and nodes
 */
export function highlightGraphElements(graph, nodeIds, edgeIds, highlitedRef) {
  if (!graph) return;

  // Clear previous highlights
  clearPreviousHighlights(graph, highlitedRef);

  // Highlight the specified nodes by ID
  nodeIds.forEach(id => {
    const item = graph.findById(id);
    if (item) {
      highlitedRef.nodes.push(item);
      graph.updateItem(item, { style: HIGHLIGHT_STYLE });
    }
  });

  // Highlight the specified edges by ID
  edgeIds.forEach(id => {
    const item = graph.findById(id);
    if (item) {
      highlitedRef.edges.push(item);
      graph.updateItem(item, { style: HIGHLIGHT_STYLE });
    }
  });

  graph.paint();
}

/**
 * Clear previous highlights in the graph
 * @param {G6.Graph} graph - The G6 graph instance
 * @param {Object} highlitedRef - Reference object containing currently highlighted edges and nodes
 * @returns {void}
 */
export function clearPreviousHighlights(graph, highlitedRef) {
  if (!graph) return;

  highlitedRef.edges.forEach(el => graph.updateItem(el, { style: DEFAULT_EDGE.style }));
  highlitedRef.nodes.forEach(el => graph.updateItem(el, { style: DEFAULT_NODE.style }));

  highlitedRef.edges = [];
  highlitedRef.nodes = [];
}

/**
 * Initialize or update a graph with the given data
 * @param {G6.Graph} graph - The G6 graph instance
 * @param {Object} graphData - The graph data {nodes, edges, allValues}
 * @param {boolean} [doLayout=true] - Whether to adjust the layout
 * @returns {void}
 */
export function initializeGraph(graph, graphData, loadedAllValues = null, doLayout = true) {
  if (!graph) return;

  if (doLayout) {
    // First set the data
    graph.data(graphData);

    // Apply the layout using the GRAPH_LAYOUT_OPTIONS
    graph.updateLayout(GRAPH_LAYOUT_OPTIONS);

    // Render the graph
    graph.render();
  } else {
    // Use read instead of data
    graph.read(graphData);

    // If allValues were loaded from the file, apply them to the graph items
    if (loadedAllValues) {
      Object.keys(loadedAllValues).forEach(itemId => {
        const item = graph.findById(itemId); // Find node or edge by ID
        if (item) {
          // Create a new object for update to ensure G6 processes it correctly
          // and to avoid potential side effects if loadedAllValues[itemId] is reused.
          const propertiesToUpdate = { ...loadedAllValues[itemId] };
          graph.updateItem(item, propertiesToUpdate);
        } else {
          console.warn(`Item with ID ${itemId} from allValues not found in graph after reading data (during open).`);
        }
      });
    }

    // Apply the layout using the GRAPH_LAYOUT_OPTIONS_NO_GFORCE
    graph.updateLayout(GRAPH_LAYOUT_OPTIONS_NO_GFORCE);

    // Render the graph
    graph.render();
    return; // Exit after reading
  }
}

/**
 * Generate a random graph with nodes and edges
 * @param {number} [nodeCount=GRAPH_GENERATION_DEFAULTS.DEFAULT_NODE_COUNT] - Number of nodes to generate
 * @param {number} [edgeCount=GRAPH_GENERATION_DEFAULTS.DEFAULT_EDGE_COUNT] - Number of edges to generate
 * @returns {{nodes: Array<Object>, edges: Array<Object>, allValues: Object}} - The generated graph data
 */
export function generateRandomGraph(nodeCount = GRAPH_GENERATION_DEFAULTS.DEFAULT_NODE_COUNT, edgeCount = GRAPH_GENERATION_DEFAULTS.DEFAULT_EDGE_COUNT) {
  // Validate inputs
  if (typeof nodeCount !== 'number' || nodeCount <= 0) {
    throw new Error('nodeCount must be a positive number');
  }
  if (typeof edgeCount !== 'number' || edgeCount < 0) {
    throw new Error('edgeCount must be a non-negative number');
  }

  // Generate nodes
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    id: `Node${i + 1}`,
    label: `Node${i + 1}`
  }));

  // Handle edge cases
  if (nodeCount <= 1) {
    return {
      nodes,
      edges: [],
      allValues: {}
    };
  }

  const edgesSet = new Set();
  const maxPossibleEdges = nodeCount * (nodeCount - 1);
  const targetEdgeCount = Math.min(edgeCount, maxPossibleEdges);

  // Generate edges
  while (edgesSet.size < targetEdgeCount) {
    const sourceIdx = Math.floor(Math.random() * nodeCount);
    let targetIdx = Math.floor(Math.random() * nodeCount);

    // Ensure source and target are different
    while (sourceIdx === targetIdx) {
      targetIdx = Math.floor(Math.random() * nodeCount);
    }

    const source = `Node${sourceIdx + 1}`;
    const target = `Node${targetIdx + 1}`;
    const id = `${source}-${target}`;

    // Add edge if it doesn't already exist
    if (!Array.from(edgesSet).find(e => e.id === id)) {
      edgesSet.add({
        source,
        target,
        label: `Edge ${id}`,
        id
      });
    }
  }

  const edges = Array.from(edgesSet);

  // Generate allValues
  const allValues = {};
  const generateRandomValues = (entity) => {
    const numKeys = Math.floor(Math.random() * 5) + 1;
    return Array.from({ length: numKeys }, (_, i) => ({
      key: `key${i}`,
      value: `value${Math.floor(Math.random() * 100)}`
    })).reduce((obj, { key, value }) => {
      obj[key] = value;
      return obj;
    }, {});
  };

  nodes.forEach(node => {
    allValues[node.id] = generateRandomValues(node);
  });

  edges.forEach(edge => {
    allValues[edge.id] = generateRandomValues(edge);
  });

  return {
    nodes,
    edges,
    allValues
  };
}

/**
 * Applies changes to the graph data based on a change object.
 *
 * @param {Object} currentGraphData - The current graph data {nodes, edges}.
 * @param {Object} currentAllValues - The current allValues object.
 * @param {Object} changes - The changes to apply.
 * @param {Array<Object>} [changes.nodes] - Nodes to add or update.
 * @param {Array<Object>} [changes.edges] - Edges to add or update.
 * @param {Object} [changes.allValues] - Key-value pairs to add/update for specific node/edge IDs.
 * @param {Object} [changes.toDelete] - IDs of items to delete.
 * @param {Array<string>} [changes.toDelete.nodes] - Node IDs to delete.
 * @param {Array<string>} [changes.toDelete.edges] - Edge IDs to delete.
 * @param {Object} [changes.toDelete.allValues] - Object mapping entity IDs to arrays of keys to delete from their allValues.
 * @returns {Object} The new graph data after applying changes.
 */
export function applyGraphChanges(currentGraphData, currentAllValues, changes) {
  let newNodes = JSON.parse(JSON.stringify(currentGraphData.nodes || []));
  let newEdges = JSON.parse(JSON.stringify(currentGraphData.edges.map(edge => (
    { source: edge.source, target: edge.target, label: edge.label, id: edge.id })) || []));
  let newAllValues = JSON.parse(JSON.stringify(currentAllValues || {}));

  // 1. Handle Deletions
  if (changes.toDelete) {
    // Delete nodes
    if (changes.toDelete.nodes && changes.toDelete.nodes.length > 0) {
      const nodesToDeleteSet = new Set(changes.toDelete.nodes);
      newNodes = newNodes.filter(node => !nodesToDeleteSet.has(node.id));
      nodesToDeleteSet.forEach(nodeId => delete newAllValues[nodeId]);
      newEdges = newEdges.filter(edge =>
        !nodesToDeleteSet.has(edge.source) && !nodesToDeleteSet.has(edge.target)
      );
    }

    // Delete edges
    if (changes.toDelete.edges && changes.toDelete.edges.length > 0) {
      const edgesToDeleteSet = new Set(changes.toDelete.edges);
      newEdges = newEdges.filter(edge => !edgesToDeleteSet.has(edge.id));
      edgesToDeleteSet.forEach(edgeId => delete newAllValues[edgeId]);
    }

    // Delete specific keys from allValues
    if (changes.toDelete.allValues) {
      for (const entityId in changes.toDelete.allValues) {
        if (newAllValues[entityId] && changes.toDelete.allValues[entityId]) {
          const keysToDelete = changes.toDelete.allValues[entityId];
          keysToDelete.forEach(key => {
            delete newAllValues[entityId][key];
          });
          if (Object.keys(newAllValues[entityId]).length === 0) {
            delete newAllValues[entityId];
          }
        }
      }
    }
  }

  // 2. Handle Additions/Updates
  // Update/Add nodes
  if (changes.nodes && changes.nodes.length > 0) {
    const nodeMap = new Map(newNodes.map(node => [node.id, node]));
    changes.nodes.forEach(changeNode => {
      if (nodeMap.has(changeNode.id)) {
        Object.assign(nodeMap.get(changeNode.id), changeNode);
      } else {
        newNodes.push(JSON.parse(JSON.stringify(changeNode)));
        nodeMap.set(changeNode.id, newNodes[newNodes.length - 1]);
      }
    });
  }

  // Update/Add edges
  if (changes.edges && changes.edges.length > 0) {
    const edgeMap = new Map(newEdges.map(edge => [edge.id, edge]));
    const existingNodeIds = new Set(newNodes.map(n => n.id));

    changes.edges.forEach(changeEdge => {
      // Determine the source and target to check for node existence
      let checkSource = changeEdge.source;
      let checkTarget = changeEdge.target;
      const isUpdate = edgeMap.has(changeEdge.id);

      if (isUpdate) { // If it's an update, and source/target are not in changeEdge, use existing.
        const existingEdge = edgeMap.get(changeEdge.id);
        // It's possible existingEdge is undefined if changeEdge.id is not in edgeMap,
        // though isUpdate should guard this. Add a check for safety.
        if (existingEdge) {
          if (checkSource === undefined) checkSource = existingEdge.source;
          if (checkTarget === undefined) checkTarget = existingEdge.target;
        }
      }

      // If source or target are still undefined (e.g. new edge missing them, or bad existing data)
      // OR if the nodes don't exist.
      if (checkSource === undefined || checkTarget === undefined ||
        !existingNodeIds.has(checkSource) || !existingNodeIds.has(checkTarget)) {
        let reason = `its source node ('${checkSource}') or target node ('${checkTarget}') does not exist in the current node set`;
        if (checkSource === undefined || checkTarget === undefined) {
          reason = "essential source or target information is missing";
        }
        console.warn(`Skipping edge "${changeEdge.id}" because ${reason}.`);
        return;
      }

      if (edgeMap.has(changeEdge.id)) {
        Object.assign(edgeMap.get(changeEdge.id), changeEdge);
      } else {
        newEdges.push(JSON.parse(JSON.stringify(changeEdge)));
        edgeMap.set(changeEdge.id, newEdges[newEdges.length - 1]);
      }
    });
  }

  // Update/Add allValues
  if (changes.allValues) {
    for (const entityId in changes.allValues) {
      const nodeExists = newNodes.some(n => n.id === entityId);
      const edgeExists = newEdges.some(e => e.id === entityId);

      if (nodeExists || edgeExists) {
        if (!newAllValues[entityId]) {
          newAllValues[entityId] = {};
        }
        Object.assign(newAllValues[entityId], changes.allValues[entityId]);
      } else {
        console.warn(`Skipping allValues for non-existent entity ID: ${entityId}`);
      }
    }
  }

  // Ensure all nodes and edges have at least an empty object in newAllValues
  newNodes.forEach(node => {
    if (!newAllValues[node.id]) {
      newAllValues[node.id] = {};
    }
  });
  newEdges.forEach(edge => {
    if (!newAllValues[edge.id]) {
      newAllValues[edge.id] = {};
    }
  });

  return {
    nodes: newNodes,
    edges: newEdges,
    allValues: newAllValues,
  };
}
