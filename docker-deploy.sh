#!/bin/bash

# Docker Deployment Script for NDA Analyzer
# This script ensures consistent deployment without the errors from direct deployment

set -e  # Exit on any error

echo "🚀 Starting Docker deployment for NDA Analyzer..."

# Check if running on EC2 or local
if [ "$1" == "production" ]; then
    ENV_FILE=".env.docker.production"
    COMPOSE_FILE="docker-compose.production.yml"
    echo "📦 Using production configuration"
else
    ENV_FILE=".env.docker.local"
    COMPOSE_FILE="docker-compose.yml"
    echo "📦 Using local/development configuration"
fi

# Verify required files exist
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: $ENV_FILE not found!"
    exit 1
fi

if [ ! -f "$COMPOSE_FILE" ]; then
    echo "❌ Error: $COMPOSE_FILE not found!"
    exit 1
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f $COMPOSE_FILE down || true

# Build fresh image (ensures all fixes are included)
echo "🔨 Building Docker image..."
docker build --no-cache -t nda-analyzer:latest .

# Start container
echo "🚀 Starting container..."
docker-compose -f $COMPOSE_FILE up -d

# Wait for health check
echo "⏳ Waiting for application to be ready..."
MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
        echo "✅ Application is healthy!"
        break
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
    echo "⏳ Waiting... (attempt $ATTEMPT/$MAX_ATTEMPTS)"
    sleep 2
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo "❌ Application failed to start. Checking logs..."
    docker-compose -f $COMPOSE_FILE logs --tail=50
    exit 1
fi

# Show status
echo "📊 Container status:"
docker-compose -f $COMPOSE_FILE ps

echo "✅ Deployment complete!"
echo ""
echo "🔍 Useful commands:"
echo "  View logs:   docker-compose -f $COMPOSE_FILE logs -f"
echo "  Stop:        docker-compose -f $COMPOSE_FILE down"
echo "  Restart:     docker-compose -f $COMPOSE_FILE restart"
echo "  Shell:       docker-compose -f $COMPOSE_FILE exec app sh"