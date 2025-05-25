import G6 from '@antv/g6';
import { GRAPH_LAYOUT_OPTIONS } from '../constants/appConstants';

/**
 * Initialize or update a graph with the given data
 * @param {G6.Graph} graph - The G6 graph instance
 * @param {Object} graphData - The graph data {nodes, edges}
 * @param {boolean} [doLayout=true] - Whether to adjust the layout
 * @returns {void}
 */
export function initializeGraph(graph, graphData, doLayout = true) {
  if (!graph) return;

  if (doLayout) {
    // Apply gForce layout (e.g., for random graph)
    graph.data(graphData); // Load data first
    graph.updateLayout(GRAPH_LAYOUT_OPTIONS); // Configure the layout
    graph.layout(); // Execute the layout algorithm
    graph.render(); // Render the graph with the new layout
  } else {
    // Load data and preserve positions (e.g., opening a file, new empty graph)
    // graph.read() loads data AND renders, respecting x/y in graphData.
    // If graphData is empty (new graph), nodes will not have positions until manually set or a layout is applied.
    graph.read(graphData);
  }
  graph.paint(); // Good practice to ensure canvas is up-to-date
}

/**
 * Generate a random graph with nodes and edges
 * @param {number} nodeCount - Number of nodes to generate
 * @param {number} edgeCount - Number of edges to generate
 * @returns {{nodes: Array, edges: Array, allValues: Object}} - The generated graph data
 */
export function generateRandomGraph(nodeCount = 30, edgeCount = 60) {
  const nodes = [...Array(nodeCount)].map((_, i) => ({ id: `Node${i + 1}`, label: `Node${i + 1}` }));
  let edges = new Set();

  while (edges.size < edgeCount) {
    const source = `Node${Math.floor(Math.random() * nodeCount) + 1}`;
    const target = `Node${Math.floor(Math.random() * nodeCount) + 1}`;
    const label = `${source}To${target}`;
    const id = label;

    // Add the edge to the set. If the edge already exists, it won't be added again.
    edges.add({ source, target, label, id });
  }

  // Convert the set back to an array.
  edges = Array.from(edges);

  // Generating some key value data
  const allValues = {};
  nodes.forEach(e => allValues[e.id] = [...Array(Math.floor(Math.random() * 50) + 1)].reduce((o, _, i) => (o['key' + i] = 'value' + Math.floor(Math.random() * 100), o), {}));
  edges.forEach(e => allValues[e.id] = [...Array(Math.floor(Math.random() * 50) + 1)].reduce((o, _, i) => (o['key' + i] = 'value' + Math.floor(Math.random() * 100), o), {}));

  return {
    nodes,
    edges,
    allValues
  };
}