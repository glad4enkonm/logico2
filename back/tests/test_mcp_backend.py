"""Backend tests for the multi-graph MCP backend (spec D1-D16).

Run: cd back && PYTHONPATH=. .venv/bin/python -m pytest tests/ -q
"""

import asyncio
import json
import os
import sys
import tempfile

import pytest

# Point the store at a temp dir before importing app modules.
_TMP = tempfile.mkdtemp(prefix="logico2_test_")
os.environ["LOGICO_GRAPHS_DIR"] = _TMP
os.environ["LOGICO_SAVE_DEBOUNCE"] = "0"  # writes are synchronous in tests
os.environ["LOGICO_ENABLE_NEO4J"] = "0"

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import events  # noqa: E402
import graph_store  # noqa: E402


@pytest.fixture
def clean():
    graph_store.reset_for_tests(graphs_dir=_TMP)
    events.reset_for_tests()
    yield
    graph_store.reset_for_tests(graphs_dir=_TMP)
    events.reset_for_tests()


# --- API access without TestClient (no httpx in venv) -----------------------
# We call the FastAPI route handlers directly; they are plain async functions.


from fastapi import HTTPException  # noqa: E402

import main  # noqa: E402


async def call(coro):
    return await coro
def expect_http_error(fn, *args, status, **kwargs):
    with pytest.raises(HTTPException) as exc:
        if asyncio.iscoroutinefunction(fn):
            asyncio.run(fn(*args, **kwargs))
        else:
            fn(*args, **kwargs)
    assert exc.value.status_code == status, f"expected {status}, got {exc.value.status_code}: {exc.value.detail}"
    return exc.value


def expect_store_error(fn, status):
    with pytest.raises(graph_store.GraphError) as exc:
        fn()
    assert exc.value.status_code == status, f"expected {status}, got {exc.value.status_code}: {exc.value.detail}"
    return exc.value


SAMPLE_GRAPH = {
    "nodes": [{"id": "1", "label": "Node 1"}, {"id": "2", "label": "Node 2"}],
    "edges": [{"id": "e1", "source": "1", "target": "2", "label": "rel"}],
    "allValues": {"1": {"definition": "first"}},
}


def load_sample(gid="default"):
    try:
        graph_store.create_graph(gid)
    except graph_store.GraphError:
        pass
    asyncio.run(main.scoped_load_graph(gid, main.GraphData(**SAMPLE_GRAPH)))


# --- D2: resolver -------------------------------------------------------------


class TestResolver:
    def test_empty_registry_auto_creates_default(self, clean):
        gid = graph_store.resolve_graph_id(None)
        assert gid == "default"
        assert graph_store.list_graph_ids() == ["default"]

    def test_single_graph_resolves_without_id(self, clean):
        load_sample("solo")
        assert graph_store.resolve_graph_id(None) == "solo"

    def test_multiple_graphs_require_id(self, clean):
        load_sample("a")
        load_sample("b")
        err = expect_store_error(lambda: graph_store.resolve_graph_id(None), 409)
        assert "graph_id required" in err.detail
        assert "a, b" in err.detail

    def test_unknown_id_404_with_available(self, clean):
        load_sample("task42")
        err = expect_store_error(lambda: graph_store.resolve_graph_id("foo"), 404)
        assert "Graph 'foo' not found" in err.detail
        assert "task42" in err.detail

    def test_invalid_gid_format_rejected(self, clean):
        for bad in ["bad id", "bad/id", "../etc", "a.b", "", "кот"]:
            err = expect_store_error(lambda g=bad: graph_store.validate_graph_id(g), 400)
            assert "Invalid graph_id" in err.detail


# --- D12 + D5: persistence ----------------------------------------------------


class TestPersistence:
    def test_atomic_write_through(self, clean):
        load_sample("p1")
        path = os.path.join(_TMP, "p1.json")
        assert os.path.exists(path)
        on_disk = json.load(open(path))
        assert on_disk["nodes"][0]["id"] == "1"

    def test_load_all_from_disk_roundtrip(self, clean):
        load_sample("rt")
        graph_store.reset_for_tests(graphs_dir=_TMP)
        loaded = graph_store.load_all_from_disk()
        assert "rt" in loaded
        assert graph_store.get_graph("rt")["edges"][0]["id"] == "e1"

    def test_no_tmp_files_left_behind(self, clean):
        load_sample("p2")
        files = os.listdir(_TMP)
        assert all(not f.endswith(".tmp") for f in files)

    def test_save_now_returns_path(self, clean):
        load_sample("sv")
        path = graph_store.save_now("sv")
        assert path == os.path.join(_TMP, "sv.json")

    def test_invalid_gid_never_touches_disk(self, clean):
        with pytest.raises(Exception):
            graph_store.create_graph("../evil")
        assert not os.path.exists(os.path.join(_TMP, "..json"))
        assert "../evil" not in os.listdir(_TMP)


# --- CRUD (D9, D11, D16) ------------------------------------------------------


class TestCrud:
    def test_create_node_minimal_response(self, clean):
        load_sample()
        result = asyncio.run(main._create_node("default", main.NodeCreate(id="3", label="N3")))
        assert result == {"id": "3"}
        nodes = graph_store.get_graph("default")["nodes"]
        assert any(n["id"] == "3" for n in nodes)

    def test_create_node_duplicate_409(self, clean):
        load_sample()
        expect_http_error(
            main._create_node, "default", main.NodeCreate(id="1", label="dup"), status=409
        )

    def test_update_node_merges_keeps_xy(self, clean):
        load_sample()
        graph_store.get_graph("default")["nodes"][0]["x"] = 11.5
        asyncio.run(main._update_node("default", "1", main.NodeUpdate(label="renamed")))
        node = next(n for n in graph_store.get_graph("default")["nodes"] if n["id"] == "1")
        assert node["label"] == "renamed"
        assert node["x"] == 11.5  # D9: existing coords survive a partial update

    def test_update_node_missing_404(self, clean):
        load_sample()
        expect_http_error(
            main._update_node, "default", "nope", main.NodeUpdate(label="x"), status=404
        )

    def test_delete_node_removes_connected_edges(self, clean):
        load_sample()
        asyncio.run(main._delete_node("default", "1"))
        graph = graph_store.get_graph("default")
        assert all(n["id"] != "1" for n in graph["nodes"])
        assert graph["edges"] == []  # e1 connected 1->2

    def test_create_edge_validates_endpoints(self, clean):
        load_sample()
        expect_http_error(
            main._create_edge,
            "default",
            main.EdgeCreate(source="1", target="ghost", label="x"),
            status=404,
        )
        expect_http_error(
            main._create_edge,
            "default",
            main.EdgeCreate(source="ghost", target="1", label="x"),
            status=404,
        )

    def test_create_edge_autogenerates_id(self, clean):
        load_sample()
        result = asyncio.run(
            main._create_edge("default", main.EdgeCreate(source="1", target="2", label="r2"))
        )
        assert result["id"].startswith("e-")
        assert len(graph_store.get_graph("default")["edges"]) == 2

    def test_create_edge_with_explicit_id_kept(self, clean):
        load_sample()
        result = asyncio.run(
            main._create_edge(
                "default", main.EdgeCreate(id="my-edge", source="1", target="2", label="r2")
            )
        )
        assert result == {"id": "my-edge"}

    def test_create_edge_duplicate_id_409(self, clean):
        load_sample()
        expect_http_error(
            main._create_edge,
            "default",
            main.EdgeCreate(id="e1", source="1", target="2", label="x"),
            status=409,
        )

    def test_update_edge_merge_and_validation(self, clean):
        load_sample()
        asyncio.run(main._update_edge("default", "e1", main.EdgeUpdate(label="renamed")))
        edge = graph_store.get_graph("default")["edges"][0]
        assert edge["label"] == "renamed"
        assert edge["source"] == "1"  # untouched by patch
        expect_http_error(
            main._update_edge, "default", "e1", main.EdgeUpdate(target="ghost"), status=404
        )

    def test_delete_edge(self, clean):
        load_sample()
        asyncio.run(main._delete_edge("default", "e1"))
        assert graph_store.get_graph("default")["edges"] == []

    def test_load_graph_validates_bulk_edges(self, clean):
        graph_store.create_graph("bad")
        bad = {
            "nodes": [{"id": "1", "label": "a"}],
            "edges": [{"source": "1", "target": "missing", "label": "x", "id": "e1"}],
            "allValues": {},
        }
        expect_http_error(
            main.scoped_load_graph, "bad", main.GraphData(**bad), status=400
        )

    def test_load_graph_fills_edge_ids(self, clean):
        graph_store.create_graph("bulk")
        g = {
            "nodes": [{"id": "1", "label": "a"}, {"id": "2", "label": "b"}],
            "edges": [{"source": "1", "target": "2", "label": "x", "id": None}],
            "allValues": {},
        }
        asyncio.run(main.scoped_load_graph("bulk", main.GraphData(**g)))
        edge = graph_store.get_graph("bulk")["edges"][0]
        assert edge["id"] and edge["id"].startswith("e-")


# --- D8: positions ------------------------------------------------------------


class TestPositions:
    def test_positions_silent_merge(self, clean):
        load_sample()
        req = main.PositionsRequest(
            positions=[{"id": "1", "x": 3.5, "y": -7.25}, {"id": "ghost", "x": 0, "y": 0}]
        )
        asyncio.run(main._positions("default", req))
        node = next(n for n in graph_store.get_graph("default")["nodes"] if n["id"] == "1")
        assert node["x"] == 3.5 and node["y"] == -7.25
        # persisted silently
        on_disk = json.load(open(os.path.join(_TMP, "default.json")))
        assert on_disk["nodes"][0]["x"] == 3.5

    def test_positions_no_broadcast(self, clean):
        load_sample()
        client = events.register({"default"})
        asyncio.run(main._positions("default", main.PositionsRequest(
            positions=[{"id": "1", "x": 1, "y": 2}]
        )))
        # no event queued => queue empty
        assert client.queue.qsize() == 0


# --- D6 + D7: layout transport --------------------------------------------------


class TestLayout:
    def test_layout_whitelist_rejects_unknown(self, clean):
        load_sample()
        expect_http_error(
            main._layout, "default", main.LayoutRequest(**{"type": "circlee"}), status=400
        )
        assert "Allowed:" in expect_http_error(
            main._layout, "default", main.LayoutRequest(**{"type": "bad"}), status=400
        ).detail

    def test_layout_dispatches_sse_with_client_count(self, clean):
        load_sample()
        tab = events.register({"default"})
        result = asyncio.run(main._layout("default", main.LayoutRequest(**{"type": "circular"})))
        assert result == {"clients": 1}
        payload = json.loads(tab.queue.get_nowait())
        assert payload["graph_id"] == "default"
        assert payload["event"] == "layout_request"
        assert payload["data"]["layoutOptions"]["type"] == "circular"

    def test_layout_no_tab_clients_zero(self, clean):
        load_sample()
        result = asyncio.run(main._layout("default", main.LayoutRequest(**{"type": "dagre"})))
        assert result == {"clients": 0}

    def test_layout_passes_extra_params(self, clean):
        load_sample()
        tab = events.register({"default"})
        asyncio.run(main._layout("default", main.LayoutRequest(**{
            "type": "gForce", "nodeSpacing": 80, "preventOverlap": True
        })))
        options = json.loads(tab.queue.get_nowait())["data"]["layoutOptions"]
        assert options["nodeSpacing"] == 80
        assert options["preventOverlap"] is True

    def test_layout_wildcard_not_counted(self, clean):
        """A wildcard client (no ?g=) is not an explicit subscriber, so it is
        neither dispatched nor counted for layout (D6)."""
        load_sample()
        events.register(None)  # legacy tab without g param
        result = asyncio.run(main._layout("default", main.LayoutRequest(**{"type": "grid"})))
        assert result == {"clients": 0}

    def test_layout_excludes_wildcard_and_cross_graph(self, clean):
        """D6: layout goes to explicit subscribers only — a wildcard client
        cannot know which graph a layout belongs to, so it must not receive
        the event nor be counted; other graphs' subscribers get nothing."""
        load_sample("default")
        load_sample("other")
        wildcard = events.register(None)
        other_tab = events.register({"other"})
        tab = events.register({"default"})
        result = asyncio.run(main._layout("default", main.LayoutRequest(**{"type": "circular"})))
        assert result == {"clients": 1}  # wildcard NOT counted
        assert tab.queue.qsize() == 1
        assert wildcard.queue.qsize() == 0  # wildcard receives no layout_request
        assert other_tab.queue.qsize() == 0
        # graph_update still reaches the wildcard (legacy tabs keep working)
        asyncio.run(main._create_node("default", main.NodeCreate(id="n", label="N")))
        assert wildcard.queue.qsize() == 1


# --- D10: multiplexed SSE -------------------------------------------------------


class TestSse:
    def test_events_carry_graph_id_and_client_filters(self, clean):
        load_sample("a")
        load_sample("b")
        tab_a = events.register({"a"})
        tab_b = events.register({"b"})
        asyncio.run(main._create_node("a", main.NodeCreate(id="n", label="N")))
        # only tab_a receives
        assert tab_a.queue.qsize() == 1
        assert tab_b.queue.qsize() == 0
        payload = json.loads(tab_a.queue.get_nowait())
        assert payload["graph_id"] == "a"
        assert payload["event"] == "graph_update"
        assert payload["data"]["graph"]["nodes"][0]["id"] == "1"

    def test_wildcard_receives_all(self, clean):
        load_sample("a")
        load_sample("b")
        wc = events.register(None)
        asyncio.run(main._create_node("a", main.NodeCreate(id="n1", label="N")))
        asyncio.run(main._create_node("b", main.NodeCreate(id="n2", label="N")))
        assert wc.queue.qsize() == 2

    def test_unregistered_client_gets_nothing(self, clean):
        load_sample()
        tab = events.register({"default"})
        events.unregister(tab)
        asyncio.run(main._create_node("default", main.NodeCreate(id="n", label="N")))
        assert tab.queue.qsize() == 0


# --- D14: error string conventions -----------------------------------------------


class TestErrorStrings:
    def test_resolver_strings(self, clean):
        load_sample("default")
        load_sample("task42")
        err = expect_store_error(lambda: graph_store.resolve_graph_id(None), 409)
        assert err.detail == "graph_id required. Available: default, task42"
        err = expect_store_error(lambda: graph_store.resolve_graph_id("nope"), 404)
        assert err.detail == "Graph 'nope' not found. Available: default, task42"

    def test_node_not_found_string(self, clean):
        load_sample()
        err = expect_http_error(
            main._update_node, "default", "abc", main.NodeUpdate(label="x"), status=404
        )
        assert err.detail == "Node 'abc' not found"

    def test_layout_error_string(self, clean):
        load_sample()
        err = expect_http_error(
            main._layout, "default", main.LayoutRequest(**{"type": "circlee"}), status=400
        )
        assert err.detail.startswith("Layout 'circlee' not allowed. Allowed: ")


# --- legacy endpoint parity (D2 paths without gid) --------------------------------


class TestLegacy:
    def test_legacy_create_resolves_default(self, clean):
        result = asyncio.run(main.legacy_create_node(main.NodeCreate(id="n1", label="N")))
        assert result == {"id": "n1"}
        assert graph_store.list_graph_ids() == ["default"]

    def test_legacy_load_graph(self, clean):
        asyncio.run(main.legacy_load_graph(main.GraphData(**SAMPLE_GRAPH)))
        assert graph_store.get_graph("default")["nodes"][0]["id"] == "1"

    def test_legacy_409_when_multiple(self, clean):
        load_sample("a")
        load_sample("b")
        expect_http_error(
            main.legacy_create_node, main.NodeCreate(id="n", label="N"), status=409
        )
