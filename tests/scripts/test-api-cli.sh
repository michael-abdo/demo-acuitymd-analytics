#!/bin/bash

# Test NDA API endpoints from command line
# This script tests the APIs without authentication (will show redirects)

echo "🧪 NDA API Test Suite (CLI)"
echo "=========================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Base URL
BASE_URL="http://localhost:3001"

# Test function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo -e "${BLUE}Testing: $description${NC}"
    echo "Method: $method"
    echo "Endpoint: $endpoint"
    
    if [ -z "$data" ]; then
        response=$(curl -s -X $method -w "\nHTTP_STATUS:%{http_code}" "$BASE_URL$endpoint")
    else
        response=$(curl -s -X $method -H "Content-Type: application/json" -d "$data" -w "\nHTTP_STATUS:%{http_code}" "$BASE_URL$endpoint")
    fi
    
    body=$(echo "$response" | sed -n '1,/HTTP_STATUS:/p' | sed '$d')
    status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
    
    if [ "$status" = "200" ] || [ "$status" = "201" ]; then
        echo -e "${GREEN}✓ Status: $status${NC}"
    else
        echo -e "${RED}✗ Status: $status${NC}"
    fi
    
    echo "Response: $body"
    echo "---"
    echo ""
}

# Test 1: List Documents
test_endpoint "GET" "/api/documents" "" "List all documents"

# Test 2: List with pagination
test_endpoint "GET" "/api/documents?page=1&pageSize=5" "" "List documents with pagination"

# Test 3: Filter by type
test_endpoint "GET" "/api/documents?type=standard" "" "List standard documents only"

# Test 4: Search documents
test_endpoint "GET" "/api/documents?search=test" "" "Search documents"

# Test 5: Get specific document
test_endpoint "GET" "/api/documents/1" "" "Get document #1"

# Test 6: Update document
test_endpoint "PATCH" "/api/documents/1" '{"display_name":"Updated Document"}' "Update document #1"

# Test 7: Set as standard
test_endpoint "POST" "/api/documents/1/set-standard" "" "Set document #1 as standard"

# Test 8: Storage health
test_endpoint "GET" "/api/storage-health" "" "Check storage health"

# Test 9: Database health
test_endpoint "GET" "/api/db-health" "" "Check database health"

echo "🔍 Summary"
echo "=========="
echo "All endpoints are protected by authentication."
echo "You're seeing redirects to /sign-in because no session token is provided."
echo ""
echo "To test with authentication:"
echo "1. Go to http://localhost:3001/test-api"
echo "2. Sign in with Azure AD"
echo "3. Use the interactive test page"
echo ""
echo "Alternatively, test individual endpoints in the browser after signing in."