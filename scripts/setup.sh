#!/bin/bash

# VVG Template Setup Script
# Run this once to set up your development environment

set -e

echo "🚀 VVG Template Setup"
echo "===================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "   Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version must be 18 or higher (found: $(node -v))${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# Check MySQL
if ! command -v mysql &> /dev/null; then
    echo -e "${YELLOW}⚠ MySQL client not found${NC}"
    echo "   You'll need MySQL 8+ to run the database"
else
    echo -e "${GREEN}✓ MySQL client found${NC}"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Check for .env file
if [ ! -f .env ]; then
    echo ""
    echo "📋 Creating .env file from template..."
    cp .env.example .env
    echo -e "${YELLOW}⚠ Please edit .env with your credentials${NC}"
    echo ""
    echo "   Required values:"
    echo "   - NEXTAUTH_SECRET (generate with: openssl rand -base64 32)"
    echo "   - AZURE_AD_CLIENT_ID"
    echo "   - AZURE_AD_CLIENT_SECRET"
    echo "   - AZURE_AD_TENANT_ID"
    echo "   - DATABASE_URL (your MySQL connection string)"
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

# Generate NEXTAUTH_SECRET if empty
if grep -q "NEXTAUTH_SECRET=your-nextauth-secret-here" .env 2>/dev/null; then
    echo ""
    echo "🔑 Generating NEXTAUTH_SECRET..."
    SECRET=$(openssl rand -base64 32)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|NEXTAUTH_SECRET=your-nextauth-secret-here-min-32-chars|NEXTAUTH_SECRET=$SECRET|" .env
    else
        sed -i "s|NEXTAUTH_SECRET=your-nextauth-secret-here-min-32-chars|NEXTAUTH_SECRET=$SECRET|" .env
    fi
    echo -e "${GREEN}✓ NEXTAUTH_SECRET generated${NC}"
fi

echo ""
echo "===================="
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Edit .env with your Azure AD credentials"
echo "2. Set up MySQL and update DATABASE_URL in .env"
echo "3. Run: npm run db:setup"
echo "4. Run: npm run dev"
echo ""
