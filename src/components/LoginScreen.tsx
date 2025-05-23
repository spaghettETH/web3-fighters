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
      setError('Per favore, inserisci una passkey');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const isSuccess = onLogin(passkey);
      
      if (!isSuccess) {
        setError('Passkey non valida. Riprova.');
        setIsLoading(false);
      }
      // Se l'accesso ha successo, non facciamo nulla qui
      // L'App.tsx si occuperà di cambiare la vista automaticamente
      // quando isAuthenticated diventerà true
    } catch (error) {
      console.error('Errore durante il login:', error);
      setError('Si è verificato un errore durante l\'accesso. Riprova.');
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
        <p className="subtitle">Accedi per votare i tuoi fighter preferiti!</p>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="passkey">Passkey</label>
            <input
              type="password"
              id="passkey"
              value={passkey}
              onChange={(e) => setPasskey(e.target.value)}
              placeholder="Inserisci la passkey"
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
            {isLoading ? 'Accesso in corso...' : 'Accedi'}
          </button>
        </form>
        
        <div className="login-footer">
          <p>
            Non hai una passkey? Contatta gli organizzatori dell'evento per ottenerne una.
          </p>
        </div>
      </div>
    </div>
  );
}; 