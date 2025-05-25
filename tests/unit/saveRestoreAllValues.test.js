import { handleSaveAsEffect } from '@/effects/saveAs';
import { handleOpenEffect } from '@/effects/open';
import { readFile } from '@/utils/fileUtil';

jest.mock('@/utils/fileUtil', () => ({
  readFile: jest.fn().mockResolvedValue(
    JSON.stringify({ nodes: [], edges: [], allValues: {} })
  )
}));

describe('Save and Restore allValues functionality', () => {
  test('should include allValues in saved graph data', () => {
    const mockGraph = {
      save: jest.fn().mockReturnValue({ nodes: [], edges: [] })
    };

    const graphData = { nodes: [], edges: [] };
    const allValues = { node1: { key1: 'value1' }, node2: { key2: 'value2' } };

    // Mock global objects
    global.Blob = jest.fn().mockImplementation(() => ({}));
    global.URL = {
      createObjectURL: jest.fn().mockReturnValue('mock-url'),
      revokeObjectURL: jest.fn()
    };
    document.body.appendChild = jest.fn();

    const saveHandler = handleSaveAsEffect(mockGraph, graphData, allValues);
    const event = new Event('buttonClick');
    event.detail = 'saveAs';

    saveHandler(event);

    expect(mockGraph.save).toHaveBeenCalled();
    expect(global.Blob).toHaveBeenCalled();
  });

  test('should restore allValues from loaded graph data', async () => {
    const mockGraph = {
      // Mock any graph methods if directly called by openEffect,
      // though it primarily delegates to initializeGraph for graph updates.
      read: jest.fn(), // initializeGraph calls graph.read when doLayout is false
      paint: jest.fn(), // initializeGraph calls graph.paint
    };
    const mockGraphRef = { current: mockGraph };
    const graphData = { nodes: [], edges: [] };
    const allValues = {}; // Start with empty allValues

    const testValues = { node1: { key1: 'value1' }, node2: { key2: 'value2' } };
    const mockFileContent = { nodes: [], edges: [], allValues: testValues };

    // Mock readFile to return the desired file content
    jest.mocked(readFile).mockResolvedValue(JSON.stringify(mockFileContent));

    // Mock file input creation and interaction
    const mockFileInput = {
      type: '',
      accept: '',
      files: null,
      click: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      onchangeCallback: null, // To store the callback
    };
    const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockFileInput);

    mockFileInput.addEventListener.mockImplementation((event, cb) => {
      if (event === 'change') {
        mockFileInput.onchangeCallback = cb; // Store the callback
      }
    });
    
    // Prepare the file to be "selected"
    const mockFile = new File([JSON.stringify(mockFileContent)], 'test.json', { type: 'application/json' });
    mockFileInput.files = [mockFile];

    const openHandler = handleOpenEffect(mockGraphRef, graphData, allValues);
    const event = { detail: 'open' };

    // Call the open handler, which should set up the input and click it
    openHandler(event);

    // Manually trigger the change event by calling the stored callback
    // This simulates the user selecting a file
    if (mockFileInput.onchangeCallback) {
      await mockFileInput.onchangeCallback({ target: mockFileInput });
    } else {
      throw new Error("onchange callback was not set on mockFileInput");
    }

    expect(readFile).toHaveBeenCalledWith(mockFile);
    expect(allValues).toEqual(testValues); // Check that allValues were restored

    // Restore mocks
    createElementSpy.mockRestore();
  });
});
