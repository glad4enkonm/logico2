import axios from 'axios';

// Create a single, configured axios instance for all backend communication.
const apiClient = axios.create({
  baseURL: 'http://localhost:8000', // The base URL for the backend API
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Triggers the Neo4j synchronization process on the backend.
 * @returns {Promise} A promise that resolves with the response from the server.
 */
export const syncNeo4j = () => {
  return apiClient.post('/sync-neo4j');
};

/**
 * Performs a semantic search for a single most relevant node.
 * @param {Object} graph_data - The current graph data from the frontend.
 * @param {string} query - The search query string.
 * @returns {Promise} A promise that resolves with the search results.
 */
export const searchByEmbedding = (graph_data, query) => {
  return apiClient.post('/search', { graph_data, query });
};

/**
 * Performs a structured search for all matching graph patterns.
 * @param {Object} graph_data - The current graph data from the frontend.
 * @param {Object} query - The structured search query.
 * @returns {Promise} A promise that resolves with the search results.
 */
export const searchAll = (graph_data, query) => {
  return apiClient.post('/searchAll', { graph_data, query });
};
