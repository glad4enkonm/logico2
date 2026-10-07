from pydantic import BaseModel
from typing import List, Dict, Any, Optional


class Node(BaseModel):
    id: str
    label: str
    x: Optional[float] = None
    y: Optional[float] = None


class NodeCreate(Node):
    pass


class NodeUpdate(BaseModel):
    """Partial node update (merge semantics, D9). `id` is taken from the path."""
    label: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None


class Edge(BaseModel):
    source: str
    target: str
    label: str = ""
    id: Optional[str] = None  # auto-generated when omitted (D16)
    x: Optional[float] = None
    y: Optional[float] = None


class EdgeCreate(Edge):
    pass


class EdgeUpdate(BaseModel):
    """Partial edge update (merge semantics, D9)."""
    label: Optional[str] = None
    source: Optional[str] = None
    target: Optional[str] = None


class GraphData(BaseModel):
    nodes: List[Node]
    edges: List[Edge]
    allValues: Dict[str, Any] = {}


class Position(BaseModel):
    id: str
    x: float
    y: float


class PositionsRequest(BaseModel):
    """Browser write-back of node coordinates after layout/drag (D8)."""
    positions: List[Position]


class LayoutRequest(BaseModel):
    """Pure layout transport (D6): body is passed through to the browser as
    layoutOptions, `type` is validated against the G6 v4 whitelist (D7)."""
    model_config = {"extra": "allow"}

    type: str


class HighlightRequest(BaseModel):
    node_ids: List[str] = []
    edge_ids: List[str] = []


class CreateGraphRequest(BaseModel):
    graph_id: Optional[str] = None


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
