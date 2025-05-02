import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Debate, Fighter, MASTER_ADDRESSES } from '../types';
import { MasterDashboard } from './MasterDashboard';
import { MatchCreator } from './MatchCreator';
import { useWalletLock } from '../hooks/useWalletLock';
import { usePinata } from '../hooks/usePinata';
import { IPFS_CONFIG } from '../config/ipfs';
import { PINATA_CONFIG } from '../config/pinata';
import { FaArrowUp, FaArrowDown } from 'react-icons/fa';
import './QuadraticVoting.css';
import { FirebaseService } from '../services/firebase';
import { getDatabase, ref, set } from 'firebase/database';

interface TemporaryVotes {
  [debateId: number]: {
    fighter1: number;
    fighter2: number;
  };
}

export const QuadraticVoting = () => {
  const { address } = useAccount();
  const { uploadJSON, getJSON, isLoading: isPinataLoading, error: pinataError } = usePinata();
  const [debates, setDebates] = useState<Debate[]>([]);
  const [credits, setCredits] = useState(99);
  const [temporaryVotes, setTemporaryVotes] = useState<TemporaryVotes>({});
  const { updateCreditsUsed } = useWalletLock();
  const [isCreditsModalVisible, setIsCreditsModalVisible] = useState(false);
  const [creditAnimation, setCreditAnimation] = useState<'up' | 'down' | null>(null);
  const [voteConfirmed, setVoteConfirmed] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isMaster = address ? MASTER_ADDRESSES.some(masterAddr => 
    masterAddr.toLowerCase() === address.toLowerCase()
  ) : false;
  
  useEffect(() => {
    console.log('=== DEBUG MASTER CHECK ===');
    console.log('Current address:', address);
    console.log('Address type:', typeof address);
    console.log('Address lowercase:', address?.toLowerCase());
    console.log('Master addresses:', MASTER_ADDRESSES);
    console.log('Is master:', isMaster);
    console.log('=== END DEBUG ===');
  }, [address, isMaster]);

  useEffect(() => {
    const handleScroll = () => {
      setIsCreditsModalVisible(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const calculateTotalVotesCost = (votes: TemporaryVotes[number]) => {
    if (!votes) return 0;
    return (votes.fighter1 * votes.fighter1) + (votes.fighter2 * votes.fighter2);
  };

  // Carica i match da Firebase
  const loadDebates = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Inizializza Firebase con i dati da IPFS (se necessario)
      await FirebaseService.initializeFromIPFS(getJSON);
      
      // Imposta i listener in tempo reale
      FirebaseService.initializeRealtimeListeners((updatedDebates) => {
        // Aggiungi le preview URL per ogni fighter
        const debatesWithPreview = updatedDebates.map((debate: Debate) => ({
          ...debate,
          fighter1: {
            ...debate.fighter1,
            previewUrl: debate.fighter1.imageUrl.startsWith('ipfs://') 
              ? debate.fighter1.imageUrl.replace('ipfs://', `https://${PINATA_CONFIG.GATEWAY}/ipfs/`)
              : debate.fighter1.imageUrl
          },
          fighter2: {
            ...debate.fighter2,
            previewUrl: debate.fighter2.imageUrl.startsWith('ipfs://') 
              ? debate.fighter2.imageUrl.replace('ipfs://', `https://${PINATA_CONFIG.GATEWAY}/ipfs/`)
              : debate.fighter2.imageUrl
          }
        }));
        
        setDebates(debatesWithPreview);
        setIsLoading(false);
      });
    } catch (err) {
      console.error('Errore nel caricamento dei match:', err);
      setError('Errore nel caricamento dei match. Riprova più tardi.');
      setIsLoading(false);
    }
  };

  // Salva i match su Firebase e IPFS (solo per i master)
  const saveDebates = async (updatedDebates: Debate[]) => {
    try {
      if (!isMaster) {
        throw new Error('Solo i master possono aggiornare i match');
      }

      // Rimuovi le previewUrl prima del salvataggio
      const debatesForSaving = updatedDebates.map(debate => ({
        ...debate,
        fighter1: {
          id: debate.fighter1.id,
          name: debate.fighter1.name,
          imageUrl: debate.fighter1.imageUrl,
          votes: debate.fighter1.votes
        },
        fighter2: {
          id: debate.fighter2.id,
          name: debate.fighter2.name,
          imageUrl: debate.fighter2.imageUrl,
          votes: debate.fighter2.votes
        }
      }));

      // Salva su Firebase (formato oggetto)
      const debatesObject = debatesForSaving.reduce((acc, debate) => {
        acc[debate.id] = debate;
        return acc;
      }, {} as Record<number, Debate>);
      
      await set(ref(getDatabase(), 'debates'), debatesObject);
      
      // Sincronizza con IPFS
      await FirebaseService.syncWithIPFS(uploadJSON);
      
    } catch (err) {
      console.error('Errore nel salvataggio dei match:', err);
      throw err;
    }
  };

  useEffect(() => {
    loadDebates();
    
    // Sincronizzazione periodica con IPFS (solo per i master)
    if (isMaster) {
      const ipfsSyncInterval = setInterval(() => {
        FirebaseService.syncWithIPFS(uploadJSON);
      }, 300000); // Ogni 5 minuti
      
      return () => clearInterval(ipfsSyncInterval);
    }
  }, [isMaster]);

  const handleStatusChange = async (debateId: number, newStatus: 'PENDING' | 'VOTE' | 'CLOSED') => {
    try {
      const updatedDebates = debates.map(debate => 
      debate.id === debateId ? { ...debate, status: newStatus } : debate
      );
      
      await saveDebates(updatedDebates);
      setDebates(updatedDebates);
    } catch (err) {
      alert('Errore nel cambio di stato del match. Riprova.');
    }
  };

  const handleVoteChange = (debateId: number, fighterId: number, voteAmount: number) => {
    const currentVotes = temporaryVotes[debateId] || { fighter1: 0, fighter2: 0 };
    const newVotes = {
      ...currentVotes,
      [fighterId === debates.find(d => d.id === debateId)?.fighter1.id ? 'fighter1' : 'fighter2']: voteAmount
    };

    const currentCost = calculateTotalVotesCost(currentVotes);
    const newCost = calculateTotalVotesCost(newVotes);
    const costDifference = newCost - currentCost;

    if (credits - costDifference < 0) {
      alert('Non hai abbastanza crediti!');
      return;
    }

    setTemporaryVotes(prev => ({
      ...prev,
      [debateId]: newVotes
    }));

    setCredits(credits - costDifference);
    setCreditAnimation(costDifference > 0 ? 'down' : 'up');

    // Reset animation after 500ms
    setTimeout(() => {
      setCreditAnimation(null);
    }, 500);
  };

  const handleConfirmVote = async (debateId: number) => {
    const debate = debates.find(d => d.id === debateId);
    if (!debate) return;

    const tempVotes = temporaryVotes[debateId];
    if (!tempVotes) return;

    const fighter1Votes = tempVotes.fighter1 || 0;
    const fighter2Votes = tempVotes.fighter2 || 0;
    const totalVotesCost = (fighter1Votes * fighter1Votes) + (fighter2Votes * fighter2Votes);

    if (totalVotesCost > credits) {
      alert('Non hai abbastanza crediti!');
      return;
    }

    setCredits(credits - totalVotesCost);
    updateCreditsUsed(99 - (credits - totalVotesCost));
    setVoteConfirmed(debateId);

    try {
      setIsLoading(true);
      
      // Invia il voto al server Firebase
      await FirebaseService.sendVote(debateId, fighter1Votes, fighter2Votes);

    // Reset temporary votes and animation
    setTimeout(() => {
      setTemporaryVotes(prev => {
        const newVotes = { ...prev };
        delete newVotes[debateId];
        return newVotes;
      });
      setVoteConfirmed(null);
    }, 1000);
    } catch (err) {
      console.error('Errore nell\'invio del voto:', err);
      alert('Si è verificato un errore nell\'invio del voto. Riprova più tardi.');
    } finally {
      setIsLoading(false);
    }
  };

  const getVoteButtonClass = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'vote-button pending';
      case 'VOTE':
        return 'vote-button active';
      case 'CLOSED':
        return 'vote-button closed';
      default:
        return 'vote-button';
    }
  };

  const getCurrentMatch = () => {
    return debates.find(d => d.status === 'VOTE') || debates[0];
  };

  const isLoser = (debate: Debate, fighter: Fighter) => {
    if (debate.status !== 'CLOSED') return false;
    return fighter.votes < (fighter.id === debate.fighter1.id ? debate.fighter2.votes : debate.fighter1.votes);
  };

  const sortedDebates = [...debates].sort((a, b) => {
    if (a.status === 'VOTE') return -1;
    if (b.status === 'VOTE') return 1;
    if (a.status === 'PENDING' && b.status === 'CLOSED') return -1;
    if (a.status === 'CLOSED' && b.status === 'PENDING') return 1;
    return 0;
  });

  const handleCreateMatch = async (newDebate: Debate) => {
    try {
      const updatedDebates = [...debates, newDebate];
      await saveDebates(updatedDebates);
      setDebates(updatedDebates);
    } catch (err) {
      alert('Errore nella creazione del match. Riprova.');
    }
  };

  const handleDeleteMatch = async (debateId: number) => {
    if (window.confirm('Sei sicuro di voler eliminare questo match?')) {
      try {
        const updatedDebates = debates.filter(debate => debate.id !== debateId);
        await saveDebates(updatedDebates);
        setDebates(updatedDebates);
      } catch (err) {
        alert('Errore nell\'eliminazione del match. Riprova.');
      }
    }
  };

  return (
    <div className="quadratic-voting">
      {(isLoading || isPinataLoading) && (
        <div className="loading-overlay">
          <div className="loading-spinner">Caricamento...</div>
        </div>
      )}
      
      {error && (
        <div className="error-message">
          {error}
          <button onClick={loadDebates}>Riprova</button>
        </div>
      )}

      <div className={`credits-modal ${isCreditsModalVisible ? 'visible' : ''}`}>
        <div className="credits-info">
          <p className="wallet-address">{address?.slice(0, 6)}...{address?.slice(-4)}</p>
          <div className="logo"></div>
          <p className={`credits ${creditAnimation ? `credit-${creditAnimation}` : ''}`}>
            Credits: {credits}
          </p>
        </div>
      </div>

      <MasterDashboard 
        debates={debates} 
        onStatusChange={handleStatusChange} 
        onDeleteMatch={handleDeleteMatch}
      />
      
      {isMaster ? (
        <div className="master-section">
          <h2>Master Section</h2>
          <MatchCreator onCreateMatch={handleCreateMatch} />
        </div>
      ) : (
        <div className="non-master-message">
          <p>Questa sezione è disponibile solo per gli indirizzi master.</p>
        </div>
      )}
      
      <div className="debates-grid">
        {sortedDebates.map(debate => (
          <div 
            key={debate.id} 
            className={`debate-card ${debate.status.toLowerCase()} ${debate.status === 'VOTE' ? 'current-match' : ''} ${voteConfirmed === debate.id ? 'vote-confirmed' : ''}`}
          >
            <div className="arab-frame"></div>
            <h3 className="debate-title">{debate.title}</h3>
            <div className="fighters">
              <div className={`fighter ${isLoser(debate, debate.fighter1) ? 'loser' : ''}`}>
                <img 
                  src={debate.fighter1.imageUrl.startsWith('ipfs://') 
                    ? debate.fighter1.imageUrl.replace('ipfs://', `https://${PINATA_CONFIG.GATEWAY}/ipfs/`) 
                    : debate.fighter1.imageUrl}
                  alt={debate.fighter1.name}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/default-fighter.png';
                  }}
                />
                <h4>{debate.fighter1.name}</h4>
                <p>Votes: {debate.fighter1.votes}</p>
                {debate.status === 'VOTE' && (
                  <div className="vote-controls">
                    <button 
                      className="vote-button up"
                      onClick={() => handleVoteChange(debate.id, debate.fighter1.id, (temporaryVotes[debate.id]?.fighter1 || 0) + 1)}
                    >
                      <FaArrowUp />
                    </button>
                    <span className="vote-count">{temporaryVotes[debate.id]?.fighter1 || 0}</span>
                    <button 
                      className="vote-button down"
                      onClick={() => handleVoteChange(debate.id, debate.fighter1.id, (temporaryVotes[debate.id]?.fighter1 || 0) - 1)}
                    >
                      <FaArrowDown />
                    </button>
                  </div>
                )}
              </div>
              <div className="vs">VS</div>
              <div className={`fighter ${isLoser(debate, debate.fighter2) ? 'loser' : ''}`}>
                <img 
                  src={debate.fighter2.imageUrl.startsWith('ipfs://') 
                    ? debate.fighter2.imageUrl.replace('ipfs://', `https://${PINATA_CONFIG.GATEWAY}/ipfs/`) 
                    : debate.fighter2.imageUrl}
                  alt={debate.fighter2.name}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/default-fighter.png';
                  }}
                />
                <h4>{debate.fighter2.name}</h4>
                <p>Votes: {debate.fighter2.votes}</p>
                {debate.status === 'VOTE' && (
                  <div className="vote-controls">
                    <button 
                      className="vote-button up"
                      onClick={() => handleVoteChange(debate.id, debate.fighter2.id, (temporaryVotes[debate.id]?.fighter2 || 0) + 1)}
                    >
                      <FaArrowUp />
                    </button>
                    <span className="vote-count">{temporaryVotes[debate.id]?.fighter2 || 0}</span>
                    <button 
                      className="vote-button down"
                      onClick={() => handleVoteChange(debate.id, debate.fighter2.id, (temporaryVotes[debate.id]?.fighter2 || 0) - 1)}
                    >
                      <FaArrowDown />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="total-votes">
              Total votes: {debate.totalVotes}
            </div>
            <button
              className={getVoteButtonClass(debate.status)}
              disabled={debate.status !== 'VOTE' || !temporaryVotes[debate.id]}
              onClick={() => handleConfirmVote(debate.id)}
            >
              {debate.status === 'PENDING' && 'Pending'}
              {debate.status === 'VOTE' && 'Confirm vote'}
              {debate.status === 'CLOSED' && 'Closed'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}; 