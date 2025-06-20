import { readFile } from '../utils/fileUtil';
import { initializeGraph } from '../utils/graphUtil';

/**
 * Handle the Open button click
 * @param {React.RefObject<G6.Graph>} graphRef - React ref to the G6 graph instance
 * @param {Object} graphData - The current graph data
 * @param {Object} allValues - The values for all elements
 * @returns {Function} - The event handler function
 */
export function handleOpenEffect(graphRef, graphData, allValues) {
  return async (evt) => {
    if (evt.detail !== 'open') return; // Only handle the Open button click

    const graph = graphRef.current;
    if (!graph) {
      console.error("Graph instance not available in handleOpenEffect");
      return;
    }

    // Create a file input element to allow the user to select a file
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    const handleFileChange = async (event) => {
      const file = event.target.files[0];
      if (file) {
        try {
          // Read the file content
          const content = await readFile(file);

          // Parse the JSON data
          const data = JSON.parse(content);

          // Update the graph data
          graphData.nodes = data.nodes || [];
          graphData.edges = data.edges || [];

          // Clear any existing values from the application's shared allValues state
          Object.keys(allValues).forEach(key => {
            delete allValues[key];
          });

          let fileAllValues = null; // This will hold the allValues from the loaded file
          // Restore the allValues from the file into the application's shared state
          // and also keep a copy in fileAllValues to pass to initializeGraph
          if (data.allValues) {
            Object.assign(allValues, data.allValues);
            fileAllValues = data.allValues;
          }

          // Initialize the graph with the new data, passing the allValues from the file
          initializeGraph(graph, graphData, fileAllValues, false);
        } catch (error) {
          console.error('Error loading graph data:', error);
          console.error('Failed to load graph data. Please check the file format.');
        }
      }

      // Remove the event listener after it has been used
      input.removeEventListener('change', handleFileChange);
    };

    // Add the onchange event listener only once
    input.addEventListener('change', handleFileChange);

    // Programmatically click the file input to trigger the file selection dialog
    input.click();
  };
}