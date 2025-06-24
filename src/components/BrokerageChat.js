import React, { useState, useRef, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { sendMessageToBrokerageOpenAI } from '../services/brokerageOpenAI';
import '../styles/BrokerageChat.css';

function BrokerageChat() {
  const { accounts } = useMsal();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I\'m your Brokerage AI assistant. How can I help you with brokerage-related questions today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [totalTokens, setTotalTokens] = useState(0);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize conversation when component mounts
  useEffect(() => {
    // Save initial greeting message to database
    saveConversation(messages);
  }, []);

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  // Save conversation to database
  const saveConversation = async (messageList) => {
    try {
      const userId = accounts[0]?.username || 'anonymous';
      const userEmail = accounts[0]?.username || '';
      
      // Estimate token usage (rough approximation: ~4 chars per token)
      const estimatedTokens = messageList.reduce((total, msg) => {
        return total + Math.ceil(msg.content.length / 4);
      }, 0);
      
      setTotalTokens(estimatedTokens);
      
      // Use the API URL from environment variables or fallback to a default
      const apiBaseUrl = process.env.REACT_APP_API_URL || window.location.origin;
      console.log('Using API base URL for brokerage chat:', apiBaseUrl);
      
      const response = await fetch(`${apiBaseUrl}/api/conversations/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversationId,
          userId,
          userEmail,
          chatType: 'brokerage',
          messages: messageList,
          totalTokens: estimatedTokens,
          metadata: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
          }
        })
      });
      
      const data = await response.json();
      
      // If this is a new conversation, store the ID
      if (!conversationId && data.conversationId) {
        setConversationId(data.conversationId);
      }
    } catch (error) {
      console.error('Error saving conversation:', error);
      // Non-blocking error - we don't want to interrupt the user experience
      // if conversation saving fails
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    // Add user message to chat
    const userMessage = { role: 'user', content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);
    
    try {
      // Save conversation with user message
      await saveConversation(updatedMessages);
      
      // Send to Brokerage OpenAI service
      const response = await sendMessageToBrokerageOpenAI(updatedMessages);
      
      // Add AI response to chat
      const finalMessages = [...updatedMessages, response];
      setMessages(finalMessages);
      
      // Save conversation with AI response
      await saveConversation(finalMessages);
    } catch (error) {
      console.error('Error sending message to Brokerage OpenAI:', error);
      const errorMessage = { 
        role: 'assistant', 
        content: 'Sorry, there was an error processing your request. Please try again.' 
      };
      const finalMessages = [...updatedMessages, errorMessage];
      setMessages(finalMessages);
      
      // Save conversation with error message
      await saveConversation(finalMessages);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="brokerage-chat-container">
      <div className="brokerage-chat-header">
        <h2>Brokerage AI Assistant</h2>
        <p>Specialized for brokerage-related inquiries and document analysis</p>
      </div>
      
      <div className="brokerage-chat-messages">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`brokerage-message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
          >
            <div className="brokerage-message-content">
              {message.content.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="brokerage-message assistant-message">
            <div className="brokerage-message-content typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form className="brokerage-chat-input" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="Type your brokerage question here..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
}

export default BrokerageChat;
