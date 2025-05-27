import axios from 'axios';
import { API_BASE_URL } from '../constants/appConstants';

/**
 * Find random nodes and edges in the graph and highlight them
 * @param {string} content - The content to search for (could be a query or embedding)
 * @param {Object} graphData - The graph data to filter and send to the backend
 * @param {Array} graphData.nodes - Array of nodes
 * @param {Array} graphData.edges - Array of edges
 * @param {Object} graphData.allValues - Key-value data for nodes/edges
 * @returns {Promise<Object>} - A promise that resolves with the filtered graph data
 */
const findByEmbeddingEffect = async (content, graphData) => {
  try {
    const { nodes, edges, allValues } = graphData;

    // Filter to match the backend's GraphData model
    const filteredNodes = nodes.map(node => ({
      id: node.id,
      label: node.label,
    }));

    const filteredEdges = edges.map(edge => ({
      source: edge.source,
      target: edge.target,
      label: edge.label,
      id: edge.id, // Include id as required by the backend model
    }));

    // Send the data to the backend
    await axios.post(`${API_BASE_URL}/load-graph`, {
      nodes: filteredNodes,
      edges: filteredEdges,
      allValues: allValues || {} // Include allValues if available
    });

    // Get random nodes and edges
    const randomNodes = getRandomElements(nodes, 3); // Get 3 random nodes
    const randomEdges = getRandomElements(edges, 3); // Get 3 random edges

    // Return the filtered data
    return {
      nodes: randomNodes,
      edges: randomEdges
    };
  } catch (error) {
    console.error('Error fetching or loading graph data:', error);
    throw new Error('Failed to load graph data');
  }
};

/**
 * Get random elements from an array
 * @param {Array} array - The array to get random elements from
 * @param {number} count - The number of random elements to get
 * @returns {Array} - An array of random elements
 */
function getRandomElements(array, count) {
  if (array.length === 0 || count <= 0) {
    return [];
  }

  const result = [];
  const arrayCopy = [...array]; // Create a copy to avoid modifying the original

  for (let i = 0; i < count && arrayCopy.length > 0; i++) {
    const randomIndex = Math.floor(Math.random() * arrayCopy.length);
    result.push(arrayCopy[randomIndex]);
    arrayCopy.splice(randomIndex, 1); // Remove the selected element
  }

  return result;
}

export default findByEmbeddingEffect;