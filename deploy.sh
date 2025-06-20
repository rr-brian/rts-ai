#!/bin/bash

# Print node version
echo "Node version:"
node -v
echo "NPM version:"
npm -v

# Navigate to the repository root
cd "$DEPLOYMENT_SOURCE" || exit 1
echo "Current directory: $(pwd)"

# Ensure we're using a compatible Node.js version
if command -v nvm &> /dev/null; then
  echo "Using nvm to set Node.js version"
  nvm use 18 || nvm install 18
fi

# Check for .nvmrc and use it if available
if [ -f ".nvmrc" ]; then
  echo "Using .nvmrc to set Node.js version"
  nvm use || nvm install
fi

# Try to use a newer npm if available
if command -v npm &> /dev/null; then
  echo "Updating npm if needed"
  npm install -g npm@latest || echo "Could not update npm, continuing with current version"
fi

# Install dependencies
echo "Installing dependencies..."
npm install --no-audit --no-fund

# Copy server.js and web.config to deployment target
echo "Copying server files to deployment target..."
cp server.js "$DEPLOYMENT_TARGET/"
cp web.config "$DEPLOYMENT_TARGET/"

# Build the React app with environment variables set explicitly
echo "Building React app..."
CI=false GENERATE_SOURCEMAP=false npm run build

# If the build directory exists, copy it to the deployment target
if [ -d "build" ]; then
  echo "Copying build files to deployment target..."
  mkdir -p "$DEPLOYMENT_TARGET/build"
  cp -r build/* "$DEPLOYMENT_TARGET/build/"
  echo "Deployment completed successfully."
else
  echo "Build directory not found. Deployment failed."
  exit 1
fi

# Copy node_modules to deployment target
echo "Copying node_modules to deployment target..."
cp -r node_modules "$DEPLOYMENT_TARGET/"

exit 0
