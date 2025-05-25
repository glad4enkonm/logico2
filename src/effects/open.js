import { readFile } from '../utils/fileUtil';

/**
 * Handle the Open button click
 * @param {G6.Graph} graph - The G6 graph instance
 * @param {Object} graphData - The current graph data
 * @param {Object} allValues - The values for all elements
 * @returns {Function} - The event handler function
 */
export function handleOpenEffect(graph, graphData, allValues) {
  return async (evt) => {
    if (evt.detail !== 'open') return; // Only handle the Open button click

    // Create a file input element to allow the user to select a file
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    // When a file is selected, read and parse it
    input.onchange = async (event) => {
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

          // Update the graph with the new data
          graph.changeData(graphData);

          // Clear any existing values
          Object.keys(allValues).forEach(key => {
            delete allValues[key];
          });

          // Clear any highlights
          graph.getEdges().forEach(edge => {
            graph.updateItem(edge, {
              style: {
                stroke: "#343434", // Reset to default style
              },
            });
          });

          graph.getNodes().forEach(node => {
            graph.updateItem(node, {
              style: {
                stroke: "#BB86FC", // Reset to default style
              },
            });
          });

          graph.paint();
        } catch (error) {
          console.error('Error loading graph data:', error);
          alert('Failed to load graph data. Please check the file format.');
        }
      }
    };

    // Programmatically click the file input to trigger the file selection dialog
    input.click();
  };
}