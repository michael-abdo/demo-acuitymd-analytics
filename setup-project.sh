#!/bin/bash

# Setup script for new projects using this template

echo "VVG Template Setup"
echo "=================="

# Get project name from user
read -p "Enter your project name (lowercase, no spaces): " PROJECT_NAME

# Validate project name
if [[ ! "$PROJECT_NAME" =~ ^[a-z0-9-]+$ ]]; then
    echo "Error: Project name must be lowercase letters, numbers, and hyphens only"
    exit 1
fi

echo "Setting up project: $PROJECT_NAME"

# Copy .env.template to .env
cp .env.template .env

# Update .env with project name
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|PROJECT_NAME=your-project-name|PROJECT_NAME=$PROJECT_NAME|g" .env
    sed -i '' "s|APP_BASE_PATH=/your-project-name|APP_BASE_PATH=/$PROJECT_NAME|g" .env
else
    # Linux
    sed -i "s|PROJECT_NAME=your-project-name|PROJECT_NAME=$PROJECT_NAME|g" .env
    sed -i "s|APP_BASE_PATH=/your-project-name|APP_BASE_PATH=/$PROJECT_NAME|g" .env
fi

# Update package.json name
if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|\"name\": \"[^"]*\"|"name": \"$PROJECT_NAME\"|g" package.json
else
    sed -i "s|\"name\": \"[^"]*\"|"name": \"$PROJECT_NAME\"|g" package.json
fi

echo ""
echo "Setup complete! Next steps:"
echo "1. Update the remaining values in .env"
echo "2. Run 'npm install' to install dependencies"
echo "3. Run 'npm run dev' to start development"
echo ""
echo "For production deployment:"
echo "- Update nginx configs with your domain"
echo "- Update deployment configs with your server details"
echo "- See DEPLOYMENT.md for full instructions"
