# Guida al Deployment su Digital Ocean

Questa guida spiega come effettuare il deployment dell'applicazione Web3 Fighters su Digital Ocean.

## Prerequisiti

- Account Digital Ocean
- Repository GitHub con il codice sorgente
- Progetto Firebase configurato
- Account Pinata per IPFS

## Variabili d'ambiente richieste

Assicurati di configurare le seguenti variabili d'ambiente nel pannello di Digital Ocean:

```
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_DATABASE_URL=your_database_url
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Pinata IPFS Configuration
VITE_PINATA_API_KEY=your_pinata_api_key
VITE_PINATA_SECRET_KEY=your_pinata_secret_key
VITE_PINATA_JWT=your_pinata_jwt
```

## Passi per il deployment su Digital Ocean

1. **Crea un nuovo progetto su Digital Ocean**
   - Vai su Digital Ocean e crea un nuovo progetto
   - Seleziona "App Platform" come tipo di progetto

2. **Connetti il repository GitHub**
   - Collega il tuo account GitHub a Digital Ocean
   - Seleziona il repository web3-fighters

3. **Configura le impostazioni di deployment**
   - Tipo: Static Site
   - Branch: main
   - Source Directory: ./
   - Build Command: npm run build
   - Output Directory: dist

4. **Configura le variabili d'ambiente**
   - Aggiungi tutte le variabili d'ambiente elencate sopra

5. **Finalizza e avvia il deployment**
   - Scegli il piano più adatto (Basic è sufficiente per iniziare)
   - Clicca su "Launch App"

## Risoluzione problemi comuni

- **Build fallito**: Verifica che tutte le variabili d'ambiente siano configurate correttamente
- **Errori TypeScript**: Il comando build è stato modificato per saltare i controlli dei tipi
- **Problemi di routing**: Il file `static.json` e `_redirects` gestiscono le configurazioni di routing 