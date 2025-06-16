import asyncio
import json
import requests
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any

from models import GraphData, SearchRequest, SearchAllRequest, Node, Edge, SseMessage, HighlightRequest
from graph_matching import search_all

# Neo4j specific imports (logic is now in the utility module)
from connectors.neo4j import get_all_nodes_async, get_all_relationships_async, close_driver, get_driver

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Neo4j Driver Lifecycle Management
@app.on_event("startup")
async def startup_event():
    print("FastAPI application startup: attempting to connect to Neo4j.")
    try:
        await get_driver()
        print("Neo4j driver initialized successfully during startup.")
    except Exception as e:
        print(f"CRITICAL: Failed to initialize Neo4j driver on startup: {e}")
        print("The application will continue to run, but Neo4j dependent endpoints might fail.")

@app.on_event("shutdown")
async def shutdown_event():
    print("FastAPI application shutdown: closing Neo4j connection.")
    await close_driver()

graph_data = {
    "nodes": [],
    "edges": [],
    "allValues": {}
}

sse_connections = []

def json_serializer(obj):
    """Custom JSON serializer for objects that are not serializable by default.
    Handles date/time objects (from Python or Neo4j) and falls back to string conversion.
    """
    # If the object has an isoformat() method, use it.
    if hasattr(obj, 'isoformat'):
        return obj.isoformat()
    # For other unserializable types, convert them to a string.
    return str(obj)

async def broadcast_graph_update():
    """Broadcasts the current graph data to all connected SSE clients."""
    # Use the custom serializer to handle special types like dates from Neo4j.
    message_data = json.dumps(graph_data, default=json_serializer)
    message = SseMessage(data=message_data, event="graph_update")
    for queue in sse_connections:
        await queue.put(message)

@app.get("/sse")
async def sse(request: Request):
    """
    Establishes a Server-Sent Events (SSE) connection with a client.
    This endpoint keeps the connection alive and pushes graph updates
    in real-time.
    """
    queue = asyncio.Queue()
    sse_connections.append(queue)

    async def event_generator():
        try:
            while True:
                message = await queue.get()
                if await request.is_disconnected():
                    break
                yield f"event: {message.event}\ndata: {message.data}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            sse_connections.remove(queue)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

def calculate_embedding(text: str) -> Dict:
    url = "http://ollama:11434/api/embeddings"
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
    if not definition:
        return {}

    text = f"{entity_id}: {definition}"
    return calculate_embedding(text)

@app.get("/embedding")
def get_embedding():
    return {"message": "This is an embedding endpoint"}

@app.post("/search")
def search_graph(search_request: SearchRequest) -> Dict[str, Any]:
    query = search_request.query
    graph_data = search_request.graph_data

    if not query:
        return {"most_relevant_id": None, "score": 0}

    query_embedding = calculate_embedding(query)

    most_relevant_id = None
    highest_score = -1

    for entity_id, entity_data in graph_data.allValues.items():
        if "definition" in entity_data:
            entity_embedding = calculate_string_embedding(
                entity_id, entity_data["definition"])

            if "embedding" in entity_embedding and "embedding" in query_embedding:
                score = sum(
                    a * b for a, b in zip(entity_embedding["embedding"], query_embedding["embedding"]))

                if score > highest_score:
                    highest_score = score
                    most_relevant_id = entity_id

    return {"most_relevant_id": most_relevant_id, "score": highest_score}

@app.post("/load-graph")
async def load_graph(graph: GraphData):
    global graph_data
    graph_data = {
        "nodes": [node.dict() for node in graph.nodes],
        "edges": [edge.dict() for edge in graph.edges],
        "allValues": graph.allValues
    }
    await broadcast_graph_update()
    return {"message": "Graph data loaded successfully"}

@app.get("/graph")
def get_graph():
    global graph_data
    return graph_data

@app.post("/searchAll")
def search_all_endpoint(search_all_request: SearchAllRequest) -> Dict[str, Any]:
    graph_data = search_all_request.graph_data
    query_objects = search_all_request.query.get("objects", [])
    query_relations = search_all_request.query.get("relations", [])

    return search_all(graph_data, query_objects, query_relations)

@app.post("/highlight")
async def highlight_elements(highlight_request: HighlightRequest):
    """
    Highlights a set of nodes and edges based on their IDs.
    Broadcasts a highlight_update event to all SSE clients.
    """
    message_data = highlight_request.dict()
    message = SseMessage(data=json.dumps(message_data), event="highlight_update")
    for queue in sse_connections:
        await queue.put(message)
    return {"message": "Highlight update sent"}

@app.post("/nodes", status_code=201)
async def create_node(node: Node):
    """
    Creates a new node and adds it to the graph.
    Broadcasts the updated graph to all SSE clients.
    """
    global graph_data
    graph_data["nodes"].append(node.dict())
    await broadcast_graph_update()
    return node

@app.put("/nodes/{node_id}")
async def update_node(node_id: str, node: Node):
    """
    Updates an existing node by its ID.
    Broadcasts the updated graph to all SSE clients.
    """
    global graph_data
    for i, n in enumerate(graph_data["nodes"]):
        if n["id"] == node_id:
            graph_data["nodes"][i] = node.dict()
            await broadcast_graph_update()
            return node
    raise HTTPException(status_code=404, detail="Node not found")

@app.delete("/nodes/{node_id}", status_code=204)
async def delete_node(node_id: str):
    """
    Deletes a node by its ID and any connected edges.
    Broadcasts the updated graph to all SSE clients.
    """
    global graph_data
    node_found = any(n["id"] == node_id for n in graph_data["nodes"])
    if not node_found:
        raise HTTPException(status_code=404, detail="Node not found")
    
    graph_data["nodes"] = [n for n in graph_data["nodes"] if n["id"] != node_id]
    graph_data["edges"] = [e for e in graph_data["edges"] if e["source"] != node_id and e["target"] != node_id]
    
    await broadcast_graph_update()
    return

@app.post("/edges", status_code=201)
async def create_edge(edge: Edge):
    """
    Creates a new edge and adds it to the graph.
    Broadcasts the updated graph to all SSE clients.
    """
    global graph_data
    graph_data["edges"].append(edge.dict())
    await broadcast_graph_update()
    return edge

@app.put("/edges/{edge_id}")
async def update_edge(edge_id: str, edge: Edge):
    """
    Updates an existing edge by its ID.
    Broadcasts the updated graph to all SSE clients.
    """
    global graph_data
    for i, e in enumerate(graph_data["edges"]):
        if e["id"] == edge_id:
            graph_data["edges"][i] = edge.dict()
            await broadcast_graph_update()
            return edge
    raise HTTPException(status_code=404, detail="Edge not found")

@app.delete("/edges/{edge_id}", status_code=204)
async def delete_edge(edge_id: str):
    """
    Deletes an edge by its ID.
    Broadcasts the updated graph to all SSE clients.
    """
    global graph_data
    edge_found = any(e["id"] == edge_id for e in graph_data["edges"])
    if not edge_found:
        raise HTTPException(status_code=404, detail="Edge not found")

    graph_data["edges"] = [e for e in graph_data["edges"] if e["id"] != edge_id]
    await broadcast_graph_update()
    return


# Neo4j Sync Endpoint
@app.post("/sync-neo4j", tags=["Neo4j Sync"])
async def sync_neo4j_data():
    """
    Fetches and transforms graph data from Neo4j using dedicated utility functions,
    updates the global graph_data, and broadcasts it via the existing SSE mechanism.
    """
    global graph_data
    print("POST /sync-neo4j: Starting Neo4j data synchronization.")

    try:
        # Fetch and transform data using the refactored utility functions
        transformed_nodes, node_values = await get_all_nodes_async()
        transformed_edges, edge_values = await get_all_relationships_async()

        # Combine the allValues from both nodes and edges
        all_values = {**node_values, **edge_values}

        # Update the global graph_data object
        graph_data["nodes"] = transformed_nodes
        graph_data["edges"] = transformed_edges
        graph_data["allValues"] = all_values

        print(f"Neo4j Sync: Processed {len(transformed_nodes)} nodes and {len(transformed_edges)} edges. Broadcasting update.")
        
        # Broadcast the new graph state to all connected clients
        await broadcast_graph_update()

        return JSONResponse(
            content={
                "message": f"Successfully synced {len(transformed_nodes)} nodes and {len(transformed_edges)} edges from Neo4j. Graph data updated and broadcasted.",
                "nodes_synced": len(transformed_nodes),
                "edges_synced": len(transformed_edges)
            },
            status_code=200
        )

    except Exception as e:
        print(f"Neo4j Sync Error: An exception occurred during the sync process: {e}")
        raise HTTPException(status_code=503, detail=f"An error occurred during sync: {e}")
