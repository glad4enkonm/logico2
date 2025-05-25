import { initializeGraph } from '@/utils/graphUtil';

/**
 * Handles the JSON data effect.
 * @param {Object} graph - The G6 graph instance
 * @param {Object} graphDataRef - Reference to the graph data store (e.g., a ref's .current object).
 * @param {Object} allValuesRef - Reference to the allValues store (e.g., a ref's .current object).
 * @param {Object} highlitedRef - Reference to the highlighted elements store (e.g., a ref object).
 */
export function handleJsonEffect(graph, graphDataRef, allValuesRef, highlitedRef) {
  return (jsonData) => {
    try {
      const data = JSON.parse(jsonData);
      const { nodes, edges, allValues } = data;

      if (nodes && edges && allValues) {
        graphDataRef.current.nodes = nodes;
        graphDataRef.current.edges = edges;
        allValuesRef.current = allValues;

        if (graph) {
          initializeGraph(graph, graphDataRef.current, true);

          if (highlitedRef && highlitedRef.current) {
            highlitedRef.current.nodes = [];
            highlitedRef.current.edges = [];
          }
        }
      } else {
        alert('Invalid JSON format. Please provide valid graph data.');
      }
    } catch (error) {
      alert('Invalid JSON format. Please check your input.');
    }
  };
}