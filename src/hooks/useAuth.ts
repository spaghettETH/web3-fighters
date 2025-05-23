import { useState, useEffect } from 'react';
import { 
  PASSKEYS, 
  User, 
  USER_STORAGE_KEY, 
  MIN_VOTE_INTERVAL 
} from '../types';
import { v4 as uuidv4 } from 'uuid';

interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isMaster: boolean;
  login: (passkey: string) => boolean;
  logout: () => void;
  checkCanVote: (debateId: number) => boolean;
  registerVote: (debateId: number, fighterId: number) => void;
  getUserId: () => string | null;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMaster, setIsMaster] = useState(false);

  // Carica l'utente dal localStorage all'avvio
  useEffect(() => {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser) as User;
        setUser(userData);
        setIsAuthenticated(true);
        setIsMaster(userData.isMaster);
      } catch (error) {
        console.error('Errore nel parsing dei dati utente:', error);
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    }
  }, []);

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

  // Login con passkey
  const login = (passkey: string): boolean => {
    if (passkey === PASSKEYS.MASTER) {
      // Login come master
      const newUser: User = {
        id: uuidv4(), // Genera un ID univoco
        isMaster: true,
        votedDebates: {}
      };
      
      setUser(newUser);
      setIsAuthenticated(true);
      setIsMaster(true);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
      return true;
    } else if (passkey === PASSKEYS.USER) {
      // Login come utente normale
      const newUser: User = {
        id: uuidv4(), // Genera un ID univoco
        isMaster: false,
        votedDebates: {}
      };
      
      setUser(newUser);
      setIsAuthenticated(true);
      setIsMaster(false);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
      return true;
    }
    
    return false;
  };

  // Logout
  const logout = (): void => {
    setUser(null);
    setIsAuthenticated(false);
    setIsMaster(false);
    localStorage.removeItem(USER_STORAGE_KEY);
  };

  // Ottieni l'ID dell'utente
  const getUserId = (): string | null => {
    return user?.id || null;
  };

  return {
    user,
    isAuthenticated,
    isMaster,
    login,
    logout,
    checkCanVote,
    registerVote,
    getUserId
  };
}; 