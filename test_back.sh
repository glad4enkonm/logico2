#!/bin/bash

# Function to test an endpoint
test_endpoint() {
  local url=$1
  local name=$2
  echo "Testing $name endpoint..."
  local response=$(curl -s -o /dev/null -w "%{http_code}" $url)

  if [ "$response" -eq 200 ]; then
    echo "Success: Endpoint is responding with status code $response"
  else
    echo "Error: Endpoint is not responding correctly. Status code: $response"
  fi
  echo ""
}

# Function to normalize JSON (remove whitespace)
normalize_json() {
  echo "$1" | tr -d ' \t\n\r'
}

# Function to test graph data operations
test_graph_operations() {
  local base_url=$1

  # Sample graph data in the correct format
  local graph_data='{
    "nodes": [
      {"id": "1", "label": "Node 1"},
      {"id": "2", "label": "Node 2"}
    ],
    "edges": [
      {"source": "1", "target": "2", "label": "Edge 1", "id": "e1"}
    ],
    "allValues": {}
  }'

  # Test writing graph data
  echo "Testing graph data write operation..."
  local write_response=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "$graph_data" "$base_url/load-graph")

  if [ "$write_response" -eq 200 ]; then
    echo "Success: Graph data write operation completed with status code $write_response"
  else
    echo "Error: Graph data write operation failed. Status code: $write_response"
  fi
  echo ""

  # Test reading graph data
  echo "Testing graph data read operation..."
  local read_response=$(curl -s "$base_url/graph")
  local read_status=$?

  if [ $read_status -ne 0 ]; then
    echo "Error: Failed to read graph data. HTTP status: $read_status"
    return
  fi

  # Normalize both JSON strings for comparison
  local normalized_sent=$(normalize_json "$graph_data")
  local normalized_returned=$(normalize_json "$read_response")

  # Check if the returned data matches the sent data
  if [ "$normalized_returned" == "$normalized_sent" ]; then
    echo "Success: Returned graph data matches the sent data"
  else
    echo "Error: Returned graph data does not match the sent data"
    echo "Sent data:"
    echo "$graph_data"
    echo "Returned data:"
    echo "$read_response"
  fi
  echo ""
}

# Base URL
BASE_URL="http://localhost:8000"

# Test various endpoints
test_endpoint "$BASE_URL/embedding" "generate"

# Test graph data operations
test_graph_operations "$BASE_URL"
