import { useState } from 'react';
import './LoginScreen.css';

interface LoginScreenProps {
  onLogin: (passkey: string) => boolean;
}

export const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const [passkey, setPasskey] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passkey.trim()) {
      setError('Please type passkey');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const isSuccess = onLogin(passkey);
      
      if (!isSuccess) {
        setError('Passkey not valid. Retry.');
        setIsLoading(false);
      }
      // If login succeeds, we don't do anything here
      // App.tsx will handle changing the view automatically
      // when isAuthenticated becomes true
    } catch (error) {
      console.error('Error while login:', error);
      setError('Error during login. Retry.');
      setIsLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-container">
        <div className="logo-wrapper">
          <img src="/assets/logoTotal.png" alt="BlockFighters Logo" className="logo-total" />
        </div>
        
        <h1>Web3 Fighters</h1>
        <p className="subtitle">Login to vote for your favorite fighters!</p>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="passkey">Passkey</label>
            <input
              type="password"
              id="passkey"
              value={passkey}
              onChange={(e) => setPasskey(e.target.value)}
              placeholder="Type your passkey"
              disabled={isLoading}
              autoFocus
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button 
            type="submit" 
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? 'Loggin in...' : 'Log in'}
          </button>
        </form>
        
        <div className="login-footer">
          <p>
            No passkey? Contact organizers to get one.
          </p>
        </div>
      </div>
    </div>
  );
}; 