import { generateRandomGraph, initializeGraph } from '../utils/graphUtil';

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
      const { nodes, edges, allValues: newAllValuesData } = generateRandomGraph(30, 60); // Original call

      graphDataRef.current.nodes = nodes;
      graphDataRef.current.edges = edges;
      // Object.assign(allValuesRef.current, newAllValuesData); // If allValuesRef.current is an object to be merged
      allValuesRef.current = newAllValuesData; // If allValuesRef.current should be replaced

      if (graph) {
        initializeGraph(graph, graphDataRef.current, true); // Pass true for doLayout
        
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