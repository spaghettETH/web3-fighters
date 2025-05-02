export const PINATA_CONFIG = {
  API_KEY: import.meta.env.VITE_PINATA_API_KEY || '',
  SECRET_KEY: import.meta.env.VITE_PINATA_SECRET_KEY || '',
  JWT: import.meta.env.VITE_PINATA_JWT || '',
  GATEWAY: 'spaghetteth.mypinata.cloud'
}; 