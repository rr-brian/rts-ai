/**
 * MSSQL Wrapper Module
 * 
 * This module provides a fallback implementation for the mssql module
 * when it's not available in the deployment environment.
 */

let sql;

try {
  // Try to load the real mssql module
  sql = require('mssql');
  console.log('Successfully loaded mssql module');
} catch (error) {
  console.warn('Failed to load mssql module, using mock implementation:', error.message);
  
  // Create a mock SQL client
  sql = {
    connect: () => {
      console.log('Mock SQL: connect called');
      return Promise.resolve();
    },
    close: () => {
      console.log('Mock SQL: close called');
      return Promise.resolve();
    },
    Request: class MockRequest {
      constructor() {
        this.inputs = {};
        console.log('Mock SQL: Request created');
      }
      
      input(name, type, value) {
        console.log(`Mock SQL: input called with name=${name}, type=${type}, value=${value}`);
        this.inputs[name] = value;
        return this;
      }
      
      query(sql) {
        console.log(`Mock SQL: query called with sql=${sql}`);
        console.log('Mock SQL: inputs =', JSON.stringify(this.inputs));
        
        // Return empty recordset by default
        const result = { recordset: [] };
        
        // For get conversation by ID, return a mock conversation
        if (sql.includes('SELECT * FROM Conversations WHERE id =')) {
          result.recordset = [{
            id: this.inputs.id || 'mock-id',
            userId: 'mock-user',
            title: 'Mock Conversation',
            messages: JSON.stringify([
              { role: 'system', content: 'You are a helpful assistant.' },
              { role: 'user', content: 'Hello!' },
              { role: 'assistant', content: 'Hi there! How can I help you today?' }
            ]),
            createdAt: new Date(),
            updatedAt: new Date()
          }];
        }
        
        // For list conversations, return mock conversations
        if (sql.includes('SELECT * FROM Conversations WHERE userId =')) {
          result.recordset = [
            {
              id: 'mock-id-1',
              userId: this.inputs.userId || 'mock-user',
              title: 'Mock Conversation 1',
              messages: JSON.stringify([
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: 'Hello!' },
                { role: 'assistant', content: 'Hi there! How can I help you today?' }
              ]),
              createdAt: new Date(),
              updatedAt: new Date()
            },
            {
              id: 'mock-id-2',
              userId: this.inputs.userId || 'mock-user',
              title: 'Mock Conversation 2',
              messages: JSON.stringify([
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: 'What can you do?' },
                { role: 'assistant', content: 'I can help you with various tasks!' }
              ]),
              createdAt: new Date(),
              updatedAt: new Date()
            }
          ];
        }
        
        return Promise.resolve(result);
      }
    },
    UniqueIdentifier: String,
    NVarChar: String,
    DateTime2: Date,
    Int: Number
  };
}

module.exports = sql;
