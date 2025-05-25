import { generateRandomGraph, initializeGraph } from '@/utils/graphUtil';
import G6 from '@antv/g6';
import { GRAPH_LAYOUT_OPTIONS } from '@/constants/appConstants';

jest.mock('@antv/g6', () => {
  return {
    Graph: jest.fn().mockImplementation(() => {
      return {
        save: jest.fn(),
        updateLayout: jest.fn(),
        getWidth: jest.fn().mockReturnValue(800),
        getHeight: jest.fn().mockReturnValue(600),
        render: jest.fn(),
        data: jest.fn(),
        layout: jest.fn(),
        read: jest.fn(),
        paint: jest.fn(),
      };
    })
  };
});

describe('graphUtil', () => {
  let mockGraph;

  beforeEach(() => {
    // Create a new mock graph instance for each test
    mockGraph = new G6.Graph({
      container: 'test-container',
      width: 800,
      height: 600,
    });
  });

  test('generateRandomGraph creates correct number of nodes and edges', () => {
    const { nodes, edges } = generateRandomGraph(10, 20);
    expect(nodes).toHaveLength(10);
    expect(edges).toHaveLength(20);
  });

  describe('initializeGraph', () => {
    const graphData = { nodes: [{ id: '1' }], edges: [] };

    test('should not do anything if graph is null', () => {
      initializeGraph(null, graphData);
      // No explicit assertions needed, just checking it doesn't throw
    });

    test('should apply layout when doLayout is true', () => {
      initializeGraph(mockGraph, graphData, true);
      expect(mockGraph.data).toHaveBeenCalledWith(graphData);
      expect(mockGraph.updateLayout).toHaveBeenCalledWith(GRAPH_LAYOUT_OPTIONS);
      expect(mockGraph.layout).toHaveBeenCalled();
      expect(mockGraph.render).toHaveBeenCalled();
      expect(mockGraph.paint).toHaveBeenCalled();
      expect(mockGraph.read).not.toHaveBeenCalled();
    });

    test('should not apply layout and use graph.read when doLayout is false', () => {
      initializeGraph(mockGraph, graphData, false);
      expect(mockGraph.read).toHaveBeenCalledWith(graphData);
      expect(mockGraph.paint).toHaveBeenCalled();
      expect(mockGraph.data).not.toHaveBeenCalled();
      expect(mockGraph.updateLayout).not.toHaveBeenCalled();
      expect(mockGraph.layout).not.toHaveBeenCalled();
      // mockGraph.render might be called by graph.read internally, so not strictly checking against it.
    });

    test('should default to doLayout = true if not specified', () => {
      initializeGraph(mockGraph, graphData); // doLayout is omitted
      expect(mockGraph.data).toHaveBeenCalledWith(graphData);
      expect(mockGraph.updateLayout).toHaveBeenCalledWith(GRAPH_LAYOUT_OPTIONS);
      expect(mockGraph.layout).toHaveBeenCalled();
      expect(mockGraph.render).toHaveBeenCalled();
      expect(mockGraph.paint).toHaveBeenCalled();
      expect(mockGraph.read).not.toHaveBeenCalled();
    });
  });
});