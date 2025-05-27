from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import GraphData

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

@app.get("/embedding")
def get_embedding():
    return {"message": "This is an embedding endpoint"}

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