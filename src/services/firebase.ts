import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, get, child, Database } from 'firebase/database';
import { Debate } from '../types';
import { IPFS_CONFIG } from '../config/ipfs';
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
   * Registra un voto nella collezione votes
   * @param debateId ID del dibattito
   * @param fighterId ID del fighter votato
   */
  static async recordVote(debateId: number, fighterId: number): Promise<void> {
    try {
      if (!database) {
        return;
      }
      
      const deviceId = getDeviceId();
      const voteData = {
        deviceId,
        debateId,
        fighterId,
        timestamp: Date.now()
      };
      
      // Crea un oggetto con i dati da salvare e l'autenticazione
      const dataToSave = {
        [`votes/${deviceId}/${debateId}`]: voteData,
        _auth: {
          passkey: PASSKEYS.USER,
          timestamp: Date.now()
        }
      };
      
      // Aggiorna solo i path necessari
      const rootRef = ref(database, '');
      await set(rootRef, dataToSave);
      
      // Rimuove il campo _auth
      await set(ref(database, '_auth'), null);
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
          // Prima otteniamo lo stato attuale
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
          
          // Salviamo in formato oggetto per Firebase
          const debatesObject = updatedDebates.reduce((acc, debate) => {
            acc[debate.id] = debate;
            return acc;
          }, {} as Record<number, Debate>);
          
          // Aggiungiamo l'oggetto _auth per soddisfare le regole di sicurezza
          const dataToSave = {
            ...debatesObject,
            _auth: {
              passkey: PASSKEYS.USER,
              timestamp: Date.now()
            }
          };
          
          // Salviamo su Firebase
          await set(debatesRef, dataToSave);
          
          // Registra il voto nella collezione votes
          if (fighterId > 0) {
            await this.recordVote(debateId, fighterId);
          }
          
          // Invece di usare delete, rimuoviamo _auth facendo un nuovo set senza quel campo
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
   * Sincronizza i dati tra Firebase e IPFS
   * @param uploadJSON Funzione per caricare JSON su IPFS
   */
  static async syncWithIPFS(uploadJSON: (json: any) => Promise<string>) {
    // Se siamo in produzione, simuliamo la sincronizzazione
    if (this.isProduction) {
      console.log('Sincronizzazione IPFS simulata in ambiente di produzione');
      return;
    }
    
    // Limita la sincronizzazione a una volta ogni 60 secondi
    const now = Date.now();
    if (now - this.ipfsLastSyncTime < 60000) {
      console.log('Sincronizzazione con IPFS saltata, troppo recente');
      return;
    }
    
    try {
      // Ottieni i dati attuali da Firebase
      if (!database) {
        throw new Error('Firebase non inizializzato correttamente');
      }
      
      const debatesRef = getDebatesRef();
      if (!debatesRef) {
        throw new Error('Impossibile ottenere riferimento ai dibattiti');
      }
      
      const snapshot = await get(debatesRef);
      const data = snapshot.val() || {};
      const debates = Object.values(data) as Debate[];
      
      if (debates.length === 0) {
        console.log('Nessun dibattito da sincronizzare con IPFS');
        return;
      }
      
      // Prepara i dati per IPFS (rimuovi campi non necessari)
      const debatesForIPFS = debates.map(debate => ({
        ...debate,
        fighter1: {
          id: debate.fighter1.id,
          name: debate.fighter1.name,
          imageUrl: debate.fighter1.imageUrl,
          votes: debate.fighter1.votes
        },
        fighter2: {
          id: debate.fighter2.id,
          name: debate.fighter2.name,
          imageUrl: debate.fighter2.imageUrl,
          votes: debate.fighter2.votes
        }
      }));
      
      // Carica su IPFS
      const hash = await uploadJSON({ debates: debatesForIPFS });
      IPFS_CONFIG.updateRootHash(hash);
      
      this.ipfsLastSyncTime = now;
      console.log('Sincronizzazione con IPFS completata, nuovo hash:', hash);
      
      // Salva su Firebase con l'autenticazione master
      if (debatesRef) {
        const debatesObject = debates.reduce((acc, debate) => {
          acc[debate.id] = debate;
          return acc;
        }, {} as Record<number, Debate>);
        
        const dataToSave = {
          ...debatesObject,
          _auth: {
            passkey: PASSKEYS.MASTER,
            timestamp: Date.now()
          }
        };
        
        await set(debatesRef, dataToSave);
        
        // Rimuovi il campo _auth dopo il salvataggio
        await set(ref(database!, '_auth'), null);
      }
    } catch (error) {
      console.error('Errore nella sincronizzazione con IPFS:', error);
    }
  }
  
  /**
   * Carica i dati iniziali da IPFS a Firebase
   * @param getJSON Funzione per ottenere JSON da IPFS
   */
  static async initializeFromIPFS(getJSON: (ipfsHash: string) => Promise<any>) {
    try {
      // Se siamo in produzione, simuliamo l'inizializzazione
      if (this.isProduction) {
        console.log('Inizializzazione da IPFS simulata in ambiente di produzione');
        return;
      }
      
      if (!database) {
        throw new Error('Firebase non inizializzato correttamente');
      }
      
      const debatesRef = getDebatesRef();
      if (!debatesRef) {
        throw new Error('Impossibile ottenere riferimento ai dibattiti');
      }
      
      // Verifica se ci sono già dati in Firebase
      const snapshot = await get(debatesRef);
      if (snapshot.exists()) {
        console.log('Database Firebase già inizializzato, salto il caricamento da IPFS');
        return;
      }
      
      // Ottieni i dati da IPFS
      const currentHash = IPFS_CONFIG.getRootHash();
      if (!currentHash) {
        console.log('Nessun hash IPFS, inizializzazione saltata');
        return;
      }
      
      const data = await getJSON(currentHash);
      if (!data || !data.debates || data.debates.length === 0) {
        console.log('Nessun dibattito trovato su IPFS');
        return;
      }
      
      // Converti in formato oggetto per Firebase
      const debatesObject = data.debates.reduce((acc: Record<string, any>, debate: Debate) => {
        acc[debate.id] = debate;
        return acc;
      }, {});
      
      // Aggiungiamo l'oggetto _auth per soddisfare le regole di sicurezza
      const dataToSave = {
        ...debatesObject,
        _auth: {
          passkey: PASSKEYS.MASTER,
          timestamp: Date.now()
        }
      };
      
      // Salva su Firebase
      await set(debatesRef, dataToSave);
      
      // Rimuovi il campo _auth dopo il salvataggio
      await set(ref(database, '_auth'), null);
      
      console.log('Database Firebase inizializzato da IPFS con successo');
    } catch (error) {
      console.error('Errore nell\'inizializzazione da IPFS:', error);
    }
  }
} 