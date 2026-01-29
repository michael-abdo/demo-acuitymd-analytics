#!/bin/bash

# ============================================================================
# Pre-flight Check Script
# ============================================================================
# Validates your environment before starting the dev server.
# Catches common issues that cause silent failures.
#
# Usage: npm run preflight
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                    PRE-FLIGHT CHECK                           ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Load .env file if it exists (only for vars not already set)
if [ -f .env ]; then
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        [[ "$key" =~ ^#.*$ ]] && continue
        [[ -z "$key" ]] && continue
        # Only set if not already in environment
        if [ -z "${!key}" ]; then
            export "$key=$value"
        fi
    done < <(grep -v '^#' .env | grep '=')
fi

# ============================================================================
# 1. Check MySQL is running
# ============================================================================
echo -e "${BLUE}[1/7] Checking MySQL connection...${NC}"

if command -v mysql &> /dev/null; then
    # Try to connect to MySQL
    if mysql -u root -e "SELECT 1" &> /dev/null; then
        echo -e "  ${GREEN}✓${NC} MySQL is running"
    elif [ -n "$DATABASE_URL" ]; then
        # Parse DATABASE_URL and try to connect
        echo -e "  ${YELLOW}⚠${NC} Could not connect as root, checking DATABASE_URL..."

        # Extract host from DATABASE_URL (basic parsing)
        DB_HOST=$(echo "$DATABASE_URL" | sed -E 's/.*@([^:\/]+).*/\1/' 2>/dev/null || echo "localhost")

        if nc -z "$DB_HOST" 3306 2>/dev/null; then
            echo -e "  ${GREEN}✓${NC} MySQL port is open on $DB_HOST"
        else
            echo -e "  ${RED}✗${NC} Cannot connect to MySQL on $DB_HOST:3306"
            echo ""
            echo -e "    ${YELLOW}Fix:${NC} Start MySQL with one of these commands:"
            echo "      macOS:  brew services start mysql"
            echo "      Linux:  sudo systemctl start mysql"
            echo "      Docker: docker start mysql-container"
            echo ""
            ((ERRORS++))
        fi
    else
        echo -e "  ${RED}✗${NC} MySQL is not running"
        echo ""
        echo -e "    ${YELLOW}Fix:${NC} Start MySQL:"
        echo "      macOS:  brew services start mysql"
        echo "      Linux:  sudo systemctl start mysql"
        echo ""
        ((ERRORS++))
    fi
else
    echo -e "  ${YELLOW}⚠${NC} MySQL client not installed (cannot verify connection)"
    ((WARNINGS++))
fi

# ============================================================================
# 2. Check DATABASE_URL format
# ============================================================================
echo -e "${BLUE}[2/7] Checking DATABASE_URL...${NC}"

if [ -z "$DATABASE_URL" ]; then
    echo -e "  ${RED}✗${NC} DATABASE_URL is not set"
    echo ""
    echo -e "    ${YELLOW}Fix:${NC} Add to .env file:"
    echo "      DATABASE_URL=mysql://user:password@localhost:3306/database"
    echo ""
    ((ERRORS++))
else
    # Check for special characters that need encoding
    if echo "$DATABASE_URL" | grep -qE '://[^:]+:[^@]*[@&!#$%^*()]+[^@]*@'; then
        echo -e "  ${YELLOW}⚠${NC} DATABASE_URL password may contain special characters"
        echo ""
        echo -e "    ${YELLOW}Note:${NC} If your password has special characters, URL-encode them:"
        echo "      @  →  %40"
        echo "      #  →  %23"
        echo "      &  →  %26"
        echo "      Example: P@ssw&rd  →  P%40ssw%26rd"
        echo ""
        ((WARNINGS++))
    else
        echo -e "  ${GREEN}✓${NC} DATABASE_URL is set"
    fi
fi

# ============================================================================
# 3. Check NEXTAUTH_URL (localhost vs 127.0.0.1)
# ============================================================================
echo -e "${BLUE}[3/7] Checking NEXTAUTH_URL...${NC}"

if [ -z "$NEXTAUTH_URL" ]; then
    echo -e "  ${RED}✗${NC} NEXTAUTH_URL is not set"
    echo ""
    echo -e "    ${YELLOW}Fix:${NC} Add to .env file:"
    echo "      NEXTAUTH_URL=http://localhost:3000"
    echo ""
    ((ERRORS++))
elif echo "$NEXTAUTH_URL" | grep -q "127.0.0.1"; then
    echo -e "  ${YELLOW}⚠${NC} NEXTAUTH_URL uses 127.0.0.1 instead of localhost"
    echo ""
    echo -e "    ${YELLOW}Warning:${NC} Cookies may not work correctly!"
    echo "    Use 'localhost' in BOTH your browser AND NEXTAUTH_URL"
    echo ""
    echo -e "    ${YELLOW}Fix:${NC} Change in .env:"
    echo "      NEXTAUTH_URL=http://localhost:3000"
    echo ""
    ((WARNINGS++))
else
    echo -e "  ${GREEN}✓${NC} NEXTAUTH_URL is set to: $NEXTAUTH_URL"
fi

# ============================================================================
# 4. Check NEXTAUTH_SECRET length
# ============================================================================
echo -e "${BLUE}[4/7] Checking NEXTAUTH_SECRET...${NC}"

if [ -z "$NEXTAUTH_SECRET" ]; then
    echo -e "  ${RED}✗${NC} NEXTAUTH_SECRET is not set"
    echo ""
    echo -e "    ${YELLOW}Fix:${NC} Generate a secure secret:"
    echo "      openssl rand -base64 32"
    echo "    Then add to .env:"
    echo "      NEXTAUTH_SECRET=<generated-value>"
    echo ""
    ((ERRORS++))
elif [ ${#NEXTAUTH_SECRET} -lt 32 ]; then
    echo -e "  ${RED}✗${NC} NEXTAUTH_SECRET is too short (${#NEXTAUTH_SECRET} chars, need 32+)"
    echo ""
    echo -e "    ${YELLOW}Fix:${NC} Generate a longer secret:"
    echo "      openssl rand -base64 32"
    echo ""
    ((ERRORS++))
else
    echo -e "  ${GREEN}✓${NC} NEXTAUTH_SECRET is set (${#NEXTAUTH_SECRET} characters)"
fi

# ============================================================================
# 5. Check TEST_AUTH_SECRET if test auth is enabled
# ============================================================================
echo -e "${BLUE}[5/7] Checking test auth configuration...${NC}"

if [ "$ALLOW_TEST_AUTH" = "true" ]; then
    if [ -z "$TEST_AUTH_SECRET" ]; then
        echo -e "  ${RED}✗${NC} ALLOW_TEST_AUTH=true but TEST_AUTH_SECRET is not set"
        echo ""
        echo -e "    ${YELLOW}Fix:${NC} Add a 32+ character secret:"
        echo "      TEST_AUTH_SECRET=$(openssl rand -base64 32)"
        echo ""
        ((ERRORS++))
    elif [ ${#TEST_AUTH_SECRET} -lt 32 ]; then
        echo -e "  ${RED}✗${NC} TEST_AUTH_SECRET is too short (${#TEST_AUTH_SECRET} chars, need 32+)"
        echo ""
        echo -e "    ${YELLOW}Warning:${NC} Test auth will SILENTLY FAIL with a short secret!"
        echo ""
        echo -e "    ${YELLOW}Fix:${NC} Generate a longer secret:"
        echo "      TEST_AUTH_SECRET=$(openssl rand -base64 32)"
        echo ""
        ((ERRORS++))
    else
        echo -e "  ${GREEN}✓${NC} Test auth enabled with valid secret"
    fi
else
    echo -e "  ${GREEN}✓${NC} Test auth is disabled (production mode)"
fi

# ============================================================================
# 6. Check for dangerous DISABLE_* flags
# ============================================================================
echo -e "${BLUE}[6/7] Checking security flags...${NC}"

DANGER_FLAGS=0

if [ "$DISABLE_CSRF" = "true" ]; then
    echo -e "  ${RED}✗${NC} DISABLE_CSRF=true - CSRF protection is OFF!"
    ((DANGER_FLAGS++))
fi

if [ "$DISABLE_MIDDLEWARE" = "true" ]; then
    echo -e "  ${RED}✗${NC} DISABLE_MIDDLEWARE=true - Middleware bypassed!"
    ((DANGER_FLAGS++))
fi

if [ "$DISABLE_AUTH" = "true" ]; then
    echo -e "  ${RED}✗${NC} DISABLE_AUTH=true - Authentication is OFF!"
    ((DANGER_FLAGS++))
fi

if [ "$FEATURE_DEV_BYPASS" = "true" ]; then
    echo -e "  ${YELLOW}⚠${NC} FEATURE_DEV_BYPASS=true - Dev bypass enabled"
    ((WARNINGS++))
fi

if [ $DANGER_FLAGS -gt 0 ]; then
    echo ""
    echo -e "    ${RED}DANGER:${NC} Security protections are disabled!"
    echo "    These flags should NEVER be true in production."
    echo ""
    echo -e "    ${YELLOW}Fix:${NC} Remove or set to false in .env:"
    echo "      DISABLE_CSRF=false"
    echo "      DISABLE_MIDDLEWARE=false"
    echo "      DISABLE_AUTH=false"
    echo ""
    ((ERRORS+=DANGER_FLAGS))
else
    echo -e "  ${GREEN}✓${NC} All security flags are properly set"
fi

# ============================================================================
# 7. Check Azure AD OR test auth is configured
# ============================================================================
echo -e "${BLUE}[7/7] Checking authentication provider...${NC}"

HAS_AZURE=false
HAS_TEST_AUTH=false

if [ -n "$AZURE_AD_CLIENT_ID" ] && [ -n "$AZURE_AD_CLIENT_SECRET" ] && [ -n "$AZURE_AD_TENANT_ID" ]; then
    HAS_AZURE=true
fi

if [ "$ALLOW_TEST_AUTH" = "true" ] && [ -n "$TEST_AUTH_SECRET" ] && [ ${#TEST_AUTH_SECRET} -ge 32 ]; then
    HAS_TEST_AUTH=true
fi

if [ "$HAS_AZURE" = true ]; then
    echo -e "  ${GREEN}✓${NC} Azure AD is configured"
elif [ "$HAS_TEST_AUTH" = true ]; then
    echo -e "  ${GREEN}✓${NC} Test auth is configured (dev mode)"
else
    echo -e "  ${RED}✗${NC} No authentication provider configured"
    echo ""
    echo -e "    ${YELLOW}Fix:${NC} Either configure Azure AD:"
    echo "      AZURE_AD_CLIENT_ID=<your-client-id>"
    echo "      AZURE_AD_CLIENT_SECRET=<your-secret>"
    echo "      AZURE_AD_TENANT_ID=<your-tenant-id>"
    echo ""
    echo "    Or enable test auth (dev only):"
    echo "      ALLOW_TEST_AUTH=true"
    echo "      TEST_AUTH_SECRET=$(openssl rand -base64 32)"
    echo ""
    ((ERRORS++))
fi

# ============================================================================
# Summary
# ============================================================================
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}  ✓ All checks passed! Ready to start.${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}  ⚠ $WARNINGS warning(s) - review above, but can proceed${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}  ✗ $ERRORS error(s), $WARNINGS warning(s) - fix issues above${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    exit 1
fi
