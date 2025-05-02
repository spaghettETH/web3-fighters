import { useEffect, useState } from 'react';
import './Preloader.css';

const Preloader = () => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="preloader">
      <div className="preloader-content">
        <img src="/assets/logoCol.png" alt="Web3 Fighters Logo" className="preloader-logo" />
        <div className="preloader-spinner"></div>
      </div>
    </div>
  );
};

export default Preloader; 