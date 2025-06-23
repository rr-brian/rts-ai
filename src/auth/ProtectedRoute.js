import React from 'react';
import { Navigate } from 'react-router-dom';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { protectedRoutes } from './authConfig';

// Component to protect routes based on authentication and role requirements
const ProtectedRoute = ({ children, path }) => {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  
  // Find the route configuration for the current path
  const routeConfig = protectedRoutes.find(route => route.path === path);
  
  // If no specific protection is configured, just check authentication
  if (!routeConfig) {
    return isAuthenticated ? children : <Navigate to="/" />;
  }
  
  // If user is not authenticated, redirect to home
  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }
  
  // Get user roles from account
  const checkUserRoles = () => {
    if (accounts.length > 0) {
      // In a real app, you would get roles from the ID token claims
      // This is a simplified example
      const idTokenClaims = accounts[0].idTokenClaims;
      const userRoles = idTokenClaims?.roles || [];
      
      // Check if user has any of the required roles
      const hasRequiredRole = routeConfig.roles.some(role => 
        userRoles.includes(role)
      );
      
      return hasRequiredRole;
    }
    return false;
  };
  
  // If user doesn't have the required role, show access denied
  if (!checkUserRoles()) {
    return <Navigate to="/access-denied" />;
  }
  
  // User is authenticated and has the required role
  return children;
};

export default ProtectedRoute;
