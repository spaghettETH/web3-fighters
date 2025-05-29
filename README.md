# 🥊 Web3 Fighters

Sistema di votazione real-time per eventi di dibattito con prevenzione anti-doppio voto basato su device fingerprinting.

## 🏗️ Architettura

### 🔥 **Firebase Only**
- **Firebase Realtime Database**: Voti e match in tempo reale
- **Firebase Storage**: Upload e hosting immagini fighters
- **Device Fingerprinting**: Prevenzione doppio voto senza login

### 🎯 **Caratteristiche Principali**

✅ **Sistema Master/User**: Passkey condivisa per gestione match  
✅ **Anti-Doppio Voto**: Tracking per dispositivo (sopravvive logout/login)  
✅ **Tempo Reale**: Aggiornamenti istantanei via Firebase  
✅ **Upload Sicuro**: Immagini su Firebase Storage  
✅ **UX Ottimale**: Una passkey per tutta la giornata  

## 🚀 Setup Veloce

### 1. **Clone & Install**
```bash
git clone https://github.com/your-repo/web3-fighters
cd web3-fighters
npm install
```

### 2. **Configurazione Firebase**

Crea `.env` con le tue credenziali Firebase:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebasebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

### 3. **Deploy Regole Firebase**
```bash
npm install -g firebase-tools
firebase login
firebase init database
firebase deploy --only database
```

### 4. **Avvia App**
```bash
npm run dev
```

## 📱 **Come Funziona**

### 🎭 **Per Utenti**
1. **Entra**: Visita l'app, inserisci passkey condivisa
2. **Vota**: Seleziona fighter e conferma voto
3. **Esci/Rientra**: La passkey funziona tutta la giornata
4. **Anti-Doppio**: Impossibile votare due volte per stesso match

### 👨‍💻 **Per Master**
1. **Accesso Master**: Passkey master (`bfethcc8master`)
2. **Crea Match**: Upload immagini + nomi fighters
3. **Gestisce Stati**: PENDING → VOTE → CLOSED
4. **Monitora**: Dashboard real-time con tutti i voti

## 🔒 **Sistema Anti-Doppio Voto**

### Device Fingerprinting
- **Browser fingerprint** unico per dispositivo
- **Memorizzazione localStorage** + Firebase  
- **Sopravvive** a logout/login
- **Permette** voti per match diversi
- **Blocca** rivoto stesso match

### Esempio UX
```
9:00  - Entra, vota Match A, esce
11:00 - Rientra, può votare Match B ✅
11:30 - Tenta rivoto Match A → BLOCCATO ❌
```

## 🛠️ **Tecnologie**

- **Frontend**: React + TypeScript + Vite
- **Backend**: Firebase Realtime Database
- **Storage**: Firebase Storage  
- **Styling**: CSS Custom + CSS Variables
- **Deploy**: Firebase Hosting (opzionale)

## 📊 **Struttura Dati Firebase**

```json
{
  "debates": {
    "1234567890": {
      "id": 1234567890,
      "title": "Match Title", 
      "fighter1": {
        "id": 1,
        "name": "Fighter Name",
        "imageUrl": "https://firebase_storage_url",
        "votes": 42
      },
      "fighter2": { "..." },
      "status": "VOTE", // PENDING | VOTE | CLOSED
      "totalVotes": 100
    }
  },
  "votes": {
    "device_fingerprint_hash": {
      "1234567890": {
        "deviceId": "hash",
        "debateId": 1234567890,
        "fighterId": 1,
        "timestamp": 1699123456789
      }
    }
  }
}
```

## 🔑 **Passkeys**

- **Utenti**: `BFethcc8` (votazione)
- **Master**: `bfethcc8master` (gestione completa)

## 🌐 **Deploy in Produzione**

### Firebase Hosting
```bash
npm run build
firebase init hosting
firebase deploy
```

### Vercel/Netlify
```bash
npm run build
# Upload dist/ folder
```

## 🆘 **Troubleshooting**

### Errori Comuni

**Permission Denied**: 
- Verifica credenziali Firebase in `.env`
- Deploy regole database: `firebase deploy --only database`

**Upload Fallisce**:
- Controlla Firebase Storage rules
- Verifica configurazione Storage in console Firebase

**Voti Non Sincronizzati**:
- Controlla connessione internet
- Verifica console Firebase per errori Database

## 🎬 **Demo**

L'app è ottimizzata per eventi live con:
- **Gestione real-time** di centinaia di votanti
- **UX mobile-first** per uso su smartphone  
- **Dashboard master** per moderazione live
- **Sistema robusto** anti-manipolazione voti

---

**Sviluppato per ETHcc8 BlockFighters** 🥊⚡

