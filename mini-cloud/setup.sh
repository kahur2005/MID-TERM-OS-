#!/bin/bash
set -e

echo "=== Mini Cloud System Setup ==="
echo ""

# Ensure we're in the right directory
cd "$(dirname "$0")"

# Create persistent data directory
mkdir -p data

# Build the deployable service image
echo "[1/3] Building hello-service image..."
docker build -t mini-cloud-hello ./services/hello-service
echo "      Done."

# Build and start the controller
echo "[2/3] Starting controller via docker-compose..."
docker-compose up -d --build
echo "      Done."

# Wait for controller to be ready
echo "[3/3] Waiting for controller to become healthy..."
for i in $(seq 1 15); do
  if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "      Controller is up!"
    break
  fi
  sleep 2
done

echo ""
echo "============================================="
echo "  Mini Cloud System is running!"
echo "============================================="
echo ""
echo "  Controller API:  http://localhost:3000"
echo "  Health check:    http://localhost:3000/api/health"
echo "  Metrics:         http://localhost:3000/api/metrics"
echo ""
echo "  Quick commands:"
echo ""
echo "  # Start an instance"
echo "  curl -s -X POST http://localhost:3000/api/instances \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"name\": \"my-service\", \"cpu\": 0.5, \"memory\": 64}' | jq"
echo ""
echo "  # List instances"
echo "  curl -s http://localhost:3000/api/instances | jq"
echo ""
echo "  # Access via proxy (replace <id> with instance id)"
echo "  curl -s http://localhost:3000/proxy/<id>/"
echo ""
echo "  # Stop everything"
echo "  docker-compose down"
echo ""
