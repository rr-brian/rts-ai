const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const conversationsRouter = require('./api/conversations');

// Load environment variables from the root .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

// Log SQL configuration (without password)
console.log('SQL Configuration in index.js:');
console.log('  User:', process.env.SQL_USER);
console.log('  Server:', process.env.SQL_SERVER);
console.log('  Database:', process.env.SQL_DATABASE);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL || 'https://yourappname.azurewebsites.net'] 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api/conversations', conversationsRouter);

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../build')));
  
  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
  });
}

// Start the server with error handling
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
  
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please choose a different port.`);
  }
});

// Handle process termination
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
