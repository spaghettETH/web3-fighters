export interface Fighter {
  id: number;
  name: string;
  imageUrl: string; // IPFS hash
  previewUrl?: string; // URL del gateway Pinata per la preview
  votes: number;
}

export interface Debate {
  id: number;
  title: string;
  fighter1: Fighter;
  fighter2: Fighter;
  status: 'PENDING' | 'VOTE' | 'CLOSED';
  totalVotes: number;
}

export const MASTER_ADDRESSES = [
  '0xE7D1DA38a3530F510B10A83FF25Cfbd0a32e1A95','0xC3F6e18b429b6BAf1bD31B1E504aee7827C7AAb5' // Sostituire con gli indirizzi master
]; 