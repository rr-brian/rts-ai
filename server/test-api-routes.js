const express = require('express');
const path = require('path');
const fs = require('fs');

// Create a simple Express app for testing API routes
const app = express();
const PORT = process.env.PORT || 3001;

// Basic logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('Health check endpoint called');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Debug routes endpoint
app.get('/api/debug-routes', (req, res) => {
  console.log('Debug routes endpoint called');
  res.json({
    timestamp: new Date().toISOString(),
    request: {
      url: req.url,
      method: req.method,
      path: req.path,
      headers: req.headers
    },
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'development',
      PORT: PORT
    },
    message: 'This endpoint is working correctly!'
  });
});

// Test SQL endpoint (mock version)
app.get('/api/test-sql', (req, res) => {
  console.log('Test SQL endpoint called (mock version)');
  res.json({
    status: 'success',
    message: 'This is a mock SQL response',
    timestamp: new Date().toISOString()
  });
});

// Catch-all route for testing
app.get('*', (req, res) => {
  res.json({
    message: 'Catch-all route hit',
    path: req.path,
    url: req.url
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Test API server running on port ${PORT}`);
  console.log('Available test endpoints:');
  console.log('- http://localhost:' + PORT + '/api/health');
  console.log('- http://localhost:' + PORT + '/api/debug-routes');
  console.log('- http://localhost:' + PORT + '/api/test-sql');
});
