import G6 from '@antv/g6';

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

/**
 * Adjust the layout of a G6 graph
 * @param {G6.Graph} graph - The G6 graph instance
 * @param {number} [nodeSpacing=1000] - The spacing between nodes
 */
export function adjustLayout(graph, nodeSpacing = 1000) {
  // Get the graph data
  let data = graph.save();

  // Adjust nodeSpacing based on the number of nodes
  nodeSpacing = Math.sqrt(data.nodes.length) * nodeSpacing;

  // Adjust center based on the graph size
  let center = [graph.getWidth() / 2, graph.getHeight() / 2];

  // Update the layout configuration
  graph.updateLayout({
    nodeSpacing: nodeSpacing,
    center: center,
    // other layout parameters...
  });

  // Re-render the graph
  graph.render();
}