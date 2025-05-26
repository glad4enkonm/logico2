import { handleJsonDiffEffect } from '../../src/effects/json';
import { initializeGraph } from '../../src/utils/graphUtil';

jest.mock('../../src/utils/graphUtil', () => ({
  initializeGraph: jest.fn(),
  applyGraphChanges: jest.fn((currentData, changes) => {
    // Return a structure that mimics the output of applyGraphChanges
    // based on the input changes for testing purposes.
    return {
      nodes: changes.nodes || (currentData ? currentData.nodes : []),
      edges: changes.edges || (currentData ? currentData.edges : []),
      allValues: changes.allValues || (currentData ? currentData.allValues : {}),
    };
  }),
}));

describe('jsonEffect', () => {
  let mockGraph;
  let mockGraphDataRef;
  let mockAllValuesRef;
  let mockHighlitedRef;
  let jsonHandler;

  beforeEach(() => {
    mockGraph = { clear: jest.fn() };
    mockGraphDataRef = { current: { nodes: [], edges: [] } };
    mockAllValuesRef = { current: {} };
    mockHighlitedRef = { current: { nodes: ['node1'], edges: ['edge1'] } };
    jsonHandler = handleJsonDiffEffect(mockGraph, mockGraphDataRef, mockAllValuesRef, mockHighlitedRef);
    initializeGraph.mockClear();
  });

  it('should parse valid JSON and update refs', () => {
    const testData = {
      nodes: [{ id: '1' }],
      edges: [{ source: '1', target: '2' }],
      allValues: { '1': { value: 10 } }
    };

    jsonHandler(JSON.stringify(testData));

    expect(mockGraphDataRef.current.nodes).toEqual(testData.nodes);
    expect(mockGraphDataRef.current.edges).toEqual(testData.edges);
    expect(mockAllValuesRef.current).toEqual(testData.allValues);
  });

  it('should initialize graph when provided', () => {
    const testData = {
      nodes: [{ id: '1' }],
      edges: [{ source: '1', target: '2' }],
      allValues: { '1': { value: 10 } }
    };

    jsonHandler(JSON.stringify(testData));

    expect(initializeGraph).toHaveBeenCalledWith(
      mockGraph,
      mockGraphDataRef.current,
      false
    );
  });

  it('should clear highlighted elements when provided', () => {
    const testData = {
      nodes: [{ id: '1' }],
      edges: [{ source: '1', target: '2' }],
      allValues: { '1': { value: 10 } }
    };

    jsonHandler(JSON.stringify(testData));

    expect(mockHighlitedRef.current.nodes).toEqual([]);
    expect(mockHighlitedRef.current.edges).toEqual([]);
  });

  it('should throw error for invalid JSON string', () => {
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    jsonHandler('invalid json');

    expect(alertSpy).toHaveBeenCalledWith('Invalid JSON format. Please check your input.');
    alertSpy.mockRestore();
  });

  it('should throw error for JSON missing all required fields', () => {
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    // Test with empty object - no fields at all
    jsonHandler(JSON.stringify({}));

    expect(alertSpy).toHaveBeenCalledWith('Invalid JSON format. Please provide valid graph data.');

    alertSpy.mockRestore();
  });
});