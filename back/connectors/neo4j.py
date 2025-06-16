import os
from neo4j import AsyncGraphDatabase
from dotenv import load_dotenv

# --- Configuration ---
# Load .env file for credentials
load_dotenv()

# Read connection details from environment
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password_not_set")

# Read property mapping from environment for consistent use across this module
NEO4J_ID_PROPERTY = os.getenv("NEO4J_ID_PROPERTY", "uuid")
NEO4J_LABEL_PROPERTY = os.getenv("NEO4J_LABEL_PROPERTY", "name")

_driver = None

async def get_driver():
    global _driver
    if _driver is None:
        try:
            _driver = AsyncGraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
            await _driver.verify_connectivity()
            print("Successfully connected to Neo4j.")
        except Exception as e:
            print(f"Failed to connect to Neo4j: {e}")
            _driver = None
            raise
    return _driver

async def close_driver():
    global _driver
    if _driver is not None:
        await _driver.close()
        _driver = None
        print("Neo4j connection closed.")

async def get_all_nodes_async():
    """Fetches all nodes and transforms them into the application's data structure."""
    driver = await get_driver()
    if not driver: return [], {}

    transformed_nodes = []
    node_all_values = {}
    try:
        async with driver.session() as session:
            result = await session.run("MATCH (n) RETURN n")
            records = await result.values()
            for record in records:
                node = record[0]
                properties = dict(node.items())

                # ID Mapping
                node_id = properties.get(NEO4J_ID_PROPERTY, node.element_id)

                # Label Mapping
                node_label = properties.get(NEO4J_LABEL_PROPERTY)
                if not node_label:
                    labels = list(node.labels)
                    node_label = labels[0] if labels else "DefaultNodeLabel"
                
                transformed_nodes.append({"id": str(node_id), "label": str(node_label)})
                node_all_values[str(node_id)] = properties

    except Exception as e:
        print(f"Error querying Neo4j nodes: {e}")
        raise
    return transformed_nodes, node_all_values

async def get_all_relationships_async():
    """Fetches all relationships and transforms them into the application's data structure."""
    driver = await get_driver()
    if not driver: return [], {}

    transformed_edges = []
    edge_all_values = {}
    try:
        async with driver.session() as session:
            result = await session.run("MATCH (n)-[r]->(m) RETURN n, r, m")
            async for record in result:
                source_node, rel, target_node = record["n"], record["r"], record["m"]

                # Use the same ID mapping logic for source and target nodes
                source_id = source_node.get(NEO4J_ID_PROPERTY, source_node.element_id)
                target_id = target_node.get(NEO4J_ID_PROPERTY, target_node.element_id)
                rel_id = rel.element_id
                properties = dict(rel.items())

                transformed_edges.append({
                    "id": str(rel_id),
                    "source": str(source_id),
                    "target": str(target_id),
                    "label": rel.type
                })
                edge_all_values[str(rel_id)] = properties

    except Exception as e:
        print(f"Error querying Neo4j relationships: {e}")
        raise
    return transformed_edges, edge_all_values
