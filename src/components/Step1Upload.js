import React, { useState } from 'react';
import './Step1Upload.css';

const Step1Upload = ({ uploadedFiles, setUploadedFiles, onNext }) => {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      return validTypes.includes(file.type);
    });

    const newFiles = validFiles.map(file => ({
      id: Date.now() + Math.random(),
      file: file,
      name: file.name,
      type: file.type,
      size: file.size,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }));

    setUploadedFiles([...uploadedFiles, ...newFiles]);
  };

  const removeFile = (id) => {
    setUploadedFiles(uploadedFiles.filter(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return file.id !== id;
    }));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="step1-upload">
      <h2>Step 1: Upload Documents</h2>
      <p className="step-description">
        Please upload the tenant's ID document and FICA documents (PDF, JPG, or PNG format)
      </p>

      <div
        className={`upload-area ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="upload-icon">📄</div>
        <p className="upload-text">
          Drag and drop your files here, or{' '}
          <label className="upload-label">
            browse
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleChange}
              style={{ display: 'none' }}
            />
          </label>
        </p>
        <p className="upload-hint">Supports: PDF, JPG, PNG (Max 10MB per file)</p>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="uploaded-files">
          <h3>Uploaded Files ({uploadedFiles.length})</h3>
          <div className="files-list">
            {uploadedFiles.map((file) => (
              <div key={file.id} className="file-item">
                {file.preview ? (
                  <img src={file.preview} alt={file.name} className="file-preview" />
                ) : (
                  <div className="file-icon">📄</div>
                )}
                <div className="file-info">
                  <div className="file-name">{file.name}</div>
                  <div className="file-details">
                    {formatFileSize(file.size)} • {file.type.split('/')[1].toUpperCase()}
                  </div>
                </div>
                <button
                  className="remove-file-btn"
                  onClick={() => removeFile(file.id)}
                  aria-label="Remove file"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="button-group">
        <div></div>
        <button
          className="btn btn-primary"
          onClick={onNext}
          disabled={uploadedFiles.length === 0}
        >
          Next: Extract Data
        </button>
      </div>
    </div>
  );
};

export default Step1Upload;


















