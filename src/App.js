import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { MsalProvider, AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from '@azure/msal-react';
import { PublicClientApplication } from '@azure/msal-browser';
import './App.css';

// Import pages
import Home from './pages/Home';
import Legal from './pages/Legal';
import AccessDenied from './pages/AccessDenied';

// Import auth configuration
import { msalConfig } from './auth/authConfig';

// Initialize MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

function App() {
  // Handle login
  const handleLogin = () => {
    msalInstance.loginRedirect();
  };
  
  // Handle logout
  const handleLogout = () => {
    msalInstance.logoutRedirect();
  };

  return (
    <MsalProvider instance={msalInstance}>
      <Router>
        <div className="App">
          <header className="App-header">
            <div className="header-content">
              <img src="/logo.png" alt="RTS AI Logo" className="app-logo" />
              <div>
                <h1>RTS AI Toolbox</h1>
                <p>AI powered enterprise solutions</p>
              </div>
            </div>
            <div className="auth-buttons">
              <AuthenticatedTemplate>
                <button className="logout-button" onClick={handleLogout}>Sign Out</button>
              </AuthenticatedTemplate>
              <UnauthenticatedTemplate>
                <button className="login-button" onClick={handleLogin}>Sign In</button>
              </UnauthenticatedTemplate>
            </div>
          </header>
          
          <nav className="App-nav">
            <ul className="nav-links">
              <li><Link to="/" className="nav-link">REA</Link></li>
              <li><Link to="/legal" className="nav-link">Legal</Link></li>
              <li><Link to="/" className="nav-link">Accounting</Link></li>
              <li><Link to="/" className="nav-link">HR</Link></li>
              <li><Link to="/" className="nav-link">Omaha</Link></li>
              <li><Link to="/" className="nav-link">DSC</Link></li>
            </ul>
          </nav>
          
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/legal" element={<Legal />} />
            <Route path="/access-denied" element={<AccessDenied />} />
          </Routes>
          
          <footer className="App-footer">
            <p>© {new Date().getFullYear()} RTS AI Toolbox - Connected to Azure OpenAI - GPT4.5</p>
          </footer>
        </div>
      </Router>
    </MsalProvider>
  );
}

export default App;
