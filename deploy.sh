#!/bin/bash

# Print node version
echo "Node version:"
node -v
echo "NPM version:"
npm -v

# Navigate to the repository root
cd "$DEPLOYMENT_SOURCE" || exit 1
echo "Current directory: $(pwd)"

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the React app
echo "Building React app..."
export CI=false
export GENERATE_SOURCEMAP=false
npm run build

# If the build directory exists, copy it to the deployment target
if [ -d "build" ]; then
  echo "Copying build files to deployment target..."
  cp -r build/* "$DEPLOYMENT_TARGET/"
  echo "Deployment completed successfully."
else
  echo "Build directory not found. Deployment failed."
  exit 1
fi

exit 0
