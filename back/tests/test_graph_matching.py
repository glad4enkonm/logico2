import pytest
from unittest.mock import patch, MagicMock
from typing import List, Dict, Any
from models import GraphData, Node, Edge, Object, Relation
from graph_matching import (
    calculate_string_embedding,
    find_best_match_for_object,
    find_best_match_for_relation,
    get_neighbors,
    search_all,
    MIN_DOT_PRODUCT_THRESHOLD
)

# Mock data for testing
@pytest.fixture
def mock_graph_data():
    return GraphData(
        nodes=[Node(id="1", label="Node 1"), Node(id="2", label="Node 2")],
        edges=[Edge(source="1", target="2", label="Edge 1", id="e1")],
        allValues={
            "1": {"type": "node", "definition": "Definition 1"},
            "2": {"type": "node", "definition": "Definition 2"},
            "e1": {"definition": "Edge definition"}
        }
    )

@pytest.fixture
def mock_object():
    return Object(
        name="Test Object",
        type="test_type",
        attributes={"key": "value"},
        definition="Test definition",
        context="Test context"
    )

@pytest.fixture
def mock_relation():
    return Relation(
        type="test_relation",
        source="1",
        target="2",
        definition="Relation definition",
        context="Relation context"
    )

# Test calculate_string_embedding with mock
@patch('graph_matching.cached_calculate_embedding')
def test_calculate_string_embedding(mock_calculate_embedding, mock_graph_data):
    mock_response = {"embedding": [0.1, 0.2, 0.3]}
    mock_calculate_embedding.return_value = mock_response

    result = calculate_string_embedding("test_id", "test definition")
    assert result == mock_response
    mock_calculate_embedding.assert_called_once_with("test_id: test definition")

# Test find_best_match_for_object
@patch('graph_matching.calculate_string_embedding')
def test_find_best_match_for_object(mock_calculate_embedding, mock_graph_data, mock_object):
    # Mock embeddings
    mock_calculate_embedding.side_effect = [
        {"embedding": [0.1, 0.2, 0.3]},  # Object embedding
        {"embedding": [0.05, 0.1, 0.15]},  # Node 1 embedding
        {"embedding": [0.01, 0.02, 0.03]},  # Node 2 embedding
        {"embedding": [0.0, 0.0, 0.0]}     # Edge embedding (not used but called in the loop)
    ]

    # Calculate expected score (dot product)
    expected_score = sum(a * b for a, b in zip([0.1, 0.2, 0.3], [0.05, 0.1, 0.15]))

    # Test with a low threshold for testing
    match_id, score = find_best_match_for_object(mock_object, mock_graph_data, min_threshold=0)
    assert match_id == "1"
    assert score == expected_score

# Test find_best_match_for_relation
@patch('graph_matching.calculate_string_embedding')
def test_find_best_match_for_relation(mock_calculate_embedding, mock_graph_data, mock_relation):
    # Mock embeddings
    mock_calculate_embedding.side_effect = [
        {"embedding": [0.1, 0.2, 0.3]},  # Relation embedding
        {"embedding": [0.05, 0.1, 0.15]}   # Edge embedding
    ]

    # Calculate expected score (dot product)
    expected_score = sum(a * b for a, b in zip([0.1, 0.2, 0.3], [0.05, 0.1, 0.15]))

    # Test with a low threshold for testing
    match_id, score = find_best_match_for_relation(mock_relation, mock_graph_data, min_threshold=0)
    assert match_id == "e1"
    assert score == expected_score

# Test get_neighbors
def test_get_neighbors(mock_graph_data):
    # Create optimized lookup structures
    node_ids = {node.id for node in mock_graph_data.nodes}
    edge_ids = {edge.id for edge in mock_graph_data.edges}

    # Test with node that has neighbors
    neighbors = get_neighbors("1", mock_graph_data, set(), node_ids, edge_ids)
    assert neighbors == ["2"]

    # Test with node that has no neighbors
    neighbors = get_neighbors("2", mock_graph_data, set(), node_ids, edge_ids)
    assert neighbors == ["1"]

    # Test with empty matched_entities
    neighbors = get_neighbors("1", mock_graph_data, set(), node_ids, edge_ids)
    assert neighbors == ["2"]

    # Test with non-existent node
    neighbors = get_neighbors("3", mock_graph_data, set(), node_ids, edge_ids)
    assert neighbors == []

    # Test with edge
    neighbors = get_neighbors("e1", mock_graph_data, set(), node_ids, edge_ids)
    assert neighbors == ["1", "2"]

# Test search_all with objects
@patch('graph_matching.find_best_match_for_object')
def test_search_all_with_objects(mock_find_object, mock_graph_data, mock_object):
    # Mock find_best_match_for_object to return a match
    mock_find_object.return_value = ("1", MIN_DOT_PRODUCT_THRESHOLD + 1)

    # Test with objects and a low threshold for testing
    result = search_all(mock_graph_data, [mock_object], [], min_threshold=0)
    assert len(result["nodes"]) == 1
    assert result["nodes"][0].id == "1"
    assert len(result["links"]) == 1
    assert result["links"][0]["node"] == "1"
    assert result["links"][0]["neighbors"] == ["2"]

# Test search_all with relations
@patch('graph_matching.find_best_match_for_relation')
def test_search_all_with_relations(mock_find_relation, mock_graph_data, mock_relation):
    # Mock find_best_match_for_relation to return a match
    mock_find_relation.return_value = ("e1", MIN_DOT_PRODUCT_THRESHOLD + 1)

    # Test with relations and a low threshold for testing
    result = search_all(mock_graph_data, [], [mock_relation], min_threshold=0)
    assert len(result["edges"]) == 1
    assert result["edges"][0].id == "e1"
    assert len(result["links"]) == 1
    assert result["links"][0]["edge"] == "e1"
    assert result["links"][0]["neighbors"] == ["1", "2"]

# Test search_all with no matches
@patch('graph_matching.find_best_match_for_object')
@patch('graph_matching.find_best_match_for_relation')
def test_search_all_no_matches(mock_find_object, mock_find_relation, mock_graph_data, mock_object, mock_relation):
    # Mock find_best_match_for_object and find_best_match_for_relation to return no matches
    mock_find_object.return_value = (None, 0)
    mock_find_relation.return_value = (None, 0)

    # Test with no matches
    result = search_all(mock_graph_data, [mock_object], [mock_relation], min_threshold=0)
    assert len(result["nodes"]) == 0
    assert len(result["edges"]) == 0
    assert len(result["links"]) == 0

# Test search_all with empty input
def test_search_all_empty_input(mock_graph_data):
    # Test with empty input
    result = search_all(mock_graph_data, [], [], min_threshold=0)
    assert len(result["nodes"]) == 0
    assert len(result["edges"]) == 0
    assert len(result["links"]) == 0