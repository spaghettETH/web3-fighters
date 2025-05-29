import { useState, useEffect } from 'react';
import { QuadraticVoting } from './components/QuadraticVoting';
import { LoginScreen } from './components/LoginScreen';
import { useAuth } from './hooks/useAuth';
import Preloader from './components/Preloader';
import './App.css';

function App() {
  const { isAuthenticated, login, logout, isMaster, getUserId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Inizializzazione...');

  useEffect(() => {
    // Facciamo apparire il preloader solo brevemente per dare un feedback visivo
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800); // Ridotto da 1500ms a 800ms
    
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = (passkey: string): boolean => {
    // Impostiamo loading a true durante il login per evitare flickering
    setLoading(true);
    setLoadingMessage('Accesso in corso...');
    
    const result = login(passkey);
    
    // Se il login fallisce, rimuoviamo il loading
    if (!result) {
      setLoading(false);
    } else {
      // Se il login ha successo, cambiamo il messaggio e rimuoviamo il loading dopo un breve delay
      setLoadingMessage('Caricamento dibattiti...');
      setTimeout(() => {
        setLoading(false);
      }, 300);
    }
    
    return result;
  };

  const handleLogout = () => {
    logout();
  };

  // Mostra il preloader durante il caricamento iniziale o mentre si fa login
  if (loading) {
    return <Preloader message={loadingMessage} />;
    }

  return (
    <div className="app">
      {!isAuthenticated ? (
        <LoginScreen onLogin={handleLogin} />
        ) : (
          <div className="app-container">
            <header className="app-header">
            <div className="user-info">User ID: {getUserId()?.slice(0, 8)}...</div>
              <div className="logo"></div>
            <div className="app-actions">
              <button onClick={handleLogout} className="logout-button">
                Logout
              </button>
              {isMaster && <span className="master-badge">Master</span>}
            </div>
            </header>
            <main>
              <QuadraticVoting />
            </main>
          </div>
        )}
    </div>
  );
}

export default App;
