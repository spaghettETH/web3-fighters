export interface Fighter {
  id: number;
  name: string;
  imageUrl: string; // IPFS hash
  previewUrl?: string; // URL del gateway Pinata per la preview
  votes: number;
}

export interface Debate {
  id: number;
  title: string;
  fighter1: Fighter;
  fighter2: Fighter;
  status: 'PENDING' | 'VOTE' | 'CLOSED';
  totalVotes: number;
}

// Passkeys per l'autenticazione
export const PASSKEYS = {
  MASTER: 'bfethcc8master', // Permette di essere master ed editare i match
  USER: 'BFethcc8'          // Permette agli utenti di accedere all'app
};

// Interfaccia per l'utente autenticato
export interface User {
  id: string;      // ID univoco dell'utente (generato al login)
  isMaster: boolean; // Se l'utente è un master
  lastVoteTime?: number; // Timestamp dell'ultimo voto
  votedDebates: {    // Dibattiti per cui l'utente ha già votato
    [debateId: number]: {
      timestamp: number;   // Timestamp del voto
      fighterId: number;   // ID del fighter votato
    }
  };
}

// Chiave per salvare i dati utente nel localStorage
export const USER_STORAGE_KEY = 'web3fighters_user';

// Tempo minimo (in millisecondi) tra un voto e l'altro
export const MIN_VOTE_INTERVAL = 5000; // 5 secondi 