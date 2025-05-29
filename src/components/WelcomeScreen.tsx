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
        <p className="subtitle">Vota i tuoi fighter preferiti con il voto quadratico!</p>
        
          <div className="connect-section">
          <p>Per partecipare, devi prima connettere il tuo wallet:</p>
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
            <p>Ora firma un messaggio per confermare la tua identità:</p>
            <button className="sign-button" onClick={onSignMessage}>
              Firma
            </button>
          </div>
        )}
      </div>
    </div>
  );
}; 