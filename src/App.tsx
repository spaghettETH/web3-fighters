import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, sepolia } from 'viem/chains';
import { 
  RainbowKitProvider,
  darkTheme,
} from '@rainbow-me/rainbowkit';
import { 
  getDefaultConfig
} from '@rainbow-me/rainbowkit';
import { WelcomeScreen } from './components/WelcomeScreen';
import { WalletConnect } from './components/WalletConnect';
import { QuadraticVoting } from './components/QuadraticVoting';
import Preloader from './components/Preloader';
import '@rainbow-me/rainbowkit/styles.css';
import './App.css';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const projectId = '6ff8c0473268db061676cc4aec29d469';

const config = getDefaultConfig({
  appName: 'BlockFighters Ethcc8',
  projectId,
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
});

const queryClient = new QueryClient();

function App() {
  const [hasSigned, setHasSigned] = useState(false);

  const handleSignMessage = async () => {
    try {
      // Qui verrà implementata la logica di firma
      setHasSigned(true);
    } catch (error) {
      console.error('Errore durante la firma:', error);
    }
  };

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider 
          theme={darkTheme({
            accentColor: '#4CAF50',
            accentColorForeground: 'white',
            borderRadius: 'medium',
            fontStack: 'system',
            overlayBlur: 'small',
          })}
          modalSize="compact"
          showRecentTransactions={false}
        >
          <Preloader />
          
          {!hasSigned ? (
            <WelcomeScreen onSignMessage={handleSignMessage} hasSigned={hasSigned} />
          ) : (
            <div className="app-container">
              <header className="app-header">
                <div className="wallet-address">0xE7D1...1A95</div>
                <div className="logo"></div>
                <div className="app-title">Web3 Fighters</div>
              </header>
              <main>
                <QuadraticVoting />
              </main>
            </div>
          )}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
