/*
 * Microsoft Authentication Library (MSAL) Configuration
 * For Microsoft Entra ID (formerly Azure AD) SSO integration
 */

export const msalConfig = {
  auth: {
    clientId: process.env.REACT_APP_AZURE_AD_CLIENT_ID,
    authority: process.env.REACT_APP_AZURE_AD_AUTHORITY,
    redirectUri: process.env.REACT_APP_AZURE_AD_REDIRECT_URI,
    postLogoutRedirectUri: process.env.REACT_APP_AZURE_AD_REDIRECT_URI,
  },
  cache: {
    cacheLocation: "sessionStorage", // or "localStorage"
    storeAuthStateInCookie: false,
  },
};

// Scopes for token requests
export const loginRequest = {
  scopes: ["User.Read"]
};

// Optional - Additional scopes for specific API access
export const apiRequest = {
  scopes: ["api://YOUR_API_CLIENT_ID/access_as_user"]
};

// Protected routes configuration
export const protectedRoutes = [
  {
    path: "/legal",
    roles: ["AI.Brokerage.Access"] // Role required to access the Legal page
  },
  // Add more protected routes as needed
];
