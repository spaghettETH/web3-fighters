import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';

interface WalletLockState {
  address: string;
  creditsUsed: number;
}

export const useWalletLock = () => {
  const { address } = useAccount();
  const [isWalletLocked, setIsWalletLocked] = useState(false);
  const [lockedAddress, setLockedAddress] = useState<string | null>(null);
  const [creditsUsed, setCreditsUsed] = useState<number>(0);

  useEffect(() => {
    // Recupera lo stato del wallet dal localStorage
    const storedState = localStorage.getItem('walletLockState');
    if (storedState) {
      const { address, creditsUsed } = JSON.parse(storedState) as WalletLockState;
      setLockedAddress(address);
      setCreditsUsed(creditsUsed);
    }
  }, []);

  useEffect(() => {
    if (address) {
      const storedState = localStorage.getItem('walletLockState');
      
      if (!storedState) {
        // Se non c'è uno stato memorizzato, crealo
        const newState: WalletLockState = {
          address,
          creditsUsed: 0
        };
        localStorage.setItem('walletLockState', JSON.stringify(newState));
        setLockedAddress(address);
        setIsWalletLocked(false);
      } else {
        const { address: storedAddress, creditsUsed: storedCredits } = JSON.parse(storedState) as WalletLockState;
        
        if (storedAddress !== address) {
          // Se l'indirizzo corrente è diverso da quello bloccato
          setIsWalletLocked(true);
        } else {
          // Se l'indirizzo corrente è quello bloccato
          setIsWalletLocked(false);
          setCreditsUsed(storedCredits);
        }
      }
    }
  }, [address]);

  const updateCreditsUsed = (newCreditsUsed: number) => {
    const storedState = localStorage.getItem('walletLockState');
    if (storedState) {
      const state = JSON.parse(storedState) as WalletLockState;
      const updatedState: WalletLockState = {
        ...state,
        creditsUsed: newCreditsUsed
      };
      localStorage.setItem('walletLockState', JSON.stringify(updatedState));
      setCreditsUsed(newCreditsUsed);
    }
  };

  const resetWalletLock = () => {
    if (creditsUsed > 0) {
      return false; // Non permettere lo sblocco se sono stati usati crediti
    }
    localStorage.removeItem('walletLockState');
    setLockedAddress(null);
    setIsWalletLocked(false);
    setCreditsUsed(0);
    return true;
  };

  return {
    isWalletLocked,
    lockedAddress,
    creditsUsed,
    updateCreditsUsed,
    resetWalletLock
  };
}; 