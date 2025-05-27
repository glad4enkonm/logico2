import { handleSaveAsEffect } from '@/effects/saveAs';

describe('saveAsEffect', () => {
  let graphMock;
  let graphDataMock;
  let eventMock;

  beforeEach(() => {
    // Mock the graph object
    graphMock = {
      save: jest.fn().mockReturnValue({
        nodes: [{ id: '1', label: 'Node 1' }, { id: '2', label: 'Node 2' }],
        edges: [{ source: '1', target: '2' }]
      })
    };

    // Mock the graph data
    graphDataMock = {};

    // Mock the event
    eventMock = new Event('click');
    eventMock.detail = 'saveAs';

    // Clean up the document body before each test
    document.body.innerHTML = '';

    // Mock URL.createObjectURL and URL.revokeObjectURL
    global.URL.createObjectURL = jest.fn(() => 'mock-blob-url');
    global.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    // Clean up the download link after each test
    const downloadLinks = document.querySelectorAll('a[style*="display: none"]');
    downloadLinks.forEach(link => link.remove());
  });

  test('should create a download link and trigger download', () => {
    // Mock the download link click
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click');

    // Get the handler function
    const handler = handleSaveAsEffect(graphMock, graphDataMock);

    // Call the handler with the mock event
    handler(eventMock);

    // Check if the download link was created
    const downloadLinks = document.querySelectorAll('a[style*="display: none"]');
    expect(downloadLinks.length).toBe(1);
    const downloadLink = downloadLinks[0];
    expect(downloadLink.href).toContain('mock-blob-url');
    expect(downloadLink.download).toBe('graph.json');

    // Check if the click was triggered
    expect(clickSpy).toHaveBeenCalled();
  });

  test('should not create a download link if event detail is not saveAs', () => {
    // Create an event with different detail
    const wrongEvent = new Event('click');
    wrongEvent.detail = 'otherAction';

    // Get the handler function
    const handler = handleSaveAsEffect(graphMock, graphDataMock);

    // Call the handler with the wrong event
    handler(wrongEvent);

    // Check if the download link was not created
    const downloadLinks = document.querySelectorAll('a[style*="display: none"]');
    expect(downloadLinks.length).toBe(0);
  });

  test('should use graph.save() data for the download content', () => {
    // Mock Blob constructor
    const mockBlob = jest.fn();
    global.Blob = mockBlob;
  
    // Spy on URL.createObjectURL
    const createObjectURLSpy = jest.spyOn(URL, 'createObjectURL');
  
    // Get the handler function
    const handler = handleSaveAsEffect(graphMock, graphDataMock);
  
    // Call the handler with the mock event
    handler(eventMock);
  
    // Verify graph.save() was called and get its return value
    expect(graphMock.save).toHaveBeenCalled();
    const savedData = graphMock.save.mock.results[0].value;
  
    // Verify Blob creation with correct data
    expect(mockBlob).toHaveBeenCalledWith(
      [JSON.stringify(savedData, null, 2)],
      { type: 'application/json' }
    );
      
    const createdBlob = mockBlob.mock.instances[0];
  
    // Verify URL creation with the Blob instance
    expect(createObjectURLSpy).toHaveBeenCalledWith(createdBlob);
  });
});