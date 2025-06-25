const express = require('express');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');

// Try to load optional modules
let cors;
try {
  cors = require('cors');
  console.log('CORS module loaded successfully');
} catch (error) {
  console.warn('CORS module not available, will use Express fallback');
  // Create a simple CORS middleware fallback
  cors = function(options) {
    return function(req, res, next) {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
      next();
    };
  };
}

// Load conversations router with error handling
let conversationsRouter;
try {
  conversationsRouter = require('./server/api/conversations');
  console.log('Conversations router loaded successfully');
} catch (error) {
  console.warn('Conversations router not available:', error.message);
  // Create a simple router fallback
  conversationsRouter = express.Router();
  conversationsRouter.get('/', (req, res) => {
    res.json({ error: 'Conversations API not available' });
  });
}

// Load environment variables from .env file
try {
  // Try to load dotenv
  try {
    const dotenv = require('dotenv');
    
    // Check if .env file exists and load it
    const envPath = path.resolve(__dirname, '.env');
    
    if (fs.existsSync(envPath)) {
      // Load environment variables using dotenv
      dotenv.config({ path: envPath });
      console.log('Environment variables loaded from .env file');
    } else {
      console.log('No .env file found, using environment variables from the system');
    }
  } catch (dotenvError) {
    console.warn('Dotenv module not available:', dotenvError.message);
    console.log('Using environment variables from the system');
  }
} catch (error) {
  console.warn('Error loading environment variables:', error.message);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Explicitly handle API routes before any static file handling
app.use('/api', (req, res, next) => {
  console.log(`API request received: ${req.method} ${req.originalUrl}`);
  next();
});
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL || 'https://www.rrrealty.ai'] 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Log all requests with detailed information
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log(`Request headers: ${JSON.stringify(req.headers)}`);
  console.log(`Request path: ${req.path}, originalUrl: ${req.originalUrl}`);
  next();
});

// Add detailed API logging
app.use('/api', (req, res, next) => {
  console.log(`API Request: ${req.method} ${req.url}`);
  const originalSend = res.send;
  res.send = function(body) {
    console.log(`API Response for ${req.method} ${req.url}: Status ${res.statusCode}`);
    if (typeof body === 'string' && body.length < 1000) {
      console.log(`Response body: ${body}`);
    } else {
      console.log('Response body too large to log');
    }
    return originalSend.call(this, body);
  };
  next();
});

// Define all API routes first, before any static file serving or SPA fallback

// Mount the conversations router
app.use('/api/conversations', conversationsRouter);

// Create an endpoint to expose environment variables to the client
app.get('/api/react-config', (req, res) => {
  console.log('React config endpoint called');
  res.json({
    REACT_APP_AZURE_OPENAI_ENDPOINT: process.env.REACT_APP_AZURE_OPENAI_ENDPOINT,
    REACT_APP_AZURE_OPENAI_DEPLOYMENT_NAME: process.env.REACT_APP_AZURE_OPENAI_DEPLOYMENT_NAME,
    REACT_APP_AZURE_OPENAI_API_VERSION: process.env.REACT_APP_AZURE_OPENAI_API_VERSION,
    // Don't expose the API key directly, just indicate if it's set
    HAS_API_KEY: !!process.env.REACT_APP_AZURE_OPENAI_API_KEY,
    // Brokerage OpenAI config
    REACT_APP_BROKERAGE_OPENAI_ENDPOINT: process.env.REACT_APP_BROKERAGE_OPENAI_ENDPOINT,
    REACT_APP_BROKERAGE_OPENAI_DEPLOYMENT_NAME: process.env.REACT_APP_BROKERAGE_OPENAI_DEPLOYMENT_NAME,
    REACT_APP_BROKERAGE_OPENAI_API_VERSION: process.env.REACT_APP_BROKERAGE_OPENAI_API_VERSION,
    HAS_BROKERAGE_API_KEY: !!process.env.REACT_APP_BROKERAGE_OPENAI_API_KEY,
    // API URL
    REACT_APP_API_URL: process.env.REACT_APP_API_URL || ''
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('Health check endpoint called');
  res.json({ status: 'ok', env: process.env.NODE_ENV, timestamp: new Date().toISOString() });
});

// Config endpoint
app.get('/api/config', (req, res) => {
  console.log('Config endpoint called');
  // Return a safe subset of configuration (no secrets)
  res.json({
    apiEndpoints: {
      conversations: '/api/conversations',
      azureOpenAI: '/api/azure-openai'
    },
    auth: {
      enabled: !!process.env.AZURE_AD_CLIENT_ID,
      provider: 'azure-ad'
    },
    features: {
      sqlEnabled: !!process.env.SQL_SERVER,
      openaiEnabled: !!process.env.AZURE_OPENAI_KEY
    },
    environment: process.env.NODE_ENV || 'production',
    version: '1.0.0'
  });
});

// API routes
app.use('/api/conversations', conversationsRouter);

// Very simple test endpoint that should always work
app.get('/test', (req, res) => {
  console.log('Simple test endpoint called');
  res.send('Test endpoint is working');
});

// API test endpoints have been removed after successful debugging

// Diagnostic endpoint to help debug routing issues
app.get('/api/debug-routes', (req, res) => {
  console.log('Debug routes endpoint called');
  // Return information about the request and environment
  res.json({
    timestamp: new Date().toISOString(),
    request: {
      url: req.url,
      method: req.method,
      path: req.path,
      headers: req.headers
    },
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT || 8080
    },
    apiEndpoints: [
      '/api/react-config',
      '/api/health',
      '/api/config',
      '/api/conversations',
      '/api/test-sql',
      '/api/azure-openai',
      '/api/debug-routes'
    ]
  });
});

// Azure OpenAI proxy endpoint
app.post('/api/azure-openai', async (req, res) => {
  console.log('Azure OpenAI proxy endpoint called');
  try {
    const { messages, max_tokens = 800, temperature = 0.7 } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request: messages array is required' });
    }
    
    // Get Azure OpenAI configuration from environment variables
    const azureOpenAIEndpoint = process.env.REACT_APP_AZURE_OPENAI_ENDPOINT;
    const azureOpenAIKey = process.env.REACT_APP_AZURE_OPENAI_API_KEY;
    const deploymentName = process.env.REACT_APP_AZURE_OPENAI_DEPLOYMENT_NAME;
    const apiVersion = process.env.REACT_APP_AZURE_OPENAI_API_VERSION || '2023-05-15';
    
    if (!azureOpenAIEndpoint || !azureOpenAIKey || !deploymentName) {
      console.error('Azure OpenAI configuration missing');
      return res.status(500).json({ error: 'Azure OpenAI configuration is incomplete' });
    }
    
    // Construct the API URL
    const apiUrl = `${azureOpenAIEndpoint}openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;
    
    console.log(`Calling Azure OpenAI API at: ${apiUrl}`);
    
    // Make the API request
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': azureOpenAIKey
      },
      body: JSON.stringify({
        messages,
        max_tokens,
        temperature,
        top_p: 0.95,
        frequency_penalty: 0,
        presence_penalty: 0,
        stop: null
      })
    });
    
    // Check if the response is successful
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Azure OpenAI API error:', errorText);
      return res.status(response.status).json({ 
        error: `Azure OpenAI API request failed: ${response.statusText}`,
        details: errorText
      });
    }
    
    // Parse and return the response
    const data = await response.json();
    console.log('Azure OpenAI response received successfully');
    res.json(data);
  } catch (error) {
    console.error('Error in Azure OpenAI proxy:', error);
    res.status(500).json({ error: 'Failed to process Azure OpenAI request', message: error.message });
  }
});

// Serve api-test.html directly
app.get('/api-test.html', (req, res) => {
  console.log('Serving api-test.html');
  res.sendFile(path.join(__dirname, 'api-test.html'));
});

// Test SQL endpoint
app.get('/api/test-sql', async (req, res) => {
  console.log('Test SQL endpoint called');
  try {
    // Try to load our mssql wrapper
    const sql = require('./server/lib/mssql-wrapper');
    console.log('SQL module loaded:', typeof sql);
    
    // Test if we can connect
    const config = {
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      server: process.env.SQL_SERVER,
      database: process.env.SQL_DATABASE,
      options: {
        encrypt: true,
        trustServerCertificate: false
      }
    };
    
    console.log('Attempting SQL connection with config:', {
      user: config.user,
      server: config.server,
      database: config.database
    });
    
    await sql.connect(config);
    console.log('SQL connection successful');
    
    // Create a simple test query
    const request = new sql.Request();
    const result = await request.query('SELECT 1 as TestValue');
    console.log('SQL query result:', result);
    
    await sql.close();
    
    res.status(200).json({
      status: 'success',
      message: 'SQL connection test successful',
      result: result
    });
  } catch (error) {
    console.error('SQL test error:', error);
    res.status(500).json({
      status: 'error',
      message: 'SQL connection test failed',
      error: error.message
    });
  }
});

// Azure OpenAI proxy endpoint
app.post('/api/azure-openai', async (req, res) => {
  try {
    const { messages, max_tokens, temperature } = req.body;
    
    // Validate required environment variables
    const endpoint = process.env.REACT_APP_AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.REACT_APP_AZURE_OPENAI_API_KEY;
    const deploymentName = process.env.REACT_APP_AZURE_OPENAI_DEPLOYMENT_NAME;
    const apiVersion = process.env.REACT_APP_AZURE_OPENAI_API_VERSION || '2023-05-15';
    
    if (!endpoint || !apiKey || !deploymentName) {
      return res.status(500).json({ 
        error: 'Server configuration for Azure OpenAI is incomplete' 
      });
    }
    
    // Construct the API URL
    const apiUrl = `${endpoint}openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;
    
    // Check if fetch is available (Node.js 18+)
    let fetchFunction;
    try {
      // Use global fetch if available (Node.js 18+)
      if (typeof fetch === 'function') {
        fetchFunction = fetch;
        console.log('Using global fetch API');
      } else {
        // Try to require node-fetch as fallback
        try {
          fetchFunction = require('node-fetch');
          console.log('Using node-fetch module');
        } catch (fetchError) {
          throw new Error('Neither global fetch nor node-fetch is available');
        }
      }
      
      // Make the API request
      const response = await fetchFunction(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey
        },
        body: JSON.stringify({
          messages,
          max_tokens: max_tokens || 800,
          temperature: temperature || 0.7,
          top_p: 0.95,
          frequency_penalty: 0,
          presence_penalty: 0,
          stop: null
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return res.status(response.status).json({ 
          error: `API request failed: ${data.error?.message || response.statusText}` 
        });
      }
      
      res.json(data);
    } catch (fetchError) {
      console.error('Fetch error:', fetchError.message);
      return res.status(500).json({ 
        error: `Fetch API error: ${fetchError.message}` 
      });
    }
  } catch (error) {
    console.error('General error:', error.message);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
});

// Serve static files from the build directory AFTER defining all API routes
// But make sure to skip API routes to prevent them from being handled as static files
app.use(express.static(path.join(__dirname, 'build'), {
  // Skip API routes when looking for static files
  setHeaders: (res, path) => {
    console.log(`Serving static file: ${path}`);
  },
  index: false // Disable automatic serving of index.html for directories
}));

// All other routes serve the React app - but not API routes
app.get('*', (req, res, next) => {
  // Skip API routes - they should be handled by their own handlers
  if (req.url.startsWith('/api/')) {
    console.log('API request detected in fallback handler, skipping SPA fallback:', req.url);
    return next();
  }
  try {
    // Try to find an appropriate HTML file to serve
    let indexHtmlPath = path.join(__dirname, 'build', 'index.html');
    let indexHtml;
    
    // First try index.html
    if (fs.existsSync(indexHtmlPath)) {
      console.log('Using index.html for SPA fallback');
      indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
    } else {
      // Fall back to index-static.html if available
      const staticIndexPath = path.join(__dirname, 'build', 'index-static.html');
      if (fs.existsSync(staticIndexPath)) {
        console.log('Using index-static.html for SPA fallback');
        indexHtml = fs.readFileSync(staticIndexPath, 'utf8');
      } else {
        // Last resort: generate a simple HTML page
        console.warn('No index.html or index-static.html found, using fallback HTML');
        indexHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>RTS AI</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
          </head>
          <body>
            <div id="root">
              <h1>Welcome to RTS AI!</h1>
              <p>This is a simple placeholder for our chatbot UI.</p>
              <p>Azure OpenAI integration will be added later.</p>
            </div>
          </body>
          </html>
        `;
      }
    }
    
    // Inject a script to fetch config from /api/react-config
    const configScript = `
      <script>
        // Fetch configuration from server
        fetch('/api/react-config')
          .then(response => response.json())
          .then(config => {
            // Expose config to window object
            window.SERVER_CONFIG = config;
            window.REACT_APP_CONFIG = config; // Also set REACT_APP_CONFIG for compatibility
            console.log('Server config loaded:', config);
          })
          .catch(error => console.error('Failed to load server config:', error));
      </script>
    `;
    
    // Insert the script right before the closing </head> tag
    indexHtml = indexHtml.replace('</head>', `${configScript}</head>`);
    
    // Send the modified HTML
    res.send(indexHtml);
  } catch (error) {
    console.error('Error serving SPA fallback:', error);
    res.status(500).send('Server Error: Could not serve application');
  }
});

// Add a catch-all handler for API routes that weren't matched
app.use('/api/*', (req, res) => {
  console.log(`API endpoint not found: ${req.method} ${req.url}`);
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
