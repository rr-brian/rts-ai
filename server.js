const express = require('express');
const path = require('path');
const fs = require('fs');

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
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL || 'https://www.rrrealty.ai'] 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}` + 
    `Headers: ${JSON.stringify(req.headers)}`);
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

// Serve static files from the build directory
app.use(express.static(path.join(__dirname, 'build')));

// Create an endpoint to expose environment variables to the client
app.get('/api/config', (req, res) => {
  res.json({
    REACT_APP_AZURE_OPENAI_ENDPOINT: process.env.REACT_APP_AZURE_OPENAI_ENDPOINT,
    REACT_APP_AZURE_OPENAI_DEPLOYMENT_NAME: process.env.REACT_APP_AZURE_OPENAI_DEPLOYMENT_NAME,
    REACT_APP_AZURE_OPENAI_API_VERSION: process.env.REACT_APP_AZURE_OPENAI_API_VERSION,
    // Don't expose the API key directly, just indicate if it's set
    HAS_API_KEY: !!process.env.REACT_APP_AZURE_OPENAI_API_KEY
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
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

// All other routes serve the React app
app.get('*', (req, res) => {
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
    
    // Inject a script to fetch config from /api/config
    const configScript = `
      <script>
        // Fetch configuration from server
        fetch('/api/config')
          .then(response => response.json())
          .then(config => {
            // Expose config to window object
            window.SERVER_CONFIG = config;
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

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
