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
  [debateId: number]: number; // ID del fighter selezionato
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

  // Carica i match da Firebase
  const loadDebates = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Imposta un timeout massimo per il caricamento
      const timeoutId = setTimeout(() => {
        setError('Timeout nel caricamento dei dibattiti. Verifica la tua connessione.');
        setIsLoading(false);
        setDebates([]);
      }, 8000);
      
      // Non serve più inizializzazione da IPFS
      console.log('Caricamento dibattiti da Firebase Database...');
      
      // Imposta i listener in tempo reale
      FirebaseService.initializeRealtimeListeners((updatedDebates) => {
        // Cancella il timeout quando riceviamo i dati
        clearTimeout(timeoutId);
        
        // Filtra e valida i dibattiti per evitare errori
        const validDebates = updatedDebates.filter(debate => 
          debate && 
          debate.fighter1 && 
          debate.fighter2 && 
          typeof debate.fighter1.imageUrl === 'string' &&
          typeof debate.fighter2.imageUrl === 'string' &&
          typeof debate.fighter1.name === 'string' &&
          typeof debate.fighter2.name === 'string'
        );
        
        // Le immagini sono già URL diretti da Firebase Storage, non serve conversione
        setDebates(validDebates);
        setIsLoading(false);
      });
    } catch (err) {
      console.error('Errore nel caricamento dei match:', err);
      setError('Errore nel caricamento dei match. Riprova più tardi.');
      setIsLoading(false);
      
      // In caso di errore, carichiamo dei dibattiti vuoti per permettere all'interfaccia di funzionare
      setDebates([]);
    }
  };

  // Salva i match su Firebase (solo per i master)
  const saveDebates = async (updatedDebates: Debate[]) => {
    try {
      if (!isMaster) {
        throw new Error('Solo i master possono aggiornare i match');
      }

      // Prima settiamo l'autenticazione globale
      const authData = {
        passkey: PASSKEYS.MASTER,
        timestamp: Date.now()
      };
      
      await set(ref(getDatabase(), '_auth'), authData);
      
      // Piccola pausa per assicurarsi che _auth sia impostato
      await new Promise(resolve => setTimeout(resolve, 100));

      // Salva su Firebase (formato oggetto)
      const debatesObject = updatedDebates.reduce((acc, debate) => {
        acc[debate.id] = debate;
        return acc;
      }, {} as Record<number, Debate>);
      
      await set(ref(getDatabase(), 'debates'), debatesObject);
      
      // Rimuove il campo _auth dopo il salvataggio
      await set(ref(getDatabase(), '_auth'), null);
      
      console.log('Match salvati con successo su Firebase');
      
    } catch (err) {
      console.error('Errore nel salvataggio dei match:', err);
      throw err;
    }
  };

  useEffect(() => {
    // Carica i dibattiti immediatamente
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
      alert('Errore nel cambio di stato del match. Riprova.');
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

    // Controllo se l'utente può votare per questo dibattito
    if (!checkCanVote(debateId)) {
      alert('Hai già votato per questo match o stai tentando di votare troppo velocemente!');
      return;
    }

    setVoteConfirmed(debateId);

    try {
      setIsLoading(true);
      
      // Invia il voto al server Firebase
      const isFighter1 = selectedFighterId === debate.fighter1.id;
      
      // Invia 1 voto per il fighter selezionato e 0 per l'altro
      await FirebaseService.sendVote(
        debateId, 
        isFighter1 ? 1 : 0, 
        isFighter1 ? 0 : 1,
        selectedFighterId
      );

      // Registra il voto dell'utente
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

  const isFighterSelected = (debateId: number, fighterId: number) => {
    return temporaryVotes[debateId] === fighterId;
  };

  // Verificare se un utente ha già votato per un dibattito specifico
  const hasVoted = (debateId: number) => {
    return !checkCanVote(debateId);
  };

  return (
    <div className="quadratic-voting">
      {(isLoading || isStorageLoading) && (
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
          {isMaster ? (
            <p className="user-status">Account Master</p>
          ) : (
            <p className="user-status">Account Utente</p>
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
              <div className="already-voted-badge">Hai già votato</div>
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
                    {isFighterSelected(debate.id, debate.fighter1.id) ? 'Selezionato' : 'Seleziona'}
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
                    {isFighterSelected(debate.id, debate.fighter2.id) ? 'Selezionato' : 'Seleziona'}
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
              {debate.status === 'VOTE' && (hasVoted(debate.id) ? 'Hai già votato' : 'Conferma voto')}
              {debate.status === 'CLOSED' && 'Closed'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}; 