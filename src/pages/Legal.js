import React, { useEffect, useState } from 'react';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import '../App.css';

function Legal() {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [userRoles, setUserRoles] = useState([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (isAuthenticated && accounts.length > 0) {
        try {
          // Request access token with the roles claim
          const request = {
            scopes: ["User.Read"],
            account: accounts[0]
          };
          
          const response = await instance.acquireTokenSilent(request);
          
          // Check for roles in the token claims
          const tokenClaims = response.idTokenClaims;
          const roles = tokenClaims?.roles || [];
          setUserRoles(roles);
          
          // Check if user has the required role for Legal access
          // Check for the AI - Brokerage Access group
          setHasAccess(roles.includes('AI.Brokerage.Access'));
          setLoading(false);
        } catch (error) {
          if (error instanceof InteractionRequiredAuthError) {
            // Fallback to interactive method if silent token acquisition fails
            instance.acquireTokenRedirect({
              scopes: ["User.Read"]
            });
          }
          console.error('Error checking access:', error);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    checkAccess();
  }, [isAuthenticated, accounts, instance]);

  const handleLogin = () => {
    instance.loginRedirect({
      scopes: ["User.Read"]
    });
  };

  if (loading) {
    return (
      <div className="legal-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="legal-page">
        <div className="auth-container">
          <h2>Authentication Required</h2>
          <p>Please sign in with your company account to access the Legal resources.</p>
          <button className="login-button" onClick={handleLogin}>
            Sign in with Microsoft
          </button>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="legal-page">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>You do not have the required permissions to access the Legal resources.</p>
          <p>If you believe this is an error, please contact your administrator.</p>
          <p>Current user: {accounts[0]?.username}</p>
          <p>Assigned roles: {userRoles.join(', ') || 'None'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="legal-page">
      <div className="legal-header">
        <h1>RTS Brokerage Resources</h1>
        <p>Welcome to the Brokerage department resources portal</p>
      </div>
      
      <div className="legal-content">
        <div className="user-info">
          <p>Signed in as: {accounts[0]?.username}</p>
          <p>Access level: Brokerage Department</p>
        </div>
        
        <div className="resources-section">
          <h2>Brokerage Resources</h2>
          
          <div className="resource-cards">
            <div className="resource-card">
              <h3>Brokerage Templates</h3>
              <p>Standard brokerage templates for various business needs</p>
              <button className="resource-button">Access Templates</button>
            </div>
            
            <div className="resource-card">
              <h3>Market Analysis</h3>
              <p>Current market trends and analysis reports</p>
              <button className="resource-button">View Documents</button>
            </div>
            
            <div className="resource-card">
              <h3>Brokerage AI Assistant</h3>
              <p>AI-powered brokerage research and document analysis</p>
              <button className="resource-button">Launch Assistant</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Legal;
