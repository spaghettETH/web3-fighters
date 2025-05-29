import { useState, useEffect } from 'react';
import { Debate, Fighter, PASSKEYS } from '../types';
import { MasterDashboard } from './MasterDashboard';
import { MatchCreator } from './MatchCreator';
import { useFirebaseStorage } from '../hooks/useFirebaseStorage';
import { useAuth } from '../hooks/useAuth';
import './QuadraticVoting.css';
import { FirebaseService } from '../services/firebase';
import { getDatabase, ref, set } from 'firebase/database';

interface TemporaryVotes {
  [debateId: number]: number; // Selected fighter ID
}

export const QuadraticVoting = () => {
  const { uploadImage, uploadJSON, getJSON, isLoading: isStorageLoading, error: storageError } = useFirebaseStorage();
  const { isMaster, checkCanVote, registerVote } = useAuth();
  const [debates, setDebates] = useState<Debate[]>([]);
  const [temporaryVotes, setTemporaryVotes] = useState<TemporaryVotes>({});
  const [isCreditsModalVisible, setIsCreditsModalVisible] = useState(false);
  const [voteConfirmed, setVoteConfirmed] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const handleScroll = () => {
      setIsCreditsModalVisible(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Load matches from Firebase
  const loadDebates = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Set maximum timeout for loading
      const timeoutId = setTimeout(() => {
        setError('Timeout while loading debates. Check your connection.');
        setIsLoading(false);
        setDebates([]);
      }, 8000);
      
      // No longer need IPFS initialization
      console.log('Loading debates from Firebase Database...');
      
      // Set real-time listeners
      FirebaseService.initializeRealtimeListeners((updatedDebates) => {
        // Cancel timeout when we receive data
        clearTimeout(timeoutId);
        
        // Filter and validate debates to avoid errors
        const validDebates = updatedDebates.filter(debate => 
          debate && 
          debate.fighter1 && 
          debate.fighter2 && 
          typeof debate.fighter1.imageUrl === 'string' &&
          typeof debate.fighter2.imageUrl === 'string' &&
          typeof debate.fighter1.name === 'string' &&
          typeof debate.fighter2.name === 'string'
        );
        
        // Images are already direct URLs from Firebase Storage, no conversion needed
        setDebates(validDebates);
        setIsLoading(false);
      });
    } catch (err) {
      console.error('Error while loading matches:', err);
      setError('Error while loading matches. Retry later.');
      setIsLoading(false);
      
      // In case of error, load empty debates to allow interface to function
      setDebates([]);
    }
  };

  // Save matches to Firebase (masters only)
  const saveDebates = async (updatedDebates: Debate[]) => {
    try {
      if (!isMaster) {
        throw new Error('Only master can update matches');
      }

      // First set global authentication
      const authData = {
        passkey: PASSKEYS.MASTER,
        timestamp: Date.now()
      };
      
      await set(ref(getDatabase(), '_auth'), authData);
      
      // Small pause to ensure _auth is set
      await new Promise(resolve => setTimeout(resolve, 100));

      // Save to Firebase (object format)
      const debatesObject = updatedDebates.reduce((acc, debate) => {
        acc[debate.id] = debate;
        return acc;
      }, {} as Record<number, Debate>);
      
      await set(ref(getDatabase(), 'debates'), debatesObject);
      
      // Remove _auth field after saving
      await set(ref(getDatabase(), '_auth'), null);
      
      console.log('Matches saved successfully on Firebase');
      
    } catch (err) {
      console.error('Error while saving matches:', err);
      throw err;
    }
  };

  useEffect(() => {
    // Load debates immediately
    loadDebates();
  }, [isMaster]);

  const handleStatusChange = async (debateId: number, newStatus: 'PENDING' | 'VOTE' | 'CLOSED') => {
    try {
      const updatedDebates = debates.map(debate => 
      debate.id === debateId ? { ...debate, status: newStatus } : debate
      );
      
      await saveDebates(updatedDebates);
      setDebates(updatedDebates);
    } catch (err) {
      alert('Error while changing match status. Retry.');
    }
  };

  const handleVoteChange = (debateId: number, fighterId: number) => {
    setTemporaryVotes(prev => ({
      ...prev,
      [debateId]: fighterId
    }));
  };

  const handleConfirmVote = async (debateId: number) => {
    const debate = debates.find(d => d.id === debateId);
    if (!debate) return;

    const selectedFighterId = temporaryVotes[debateId];
    if (!selectedFighterId) return;

    // Check if user can vote for this debate
    if (!checkCanVote(debateId)) {
      alert('You have already voted for this match or you are trying to vote too fast!');
      return;
    }

    setVoteConfirmed(debateId);

    try {
      setIsLoading(true);
      
      // Send vote to Firebase server
      const isFighter1 = selectedFighterId === debate.fighter1.id;
      
      // Send 1 vote for selected fighter and 0 for the other
      await FirebaseService.sendVote(
        debateId, 
        isFighter1 ? 1 : 0, 
        isFighter1 ? 0 : 1,
        selectedFighterId
      );

      // Register user vote
      registerVote(debateId, selectedFighterId);

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
      console.error('Error while sending vote:', err);
      alert('An error occurred while sending the vote. Retry later.');
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
      alert('Error while creating match. Retry.');
    }
  };

  const handleDeleteMatch = async (debateId: number) => {
    if (window.confirm('Are you sure you want to delete this match?')) {
      try {
        const updatedDebates = debates.filter(debate => debate.id !== debateId);
        await saveDebates(updatedDebates);
        setDebates(updatedDebates);
      } catch (err) {
        alert('Error while deleting match. Retry.');
      }
    }
  };

  const isFighterSelected = (debateId: number, fighterId: number) => {
    return temporaryVotes[debateId] === fighterId;
  };

  // Check if a user has already voted for a specific debate
  const hasVoted = (debateId: number) => {
    return !checkCanVote(debateId);
  };

  return (
    <div className="quadratic-voting">
      {(isLoading || isStorageLoading) && (
        <div className="loading-overlay">
          <div className="loading-spinner">Loading...</div>
        </div>
      )}
      
      {error && (
        <div className="error-message">
          {error}
          <button onClick={loadDebates}>Retry</button>
        </div>
      )}

      <div className={`credits-modal ${isCreditsModalVisible ? 'visible' : ''}`}>
        <div className="credits-info">
          {isMaster ? (
            <p className="user-status">Master Account</p>
          ) : (
            <p className="user-status">User Account</p>
          )}
          <div className="logo"></div>
          <p className="credits">
            Web3 Fighters
          </p>
        </div>
      </div>

      {isMaster && (
        <MasterDashboard 
          debates={debates} 
          onStatusChange={handleStatusChange} 
          onDeleteMatch={handleDeleteMatch}
        />
      )}
      
      {isMaster ? (
        <div className="master-section">
          <h2>Master Section</h2>
          <MatchCreator onCreateMatch={handleCreateMatch} />
        </div>
      ) : (
        <div className="logo-container">
          <img src="/assets/logoTotal.png" alt="BlockFighters Logo" className="logo-total" />
        </div>
      )}
      
      <div className="debates-grid">
        {sortedDebates.map(debate => (
          <div 
            key={debate.id} 
            className={`debate-card ${debate.status.toLowerCase()} ${debate.status === 'VOTE' ? 'current-match' : ''} ${voteConfirmed === debate.id ? 'vote-confirmed' : ''} ${hasVoted(debate.id) ? 'already-voted' : ''}`}
          >
            <div className="arab-frame"></div>
            <h3 className="debate-title">{debate.title}</h3>
            
            {hasVoted(debate.id) && debate.status === 'VOTE' && (
              <div className="already-voted-badge">You have already voted</div>
            )}
            
            <div className="fighters">
              <div className={`fighter ${isLoser(debate, debate.fighter1) ? 'loser' : ''} ${isFighterSelected(debate.id, debate.fighter1.id) ? 'selected' : ''}`}>
                <img 
                  src={debate.fighter1.imageUrl}
                  alt={debate.fighter1.name}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/default-fighter.png';
                  }}
                  onClick={() => debate.status === 'VOTE' && !hasVoted(debate.id) && handleVoteChange(debate.id, debate.fighter1.id)}
                />
                <h4>{debate.fighter1.name}</h4>
                <p>Votes: {debate.fighter1.votes}</p>
                {debate.status === 'VOTE' && !hasVoted(debate.id) && (
                  <button 
                    className={`select-fighter-btn ${isFighterSelected(debate.id, debate.fighter1.id) ? 'selected' : ''}`}
                    onClick={() => handleVoteChange(debate.id, debate.fighter1.id)}
                  >
                    {isFighterSelected(debate.id, debate.fighter1.id) ? 'Selected' : 'Select'}
                  </button>
                )}
              </div>
              <div className="vs">VS</div>
              <div className={`fighter ${isLoser(debate, debate.fighter2) ? 'loser' : ''} ${isFighterSelected(debate.id, debate.fighter2.id) ? 'selected' : ''}`}>
                <img 
                  src={debate.fighter2.imageUrl}
                  alt={debate.fighter2.name}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/default-fighter.png';
                  }}
                  onClick={() => debate.status === 'VOTE' && !hasVoted(debate.id) && handleVoteChange(debate.id, debate.fighter2.id)}
                />
                <h4>{debate.fighter2.name}</h4>
                <p>Votes: {debate.fighter2.votes}</p>
                {debate.status === 'VOTE' && !hasVoted(debate.id) && (
                  <button 
                    className={`select-fighter-btn ${isFighterSelected(debate.id, debate.fighter2.id) ? 'selected' : ''}`}
                    onClick={() => handleVoteChange(debate.id, debate.fighter2.id)}
                  >
                    {isFighterSelected(debate.id, debate.fighter2.id) ? 'Selected' : 'Select'}
                  </button>
                )}
              </div>
            </div>
            <div className="total-votes">
              Total votes: {debate.totalVotes}
            </div>
            <button
              className={getVoteButtonClass(debate.status)}
              disabled={debate.status !== 'VOTE' || !temporaryVotes[debate.id] || hasVoted(debate.id)}
              onClick={() => handleConfirmVote(debate.id)}
            >
              {debate.status === 'PENDING' && 'Pending'}
              {debate.status === 'VOTE' && (hasVoted(debate.id) ? 'You have already voted' : 'Confirm vote')}
              {debate.status === 'CLOSED' && 'Closed'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}; 