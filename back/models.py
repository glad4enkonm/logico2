from pydantic import BaseModel
from typing import List, Dict, Any, Optional

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

class Object(BaseModel):
    name: str
    type: str
    attributes: Dict[str, Any]
    definition: str
    context: str

class Relation(BaseModel):
    type: str
    source: str
    target: str
    definition: str
    context: str

class SearchAllRequest(BaseModel):
    graph_data: GraphData
    query: Dict[str, Any] = None
    objects: List[Object] = None
    relations: List[Relation] = None

class SearchRequest(BaseModel):
    graph_data: GraphData
    query: str = None
class SseMessage(BaseModel):
    data: str
    event: Optional[str] = None

class HighlightRequest(BaseModel):
    node_ids: List[str]
    edge_ids: List[str]
