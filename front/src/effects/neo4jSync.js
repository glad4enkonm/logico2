import { syncNeo4j } from '../api';
import { BUTTON_EVENTS } from '../constants/appConstants';

/**
 * Handles the Neo4j Sync button click effect.
 * @returns {Function} An event handler function.
 */
export function handleNeo4jSyncEffect() {
  return (evt) => {
    if (evt.detail === BUTTON_EVENTS.NEO4J_SYNC) {
      console.log('Neo4j Sync button clicked. Sending request to backend...');
      syncNeo4j()
        .then(response => {
          console.log('Neo4j Sync successful:', response.data.message);
          // The backend will broadcast the graph update via SSE,
          // so no need to handle graph data here.
        })
        .catch(error => {
          console.error('Error during Neo4j Sync:', error.response ? error.response.data : error.message);
        });
    }
  };
}
