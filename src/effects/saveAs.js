let downloadLink = null;

/**
 * Create a hidden download link element
 */
function createDownloadLink() {
  if (downloadLink) return;

  downloadLink = document.createElement('a');
  downloadLink.style.display = 'none';

  document.body.appendChild(downloadLink);
}

/**
 * Handle the Save As button click
 * @param {G6.Graph} graph - The G6 graph instance
 * @param {Object} graphData - The current graph data
 * @returns {Function} - The event handler function
 */
export function handleSaveAsEffect(graph, graphData) {
  return (evt) => {
    if (evt.detail !== 'saveAs') return;

    // Create the download link element if it doesn't exist
    createDownloadLink();

    // Get the current graph data
    const data = graph.save();

    // Create a JSON structure with the graph data
    const graphJson = JSON.stringify(
      {
        nodes: data.nodes,
        edges: data.edges,
      },
      null,
      2
    );

    // Create a Blob from the JSON string using the native Blob constructor
    const blob = new Blob([graphJson], { type: 'application/json' });

    // Create a URL for the Blob
    const url = URL.createObjectURL(blob);

    // Set the download link properties
    downloadLink.href = url;
    downloadLink.download = 'graph.json';

    // Programmatically click the download link to trigger the download
    downloadLink.click();

    // Clean up by revoking the object URL
    URL.revokeObjectURL(url);
  };
}