import React, { useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import ReactMarkdown from 'react-markdown';
import '../App.css';
import '../styles/Admin.css';

function Admin() {
  const { accounts } = useMsal();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'general', 'brokerage'

  // Fetch conversations when component mounts
  useEffect(() => {
    if (accounts && accounts.length > 0) {
      fetchUserConversations(accounts[0].username);
    }
  }, [accounts]);

  const fetchUserConversations = async (userId) => {
    setLoading(true);
    setError(null);
    
    try {
      // Use the API URL from environment variables or fallback to a default
      const apiBaseUrl = process.env.REACT_APP_API_URL || window.location.origin;
      console.log('Using API base URL for user conversations:', apiBaseUrl);
      
      const response = await fetch(`${apiBaseUrl}/api/conversations/user/${userId}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setConversations(data);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError('Failed to load conversations. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchConversationDetails = async (conversationId) => {
    setLoading(true);
    setError(null);
    
    try {
      // Use the API URL from environment variables or fallback to a default
      const apiBaseUrl = process.env.REACT_APP_API_URL || window.location.origin;
      console.log('Using API base URL for conversation details:', apiBaseUrl);
      
      const response = await fetch(`${apiBaseUrl}/api/conversations/${conversationId}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setSelectedConversation(data);
    } catch (err) {
      console.error('Error fetching conversation details:', err);
      setError('Failed to load conversation details. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleConversationClick = (conversationId) => {
    fetchConversationDetails(conversationId);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const filteredConversations = filter === 'all' 
    ? conversations 
    : conversations.filter(conv => conv.ChatType === filter);

  return (
    <main className="App-main">
      <div className="admin-container">
        <h1>Conversation Admin Dashboard</h1>
        
        <div className="filter-controls">
          <label>
            Filter by type:
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Conversations</option>
              <option value="general">General AI</option>
              <option value="brokerage">Brokerage AI</option>
            </select>
          </label>
        </div>
        
        <div className="admin-layout">
          <div className="conversation-list">
            <h2>Conversations ({filteredConversations.length})</h2>
            
            {loading && !selectedConversation && <p>Loading conversations...</p>}
            {error && !selectedConversation && <p className="error">{error}</p>}
            
            {filteredConversations.length === 0 && !loading ? (
              <p>No conversations found.</p>
            ) : (
              <ul>
                {filteredConversations.map((conv) => (
                  <li 
                    key={conv.ConversationId} 
                    onClick={() => handleConversationClick(conv.ConversationId)}
                    className={selectedConversation?.ConversationId === conv.ConversationId ? 'selected' : ''}
                  >
                    <div className="conversation-item">
                      <span className={`chat-type ${conv.ChatType}`}>{conv.ChatType}</span>
                      <span className="timestamp">{formatDate(conv.StartTime)}</span>
                      <span className="message-count">{conv.MessageCount} messages</span>
                      <p className="last-message">{conv.LastUserMessage}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="conversation-details">
            <h2>Conversation Details</h2>
            
            {loading && selectedConversation && <p>Loading conversation details...</p>}
            {error && selectedConversation && <p className="error">{error}</p>}
            
            {selectedConversation ? (
              <div className="conversation-content">
                <div className="conversation-header">
                  <p><strong>Started:</strong> {formatDate(selectedConversation.StartTime)}</p>
                  <p><strong>Last Updated:</strong> {formatDate(selectedConversation.LastUpdated)}</p>
                  <p><strong>User:</strong> {selectedConversation.UserEmail || selectedConversation.UserId}</p>
                  <p><strong>Type:</strong> {selectedConversation.ChatType}</p>
                  <p><strong>Messages:</strong> {selectedConversation.MessageCount}</p>
                  <p><strong>Tokens:</strong> {selectedConversation.TotalTokens}</p>
                </div>
                
                <div className="message-history">
                  <h3>Message History</h3>
                  {selectedConversation.ConversationState.map((message, index) => (
                    <div 
                      key={index} 
                      className={`admin-message ${message.role}`}
                    >
                      <div className="message-role">{message.role}</div>
                      <div className="message-content">
                        {message.role === 'assistant' ? (
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        ) : (
                          <p>{message.content}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p>Select a conversation to view details</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default Admin;
