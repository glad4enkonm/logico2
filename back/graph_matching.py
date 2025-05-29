import requests
from fastapi import HTTPException
from typing import List, Dict, Any, Set, Tuple, Optional
from functools import lru_cache
from models import GraphData, Object, Relation

# Minimum dot product threshold for considering a match
MIN_DOT_PRODUCT_THRESHOLD = 200

# In-memory cache for string embeddings
@lru_cache(maxsize=1000)
def cached_calculate_embedding(text: str) -> Dict:
    """Calculate embedding for a given text using the embeddings API with caching."""
    url = "http://localhost:11434/api/embeddings" # replace to localhost to debug
    payload = {
        "model": "nomic-embed-text",
        "prompt": text
    }
    headers = {
        "Content-Type": "application/json"
    }

    response = requests.post(url, json=payload, headers=headers)

    if response.status_code == 200:
        return response.json()
    else:
        raise HTTPException(status_code=response.status_code,
                            detail="Error calculating embedding")

def calculate_string_embedding(entity_id: str, definition: str) -> Dict:
    """Create a string embedding from an entity ID and its definition with caching."""
    if not definition:
        return {}

    # Create a string combining ID and definition
    text = f"{entity_id}: {definition}"    
    return cached_calculate_embedding(text)

def find_best_match_for_object(obj: Object, graph_data: GraphData, min_threshold: float = MIN_DOT_PRODUCT_THRESHOLD) -> Tuple[Optional[str], float]:
    """Find the best matching node for a given object."""
    # Calculate embedding for the object
    assert obj.get("name", "") != "" or obj.get("definition", "") != ""
    obj_embedding = calculate_string_embedding(obj.get("name", ""), obj.get("definition", ""))

    best_match_id = None
    highest_score = -1

    for node_id, node_data in graph_data.allValues.items():
        # Calculate embedding for this node
        node_embedding = calculate_string_embedding(node_id, node_data.get("definition", ""))

        # Calculate similarity score
        if "embedding" in obj_embedding and "embedding" in node_embedding:
            score = sum(a * b for a, b in zip(obj_embedding["embedding"], node_embedding["embedding"]))

            # Update best match if this score is higher and above threshold
            if score > highest_score and score > min_threshold:
                highest_score = score
                best_match_id = node_id

    return best_match_id, 0 if best_match_id is None else highest_score

def find_best_match_for_relation(relation: Relation, graph_data: GraphData, min_threshold: float = MIN_DOT_PRODUCT_THRESHOLD) -> Tuple[Optional[str], float]:
    """Find the best matching edge for a given relation."""
    # Calculate embedding for the relation
    source = relation.get("source", "")
    target = relation.get("target", "")
    definition = relation.get("definition", "")
    assert source != "" and target != ""
    relation_embedding = calculate_string_embedding(f"{source}-{target}", definition)

    best_match_id = None
    highest_score = -1

    for edge in graph_data.edges:
        # Calculate embedding for this edge
        edge_embedding = calculate_string_embedding(f"{edge.source}-{edge.target}", graph_data.allValues.get(edge.id, {}).get("definition", ""))

        # Calculate similarity score
        if "embedding" in relation_embedding and "embedding" in edge_embedding:
            score = sum(a * b for a, b in zip(relation_embedding["embedding"], edge_embedding["embedding"]))

            # Update best match if this score is higher and above threshold
            if score > highest_score and score > min_threshold:
                highest_score = score
                best_match_id = edge.id

    return best_match_id, 0 if best_match_id is None else highest_score

def get_neighbors(entity_id: str, graph_data: GraphData, matched_entities: Set[str], node_ids: Set[str], edge_ids: Set[str]) -> List[str]:
    """Get direct neighbors (only IDs) for a given entity (node or edge)."""
    neighbors = []

    if entity_id in edge_ids:
        # This is an edge, return its source and target if not already matched
        for edge in graph_data.edges:
            if edge.id == entity_id:
                if edge.source not in matched_entities:
                    neighbors.append(edge.source)
                if edge.target not in matched_entities:
                    neighbors.append(edge.target)
                break
    elif entity_id in node_ids:
        # This is a node, find all edges connected to it
        for edge in graph_data.edges:
            if edge.source == entity_id and edge.target not in matched_entities:
                neighbors.append(edge.target)
                if edge not in neighbors:
                    neighbors.append(edge)
            elif edge.target == entity_id and edge.source not in matched_entities:
                neighbors.append(edge.source)
                if edge not in neighbors:
                    neighbors.append(edge)

    return neighbors

def search_all(graph_data: GraphData, objects: List[Object], relations: List[Relation], min_threshold: float = MIN_DOT_PRODUCT_THRESHOLD) -> Dict[str, Any]:
    """Search the graph for all relevant nodes and edges based on the query objects and relations."""
    # Create optimized lookup structures once
    node_ids = {node.id for node in graph_data.nodes}
    edge_ids = {edge.id for edge in graph_data.edges}
    
    # If no query objects or relations are provided, return empty results
    if not objects and not relations:
        return {"nodes": [], "edges": [], "links": []}
    
    # Initialize variables to track matched entities
    matched_nodes: Set[str] = set()
    matched_edges: Set[str] = set()
    links = []

    # Process each object in the query
    for obj in objects:
        result = find_best_match_for_object(obj, graph_data, min_threshold)
        if isinstance(result, tuple) and len(result) == 2:
            best_match_id, _ = result
        else:
            best_match_id = result

        # If we found a match, add it to the results
        if best_match_id:
            matched_nodes.add(best_match_id)

            # Add direct neighbors (only IDs)
            neighbors = get_neighbors(best_match_id, graph_data, matched_nodes, node_ids, edge_ids)
            links.append({"node": best_match_id, "neighbors": neighbors})

    # Process each relation in the query
    for relation in relations:
        result = find_best_match_for_relation(relation, graph_data, min_threshold)
        if isinstance(result, tuple) and len(result) == 2:
            best_match_id, _ = result
        else:
            best_match_id = result

        # If we found a match, add it to the results
        if best_match_id:
            matched_edges.add(best_match_id)

            # Add direct neighbors (only IDs)
            neighbors = get_neighbors(best_match_id, graph_data, matched_edges, node_ids, edge_ids)
            links.append({"edge": best_match_id, "neighbors": neighbors})

    # Prepare the response with matched nodes, edges, and links
    return {
        "nodes": [node for node in graph_data.nodes if node.id in matched_nodes],
        "edges": [edge for edge in graph_data.edges if edge.id in matched_edges],
        "links": links
    }
