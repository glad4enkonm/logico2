import { handleOpenEffect } from '@/effects/open';
import { readFile } from '@/utils/fileUtil';

jest.mock('../../src/utils/fileUtil');

describe('handleOpenEffect', () => {
  let graph;
  let graphData;
  let allValues;
  let handleOpenClick;

  beforeEach(() => {
    graph = {
      save: jest.fn(),
      changeData: jest.fn(),
      getEdges: jest.fn(() => []),
      getNodes: jest.fn(() => []),
      updateItem: jest.fn(),
      paint: jest.fn(),
    };
    graphData = { nodes: [], edges: [] };
    allValues = {};

    handleOpenClick = handleOpenEffect(graph, graphData, allValues);
  });

  it('should not handle non-open events', () => {
    const evt = { detail: 'random' };
    handleOpenClick(evt);
    expect(readFile).not.toHaveBeenCalled();
  });

 
});