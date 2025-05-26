import { handleOpenEffect } from '@/effects/open';
import { readFile } from '@/utils/fileUtil';
import { initializeGraph } from '@/utils/graphUtil';

jest.mock('@/utils/fileUtil');
jest.mock('@/utils/graphUtil', () => ({
  initializeGraph: jest.fn(),
}));

describe('handleOpenEffect', () => {
  let mockGraph;
  let mockGraphRef;
  let graphData;
  let allValues;
  let handler;
  let mockFileInput;

  beforeEach(() => {
    // Clear mocks
    readFile.mockClear();
    initializeGraph.mockClear();

    mockGraph = {
      // Mock any graph methods if directly called by openEffect,
      // though it primarily delegates to initializeGraph for graph updates.
    };
    mockGraphRef = { current: mockGraph };
    graphData = { nodes: [], edges: [] };
    allValues = { initialKey: 'initialValue' }; // To test clearing

    handler = handleOpenEffect(mockGraphRef, graphData, allValues);

    // Mock file input
    mockFileInput = {
      type: '',
      accept: '',
      style: { display: '' },
      files: null,
      click: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    jest.spyOn(document, 'createElement').mockReturnValue(mockFileInput);
  });

  afterEach(() => {
    jest.restoreAllMocks(); // Restore document.createElement
  });

  test('should not handle non-open events', () => {
    const evt = { detail: 'some-other-event' };
    handler(evt);
    expect(document.createElement).not.toHaveBeenCalled();
  });

  test('should do nothing if graphRef.current is null', () => {
    mockGraphRef.current = null;
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const evt = { detail: 'open' };
    handler(evt);
    // We expect it to not throw and not proceed to file input creation
    expect(document.createElement).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith("Graph instance not available in handleOpenEffect");
    consoleErrorSpy.mockRestore();
  });
  
  test('should handle file open, update graphData and allValues, and call initializeGraph', async () => {
    const mockFileContent = {
      nodes: [{ id: 'n1', label: 'Node 1' }],
      edges: [{ id: 'e1', source: 'n1', target: 'n1' }],
      allValues: { n1: { data: 'loaded' } },
    };
    const mockFile = new Blob([JSON.stringify(mockFileContent)], { type: 'application/json' });
    mockFileInput.files = [mockFile];

    readFile.mockResolvedValue(JSON.stringify(mockFileContent));

    // Simulate event listener attachment and invocation
    mockFileInput.addEventListener.mockImplementation((event, cb) => {
      if (event === 'change') {
        // Store the callback to call it manually
        mockFileInput.onchangeCallback = cb;
      }
    });

    const evt = { detail: 'open' };
    handler(evt); // This will set up the event listener

    expect(document.createElement).toHaveBeenCalledWith('input');
    expect(mockFileInput.type).toBe('file');
    expect(mockFileInput.accept).toBe('.json');
    expect(mockFileInput.click).toHaveBeenCalledTimes(1);
    expect(mockFileInput.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

    // Manually trigger the change event by calling the stored callback
    await mockFileInput.onchangeCallback({ target: mockFileInput });

    expect(readFile).toHaveBeenCalledWith(mockFile);
    expect(graphData.nodes).toEqual(mockFileContent.nodes);
    expect(graphData.edges).toEqual(mockFileContent.edges);
    expect(allValues).toEqual(mockFileContent.allValues); // Check that old values were cleared and new ones assigned

    expect(initializeGraph).toHaveBeenCalledTimes(1);
    expect(initializeGraph).toHaveBeenCalledWith(mockGraph, graphData, false);
    
    expect(mockFileInput.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  test('should handle file open when file has no allValues', async () => {
    const mockFileContent = {
      nodes: [{ id: 'n1', label: 'Node 1' }],
      edges: [{ id: 'e1', source: 'n1', target: 'n1' }],
      // No allValues here
    };
    const mockFile = new Blob([JSON.stringify(mockFileContent)], { type: 'application/json' });
    mockFileInput.files = [mockFile];

    readFile.mockResolvedValue(JSON.stringify(mockFileContent));
    mockFileInput.addEventListener.mockImplementation((event, cb) => {
      if (event === 'change') mockFileInput.onchangeCallback = cb;
    });
    
    handler({ detail: 'open' });
    await mockFileInput.onchangeCallback({ target: mockFileInput });

    expect(graphData.nodes).toEqual(mockFileContent.nodes);
    expect(graphData.edges).toEqual(mockFileContent.edges);
    expect(allValues).toEqual({}); // Should be cleared

    expect(initializeGraph).toHaveBeenCalledWith(mockGraph, graphData, false);
  });


  test('should handle errors during file reading or parsing', async () => {
    mockFileInput.files = [new Blob()]; // Provide a file to trigger the change
    readFile.mockRejectedValue(new Error('File read error'));

    // Spy on console.error (we're now using console.error instead of alert)
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    mockFileInput.addEventListener.mockImplementation((event, cb) => {
      if (event === 'change') mockFileInput.onchangeCallback = cb;
    });

    handler({ detail: 'open' });
    await mockFileInput.onchangeCallback({ target: mockFileInput });

    expect(console.error).toHaveBeenCalledWith('Error loading graph data:', expect.any(Error));
    expect(errorSpy).toHaveBeenCalledWith('Failed to load graph data. Please check the file format.');
    expect(initializeGraph).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});