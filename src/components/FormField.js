import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import './FormField.css';

const FormField = ({ 
  label, 
  error, 
  success, 
  required = false,
  children,
  hint,
  className = ''
}) => {
  return (
    <div className={`form-field ${className} ${error ? 'form-field-error' : ''} ${success ? 'form-field-success' : ''}`}>
      {label && (
        <label className="form-field-label">
          {label}
          {required && <span className="form-field-required">*</span>}
        </label>
      )}
      <div className="form-field-input-wrapper">
        {children}
        {error && (
          <div className="form-field-feedback form-field-error-message">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
        {success && !error && (
          <div className="form-field-feedback form-field-success-message">
            <CheckCircle size={16} />
            <span>{success}</span>
          </div>
        )}
        {hint && !error && !success && (
          <div className="form-field-hint">{hint}</div>
        )}
      </div>
    </div>
  );
};

export default FormField;







