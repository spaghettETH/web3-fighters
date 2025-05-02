// Questo file mantiene l'hash IPFS più recente del JSON dei match
export const IPFS_CONFIG = {
  // L'hash iniziale può essere vuoto o puntare a un JSON iniziale
  ROOT_HASH: '',
  // Funzione per aggiornare l'hash
  updateRootHash: (newHash: string) => {
    IPFS_CONFIG.ROOT_HASH = newHash;
    console.log('Nuovo hash root:', newHash);
    // In futuro potremmo voler persistere questo valore in localStorage
    localStorage.setItem('ipfs_root_hash', newHash);
  },
  // Funzione per recuperare l'hash
  getRootHash: () => {
    // Prima controlla localStorage, poi usa il valore di default
    return localStorage.getItem('ipfs_root_hash') || IPFS_CONFIG.ROOT_HASH;
  }
}; 