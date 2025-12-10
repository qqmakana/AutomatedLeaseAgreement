import React from 'react';
import { Loader2 } from 'lucide-react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ size = 24, text = '', fullScreen = false }) => {
  if (fullScreen) {
    return (
      <div className="loading-spinner-fullscreen">
        <div className="loading-spinner-content">
          <Loader2 size={size} className="loading-spinner-icon" />
          {text && <p className="loading-spinner-text">{text}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="loading-spinner-inline">
      <Loader2 size={size} className="loading-spinner-icon" />
      {text && <span className="loading-spinner-text">{text}</span>}
    </div>
  );
};

export default LoadingSpinner;







