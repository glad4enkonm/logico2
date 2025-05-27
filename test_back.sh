#!/bin/bash

# Check if the generate endpoint is responding
echo "Testing generate endpoint..."
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/embedding)

if [ "$response" -eq 200 ]; then
  echo "Success: Endpoint is responding with status code $response"
else
  echo "Error: Endpoint is not responding correctly. Status code: $response"
fi