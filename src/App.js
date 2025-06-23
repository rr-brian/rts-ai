import React, { useState } from 'react';
import './App.css';
import { sendMessageToAzureOpenAI } from './services/azureOpenAI';

function App() {
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
        content: `I'm sorry, there was an error: ${error.message}` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="logo-container">
          <img src="/logo.png" alt="RTS AI Logo" className="app-logo" />
          <div>
            <h1>RTS AI Toolbox</h1>
            <p>AI powered enterprise solutions</p>
          </div>
        </div>
      </header>
      
      <nav className="App-nav">
        <ul className="nav-links">
          <li><a href="#" className="nav-link">REA</a></li>
          <li><a href="#" className="nav-link">Legal</a></li>
          <li><a href="#" className="nav-link">Accounting</a></li>
          <li><a href="#" className="nav-link">HR</a></li>
          <li><a href="#" className="nav-link">Omaha</a></li>
          <li><a href="#" className="nav-link">DSC</a></li>
        </ul>
      </nav>
      
      <main className="App-main">
        <div className="chat-container">
          <div className="chat-messages">
            {chatHistory.length === 0 ? (
              <div className="welcome-message">
                <h2>Welcome to RTS AI Toolbox!</h2>
                <p>Ask me anything! I'm powered by Azure OpenAI.</p>
              </div>
            ) : (
              <>
                {chatHistory.map((chat, index) => (
                  <div key={index} className={`message ${chat.role}`}>
                    <div className="message-content">{chat.content}</div>
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
            />
            <button type="submit" className="send-button">Send</button>
          </form>
        </div>
      </main>
      
      <footer className="App-footer">
        <p>© {new Date().getFullYear()} RTS AI Toolbox - Connected to Azure OpenAI</p>
      </footer>
    </div>
  );
}

export default App;
