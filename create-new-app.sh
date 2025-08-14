#!/bin/bash

# Complete Template Setup Script - Creates a fully configured replica
# This script handles ALL configuration and renaming automatically

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}          Complete Template Setup & Configuration              ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Function to validate input
validate_input() {
    local input=$1
    local type=$2
    
    case $type in
        "project-name")
            if [[ ! "$input" =~ ^[a-z0-9-]+$ ]]; then
                echo -e "${RED}Error: Project name must be lowercase letters, numbers, and hyphens only${NC}"
                return 1
            fi
            ;;
        "domain")
            if [[ ! "$input" =~ ^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
                echo -e "${RED}Error: Invalid domain format${NC}"
                return 1
            fi
            ;;
        "email")
            if [[ ! "$input" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
                echo -e "${RED}Error: Invalid email format${NC}"
                return 1
            fi
            ;;
        "port")
            if [[ ! "$input" =~ ^[0-9]+$ ]] || [ "$input" -lt 1 ] || [ "$input" -gt 65535 ]; then
                echo -e "${RED}Error: Port must be between 1 and 65535${NC}"
                return 1
            fi
            ;;
    esac
    return 0
}

# Get user inputs
echo -e "${YELLOW}Step 1: Basic Project Information${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

while true; do
    read -p "Project name (lowercase, no spaces, e.g., my-app): " PROJECT_NAME
    if validate_input "$PROJECT_NAME" "project-name"; then
        break
    fi
done

read -p "Project display name (e.g., My Application): " PROJECT_DISPLAY_NAME
read -p "Project description: " PROJECT_DESCRIPTION

while true; do
    read -p "Your organization/company name: " ORGANIZATION
    if [ -n "$ORGANIZATION" ]; then
        break
    fi
done

while true; do
    read -p "Primary domain (e.g., example.com): " DOMAIN
    if validate_input "$DOMAIN" "domain"; then
        break
    fi
done

echo ""
echo -e "${YELLOW}Step 2: Development Configuration${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

while true; do
    read -p "Development port (default: 3000): " DEV_PORT
    DEV_PORT=${DEV_PORT:-3000}
    if validate_input "$DEV_PORT" "port"; then
        break
    fi
done

while true; do
    read -p "Staging port (default: 3001): " STAGING_PORT
    STAGING_PORT=${STAGING_PORT:-3001}
    if validate_input "$STAGING_PORT" "port"; then
        break
    fi
done

echo ""
echo -e "${YELLOW}Step 3: Database Configuration${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

read -p "MySQL host (default: localhost): " MYSQL_HOST
MYSQL_HOST=${MYSQL_HOST:-localhost}

read -p "MySQL port (default: 3306): " MYSQL_PORT
MYSQL_PORT=${MYSQL_PORT:-3306}

read -p "MySQL database name (default: ${PROJECT_NAME}_db): " MYSQL_DATABASE
MYSQL_DATABASE=${MYSQL_DATABASE:-${PROJECT_NAME}_db}

read -p "MySQL username (default: ${PROJECT_NAME}_user): " MYSQL_USER
MYSQL_USER=${MYSQL_USER:-${PROJECT_NAME}_user}

read -sp "MySQL password (leave empty to generate): " MYSQL_PASSWORD
echo ""
if [ -z "$MYSQL_PASSWORD" ]; then
    MYSQL_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    echo -e "${GREEN}Generated password: $MYSQL_PASSWORD${NC}"
fi

echo ""
echo -e "${YELLOW}Step 4: Storage Configuration${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PS3="Select storage provider: "
select STORAGE_PROVIDER in "Local filesystem" "AWS S3" "Both (S3 primary, local backup)"; do
    case $STORAGE_PROVIDER in
        "Local filesystem")
            STORAGE_TYPE="local"
            break
            ;;
        "AWS S3")
            STORAGE_TYPE="s3"
            echo ""
            read -p "AWS region (default: us-east-1): " AWS_REGION
            AWS_REGION=${AWS_REGION:-us-east-1}
            read -p "S3 bucket name: " S3_BUCKET_NAME
            read -p "AWS Access Key ID: " AWS_ACCESS_KEY_ID
            read -sp "AWS Secret Access Key: " AWS_SECRET_ACCESS_KEY
            echo ""
            break
            ;;
        "Both (S3 primary, local backup)")
            STORAGE_TYPE="both"
            echo ""
            read -p "AWS region (default: us-east-1): " AWS_REGION
            AWS_REGION=${AWS_REGION:-us-east-1}
            read -p "S3 bucket name: " S3_BUCKET_NAME
            read -p "AWS Access Key ID: " AWS_ACCESS_KEY_ID
            read -sp "AWS Secret Access Key: " AWS_SECRET_ACCESS_KEY
            echo ""
            break
            ;;
    esac
done

echo ""
echo -e "${YELLOW}Step 5: Authentication Configuration${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Generate NextAuth secret
NEXTAUTH_SECRET=$(openssl rand -base64 32)
echo -e "${GREEN}Generated NextAuth secret${NC}"

echo ""
echo "Configure authentication providers:"

# Azure AD
read -p "Enable Azure AD authentication? (y/n): " ENABLE_AZURE
if [[ "$ENABLE_AZURE" =~ ^[Yy]$ ]]; then
    read -p "Azure AD Client ID: " AZURE_AD_CLIENT_ID
    read -sp "Azure AD Client Secret: " AZURE_AD_CLIENT_SECRET
    echo ""
    read -p "Azure AD Tenant ID: " AZURE_AD_TENANT_ID
fi

# Google OAuth
echo ""
read -p "Enable Google OAuth? (y/n): " ENABLE_GOOGLE
if [[ "$ENABLE_GOOGLE" =~ ^[Yy]$ ]]; then
    read -p "Google Client ID: " GOOGLE_CLIENT_ID
    read -sp "Google Client Secret: " GOOGLE_CLIENT_SECRET
    echo ""
fi

echo ""
echo -e "${YELLOW}Step 6: OpenAI Configuration (Optional)${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

read -p "Configure OpenAI API? (y/n): " ENABLE_OPENAI
if [[ "$ENABLE_OPENAI" =~ ^[Yy]$ ]]; then
    read -sp "OpenAI API Key: " OPENAI_API_KEY
    echo ""
fi

echo ""
echo -e "${YELLOW}Step 7: Contact Information${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

while true; do
    read -p "Admin email address: " ADMIN_EMAIL
    if validate_input "$ADMIN_EMAIL" "email"; then
        break
    fi
done

read -p "GitHub repository URL (optional): " GITHUB_REPO

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                    Configuration Summary                       ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "Project Name: ${GREEN}$PROJECT_NAME${NC}"
echo -e "Display Name: ${GREEN}$PROJECT_DISPLAY_NAME${NC}"
echo -e "Organization: ${GREEN}$ORGANIZATION${NC}"
echo -e "Domain: ${GREEN}$DOMAIN${NC}"
echo -e "Storage: ${GREEN}$STORAGE_TYPE${NC}"
echo ""
read -p "Proceed with setup? (y/n): " CONFIRM

if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "Setup cancelled."
    exit 0
fi

echo ""
echo -e "${BLUE}Starting automated setup...${NC}"
echo ""

# Create backup of original files
echo -e "${YELLOW}Creating backup of original files...${NC}"
cp package.json package.json.original 2>/dev/null || true
cp -r config config.original 2>/dev/null || true
cp -r deployment deployment.original 2>/dev/null || true

# Update package.json
echo -e "${YELLOW}Updating package.json...${NC}"
sed -i.bak "s/\"name\": \"vvg-template\"/\"name\": \"$PROJECT_NAME\"/" package.json
sed -i.bak "s/\"version\": \"0.1.0\"/\"version\": \"1.0.0\"/" package.json
sed -i.bak "s/\"description\": \"[^\"]*\"/\"description\": \"$PROJECT_DESCRIPTION\"/" package.json 2>/dev/null || \
  sed -i.bak "/\"version\":/a\\
  \"description\": \"$PROJECT_DESCRIPTION\",\\
  \"author\": \"$ORGANIZATION\",\\
  \"repository\": \"$GITHUB_REPO\"," package.json

# Create all environment files
echo -e "${YELLOW}Creating environment files...${NC}"

# Create .env.local
cat > .env.local << EOF
# Project Configuration
PROJECT_NAME=$PROJECT_NAME
PROJECT_DISPLAY_NAME=$PROJECT_DISPLAY_NAME
BASE_PATH=/$PROJECT_NAME
NEXT_PUBLIC_BASE_PATH=/$PROJECT_NAME
NODE_ENV=development
PORT=$DEV_PORT

# Database Configuration
DATABASE_URL=mysql://$MYSQL_USER:$MYSQL_PASSWORD@$MYSQL_HOST:$MYSQL_PORT/$MYSQL_DATABASE
MYSQL_HOST=$MYSQL_HOST
MYSQL_PORT=$MYSQL_PORT
MYSQL_USER=$MYSQL_USER
MYSQL_PASSWORD=$MYSQL_PASSWORD
MYSQL_DATABASE=$MYSQL_DATABASE

# Storage Configuration
STORAGE_PROVIDER=$STORAGE_TYPE
LOCAL_UPLOAD_DIR=./uploads
EOF

if [[ "$STORAGE_TYPE" != "local" ]]; then
    cat >> .env.local << EOF

# AWS S3 Configuration
AWS_REGION=$AWS_REGION
AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY
S3_BUCKET_NAME=$S3_BUCKET_NAME
S3_FOLDER_PREFIX=$PROJECT_NAME/development/
EOF
fi

cat >> .env.local << EOF

# Authentication
NEXTAUTH_URL=http://localhost:$DEV_PORT/$PROJECT_NAME
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
EOF

if [[ "$ENABLE_AZURE" =~ ^[Yy]$ ]]; then
    cat >> .env.local << EOF

# Azure AD
AZURE_AD_CLIENT_ID=$AZURE_AD_CLIENT_ID
AZURE_AD_CLIENT_SECRET=$AZURE_AD_CLIENT_SECRET
AZURE_AD_TENANT_ID=$AZURE_AD_TENANT_ID
EOF
fi

if [[ "$ENABLE_GOOGLE" =~ ^[Yy]$ ]]; then
    cat >> .env.local << EOF

# Google OAuth
GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET
EOF
fi

if [[ "$ENABLE_OPENAI" =~ ^[Yy]$ ]]; then
    cat >> .env.local << EOF

# OpenAI
OPENAI_API_KEY=$OPENAI_API_KEY
EOF
fi

cat >> .env.local << EOF

# Admin Configuration
ADMIN_EMAIL=$ADMIN_EMAIL

# Logging
LOG_LEVEL=info
EOF

# Create .env.production
cp .env.local .env.production
sed -i.bak "s|NODE_ENV=development|NODE_ENV=production|" .env.production
sed -i.bak "s|NEXTAUTH_URL=http://localhost:$DEV_PORT|NEXTAUTH_URL=https://$DOMAIN|" .env.production
sed -i.bak "s|PORT=$DEV_PORT|PORT=3000|" .env.production
if [[ "$STORAGE_TYPE" != "local" ]]; then
    sed -i.bak "s|S3_FOLDER_PREFIX=$PROJECT_NAME/development/|S3_FOLDER_PREFIX=$PROJECT_NAME/production/|" .env.production
fi

# Create .env.staging
cp .env.production .env.staging
sed -i.bak "s|NODE_ENV=production|NODE_ENV=staging|" .env.staging
sed -i.bak "s|PORT=3000|PORT=$STAGING_PORT|" .env.staging
sed -i.bak "s|BASE_PATH=/$PROJECT_NAME|BASE_PATH=/$PROJECT_NAME-staging|" .env.staging
sed -i.bak "s|NEXT_PUBLIC_BASE_PATH=/$PROJECT_NAME|NEXT_PUBLIC_BASE_PATH=/$PROJECT_NAME-staging|" .env.staging
sed -i.bak "s|NEXTAUTH_URL=https://$DOMAIN/$PROJECT_NAME|NEXTAUTH_URL=https://$DOMAIN/$PROJECT_NAME-staging|" .env.staging
if [[ "$STORAGE_TYPE" != "local" ]]; then
    sed -i.bak "s|S3_FOLDER_PREFIX=$PROJECT_NAME/production/|S3_FOLDER_PREFIX=$PROJECT_NAME/staging/|" .env.staging
fi

# Update PM2 ecosystem configs
echo -e "${YELLOW}Updating PM2 configurations...${NC}"

# Production PM2 config
cat > config/ecosystem/production.config.js << EOF
module.exports = {
  apps: [
    {
      name: '$PROJECT_NAME-production',
      script: './node_modules/next/dist/bin/next',
      args: 'start',
      cwd: __dirname.replace('/config/ecosystem', '/worktrees/production'),
      instances: 1,
      exec_mode: 'fork',
      
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      
      env_file: '.env.production',
      
      log_type: 'json',
      log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS Z',
      out_file: './logs/production-out.log',
      error_file: './logs/production-error.log',
      
      rotate_logs: true,
      max_log_file_size: '10M',
      retain_logs: 30,
      
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.next'],
      
      max_memory_restart: '1G',
      
      min_uptime: '10s',
      max_restarts: 10,
      
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 8000,
    }
  ]
};
EOF

# Staging PM2 config
cat > config/ecosystem/staging.config.js << EOF
module.exports = {
  apps: [
    {
      name: '$PROJECT_NAME-staging',
      script: './node_modules/next/dist/bin/next',
      args: 'start',
      cwd: __dirname.replace('/config/ecosystem', '/worktrees/staging'),
      instances: 1,
      exec_mode: 'fork',
      
      env: {
        NODE_ENV: 'staging',
        PORT: $STAGING_PORT,
      },
      
      env_file: '.env.staging',
      
      log_type: 'json',
      log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS Z',
      out_file: './logs/staging-out.log',
      error_file: './logs/staging-error.log',
      
      rotate_logs: true,
      max_log_file_size: '10M',
      retain_logs: 30,
      
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.next'],
      
      max_memory_restart: '1G',
      
      min_uptime: '10s',
      max_restarts: 10,
      
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 8000,
    }
  ]
};
EOF

# Create nginx configuration
echo -e "${YELLOW}Creating nginx configuration...${NC}"
mkdir -p deployment/nginx

cat > deployment/nginx/$PROJECT_NAME.conf << EOF
# Nginx configuration for $PROJECT_NAME
# Generated by setup script

# Production server
server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    
    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval';" always;
    
    # Logging
    access_log /var/log/nginx/$PROJECT_NAME-access.log;
    error_log /var/log/nginx/$PROJECT_NAME-error.log;
    
    # Production app location
    location /$PROJECT_NAME {
        proxy_pass http://localhost:3000/$PROJECT_NAME;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer sizes for Azure AD
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
        
        # File upload limits
        client_max_body_size 10M;
    }
    
    # Staging app location  
    location /$PROJECT_NAME-staging {
        proxy_pass http://localhost:$STAGING_PORT/$PROJECT_NAME-staging;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer sizes for Azure AD
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
        
        # File upload limits
        client_max_body_size 20M;
    }
}

# HTTP redirect
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}
EOF

# Update all vvg-template references in the codebase
echo -e "${YELLOW}Updating all project references...${NC}"

# Update TypeScript/JavaScript files
find src lib scripts -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -exec sed -i.bak "s/vvg-template/$PROJECT_NAME/g" {} \;
find src lib scripts -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -exec sed -i.bak "s/VVG Template/$PROJECT_DISPLAY_NAME/g" {} \;

# Update database references
sed -i.bak "s/VVG Template/$PROJECT_DISPLAY_NAME/g" database/migrations/*.sql

# Update shell scripts
find scripts deployment -name "*.sh" -type f -exec sed -i.bak "s/vvg-template/$PROJECT_NAME/g" {} \;
find scripts deployment -name "*.sh" -type f -exec sed -i.bak "s/VVG Template/$PROJECT_DISPLAY_NAME/g" {} \;

# Update LICENSE
cat > LICENSE << EOF
MIT License

Copyright (c) $(date +%Y) $ORGANIZATION

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF

# Create project-specific README
echo -e "${YELLOW}Creating project README...${NC}"
cat > README.md << EOF
# $PROJECT_DISPLAY_NAME

$PROJECT_DESCRIPTION

## Quick Start

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Start development server:
   \`\`\`bash
   npm run dev
   \`\`\`

3. Open browser to: http://localhost:$DEV_PORT/$PROJECT_NAME

## Environment Setup

This project uses environment files for configuration:
- \`.env.local\` - Development environment
- \`.env.production\` - Production environment  
- \`.env.staging\` - Staging environment

## Deployment

### Production
\`\`\`bash
npm run build
pm2 start config/ecosystem/production.config.js
\`\`\`

### Staging
\`\`\`bash
npm run build
pm2 start config/ecosystem/staging.config.js
\`\`\`

## URLs

- **Development**: http://localhost:$DEV_PORT/$PROJECT_NAME
- **Production**: https://$DOMAIN/$PROJECT_NAME
- **Staging**: https://$DOMAIN/$PROJECT_NAME-staging

## Database

Run migrations:
\`\`\`bash
npm run db:migrate
\`\`\`

## Authentication

This application supports:
EOF

if [[ "$ENABLE_AZURE" =~ ^[Yy]$ ]]; then
    echo "- Azure AD authentication" >> README.md
fi
if [[ "$ENABLE_GOOGLE" =~ ^[Yy]$ ]]; then
    echo "- Google OAuth" >> README.md
fi

cat >> README.md << EOF

## License

Copyright © $(date +%Y) $ORGANIZATION. All rights reserved.
EOF

# Create deployment instructions
cat > DEPLOYMENT.md << EOF
# Deployment Guide for $PROJECT_DISPLAY_NAME

## Prerequisites

- Ubuntu 20.04+ server
- Node.js 18+
- MySQL 8.0+
- PM2 process manager
- Nginx web server

## Initial Server Setup

1. **Install dependencies:**
   \`\`\`bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs nginx mysql-server
   sudo npm install -g pm2
   \`\`\`

2. **Setup MySQL database:**
   \`\`\`sql
   CREATE DATABASE $MYSQL_DATABASE;
   CREATE USER '$MYSQL_USER'@'localhost' IDENTIFIED BY '$MYSQL_PASSWORD';
   GRANT ALL PRIVILEGES ON $MYSQL_DATABASE.* TO '$MYSQL_USER'@'localhost';
   FLUSH PRIVILEGES;
   \`\`\`

3. **Clone repository:**
   \`\`\`bash
   cd /var/www
   git clone $GITHUB_REPO $PROJECT_NAME
   cd $PROJECT_NAME
   \`\`\`

4. **Install application:**
   \`\`\`bash
   npm install
   npm run build
   npm run db:migrate
   \`\`\`

5. **Configure Nginx:**
   \`\`\`bash
   sudo cp deployment/nginx/$PROJECT_NAME.conf /etc/nginx/sites-available/
   sudo ln -s /etc/nginx/sites-available/$PROJECT_NAME.conf /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   \`\`\`

6. **Start with PM2:**
   \`\`\`bash
   pm2 start config/ecosystem/production.config.js
   pm2 save
   pm2 startup
   \`\`\`

## SSL Setup

\`\`\`bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d $DOMAIN
\`\`\`

## Monitoring

- Logs: \`pm2 logs $PROJECT_NAME-production\`
- Status: \`pm2 status\`
- Monitoring: \`pm2 monit\`
EOF

# Clean up backup files
echo -e "${YELLOW}Cleaning up backup files...${NC}"
find . -name "*.bak" -type f -delete

# Final summary
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}                    Setup Complete! 🎉                          ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Your project '$PROJECT_NAME' has been fully configured!${NC}"
echo ""
echo -e "${YELLOW}Generated files:${NC}"
echo "  ✓ .env.local (development)"
echo "  ✓ .env.production"
echo "  ✓ .env.staging"
echo "  ✓ deployment/nginx/$PROJECT_NAME.conf"
echo "  ✓ PM2 ecosystem configs"
echo "  ✓ Updated package.json"
echo "  ✓ Project README.md"
echo "  ✓ DEPLOYMENT.md"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Review the generated .env files"
echo "  2. Run: npm install"
echo "  3. Run: npm run dev"
echo "  4. Access: http://localhost:$DEV_PORT/$PROJECT_NAME"
echo ""
echo -e "${YELLOW}Important passwords saved:${NC}"
echo "  - MySQL Password: $MYSQL_PASSWORD"
echo "  - NextAuth Secret: $NEXTAUTH_SECRET"
echo ""
echo -e "${GREEN}Save these credentials in a secure location!${NC}"
echo ""
echo -e "${BLUE}For deployment instructions, see DEPLOYMENT.md${NC}"