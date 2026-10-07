import asyncio
import json
import os
import secrets
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles

import events
import graph_store
from graph_store import (
    GraphError,
    create_graph,
    flush_saves,
    get_graph,
    list_graph_ids,
    load_all_from_disk,
    merge_positions,
    normalize_graph_data,
    resolve_graph_id,
    save_now,
    schedule_save,
    validate_graph_id,
)
from models import (
    CreateGraphRequest,
    EdgeCreate,
    EdgeUpdate,
    GraphData,
    HighlightRequest,
    LayoutRequest,
    NodeCreate,
    NodeUpdate,
    PositionsRequest,
    SearchAllRequest,
    SearchRequest,
)

# --- out-of-scope features kept working, optionally gated (spec §1) ---------
# Ollama, embeddings, semantic search (/search, /embedding, /searchAll) and the
# Neo4j connector keep their current soft-degradation behavior; the wrapper
# repo disables them via env flags.
ENABLE_EMBEDDINGS = os.environ.get("LOGICO_ENABLE_EMBEDDINGS", "1") == "1"
ENABLE_NEO4J = os.environ.get("LOGICO_ENABLE_NEO4J", "1") == "1"

if ENABLE_NEO4J:
    from connectors.neo4j import (
        close_driver,
        get_all_nodes_async,
        get_all_relationships_async,
        get_driver,
    )
else:

    async def get_driver():
        raise HTTPException(503, "Neo4j connector disabled (LOGICO_ENABLE_NEO4J=0)")

    async def close_driver():
        return None

    async def get_all_nodes_async():
        raise HTTPException(503, "Neo4j connector disabled")

    async def get_all_relationships_async():
        raise HTTPException(503, "Neo4j connector disabled")


# Layout whitelist (D7): G6 v4 layout types, mirrors
# front/src/constants/layoutParams.js LAYOUT_METHODS.
ALLOWED_LAYOUTS = [
    "forceAtlas2",
    "gForce",
    "force",
    "fruchterman",
    "circular",
    "grid",
    "concentric",
    "dagre",
    "radial",
    "random",
    "mds",
    "comboForce",
]

FRONT_DIST = os.environ.get(
    "LOGICO_FRONT_DIST", os.path.join(os.path.dirname(os.path.abspath(__file__)), "front_dist")
)

app = FastAPI(openapi_url="/api/openapi.json", docs_url="/api/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- lifecycle --------------------------------------------------------------


@app.on_event("startup")
async def startup_event():
    if ENABLE_NEO4J:
        print("FastAPI startup: attempting to connect to Neo4j.")
        try:
            await get_driver()
            print("Neo4j driver initialized successfully during startup.")
        except Exception as e:
            print(f"CRITICAL: Failed to initialize Neo4j driver on startup: {e}")
            print("The application will continue to run, but Neo4j dependent endpoints might fail.")
    loaded = load_all_from_disk()
    if loaded:
        print(f"graph_store: loaded {len(loaded)} graph(s) from disk: {', '.join(loaded)}")


@app.on_event("shutdown")
async def shutdown_event():
    print("FastAPI shutdown: closing Neo4j connection, flushing saves.")
    await close_driver()
    await flush_saves()


# --- helpers ----------------------------------------------------------------


def resolve(gid: Optional[str]) -> str:
    """D2 graph_id resolver; raises HTTPException with D14 error strings."""
    try:
        return resolve_graph_id(gid)
    except GraphError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)


async def broadcast_graph_update(gid: str) -> None:
    await events.publish(gid, events.EVENT_GRAPH_UPDATE, {"graph": get_graph(gid)})


def _find_node(gid: str, node_id: str) -> Optional[dict]:
    for n in get_graph(gid)["nodes"]:
        if n["id"] == node_id:
            return n
    return None


def _find_edge(gid: str, edge_id: str) -> Optional[dict]:
    for e in get_graph(gid)["edges"]:
        if e["id"] == edge_id:
            return e
    return None


# --- health -----------------------------------------------------------------


@app.get("/healthz")
async def healthz():
    """Readiness probe used by the MCP connect tool (D15)."""
    return {"status": "ok", "graphs": list_graph_ids()}


# --- SSE (D10) --------------------------------------------------------------


@app.get("/sse")
async def sse(request: Request, g: Optional[str] = None):
    """Multiplexed SSE: `?g=<gid>` announces the displayed graph (a `?p=` tab);
    omitted => wildcard client that receives every event."""
    graphs = None
    if g:
        validate_graph_id(g)
        graphs = {g}
    client = events.register(graphs)

    async def event_generator():
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    payload = await asyncio.wait_for(client.queue.get(), timeout=15.0)
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
                    continue
                d = json.loads(payload)
                yield f"event: {d['event']}\ndata: {json.dumps(d)}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            events.unregister(client)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# --- graph registry ---------------------------------------------------------


@app.get("/graphs")
async def graphs_index():
    """List graph ids (used by MCP list_graphs)."""
    return {"graphs": list_graph_ids()}


@app.post("/graphs")
async def graphs_create(req: CreateGraphRequest):
    """Create an empty graph with an explicit id (used by MCP create_graph)."""
    gid = req.graph_id or "default"
    try:
        create_graph(gid)
    except GraphError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    return {"graph_id": gid}


# --- shared CRUD helpers (graph-scoped + legacy endpoints delegate here) ----


async def _create_node(gid: str, node: NodeCreate) -> dict:
    if _find_node(gid, node.id) is not None:
        raise HTTPException(409, f"Node '{node.id}' already exists")
    record = {"id": node.id, "label": node.label}
    if node.x is not None:
        record["x"] = node.x
    if node.y is not None:
        record["y"] = node.y
    get_graph(gid)["nodes"].append(record)
    schedule_save(gid)
    await broadcast_graph_update(gid)
    return {"id": node.id}


async def _update_node(gid: str, node_id: str, patch: NodeUpdate) -> dict:
    node = _find_node(gid, node_id)
    if node is None:
        raise HTTPException(404, f"Node '{node_id}' not found")
    # merge semantics (D9): only fields present in the request are written
    data = patch.model_dump(exclude_unset=True)
    for key, value in data.items():
        node[key] = value
    schedule_save(gid)
    await broadcast_graph_update(gid)
    return {}


async def _delete_node(gid: str, node_id: str) -> dict:
    graph = get_graph(gid)
    if _find_node(gid, node_id) is None:
        raise HTTPException(404, f"Node '{node_id}' not found")
    graph["nodes"] = [n for n in graph["nodes"] if n["id"] != node_id]
    graph["edges"] = [
        e for e in graph["edges"] if e["source"] != node_id and e["target"] != node_id
    ]
    schedule_save(gid)
    await broadcast_graph_update(gid)
    return {}


async def _create_edge(gid: str, edge: EdgeCreate) -> dict:
    graph = get_graph(gid)
    if _find_node(gid, edge.source) is None:  # D11
        raise HTTPException(404, f"Node '{edge.source}' (source) not found")
    if _find_node(gid, edge.target) is None:
        raise HTTPException(404, f"Node '{edge.target}' (target) not found")
    edge_id = edge.id  # D16: auto-generate when omitted
    if edge_id is None or edge_id == "":
        edge_id = f"e-{secrets.token_hex(4)}"
        while _find_edge(gid, edge_id) is not None:
            edge_id = f"e-{secrets.token_hex(4)}"
    elif _find_edge(gid, edge_id) is not None:
        raise HTTPException(409, f"Edge '{edge_id}' already exists")
    record = {"id": edge_id, "source": edge.source, "target": edge.target, "label": edge.label}
    graph["edges"].append(record)
    schedule_save(gid)
    await broadcast_graph_update(gid)
    return {"id": edge_id}


async def _update_edge(gid: str, edge_id: str, patch: EdgeUpdate) -> dict:
    edge = _find_edge(gid, edge_id)
    if edge is None:
        raise HTTPException(404, f"Edge '{edge_id}' not found")
    data = patch.model_dump(exclude_unset=True)
    if "source" in data and _find_node(gid, data["source"]) is None:  # D11
        raise HTTPException(404, f"Node '{data['source']}' (source) not found")
    if "target" in data and _find_node(gid, data["target"]) is None:
        raise HTTPException(404, f"Node '{data['target']}' (target) not found")
    for key, value in data.items():
        edge[key] = value
    schedule_save(gid)
    await broadcast_graph_update(gid)
    return {}


async def _delete_edge(gid: str, edge_id: str) -> dict:
    graph = get_graph(gid)
    if _find_edge(gid, edge_id) is None:
        raise HTTPException(404, f"Edge '{edge_id}' not found")
    graph["edges"] = [e for e in graph["edges"] if e["id"] != edge_id]
    schedule_save(gid)
    await broadcast_graph_update(gid)
    return {}


async def _load_graph(gid: str, graph: GraphData) -> dict:
    data = graph.model_dump()
    # D16: fill in missing edge ids for bulk loads
    for i, e in enumerate(data["edges"]):
        if not e.get("id"):
            e["id"] = f"e-{i}-{secrets.token_hex(3)}"
    # D11: validate edge endpoints reference existing nodes
    node_ids = {str(n["id"]) for n in data["nodes"]}
    for e in data["edges"]:
        if str(e["source"]) not in node_ids:
            raise HTTPException(400, f"Edge '{e.get('id')}' references missing source '{e['source']}'")
        if str(e["target"]) not in node_ids:
            raise HTTPException(400, f"Edge '{e.get('id')}' references missing target '{e['target']}'")
    normalized = normalize_graph_data(data)
    store = get_graph(gid)
    store["nodes"] = normalized["nodes"]
    store["edges"] = normalized["edges"]
    store["allValues"] = normalized["allValues"]
    schedule_save(gid)
    await broadcast_graph_update(gid)
    return {}


async def _positions(gid: str, req: PositionsRequest) -> dict:
    """D8: silent merge — no SSE broadcast (would cause a layout loop)."""
    merge_positions(gid, [p.model_dump() for p in req.positions])
    return {}


async def _layout(gid: str, req: LayoutRequest) -> dict:
    if req.type not in ALLOWED_LAYOUTS:  # D7
        raise HTTPException(
            400, f"Layout '{req.type}' not allowed. Allowed: {', '.join(ALLOWED_LAYOUTS)}"
        )
    layout_options = {"type": req.type, **(req.model_extra or {})}
    # D6: dispatch to explicit subscribers only — a wildcard client cannot
    # know which graph a layout belongs to and must not be counted.
    clients = await events.publish_explicit(
        gid, events.EVENT_LAYOUT_REQUEST, {"layoutOptions": layout_options}
    )
    return {"clients": clients}


async def _highlight(gid: str, req: HighlightRequest) -> dict:
    await events.publish(
        gid,
        events.EVENT_HIGHLIGHT_UPDATE,
        {"node_ids": req.node_ids, "edge_ids": req.edge_ids},
    )
    return {}


# --- graph-scoped API (D1) ---------------------------------------------------


@app.get("/{gid}/graph")
async def scoped_get_graph(gid: str):
    resolve(gid)
    return get_graph(gid)


@app.post("/{gid}/nodes", status_code=201)
async def scoped_create_node(gid: str, node: NodeCreate):
    resolve(gid)
    return await _create_node(gid, node)


@app.put("/{gid}/nodes/{node_id}")
async def scoped_update_node(gid: str, node_id: str, patch: NodeUpdate):
    resolve(gid)
    return await _update_node(gid, node_id, patch)


@app.delete("/{gid}/nodes/{node_id}")
async def scoped_delete_node(gid: str, node_id: str):
    resolve(gid)
    return await _delete_node(gid, node_id)


@app.post("/{gid}/edges", status_code=201)
async def scoped_create_edge(gid: str, edge: EdgeCreate):
    resolve(gid)
    return await _create_edge(gid, edge)


@app.put("/{gid}/edges/{edge_id}")
async def scoped_update_edge(gid: str, edge_id: str, patch: EdgeUpdate):
    resolve(gid)
    return await _update_edge(gid, edge_id, patch)


@app.delete("/{gid}/edges/{edge_id}")
async def scoped_delete_edge(gid: str, edge_id: str):
    resolve(gid)
    return await _delete_edge(gid, edge_id)


@app.post("/{gid}/layout")
async def scoped_layout(gid: str, req: LayoutRequest):
    resolve(gid)
    return await _layout(gid, req)


@app.post("/{gid}/positions")
async def scoped_positions(gid: str, req: PositionsRequest):
    resolve(gid)
    return await _positions(gid, req)


@app.put("/{gid}/highlight")
async def scoped_highlight(gid: str, req: HighlightRequest):
    resolve(gid)
    return await _highlight(gid, req)


@app.post("/{gid}/load-graph")
async def scoped_load_graph(gid: str, graph: GraphData):
    resolve(gid)
    return await _load_graph(gid, graph)


@app.post("/{gid}/save")
async def scoped_save(gid: str):
    resolve(gid)
    return {"saved": save_now(gid)}


# --- legacy endpoints (paths without graph_id, resolve via D2) ---------------


@app.get("/graph")
async def legacy_get_graph():
    gid = resolve(None)
    return get_graph(gid)


@app.post("/nodes", status_code=201)
async def legacy_create_node(node: NodeCreate):
    gid = resolve(None)
    return await _create_node(gid, node)


@app.put("/nodes/{node_id}")
async def legacy_update_node(node_id: str, patch: NodeUpdate):
    gid = resolve(None)
    return await _update_node(gid, node_id, patch)


@app.delete("/nodes/{node_id}")
async def legacy_delete_node(node_id: str):
    gid = resolve(None)
    return await _delete_node(gid, node_id)


@app.post("/edges", status_code=201)
async def legacy_create_edge(edge: EdgeCreate):
    gid = resolve(None)
    return await _create_edge(gid, edge)


@app.put("/edges/{edge_id}")
async def legacy_update_edge(edge_id: str, patch: EdgeUpdate):
    gid = resolve(None)
    return await _update_edge(gid, edge_id, patch)


@app.delete("/edges/{edge_id}")
async def legacy_delete_edge(edge_id: str):
    gid = resolve(None)
    return await _delete_edge(gid, edge_id)


@app.post("/layout")
async def legacy_layout(req: LayoutRequest):
    gid = resolve(None)
    return await _layout(gid, req)


@app.post("/positions")
async def legacy_positions(req: PositionsRequest):
    gid = resolve(None)
    return await _positions(gid, req)


@app.post("/highlight")
async def legacy_highlight(req: HighlightRequest):
    gid = resolve(None)
    return await _highlight(gid, req)


@app.post("/load-graph")
async def legacy_load_graph(graph: GraphData):
    gid = resolve(None)
    return await _load_graph(gid, graph)


@app.post("/save")
async def legacy_save():
    gid = resolve(None)
    return {"saved": save_now(gid)}


# --- semantic search (kept working, gated; not exposed by the MCP wrapper) ---


def calculate_embedding(text: str) -> Dict:
    url = os.environ.get("LOGICO_OLLAMA_URL", "http://ollama:11434") + "/api/embeddings"
    import requests

    payload = {"model": "nomic-embed-text", "prompt": text}
    response = requests.post(url, json=payload, headers={"Content-Type": "application/json"})
    if response.status_code == 200:
        return response.json()
    raise HTTPException(status_code=response.status_code, detail="Error calculating embedding")


def calculate_string_embedding(entity_id: str, definition: str) -> Dict:
    if not definition:
        return {}
    return calculate_embedding(f"{entity_id}: {definition}")


@app.get("/embedding")
def get_embedding():
    return {"message": "This is an embedding endpoint"}


@app.post("/search")
def search_graph(search_request: SearchRequest) -> Dict[str, Any]:
    if not ENABLE_EMBEDDINGS:
        raise HTTPException(503, "Embeddings disabled (LOGICO_ENABLE_EMBEDDINGS=0)")
    query = search_request.query
    graph_data = search_request.graph_data

    if not query:
        return {"most_relevant_id": None, "score": 0}

    query_embedding = calculate_embedding(query)

    most_relevant_id = None
    highest_score = -1

    for entity_id, entity_data in graph_data.allValues.items():
        if "definition" in entity_data:
            entity_embedding = calculate_string_embedding(entity_id, entity_data["definition"])
            if "embedding" in entity_embedding and "embedding" in query_embedding:
                score = sum(
                    a * b
                    for a, b in zip(entity_embedding["embedding"], query_embedding["embedding"])
                )
                if score > highest_score:
                    highest_score = score
                    most_relevant_id = entity_id

    return {"most_relevant_id": most_relevant_id, "score": highest_score}


@app.post("/searchAll")
def search_all_endpoint(search_all_request: SearchAllRequest) -> Dict[str, Any]:
    from graph_matching import search_all

    graph_data = search_all_request.graph_data
    query_objects = search_all_request.query.get("objects", [])
    query_relations = search_all_request.query.get("relations", [])
    return search_all(graph_data, query_objects, query_relations)


# --- Neo4j sync (kept working, gated) ----------------------------------------


@app.post("/sync-neo4j", tags=["Neo4j Sync"])
async def sync_neo4j_data():
    gid = resolve(None)
    print("POST /sync-neo4j: Starting Neo4j data synchronization.")
    try:
        transformed_nodes, node_values = await get_all_nodes_async()
        transformed_edges, edge_values = await get_all_relationships_async()
        store = get_graph(gid)
        store["nodes"] = transformed_nodes
        store["edges"] = transformed_edges
        store["allValues"] = {**node_values, **edge_values}
        print(
            f"Neo4j Sync: Processed {len(transformed_nodes)} nodes and "
            f"{len(transformed_edges)} edges. Broadcasting update."
        )
        await broadcast_graph_update(gid)
        schedule_save(gid)
        return {
            "message": (
                f"Successfully synced {len(transformed_nodes)} nodes and "
                f"{len(transformed_edges)} edges from Neo4j."
            ),
            "nodes_synced": len(transformed_nodes),
            "edges_synced": len(transformed_edges),
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Neo4j Sync Error: {e}")
        raise HTTPException(503, f"An error occurred during sync: {e}")


# --- static files (D12: mount only /graphs -> graphs dir, then SPA last) ----
# Routes declared above take precedence over the mounts below. Only /graphs is
# exposed from the data dir; the SPA mount is last so it cannot shadow APIs.
os.makedirs(graph_store.GRAPHS_DIR, exist_ok=True)
app.mount("/graphs", StaticFiles(directory=graph_store.GRAPHS_DIR), name="graphs")
if os.path.isdir(FRONT_DIST):
    app.mount("/", StaticFiles(directory=FRONT_DIST, html=True), name="front")
