import { generateRandomGraph, initializeGraph, applyGraphChanges } from '../../src/utils/graphUtil';
import G6 from '@antv/g6';
import { GRAPH_LAYOUT_OPTIONS, GRAPH_LAYOUT_OPTIONS_NO_GFORCE } from '../../src/constants/appConstants';

jest.mock('@antv/g6', () => {
  return {
    Graph: jest.fn().mockImplementation(() => {
      return {
        save: jest.fn(),
        data: jest.fn(),
        layout: jest.fn(),
        updateLayout: jest.fn(), // Add the updateLayout method
        read: jest.fn(),
        render: jest.fn(),
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
      expect(mockGraph.render).toHaveBeenCalled();
      expect(mockGraph.read).not.toHaveBeenCalled();
    });

    test('should not apply layout and use graph.read when doLayout is false', () => {
      initializeGraph(mockGraph, graphData, false);
      expect(mockGraph.read).toHaveBeenCalledWith(graphData);
      expect(mockGraph.render).toHaveBeenCalled();
      expect(mockGraph.data).not.toHaveBeenCalled();
      expect(mockGraph.updateLayout).toHaveBeenCalledWith(GRAPH_LAYOUT_OPTIONS_NO_GFORCE);
    });

    test('should default to doLayout = true if not specified', () => {
      initializeGraph(mockGraph, graphData); // doLayout is omitted
      expect(mockGraph.data).toHaveBeenCalledWith(graphData);
      expect(mockGraph.updateLayout).toHaveBeenCalledWith(GRAPH_LAYOUT_OPTIONS);
      expect(mockGraph.render).toHaveBeenCalled();
      expect(mockGraph.read).not.toHaveBeenCalled();
    });
  });

  describe('applyGraphChanges', () => {
    const baseGraphData = {
      nodes: [
        { id: 'node1', label: 'Node 1' },
        { id: 'node2', label: 'Node 2' }
      ],
      edges: [
        { id: 'edge1', source: 'node1', target: 'node2', label: 'Edge 1' }
      ],
      allValues: {
        node1: { key1: 'value1' },
        node2: { key2: 'value2' },
        edge1: { key3: 'value3' }
      }
    };

    test('should add new nodes', () => {
      const changes = {
        nodes: [{ id: 'node3', label: 'Node 3' }]
      };
      const result = applyGraphChanges(baseGraphData, changes);
      expect(result.nodes).toHaveLength(3);
      expect(result.nodes.find(n => n.id === 'node3')).toBeDefined();
      expect(result.allValues.node3).toEqual({});
    });

    test('should update existing nodes', () => {
      const changes = {
        nodes: [{ id: 'node1', label: 'Updated Node 1' }]
      };
      const result = applyGraphChanges(baseGraphData, changes);
      expect(result.nodes.find(n => n.id === 'node1').label).toBe('Updated Node 1');
    });

    test('should add new edges', () => {
      const changes = {
        edges: [{ id: 'edge2', source: 'node1', target: 'node2', label: 'Edge 2' }]
      };
      const result = applyGraphChanges(baseGraphData, changes);
      expect(result.edges).toHaveLength(2);
      expect(result.edges.find(e => e.id === 'edge2')).toBeDefined();
      expect(result.allValues.edge2).toEqual({});
    });

    test('should update existing edges', () => {
      const changes = {
        edges: [{ id: 'edge1', label: 'Updated Edge 1' }]
      };
      const result = applyGraphChanges(baseGraphData, changes);
      expect(result.edges.find(e => e.id === 'edge1').label).toBe('Updated Edge 1');
    });

    test('should add/update allValues', () => {
      const changes = {
        allValues: {
          node1: { key2: 'newValue' },
          node3: { key1: 'value1' }
        }
      };
      const result = applyGraphChanges(baseGraphData, changes);
      expect(result.allValues.node1.key2).toBe('newValue');
      expect(result.allValues.node3).toBeUndefined(); // node3 does not exist, so its allValues should not be set.

      // Check that original allValues are still present
      expect(result.allValues.node1.key1).toBe('value1'); // Original value for node1
      expect(result.allValues.node2.key2).toBe('value2'); // Original value for node2
      expect(result.allValues.edge1.key3).toBe('value3'); // Original value for edge1
    });

    test('should delete nodes', () => {
      const changes = {
        toDelete: {
          nodes: ['node1']
        }
      };
      const result = applyGraphChanges(baseGraphData, changes);
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes.find(n => n.id === 'node1')).toBeUndefined();
      expect(result.allValues.node1).toBeUndefined();
      expect(result.edges).toHaveLength(0); // Edge connecting to deleted node should be removed
    });

    test('should delete edges', () => {
      const changes = {
        toDelete: {
          edges: ['edge1']
        }
      };
      const result = applyGraphChanges(baseGraphData, changes);
      expect(result.edges).toHaveLength(0);
      expect(result.allValues.edge1).toBeUndefined();
    });

    test('should delete specific keys from allValues', () => {
      const changes = {
        toDelete: {
          allValues: {
            node1: ['key1'],
            node2: ['key2']
          }
        }
      };
      const result = applyGraphChanges(baseGraphData, changes);
      expect(result.allValues.node1).toEqual({});
      expect(result.allValues.node2).toEqual({});
    });

    test('should handle complex changes', () => {
      const changes = {
        nodes: [{ id: 'node3', label: 'Node 3' }],
        edges: [{ id: 'edge2', source: 'node1', target: 'node2', label: 'Edge 2' }],
        allValues: {
          node1: { key2: 'newValue' },
          node3: { key1: 'value1' }
        },
        toDelete: {
          nodes: ['node2'],
          edges: ['edge1'],
          allValues: {
            node1: ['key1']
          }
        }
      };
      const result = applyGraphChanges(baseGraphData, changes);
      expect(result.nodes).toHaveLength(2); // Original + new node
      expect(result.edges).toHaveLength(0); // edge1 is deleted. edge2 (n1->n2) cannot be added as n2 is deleted.
      expect(result.allValues.node1).toEqual({ key2: 'newValue' });
      expect(result.allValues.node3).toEqual({ key1: 'value1' });
      expect(result.allValues.node2).toBeUndefined();
      expect(result.allValues.edge1).toBeUndefined();
    });

    test('should warn when trying to add edges with non-existent nodes', () => {
      console.warn = jest.fn();
      const changes = {
        edges: [{ id: 'edge2', source: 'node1', target: 'node99', label: 'Edge 2' }]
      };
      applyGraphChanges(baseGraphData, changes);
      expect(console.warn).toHaveBeenCalledWith(
        "Skipping edge \"edge2\" because its source node ('node1') or target node ('node99') does not exist in the current node set."
      );
    });

    test('should warn when trying to update allValues for non-existent entities', () => {
      console.warn = jest.fn();
      const changes = {
        allValues: {
          node99: { key1: 'value1' }
        }
      };
      applyGraphChanges(baseGraphData, changes);
      expect(console.warn).toHaveBeenCalledWith(
        'Skipping allValues for non-existent entity ID: node99'
      );
    });
  });
});