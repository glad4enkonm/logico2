# Logico2

Logico2 is a React-based application for creating and visualizing formal graphs based on LLM text processing.

## Features

- Visualize formal graphs with interactive graph components
- Save and load graph configurations, including all detailed node and edge properties.
- Generate random graphs for testing
- Responsive design for desktop and mobile
- Text processing capabilities for creating graphs from LLM outputs
- Semantic search capabilities powered by a Python backend using ChromaDB for custom embeddings.

![Logico2 graph visualization example](ya.png)

## Project Structure

```
src/
├── components/       # React components
├── constants/        # Shared constants and configuration
├── effects/          # Event handlers and side effects
├── utils/            # Utility functions
├── app.js            # Main application file
├── index.js          # Entry point
public/
├── index.html        # Main HTML file
```

## Architecture Overview

Logico2 consists of two main components:

## Backend API Endpoints

The backend (running on `http://localhost:8000` by default) provides several API endpoints for graph manipulation and interaction.

### 1. Load Graph

*   **Endpoint:** `POST /load-graph`
*   **Description:** Loads a new graph structure into the backend. This replaces any existing graph data. The backend then broadcasts a `graph_update` event via Server-Sent Events (SSE) to all connected clients, prompting them to display the new graph.
*   **Request Body:** JSON object conforming to the `GraphData` model.
    ```json
    {
      "nodes": [
        {"id": "nodeA", "label": "Alpha Node"},
        {"id": "nodeB", "label": "Bravo Node"}
      ],
      "edges": [
        {"id": "edgeAB", "source": "nodeA", "target": "nodeB", "label": "A to B"}
      ],
      "allValues": {
        "nodeA": {"description": "Initial node.", "type": "start"},
        "nodeB": {"description": "Connected to Alpha.", "type": "process"},
        "edgeAB": {"relationship": "leads_to"}
      }
    }
    ```
*   **Example `curl`:**
    ```bash
    curl -X POST http://localhost:8000/load-graph \\
      -H "Content-Type: application/json" \\
      -d '{
        "nodes": [
          {"id": "nodeA", "label": "Alpha Node"},
          {"id": "nodeB", "label": "Bravo Node"}
        ],
        "edges": [
          {"id": "edgeAB", "source": "nodeA", "target": "nodeB", "label": "A to B"}
        ],
        "allValues": {
          "nodeA": {"description": "Initial node.", "type": "start"},
          "nodeB": {"description": "Connected to Alpha.", "type": "process"},
          "edgeAB": {"relationship": "leads_to"}
        }
      }'
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "message": "Graph data loaded successfully"
    }
    ```

### 2. Highlight Elements

*   **Endpoint:** `POST /highlight`
*   **Description:** Sends a request to the backend to highlight specified nodes and/or edges. The backend then broadcasts a `highlight_update` event via Server-Sent Events (SSE) to all connected clients. The event data contains the IDs of the elements to be highlighted.
*   **Request Body:** JSON object.
    ```json
    {
      "node_ids": ["node_id_1", "node_id_2"],
      "edge_ids": ["edge_id_1"]
    }
    ```
    *   `node_ids`: A list of strings, where each string is the ID of a node to be highlighted.
    *   `edge_ids`: A list of strings, where each string is the ID of an edge to be highlighted.
*   **Example `curl`:**
    ```bash
    curl -X POST http://localhost:8000/highlight \\
      -H "Content-Type: application/json" \\
      -d '{
        "node_ids": ["nodeA"],
        "edge_ids": ["edgeAB"]
      }'
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "message": "Highlight update sent"
    }
    ```

- **Frontend:** A React-based application responsible for graph visualization, user interaction, and data presentation. It allows users to build, modify, save, and load graphs.
- **Backend (Conceptual):** A Python-based service utilizing ChromaDB. This backend handles tasks like generating and storing custom text embeddings and performing semantic similarity searches based on those embeddings to find relevant graph elements.

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/glad4enkonm/logico2.git
   cd logico2
   ```

2. Install dependencies:
   ```
   yarn install
   ```

3. Start the development server:
   ```
   yarn start
   ```

## Build

To create a production build:
```
yarn build
```

## Testing

To run tests:
```
yarn test
```

To run tests in watch mode:
```
yarn test:watch
```


## Dependencies

- React 18
- G6 (AntV Graph) for graph visualization
- Parcel for bundling
- Babel for transpiling
- Jest for testing

## License

MIT
