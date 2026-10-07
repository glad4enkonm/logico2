"""Multi-graph in-memory registry with write-through persistence (spec D2, D5, D12).

Single-process only (uvicorn --workers 1): all state lives in memory, JSON files
under GRAPHS_DIR are a durable mirror written atomically (tmp + os.replace).
"""

import asyncio
import json
import os
import re
from typing import Dict, List, Optional

GRAPHS_DIR = os.environ.get("LOGICO_GRAPHS_DIR", "/data/graphs")
SAVE_DEBOUNCE_SECONDS = float(os.environ.get("LOGICO_SAVE_DEBOUNCE", "1.0"))
GID_RE = re.compile(r"^[a-zA-Z0-9_-]+$")

DEFAULT_GRAPH_ID = "default"

# graph_id -> {"nodes": [...], "edges": [...], "allValues": {...}}
_graphs: Dict[str, dict] = {}
_save_tasks: Dict[str, asyncio.Task] = {}

_persist_hook = None  # test hook: called after each persist


class GraphError(Exception):
    """Raised by the store; mapped to HTTP responses by the API layer."""

    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def _available_ids() -> str:
    return ", ".join(sorted(_graphs)) if _graphs else "none"


def validate_graph_id(graph_id: str) -> str:
    if not GID_RE.match(graph_id or ""):
        raise GraphError(
            400,
            f"Invalid graph_id '{graph_id}'. Must match ^[a-zA-Z0-9_-]+$",
        )
    return graph_id


def create_graph(graph_id: str, data: Optional[dict] = None) -> dict:
    validate_graph_id(graph_id)
    if graph_id in _graphs:
        raise GraphError(409, f"Graph '{graph_id}' already exists. Available: {_available_ids()}")
    if data is not None:
        _graphs[graph_id] = normalize_graph_data(data)
    else:
        _graphs[graph_id] = {"nodes": [], "edges": [], "allValues": {}}
    schedule_save(graph_id)
    return _graphs[graph_id]


def normalize_graph_data(data: dict) -> dict:
    """Coerce loaded/payload data into the canonical in-memory shape (D4)."""
    nodes = []
    for n in data.get("nodes") or []:
        node = {"id": str(n["id"]), "label": n.get("label", str(n["id"]))}
        if n.get("x") is not None:
            node["x"] = n["x"]
        if n.get("y") is not None:
            node["y"] = n["y"]
        nodes.append(node)
    edges = []
    for e in data.get("edges") or []:
        edge = {
            "id": str(e["id"]),
            "source": str(e["source"]),
            "target": str(e["target"]),
            "label": e.get("label", ""),
        }
        if e.get("x") is not None:
            edge["x"] = e["x"]
        if e.get("y") is not None:
            edge["y"] = e["y"]
        edges.append(edge)
    return {
        "nodes": nodes,
        "edges": edges,
        "allValues": data.get("allValues") or {},
    }


def resolve_graph_id(graph_id: Optional[str]) -> str:
    """D2 resolver. Returns the effective graph id or raises GraphError."""
    if graph_id:
        validate_graph_id(graph_id)
        if graph_id not in _graphs:
            raise GraphError(404, f"Graph '{graph_id}' not found. Available: {_available_ids()}")
        return graph_id
    if not _graphs:
        # registry empty -> first mutation auto-creates 'default'
        create_graph(DEFAULT_GRAPH_ID)
        return DEFAULT_GRAPH_ID
    if len(_graphs) == 1:
        return next(iter(_graphs))
    raise GraphError(409, f"graph_id required. Available: {_available_ids()}")


def get_graph(graph_id: str) -> dict:
    return _graphs[graph_id]


def list_graph_ids() -> List[str]:
    return sorted(_graphs)


# --- Persistence -----------------------------------------------------------


def file_path(graph_id: str) -> str:
    return os.path.join(GRAPHS_DIR, f"{graph_id}.json")


def persist(graph_id: str) -> None:
    """Synchronous atomic write (D5): tmp file + os.replace."""
    os.makedirs(GRAPHS_DIR, exist_ok=True)
    graph = _graphs[graph_id]
    path = file_path(graph_id)
    tmp = f"{path}.tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(graph, f, ensure_ascii=False)
    os.replace(tmp, path)
    if _persist_hook is not None:
        _persist_hook(graph_id, path)


def schedule_save(graph_id: str, delay: float = SAVE_DEBOUNCE_SECONDS) -> None:
    """Debounced write-through: coalesce bursts of edits into one disk write."""
    if delay <= 0:
        persist(graph_id)
        return
    task = _save_tasks.get(graph_id)
    if task and not task.done():
        task.cancel()
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        # No event loop (sync call, e.g. during import/tests): write directly.
        persist(graph_id)
        return
    _save_tasks[graph_id] = loop.create_task(_debounced_save(graph_id, delay))


async def _debounced_save(task_graph_id: str, delay: float) -> None:
    try:
        await asyncio.sleep(delay)
        if task_graph_id in _graphs:
            persist(task_graph_id)
        _save_tasks.pop(task_graph_id, None)
    except asyncio.CancelledError:
        pass


async def flush_saves() -> None:
    """Persist all dirty graphs immediately (used by the explicit save endpoint
    and on shutdown)."""
    pending = [(gid, t) for gid, t in _save_tasks.items() if not t.done()]
    for gid, t in pending:
        t.cancel()
        _save_tasks.pop(gid, None)
    for gid, _ in pending:
        if gid in _graphs:
            persist(gid)
    _save_tasks.clear()


def save_now(graph_id: str) -> str:
    """Explicit save (D5): cancels debounce, writes atomically, returns path."""
    task = _save_tasks.get(graph_id)
    if task and not task.done():
        task.cancel()
    persist(graph_id)
    return file_path(graph_id)


def load_all_from_disk() -> List[str]:
    """Load every *.json from GRAPHS_DIR into the registry at startup."""
    if not os.path.isdir(GRAPHS_DIR):
        return []
    loaded = []
    for name in sorted(os.listdir(GRAPHS_DIR)):
        if not name.endswith(".json"):
            continue
        gid = name[: -len(".json")]
        if not GID_RE.match(gid):
            continue
        try:
            with open(os.path.join(GRAPHS_DIR, name), "r", encoding="utf-8") as f:
                data = json.load(f)
            _graphs[gid] = normalize_graph_data(data)
            loaded.append(gid)
        except (OSError, ValueError) as e:
            print(f"graph_store: skipping unreadable graph file {name}: {e}")
    return loaded


def merge_positions(graph_id: str, positions: List[dict]) -> None:
    """Silent merge of node coordinates (D8): no broadcast, no graph_update."""
    graph = _graphs[graph_id]
    by_id = {n["id"]: n for n in graph["nodes"]}
    for p in positions:
        node = by_id.get(str(p["id"]))
        if node is None:
            continue
        node["x"] = p["x"]
        node["y"] = p["y"]
    schedule_save(graph_id)


# --- Testing helpers -------------------------------------------------------


def reset_for_tests(graphs_dir: Optional[str] = None) -> None:
    """Wipe registry + timers. Tests point GRAPHS_DIR at a tmpdir first."""
    global GRAPHS_DIR, _persist_hook
    for t in _save_tasks.values():
        if not t.done():
            t.cancel()
    _save_tasks.clear()
    _graphs.clear()
    _persist_hook = None
    if graphs_dir:
        GRAPHS_DIR = graphs_dir
