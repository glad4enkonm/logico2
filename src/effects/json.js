import { initializeGraph, applyGraphChanges } from '@/utils/graphUtil';

/**
 * Handles the JSON data effect.
 * @param {Object} graph - The G6 graph instance
 * @param {Object} graphDataRef - Reference to the graph data store (e.g., a ref's .current object).
 * @param {Object} allValuesRef - Reference to the allValues store (e.g., a ref's .current object).
 * @param {Object} highlitedRef - Reference to the highlighted elements store (e.g., a ref object).
 */
export function handleJsonDiffEffect(graph, graphDataRef, allValuesRef, highlitedRef) {
  return (jsonData) => {
    try {
      const data = JSON.parse(jsonData);
      const { nodes, edges, allValues, toDelete } = data;

      // Check if any of the required fields are present
      if (!nodes && !edges && !allValues && !toDelete) {
        alert('Invalid JSON format. Please provide valid graph data.');
        return;
      }

      // Apply changes incrementally instead of replacing entire structure
      const changes = {
        nodes,
        edges,
        allValues,
        toDelete
      };

      const newGraphData = applyGraphChanges(graphDataRef.current, changes);
      graphDataRef.current.nodes = newGraphData.nodes;
      graphDataRef.current.edges = newGraphData.edges;
      allValuesRef.current = newGraphData.allValues;

      if (graph) {
        initializeGraph(graph, graphDataRef.current, false);

        if (highlitedRef && highlitedRef.current) {
          highlitedRef.current.nodes = [];
          highlitedRef.current.edges = [];
        }
      }
    } catch (error) {
      alert('Invalid JSON format. Please check your input.');
    }
  };
}