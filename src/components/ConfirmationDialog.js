import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import './ConfirmationDialog.css';

const ConfirmationDialog = ({ 
  isOpen, 
  title, 
  message, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel',
  onConfirm, 
  onCancel,
  type = 'warning' // warning, danger, info
}) => {
  if (!isOpen) return null;

  const typeStyles = {
    warning: 'confirmation-warning',
    danger: 'confirmation-danger',
    info: 'confirmation-info'
  };

  return (
    <div className="confirmation-overlay" onClick={onCancel}>
      <div className={`confirmation-dialog ${typeStyles[type]}`} onClick={(e) => e.stopPropagation()}>
        <div className="confirmation-header">
          <AlertTriangle size={24} className="confirmation-icon" />
          <h3 className="confirmation-title">{title}</h3>
          <button onClick={onCancel} className="confirmation-close">
            <X size={20} />
          </button>
        </div>
        <div className="confirmation-body">
          <p className="confirmation-message">{message}</p>
        </div>
        <div className="confirmation-footer">
          <button onClick={onCancel} className="confirmation-button-cancel">
            {cancelText}
          </button>
          <button onClick={onConfirm} className="confirmation-button-confirm">
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;







