import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useWalletLock } from '../hooks/useWalletLock';

export const WalletConnect = () => {
  const { address, isConnected } = useAccount();
  const { isWalletLocked, lockedAddress, creditsUsed, resetWalletLock } = useWalletLock();

  const handleResetWallet = () => {
    if (creditsUsed > 0) {
      alert('You cannot unlock the wallet because you have already used credits to vote.');
      return;
    }
    const success = resetWalletLock();
    if (!success) {
      alert('You cannot unlock the wallet because you have already used credits to vote.');
    }
  };

  if (isWalletLocked) {
    return (
      <div className="wallet-locked">
        <p>You have already used another wallet for this session.</p>
        <p>Locked wallet: {lockedAddress}</p>
        {creditsUsed > 0 ? (
          <p className="credits-warning">
            ⚠️ You cannot unlock the wallet because you have already used {creditsUsed} credits to vote.
          </p>
        ) : (
          <button onClick={handleResetWallet} className="reset-button">
            Unlock Wallet
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