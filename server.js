const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

// Basic error handling
process.on('uncaughtException', function(err) {
  console.error('Uncaught exception', err);
});

// Simple logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  // Check if build directory exists and contains index.html
  const indexPath = path.join(__dirname, 'build', 'index.html');
  const buildReady = fs.existsSync(indexPath);
  
  res.json({ 
    status: 'ok',
    buildReady: buildReady,
    serverTime: new Date().toISOString()
  });
});

// Serve static files from the build directory
app.use(express.static(path.join(__dirname, 'build')));

// Serve static files from the public directory as fallback
app.use(express.static(path.join(__dirname, 'public')));

// All other routes serve index.html or fallback to static page
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'build', 'index.html');
  const staticPath = path.join(__dirname, 'public', 'index-static.html');
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else if (fs.existsSync(staticPath)) {
    // If build isn't ready, serve the static loading page
    res.sendFile(staticPath);
  } else {
    res.status(503).send('Application is starting up. Please try again in a few minutes.');
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Something broke!');
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server running on port ${port} at ${new Date().toISOString()}`);
});
