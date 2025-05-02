import { useState } from 'react';
import axios from 'axios';
import { PINATA_CONFIG } from '../config/pinata';

interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

interface UsePinataReturn {
  uploadImage: (file: File) => Promise<string>;
  uploadJSON: (json: any) => Promise<string>;
  getJSON: (ipfsHash: string) => Promise<any>;
  isLoading: boolean;
  error: string | null;
}

export const usePinata = (): UsePinataReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = {
    'Authorization': `Bearer ${PINATA_CONFIG.JWT}`,
  };

  const uploadImage = async (file: File): Promise<string> => {
    try {
      setIsLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('pinataOptions', JSON.stringify({
        cidVersion: 1
      }));
      formData.append('pinataMetadata', JSON.stringify({
        name: `web3-fighters-${Date.now()}`,
        keyvalues: {
          type: 'fighter-image'
        }
      }));

      const res = await axios.post<PinataResponse>(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        formData,
        {
          headers: {
            ...headers,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      return `ipfs://${res.data.IpfsHash}`;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Errore durante l\'upload dell\'immagine';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadJSON = async (json: any): Promise<string> => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await axios.post<PinataResponse>(
        'https://api.pinata.cloud/pinning/pinJSONToIPFS',
        json,
        {
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          }
        }
      );

      return res.data.IpfsHash;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Errore durante l\'upload del JSON';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const getJSON = async (ipfsHash: string): Promise<any> => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await axios.get(`https://${PINATA_CONFIG.GATEWAY}/ipfs/${ipfsHash}`);
      return res.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Errore durante il recupero del JSON';
      setError(message);
      throw new Error(message);
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