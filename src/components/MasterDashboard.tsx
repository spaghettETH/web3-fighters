import { Debate } from '../types';
import { FaTrash } from 'react-icons/fa';
import { useAuth } from '../hooks/useAuth';

interface MasterDashboardProps {
  debates: Debate[];
  onStatusChange: (debateId: number, newStatus: 'PENDING' | 'VOTE' | 'CLOSED') => void;
  onDeleteMatch: (debateId: number) => void;
}

export const MasterDashboard = ({ debates, onStatusChange, onDeleteMatch }: MasterDashboardProps) => {
  const { isMaster } = useAuth();

  if (!isMaster) return null;

  return (
    <div className="master-dashboard">
      <h2>Master Dashboard</h2>
      <div className="debates-list">
        {debates.map(debate => (
          <div key={debate.id} className="debate-control">
            <div className="debate-header">
              <h3>{debate.title || `Dibattito #${debate.id}`}</h3>
              <button 
                className="delete-button"
                onClick={() => onDeleteMatch(debate.id)}
                title="Elimina match"
              >
                <FaTrash />
              </button>
            </div>
            <div className="status-controls">
              <button 
                onClick={() => onStatusChange(debate.id, 'PENDING')}
                className={debate.status === 'PENDING' ? 'active' : ''}
              >
                PENDING
              </button>
              <button 
                onClick={() => onStatusChange(debate.id, 'VOTE')}
                className={debate.status === 'VOTE' ? 'active' : ''}
              >
                VOTE
              </button>
              <button 
                onClick={() => onStatusChange(debate.id, 'CLOSED')}
                className={debate.status === 'CLOSED' ? 'active' : ''}
              >
                CLOSED
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 