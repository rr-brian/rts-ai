const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;

// Add basic logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Determine the correct build path
let buildPath = path.join(__dirname, 'build');

// Check if we're in the deployment target where build files are at root
if (!fs.existsSync(buildPath)) {
  buildPath = __dirname;
  console.log('Using root directory for static files');
} else {
  console.log('Using build directory for static files');
}

// Serve static files from the correct location
app.use(express.static(buildPath));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    buildPath: buildPath,
    files: fs.existsSync(path.join(buildPath, 'index.html')) ? 'index.html exists' : 'index.html missing'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).send('Server error');
});

// For all other requests, serve the React app
app.get('*', (req, res) => {
  const indexPath = path.join(buildPath, 'index.html');
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Application files not found. Please check server configuration.');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Current directory: ${__dirname}`);
  console.log(`Build path: ${buildPath}`);
  console.log(`Index.html exists: ${fs.existsSync(path.join(buildPath, 'index.html'))}`);
});
