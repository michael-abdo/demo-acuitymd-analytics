#!/bin/bash

# Smoke Test: Verify beginner-friendly error messages
# Tests API error responses without requiring authentication
# Run with: bash scripts/smoke-test-errors.sh

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
PASSED=0
FAILED=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🧪 Error Message Smoke Test"
echo "==========================="
echo "Base URL: $BASE_URL"
echo ""

# Helper function to test an endpoint
test_error() {
  local name="$1"
  local method="$2"
  local endpoint="$3"
  local data="$4"
  local expected_text="$5"
  local extra_args="$6"

  echo -n "Testing: $name... "

  # Make the request
  if [ "$method" == "GET" ]; then
    response=$(curl -s -X GET "$BASE_URL$endpoint" $extra_args 2>&1)
  else
    response=$(curl -s -X "$method" "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -d "$data" \
      $extra_args 2>&1)
  fi

  # Check if expected text is in response
  if echo "$response" | grep -q "$expected_text"; then
    echo -e "${GREEN}PASS${NC}"
    ((PASSED++))
    return 0
  else
    echo -e "${RED}FAIL${NC}"
    echo "  Expected to contain: $expected_text"
    echo "  Got: ${response:0:200}..."
    ((FAILED++))
    return 1
  fi
}

echo "📋 Testing API Error Messages"
echo "-----------------------------"

# Test 1: Invalid document ID (string instead of number)
test_error \
  "Invalid document ID" \
  "GET" \
  "/api/documents/abc" \
  "" \
  "positive integer"

# Test 2: Invalid document ID (negative)
test_error \
  "Negative document ID" \
  "GET" \
  "/api/documents/-5" \
  "" \
  "positive integer"

# Test 3: Invalid JSON payload
test_error \
  "Invalid JSON payload" \
  "POST" \
  "/api/documents" \
  "{invalid json}" \
  "double quotes"

# Test 4: Invalid JSON (trailing comma)
test_error \
  "JSON with trailing comma" \
  "POST" \
  "/api/documents" \
  '{"filename": "test.pdf",}' \
  "double quotes"

# Test 5: Health endpoint (should work)
echo -n "Testing: Health endpoint... "
health_response=$(curl -s "$BASE_URL/api/health" 2>&1)
if echo "$health_response" | grep -q "healthy"; then
  echo -e "${GREEN}PASS${NC}"
  ((PASSED++))
else
  echo -e "${YELLOW}SKIP${NC} (server may not be running)"
fi

echo ""
echo "==========================="
echo -e "Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}"

if [ $FAILED -gt 0 ]; then
  echo -e "${YELLOW}Note: Some tests require the dev server to be running (npm run dev)${NC}"
  exit 1
fi

echo -e "${GREEN}✅ All error message tests passed!${NC}"
