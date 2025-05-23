import { generateRandomGraph, adjustLayout } from '../utils/graphUtil';

/**
 * Handles the random graph generation effect.
 * @param {Object} graph - The G6 graph instance
 * @param {Object} graphData - Reference to store graph data
 * @param {Object} allValues - Reference to store all values
 */
export function handleRandomEffect(graph, graphData, allValues) {
  return (evt) => {
    if (evt.detail === 'random') {
      const { nodes, edges, allValues: values } = generateRandomGraph(30, 60);
      graphData = { nodes, edges };
      allValues = values;
      if (graph) {
        graph.data(graphData);
        graph.render();
        adjustLayout(graph);
        graph.paint();
      }
    }
  };
}