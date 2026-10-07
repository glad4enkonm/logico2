"""Multiplexed SSE hub (spec D10).

One endpoint `/sse` serves all graphs; each event payload carries `graph_id`
and clients filter by id. Rationale: HTTP/1.1 browser limit ~6 connections per
origin — per-graph endpoints would block the 7th tab.

Subscription model:
- `/sse?g=<gid>` — client announces it displays graph `gid` (a `?p=` tab).
- `/sse` with no `g` — legacy tab that does not know its graph: it receives
  ALL events (wildcard) and filters client-side.
Client counts for layout dispatch (D6) count both explicit subscribers and
wildcard clients, since a wildcard tab will render any graph it has loaded.
"""

import asyncio
import json
from typing import Dict, Optional, Set

EVENT_GRAPH_UPDATE = "graph_update"
EVENT_HIGHLIGHT_UPDATE = "highlight_update"
EVENT_LAYOUT_REQUEST = "layout_request"

# client_id -> SseClient
_clients: Dict[int, "SseClient"] = {}
_next_client_id = 0


class SseClient:
    """graphs is None => wildcard (receives every event)."""

    def __init__(self, client_id: int, queue: asyncio.Queue, graphs: Optional[Set[str]]):
        self.client_id = client_id
        self.queue = queue
        self.graphs = graphs

    def subscribes_to(self, graph_id: str) -> bool:
        return self.graphs is None or graph_id in self.graphs


def register(graphs: Optional[Set[str]]) -> "SseClient":
    """Register a new SSE client (called by the /sse endpoint)."""
    global _next_client_id
    client = SseClient(_next_client_id, asyncio.Queue(), graphs)
    _next_client_id += 1
    _clients[client.client_id] = client
    return client


def unregister(client: "SseClient") -> None:
    _clients.pop(client.client_id, None)


async def publish(graph_id: str, event: str, data: Optional[dict] = None) -> int:
    """Queue an event for every client subscribed to `graph_id`.
    Returns the number of receiving clients (0 = no open tab, D15 note)."""
    payload = json.dumps({"graph_id": graph_id, "event": event, "data": data or {}})
    for client in list(_clients.values()):
        if client.subscribes_to(graph_id):
            await client.queue.put(payload)
    return client_count(graph_id)


def client_count(graph_id: str) -> int:
    return sum(1 for c in _clients.values() if c.subscribes_to(graph_id))


async def publish_explicit(graph_id: str, event: str, data: Optional[dict] = None) -> int:
    """Send an event ONLY to clients that explicitly subscribed to `graph_id`
    via /sse?g=<gid>. Used for layout_request (D6): a wildcard client cannot
    know which graph a layout belongs to, so it must neither receive the event
    nor be counted in the `clients: N` dispatch result."""
    payload = json.dumps({"graph_id": graph_id, "event": event, "data": data or {}})
    for client in list(_clients.values()):
        if client.graphs is not None and graph_id in client.graphs:
            await client.queue.put(payload)
    return explicit_client_count(graph_id)


def explicit_client_count(graph_id: str) -> int:
    return sum(
        1 for c in _clients.values() if c.graphs is not None and graph_id in c.graphs
    )


def reset_for_tests() -> None:
    _clients.clear()
