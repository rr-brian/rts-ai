// Azure OpenAI Service Integration

/**
 * Configuration for Azure OpenAI
 * Using environment variables for secure configuration
 */
const config = {
  endpoint: process.env.REACT_APP_AZURE_OPENAI_ENDPOINT,
  apiKey: process.env.REACT_APP_AZURE_OPENAI_API_KEY,
  deploymentName: process.env.REACT_APP_AZURE_OPENAI_DEPLOYMENT_NAME,
  apiVersion: process.env.REACT_APP_AZURE_OPENAI_API_VERSION || '2023-05-15',
};

/**
 * Validates that all required configuration is present
 * @returns {boolean} - True if configuration is valid
 */
const validateConfig = () => {
  const requiredConfig = ['endpoint', 'apiKey', 'deploymentName', 'apiVersion'];
  const missingConfig = requiredConfig.filter(key => !config[key]);
  
  if (missingConfig.length > 0) {
    console.error(`Missing Azure OpenAI configuration: ${missingConfig.join(', ')}`);
    return false;
  }
  return true;
};

/**
 * Send a message to Azure OpenAI and get a response
 * @param {Array} messages - Array of message objects with role and content
 * @returns {Promise} - Promise that resolves to the AI response
 */
export const sendMessageToAzureOpenAI = async (messages) => {
  // Validate configuration before making API call
  if (!validateConfig()) {
    return {
      role: 'assistant',
      content: 'Error: Azure OpenAI configuration is incomplete. Please check your environment variables.'
    };
  }

  try {
    console.log('Sending request to Azure OpenAI...');
    
    // Construct the API URL
    const apiUrl = `${config.endpoint}openai/deployments/${config.deploymentName}/chat/completions?api-version=${config.apiVersion}`;
    
    // Make the API request
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': config.apiKey
      },
      body: JSON.stringify({
        messages: messages,
        max_tokens: 800,
        temperature: 0.7,
        top_p: 0.95,
        frequency_penalty: 0,
        presence_penalty: 0,
        stop: null
      })
    });

    // Check if the response is successful
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Azure OpenAI API error:', errorData);
      throw new Error(`API request failed with status ${response.status}: ${errorData}`);
    }

    // Parse the response
    const data = await response.json();
    console.log('Azure OpenAI response:', data);
    
    // Extract and return the assistant's message
    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message;
    } else {
      throw new Error('No response choices returned from Azure OpenAI');
    }
  } catch (error) {
    console.error('Error calling Azure OpenAI:', error);
    return {
      role: 'assistant',
      content: `I'm sorry, there was an error communicating with the AI service: ${error.message}`
    };
  }
};

export default {
  sendMessageToAzureOpenAI,
};
