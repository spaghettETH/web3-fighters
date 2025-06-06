import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, get, child, Database } from 'firebase/database';
import { Debate } from '../types';
import { getDeviceId } from '../utils/deviceId';

// Configurazione Firebase - Da sostituire con le tue credenziali
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

// Token di accesso per Firebase (sostituisce le PASSKEYS testuali)
const FIREBASE_ACCESS_TOKEN = import.meta.env.VITE_FIREBASE_ACCESS_TOKEN || 'web3fighters_access_2024';

// Initialize Firebase con gestione degli errori
let app;
let database: Database | undefined;

try {
  app = initializeApp(firebaseConfig);
  database = getDatabase(app);
} catch (error) {
  console.error('Errore nell\'inizializzazione di Firebase:', error);
}

// Riferimento ai dibattiti nel database
const getDebatesRef = () => {
  try {
    if (!database) return null;
    return ref(database, 'debates');
  } catch (error) {
    console.error('Errore nell\'ottenere il riferimento ai dibattiti:', error);
    return null;
  }
};

/**
 * Classe per gestire la comunicazione con Firebase
 */
export class FirebaseService {
  static ipfsLastSyncTime: number = 0;
  static isProduction: boolean = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  static connectionTimeout: number = 5000; // 5 secondi di timeout per le connessioni
  
  /**
   * Verifica se un dispositivo ha già votato per un dibattito
   * @param debateId ID del dibattito
   * @returns true se il dispositivo ha già votato, false altrimenti
   */
  static async hasDeviceVoted(debateId: number): Promise<boolean> {
    try {
      const deviceId = getDeviceId();
      console.log('🔍 Checking if device has voted:', { deviceId, debateId });
      
      // Prima controlla localStorage (più affidabile)
      const storedUser = localStorage.getItem('web3fighters_user');
      console.log('📱 localStorage data:', storedUser);
      
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          console.log('👤 Parsed user data:', userData);
          console.log('🗳️ User votedDebates:', userData.votedDebates);
          
          if (userData.id && userData.votedDebates[debateId]) {
            console.log('❌ Found vote in localStorage for debate:', debateId);
            console.log('📊 Vote details:', userData.votedDebates[debateId]);
            return true;
          }
        } catch (error) {
          console.error('Errore nel parsing dei dati utente locali:', error);
        }
      }
      
      // Poi controlla Firebase se disponibile, ma gestisci gli errori senza bloccare
      if (database) {
        try {
          const voteRef = ref(database, `votes/${deviceId}/${debateId}`);
          console.log('🔥 Checking Firebase path:', `votes/${deviceId}/${debateId}`);
          const snapshot = await get(voteRef);
          
          if (snapshot.exists()) {
            console.log('❌ Found vote in Firebase:', snapshot.val());
            return true;
          } else {
            console.log('✅ No vote found in Firebase');
          }
        } catch (firebaseError) {
          console.warn('⚠️ Error checking Firebase votes (will proceed with local check):', firebaseError);
          // Non bloccare il voto se Firebase ha problemi di lettura
        }
      }
      
      console.log('✅ No vote found anywhere, user can vote');
      return false;
    } catch (error) {
      console.error('Errore nel controllo voto esistente:', error);
      // In caso di errore, permetti il voto (meglio permettere un voto extra che bloccare completamente)
      return false;
    }
  }
  
  /**
   * Registra un voto nella collezione votes di Firebase
   * @param debateId ID del dibattito
   * @param fighterId ID del fighter votato
   */
  static async recordVote(debateId: number, fighterId: number): Promise<void> {
    try {
      if (!database) {
        console.error('Firebase non inizializzato');
        return;
      }

      const deviceId = getDeviceId();
      const voteData = {
        deviceId,
        debateId,
        fighterId,
        timestamp: Date.now()
      };

      // L'autenticazione è già stata impostata da sendVote, quindi possiamo scrivere direttamente
      await set(ref(database, `votes/${deviceId}/${debateId}`), voteData);
      
    } catch (error) {
      console.error('Errore nella registrazione del voto:', error);
    }
  }
  
  /**
   * Inizializza i listener in tempo reale
   * @param onDebatesUpdate Callback da chiamare quando ci sono aggiornamenti
   */
  static initializeRealtimeListeners(onDebatesUpdate: (debates: Debate[]) => void) {
    try {
      // Verifica se Firebase è stato inizializzato correttamente
      if (!database) {
        console.error('Firebase non inizializzato correttamente, utilizzo dati locali');
        onDebatesUpdate([]);
        return;
      }
      
      const debatesRef = getDebatesRef();
      if (!debatesRef) {
        console.error('Impossibile ottenere riferimento ai dibattiti, utilizzo dati locali');
        onDebatesUpdate([]);
        return;
      }
      
      // Impostiamo un timeout per gestire problemi di connessione
      const timeoutId = setTimeout(() => {
        console.warn('Timeout nella connessione a Firebase, utilizzo dati locali');
        onDebatesUpdate([]);
      }, this.connectionTimeout);
      
      onValue(debatesRef, (snapshot) => {
        // Connessione completata con successo, annulla il timeout
        clearTimeout(timeoutId);
        
        const data = snapshot.val();
        if (data) {
          const debates = Object.values(data) as Debate[];
          onDebatesUpdate(debates);
        } else {
          console.log('Nessun dato trovato in Firebase, inizializzazione con dati locali');
          onDebatesUpdate([]);
        }
      }, (error) => {
        clearTimeout(timeoutId);
        console.error('Errore nella connessione Firebase:', error);
        onDebatesUpdate([]);
      });
    } catch (error) {
      console.error('Errore nell\'inizializzazione dei listener Firebase:', error);
      onDebatesUpdate([]);
    }
  }
  
  /**
   * Invia un voto al server
   * @param debateId ID del dibattito
   * @param fighter1Votes Voti per il fighter 1
   * @param fighter2Votes Voti per il fighter 2
   * @param fighterId ID del fighter votato (1 o 2)
   */
  static async sendVote(debateId: number, fighter1Votes: number, fighter2Votes: number, fighterId: number = 0) {
    try {
      // Prima verifica se questo dispositivo ha già votato
      const hasVoted = await this.hasDeviceVoted(debateId);
      if (hasVoted) {
        throw new Error('Questo dispositivo ha già votato per questo dibattito');
      }
      
      if (!database) {
        throw new Error('Firebase non inizializzato correttamente');
      }
      
      const debatesRef = getDebatesRef();
      if (!debatesRef) {
        throw new Error('Impossibile ottenere riferimento ai dibattiti');
      }
      
      // Imposta un timeout per l'operazione
      const votePromise = new Promise(async (resolve, reject) => {
        try {
          // Prima settiamo l'autenticazione globale con il token di accesso
          await set(ref(database, '_auth'), {
            accessToken: FIREBASE_ACCESS_TOKEN,
            timestamp: Date.now()
          });

          // Poi otteniamo lo stato attuale
          const snapshot = await get(debatesRef);
          const data = snapshot.val() || {};
          const debates = Object.values(data) as Debate[];
          
          // Troviamo il dibattito e aggiorniamo i voti
          const updatedDebates = debates.map(debate => {
            if (debate.id === debateId) {
              return {
                ...debate,
                fighter1: {
                  ...debate.fighter1,
                  votes: debate.fighter1.votes + fighter1Votes
                },
                fighter2: {
                  ...debate.fighter2,
                  votes: debate.fighter2.votes + fighter2Votes
                },
                totalVotes: debate.totalVotes + fighter1Votes + fighter2Votes
              };
            }
            return debate;
          });
          
          // Salviamo in formato oggetto per Firebase (senza _auth interno)
          const debatesObject = updatedDebates.reduce((acc, debate) => {
            acc[debate.id] = debate;
            return acc;
          }, {} as Record<number, Debate>);
          
          // Salviamo su Firebase
          await set(debatesRef, debatesObject);
          
          // Registra il voto nella collezione votes
          if (fighterId > 0) {
            await this.recordVote(debateId, fighterId);
          }
          
          // Rimuoviamo l'autenticazione
          await set(ref(database, '_auth'), null);
          
          resolve(updatedDebates);
        } catch (error) {
          reject(error);
        }
      });
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout: operazione di voto troppo lenta')), 10000);
      });
      
      return await Promise.race([votePromise, timeoutPromise]);
    } catch (error) {
      console.error('Errore nell\'invio del voto:', error);
      throw error;
    }
  }

  /**
   * Funzione per autorizzare operazioni master (per creazione/modifica dibattiti)
   */
  static async setMasterAuth(): Promise<void> {
    try {
      if (!database) {
        throw new Error('Firebase non inizializzato');
      }
      
      await set(ref(database, '_auth'), {
        accessToken: FIREBASE_ACCESS_TOKEN,
        isMaster: true,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Errore nell\'impostazione autorizzazione master:', error);
      throw error;
    }
  }

  /**
   * Funzione per rimuovere l'autorizzazione
   */
  static async clearAuth(): Promise<void> {
    try {
      if (!database) return;
      await set(ref(database, '_auth'), null);
    } catch (error) {
      console.error('Errore nella rimozione autorizzazione:', error);
    }
  }

  /**
   * Sincronizza i dibattiti con IPFS (solo per master)
   * @param uploadJSON Funzione per caricare JSON su IPFS
   */
  static async syncWithIPFS(uploadJSON?: (json: any) => Promise<string>) {
    // Implementazione per la sincronizzazione IPFS se necessaria
    console.log('Sincronizzazione IPFS non implementata in questa versione');
  }

  /**
   * Inizializza da IPFS (fallback se Firebase non è disponibile)
   * @param getJSON Funzione per recuperare JSON da IPFS
   */
  static async initializeFromIPFS(getJSON?: (ipfsHash: string) => Promise<any>) {
    // Implementazione per l'inizializzazione da IPFS se necessaria
    console.log('Inizializzazione IPFS non implementata in questa versione');
    return [];
  }
} 