import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { sendMessageToAzureOpenAI } from '../services/azureOpenAI';
import '../App.css';

function Home() {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;
    
    // Add user message to chat history
    const userMessage = { role: 'user', content: message };
    setChatHistory([...chatHistory, userMessage]);
    setMessage('');
    setIsLoading(true);
    
    try {
      // Prepare the messages array for the API call
      // Include conversation history for context
      const messages = [...chatHistory, userMessage];
      
      // Call Azure OpenAI service
      const aiResponse = await sendMessageToAzureOpenAI(messages);
      
      // Add AI response to chat history
      setChatHistory(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      // Add error message to chat history
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message || 'Unknown error'}`
      }]);
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
