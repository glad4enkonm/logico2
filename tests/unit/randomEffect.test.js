import { handleRandomEffect } from '@/effects/random';
import { generateRandomGraph, adjustLayout } from '@/utils/graphUtil';

jest.mock('../../src/utils/graphUtil');

describe('randomEffect', () => {
  test('handleRandomEffect processes random event', () => {
    const graph = { data: jest.fn(), render: jest.fn(), paint: jest.fn() };
    const graphData = { nodes: [], edges: [] };
    const allValues = {};

    const handler = handleRandomEffect(graph, graphData, allValues);

    // Mock the generateRandomGraph return value
    generateRandomGraph.mockReturnValue({
      nodes: [{ id: '1' }],
      edges: [{ id: '1' }],
      allValues: { key: 'value' }
    });

    handler({ detail: 'random' });

    expect(graphData.nodes).toHaveLength(1);
    expect(graphData.edges).toHaveLength(1);
    expect(graph.data).toHaveBeenCalledWith(graphData);
    expect(graph.render).toHaveBeenCalled();
    expect(adjustLayout).toHaveBeenCalledWith(graph);
    expect(graph.paint).toHaveBeenCalled();
  });
});