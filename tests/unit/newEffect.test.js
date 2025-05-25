import { handleNewEffect } from '@/effects/new';
import { initializeGraph } from '@/utils/graphUtil';

jest.mock('@/utils/graphUtil', () => ({
  initializeGraph: jest.fn(),
}));

describe('newEffect', () => {
  let mockGraph;
  let graphData;
  let allValues;

  beforeEach(() => {
    // Reset mocks before each test
    initializeGraph.mockClear();

    mockGraph = {
      // Mock any methods of graph that handleNewEffect might call directly,
      // though it primarily delegates to initializeGraph.
    };
    graphData = { nodes: [{ id: 'oldNode' }], edges: [{ id: 'oldEdge' }] };
    allValues = { oldKey: 'oldValue' };
  });

  test('handleNewEffect processes "new" event, clears data, and calls initializeGraph without layout', () => {
    const handler = handleNewEffect(mockGraph, graphData, allValues);
    handler({ detail: 'new' });

    expect(graphData.nodes).toEqual([]);
    expect(graphData.edges).toEqual([]);
    expect(allValues).toEqual({});

    expect(initializeGraph).toHaveBeenCalledTimes(1);
    // Ensure initializeGraph is called with doLayout = false
    expect(initializeGraph).toHaveBeenCalledWith(mockGraph, graphData, false);
  });

  test('handleNewEffect does nothing if graph instance is not available', () => {
    const handler = handleNewEffect(null, graphData, allValues);
    handler({ detail: 'new' });

    // Data should not be cleared if graph is null
    expect(graphData.nodes).toEqual([{ id: 'oldNode' }]);
    expect(allValues).toEqual({ oldKey: 'oldValue' });
    expect(initializeGraph).not.toHaveBeenCalled();
  });

  test('handleNewEffect does nothing if event detail is not "new"', () => {
    const handler = handleNewEffect(mockGraph, graphData, allValues);
    handler({ detail: 'not-new' });

    expect(graphData.nodes).toEqual([{ id: 'oldNode' }]);
    expect(allValues).toEqual({ oldKey: 'oldValue' });
    expect(initializeGraph).not.toHaveBeenCalled();
  });
});