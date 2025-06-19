import React, { useState } from 'react';
import './App.css';

function App() {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    // Add user message to chat history
    setChatHistory([...chatHistory, { role: 'user', content: message }]);
    
    // Placeholder for Azure OpenAI API call
    // This will be replaced with actual API call later
    setTimeout(() => {
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: 'This is a placeholder response. Azure OpenAI integration will be added later.' 
      }]);
    }, 1000);
    
    setMessage('');
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>RTS AI Assistant</h1>
        <p>Modern AI-powered chatbot interface</p>
      </header>
      
      <main className="App-main">
        <div className="chat-container">
          <div className="chat-messages">
            {chatHistory.length === 0 ? (
              <div className="welcome-message">
                <h2>Welcome to RTS AI!</h2>
                <p>This is a simple placeholder for our chatbot UI. Azure OpenAI integration will be added later.</p>
              </div>
            ) : (
              chatHistory.map((chat, index) => (
                <div key={index} className={`message ${chat.role}`}>
                  <div className="message-content">{chat.content}</div>
                </div>
              ))
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
        <p>© {new Date().getFullYear()} RTS AI - Connected to Azure OpenAI</p>
      </footer>
    </div>
  );
}

export default App;
