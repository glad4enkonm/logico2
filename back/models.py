from pydantic import BaseModel
from typing import List, Dict, Any

class Node(BaseModel):
    id: str
    label: str    

class Edge(BaseModel):
    source: str
    target: str
    label: str
    id: str

class GraphData(BaseModel):
    nodes: List[Node]
    edges: List[Edge]
    allValues: Dict[str, Any]

class SearchRequest(BaseModel):
    graph_data: GraphData
    query: str = None