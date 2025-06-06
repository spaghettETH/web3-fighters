import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from '@simplewebauthn/browser';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser';

export interface PasskeyCredential {
  id: string;
  publicKey: string;
  counter: number;
  deviceType: 'singleDevice' | 'multiDevice';
  backedUp: boolean;
  userDisplayName: string;
  createdAt: number;
}

export interface UserCredentials {
  userId: string;
  userDisplayName: string;
  credentials: PasskeyCredential[];
  isMaster: boolean;
  lastUsedAt: number;
}

const STORAGE_KEY = 'web3_fighters_webauthn_users';
const RP_NAME = 'Web3 Fighters';
const RP_ID = window.location.hostname;

export class WebAuthnService {
  // Verifica se WebAuthn è supportato
  static isSupported(): boolean {
    console.log('Checking WebAuthn support...');
    
    // Controlli più dettagliati per il supporto
    const hasWebAuthn = window.PublicKeyCredential !== undefined;
    const hasCredentialsAPI = navigator.credentials !== undefined;
    const isSecureContext = window.isSecureContext;
    
    console.log('WebAuthn checks:', {
      hasWebAuthn,
      hasCredentialsAPI, 
      isSecureContext,
      userAgent: navigator.userAgent,
      hostname: window.location.hostname,
      protocol: window.location.protocol
    });
    
    // Per sviluppo locale, permetti anche localhost su HTTP
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';
    
    if (!isSecureContext && !isLocalhost) {
      console.warn('WebAuthn requires HTTPS connection');
      return false;
    }
    
    if (!hasWebAuthn || !hasCredentialsAPI) {
      console.warn('WebAuthn APIs not available');
      return false;
    }
    
    // Usa anche il controllo della libreria SimpleWebAuthn come fallback
    const simpleWebAuthnCheck = browserSupportsWebAuthn();
    console.log('SimpleWebAuthn library check:', simpleWebAuthnCheck);
    
    return hasWebAuthn && hasCredentialsAPI && (isSecureContext || isLocalhost);
  }

  // Genera challenge casuale
  private static generateChallenge(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Ottieni tutti gli utenti registrati
  private static getStoredUsers(): UserCredentials[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Errore nel leggere utenti:', error);
      return [];
    }
  }

  // Salva utenti nel localStorage
  private static saveUsers(users: UserCredentials[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    } catch (error) {
      console.error('Errore nel salvare utenti:', error);
    }
  }

  // Trova utente per ID
  private static findUser(userId: string): UserCredentials | undefined {
    const users = this.getStoredUsers();
    return users.find(user => user.userId === userId);
  }

  // Registra una nuova passkey
  static async registerPasskey(
    userDisplayName: string, 
    isMaster: boolean = false
  ): Promise<{ success: boolean; userId?: string; error?: string }> {
    try {
      console.log('Starting WebAuthn registration for:', userDisplayName, 'isMaster:', isMaster);
      
      if (!this.isSupported()) {
        return { success: false, error: 'WebAuthn non è supportato in questo browser' };
      }

      const userId = crypto.randomUUID();
      const challenge = this.generateChallenge();
      
      console.log('Generated userId and challenge for registration');

      // Opzioni di registrazione nel formato corretto per SimpleWebAuthn
      const optionsJSON: PublicKeyCredentialCreationOptionsJSON = {
        rp: {
          name: RP_NAME,
          id: RP_ID,
        },
        user: {
          id: userId,
          name: userDisplayName,
          displayName: userDisplayName,
        },
        challenge,
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },   // ES256
          { alg: -257, type: 'public-key' }, // RS256
          { alg: -37, type: 'public-key' },  // PS256 - aggiunto per maggiore compatibilità
        ],
        timeout: 60000,
        attestation: 'none', // Cambiato da 'direct' a 'none' per compatibilità
        authenticatorSelection: {
          // Rimosso authenticatorAttachment per permettere sia platform che cross-platform
          userVerification: 'preferred', // Cambiato da 'required' a 'preferred'
          residentKey: 'preferred',
          requireResidentKey: false, // Aggiunto esplicitamente
        },
      };

      console.log('Starting registration with options:', { rpName: RP_NAME, rpId: RP_ID, userDisplayName });

      // Avvia registrazione
      const attResp = await startRegistration({ optionsJSON });
      console.log('Registration response received:', attResp.id);

      // Simula validazione del server (in produzione dovresti validare sul server)
      const credential: PasskeyCredential = {
        id: attResp.id,
        publicKey: attResp.response.publicKey!,
        counter: 0, // SimpleWebAuthn non fornisce direttamente il counter
        deviceType: 'singleDevice', // Assumiamo single device per platform authenticator
        backedUp: false,
        userDisplayName,
        createdAt: Date.now(),
      };

      // Salva l'utente
      const users = this.getStoredUsers();
      const newUser: UserCredentials = {
        userId,
        userDisplayName,
        credentials: [credential],
        isMaster,
        lastUsedAt: Date.now(),
      };

      users.push(newUser);
      this.saveUsers(users);
      
      console.log('Registration successful for user:', userDisplayName, 'Total users now:', users.length);

      return { success: true, userId };
    } catch (error) {
      console.error('Errore nella registrazione:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          return { 
            success: false, 
            error: 'Registration was cancelled or timed out' 
          };
        } else if (error.name === 'InvalidStateError') {
          return { 
            success: false, 
            error: 'Registration failed - invalid state' 
          };
        } else if (error.name === 'SecurityError') {
          return { 
            success: false, 
            error: 'Security error - make sure you are using HTTPS' 
          };
        } else if (error.name === 'NotSupportedError') {
          return { 
            success: false, 
            error: 'WebAuthn is not supported by this device' 
          };
        }
      }
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Errore sconosciuto' 
      };
    }
  }

  // Autentica con passkey esistente
  static async authenticatePasskey(): Promise<{ 
    success: boolean; 
    user?: UserCredentials; 
    error?: string 
  }> {
    try {
      console.log('Starting WebAuthn authentication...');
      
      if (!this.isSupported()) {
        return { success: false, error: 'WebAuthn non è supportato in questo browser' };
      }

      const users = this.getStoredUsers();
      console.log('Found stored users:', users.length);
      
      if (users.length === 0) {
        return { success: false, error: 'Nessuna passkey registrata. Registra prima una passkey.' };
      }

      const challenge = this.generateChallenge();
      console.log('Generated challenge for authentication');

      // Raccogli tutti i credential ID
      const allowCredentials = users.flatMap(user => 
        user.credentials.map(cred => ({
          id: cred.id,
          type: 'public-key' as const,
          // Migliore supporto per dispositivi mobili con più opzioni di trasporto
          transports: ['internal', 'hybrid', 'usb', 'nfc', 'ble'] as AuthenticatorTransport[],
        }))
      );

      console.log('Allow credentials:', allowCredentials.length);

      // Opzioni di autenticazione nel formato corretto per SimpleWebAuthn
      const optionsJSON: PublicKeyCredentialRequestOptionsJSON = {
        challenge,
        timeout: 60000,
        rpId: RP_ID,
        allowCredentials,
        userVerification: 'preferred', // Cambiato da 'required' a 'preferred'
      };

      console.log('Starting authentication with options:', { rpId: RP_ID, allowCredentials: allowCredentials.length });

      // Avvia autenticazione
      const authResp = await startAuthentication({ optionsJSON });
      console.log('Authentication response received:', authResp.id);

      // Trova l'utente corrispondente al credential utilizzato
      const user = users.find(u => 
        u.credentials.some(c => c.id === authResp.id)
      );

      if (!user) {
        console.error('User not found for credential:', authResp.id);
        return { success: false, error: 'Credential non trovato' };
      }

      console.log('Found user for credential:', user.userDisplayName);

      // Aggiorna last used
      user.lastUsedAt = Date.now();
      this.saveUsers(users);

      console.log('Authentication successful for user:', user.userDisplayName);
      return { success: true, user };
    } catch (error) {
      console.error('Errore nell\'autenticazione:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          return { 
            success: false, 
            error: 'Authentication was cancelled or timed out' 
          };
        } else if (error.name === 'InvalidStateError') {
          return { 
            success: false, 
            error: 'Authentication failed - invalid state' 
          };
        } else if (error.name === 'SecurityError') {
          return { 
            success: false, 
            error: 'Security error - make sure you are using HTTPS' 
          };
        }
      }
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Errore di autenticazione' 
      };
    }
  }

  // Lista tutti gli utenti registrati (per debug)
  static getRegisteredUsers(): UserCredentials[] {
    return this.getStoredUsers();
  }

  // Elimina un utente
  static deleteUser(userId: string): boolean {
    try {
      const users = this.getStoredUsers();
      const filteredUsers = users.filter(user => user.userId !== userId);
      
      if (filteredUsers.length === users.length) {
        return false; // Utente non trovato
      }

      this.saveUsers(filteredUsers);
      return true;
    } catch (error) {
      console.error('Errore nell\'eliminazione utente:', error);
      return false;
    }
  }

  // Reset completo (per sviluppo)
  static resetAllUsers(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
} 