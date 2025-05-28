import { useState, useEffect } from 'react';
import { 
  PASSKEYS, 
  User, 
  USER_STORAGE_KEY, 
  MIN_VOTE_INTERVAL 
} from '../types';
import { getDeviceId } from '../utils/deviceId';

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
    // Usa l'ID dispositivo persistente invece di generare un nuovo UUID
    const deviceId = getDeviceId();
    
    if (passkey === PASSKEYS.MASTER) {
      // Login come master
      const newUser: User = {
        id: `master_${deviceId}`, // ID basato sul dispositivo
        isMaster: true,
        votedDebates: {}
      };
      
      setUser(newUser);
      setIsAuthenticated(true);
      setIsMaster(true);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
      return true;
    } else if (passkey === PASSKEYS.USER) {
      // Login come utente normale - carica i voti precedenti se esistono
      const existingUserData = localStorage.getItem(USER_STORAGE_KEY);
      let votedDebates = {};
      
      if (existingUserData) {
        try {
          const parsed = JSON.parse(existingUserData);
          // Mantiene i voti precedenti solo se è lo stesso dispositivo
          if (parsed.id === `user_${deviceId}`) {
            votedDebates = parsed.votedDebates || {};
          }
        } catch (error) {
          console.error('Errore nel parsing dei dati utente esistenti:', error);
        }
      }
      
      const newUser: User = {
        id: `user_${deviceId}`, // ID basato sul dispositivo
        isMaster: false,
        votedDebates // Mantiene i voti precedenti
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