import React, { createContext, useContext, useEffect, useState } from 'react';

const CSRFContext = createContext(null);

// Generate a cryptographically secure token
function generateToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function CSRFProvider({ children }) {
  const [csrfToken, setCsrfToken] = useState(null);

  useEffect(() => {
    // Check for existing token in session storage
    let token = sessionStorage.getItem('csrf_token');
    
    if (!token) {
      token = generateToken();
      sessionStorage.setItem('csrf_token', token);
    }
    
    setCsrfToken(token);
  }, []);

  const validateToken = (token) => {
    return token === csrfToken;
  };

  const refreshToken = () => {
    const newToken = generateToken();
    sessionStorage.setItem('csrf_token', newToken);
    setCsrfToken(newToken);
    return newToken;
  };

  return (
    <CSRFContext.Provider value={{ csrfToken, validateToken, refreshToken }}>
      {children}
    </CSRFContext.Provider>
  );
}

export function useCSRF() {
  const context = useContext(CSRFContext);
  if (!context) {
    return { 
      csrfToken: null, 
      validateToken: () => true, 
      refreshToken: () => null 
    };
  }
  return context;
}

// HOC to add CSRF token to forms
export function withCSRFProtection(WrappedComponent) {
  return function CSRFProtectedComponent(props) {
    const { csrfToken } = useCSRF();
    
    return <WrappedComponent {...props} csrfToken={csrfToken} />;
  };
}

export default CSRFProvider;