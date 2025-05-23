import { generateRandomGraph, adjustLayout } from '../../src/utils/graphUtil';
import G6 from '@antv/g6';

jest.mock('@antv/g6', () => {
  return {
    Graph: jest.fn().mockImplementation(() => {
      return {
        save: jest.fn(),
        updateLayout: jest.fn(),
        getWidth: jest.fn().mockReturnValue(800),
        getHeight: jest.fn().mockReturnValue(600),
        render: jest.fn()
      };
    })
  };
});

describe('graphUtil', () => {
  test('generateRandomGraph creates correct number of nodes and edges', () => {
    const { nodes, edges } = generateRandomGraph(10, 20);
    expect(nodes).toHaveLength(10);
    expect(edges).toHaveLength(20);
  });

  test('adjustLayout modifies graph layout', () => {
    const graph = new G6.Graph({
      container: 'test-container',
      width: 800,
      height: 600,
    });

    // Mock the save and updateLayout methods
    graph.save = jest.fn().mockReturnValue({ nodes: [{ id: '1' }] });

    adjustLayout(graph, 500);

    expect(graph.save).toHaveBeenCalled();
    expect(graph.updateLayout).toHaveBeenCalledWith(expect.objectContaining({
      nodeSpacing: expect.any(Number),
      center: expect.any(Array),
    }));
  });
});