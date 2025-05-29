import React, { useState } from 'react';
import { Debate, Fighter } from '../types';
import { useFirebaseStorage } from '../hooks/useFirebaseStorage';
import './MatchCreator.css';

interface MatchCreatorProps {
  onCreateMatch: (debate: Debate) => void;
}

export const MatchCreator = ({ onCreateMatch }: MatchCreatorProps) => {
  const { uploadImage, isLoading, error } = useFirebaseStorage();
  const [title, setTitle] = useState('');
  const [fighter1, setFighter1] = useState<Fighter>({
    id: 1,
    name: '',
    imageUrl: '',
    votes: 0
  });
  const [fighter2, setFighter2] = useState<Fighter>({
    id: 2,
    name: '',
    imageUrl: '',
    votes: 0
  });
  const [uploadStatus, setUploadStatus] = useState<{
    fighter1: boolean;
    fighter2: boolean;
  }>({
    fighter1: false,
    fighter2: false
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, fighter: 'fighter1' | 'fighter2') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadStatus(prev => ({ ...prev, [fighter]: true }));
      
      // Carica direttamente su Firebase Storage
      const imageUrl = await uploadImage(file);
      
      if (fighter === 'fighter1') {
        setFighter1(prev => ({ 
          ...prev, 
          imageUrl: imageUrl // URL diretto da Firebase Storage
        }));
      } else {
        setFighter2(prev => ({ 
          ...prev, 
          imageUrl: imageUrl
        }));
      }
    } catch (err) {
      console.error('Errore durante l\'upload:', err);
      alert('Errore durante l\'upload dell\'immagine. Riprova.');
    } finally {
      setUploadStatus(prev => ({ ...prev, [fighter]: false }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !fighter1.name || !fighter2.name || !fighter1.imageUrl || !fighter2.imageUrl) {
      alert('Per favore, compila tutti i campi e carica le immagini per entrambi i fighter');
      return;
    }

    const newDebate: Debate = {
      id: Date.now(),
      title,
      fighter1,
      fighter2,
      status: 'PENDING',
      totalVotes: 0
    };

    onCreateMatch(newDebate);
    
    // Reset form
    setTitle('');
    setFighter1({
      id: 1,
      name: '',
      imageUrl: '',
      votes: 0
    });
    setFighter2({
      id: 2,
      name: '',
      imageUrl: '',
      votes: 0
    });
  };

  return (
    <div className="match-creator">
      <h2>Crea Nuovo Match</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="title-input">
          <label htmlFor="title">Titolo Match</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Inserisci il titolo del match"
            required
          />
        </div>
        <div className="fighter-inputs">
          <div className="fighter-input">
            <label htmlFor="fighter1">Nome Fighter 1</label>
            <input
              type="text"
              id="fighter1"
              value={fighter1.name}
              onChange={(e) => setFighter1(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Inserisci il nome del fighter 1"
              required
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, 'fighter1')}
              required
              disabled={uploadStatus.fighter1}
            />
            {uploadStatus.fighter1 && <div className="loading">Caricamento in corso...</div>}
            {fighter1.imageUrl && (
              <div className="image-preview">
                <img src={fighter1.imageUrl} alt="Fighter 1" />
              </div>
            )}
          </div>
          <div className="fighter-input">
            <label htmlFor="fighter2">Nome Fighter 2</label>
            <input
              type="text"
              id="fighter2"
              value={fighter2.name}
              onChange={(e) => setFighter2(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Inserisci il nome del fighter 2"
              required
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, 'fighter2')}
              required
              disabled={uploadStatus.fighter2}
            />
            {uploadStatus.fighter2 && <div className="loading">Caricamento in corso...</div>}
            {fighter2.imageUrl && (
              <div className="image-preview">
                <img src={fighter2.imageUrl} alt="Fighter 2" />
              </div>
            )}
          </div>
        </div>
        <button 
          type="submit" 
          disabled={isLoading || uploadStatus.fighter1 || uploadStatus.fighter2}
        >
          {isLoading ? 'Creazione in corso...' : 'Crea Match'}
        </button>
      </form>
    </div>
  );
}; 