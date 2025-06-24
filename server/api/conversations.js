const express = require('express');
let uuidv4, sql, dotenv;

// Try to load optional dependencies
try {
  const uuid = require('uuid');
  uuidv4 = uuid.v4;
  console.log('UUID module loaded successfully');
} catch (error) {
  console.warn('UUID module not available:', error.message);
  // Simple UUID fallback
  uuidv4 = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
}

try {
  sql = require('mssql');
  console.log('MSSQL module loaded successfully');
} catch (error) {
  console.warn('MSSQL module not available:', error.message);
  // Create a mock SQL client
  sql = {
    connect: () => Promise.resolve(),
    close: () => Promise.resolve(),
    Request: class MockRequest {
      input() { return this; }
      query() { return Promise.resolve({ recordset: [] }); }
    },
    UniqueIdentifier: String,
    NVarChar: String,
    DateTime2: Date,
    Int: Number
  };
}

try {
  dotenv = require('dotenv');
  console.log('Dotenv module loaded successfully');
} catch (error) {
  console.warn('Dotenv module not available:', error.message);
  dotenv = { config: () => {} };
}

const path = require('path');
const router = express.Router();

// Load environment variables from the root .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

// SQL Server configuration - these will come from environment variables
const config = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER,
  database: process.env.SQL_DATABASE,
  options: {
    encrypt: true,
    trustServerCertificate: false,
    enableArithAbort: true
  },
  connectionTimeout: 30000,
  requestTimeout: 30000
};

// Log SQL configuration (without password)
console.log('SQL Configuration in conversations.js:');
console.log('  User:', process.env.SQL_USER);
console.log('  Server:', process.env.SQL_SERVER);
console.log('  Database:', process.env.SQL_DATABASE);

// Create or update a conversation
router.post('/update', async (req, res) => {
  try {
    // Connect to SQL Server for this request
    await sql.connect(config);
    
    const { 
      conversationId, 
      userId, 
      userEmail, 
      chatType, 
      messages, 
      totalTokens, 
      metadata 
    } = req.body;
    
    console.log('Request body received:', { conversationId, userId, userEmail, chatType });
    
    if (!messages || !Array.isArray(messages)) {
      console.error('Invalid messages format:', messages);
      return res.status(400).json({ error: 'Invalid messages format' });
    }
    
    const lastUserMessage = messages
      .filter(m => m.role === 'user')
      .pop()?.content || '';
      
    const lastAssistantMessage = messages
      .filter(m => m.role === 'assistant')
      .pop()?.content || '';
    
    const request = new sql.Request();
    
    if (conversationId) {
      // Update existing conversation
      await request
        .input('ConversationId', sql.UniqueIdentifier, conversationId)
        .input('LastUpdated', sql.DateTime2, new Date())
        .input('MessageCount', sql.Int, messages.length)
        .input('TotalTokens', sql.Int, totalTokens || 0)
        .input('ConversationState', sql.NVarChar, JSON.stringify(messages))
        .input('LastUserMessage', sql.NVarChar, lastUserMessage)
        .input('LastAssistantMessage', sql.NVarChar, lastAssistantMessage)
        .input('Metadata', sql.NVarChar, JSON.stringify(metadata || {}))
        .query(`
          UPDATE Conversations
          SET LastUpdated = @LastUpdated,
              MessageCount = @MessageCount,
              TotalTokens = @TotalTokens,
              ConversationState = @ConversationState,
              LastUserMessage = @LastUserMessage,
              LastAssistantMessage = @LastAssistantMessage,
              Metadata = @Metadata
          WHERE ConversationId = @ConversationId
        `);
        
      res.status(200).json({ conversationId });
    } else {
      // Create new conversation
      const newConversationId = uuidv4();
      
      await request
        .input('ConversationId', sql.UniqueIdentifier, newConversationId)
        .input('UserId', sql.NVarChar, userId || 'anonymous')
        .input('UserEmail', sql.NVarChar, userEmail || '')
        .input('ChatType', sql.NVarChar, chatType || 'general')
        .input('LastUpdated', sql.DateTime2, new Date())
        .input('StartTime', sql.DateTime2, new Date())
        .input('MessageCount', sql.Int, messages.length)
        .input('TotalTokens', sql.Int, totalTokens || 0)
        .input('ConversationState', sql.NVarChar, JSON.stringify(messages))
        .input('LastUserMessage', sql.NVarChar, lastUserMessage)
        .input('LastAssistantMessage', sql.NVarChar, lastAssistantMessage)
        .input('Metadata', sql.NVarChar, JSON.stringify(metadata || {}))
        .query(`
          INSERT INTO Conversations (
            ConversationId, UserId, UserEmail, ChatType, LastUpdated, StartTime,
            MessageCount, TotalTokens, ConversationState, LastUserMessage, 
            LastAssistantMessage, Metadata
          )
          VALUES (
            @ConversationId, @UserId, @UserEmail, @ChatType, @LastUpdated, @StartTime,
            @MessageCount, @TotalTokens, @ConversationState, @LastUserMessage,
            @LastAssistantMessage, @Metadata
          )
        `);
        
      res.status(201).json({ conversationId: newConversationId });
    }
  } catch (error) {
    console.error('Error updating conversation:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', req.body);
    res.status(500).json({ error: 'Failed to update conversation', details: error.message });
  } finally {
    // Close the SQL connection
    try {
      await sql.close();
    } catch (err) {
      console.error('Error closing SQL connection:', err);
    }
  }
});

// Get a conversation by ID
router.get('/:conversationId', async (req, res) => {
  try {
    // Connect to SQL Server for this request
    await sql.connect(config);
    
    const { conversationId } = req.params;
    
    const request = new sql.Request();
    const result = await request
      .input('ConversationId', sql.UniqueIdentifier, conversationId)
      .query(`
        SELECT * FROM Conversations
        WHERE ConversationId = @ConversationId
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Parse the conversation state from JSON
    const conversation = result.recordset[0];
    conversation.ConversationState = JSON.parse(conversation.ConversationState);
    
    res.status(200).json(conversation);
  } catch (error) {
    console.error('Error retrieving conversation:', error);
    res.status(500).json({ error: 'Failed to retrieve conversation', details: error.message });
  } finally {
    // Close the SQL connection
    try {
      await sql.close();
    } catch (err) {
      console.error('Error closing SQL connection:', err);
    }
  }
});

// Get all conversations for a user
router.get('/user/:userId', async (req, res) => {
  try {
    // Connect to SQL Server for this request
    await sql.connect(config);
    
    const { userId } = req.params;
    
    const request = new sql.Request();
    const result = await request
      .input('UserId', sql.NVarChar, userId)
      .query(`
        SELECT 
          ConversationId, 
          UserId, 
          UserEmail, 
          ChatType, 
          StartTime, 
          LastUpdated, 
          MessageCount, 
          TotalTokens,
          LastUserMessage,
          LastAssistantMessage
        FROM Conversations
        WHERE UserId = @UserId
        ORDER BY LastUpdated DESC
      `);
    
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Error retrieving user conversations:', error);
    res.status(500).json({ error: 'Failed to retrieve user conversations', details: error.message });
  } finally {
    // Close the SQL connection
    try {
      await sql.close();
    } catch (err) {
      console.error('Error closing SQL connection:', err);
    }
  }
});

module.exports = router;
