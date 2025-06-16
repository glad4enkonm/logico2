import { searchAll } from '../api';
import { API_BASE_URL } from '../constants/appConstants';

/**
 * Validate the structure of the JSON content
 * @param {string} content - The JSON string to validate
 * @returns {Object} - The parsed JSON object if valid
 * @throws {Error} - If the JSON is invalid or has incorrect structure
 */
const validateJsonStructure = (content) => {
  let parsedInput;
  try {
    parsedInput = JSON.parse(content);

    // Validate objects array
    if (!parsedInput.objects || !Array.isArray(parsedInput.objects)) {
      throw new Error('Invalid objects structure');
    }

    // Validate each object in the objects array
    for (const obj of parsedInput.objects) {
      if (typeof obj.name !== 'string' ||
          typeof obj.type !== 'string' ||
          typeof obj.attributes !== 'object' ||
          typeof obj.definition !== 'string' ||
          typeof obj.context !== 'string') {
        throw new Error('Invalid object structure');
      }
    }

    // Validate relations array
    if (!parsedInput.relations || !Array.isArray(parsedInput.relations)) {
      throw new Error('Invalid relations structure');
    }

    // Validate each relation in the relations array
    for (const relation of parsedInput.relations) {
      if (typeof relation.type !== 'string' ||
          typeof relation.source !== 'string' ||
          typeof relation.target !== 'string' ||
          typeof relation.definition !== 'string' ||
          typeof relation.context !== 'string') {
        throw new Error('Invalid relation structure');
      }
    }

    return parsedInput;
  } catch (error) {
    if (error.message.includes('Invalid objects structure') ||
        error.message.includes('Invalid object structure') ||
        error.message.includes('Invalid relations structure') ||
        error.message.includes('Invalid relation structure')) {
      throw error;
    }
    console.error('Invalid JSON input:', error);
    throw new Error('Invalid JSON structure');
  }
};

/**
 * Validate the structure of the response data
 * @param {Object} responseData - The response data to validate
 * @returns {Object} - The validated response data
 * @throws {Error} - If the response data is invalid
 */
const validateResponseData = (responseData) => {
  if (responseData && typeof responseData === 'object') {
    const { nodes: matchedNodes, edges: matchedEdges, links } = responseData;

    // Validate the returned data
    if (matchedNodes && !Array.isArray(matchedNodes)) {
      throw new Error('Invalid response structure: matchedNodes is not an array');
    }
    if (matchedEdges && !Array.isArray(matchedEdges)) {
      throw new Error('Invalid response structure: matchedEdges is not an array');
    }
    if (links && !Array.isArray(links)) {
      throw new Error('Invalid response structure: links is not an array');
    }

    return {
      nodes: matchedNodes || [],
      edges: matchedEdges || [],
      links: links || []
    };
  } else {
    throw new Error('Invalid response from server');
  }
};

/**
 * Find all nodes and edges in the graph that match the query content
 * @param {string} content - The content to search for (JSON string with objects and relations)
 * @param {Object} graphData - The graph data to filter and send to the backend
 * @param {Array} graphData.nodes - Array of nodes
 * @param {Array} graphData.edges - Array of edges
 * @param {Object} graphData.allValues - Key-value data for nodes/edges
 * @returns {Promise<Object>} - A promise that resolves with the filtered graph data
 */
const findAllEffect = async (content, graphData) => {
  try {
    // Validate the JSON structure before proceeding
    const parsedContent = validateJsonStructure(content);

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

    // Send the data to the backend with the query
    const response = await searchAll(
      {
        nodes: filteredNodes,
        edges: filteredEdges,
        allValues: allValues || {},
      },
      parsedContent
    );

    // Validate the response data
    return validateResponseData(response.data);
  } catch (error) {
    console.error('Error fetching or loading graph data:', error);
    throw new Error('Failed to load graph data');
  }
};

export { validateJsonStructure, validateResponseData };
export default findAllEffect;