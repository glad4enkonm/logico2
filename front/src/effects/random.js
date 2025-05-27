import { generateRandomGraph, initializeGraph } from '../utils/graphUtil';
import { GRAPH_GENERATION_DEFAULTS } from '../constants/appConstants';

/**
 * Handles the random graph generation effect.
 * @param {Object} graph - The G6 graph instance
 * @param {Object} graphDataRef - Reference to the graph data store (e.g., a ref's .current object).
 * @param {Object} allValuesRef - Reference to the allValues store (e.g., a ref's .current object).
 * @param {Object} highlitedRef - Reference to the highlighted elements store (e.g., a ref object).
 */
export function handleRandomEffect(graph, graphDataRef, allValuesRef, highlitedRef) {
  return (evt) => {
    if (evt.detail === 'random') { // Restoring the check for event detail
      // The original function used generateRandomGraph, let's assume it's available.
      // If generateRandomGraphData is the one from graphUtil, it returns { graphData, allValues }
      // Let's align with the structure used in the test mocks for generateRandomGraphData
      // const { graphData: newGraphDataContent, allValues: newAllValues } = generateRandomGraphData(graph);
      // For now, sticking to the original generateRandomGraph if it's different.
      // Assuming generateRandomGraph is the intended source here:

      // Use default values from constants
      const { nodes, edges, allValues: newAllValuesData } = generateRandomGraph(
        GRAPH_GENERATION_DEFAULTS.DEFAULT_NODE_COUNT,
        GRAPH_GENERATION_DEFAULTS.DEFAULT_EDGE_COUNT
      );

      graphDataRef.current.nodes = nodes;
      graphDataRef.current.edges = edges;
      // Object.assign(allValuesRef.current, newAllValuesData); // If allValuesRef.current is an object to be merged
      allValuesRef.current = newAllValuesData; // If allValuesRef.current should be replaced

      if (graph) {
        // Use initializeGraph with doLayout = true to apply the GForce layout
        initializeGraph(graph, graphDataRef.current, true);

        // Clear highlights as they are now stale
        if (highlitedRef && highlitedRef.current) {
          highlitedRef.current.nodes = [];
          highlitedRef.current.edges = [];
        }
        // Potentially also reset selectedElementValues and selectedElementLabel in App.js
        // if this effect should also clear the side panel.
        // For now, just clearing the G6 highlights.
      }
    } // End of if (evt.detail === 'random')
  };
}