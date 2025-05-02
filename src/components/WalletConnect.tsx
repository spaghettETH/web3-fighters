import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useWalletLock } from '../hooks/useWalletLock';

export const WalletConnect = () => {
  const { address, isConnected } = useAccount();
  const { isWalletLocked, lockedAddress, creditsUsed, resetWalletLock } = useWalletLock();

  const handleResetWallet = () => {
    if (creditsUsed > 0) {
      alert('Non puoi sbloccare il wallet perché hai già utilizzato dei crediti per votare.');
      return;
    }
    const success = resetWalletLock();
    if (!success) {
      alert('Non puoi sbloccare il wallet perché hai già utilizzato dei crediti per votare.');
    }
  };

  if (isWalletLocked) {
    return (
      <div className="wallet-locked">
        <p>Hai già utilizzato un altro wallet per questa sessione.</p>
        <p>Wallet bloccato: {lockedAddress}</p>
        {creditsUsed > 0 ? (
          <p className="credits-warning">
            ⚠️ Non puoi sbloccare il wallet perché hai già utilizzato {creditsUsed} crediti per votare.
          </p>
        ) : (
          <button onClick={handleResetWallet} className="reset-button">
            Sblocca Wallet
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="wallet-connect">
      <ConnectButton showBalance={true} chainStatus="icon" />
    </div>
  );
}; 