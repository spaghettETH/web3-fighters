import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import './LoginScreen.css';

export const LoginScreen = () => {
  const { 
    webauthnSupported, 
    hasRegisteredPasskeys, 
    registerPasskey, 
    authenticateWithPasskey,
    getRegisteredUsers,
    deleteUser,
    resetAllUsers,
    isAuthenticated
  } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRegistration, setShowRegistration] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [userDisplayName, setUserDisplayName] = useState('');
  const [registrationMode, setRegistrationMode] = useState('user'); // 'user' or 'master'
  const [masterPassword, setMasterPassword] = useState('');

  const MASTER_PASSWORD = 'l4cr01s3tt3';

  // Monitor authentication state changes
  useEffect(() => {
    console.log('LoginScreen: isAuthenticated changed to:', isAuthenticated);
    if (isAuthenticated) {
      console.log('LoginScreen: User is authenticated, stopping loading');
      // If user becomes authenticated, stop loading
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Log current state on every render
  useEffect(() => {
    console.log('LoginScreen render - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading);
  });

  const handleAuthenticate = async () => {
    console.log('LoginScreen: Starting authentication flow');
    setIsLoading(true);
    setError('');

    try {
      const result = await authenticateWithPasskey();
      console.log('LoginScreen: Authentication result:', result);
      
      if (!result.success) {
        console.log('LoginScreen: Authentication failed:', result.error);
        setError(result.error || 'Authentication error');
        setIsLoading(false);
      } else {
        console.log('LoginScreen: Authentication succeeded, waiting for state update');
        // If login succeeds, the useEffect above will handle stopping the loading
        // But add a timeout as fallback
        setTimeout(() => {
          console.log('LoginScreen: Timeout check - isAuthenticated:', isAuthenticated);
          if (!isAuthenticated) {
            console.log('LoginScreen: Force stopping loading due to timeout');
            setIsLoading(false);
          }
        }, 2000);
      }
    } catch (error) {
      console.error('LoginScreen: Authentication error:', error);
      setError('Error during authentication. Please try again.');
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!userDisplayName.trim()) {
      setError('Please enter your name');
      return;
    }

    // Controlla la password master se necessario
    if (registrationMode === 'master') {
      if (!masterPassword) {
        setError('Master password is required');
        return;
      }
      if (masterPassword !== MASTER_PASSWORD) {
        setError('Incorrect master password');
        return;
      }
    }

    console.log('LoginScreen: Starting registration flow');
    setIsLoading(true);
    setError('');

    try {
      const result = await registerPasskey(userDisplayName, registrationMode === 'master');
      console.log('LoginScreen: Registration result:', result);
      
      if (result.success) {
        setShowRegistration(false);
        setUserDisplayName('');
        setMasterPassword('');
        setError('');
        setIsLoading(false); // Reset loading after successful registration
      } else {
        setError(result.error || 'Registration error');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('LoginScreen: Registration error:', error);
      setError('Error during registration. Please try again.');
      setIsLoading(false);
    }
  };

  const handleDeleteUser = (userId: string) => {
    if (window.confirm('Are you sure you want to delete this passkey?')) {
      deleteUser(userId);
    }
  };

  const handleResetAll = () => {
    if (window.confirm('WARNING: This will delete ALL registered passkeys. Are you sure?')) {
      resetAllUsers();
    }
  };

  // If WebAuthn is not supported
  if (!webauthnSupported) {
    return (
      <div className="login-screen">
        <div className="login-container">
          <div className="logo-wrapper">
            <img src="/assets/logoTotal.png" alt="BlockFighters Logo" className="logo-total" />
          </div>
          
          <h1>Web3 Fighters</h1>
          <div className="error-message">
            <p>❌ Your browser doesn't support WebAuthn Passkeys.</p>
            <p>To use this app you need:</p>
            <ul>
              <li>A modern browser (Chrome, Safari, Firefox, Edge)</li>
              <li>A device with biometric support (Touch ID, Face ID, Windows Hello)</li>
              <li>An HTTPS connection (required for passkeys)</li>
            </ul>
            
            {/* Debug info for troubleshooting */}
            <details style={{ marginTop: '1rem', color: '#888', fontSize: '0.8rem' }}>
              <summary>Debug Info (for troubleshooting)</summary>
              <div style={{ marginTop: '0.5rem', textAlign: 'left' }}>
                <p>User Agent: {navigator.userAgent}</p>
                <p>Protocol: {window.location.protocol}</p>
                <p>Hostname: {window.location.hostname}</p>
                <p>Secure Context: {window.isSecureContext ? 'Yes' : 'No'}</p>
                <p>PublicKeyCredential: {window.PublicKeyCredential ? 'Available' : 'Not Available'}</p>
                <p>Credentials API: {navigator.credentials ? 'Available' : 'Not Available'}</p>
              </div>
            </details>
          </div>
        </div>
      </div>
    );
  }

  // Registration screen
  if (showRegistration) {
    return (
      <div className="login-screen">
        <div className="login-container">
          <div className="logo-wrapper">
            <img src="/assets/logoTotal.png" alt="BlockFighters Logo" className="logo-total" />
          </div>
          
          <h1>Register Passkey</h1>
          <p className="subtitle">Create a new passkey to access the app</p>
          
          <div className="registration-form">
            <div className="form-group">
              <label htmlFor="displayName">Your name</label>
              <input
                type="text"
                id="displayName"
                value={userDisplayName}
                onChange={(e) => setUserDisplayName(e.target.value)}
                placeholder="Enter your name"
                disabled={isLoading}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Account type</label>
              <div className="radio-group">
                <label className="radio-option">
                  <input
                    type="radio"
                    value="user"
                    checked={registrationMode === 'user'}
                    onChange={(e) => setRegistrationMode(e.target.value)}
                    disabled={isLoading}
                  />
                  <span>User (can vote)</span>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    value="master"
                    checked={registrationMode === 'master'}
                    onChange={(e) => setRegistrationMode(e.target.value)}
                    disabled={isLoading}
                  />
                  <span>Master (can create matches)</span>
                </label>
              </div>
            </div>

            {registrationMode === 'master' && (
              <div className="form-group">
                <label htmlFor="masterPassword">Master password</label>
                <input
                  type="password"
                  id="masterPassword"
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  placeholder="Enter master password"
                  disabled={isLoading}
                />
              </div>
            )}
            
            {error && <div className="error-message">{error}</div>}
            
            <div className="form-actions">
              <button 
                onClick={handleRegister}
                className="register-button"
                disabled={
                  isLoading || 
                  !userDisplayName.trim() || 
                  (registrationMode === 'master' && !masterPassword.trim())
                }
              >
                {isLoading ? 'Registering...' : '🔐 Register Passkey'}
              </button>
              
              <button 
                onClick={() => {
                  setShowRegistration(false);
                  setIsLoading(false);
                  setError('');
                  setUserDisplayName('');
                  setMasterPassword('');
                }}
                className="cancel-button"
                disabled={isLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main login screen
  return (
    <div className="login-screen">
      <div className="login-container">
        <div className="logo-wrapper">
          <img src="/assets/logoTotal.png" alt="BlockFighters Logo" className="logo-total" />
        </div>
        
        <h1>Web3 Fighters</h1>
        <p className="subtitle">Log in with your passkey to vote for your favorite fighters!</p>
        
        <div className="webauthn-info">
          <p>🔐 This app uses <strong>WebAuthn Passkeys</strong> for maximum security</p>
          <p>Use your fingerprint, Face ID or PIN to log in</p>
        </div>

        {error && <div className="error-message">{error}</div>}
        
        <div className="login-actions">
          {hasRegisteredPasskeys ? (
            <button 
              onClick={handleAuthenticate}
              className="login-button primary"
              disabled={isLoading}
            >
              {isLoading ? 'Authenticating...' : '🔓 Log In with Passkey'}
            </button>
          ) : (
            <p className="no-passkeys">No passkeys registered</p>
          )}
          
          <button 
            onClick={() => {
              setShowRegistration(true);
              setError('');
            }}
            className="register-button secondary"
            disabled={isLoading}
          >
            ➕ Register New Passkey
          </button>
        </div>

        {/* Debug panel for development */}
        <div className="debug-section">
          <button 
            onClick={() => setShowDebug(!showDebug)}
            className="debug-toggle"
          >
            {showDebug ? 'Hide Debug' : 'Show Debug'}
          </button>
          
          {showDebug && (
            <div className="debug-panel">
              <h3>Registered Passkeys</h3>
              <p>Current state: isAuthenticated = {isAuthenticated ? 'true' : 'false'}</p>
              <p>Loading state: {isLoading ? 'true' : 'false'}</p>
              {getRegisteredUsers().map(user => (
                <div key={user.userId} className="user-item">
                  <span>
                    {user.userDisplayName} ({user.isMaster ? 'Master' : 'User'})
                  </span>
                  <button 
                    onClick={() => handleDeleteUser(user.userId)}
                    className="delete-button"
                  >
                    Delete
                  </button>
                </div>
              ))}
              
              <button 
                onClick={handleResetAll}
                className="reset-button"
              >
                Reset All
              </button>
              
              <button 
                onClick={() => {
                  localStorage.removeItem('web3fighters_user');
                  alert('User data cleared. Refresh the page.');
                }}
                className="reset-button"
                style={{ marginTop: '0.5rem' }}
              >
                Clear User Data
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 