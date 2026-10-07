import axios from 'axios';
import { API_BASE_URL } from '../constants/appConstants';

// Single configured axios instance for all backend communication.
// API_BASE_URL resolves to same-origin in production builds (step 4).
const apiClient = axios.create({
  baseURL: API_BASE_URL,
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

// --- MCP-era endpoints (steps 2-3) -----------------------------------------

/**
 * Write node coordinates back to the backend after layout stabilizes or a
 * node drag ends (D8). Silent merge on the server — no SSE echo, no loops.
 * @param {string} graphId
 * @param {Array<{id: string, x: number, y: number}>} positions
 */
export const postPositions = (graphId, positions) => {
  return apiClient.post(`/${graphId}/positions`, { positions });
};
