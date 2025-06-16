# Logico2

Logico2 is a React-based application for creating and visualizing formal graphs based on LLM text processing.

## Features

- Visualize formal graphs with interactive graph components
- Save and load graph configurations, including all detailed node and edge properties.
- Generate random graphs for testing
- Responsive design for desktop and mobile
- Text processing capabilities for creating graphs from LLM outputs
- Semantic search capabilities powered by a Python backend using ChromaDB for custom embeddings.

![Logico2 graph visualization example](front/ya.png)

## Project Structure

```
back/                  # Backend directory
├── connectors/        # Modules for connecting to external data sources (e.g., Neo4j)
│   └── neo4j.py
├── Dockerfile         # Docker configuration for backend
├── main.py            # Main backend application
├── requirements.txt   # Python dependencies
front/                 # Frontend directory
├── babel.config.json  # Babel configuration
├── jest.config.js     # Jest configuration
├── jest.setup.js      # Jest setup file
├── LICENSE            # License file
├── package.json       # NPM package configuration
├── README.md          # Frontend README
├── yarn.lock          # Yarn lock file
├── prompt/            # Prompt files for text processing
│   ├── extractAndApplyGraphChanges.txt
│   ├── extractSimpleClass.txt
│   ├── jsonDiff.txt
├── public/            # Public assets
│   ├── index.html     # Main HTML file
├── src/               # Source code
│   ├── app.js         # Main application file
│   ├── index.js       # Entry point
│   ├── components/    # React components
│   │   ├── Button.jsx
│   │   ├── ButtonPanel.jsx
│   │   ├── ClipboardPanel.jsx
│   │   ├── JsonDiffPanel.jsx
│   │   ├── RightPanel.jsx
│   │   ├── buttonPanel.css
│   │   ├── clipboardPanel.css
│   │   ├── jsonDiffPanel.css
│   │   ├── rightPanel.css
│   ├── constants/     # Shared constants and configuration
│   │   ├── appConstants.js
│   ├── effects/       # Event handlers and side effects
│   │   ├── index.js
│   │   ├── json.js
│   │   ├── new.js
│   │   ├── open.js
│   │   ├── random.js
│   │   ├── saveAs.js
│   ├── utils/         # Utility functions
│   │   ├── clipboardUtil.js
│   │   ├── fileUtil.js
│   │   ├── graphUtil.js
├── tests/             # Tests
│   ├── integration/   # Integration tests
│   │   ├── app.test.js
│   ├── unit/          # Unit tests
│   │   ├── button.test.js
│   │   ├── buttonPanel.test.js
│   │   ├── ClipboardPanel.test.js
│   │   ├── clipboardUtil.test.js
│   │   ├── graphUtil.test.js
│   │   ├── jsonEffect.test.js
│   │   ├── newEffect.test.js
│   │   ├── openEffect.test.js
│   │   ├── randomEffect.test.js
│   │   ├── rightPanel.test.js
│   │   ├── saveAsEffect.test.js
│   │   ├── saveRestoreAllValues.test.js
docker-compose.yml     # Docker Compose configuration
.gitignore             # Git ignore file
ollama/                # Ollama configuration, local model storage, and access keys
├── id_ed25519
├── id_ed25519.pub
├── models/
│   ├── blobs/
│   ├── manifests/
```

## Architecture Overview

Logico2 is designed with a decoupled frontend and backend architecture, often orchestrated with Docker Compose for ease of development and deployment.

-   **Frontend (`front/`)**: A React-based single-page application built with Parcel. It provides the user interface for:
    -   Visualizing and interacting with graphs using AntV G6.
    -   Creating, modifying, saving, and loading graph data (including detailed node/edge properties).
    -   Initiating semantic searches.
    -   Communicates with the backend via HTTP requests (using Axios).

-   **Backend (`back/`)**: A Python FastAPI service responsible for:
    -   Interfacing with Ollama to generate text embeddings using a specified model (e.g., `nomic-embed-text`).
    -   Storing and retrieving these embeddings along with associated graph data using ChromaDB.
    -   Providing an API for semantic search over the stored embeddings.
    -   Synchronizing with a Neo4j database to fetch the entire graph (nodes and edges).
    -   Broadcasting the updated graph to all connected clients via a Server-Sent Events (SSE) endpoint.

    #### Neo4j Integration

    The backend can connect to a Neo4j instance to perform a full graph synchronization. This is useful for loading a graph state persisted in a dedicated graph database.

    -   **Configuration**: The connection is configured via a `.env` file in the `back/` directory. You can create this by copying from `back/.env.example`. The key variables are:
        -   `NEO4J_URI`: The Bolt URI for your Neo4j instance.
        -   `NEO4J_USER`: The username for the database.
        -   `NEO4J_PASSWORD`: The password for the user.
        -   `NEO4J_ID_PROPERTY`: The name of the node property in Neo4j that should be mapped to the `id` field in the application (e.g., `uuid`).
        -   `NEO4J_LABEL_PROPERTY`: The name of the node property that should be used for the display `label` (e.g., `name`).

    -   **API Endpoint**: A `POST` request to `/sync-neo4j` triggers the synchronization. The backend fetches all nodes and relationships from Neo4j, transforms them into the expected format, and broadcasts the new graph to all clients listening to the `/sse` endpoint.

-   **Ollama Service**: Utilizes the official `ollama/ollama` Docker image to serve language models, specifically configured to provide text embedding models like `nomic-embed-text`. The local `./ollama` directory (see Project Structure) is used for model storage, configuration, and access keys.

-   **Docker Orchestration**:
    -   `docker-compose.yml`: Defines and links the `front`, `back`, and `ollama` services for a complete development environment.
    -   `docker-compose-ollama.yml`: Provides a way to run the Ollama service independently if needed.

## Installation

### Using Docker Compose (Recommended)

1. Clone the repository:
   ```bash
   git clone https://github.com/glad4enkonm/logico2.git
   cd logico2
   ```

2. Start the application using Docker Compose:
   ```bash
   docker-compose up
   ```

   This will start both the backend and frontend services.

### Manual Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/glad4enkonm/logico2.git
   cd logico2
   ```

2. Install backend dependencies:
   ```bash
   cd back
   pip install -r requirements.txt
   ```

3. Install frontend dependencies:
   ```bash
   cd ../front
   yarn install
   ```

4. Start the development servers:
   ```bash
   # In one terminal, start the backend
   cd ../back
   python main.py

   # In another terminal, start the frontend
   cd ../front
   yarn start
   ```

## Build

To create a production build for the frontend:
```bash
cd front
yarn build
```

## Testing

### Frontend

To run frontend tests:
```bash
cd front
yarn test
```

To run frontend tests in watch mode:
```bash
cd front
yarn test:watch
```

### Backend

To run backend unit tests (from the project root):
```bash
./run_back_unit_tests.sh
```

For other backend tests (from the project root):
```bash
./test_back.sh
```

## Key Technologies & Dependencies

**Frontend:**
- React 18
- G6 (AntV Graph): For graph visualization
- Parcel: For bundling
- Axios: For communication with the backend
- Jest: For testing

**Backend & Services:**
- Python
- ChromaDB: For vector storage and semantic search
- Ollama: For serving local LLMs (e.g., `nomic-embed-text` for embeddings via Docker)
- (See `back/requirements.txt` for detailed Python libraries)

## License

MIT
