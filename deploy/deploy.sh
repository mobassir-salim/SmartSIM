#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Configuration
PROD_COMPOSE_FILE="docker-compose.prod.yml"
SERVICES=("auth-service" "sim-service" "plan-service" "wallet-service" "order-service" "notification-service" "gateway")

echo "============================================="
echo "   SMARTSIM PRODUCTION DEPLOYMENT STARTING   "
echo "============================================="

# 1. Ensure we are in the deployment directory
DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DEPLOY_DIR"

# 2. Check for .env file
if [ ! -f .env ]; then
    echo "ERROR: .env file not found in $DEPLOY_DIR!"
    echo "Please create a .env file with production credentials before deploying."
    echo "Example keys needed:"
    echo "  POSTGRES_PASSWORD=supersecurepassword"
    echo "  JWT_SECRET=supersecurejwtsecretkey"
    exit 1
fi

# 3. Pull latest changes
echo "--> Pulling latest changes from Git..."
cd ..
git pull origin main || echo "Warning: git pull failed, deploying current local files."
cd "$DEPLOY_DIR"

# 4. Build and start services
echo "--> Rebuilding and starting Docker containers..."
docker compose -f "$PROD_COMPOSE_FILE" down --remove-orphans
docker compose -f "$PROD_COMPOSE_FILE" up -d --build

# 5. Wait for containers to start
echo "--> Waiting 15 seconds for services to boot up..."
sleep 15

# 6. Validate Service Health
echo "--> Running health checks..."
FAILED_HEALTH=0

for service in "${SERVICES[@]}"; do
    echo "Checking health for $service..."
    
    # We execute curl inside Nginx container to reach endpoints securely via internal docker bridge network
    STATUS=$(docker compose -f "$PROD_COMPOSE_FILE" exec -T gateway curl -s -o /dev/null -w "%{http_code}" http://gateway/api/health || echo "FAILED")
    
    # Custom health check path routing
    if [ "$service" == "gateway" ]; then
        URL="http://localhost/api/auth/health"
    elif [ "$service" == "auth-service" ]; then
        URL="http://auth-service:8001/api/auth/health"
    elif [ "$service" == "sim-service" ]; then
        URL="http://sim-service:8002/api/sims/health"
    elif [ "$service" == "plan-service" ]; then
        URL="http://plan-service:8003/api/plans/health"
    elif [ "$service" == "wallet-service" ]; then
        URL="http://wallet-service:8004/api/wallet/health"
    elif [ "$service" == "order-service" ]; then
        URL="http://order-service:8005/api/orders/health"
    elif [ "$service" == "notification-service" ]; then
        URL="http://notification-service:8006/api/notifications/health"
    fi

    STATUS=$(docker compose -f "$PROD_COMPOSE_FILE" exec -T gateway curl -s -o /dev/null -w "%{http_code}" "$URL" || echo "FAILED")

    if [ "$STATUS" == "200" ]; then
        echo "✅ $service is healthy (HTTP 200)"
    else
        echo "❌ $service health check failed! Response code: $STATUS"
        FAILED_HEALTH=1
    fi
done

if [ $FAILED_HEALTH -eq 0 ]; then
    echo "============================================="
    echo "  🎉 DEPLOYMENT SUCCEEDED AND ALL HEALTHY!  "
    echo "============================================="
    exit 0
else
    echo "============================================="
    echo "  ⚠️ DEPLOYMENT FINISHED WITH HEALTH ERRORS  "
    echo "  Please inspect logs: 'docker compose logs' "
    echo "============================================="
    exit 1
fi
