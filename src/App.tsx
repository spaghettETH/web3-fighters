import { useState, useEffect } from 'react';
import { QuadraticVoting } from './components/QuadraticVoting';
import { LoginScreen } from './components/LoginScreen';
import { useAuth } from './hooks/useAuth';
import Preloader from './components/Preloader';
import './App.css';

function App() {
  const { isAuthenticated, login, logout, isMaster, getUserId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');

  useEffect(() => {
    // Show preloader briefly to give visual feedback
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800); // Reduced from 1500ms to 800ms
    
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = (passkey: string): boolean => {
    // Set loading to true during login to avoid flickering
    setLoading(true);
    setLoadingMessage('Accessing...');
    
    const result = login(passkey);
    
    // If login fails, remove loading
    if (!result) {
      setLoading(false);
    } else {
      // If login succeeds, change message and remove loading after brief delay
      setLoadingMessage('Loading debates...');
      setTimeout(() => {
        setLoading(false);
      }, 300);
    }
    
    return result;
  };

  const handleLogout = () => {
    logout();
  };

  // Show preloader during initial loading or while logging in
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
