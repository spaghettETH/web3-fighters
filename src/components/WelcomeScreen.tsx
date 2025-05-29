import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import './WelcomeScreen.css';

interface WelcomeScreenProps {
  onSignMessage: () => void;
  hasSigned: boolean;
}

export const WelcomeScreen = ({ onSignMessage, hasSigned }: WelcomeScreenProps) => {
  const { isConnected } = useAccount();

  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <h1>BlockFighters Ethcc8</h1>
        <p className="subtitle">Vote for your favorite fighters!</p>
        
          <div className="connect-section">
          <p>To participate, you must first connect your wallet:</p>
          <div className="connect-button-wrapper">
            <ConnectButton 
              chainStatus="none" 
              accountStatus="address"
              showBalance={false}
              label="Connetti Wallet"
            />
          </div>
        </div>

        {isConnected && !hasSigned && (
          <div className="sign-section">
            <p>Now sign a message to confirm your identity:</p>
            <button className="sign-button" onClick={onSignMessage}>
              Sign
            </button>
          </div>
        )}
      </div>
    </div>
  );
}; 