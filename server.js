const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

// Log environment for debugging
console.log('Current directory:', __dirname);
console.log('Environment:', process.env.NODE_ENV);
console.log('Files in current directory:', fs.readdirSync(__dirname));

// Check if build directory exists
const buildPath = path.join(__dirname, 'build');
const buildExists = fs.existsSync(buildPath);
console.log('Build directory exists:', buildExists);
if (buildExists) {
  console.log('Files in build directory:', fs.readdirSync(buildPath));
}

// Serve static files from the React build
app.use(express.static(buildPath));

// Add a simple health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Handle requests to any route by serving the index.html
app.get('*', function (req, res) {
  const indexPath = path.join(buildPath, 'index.html');
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send(`
      <html>
        <head><title>App Error</title></head>
        <body>
          <h1>Application Error</h1>
          <p>The index.html file could not be found.</p>
          <p>Current directory: ${__dirname}</p>
          <p>Looking for file at: ${indexPath}</p>
          <p>Environment: ${process.env.NODE_ENV}</p>
        </body>
      </html>
    `);
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
