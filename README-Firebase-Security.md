# Regole di Sicurezza Firebase per Web3 Fighters

Questo documento descrive le regole di sicurezza implementate nel database Firebase Realtime Database per l'applicazione Web3 Fighters.

## Panoramica del Sistema di Sicurezza

L'applicazione utilizza un sistema di autenticazione personalizzato basato su passkey, non il tradizionale Firebase Authentication. Questo ha richiesto un approccio particolare per le regole di sicurezza.

### Strategie implementate:

1. **Controllo di passkey valide**: Solo gli utenti con passkey valide possono modificare il database
2. **Verifica del timestamp**: Le operazioni sono valide solo se eseguite entro 60 secondi dalla generazione della richiesta
3. **Limitazione dei diritti di scrittura**: Gli utenti normali possono solo votare, mentre i master possono modificare qualsiasi parte del database
4. **Protezione contro manipolazioni dei voti**: I voti possono solo essere incrementati, non decrementati
5. **Prevenzione del doppio voto**: Ogni dispositivo può votare una sola volta per dibattito tramite ID dispositivo persistente

## Sistema di Prevenzione Doppio Voto

### Problema Risolto
Prima della modifica, gli utenti potevano:
1. Entrare nell'app e votare
2. Fare logout
3. Rientrare con la stessa passkey
4. Votare di nuovo per lo stesso dibattito

### Soluzione Implementata

#### 1. ID Dispositivo Persistente
- Ogni dispositivo/browser genera un fingerprint unico basato su caratteristiche del browser
- Il fingerprint è memorizzato in localStorage e riutilizzato
- Include: user agent, lingua, risoluzione schermo, timezone, canvas fingerprint, hardware info

#### 2. Collezione Votes in Firebase
- Nuova collezione `votes` che traccia ogni voto per dispositivo
- Struttura: `votes/{deviceId}/{debateId}`
- Contiene: deviceId, debateId, fighterId, timestamp

#### 3. Controllo Pre-Voto
- Prima di ogni voto, l'app verifica se il dispositivo ha già votato
- Controllo sia su Firebase che su localStorage come fallback
- Blocca il voto se già presente

## Implementazione

### Struttura delle regole di sicurezza aggiornate

```json
{
  "rules": {
    "debates": {
      ".read": true,
      ".write": "newData.child('_auth').child('passkey').val() === 'bfethcc8master' && newData.child('_auth').child('timestamp').exists() && newData.child('_auth').child('timestamp').val() > (now - 60000)",
      
      "$debateId": {
        ".validate": "newData.hasChildren(['id', 'title', 'fighter1', 'fighter2', 'status', 'totalVotes'])",
        
        "fighter1": {
          "votes": {
            ".write": "newData.parent().parent().parent().child('_auth').child('passkey').exists() && (newData.parent().parent().parent().child('_auth').child('passkey').val() === 'BFethcc8' || newData.parent().parent().parent().child('_auth').child('passkey').val() === 'bfethcc8master') && newData.parent().parent().parent().child('_auth').child('timestamp').exists() && newData.parent().parent().parent().child('_auth').child('timestamp').val() > (now - 60000)",
            ".validate": "newData.isNumber() && newData.val() >= data.val()"
          }
        },
        "fighter2": {
          "votes": {
            ".write": "newData.parent().parent().parent().child('_auth').child('passkey').exists() && (newData.parent().parent().parent().child('_auth').child('passkey').val() === 'BFethcc8' || newData.parent().parent().parent().child('_auth').child('passkey').val() === 'bfethcc8master') && newData.parent().parent().parent().child('_auth').child('timestamp').exists() && newData.parent().parent().parent().child('_auth').child('timestamp').val() > (now - 60000)",
            ".validate": "newData.isNumber() && newData.val() >= data.val()"
          }
        },
        "totalVotes": {
          ".write": "newData.parent().parent().child('_auth').child('passkey').exists() && (newData.parent().parent().child('_auth').child('passkey').val() === 'BFethcc8' || newData.parent().parent().child('_auth').child('passkey').val() === 'bfethcc8master') && newData.parent().parent().child('_auth').child('timestamp').exists() && newData.parent().parent().child('_auth').child('timestamp').val() > (now - 60000)",
          ".validate": "newData.isNumber() && newData.val() >= data.val()"
        }
      }
    },
    
    "votes": {
      ".read": "auth != null || root.child('_auth').child('passkey').exists()",
      ".write": "newData.parent().child('_auth').child('passkey').exists() && (newData.parent().child('_auth').child('passkey').val() === 'BFethcc8' || newData.parent().child('_auth').child('passkey').val() === 'bfethcc8master') && newData.parent().child('_auth').child('timestamp').exists() && newData.parent().child('_auth').child('timestamp').val() > (now - 60000)",
      
      "$deviceId": {
        "$debateId": {
          ".validate": "newData.hasChildren(['deviceId', 'debateId', 'fighterId', 'timestamp'])",
          
          "deviceId": {
            ".validate": "newData.isString() && newData.val() === $deviceId"
          },
          "debateId": {
            ".validate": "newData.isNumber()"
          },
          "fighterId": {
            ".validate": "newData.isNumber()"
          },
          "timestamp": {
            ".validate": "newData.isNumber()"
          }
        }
      }
    },
    
    "_auth": {
      ".write": true,
      ".validate": "!newData.exists()"
    }
  }
}
```

### Come funziona il sistema completo

1. **Al login**: L'app genera o recupera l'ID dispositivo persistente
2. **Prima del voto**: Verifica se `votes/{deviceId}/{debateId}` esiste in Firebase
3. **Durante il voto**: Se non ha già votato, procede e registra il voto in entrambe le collezioni
4. **Controllo locale**: Mantiene anche il controllo localStorage come fallback
5. **Logout/Login**: L'ID dispositivo rimane lo stesso, impedendo voti multipli

### Modifiche al codice

#### Generazione ID Dispositivo
```typescript
// utils/deviceId.ts
function generateDeviceFingerprint(): string {
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    canvas.toDataURL(),
    navigator.hardwareConcurrency || 0,
    (navigator as any).deviceMemory || 0
  ].join('|');
  
  // Genera hash univoco
  return Math.abs(hash).toString(36);
}
```

#### Controllo Pre-Voto
```typescript
static async hasDeviceVoted(debateId: number): Promise<boolean> {
  // Prima controlla Firebase
  if (database) {
    const deviceId = getDeviceId();
    const voteRef = ref(database, `votes/${deviceId}/${debateId}`);
    const snapshot = await get(voteRef);
    if (snapshot.exists()) return true;
  }
  
  // Fallback localStorage
  const userData = JSON.parse(localStorage.getItem('web3_fighters_user'));
  return userData?.votedDebates[debateId] !== undefined;
}
```

#### Registrazione Voto
```typescript
static async recordVote(debateId: number, fighterId: number): Promise<void> {
  const deviceId = getDeviceId();
  const voteData = {
    deviceId,
    debateId,
    fighterId,
    timestamp: Date.now()
  };
  
  const dataToSave = {
    [`votes/${deviceId}/${debateId}`]: voteData,
    _auth: { passkey: PASSKEYS.USER, timestamp: Date.now() }
  };
  
  await set(ref(database, ''), dataToSave);
  await set(ref(database, '_auth'), null);
}
```

## Vantaggi di questo approccio

1. **Sicurezza**: Nessun utente non autorizzato può modificare i dati
2. **Prevenzione doppio voto**: Impossibile votare più volte dallo stesso dispositivo
3. **Resilienza**: Funziona anche se Firebase è temporaneamente non disponibile
4. **Semplicità**: Non richiede registrazione utenti o email
5. **Trasparenza**: I voti sono tracciabili per debugging
6. **Compatibilità**: Funziona con la UX richiesta (una passkey per tutta la mattinata)

## Limitazioni e Considerazioni

1. **Cambio dispositivo**: Un utente con dispositivi diversi può tecnicamente votare più volte
2. **Clear cache**: Se l'utente cancella localStorage, l'ID cambia (ma Firebase mantiene comunque il record)
3. **Browser diversi**: Stesso dispositivo, browser diverso = ID diverso
4. **Modalità incognito**: Genera un nuovo ID ad ogni sessione

Per l'uso previsto (evento mattutino con spettatori che usano prevalentemente un dispositivo), queste limitazioni sono accettabili.

## UX Risultante

✅ **Scenario supportato**: Utente vota alle 9am, rientra alle 11am per nuovo match
✅ **Scenario bloccato**: Utente vota, logout, login, tenta di rivotare stesso match
✅ **Funziona con**: Una sola passkey per tutti gli utenti normali
✅ **Compatibile con**: Eventi temporanei (mattinata) 