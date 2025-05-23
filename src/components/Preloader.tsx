import { useState, useEffect } from 'react';
import './Preloader.css';

interface PreloaderProps {
  message?: string;
}

const Preloader = ({ message = 'Caricamento in corso...' }: PreloaderProps) => {
  return (
    <div className="preloader">
      <div className="preloader-content">
        <img src="/assets/logoCol.png" alt="Web3 Fighters Logo" className="preloader-logo" />
        <div className="preloader-spinner"></div>
        <div className="preloader-message">{message}</div>
      </div>
    </div>
  );
};

export default Preloader; 