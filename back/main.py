from fastapi import FastAPI, HTTPException

from models import GraphData

app = FastAPI()

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