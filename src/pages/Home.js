import React, { useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import ReactMarkdown from 'react-markdown';
import { sendMessageToAzureOpenAI } from '../services/azureOpenAI';
import '../App.css';

function Home() {
  const { accounts } = useMsal();
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [totalTokens, setTotalTokens] = useState(0);

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
      console.log('Using API base URL:', apiBaseUrl);
      
      // Prepare the request payload
      const payload = {
        conversationId,
        userId,
        userEmail,
        chatType: 'general',
        messages: messageList,
        totalTokens: estimatedTokens,
        metadata: {
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      };
      
      // Try the main endpoint first
      try {
        const response = await fetch(`${apiBaseUrl}/api/conversations/update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // If this is a new conversation, store the ID
        if (!conversationId && data.conversationId) {
          setConversationId(data.conversationId);
        }
        return;
      } catch (primaryError) {
        console.warn('Primary endpoint failed, using fallback:', primaryError);
        // Continue to fallback
      }
      
      // If we're still here, the primary endpoint failed
      // Generate a client-side ID if needed
      if (!conversationId) {
        // Simple UUID generation
        const newId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
        setConversationId(newId);
        console.log('Generated client-side conversation ID:', newId);
      }
    } catch (error) {
      console.error('Error saving conversation:', error);
      // Non-blocking error - we don't want to interrupt the user experience
      // if conversation saving fails
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;
    
    // Add user message to chat history
    const userMessage = { role: 'user', content: message };
    const updatedHistory = [...chatHistory, userMessage];
    setChatHistory(updatedHistory);
    setMessage('');
    setIsLoading(true);
    
    try {
      // Save conversation with user message
      await saveConversation(updatedHistory);
      
      // Call Azure OpenAI service
      const aiResponse = await sendMessageToAzureOpenAI(updatedHistory);
      
      // Add AI response to chat history
      const finalHistory = [...updatedHistory, aiResponse];
      setChatHistory(finalHistory);
      
      // Save conversation with AI response
      await saveConversation(finalHistory);
    } catch (error) {
      console.error('Error getting AI response:', error);
      // Add error message to chat history
      const errorMessage = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message || 'Unknown error'}`
      };
      const finalHistory = [...updatedHistory, errorMessage];
      setChatHistory(finalHistory);
      
      // Save conversation with error message
      await saveConversation(finalHistory);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="App-main">
      <div className="chat-container">
        <div className="chat-messages">
          {chatHistory.length === 0 ? (
            <div className="welcome-message">
              <h2>Welcome to RTS AI Toolbox!</h2>
              <p>Ask me anything! I am the RTS general model powered by Azure OpenAI.</p>
            </div>
          ) : (
            <>
              {chatHistory.map((chat, index) => (
                <div key={index} className={`message ${chat.role}`}>
                  <div className="message-content">
                    {chat.role === 'assistant' ? (
                      <ReactMarkdown>{chat.content}</ReactMarkdown>
                    ) : (
                      chat.content
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="message assistant loading">
                  <div className="message-content">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        
        <form className="chat-input-form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message here..."
            className="chat-input"
            disabled={isLoading}
          />
          <button 
            type="submit" 
            className="send-button"
            disabled={isLoading || !message.trim()}
          >
            Send
          </button>
        </form>
      </div>
    </main>
  );
}

export default Home;
