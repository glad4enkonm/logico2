import { initializeGraph } from '../utils/graphUtil';

/**
 * Handles the new graph effect.
 * @param {Object} graph - The G6 graph instance
 * @param {Object} graphData - Reference to store graph data
 * @param {Object} allValues - Reference to store all values
 */
export function handleNewEffect(graph, graphData, allValues) {
  return (evt) => {
    if (evt.detail === 'new') {
      if (graph) {
        // Reset graph data to empty state
        graphData.nodes = [];
        graphData.edges = [];
        Object.keys(allValues).forEach(key => delete allValues[key]);

        initializeGraph(graph, graphData, false);
      }
    }
  };
}