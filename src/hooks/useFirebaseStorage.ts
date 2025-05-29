import { useState } from 'react';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getApps, getApp, initializeApp } from 'firebase/app';

// Configurazione Firebase (riutilizza l'app se già inizializzata)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

// Lista di immagini placeholder per i fighters
const FIGHTER_PLACEHOLDERS = [
  'https://via.placeholder.com/300x300/FF6B6B/FFFFFF?text=Fighter+1',
  'https://via.placeholder.com/300x300/4ECDC4/FFFFFF?text=Fighter+2',
  'https://via.placeholder.com/300x300/45B7D1/FFFFFF?text=Fighter+3',
  'https://via.placeholder.com/300x300/96CEB4/FFFFFF?text=Fighter+4',
  'https://via.placeholder.com/300x300/FFEAA7/000000?text=Fighter+5',
  'https://via.placeholder.com/300x300/DDA0DD/FFFFFF?text=Fighter+6',
  'https://via.placeholder.com/300x300/98D8C8/FFFFFF?text=Fighter+7',
  'https://via.placeholder.com/300x300/F7DC6F/000000?text=Fighter+8'
];

// Inizializza Firebase Storage riutilizzando l'app esistente se presente
let storage: any;
let storageError: string | null = null;

try {
  // Controlla se Firebase è già inizializzato
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  storage = getStorage(app);
} catch (error) {
  console.error('Errore nell\'inizializzazione di Firebase Storage:', error);
  storageError = 'Firebase Storage non configurato';
}

interface UseFirebaseStorageReturn {
  uploadImage: (file: File) => Promise<string>;
  uploadJSON: (json: any) => Promise<string>;
  getJSON: (path: string) => Promise<any>;
  isLoading: boolean;
  error: string | null;
}

export const useFirebaseStorage = (): UseFirebaseStorageReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRandomPlaceholder = (): string => {
    const randomIndex = Math.floor(Math.random() * FIGHTER_PLACEHOLDERS.length);
    return FIGHTER_PLACEHOLDERS[randomIndex];
  };

  const uploadImage = async (file: File): Promise<string> => {
    try {
      setIsLoading(true);
      setError(null);

      // Se Storage non è configurato, usa immediatamente placeholder
      if (!storage || storageError) {
        console.log('Firebase Storage non disponibile:', storageError || 'Storage non inizializzato');
        await new Promise(resolve => setTimeout(resolve, 800)); // Simula upload
        const placeholderUrl = getRandomPlaceholder();
        console.log('Usando immagine placeholder:', placeholderUrl);
        return placeholderUrl;
      }

      // Crea un nome file unico
      const fileName = `fighters/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, fileName);

      // Timeout per l'upload (5 secondi)
      const uploadPromise = uploadBytes(storageRef, file);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Upload timeout')), 5000)
      );

      // Prova l'upload con timeout
      const snapshot = await Promise.race([uploadPromise, timeoutPromise]) as any;
      
      // Ottieni l'URL di download
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      console.log('✅ Immagine caricata su Firebase Storage:', downloadURL);
      return downloadURL;
    } catch (err: any) {
      console.error('❌ Errore nell\'upload dell\'immagine:', err);
      
      // Gestisci specifici errori
      if (err.message?.includes('CORS') || err.message?.includes('blocked')) {
        setError('Errore CORS - Firebase Storage non configurato correttamente');
        console.log('🚨 CORS Error rilevato, usa: firebase deploy --only storage');
      } else if (err.message?.includes('timeout')) {
        setError('Timeout nell\'upload - connessione lenta');
      } else if (err.code === 'storage/unauthorized') {
        setError('Firebase Storage non autorizzato - controlla le regole');
      } else {
        setError('Errore nell\'upload dell\'immagine');
      }
      
      // Fallback con placeholder colorato
      const placeholderUrl = getRandomPlaceholder();
      console.log('🎨 Fallback con placeholder:', placeholderUrl);
      return placeholderUrl;
    } finally {
      setIsLoading(false);
    }
  };

  const uploadJSON = async (json: any): Promise<string> => {
    try {
      setIsLoading(true);
      setError(null);

      if (!storage || storageError) {
        console.log('Firebase Storage non disponibile per JSON, usando mock ID');
        await new Promise(resolve => setTimeout(resolve, 300)); // Simula upload
        return 'mock_json_id';
      }

      // Crea un nome file unico per il JSON
      const fileName = `data/debates_${Date.now()}.json`;
      const storageRef = ref(storage, fileName);
      
      // Converti JSON in Blob
      const jsonBlob = new Blob([JSON.stringify(json)], { type: 'application/json' });
      
      // Upload del JSON con timeout
      const uploadPromise = uploadBytes(storageRef, jsonBlob);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('JSON upload timeout')), 5000)
      );
      
      await Promise.race([uploadPromise, timeoutPromise]);
      
      console.log('✅ JSON caricato su Firebase Storage:', fileName);
      return fileName;
    } catch (err) {
      console.error('❌ Errore nell\'upload del JSON:', err);
      setError('Errore nell\'upload del JSON');
      return 'mock_json_id';
    } finally {
      setIsLoading(false);
    }
  };

  const getJSON = async (path: string): Promise<any> => {
    try {
      setIsLoading(true);
      setError(null);

      if (!storage || path === 'mock_json_id' || storageError) {
        console.log('Restituendo dati mock per JSON');
        await new Promise(resolve => setTimeout(resolve, 200));
        return { debates: [] };
      }

      const storageRef = ref(storage, path);
      const url = await getDownloadURL(storageRef);
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('✅ JSON recuperato da Firebase Storage');
      return data;
    } catch (err) {
      console.error('❌ Errore nel recupero del JSON:', err);
      setError('Errore nel recupero del JSON');
      return { debates: [] };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    uploadImage,
    uploadJSON,
    getJSON,
    isLoading,
    error
  };
}; 