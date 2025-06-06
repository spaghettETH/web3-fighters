import { useState, useEffect } from 'react';
import { QuadraticVoting } from './components/QuadraticVoting';
import { LoginScreen } from './components/LoginScreen';
import { useAuth, AuthProvider } from './hooks/useAuth';
import Preloader from './components/Preloader';
import './App.css';

function AppContent() {
  const { isAuthenticated, logout, isMaster, getUserDisplayName } = useAuth();
  const [loading, setLoading] = useState(true);

  // Log every render to see current state
  useEffect(() => {
    console.log('App render - isAuthenticated:', isAuthenticated, 'loading:', loading);
  });

  useEffect(() => {
    // Show preloader briefly to give visual feedback
    const timer = setTimeout(() => {
      console.log('App: Preloader timeout finished, setting loading to false');
      setLoading(false);
    }, 800);
    
    return () => clearTimeout(timer);
  }, []);

  // If user becomes authenticated, stop loading immediately
  useEffect(() => {
    console.log('App: useEffect for isAuthenticated triggered, value:', isAuthenticated);
    if (isAuthenticated) {
      console.log('App: User authenticated, stopping preloader');
      setLoading(false);
    }
  }, [isAuthenticated]);

  const handleLogout = () => {
    logout();
  };

  // Show preloader during initial loading (but not if user is already authenticated)
  if (loading && !isAuthenticated) {
    console.log('App: Showing preloader');
    return <Preloader message="Initializing..." />;
  }

  console.log('App: Deciding what to render - isAuthenticated:', isAuthenticated);

  if (!isAuthenticated) {
    console.log('App: Rendering LoginScreen');
    return (
      <div className="app">
        <LoginScreen />
      </div>
    );
  }

  console.log('App: Rendering main app');
  return (
    <div className="app">
      <div className="app-container">
        <header className="app-header">
          <div className="user-info">
            {getUserDisplayName() ? (
              <span>Ciao, {getUserDisplayName()}</span>
            ) : (
              <span>Utente autenticato</span>
            )}
          </div>
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
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
