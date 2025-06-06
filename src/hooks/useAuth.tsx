import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { 
  User, 
  USER_STORAGE_KEY, 
  MIN_VOTE_INTERVAL 
} from '../types';
import { getDeviceId } from '../utils/deviceId';
import { WebAuthnService, UserCredentials } from '../services/webauthn';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isMaster: boolean;
  webauthnSupported: boolean;
  hasRegisteredPasskeys: boolean;
  registerPasskey: (userDisplayName: string, isMaster?: boolean) => Promise<{ success: boolean; error?: string }>;
  authenticateWithPasskey: () => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  checkCanVote: (debateId: number) => boolean;
  registerVote: (debateId: number, fighterId: number) => void;
  getUserId: () => string | null;
  getUserDisplayName: () => string | null;
  getRegisteredUsers: () => UserCredentials[];
  deleteUser: (userId: string) => boolean;
  resetAllUsers: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMaster, setIsMaster] = useState(false);
  const [webauthnSupported] = useState(WebAuthnService.isSupported());
  const [hasRegisteredPasskeys, setHasRegisteredPasskeys] = useState(false);

  // Verifica passkeys registrate
  const checkRegisteredPasskeys = () => {
    const registeredUsers = WebAuthnService.getRegisteredUsers();
    setHasRegisteredPasskeys(registeredUsers.length > 0);
  };

  // Carica l'utente dal localStorage all'avvio
  useEffect(() => {
    console.log('AuthProvider: Initializing...');
    checkRegisteredPasskeys();
    
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser) as User;
        console.log('AuthProvider: Found stored user, setting authenticated state');
        setUser(userData);
        setIsAuthenticated(true);
        setIsMaster(userData.isMaster);
      } catch (error) {
        console.error('Errore nel parsing dei dati utente:', error);
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    }
  }, []);

  // Log state changes
  useEffect(() => {
    console.log('AuthProvider: State changed - isAuthenticated:', isAuthenticated, 'user:', user?.displayName);
  }, [isAuthenticated, user]);

  // Verifica se l'utente ha già votato per un dibattito
  const checkCanVote = (debateId: number): boolean => {
    if (!user) return false;

    // Verifica se l'utente ha già votato per questo dibattito
    if (user.votedDebates[debateId]) {
      return false;
    }

    // Verifica se è passato abbastanza tempo dall'ultimo voto (anti-spam)
    if (user.lastVoteTime) {
      const now = Date.now();
      if (now - user.lastVoteTime < MIN_VOTE_INTERVAL) {
        return false;
      }
    }

    return true;
  };

  // Registra un voto dell'utente
  const registerVote = (debateId: number, fighterId: number): void => {
    if (!user) return;

    const now = Date.now();
    const updatedUser: User = {
      ...user,
      lastVoteTime: now,
      votedDebates: {
        ...user.votedDebates,
        [debateId]: {
          timestamp: now,
          fighterId
        }
      }
    };

    setUser(updatedUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
  };

  // Registra nuova passkey
  const registerPasskey = async (
    displayName: string, 
    isMaster: boolean = false
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('AuthProvider: Starting registration for:', displayName, 'isMaster:', isMaster);
      const result = await WebAuthnService.registerPasskey(displayName, isMaster);
      
      if (result.success && result.userId) {
        console.log('AuthProvider: WebAuthn registration successful for userId:', result.userId);
        
        const deviceId = getDeviceId();
        
        // Crea l'utente nel formato dell'app
        const newUser: User = {
          id: `${isMaster ? 'master' : 'user'}_${deviceId}`,
          isMaster,
          votedDebates: {},
          webauthnUserId: result.userId,
          displayName
        };
        
        console.log('AuthProvider: Setting user state after registration:', newUser);
        setUser(newUser);
        
        console.log('AuthProvider: Setting isAuthenticated to true after registration');
        setIsAuthenticated(true);
        
        console.log('AuthProvider: Setting isMaster to:', isMaster);
        setIsMaster(isMaster);
        
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
        
        console.log('AuthProvider: Registration process completed successfully');
        return { success: true };
      } else {
        console.log('AuthProvider: WebAuthn registration failed:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('AuthProvider: Registration error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Errore nella registrazione' 
      };
    }
  };

  // Autentica con passkey
  const authenticateWithPasskey = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('AuthProvider: Starting authentication');
      const result = await WebAuthnService.authenticatePasskey();
      
      if (result.success && result.user) {
        console.log('AuthProvider: WebAuthn authentication successful, updating state...');
        
        const deviceId = getDeviceId();
        
        // Carica i voti precedenti se esistono per questo dispositivo
        const existingUserData = localStorage.getItem(USER_STORAGE_KEY);
        let votedDebates = {};
        
        if (existingUserData) {
          try {
            const parsed = JSON.parse(existingUserData);
            // Mantiene i voti precedenti solo se è lo stesso dispositivo
            if (parsed.id === `${result.user.isMaster ? 'master' : 'user'}_${deviceId}`) {
              votedDebates = parsed.votedDebates || {};
            }
          } catch (error) {
            console.error('Errore nel parsing dei dati utente esistenti:', error);
          }
        }
        
        // Crea l'utente nel formato dell'app
        const newUser: User = {
          id: `${result.user.isMaster ? 'master' : 'user'}_${deviceId}`,
          isMaster: result.user.isMaster,
          votedDebates,
          webauthnUserId: result.user.userId,
          displayName: result.user.userDisplayName
        };
        
        console.log('AuthProvider: Setting user state:', newUser);
        setUser(newUser);
        
        console.log('AuthProvider: Setting isAuthenticated to true');
        setIsAuthenticated(true);
        
        console.log('AuthProvider: Setting isMaster to:', result.user.isMaster);
        setIsMaster(result.user.isMaster);
        
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
        
        console.log('AuthProvider: Authentication process completed successfully');
        return { success: true };
      } else {
        console.log('AuthProvider: WebAuthn authentication failed:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('AuthProvider: Authentication error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Errore nell\'autenticazione' 
      };
    }
  };

  // Logout
  const logout = (): void => {
    console.log('AuthProvider: Logging out');
    setUser(null);
    setIsAuthenticated(false);
    setIsMaster(false);
    localStorage.removeItem(USER_STORAGE_KEY);
  };

  // Ottieni l'ID dell'utente
  const getUserId = (): string | null => {
    return user?.id || null;
  };

  // Ottieni il display name dell'utente
  const getUserDisplayName = (): string | null => {
    return user?.displayName || null;
  };

  // Ottieni utenti registrati (per admin/debug)
  const getRegisteredUsers = (): UserCredentials[] => {
    return WebAuthnService.getRegisteredUsers();
  };

  // Elimina un utente
  const deleteUser = (userId: string): boolean => {
    const result = WebAuthnService.deleteUser(userId);
    if (result) {
      checkRegisteredPasskeys();
    }
    return result;
  };

  // Reset tutti gli utenti (per sviluppo)
  const resetAllUsers = (): void => {
    WebAuthnService.resetAllUsers();
    checkRegisteredPasskeys();
    logout();
  };

  const contextValue: AuthContextType = {
    user,
    isAuthenticated,
    isMaster,
    webauthnSupported,
    hasRegisteredPasskeys,
    registerPasskey,
    authenticateWithPasskey,
    logout,
    checkCanVote,
    registerVote,
    getUserId,
    getUserDisplayName,
    getRegisteredUsers,
    deleteUser,
    resetAllUsers
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 