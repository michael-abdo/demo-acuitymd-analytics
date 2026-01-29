#!/bin/bash

# Security Configuration Validator
# Checks that security features are properly configured
# Run with: npm run security:check

# Don't use set -e because we want to continue on "failures"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
WARNED=0
FAILED=0

echo ""
echo -e "${BLUE}🔒 Security Configuration Check${NC}"
echo "=================================="
echo ""

# Load .env if it exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs 2>/dev/null) || true
fi

# Helper functions
pass() {
  echo -e "${GREEN}✓${NC} $1"
  ((PASSED++))
}

warn() {
  echo -e "${YELLOW}⚠${NC} $1"
  ((WARNED++))
}

fail() {
  echo -e "${RED}✗${NC} $1"
  ((FAILED++))
}

section() {
  echo ""
  echo -e "${BLUE}$1${NC}"
  echo "---"
}

# ============================================
section "1. Environment Variables"
# ============================================

# Required variables
if [ -n "$NEXTAUTH_SECRET" ]; then
  if [ ${#NEXTAUTH_SECRET} -ge 32 ]; then
    pass "NEXTAUTH_SECRET is set (${#NEXTAUTH_SECRET} chars)"
  else
    fail "NEXTAUTH_SECRET is too short (${#NEXTAUTH_SECRET} chars, need 32+)"
  fi
else
  fail "NEXTAUTH_SECRET is not set"
fi

if [ -n "$AZURE_AD_CLIENT_ID" ]; then
  pass "AZURE_AD_CLIENT_ID is set"
else
  fail "AZURE_AD_CLIENT_ID is not set"
fi

if [ -n "$AZURE_AD_CLIENT_SECRET" ]; then
  pass "AZURE_AD_CLIENT_SECRET is set"
else
  fail "AZURE_AD_CLIENT_SECRET is not set"
fi

if [ -n "$AZURE_AD_TENANT_ID" ]; then
  pass "AZURE_AD_TENANT_ID is set"
else
  fail "AZURE_AD_TENANT_ID is not set"
fi

# ============================================
section "2. CSRF Protection"
# ============================================

if [ "$DISABLE_CSRF" = "true" ]; then
  if [ "$NODE_ENV" = "production" ]; then
    fail "CSRF is disabled in production! Set DISABLE_CSRF=false"
  else
    warn "CSRF is disabled (OK for development)"
  fi
else
  pass "CSRF protection is enabled"
fi

# ============================================
section "3. Test Authentication"
# ============================================

if [ "$ALLOW_TEST_AUTH" = "true" ]; then
  if [ "$NODE_ENV" = "production" ]; then
    fail "Test auth is enabled in production! Set ALLOW_TEST_AUTH=false"
  else
    warn "Test auth is enabled (OK for development)"

    if [ -n "$TEST_AUTH_SECRET" ]; then
      if [ ${#TEST_AUTH_SECRET} -ge 32 ]; then
        pass "TEST_AUTH_SECRET is set (${#TEST_AUTH_SECRET} chars)"
      else
        fail "TEST_AUTH_SECRET is too short (${#TEST_AUTH_SECRET} chars, need 32+)"
      fi
    else
      fail "ALLOW_TEST_AUTH=true but TEST_AUTH_SECRET is not set"
    fi
  fi
else
  pass "Test auth is disabled"
fi

# ============================================
section "4. Development Bypasses"
# ============================================

if [ "$FEATURE_DEV_BYPASS" = "true" ]; then
  if [ "$NODE_ENV" = "production" ]; then
    fail "Dev bypass is enabled in production!"
  else
    warn "Dev bypass is enabled (OK for development)"
  fi
else
  pass "Dev bypass is disabled"
fi

if [ "$DISABLE_MIDDLEWARE" = "true" ]; then
  if [ "$NODE_ENV" = "production" ]; then
    fail "Middleware is disabled in production!"
  else
    warn "Middleware is disabled (OK for development)"
  fi
else
  pass "Middleware is enabled"
fi

if [ "$DISABLE_AUTH" = "true" ]; then
  if [ "$NODE_ENV" = "production" ]; then
    fail "Auth is disabled in production!"
  else
    warn "Auth is disabled (OK for development)"
  fi
else
  pass "Auth is enabled"
fi

# ============================================
section "5. Soft Error Detection"
# ============================================

# Check NEXTAUTH_URL format
if [ -n "$NEXTAUTH_URL" ]; then
  # Check for common mistakes
  if echo "$NEXTAUTH_URL" | grep -q "127.0.0.1"; then
    warn "NEXTAUTH_URL uses 127.0.0.1 - cookies won't work if you access via localhost"
    echo "   Tip: Use http://localhost:3000 instead"
  elif echo "$NEXTAUTH_URL" | grep -q "localhost" && [ "$NODE_ENV" = "production" ]; then
    fail "NEXTAUTH_URL contains 'localhost' in production mode!"
  else
    pass "NEXTAUTH_URL format looks correct"
  fi

  # Check URL ends without trailing slash
  if echo "$NEXTAUTH_URL" | grep -q '/$'; then
    warn "NEXTAUTH_URL has trailing slash - may cause redirect issues"
    echo "   Remove the trailing / from: $NEXTAUTH_URL"
  fi
else
  warn "NEXTAUTH_URL is not set (will default to localhost:3000)"
fi

# Check for placeholder NEXTAUTH_SECRET
if [ -n "$NEXTAUTH_SECRET" ]; then
  if echo "$NEXTAUTH_SECRET" | grep -qi "placeholder\|changeme\|secret\|example"; then
    fail "NEXTAUTH_SECRET looks like a placeholder value!"
    echo "   Generate a real secret: openssl rand -base64 32"
  fi
fi

# Check BASE_PATH configuration
if [ -n "$BASE_PATH" ] && [ "$BASE_PATH" != "/" ]; then
  warn "BASE_PATH is set to '$BASE_PATH' - ensure cookies are configured for this path"
  echo "   API routes must be under this path or cookies won't be sent"
fi

# Detect potential debug flag combinations that cause confusion
if [ "$DISABLE_CSRF" = "true" ] && [ "$ALLOW_TEST_AUTH" != "true" ]; then
  warn "CSRF disabled but test auth not enabled - may need both for testing"
fi

# ============================================
section "6. Server Connectivity (if running)"
# ============================================

BASE_URL="${NEXTAUTH_URL:-http://localhost:3000}"

# Check if server is running
if curl -s --max-time 2 "$BASE_URL/api/health" > /dev/null 2>&1; then
  pass "Server is responding at $BASE_URL"

  # Check health endpoint
  health_response=$(curl -s "$BASE_URL/api/health" 2>/dev/null)
  if echo "$health_response" | grep -q "healthy"; then
    pass "Health endpoint returns healthy"
  else
    warn "Health endpoint returned unexpected response"
  fi

  # Check auth endpoint exists
  auth_response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/auth/providers" 2>/dev/null)
  if [ "$auth_response" = "200" ]; then
    pass "Auth providers endpoint is accessible"
  else
    warn "Auth providers endpoint returned $auth_response"
  fi

  # SOFT ERROR TEST: Verify protected routes reject unauthenticated requests
  # Valid responses: 401 (Unauthorized) or 307 (Redirect to login)
  docs_response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/documents" 2>/dev/null)
  if [ "$docs_response" = "401" ] || [ "$docs_response" = "307" ]; then
    pass "Protected route correctly rejects unauthenticated requests ($docs_response)"
  elif [ "$docs_response" = "200" ]; then
    fail "Protected route /api/documents returned 200 without auth!"
    echo "   This is a CRITICAL security issue - auth may be disabled"
  else
    warn "Protected route returned unexpected status: $docs_response"
  fi
else
  warn "Server not running (skipping connectivity tests)"
  echo "   Start with: npm run dev"
fi

# ============================================
# Summary
# ============================================

echo ""
echo "=================================="
echo -e "${BLUE}Summary${NC}"
echo "---"
echo -e "${GREEN}Passed:${NC}  $PASSED"
echo -e "${YELLOW}Warnings:${NC} $WARNED"
echo -e "${RED}Failed:${NC}  $FAILED"
echo ""

if [ $FAILED -gt 0 ]; then
  echo -e "${RED}❌ Security check failed!${NC}"
  echo "   Fix the issues above before deploying."
  exit 1
elif [ $WARNED -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Security check passed with warnings${NC}"
  echo "   Review warnings before deploying to production."
  exit 0
else
  echo -e "${GREEN}✅ All security checks passed!${NC}"
  exit 0
fi
