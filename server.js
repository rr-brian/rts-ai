const express = require('express');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env file
try {
  const fs = require('fs');
  const path = require('path');
  
  // Check if .env file exists
  const envPath = path.resolve(__dirname, '.env');
  console.log('Looking for .env file at:', envPath);
  
  if (fs.existsSync(envPath)) {
    console.log('.env file exists');
    
    // Manually read and parse the .env file
    try {
      const envContent = fs.readFileSync(envPath, { encoding: 'utf8' });
      
      // Parse each line and set environment variables
      envContent.split('\n').forEach(line => {
        // Skip empty lines and comments
        if (!line || line.startsWith('#')) return;
        
        // Split by first equals sign
        const equalSignIndex = line.indexOf('=');
        if (equalSignIndex > 0) {
          const key = line.substring(0, equalSignIndex).trim();
          const value = line.substring(equalSignIndex + 1).trim();
          
          // Remove quotes if present
          const cleanValue = value.replace(/^['"](.*)['"]/g, '$1');
          
          // Set environment variable
          process.env[key] = cleanValue;
          console.log(`Set environment variable: ${key}`);
        }
      });
      
      // Print all environment variables with REACT_APP prefix for debugging
      const reactAppVars = Object.keys(process.env)
        .filter(key => key.startsWith('REACT_APP_'))
        .reduce((obj, key) => {
          obj[key] = process.env[key] ? 'SET' : 'NOT SET';
          return obj;
        }, {});
      
      console.log('Available REACT_APP environment variables:', reactAppVars);
    } catch (readError) {
      console.error('Error reading .env file:', readError);
    }
  } else {
    console.warn('.env file not found at:', envPath);
  }
} catch (error) {
  console.warn('Error during .env loading:', error);
}

const app = express();
const PORT = process.env.PORT || 8080;

// Simple request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Serve static files from the build directory
app.use(express.static(path.join(__dirname, 'build')));

// Create an endpoint to expose environment variables to the client
app.get('/api/config', (req, res) => {
  // Log available environment variables for debugging
  console.log('Available environment variables:', {
    ENDPOINT: process.env.REACT_APP_AZURE_OPENAI_ENDPOINT ? 'SET' : 'NOT SET',
    API_KEY: process.env.REACT_APP_AZURE_OPENAI_API_KEY ? 'SET' : 'NOT SET',
    DEPLOYMENT_NAME: process.env.REACT_APP_AZURE_OPENAI_DEPLOYMENT_NAME ? 'SET' : 'NOT SET'
  });
  
  res.json({
    REACT_APP_AZURE_OPENAI_ENDPOINT: process.env.REACT_APP_AZURE_OPENAI_ENDPOINT,
    REACT_APP_AZURE_OPENAI_DEPLOYMENT_NAME: process.env.REACT_APP_AZURE_OPENAI_DEPLOYMENT_NAME,
    // Don't expose the API key directly, just indicate if it's set
    AZURE_OPENAI_API_KEY_SET: !!process.env.REACT_APP_AZURE_OPENAI_API_KEY
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
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
    
    // Make the API request
    const response = await fetch(apiUrl, {
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
      console.error('Azure OpenAI API error:', data);
      return res.status(response.status).json({ 
        error: `API request failed: ${data.error?.message || response.statusText}` 
      });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Server proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

// All other routes serve the React app
app.get('*', (req, res) => {
  // Read the index.html file
  let indexHtml = fs.readFileSync(path.join(__dirname, 'build', 'index.html'), 'utf8');
  
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
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
