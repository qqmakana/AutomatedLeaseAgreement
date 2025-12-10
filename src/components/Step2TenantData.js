import React, { useState, useEffect } from 'react';
import { Loader2, Upload, FileText, X, Star, Check, AlertCircle } from 'lucide-react';
import './Step2TenantData.css';
import { parseExtractedData } from '../utils/clientOCR';
import { generateLeaseDocument } from '../utils/leaseGenerator';
import { leasesAPI } from '../services/api';
import { toast } from '../utils/toast';

const Step2TenantData = ({ tenantData, setTenantData, leaseDetails, setLeaseDetails, onNext, onBack, uploadedFiles, setUploadedFiles }) => {
  const [pastedIdText, setPastedIdText] = useState('');
  const [pastedFicaText, setPastedFicaText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showLeaseOptions, setShowLeaseOptions] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [hasDefaultLandlord, setHasDefaultLandlord] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState([]);

  // Check for default landlord on mount and load it into form
  useEffect(() => {
    const defaultLandlord = localStorage.getItem('defaultLandlord');
    if (defaultLandlord) {
      try {
        const landlordData = JSON.parse(defaultLandlord);
        setHasDefaultLandlord(true);
        // Auto-populate lease details with default landlord
        setLeaseDetails(prev => ({
          ...prev,
          landlordName: landlordData.name || prev.landlordName || '',
          landlordRegNo: landlordData.regNo || prev.landlordRegNo || '',
          landlordVatNo: landlordData.vatNo || prev.landlordVatNo || '',
          landlordPhone: landlordData.phone || prev.landlordPhone || '',
          landlordBank: landlordData.bank || prev.landlordBank || '',
          landlordBranch: landlordData.branch || prev.landlordBranch || '',
          landlordAccountNo: landlordData.accountNo || prev.landlordAccountNo || '',
          landlordBranchCode: landlordData.branchCode || prev.landlordBranchCode || ''
        }));
        toast.success('✨ Default landlord loaded automatically!');
      } catch (e) {
        console.error('Error loading default landlord:', e);
      }
    }
  }, [setLeaseDetails]);

  // Handle multiple file uploads
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const newDocs = files.map((file, index) => ({
      id: Date.now() + index,
      file: file,
      name: file.name,
      type: file.type,
      size: file.size,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }));
    setUploadedDocuments([...uploadedDocuments, ...newDocs]);
    toast.success(`${files.length} document(s) uploaded successfully!`);
  };

  const removeDocument = (id) => {
    const doc = uploadedDocuments.find(d => d.id === id);
    if (doc?.preview) {
      URL.revokeObjectURL(doc.preview);
    }
    setUploadedDocuments(uploadedDocuments.filter(d => d.id !== id));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleSetDefaultLandlord = () => {
    try {
      if (hasDefaultLandlord) {
        localStorage.removeItem('defaultLandlord');
        setHasDefaultLandlord(false);
        toast.success('Default landlord removed');
      } else {
        // Get landlord data from leaseDetails
        const landlordData = {
          name: leaseDetails.landlordName || '',
          regNo: leaseDetails.landlordRegNo || '',
          vatNo: leaseDetails.landlordVatNo || '',
          phone: leaseDetails.landlordPhone || '',
          bank: leaseDetails.landlordBank || '',
          branch: leaseDetails.landlordBranch || '',
          accountNo: leaseDetails.landlordAccountNo || '',
          branchCode: leaseDetails.landlordBranchCode || ''
        };
        
        if (!landlordData.name || landlordData.name.trim() === '') {
          toast.warning('Please fill in landlord information first before setting as default.');
          return;
        }
        
        localStorage.setItem('defaultLandlord', JSON.stringify(landlordData));
        setHasDefaultLandlord(true);
        toast.success('✅ Default landlord saved!');
      }
    } catch (error) {
      console.error('Error saving default landlord:', error);
      toast.error('Error saving default landlord. Please try again.');
    }
  };

  const handleCreateLease = () => {
    const combinedText = `${pastedIdText}\n\n${pastedFicaText}`.trim();
    
    if (!combinedText || combinedText.length === 0) {
      setError('Please paste text from at least one document (ID or FICA)');
      return;
    }

    setIsProcessing(true);
    setError('');
    setSuccess('');

    try {
      console.log('📋 Processing pasted text to create lease...');
      const extractedData = parseExtractedData(combinedText);
      
      console.log('📋 Extracted data:', extractedData);
      
      // Check if we got essential data
      if (!extractedData.idNumber && !extractedData.fullName && !extractedData.companyName) {
        setError('Could not find ID number or name in pasted text. Please check the text and try again.');
        setIsProcessing(false);
        return;
      }

      // Fill tenant data with extracted information
      let tenantName = '';
      
      // Prioritize companyName, but validate it's not a bank name
      if (extractedData.companyName) {
        const bankNames = ['standard bank', 'nedbank', 'absa', 'fnb', 'capitec', 'investec', 'first national bank', 'african bank'];
        const lowerCompanyName = extractedData.companyName.toLowerCase();
        if (!bankNames.some(bank => lowerCompanyName.includes(bank))) {
          tenantName = extractedData.companyName;
        }
      }
      
      // Fallback to fullName if companyName not available or was rejected
      if (!tenantName && extractedData.fullName) {
        const bankNames = ['standard bank', 'nedbank', 'absa', 'fnb', 'capitec', 'investec', 'first national bank', 'african bank'];
        const lowerFullName = extractedData.fullName.toLowerCase();
        if (!bankNames.some(bank => lowerFullName.includes(bank))) {
          tenantName = extractedData.fullName;
        }
      }
      
      const updatedTenantData = {
        fullName: tenantName,
        idNumber: extractedData.idNumber || '',
        email: extractedData.email || '',
        phone: extractedData.phone || '',
        address: extractedData.address || '',
        employment: extractedData.employment || '',
        income: extractedData.income || '',
        regNo: extractedData.regNo || '',
        vatNo: extractedData.vatNo || '',
        tradingAs: extractedData.tradingAs || '',
        bankName: extractedData.bankName || '',
        bankAccountNumber: extractedData.bankAccountNumber || '',
        bankBranchCode: extractedData.bankBranchCode || '',
        bankAccountType: extractedData.bankAccountType || '',
        bankAccountHolder: extractedData.bankAccountHolder || ''
      };
      
      setTenantData(updatedTenantData);
      setExtractedData(updatedTenantData);
      setIsProcessing(false);
      setShowLeaseOptions(true);
      setSuccess('Data extracted successfully! Choose an option below:');

    } catch (err) {
      console.error('Error processing pasted text:', err);
      setError('Error processing pasted text. Please check the text format and try again.');
      setIsProcessing(false);
    }
  };

  const handleClearForm = () => {
    setPastedIdText('');
    setPastedFicaText('');
    setTenantData({
      fullName: '',
      idNumber: '',
      email: '',
      phone: '',
      address: '',
      employment: '',
      income: '',
      regNo: '',
      vatNo: '',
      tradingAs: '',
      bankName: '',
      bankAccountNumber: '',
      bankBranchCode: '',
      bankAccountType: '',
      bankAccountHolder: ''
    });
    setExtractedData(null);
    setShowLeaseOptions(false);
    setError('');
    setSuccess('');
    setUploadedDocuments([]);
  };

  const handleGeneratePDFNow = async () => {
    if (!extractedData) {
      setError('Please extract data first by clicking "Extract Data from Documents"');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Load default landlord from localStorage
      const defaultLandlord = localStorage.getItem('defaultLandlord');
      let landlordData = {};
      if (defaultLandlord) {
        try {
          landlordData = JSON.parse(defaultLandlord);
        } catch (e) {
          console.error('Error parsing default landlord:', e);
        }
      }

      // Get today's date for defaults
      const today = new Date();
      const oneYearLater = new Date(today);
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
      
      const formatDate = (date) => date.toISOString().split('T')[0];

      // Prepare lease data in the format expected by backend Puppeteer service
      const leaseData = {
        tenant: {
          name: extractedData.companyName || extractedData.fullName || '',
          regNo: extractedData.regNo || '',
          vatNo: extractedData.vatNo || '',
          tradingAs: extractedData.tradingAs || extractedData.companyName || '',
          postalAddress: extractedData.address || '',
          physicalAddress: extractedData.address || '',
          bankName: extractedData.bankName || '',
          bankAccountNumber: extractedData.bankAccountNumber || '',
          bankBranchCode: extractedData.bankBranchCode || '',
          bankAccountType: extractedData.bankAccountType || '',
          bankAccountHolder: extractedData.bankAccountHolder || ''
        },
        landlord: {
          name: landlordData.name || leaseDetails.landlordName || '',
          regNo: landlordData.regNo || leaseDetails.landlordRegNo || '',
          vatNo: landlordData.vatNo || leaseDetails.landlordVatNo || '',
          phone: landlordData.phone || leaseDetails.landlordPhone || '',
          bank: landlordData.bank || leaseDetails.landlordBank || '',
          branch: landlordData.branch || leaseDetails.landlordBranch || '',
          accountNo: landlordData.accountNo || leaseDetails.landlordAccountNo || '',
          branchCode: landlordData.branchCode || leaseDetails.landlordBranchCode || ''
        },
        surety: {
          name: leaseDetails.suretyName || '',
          idNumber: leaseDetails.suretyId || '',
          address: leaseDetails.suretyAddress || ''
        },
        premises: {
          unit: leaseDetails.premisesUnit || '',
          buildingName: leaseDetails.buildingName || '',
          buildingAddress: leaseDetails.buildingAddress || '',
          size: leaseDetails.premisesSize || '',
          percentage: leaseDetails.percentage || '',
          permittedUse: leaseDetails.permittedUse || ''
        },
        lease: {
          years: leaseDetails.leaseYears || 3,
          months: leaseDetails.leaseMonths || 0,
          commencementDate: leaseDetails.leaseStartDate || formatDate(today),
          terminationDate: leaseDetails.leaseEndDate || formatDate(oneYearLater),
          optionYears: leaseDetails.optionYears || 3,
          optionMonths: leaseDetails.optionMonths || 0,
          optionExerciseDate: leaseDetails.optionExerciseDate || ''
        },
        financial: {
          year1: {
            basicRent: leaseDetails.monthlyRent || '',
            security: leaseDetails.securityDeposit || '',
            sewerageWater: leaseDetails.utilities || '',
            refuse: leaseDetails.refuse || '',
            rates: leaseDetails.rates || '',
            from: leaseDetails.leaseStartDate || formatDate(today),
            to: leaseDetails.leaseEndDate || formatDate(oneYearLater)
          },
          year2: {},
          year3: {},
          deposit: leaseDetails.securityDeposit || '',
          turnoverPercentage: leaseDetails.turnoverPercentage || '',
          financialYearEnd: leaseDetails.financialYearEnd || '',
          minimumTurnover: leaseDetails.minimumTurnover || '',
          advertisingContribution: leaseDetails.advertisingContribution || '',
          leaseFee: leaseDetails.leaseFee || ''
        }
      };

      console.log('📋 Sending FICA text to backend for extraction and PDF generation...');
      
      // Send raw FICA text to backend
      const payload = {
        ficaText: pastedFicaText || ''
      };

      // Call backend PDF generation using API service
      const pdfBlob = await leasesAPI.generatePDFFromData(payload);
      
      // Download PDF
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = `Lease_Agreement_${(extractedData.companyName || extractedData.fullName || 'Tenant').replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('PDF generated successfully!');
      setSuccess('Lease agreement PDF generated and downloaded!');
      
      // Clear form after generating lease
      setTimeout(() => {
        handleClearForm();
      }, 2000);
    } catch (err) {
      console.error('PDF generation error:', err);
      setError(`PDF generation failed: ${err.message}`);
      toast.error('PDF generation failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="step2-tenant-data-modern">
      {/* Header Section */}
      <div className="modern-header">
        <div className="header-content">
          <FileText size={32} className="header-icon" />
          <div>
            <h1 className="header-title">Document Extraction & Lease Generation</h1>
            <p className="header-subtitle">Upload or paste your documents to automatically extract tenant information</p>
          </div>
        </div>
        <button
          onClick={handleSetDefaultLandlord}
          className={`default-btn ${hasDefaultLandlord ? 'default-active' : ''}`}
          title={hasDefaultLandlord ? 'Click to remove default landlord' : 'Click to set default landlord'}
        >
          <Star size={20} fill={hasDefaultLandlord ? 'currentColor' : 'none'} />
          {hasDefaultLandlord ? 'Default Set' : 'Set Default Landlord'}
        </button>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="alert alert-error">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <Check size={20} />
          <span>{success}</span>
        </div>
      )}

      {/* File Upload Section */}
      <div className="upload-section">
        <div className="upload-header">
          <Upload size={24} />
          <div className="upload-header-content">
            <h3>Upload Documents (Multiple Pages Supported)</h3>
            {uploadedDocuments.length > 0 && (
              <span className="upload-counter">{uploadedDocuments.length} file{uploadedDocuments.length > 1 ? 's' : ''} uploaded</span>
            )}
          </div>
        </div>
        <div className="upload-area">
          <input
            type="file"
            id="file-upload"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          <label htmlFor="file-upload" className="upload-label">
            <Upload size={48} className="upload-icon" />
            <p className="upload-text">Click to upload or drag and drop</p>
            <p className="upload-subtext">PDF, JPG, PNG (max 10MB per file)</p>
          </label>
        </div>

        {/* Uploaded Documents Display */}
        {uploadedDocuments.length > 0 && (
          <div className="uploaded-docs-grid">
            {uploadedDocuments.map((doc) => (
              <div key={doc.id} className="doc-card">
                {doc.preview && (
                  <img src={doc.preview} alt={doc.name} className="doc-preview" />
                )}
                {!doc.preview && (
                  <div className="doc-icon-placeholder">
                    <FileText size={32} />
                  </div>
                )}
                <div className="doc-info">
                  <p className="doc-name">{doc.name}</p>
                  <p className="doc-size">{formatFileSize(doc.size)}</p>
                </div>
                <button
                  onClick={() => removeDocument(doc.id)}
                  className="doc-remove"
                  title="Remove document"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Paste Text Section */}
      <div className="paste-section">
        <div className="paste-grid">
          <div className="paste-field">
            <label className="paste-label">
              <FileText size={20} />
              ID Document Text
            </label>
            <textarea
              value={pastedIdText}
              onChange={(e) => setPastedIdText(e.target.value)}
              placeholder="Paste text from your ID document here...

Example:
Name: John Doe
ID Number: 1234567890123
Date of Birth: 01/01/1990"
              rows="10"
              disabled={isProcessing}
              className="paste-textarea"
            />
            <p className="paste-tip">
              💡 Open your ID document → Select all (Ctrl+A) → Copy (Ctrl+C) → Paste here (Ctrl+V)
            </p>
          </div>

          <div className="paste-field">
            <label className="paste-label">
              <FileText size={20} />
              FICA Document Text
            </label>
            <textarea
              value={pastedFicaText}
              onChange={(e) => setPastedFicaText(e.target.value)}
              placeholder="Paste text from your FICA document here...

Example:
Address: 123 Main St, Johannesburg
Employment: Software Developer
Income: R50,000/month
Bank: Standard Bank
Account Number: 123456789"
              rows="10"
              disabled={isProcessing}
              className="paste-textarea"
            />
            <p className="paste-tip">
              💡 Open your FICA document → Select all (Ctrl+A) → Copy (Ctrl+C) → Paste here (Ctrl+V)
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button
            onClick={handleCreateLease}
            disabled={isProcessing || ((!pastedIdText || pastedIdText.trim().length === 0) && (!pastedFicaText || pastedFicaText.trim().length === 0))}
            className="btn btn-primary btn-lg"
          >
            {isProcessing ? (
              <>
                <Loader2 size={20} className="spinner" />
                Extracting Data...
              </>
            ) : (
              <>
                <FileText size={20} />
                Extract Data from Documents
              </>
            )}
          </button>
          
          {(pastedIdText || pastedFicaText || extractedData) && (
            <button
              onClick={handleClearForm}
              disabled={isProcessing}
              className="btn btn-secondary"
            >
              <X size={20} />
              Clear Form
            </button>
          )}
        </div>
      </div>

      {/* Extracted Data Preview - CENTERED */}
      {showLeaseOptions && extractedData && (
        <div className="extracted-preview-center">
          <div className="preview-card">
            <div className="preview-header">
              <Check size={24} className="check-icon" />
              <h3>Extracted Data Preview</h3>
            </div>
            <div className="preview-grid">
              <div className="preview-item">
                <span className="preview-label">Company/Name:</span>
                <span className="preview-value">{extractedData.companyName || extractedData.fullName || 'N/A'}</span>
              </div>
              <div className="preview-item">
                <span className="preview-label">Reg No:</span>
                <span className="preview-value">{extractedData.regNo || 'N/A'}</span>
              </div>
              <div className="preview-item">
                <span className="preview-label">VAT No:</span>
                <span className="preview-value">{extractedData.vatNo || 'N/A'}</span>
              </div>
              <div className="preview-item">
                <span className="preview-label">Trading As:</span>
                <span className="preview-value">{extractedData.tradingAs || 'N/A'}</span>
              </div>
              <div className="preview-item preview-item-full">
                <span className="preview-label">Bank Name:</span>
                <span className="preview-value">{extractedData.bankName || 'N/A'}</span>
              </div>
              <div className="preview-item">
                <span className="preview-label">Bank Account:</span>
                <span className="preview-value">{extractedData.bankAccountNumber || 'N/A'}</span>
              </div>
              <div className="preview-item">
                <span className="preview-label">Branch Code:</span>
                <span className="preview-value">{extractedData.bankBranchCode || 'N/A'}</span>
              </div>
              <div className="preview-item">
                <span className="preview-label">Account Type:</span>
                <span className="preview-value">{extractedData.bankAccountType || 'N/A'}</span>
              </div>
              <div className="preview-item">
                <span className="preview-label">Account Holder:</span>
                <span className="preview-value">{extractedData.bankAccountHolder || 'N/A'}</span>
              </div>
            </div>

            {/* Generate Options */}
            <div className="generate-options">
              <h4>Generate Lease Agreement</h4>
              <p className="generate-hint">Choose how you want to proceed:</p>
              
              <div className="generate-buttons">
                <button
                  onClick={handleGeneratePDFNow}
                  disabled={isProcessing}
                  className="btn btn-pdf"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={20} className="spinner" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText size={20} />
                      Generate PDF Now
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => {
                    setLeaseDetails({
                      ...leaseDetails,
                      propertyAddress: leaseDetails.propertyAddress || '',
                      propertyType: leaseDetails.propertyType || '',
                      landlordName: leaseDetails.landlordName || '',
                      landlordEmail: leaseDetails.landlordEmail || '',
                      landlordPhone: leaseDetails.landlordPhone || '',
                      leaseStartDate: leaseDetails.leaseStartDate || '',
                      leaseEndDate: leaseDetails.leaseEndDate || '',
                      monthlyRent: leaseDetails.monthlyRent || '',
                      securityDeposit: leaseDetails.securityDeposit || '',
                      utilities: leaseDetails.utilities || '',
                      maintenance: leaseDetails.maintenance || ''
                    });
                    onNext();
                  }}
                  className="btn btn-customize"
                >
                  <FileText size={20} />
                  Customize Lease Details First
                </button>
              </div>
              
              <p className="generate-note">
                <strong>Note:</strong> Generating now uses default values. For custom property details, rent amounts, and dates, click "Customize Lease Details First".
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      {onBack && (
        <div className="navigation-buttons">
          <button className="btn btn-back" onClick={onBack} disabled={isProcessing}>
            Back
          </button>
        </div>
      )}
    </div>
  );
};

export default Step2TenantData;
