import React from 'react';
import { Link } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import '../App.css';

function AccessDenied() {
  const { instance, accounts } = useMsal();
  
  return (
    <div className="access-denied-page">
      <div className="access-denied-container">
        <h1>Access Denied</h1>
        <p>You do not have permission to access this resource.</p>
        
        {accounts.length > 0 && (
          <div className="user-info">
            <p>Signed in as: {accounts[0].username}</p>
          </div>
        )}
        
        <div className="action-buttons">
          <Link to="/" className="home-button">Return to Home</Link>
          <button 
            className="logout-button" 
            onClick={() => instance.logout()}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

export default AccessDenied;
