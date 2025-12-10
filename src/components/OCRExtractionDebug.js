import React, { useState } from 'react';
import './OCRExtractionDebug.css';

const OCRExtractionDebug = ({ extractedText, onClose }) => {
  const [showRawText, setShowRawText] = useState(false);

  return (
    <div className="ocr-debug-overlay">
      <div className="ocr-debug-modal">
        <h3>OCR Extraction Results</h3>
        <p className="debug-description">
          Review what was extracted from your document. This helps identify why certain fields might be missing.
        </p>

        <div className="debug-tabs">
          <button
            className={`tab-btn ${!showRawText ? 'active' : ''}`}
            onClick={() => setShowRawText(false)}
          >
            Extracted Fields
          </button>
          <button
            className={`tab-btn ${showRawText ? 'active' : ''}`}
            onClick={() => setShowRawText(true)}
          >
            Raw Text
          </button>
        </div>

        {showRawText ? (
          <div className="raw-text-display">
            <pre>{extractedText || 'No text extracted'}</pre>
          </div>
        ) : (
          <div className="extracted-fields">
            <div className="field-item">
              <strong>ID Number Found:</strong>
              <span className={extractedText?.match(/[0-9]{13}|[0-9]{6}\s+[0-9]{7}/) ? 'found' : 'not-found'}>
                {extractedText?.match(/[0-9]{13}|[0-9]{6}\s+[0-9]{7}/) ? '✅ Yes' : '❌ No'}
              </span>
            </div>
            <div className="field-item">
              <strong>Name Found:</strong>
              <span className={extractedText?.match(/name[:\s]+[A-Z]/i) ? 'found' : 'not-found'}>
                {extractedText?.match(/name[:\s]+[A-Z]/i) ? '✅ Yes' : '❌ No'}
              </span>
            </div>
            <div className="field-item">
              <strong>Email Found:</strong>
              <span className={extractedText?.match(/@/) ? 'found' : 'not-found'}>
                {extractedText?.match(/@/) ? '✅ Yes' : '❌ No'}
              </span>
            </div>
            <div className="field-item">
              <strong>Phone Found:</strong>
              <span className={extractedText?.match(/(\+27|0)[0-9]/) ? 'found' : 'not-found'}>
                {extractedText?.match(/(\+27|0)[0-9]/) ? '✅ Yes' : '❌ No'}
              </span>
            </div>
          </div>
        )}

        <div className="debug-actions">
          <button className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default OCRExtractionDebug;


















