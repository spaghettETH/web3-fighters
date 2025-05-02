import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useSignMessage } from 'wagmi';

interface WelcomeScreenProps {
  onSignMessage: () => void;
  hasSigned: boolean;
}

export const WelcomeScreen = ({ onSignMessage, hasSigned }: WelcomeScreenProps) => {
  const { isConnected } = useAccount();
  const { signMessage } = useSignMessage();

  const handleSignMessage = async () => {
    try {
      const message = "Confermo di essere il proprietario di questo wallet";
      await signMessage({ message });
      onSignMessage();
    } catch (error) {
      console.error('Errore durante la firma:', error);
      alert('Si è verificato un errore durante la firma del messaggio');
    }
  };

  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <h1>Enter Blockfighters</h1>
        <p className="subtitle">The ultimate quadratic voting platform for Web3 debates</p>
        
        {!isConnected ? (
          <div className="connect-section">
            <p>Connect your wallet to begin</p>
            <ConnectButton showBalance={true} chainStatus="icon" />
          </div>
        ) : !hasSigned ? (
          <div className="sign-section">
            <p>Sign the message to verify your wallet ownership</p>
            <button onClick={handleSignMessage} className="sign-button">
              Sign Message
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}; 