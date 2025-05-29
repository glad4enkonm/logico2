import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any

from models import GraphData, SearchRequest, SearchAllRequest
from graph_matching import search_all

app = FastAPI()

# Allow CORS for all origins (for development purposes)
# TODO: remove or use constants here
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

# Global object to store graph data
graph_data = {
    "nodes": [],
    "edges": [],
    "allValues": {}
}


def calculate_embedding(text: str) -> Dict:
    """Calculate embedding for a given text using the embeddings API."""
    url = "http://ollama:11434/api/embeddings" # replace to localhost to debug
    payload = {
        "model": "nomic-embed-text",
        "prompt": text
    }
    headers = {
        "Content-Type": "application/json"
    }

    response = requests.post(url, json=payload, headers=headers)

    if response.status_code == 200:
        return response.json()
    else:
        raise HTTPException(status_code=response.status_code,
                            detail="Error calculating embedding")


def calculate_string_embedding(entity_id: str, definition: str) -> Dict:
    """Create a string embedding from an entity ID and its definition."""
    if not definition:
        return {}

    # Create a string combining ID and definition
    text = f"{entity_id}: {definition}"
    return calculate_embedding(text)


@app.get("/embedding")
def get_embedding():
    return {"message": "This is an embedding endpoint"}


@app.post("/search")
def search_graph(search_request: SearchRequest) -> Dict[str, Any]:
    """Search the graph for the most relevant node or edge based on the query."""
    query = search_request.query
    graph_data = search_request.graph_data

    # If no query is provided, return an empty result
    if not query:
        return {"most_relevant_id": None, "score": 0}

    # Calculate embedding for the query
    query_embedding = calculate_embedding(query)

    # Initialize variables to track the most relevant entity
    most_relevant_id = None
    highest_score = -1

    # Iterate over all nodes and edges
    for entity_id, entity_data in graph_data.allValues.items():
        # Check if the entity has a definition property
        if "definition" in entity_data:
            # Calculate embedding for this entity
            entity_embedding = calculate_string_embedding(
                entity_id, entity_data["definition"])

            # Calculate similarity score (simple dot product for demonstration)
            if "embedding" in entity_embedding and "embedding" in query_embedding:
                score = sum(
                    a * b for a, b in zip(entity_embedding["embedding"], query_embedding["embedding"]))

                # Update most relevant if this score is higher
                if score > highest_score:
                    highest_score = score
                    most_relevant_id = entity_id

    return {"most_relevant_id": most_relevant_id, "score": highest_score}


@app.post("/load-graph")
def load_graph(graph: GraphData):
    global graph_data
    graph_data = {
        "nodes": graph.nodes,
        "edges": graph.edges,
        "allValues": graph.allValues
    }
    return {"message": "Graph data loaded successfully"}


@app.get("/graph")
def get_graph():
    global graph_data
    return graph_data

@app.post("/searchAll")
def search_all_endpoint(search_all_request: SearchAllRequest) -> Dict[str, Any]:
    """Search the graph for all relevant nodes and edges based on the query objects and relations."""
    graph_data = search_all_request.graph_data
    query_objects = search_all_request.query.get("objects", [])
    query_relations = search_all_request.query.get("relations", [])

    # Call the search_all function from the graph_matching module
    return search_all(graph_data, query_objects, query_relations)
