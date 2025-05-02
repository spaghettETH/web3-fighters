#!/bin/bash

# Verifica del build locale prima del deployment
echo "Verifico il build locale..."

# Pulisci la cartella dist
rm -rf dist

# Esegui il build
npm run build

# Verifica se il build è andato a buon fine
if [ $? -eq 0 ]; then
  echo "✅ Build completato con successo!"
  echo "La tua app è pronta per il deployment su Digital Ocean."
  
  # Controlla se sono stati generati i file nella cartella dist
  FILES_COUNT=$(find dist -type f | wc -l)
  echo "File generati nella cartella dist: $FILES_COUNT"
  
  # Lista i file principali
  echo "File principali:"
  ls -la dist
  
  echo "Per testare localmente, esegui: npm run preview"
else
  echo "❌ Build fallito. Risolvi gli errori prima di fare il deployment."
  exit 1
fi 