import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, get, child, Database } from 'firebase/database';
import { Debate } from '../types';
import { PASSKEYS } from '../types';
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
      // Prima controlla Firebase se disponibile
      if (database) {
        const deviceId = getDeviceId();
        const voteRef = ref(database, `votes/${deviceId}/${debateId}`);
        const snapshot = await get(voteRef);
        
        if (snapshot.exists()) {
          return true;
        }
      }
      
      // Fallback: controlla localStorage
      const deviceId = getDeviceId();
      const storedUser = localStorage.getItem('web3_fighters_user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          if (userData.id === `user_${deviceId}` && userData.votedDebates[debateId]) {
            return true;
          }
        } catch (error) {
          console.error('Errore nel parsing dei dati utente locali:', error);
        }
      }
      
      return false;
    } catch (error) {
      console.error('Errore nel controllo voto esistente:', error);
      return false; // In caso di errore, permetti il voto
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
          // Prima settiamo l'autenticazione globale
          await set(ref(database, '_auth'), {
            passkey: PASSKEYS.USER,
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
        setTimeout(() => reject(new Error('Timeout nell\'invio del voto')), this.connectionTimeout);
      });
      
      // Attendiamo il completamento dell'operazione o il timeout
      return await Promise.race([votePromise, timeoutPromise]) as Debate[];
    } catch (error) {
      console.error('Errore nell\'invio del voto:', error);
      
      // In produzione, simuliamo il successo per non bloccare l'utente
      if (this.isProduction) {
        console.log('Simulazione di voto riuscito in ambiente di produzione');
        return [];
      }
      
      throw error;
    }
  }
  
  /**
   * Sincronizza i dati (ora solo interno a Firebase, senza IPFS)
   * @param uploadJSON Funzione per caricare JSON (ora opzionale)
   */
  static async syncWithIPFS(uploadJSON?: (json: any) => Promise<string>) {
    console.log('Sincronizzazione IPFS rimossa - usando solo Firebase Database');
    // Non facciamo più nulla qui, i dati sono già sincronizzati via Firebase Real-time Database
  }
  
  /**
   * Carica i dati iniziali (ora gestito automaticamente da Firebase)
   * @param getJSON Funzione per ottenere JSON (ora opzionale)
   */
  static async initializeFromIPFS(getJSON?: (ipfsHash: string) => Promise<any>) {
    console.log('Inizializzazione da IPFS rimossa - usando solo Firebase Database');
    // Non facciamo più nulla qui, Firebase Database gestisce tutto automaticamente
  }
} 