import { adjustLayout } from '../utils/graphUtil';

/**
 * Handles the new graph effect.
 * @param {Object} graph - The G6 graph instance
 * @param {Object} graphData - Reference to store graph data
 * @param {Object} allValues - Reference to store all values
 */
export function handleNewEffect(graph, graphData, allValues) {
  return (evt) => {
    if (evt.detail === 'new') {
      // Reset graph data to empty state
      graphData.nodes = [];
      graphData.edges = [];
      Object.keys(allValues).forEach(key => delete allValues[key]);

      if (graph) {
        graph.data(graphData);
        graph.render();
        adjustLayout(graph);
        graph.paint();
      }
    }
  };
}