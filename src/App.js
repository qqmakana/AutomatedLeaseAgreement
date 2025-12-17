import React, { useState, useEffect } from 'react';
import { Upload, FileText, Download, AlertCircle, CheckCircle, Building, User, Calendar, Receipt, Eye, Clipboard, Save, History, Star, Shield, FileCheck, X, ArrowLeft, Folder, Loader2, Trash2, LogOut, ChevronDown, Sparkles } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { processDocument } from './utils/documentParsers';
import { parseExtractedData } from './utils/clientOCR';
import { parseLeaseAgreement } from './utils/leaseParser';
import ToastContainer from './components/ToastContainer';
import { initToast, toast, removeToast } from './utils/toast';
import LoadingSpinner from './components/LoadingSpinner';
import ConfirmationDialog from './components/ConfirmationDialog';
import Login from './components/Login';
import { leasesAPI } from './services/api';
import './App.css';

const LeaseDraftingSystem = () => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    const authUser = localStorage.getItem('authUser');
    if (authUser) {
      try {
        const userData = JSON.parse(authUser);
        setCurrentUser(userData);
        setIsAuthenticated(true);
      } catch (e) {
        localStorage.removeItem('authUser');
      }
    }
  }, []);

  const handleLogin = (userData) => {
    setCurrentUser(userData);
    setIsAuthenticated(true);
    toast.success(`Welcome back, ${userData.name}!`);
  };

  const handleLogout = () => {
    localStorage.removeItem('authUser');
    setCurrentUser(null);
    setIsAuthenticated(false);
    setShowUserMenu(false);
    toast.info('Logged out successfully');
  };

  const [documents, setDocuments] = useState({
    landlordCIPC: [],
    tenantCIPC: [],
    tenantID: [],
    suretyID: []
  });

  const [extractedData, setExtractedData] = useState({
    landlord: {
      name: 'BENAV PROPERTIES (PTY) LTD',
      regNo: '2018/060720/07',
      vatNo: '4200288134',
      phone: '(0861) 999 118',
      bank: 'NEDBANK',
      branch: 'NORTHERN GAUTENG',
      accountNo: '120 459 4295',
      branchCode: '14690500'
    },
    tenant: {
      name: '',
      idNumber: '',
      regNo: '',
      vatNo: '',
      tradingAs: '',
      postalAddress: '',
      physicalAddress: '',
      bankName: '',
      bankAccountNumber: '',
      bankBranchCode: '',
      bankAccountType: '',
      bankAccountHolder: ''
    },
    surety: {
      name: '',
      idNumber: '',
      address: ''
    },
    premises: {
      unit: '',
      buildingName: '',
      buildingAddress: '',
      size: '',
      percentage: '',
      permittedUse: ''
    },
    lease: {
      years: 3,
      months: 0,
      commencementDate: '',
      terminationDate: '',
      optionYears: 3,
      optionMonths: 0,
      optionExerciseDate: ''
    },
    financial: {
      year1: { basicRent: '', security: '', refuse: '', rates: '', sewerageWater: '', from: '', to: '' },
      year2: { basicRent: '', security: '', refuse: '', rates: '', sewerageWater: '', from: '', to: '' },
      year3: { basicRent: '', security: '', refuse: '', rates: '', sewerageWater: '', from: '', to: '' },
      deposit: '',
      leaseFee: '750.00',
      utilities: 'METERED OR % AGE OF EXPENSE',
      turnoverPercentage: 'N/A',
      financialYearEnd: 'N/A',
      minimumTurnover: 'N/A',
      advertisingContribution: 'N/A',
      tenantBankAccount: 'N/A',
      ratesEffectiveDate: new Date().toISOString().split('T')[0] // Default to today's date
    }
  });

  const [showPreview, setShowPreview] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [processing, setProcessing] = useState({});
  const [processingErrors, setProcessingErrors] = useState({});
  const [showFinancialYear2, setShowFinancialYear2] = useState(true);
  const [showFinancialYear3, setShowFinancialYear3] = useState(true);
  const [pastedFicaText, setPastedFicaText] = useState('');
  const [pastedLeaseText, setPastedLeaseText] = useState('');
  const [drafts, setDrafts] = useState([]);
  const [leaseHistory, setLeaseHistory] = useState([]);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAuditTrailModal, setShowAuditTrailModal] = useState(false);
  const [showLeasePackagesModal, setShowLeasePackagesModal] = useState(false);
  const [hasDefaultLandlord, setHasDefaultLandlord] = useState(false);
  const [hasDefaultSurety, setHasDefaultSurety] = useState(false);
  const [auditTrail, setAuditTrail] = useState([]);
  const [leasePackages, setLeasePackages] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingWord, setIsGeneratingWord] = useState(false);
  const [isGeneratingLease, setIsGeneratingLease] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState(''); // '', 'saving', 'saved'
  const [downloadingHistoryId, setDownloadingHistoryId] = useState(null); // Track which history item is downloading
  const [downloadingSavedId, setDownloadingSavedId] = useState(null); // Track which saved lease is downloading
  const [isLoadingPreview, setIsLoadingPreview] = useState(false); // Track if preview is being generated
  const [verificationStatus, setVerificationStatus] = useState({
    landlordCIPC: { verified: false, date: null, regNo: null },
    tenantCIPC: { verified: false, date: null, regNo: null },
    tenantID: { verified: false, date: null, idNumber: null },
    suretyID: { verified: false, date: null, idNumber: null },
    fica: { verified: false, date: null }
  });

  // Count uploaded documents
  const uploadedDocumentsCount = Object.values(documents).reduce((total, files) => total + (Array.isArray(files) ? files.length : 0), 0);

  // Format date as DD/MM/YYYY for display in labels
  const formatDateDDMMYYYY = (dateString) => {
    if (!dateString) return '01/06/2025'; // Fallback
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Add to audit trail
  const addAuditEntry = (action, details) => {
    const entry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      action,
      details,
      userData: {
        tenant: extractedData?.tenant?.name || 'N/A',
        landlord: extractedData?.landlord?.name || 'N/A'
      }
    };
    setAuditTrail(prev => {
      const updatedTrail = [entry, ...prev].slice(0, 100); // Keep last 100 entries
      localStorage.setItem('auditTrail', JSON.stringify(updatedTrail));
      return updatedTrail;
    });
  };

  // Load drafts and history from localStorage on mount
  useEffect(() => {
    const savedDrafts = localStorage.getItem('leaseDrafts');
    const savedHistory = localStorage.getItem('leaseHistory');
    const savedDefaultLandlord = localStorage.getItem('defaultLandlord');
    const savedDefaultSurety = localStorage.getItem('defaultSurety');
    const savedAuditTrail = localStorage.getItem('auditTrail');
    const savedVerification = localStorage.getItem('verificationStatus');
    
    if (savedDrafts) {
      setDrafts(JSON.parse(savedDrafts));
    }
    if (savedHistory) {
      setLeaseHistory(JSON.parse(savedHistory));
    }
    if (savedDefaultLandlord) {
      setHasDefaultLandlord(true);
      const defaultData = JSON.parse(savedDefaultLandlord);
      setExtractedData(prev => ({
        ...prev,
        landlord: { ...prev.landlord, ...defaultData }
      }));
    }
    if (savedDefaultSurety) {
      setHasDefaultSurety(true);
      const defaultData = JSON.parse(savedDefaultSurety);
      setExtractedData(prev => ({
        ...prev,
        surety: { ...prev.surety, ...defaultData }
      }));
    }
    if (savedAuditTrail) {
      setAuditTrail(JSON.parse(savedAuditTrail));
    }
    if (savedVerification) {
      setVerificationStatus(JSON.parse(savedVerification));
    }
    const savedLeasePackages = localStorage.getItem('leasePackages');
    if (savedLeasePackages) {
      setLeasePackages(JSON.parse(savedLeasePackages));
    }
  }, []);

  const handleRemoveDocument = (type, index) => {
    // Remove specific document from array
    setDocuments(prev => {
      const updated = { ...prev };
      updated[type] = prev[type].filter((_, i) => i !== index);
      return updated;
    });
    
    // Clear processing errors for this specific file if it was the last one
    setDocuments(prev => {
      if (prev[type].length === 0) {
        setProcessingErrors(prevErrors => ({ ...prevErrors, [type]: null }));
      }
      return prev;
    });
    
    // Add to audit trail
    addAuditEntry(`Document Removed: ${type}`, {
      action: 'user_removed_document',
      index
    });
  };

  const handleFileUpload = async (type, files) => {
    if (!files || files.length === 0) return;

    // Convert FileList to Array
    const filesArray = Array.from(files);
    
    // Add files to documents array
    setDocuments(prev => ({
      ...prev,
      [type]: [...(prev[type] || []), ...filesArray]
    }));

    // Process each file
    for (const file of filesArray) {
      setProcessing(prev => ({ ...prev, [type]: true }));
      setProcessingErrors(prev => ({ ...prev, [type]: null }));

      try {
        let documentType = 'cipc';
        if (type === 'tenantID' || type === 'suretyID') {
          documentType = 'id';
        }

        const result = await processDocument(file, documentType);
        
        if (result.success) {
          // Documents are uploaded for verification/storage only
          // Form fields are populated ONLY by pasted text, not by uploaded documents
        
        // Update verification status - mark as verified when document processes successfully
        const newVerification = {
          ...verificationStatus,
          [type]: { 
            verified: true, 
            date: new Date().toISOString(),
            regNo: result.parsedData?.regNo || null, // Store registration number for display
            idNumber: result.parsedData?.idNumber || null // Store ID number for display
          }
        };
        setVerificationStatus(newVerification);
        localStorage.setItem('verificationStatus', JSON.stringify(newVerification));
        
          // Add to audit trail
          addAuditEntry(`Document Uploaded: ${type}`, {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            extractedFields: Object.keys(result.parsedData || {}),
            documentType: documentType
          });
        }
      } catch (error) {
        console.error(`Error processing ${type}:`, error);
        
        // Format error message professionally
        let errorMessage = 'Failed to process document. ';
        if (error.message && error.message.includes('PDF processing')) {
          errorMessage = error.message;
        } else if (error.message && error.message.includes('worker') || error.message.includes('fetch')) {
          errorMessage = 'PDF processing service is temporarily unavailable. Please convert your PDF to a text file (.txt) or image format (PNG/JPG) and upload that instead.';
        } else {
          errorMessage += error.message || 'Please try again or enter data manually.';
        }
        
        setProcessingErrors(prev => ({ 
          ...prev, 
          [type]: errorMessage
        }));
        
        // Add error to audit trail
        addAuditEntry(`Document Upload Failed: ${type}`, {
          fileName: file.name,
          error: error.message
        });
      } finally {
        setProcessing(prev => ({ ...prev, [type]: false }));
      }
    }
  };

  const handlePasteFica = () => {
    if (!pastedFicaText || pastedFicaText.trim().length === 0) {
      setProcessingErrors(prev => ({ ...prev, pastedFica: 'Please paste FICA document text' }));
      return;
    }

    setProcessing(prev => ({ ...prev, pastedFica: true }));
    setProcessingErrors(prev => ({ ...prev, pastedFica: null }));

    try {
      console.log('Pasting FICA text, length:', pastedFicaText.length);
      const extracted = parseExtractedData(pastedFicaText);
      console.log('Extracted data:', extracted);
      
      // Update tenant information with extracted data
      const updates = {
        tenant: {
          ...extractedData.tenant,
          name: extracted.fullName || extractedData.tenant.name,
          idNumber: extracted.idNumber || extractedData.tenant.idNumber || '',
          regNo: extracted.regNo || extractedData.tenant.regNo,
          vatNo: extracted.vatNo || extractedData.tenant.vatNo,
          tradingAs: extracted.tradingAs || extractedData.tenant.tradingAs,
          physicalAddress: extracted.address || extractedData.tenant.physicalAddress,
          postalAddress: extracted.address || extractedData.tenant.postalAddress,
          bankName: extracted.bankName || extractedData.tenant.bankName || '',
          bankAccountNumber: extracted.bankAccountNumber || extractedData.tenant.bankAccountNumber || '',
          bankBranchCode: extracted.bankBranchCode || extractedData.tenant.bankBranchCode || '',
          bankAccountType: extracted.bankAccountType || extractedData.tenant.bankAccountType || '',
          bankAccountHolder: extracted.bankAccountHolder || extractedData.tenant.bankAccountHolder || '',
        },
        surety: {
          ...extractedData.surety,
          // Don't populate surety with tenant data - surety should be different person/entity
          // Leave surety fields blank so they can be filled manually if needed
        }
      };

      setExtractedData(prev => ({ ...prev, ...updates }));
      setProcessing(prev => ({ ...prev, pastedFica: false }));
      
      // Update FICA verification status
      setVerificationStatus(prev => ({
        ...prev,
        fica: { verified: true, date: new Date().toISOString() }
      }));
      
      // Add to audit trail
      addAuditEntry('FICA Document Pasted', {
        extractedFields: Object.keys(extracted),
        hasID: !!extracted.idNumber,
        hasAddress: !!extracted.address,
        hasEmail: !!extracted.email
      });
      
      // Clear the textarea after successful extraction
      setPastedFicaText('');
    } catch (error) {
      console.error('Error processing pasted FICA text:', error);
      setProcessingErrors(prev => ({ 
        ...prev, 
        pastedFica: error.message || 'Failed to extract data from pasted text. Please check the format and try again.' 
      }));
      setProcessing(prev => ({ ...prev, pastedFica: false }));
      
      // Add error to audit trail
      addAuditEntry('FICA Paste Failed', {
        error: error.message
      });
    }
  };

  const handlePasteLease = () => {
    if (!pastedLeaseText || pastedLeaseText.trim().length === 0) {
      setProcessingErrors(prev => ({ ...prev, pastedLease: 'Please paste lease agreement text' }));
      return;
    }

    setProcessing(prev => ({ ...prev, pastedLease: true }));
    setProcessingErrors(prev => ({ ...prev, pastedLease: null }));

    try {
      const parsed = parseLeaseAgreement(pastedLeaseText);
      
      // Merge parsed data with existing data
      setExtractedData(prev => ({
        landlord: { ...prev.landlord, ...parsed.landlord },
        tenant: { ...prev.tenant, ...parsed.tenant },
        premises: { ...prev.premises, ...parsed.premises },
        lease: { ...prev.lease, ...parsed.lease },
        surety: { ...prev.surety, ...parsed.surety },
        financial: {
          ...prev.financial,
          ...parsed.financial,
          year1: { ...prev.financial.year1, ...parsed.financial.year1 },
          year2: { ...prev.financial.year2, ...parsed.financial.year2 },
          year3: { ...prev.financial.year3, ...parsed.financial.year3 }
        }
      }));
      
      // Add to audit trail
      addAuditEntry('Complete Lease Agreement Pasted', {
        sectionsExtracted: {
          landlord: Object.keys(parsed.landlord || {}).length,
          tenant: Object.keys(parsed.tenant || {}).length,
          premises: Object.keys(parsed.premises || {}).length,
          lease: Object.keys(parsed.lease || {}).length,
          surety: Object.keys(parsed.surety || {}).length,
          financial: Object.keys(parsed.financial || {}).length
        }
      });
      
      setProcessing(prev => ({ ...prev, pastedLease: false }));
      setPastedLeaseText('');
    } catch (error) {
      console.error('Error processing pasted lease agreement:', error);
      setProcessingErrors(prev => ({ 
        ...prev, 
        pastedLease: error.message || 'Failed to extract data from lease agreement. Please check the format and try again.' 
      }));
      setProcessing(prev => ({ ...prev, pastedLease: false }));
      
      // Add error to audit trail
      addAuditEntry('Lease Agreement Paste Failed', {
        error: error.message
      });
    }
  };

  const calculateRental = (year1Rent, yearIndex) => {
    const escalation = 0.06; // 6% escalation
    return (parseFloat(year1Rent || 0) * Math.pow(1 + escalation, yearIndex)).toFixed(2);
  };

  const calculateVAT = (amount) => {
    return (parseFloat(amount || 0) * 1.15).toFixed(2);
  };

  const updateField = (section, field, value) => {
    setExtractedData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  // Comprehensive form clearing function
  const handleClearAllForms = (skipConfirm = false) => {
    if (!skipConfirm) {
      setShowClearConfirm(true);
      return;
    }
    
    // Actually clear the form
    // Clear documents
    setDocuments({
      landlordCIPC: [],
      tenantCIPC: [],
      tenantID: [],
      suretyID: []
    });
    
    // Reset extractedData to initial state (but keep default landlord and surety if set)
    const savedDefaultLandlord = localStorage.getItem('defaultLandlord');
    const savedDefaultSurety = localStorage.getItem('defaultSurety');
    const defaultLandlord = savedDefaultLandlord ? JSON.parse(savedDefaultLandlord) : {
      name: 'BENAV PROPERTIES (PTY) LTD',
      regNo: '2018/060720/07',
      vatNo: '4200288134',
      phone: '(0861) 999 118',
      bank: 'NEDBANK',
      branch: 'NORTHERN GAUTENG',
      accountNo: '120 459 4295',
      branchCode: '14690500'
    };
    const defaultSurety = savedDefaultSurety ? JSON.parse(savedDefaultSurety) : {
      name: '',
      idNumber: '',
      address: ''
    };
    
    setExtractedData({
      landlord: defaultLandlord,
      tenant: {
        name: '',
        idNumber: '',
        regNo: '',
        vatNo: '',
        tradingAs: '',
        postalAddress: '',
        physicalAddress: '',
        bankName: '',
        bankAccountNumber: '',
        bankBranchCode: '',
        bankAccountType: '',
        bankAccountHolder: ''
      },
      surety: defaultSurety,
      premises: {
        unit: '',
        buildingName: '',
        buildingAddress: '',
        size: '',
        percentage: '',
        permittedUse: ''
      },
      lease: {
        years: 3,
        months: 0,
        commencementDate: '',
        terminationDate: '',
        optionYears: 3,
        optionMonths: 0,
        optionExerciseDate: ''
      },
      financial: {
        year1: { basicRent: '', security: '', refuse: '', rates: '', sewerageWater: '', from: '', to: '' },
        year2: { basicRent: '', security: '', refuse: '', rates: '', sewerageWater: '', from: '', to: '' },
        year3: { basicRent: '', security: '', refuse: '', rates: '', sewerageWater: '', from: '', to: '' },
        deposit: '',
        leaseFee: '750.00',
        utilities: 'METERED OR % OF EXPENSE',
        turnoverPercentage: 'N/A',
        financialYearEnd: 'N/A',
        minimumTurnover: 'N/A',
        advertisingContribution: 'N/A',
        tenantBankAccount: 'N/A'
      }
    });
    
    // Clear pasted text
    setPastedFicaText('');
    setPastedLeaseText('');
    
    // Clear processing states
    setProcessing({});
    setProcessingErrors({});
    setShowPreview(false);
    
    // Clear verification status
    setVerificationStatus({
      landlordCIPC: { verified: false, date: null, regNo: null },
      tenantCIPC: { verified: false, date: null, regNo: null },
      tenantID: { verified: false, date: null, idNumber: null },
      suretyID: { verified: false, date: null, idNumber: null },
      fica: { verified: false, date: null }
    });
    
    // Add to audit trail
    addAuditEntry('Form Cleared', {
      action: 'user_cleared_form',
      timestamp: new Date().toISOString()
    });
  };

  const updateFinancialField = (year, field, value) => {
    setExtractedData(prev => {
      const updated = {
        ...prev,
        financial: {
          ...prev.financial,
          [year]: {
            ...prev.financial[year],
            [field]: value
          }
        }
      };

      // Auto-calculate Year 2 and Year 3 basic rent if Year 1 changes
      if (year === 'year1' && field === 'basicRent') {
        const yr2 = calculateRental(value, 1);
        const yr3 = calculateRental(value, 2);
        
        updated.financial = {
          ...updated.financial,
          year2: { ...updated.financial.year2, basicRent: yr2 },
          year3: { ...updated.financial.year3, basicRent: yr3 }
        };
      }

      // Auto-calculate security for Year 2 and Year 3 based on Year 1
      if (year === 'year1' && field === 'security') {
        const year1Rent = parseFloat(updated.financial.year1.basicRent || 0);
        const securityRatio = year1Rent > 0 ? parseFloat(value || 0) / year1Rent : 0;
        
        const yr2Rent = parseFloat(updated.financial.year2.basicRent || 0);
        const yr3Rent = parseFloat(updated.financial.year3.basicRent || 0);
        
        updated.financial = {
          ...updated.financial,
          year2: { 
            ...updated.financial.year2, 
            security: securityRatio > 0 ? (yr2Rent * securityRatio).toFixed(2) : updated.financial.year2.security 
          },
          year3: { 
            ...updated.financial.year3, 
            security: securityRatio > 0 ? (yr3Rent * securityRatio).toFixed(2) : updated.financial.year3.security 
          }
        };
      }

      return updated;
    });
  };

  const formatCurrency = (amount) => {
    if (!amount || amount === '') return '';
    const num = parseFloat(amount.toString().replace(/[^\d.]/g, ''));
    if (isNaN(num)) return '';
    return `R ${num.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatCurrencyDisplay = (amount) => {
    if (!amount || amount === '') return '';
    const num = parseFloat(amount.toString().replace(/[^\d.]/g, ''));
    if (isNaN(num)) return '';
    return num.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const generateMonthlyRentalTableText = () => {
    const { financial } = extractedData;
    
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    // Create text-based table with underlines
    const colWidths = [18, 18, 18, 25, 22, 22, 12, 12];
    const totalWidth = colWidths.reduce((sum, w) => sum + w, 0);

    let table = '\n';
    
    // Header cells
    const headers = [
      'BASIC RENT\nEXCL. VAT',
      'BASIC RENT\nINCL. VAT',
      'SECURITY\nEXCL. VAT',
      'ELECTRICITY\nSEWERAGE & WATER',
      '*REFUSE AS AT\n01/06/2025\nEXCL. VAT',
      '*RATES AS AT\n01/06/2025\nEXCL. VAT',
      'FROM',
      'TO'
    ];
    
    const headerLines = headers.map(h => h.split('\n')).reduce((max, arr) => Math.max(max, arr.length), 0);
    for (let i = 0; i < headerLines; i++) {
      headers.forEach((header, idx) => {
        const lines = header.split('\n');
        const cell = lines[i] || '';
        table += cell.padEnd(colWidths[idx]);
      });
      table += '\n';
    }
    
    // Underline header
    table += '_'.repeat(totalWidth) + '\n';
    
    // Year 1 row
    const year1Cells = [
      formatCurrency(financial.year1.basicRent) || 'R [AMOUNT]',
      formatCurrency(calculateVAT(financial.year1.basicRent)) || 'R [AMOUNT]',
      formatCurrency(financial.year1.security) || 'R [AMOUNT]',
      `ELECTRICITY\nSEWERAGE & WATER\n${financial.year1.sewerageWater || 'METERED OR % AGE OF\nEXPENSE'}`,
      `*REFUSE -\n${formatCurrency(financial.year1.refuse) || 'R [AMOUNT]'} p/m`,
      `*${formatCurrency(financial.year1.rates) || 'R [AMOUNT]'}`,
      formatDate(financial.year1.from) || '[FROM]',
      formatDate(financial.year1.to) || '[TO]'
    ];
    
    const year1Lines = year1Cells.map(c => c.split('\n').length).reduce((max, len) => Math.max(max, len), 0);
    for (let i = 0; i < year1Lines; i++) {
      year1Cells.forEach((cell, idx) => {
        const lines = cell.split('\n');
        const cellLine = lines[i] || '';
        table += cellLine.padEnd(colWidths[idx]);
      });
      table += '\n';
    }
    
    table += '_'.repeat(totalWidth) + '\n';
    
    // Year 2 row
    const year2Cells = [
      formatCurrency(financial.year2.basicRent) || 'R [AMOUNT]',
      formatCurrency(calculateVAT(financial.year2.basicRent)) || 'R [AMOUNT]',
      formatCurrency(financial.year2.security) || 'R [AMOUNT]',
      `ELECTRICITY\nSEWERAGE & WATER\n${financial.year2.sewerageWater || 'METERED OR % AGE OF\nEXPENSE'}`,
      '* REFUSE\n*',
      '',
      formatDate(financial.year2.from) || '[FROM]',
      formatDate(financial.year2.to) || '[TO]'
    ];
    
    const year2Lines = year2Cells.map(c => c.split('\n').length).reduce((max, len) => Math.max(max, len), 0);
    for (let i = 0; i < year2Lines; i++) {
      year2Cells.forEach((cell, idx) => {
        const lines = cell.split('\n');
        const cellLine = lines[i] || '';
        table += cellLine.padEnd(colWidths[idx]);
      });
      table += '\n';
    }
    
    table += '_'.repeat(totalWidth) + '\n';
    
    // Year 3 row
    const year3Cells = [
      formatCurrency(financial.year3.basicRent) || 'R [AMOUNT]',
      formatCurrency(calculateVAT(financial.year3.basicRent)) || 'R [AMOUNT]',
      formatCurrency(financial.year3.security) || 'R [AMOUNT]',
      `ELECTRICITY\nSEWERAGE & WATER\n${financial.year3.sewerageWater || 'METERED OR % AGE OF\nEXPENSE'}`,
      '* REFUSE\n*',
      '',
      formatDate(financial.year3.from) || '[FROM]',
      formatDate(financial.year3.to) || '[TO]'
    ];
    
    const year3Lines = year3Cells.map(c => c.split('\n').length).reduce((max, len) => Math.max(max, len), 0);
    for (let i = 0; i < year3Lines; i++) {
      year3Cells.forEach((cell, idx) => {
        const lines = cell.split('\n');
        const cellLine = lines[i] || '';
        table += cellLine.padEnd(colWidths[idx]);
      });
      table += '\n';
    }
    
    table += '_'.repeat(totalWidth) + '\n';
    
    return table;
  };

  const generateMonthlyRentalTableHTML = () => {
    const { financial } = extractedData;
    
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    return `
<table style="width: 100%; border-collapse: collapse; font-size: 11px; margin: 10px 0;">
  <thead>
    <tr>
      <th style="background-color: #e0e0e0; padding: 8px; text-align: center; font-weight: bold; border: 1px solid #999;">BASIC RENT<br>EXCL. VAT</th>
      <th style="background-color: #e0e0e0; padding: 8px; text-align: center; font-weight: bold; border: 1px solid #999;">BASIC RENT<br>INCL. VAT</th>
      <th style="background-color: #e0e0e0; padding: 8px; text-align: center; font-weight: bold; border: 1px solid #999;">SECURITY<br>EXCL. VAT</th>
      <th style="background-color: #e0e0e0; padding: 8px; text-align: center; font-weight: bold; border: 1px solid #999;">ELECTRICITY<br>SEWERAGE & WATER</th>
      <th style="background-color: #e0e0e0; padding: 8px; text-align: center; font-weight: bold; border: 1px solid #999;">*REFUSE AS AT<br>01/06/2025<br>EXCL. VAT</th>
      <th style="background-color: #e0e0e0; padding: 8px; text-align: center; font-weight: bold; border: 1px solid #999;">*RATES AS AT<br>01/06/2025<br>EXCL. VAT</th>
      <th style="background-color: #e0e0e0; padding: 8px; text-align: center; font-weight: bold; border: 1px solid #999;">FROM</th>
      <th style="background-color: #e0e0e0; padding: 8px; text-align: center; font-weight: bold; border: 1px solid #999;">TO</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding: 8px; text-align: center; border: 1px solid #999;">${formatCurrency(financial.year1.basicRent) || 'R [AMOUNT]'}</td>
      <td style="padding: 8px; text-align: center; border: 1px solid #999;">${formatCurrency(calculateVAT(financial.year1.basicRent)) || 'R [AMOUNT]'}</td>
      <td style="padding: 8px; text-align: center; border: 1px solid #999;">${formatCurrency(financial.year1.security) || 'R [AMOUNT]'}</td>
      <td style="padding: 8px; text-align: center; border: 1px solid #999;">ELECTRICITY<br>SEWERAGE & WATER<br>${financial.year1.sewerageWater || 'METERED OR % AGE OF<br>EXPENSE'}</td>
      <td style="padding: 8px; text-align: center; border: 1px solid #999;">*REFUSE -<br>${formatCurrency(financial.year1.refuse) || 'R [AMOUNT]'} p/m</td>
      <td style="padding: 8px; text-align: center; border: 1px solid #999;">*${formatCurrency(financial.year1.rates) || 'R [AMOUNT]'}</td>
      <td style="padding: 8px; text-align: center; border: 1px solid #999;">${formatDate(financial.year1.from) || '[FROM]'}</td>
      <td style="padding: 8px; text-align: center; border: 1px solid #999;">${formatDate(financial.year1.to) || '[TO]'}</td>
    </tr>
    <tr>
      <td style="padding: 8px; text-align: center; border: 1px solid #999;">${formatCurrency(financial.year2.basicRent) || 'R [AMOUNT]'}</td>
      <td style="padding: 8px; text-align: center; border: 1px solid #999;">${formatCurrency(calculateVAT(financial.year2.basicRent)) || 'R [AMOUNT]'}</td>
      <td style="padding: 8px; text-align: center; border: 1px solid #999;">${formatCurrency(financial.year2.security) || 'R [AMOUNT]'}</td>
      <td style="padding: 8px; text-align: center; border: 1px solid #999;">ELECTRICITY<br>SEWERAGE & WATER<br>${financial.year2.sewerageWater || 'METERED OR % AGE OF<br>EXPENSE'}</td>
      <td style="padding: 8px; text-align: center; border: 1px solid #999;">* REFUSE<br>*</td>
      <td style="padding: 8px; text-align: center; border: 1px solid #999;"></td>
      <td style="padding: 8px; text-align: center; border: 1px solid #999;">${formatDate(financial.year2.from) || '[FROM]'}</td>
      <td style="padding: 8px; text-align: center; border: 1px solid #999;">${formatDate(financial.year2.to) || '[TO]'}</td>
    </tr>
    <tr>
      <td style="padding: 8px; text-align: center; border: 1px solid #999;">${formatCurrency(financial.year3.basicRent) || 'R [AMOUNT]'}</td>
      <td style="padding: 8px; text-align: center; border: 1px solid #999;">${formatCurrency(calculateVAT(financial.year3.basicRent)) || 'R [AMOUNT]'}</td>
      <td style="padding: 8px; text-align: center; border: 1px solid #999;">${formatCurrency(financial.year3.security) || 'R [AMOUNT]'}</td>
      <td style="padding: 8px; text-align: center; border: 1px solid #999;">ELECTRICITY<br>SEWERAGE & WATER<br>${financial.year3.sewerageWater || 'METERED OR % AGE OF<br>EXPENSE'}</td>
      <td style="padding: 8px; text-align: center; border: 1px solid #999;">* REFUSE<br>*</td>
      <td style="padding: 8px; text-align: center; border: 1px solid #999;"></td>
      <td style="padding: 8px; text-align: center; border: 1px solid #999;">${formatDate(financial.year3.from) || '[FROM]'}</td>
      <td style="padding: 8px; text-align: center; border: 1px solid #999;">${formatDate(financial.year3.to) || '[TO]'}</td>
    </tr>
  </tbody>
</table>`;
  };

  const generateLeaseDocument = (useHTML = false) => {
    const { landlord, tenant, surety, premises, lease, financial } = extractedData;
    
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    const formatFriendlyDate = () => {
      const now = new Date();
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
      const day = now.getDate();
      const month = months[now.getMonth()];
      const year = now.getFullYear();
      const hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${day} ${month} ${year}, ${displayHours}:${minutes} ${ampm}`;
    };

    // Format date as "01 MARCH 2026"
    const formatDateLong = (dateStr) => {
      if (!dateStr) return '[DATE]';
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const monthNames = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear();
      return `${day} ${month} ${year}`;
    };

    // Format date as "31/08/2028"
    const formatDateShort = (dateStr) => {
      if (!dateStr) return '[DATE]';
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    // Format document date
    const formatDocumentDate = () => {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const monthNames = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
      const month = monthNames[now.getMonth()];
      const year = now.getFullYear();
      return `${day} ${month} ${year}`;
    };

    const templateString = `AGREEMENT OF LEASE

Date: ${formatDocumentDate()}

PART A

THE PREMISES ARE HIRED BY THE TENANT FROM THE LANDLORD SUBJECT TO THE TERMS AND CONDITIONS SET OUT HEREIN AND IN ANY ANNEXURE HERETO:

1.1 THE LANDLORD: ${landlord.name || '[LANDLORD NAME]'}

TEL: ${landlord.phone || '[PHONE]'}

REGISTRATION NO: ${landlord.regNo || '[REG NO]'}

VAT REGISTRATION NO: ${landlord.vatNo || '[VAT NO]'}

BANKING DETAILS: BANK: ${landlord.bank || '[BANK]'}, ${landlord.branch || '[BRANCH]'}

A/C NO: ${landlord.accountNo || '[ACCOUNT NO]'}, BRANCH CODE: ${landlord.branchCode || '[BRANCH CODE]'}

1.2 THE TENANT: ${tenant.name || '[TENANT COMPANY NAME]'}

REGISTRATION NO: ${tenant.regNo || '[REG NO]'}

VAT REGISTRATION NO: ${tenant.vatNo || '[VAT NO]'}

POSTAL: ${tenant.postalAddress ? tenant.postalAddress.split(',').map(addr => addr.trim()).join(', ') : '[POSTAL ADDRESS]'}

PHYSICAL: ${tenant.physicalAddress ? tenant.physicalAddress.split(',').map(addr => addr.trim()).join(', ') : '[PHYSICAL ADDRESS]'}

TRADING AS: ${tenant.tradingAs || tenant.name || '[TRADING AS]'}

1.3 THE PREMISES: ${premises.unit || '[UNIT]'}

1.4 BUILDING NAME: ${premises.buildingName || '[BUILDING NAME]'}

1.5 BUILDING ADDRESS: ${premises.buildingAddress || '[BUILDING ADDRESS]'}

1.6 PREMISES MEASUREMENTS (APPROX): ${premises.size || '[SIZE]'}

1.7 TENANT'S PERCENTAGE PROPORTIONATE SHARE OF BUILDING AND/OR PROPERTY EXCLUDING PARKING AND FACILITY AREAS: ${premises.percentage || '[PERCENTAGE]'}

1.8 PERMITTED USE OF PREMISES: TO BE USED BY THE TENANT FOR THESE PURPOSES AND FOR NO OTHER PURPOSES WHATSOEVER

${premises.permittedUse || ''}

1.9 INITIAL PERIOD OF LEASE:

YEARS

${lease.years || 0}

MONTHS

${lease.months || 0}

COMMENCEMENT DATE:

${lease.commencementDate ? formatDateLong(lease.commencementDate) : ''}

TERMINATION DATE:

${lease.terminationDate ? formatDateLong(lease.terminationDate) : ''}

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                                             │
│  1.10 OPTION PERIOD OF LEASE (TO BE EXERCISED BY ${lease.optionExerciseDate ? formatDateShort(lease.optionExerciseDate) : '[EXERCISE DATE]'}) OPTION PERIOD IS TO BE MUTUALLY DETERMINED BY THE PARTIES. IF BUSINESS SOLD LEASE TO BE RENEWED SUBJECT TO APPROVAL OF NEW TENANT BY LANDLORD.  │  YEARS  │  MONTHS  │
│                                                                                                             │  ${String(lease.optionYears || 0).padStart(5)}  │  ${String(lease.optionMonths || 0).padStart(5)}  │
│                                                                                                             │                                                      │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

1.11 SURETY:

NAME: ${surety.name || ''}

ID NUMBER: ${surety.idNumber || ''}

ADDRESS: ${surety.address || ''}

1 INITIAL HERE: _________

1.12 MONTHLY RENTAL AND OTHER MONTHLY CHARGES:

${useHTML ? generateMonthlyRentalTableHTML() : generateMonthlyRentalTableText()}

*INCREASES AS PER RELEVANT MUNICIPAL AUTHORITY/CONTRACTOR IN RATES AND REFUSE TO APPLY ON A PROPORTIONATE BASIS.

1.13 DEPOSIT: ${formatCurrency(financial.deposit) || '[AMOUNT]'} – DEPOSIT HELD.

1.14.1 TURNOVER PERCENTAGE: ${financial.turnoverPercentage || 'N/A'}

1.14.2 TENANT'S FINANCIAL YEAR END: ${financial.financialYearEnd || 'N/A'}

1.14.3 MINIMUM TURNOVER REQUIREMENT ESCALATING ANNUALLY: ${financial.minimumTurnover || 'N/A'}

1.15 TENANT'S ADVERTISING AND PROMOTIONAL CONTRIBUTION: % AGE OF TENANT'S NET MONTHLY RENTAL PLUS ATTRIBUTABLE VALUE ADDED TAX THEREON

${financial.advertisingContribution || 'N/A'}

1.16 TENANT'S BANK ACCOUNT DETAILS: ${(() => {
    const bankDetails = [];
    if (tenant.bankName) bankDetails.push(`BANK: ${tenant.bankName}`);
    if (tenant.bankAccountNumber) bankDetails.push(`A/C NO: ${tenant.bankAccountNumber}`);
    if (tenant.bankBranchCode) bankDetails.push(`BRANCH CODE: ${tenant.bankBranchCode}`);
    if (tenant.bankAccountType) bankDetails.push(`ACCOUNT TYPE: ${tenant.bankAccountType}`);
    if (tenant.bankAccountHolder) bankDetails.push(`ACCOUNT HOLDER: ${tenant.bankAccountHolder}`);
    return bankDetails.length > 0 ? bankDetails.join(', ') : (financial.tenantBankAccount || 'N/A');
  })()}

1.17 THE FOLLOWING LEASE FEES SHALL BE PAYABLE BY THE TENANT ON SIGNATURE OF THIS LEASE: ${formatCurrency(financial.leaseFee) || formatCurrency('750.00')} (EXCL. VAT)

1.18 THE FOLLOWING ANNEXURES SHALL FORM PART OF THIS AGREEMENT OF LEASE: "A"; "B"; "C"; "D"

2 INITIAL HERE: _________

---

This document was generated on ${formatFriendlyDate()}

Lease Agreement Reference: ${tenant.name ? tenant.name.replace(/\s+/g, '-').toUpperCase() : 'DRAFT'}-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}

Generated by Automated Lease Drafting System
`;
    
    // Remove percentage symbols (placeholder text) from the generated document
    const leaseText = templateString;
    return leaseText.split('\n').filter(line => {
      const trimmedLine = line.trim();
      
      // Skip lines that are only percentage symbols
      if (trimmedLine.match(/^%+$/)) {
        return false;
      }
      
      // Skip lines that contain 5 or more consecutive percentage symbols (placeholder text)
      if (line.match(/%{5,}/)) {
        return false;
      }
      
      // Skip lines that are mostly percentage symbols (more than 30% of the line)
      const percentCount = (line.match(/%/g) || []).length;
      const lineLength = trimmedLine.length;
      if (lineLength > 0 && percentCount > 5 && percentCount > lineLength * 0.3) {
        return false;
      }
      
      return true;
    }).map(line => {
      // Remove consecutive percentage symbols (2 or more) - these are placeholder text
      // Keep single % symbols that are part of actual values (like "4.325%")
      let cleaned = line.replace(/%{2,}/g, '');
      // Remove leading/trailing percentage symbols
      cleaned = cleaned.replace(/^%+/, '').replace(/%+$/, '');
      return cleaned;
    }).filter(line => line.trim() !== '').join('\n');
  };

  // Convert file to base64 for storage
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Store documents with lease agreement
  const storeLeaseWithDocuments = async (leaseText, leaseData) => {
    try {
      const storedDocuments = {};
      
      // Convert all uploaded documents to base64
      for (const [key, files] of Object.entries(documents)) {
        if (files && Array.isArray(files) && files.length > 0) {
          storedDocuments[key] = [];
          for (const file of files) {
            try {
              const base64 = await fileToBase64(file);
              storedDocuments[key].push({
                name: file.name,
                type: file.type,
                size: file.size,
                data: base64,
                uploadedDate: new Date().toISOString()
              });
            } catch (error) {
              console.warn(`Failed to store document ${key}:`, error);
            }
          }
        }
      }

      const leasePackage = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        leaseText,
        leaseData,
        documents: storedDocuments,
        verificationStatus,
        metadata: {
          tenantName: extractedData.tenant.name || 'Unknown',
          landlordName: extractedData.landlord.name || 'Unknown',
          generatedDate: new Date().toISOString()
        }
      };

      // Store in localStorage
      const existingPackages = JSON.parse(localStorage.getItem('leasePackages') || '[]');
      existingPackages.push(leasePackage);
      
      // Keep only last 20 packages to avoid storage issues
      const trimmedPackages = existingPackages.slice(-20);
      localStorage.setItem('leasePackages', JSON.stringify(trimmedPackages));
      setLeasePackages(trimmedPackages);

      return leasePackage;
    } catch (error) {
      console.error('Error storing lease with documents:', error);
      return null;
    }
  };

  const exportLease = async () => {
    setIsGeneratingLease(true);
    try {
      let leaseText = generateLeaseDocument();
      
      // Remove percentage symbols (placeholder text)
      leaseText = leaseText.split('\n').filter(line => {
        // Skip lines that are only percentage symbols
        if (line.trim().match(/^%+$/)) {
          return false;
        }
        // Skip lines that are mostly percentage symbols
        const percentCount = (line.match(/%/g) || []).length;
        if (percentCount > 10 && line.trim().length < 200) {
          return false;
        }
        return true;
      }).map(line => {
        // Remove leading/trailing percentage symbols from lines
        return line.replace(/^%+/, '').replace(/%+$/, '');
      }).join('\n');
      
      // Store lease with documents
      await storeLeaseWithDocuments(leaseText, extractedData);
      
      // Download the lease
      const blob = new Blob([leaseText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Lease_Agreement_${extractedData.tenant.name || 'Draft'}_${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Lease document downloaded successfully!');
      
      // Clear form after generating lease (with delay to show success)
      setTimeout(() => {
        handleClearAllForms(true);
      }, 2000);
    } catch (error) {
      toast.error('Failed to generate lease document. Please try again.');
      console.error('Export lease error:', error);
    } finally {
      setIsGeneratingLease(false);
    }
  };

  const exportLeasePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      // Store lease with documents
      const leaseText = generateLeaseDocument();
      await storeLeaseWithDocuments(leaseText, extractedData);
      
      // Try server-side PDF generation first (Puppeteer - better quality)
      try {
        toast.info('Generating PDF... This may take a moment.');
        const blob = await leasesAPI.generatePDFFromData({
          ...extractedData,
          showFinancialYear2,
          showFinancialYear3
        }, false); // false = not preview, will download
        
        // Verify blob is valid
        if (!blob || blob.size === 0) {
          throw new Error('PDF generation returned empty file');
        }
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Lease_Agreement_${extractedData.tenant.name || 'Draft'}_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        // Small delay before cleanup to ensure download starts
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 100);
        
        toast.success('PDF generated and downloaded successfully!');
        
        // Store lease with documents for future tracking
        try {
          const leaseText = generateLeaseDocument();
          await storeLeaseWithDocuments(leaseText, extractedData);
          toast.info('Lease and documents saved leases can be accessed from "Saved Leases" button');
        } catch (error) {
          console.error('Error storing lease with documents:', error);
        }
        
        // Add to history
        try {
          const historyItem = {
            id: Date.now(),
            name: extractedData.tenant.name || 'Draft',
            date: new Date().toISOString(),
            leaseText: generateLeaseDocument(),
            leaseData: { ...extractedData }
          };
          const existingHistory = JSON.parse(localStorage.getItem('leaseHistory') || '[]');
          existingHistory.push(historyItem);
          // Keep only last 50 history items
          const trimmedHistory = existingHistory.slice(-50);
          localStorage.setItem('leaseHistory', JSON.stringify(trimmedHistory));
          setLeaseHistory(trimmedHistory);
        } catch (error) {
          console.error('Error saving to history:', error);
        }
        
        // Clear form immediately after generating PDF
        handleClearAllForms(true);
        setIsGeneratingPDF(false);
        return;
      } catch (error) {
        console.error('Server-side PDF generation failed:', error);
        toast.warning(`Server PDF generation failed: ${error.message || 'Using client-side fallback...'}`);
      }
    
    // Fallback to client-side PDF generation
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPosition = margin;
    const maxWidth = pageWidth - (margin * 2);
    
    // Helper to check if we need a new page
    const checkPageBreak = (requiredSpace = 10) => {
      if (yPosition + requiredSpace > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
    };
    
    // Format helpers
    const formatDateLong = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const monthNames = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear();
      return `${day} ${month} ${year}`;
    };
    
    const formatDateShort = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };
    
    const formatCurrency = (amount) => {
      if (!amount || amount === '') return 'N/A';
      const num = parseFloat(amount);
      if (isNaN(num)) return amount;
      return `R ${num.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };
    
    const calculateVAT = (amount) => {
      if (!amount || amount === '') return 0;
      const num = parseFloat(amount);
      if (isNaN(num)) return 0;
      return num * 1.15;
    };
    
    const { landlord, tenant, surety, premises, lease, financial } = extractedData;
    
    // CSS spacing constants
    const SPACING = {
      h1: 10,            // h1 { margin-bottom: 10px; }
      h2: 20,            // h2 { margin-bottom: 20px; }
      intro: 30,         // .intro { margin-bottom: 30px; }
      section: 20,       // .section { margin-bottom: 20px; }
      sectionTitle: 8,   // .section-title { margin-bottom: 8px; }
      field: 5,          // .field { margin-bottom: 5px; }
      table: 15          // table { margin: 15px 0; }
    };
    
    // CSS font sizes
    const FONTS = {
      h1: 18,            // h1 { font-size: 18px; }
      h2: 16,            // h2 { font-size: 16px; }
      intro: 11,         // .intro { font-size: 11px; }
      section: 10,       // .section { font-size: 10px; }
    };

    // Title: AGREEMENT OF LEASE - h1: 18px, bold, centered, margin-bottom: 10px
    doc.setFontSize(FONTS.h1);
    doc.setFont('helvetica', 'bold');
    doc.text('AGREEMENT OF LEASE', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += SPACING.h1; // h1 { margin-bottom: 10px; }
    
    // PART A - h2: 16px, bold, centered, margin-bottom: 20px
    doc.setFontSize(FONTS.h2);
    doc.text('PART A', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += SPACING.h2; // h2 { margin-bottom: 20px; }
    
    // Intro text - .intro: 11px, centered, margin-bottom: 30px, line-height: 1.6
    doc.setFontSize(FONTS.intro);
    doc.setFont('helvetica', 'normal');
    const introText = 'THE PREMISES ARE HIRED BY THE TENANT FROM THE LANDLORD SUBJECT TO THE TERMS AND CONDITIONS SET OUT HEREIN AND IN ANY ANNEXURE HERETO:';
    // Calculate line height for intro: font-size * line-height ratio
    // For 11px font with 1.6 line-height, spacing between lines is font-size * 0.6
    const introLineSpacing = FONTS.intro * 0.6; // Additional spacing for line-height: 1.6
    const introLines = doc.splitTextToSize(introText, maxWidth);
    introLines.forEach((line, idx) => {
      doc.text(line, pageWidth / 2, yPosition, { align: 'center' });
      if (idx < introLines.length - 1) {
        yPosition += FONTS.intro + introLineSpacing; // Font size + extra spacing for line-height
      }
    });
    yPosition += SPACING.intro; // .intro { margin-bottom: 30px; }

    // Helper function to render a field (label: value)
    const renderField = (label, value, indent = 20) => {
      checkPageBreak();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9); // .label { font-size: 9px; }
      doc.text(label, margin + indent, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10); // .value { font-size: 10px; }
      const valueX = margin + indent + 200; // .label { min-width: 200px; }
      const valueLines = doc.splitTextToSize(value || '', maxWidth - (valueX - margin));
      valueLines.forEach((line, idx) => {
        doc.text(line, valueX, yPosition);
        if (idx < valueLines.length - 1) yPosition += 4;
      });
      yPosition += SPACING.field; // .field { margin-bottom: 5px; }
    };
    
    // Helper function to render a section title
    const renderSectionTitle = (title) => {
      checkPageBreak(15);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10); // .section-title { font-size: 10px; }
      doc.text(title, margin, yPosition);
      yPosition += SPACING.sectionTitle; // .section-title { margin-bottom: 8px; }
      doc.setFont('helvetica', 'normal');
    };
    
    // Helper function to render a standalone value (like company name)
    const renderValue = (value, indent = 20) => {
      checkPageBreak();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(value || '', margin + indent, yPosition);
      yPosition += SPACING.field;
    };
    
    // 1.1 THE LANDLORD
    renderSectionTitle('1.1 THE LANDLORD:');
    renderValue(landlord.name || '');
    renderField('TEL:', landlord.phone || '');
    renderField('REGISTRATION NO:', landlord.regNo || '');
    renderField('VAT REGISTRATION NO:', landlord.vatNo || '');
    renderField('BANKING DETAILS:', `BANK: ${landlord.bank || ''}, ${landlord.branch || ''}`);
    renderField('', `A/C NO: ${landlord.accountNo || ''}, BRANCH CODE: ${landlord.branchCode || ''}`);
    
    // 1.2 THE TENANT
    yPosition += SPACING.section; // .section { margin-bottom: 20px; }
    renderSectionTitle('1.2 THE TENANT:');
    renderValue(tenant.name || '');
    renderField('REGISTRATION NO:', tenant.regNo || '');
    renderField('VAT REGISTRATION NO:', tenant.vatNo || '');
    renderField('POSTAL:', tenant.postalAddress || '');
    renderField('PHYSICAL:', tenant.physicalAddress || '');
    renderField('TRADING AS:', tenant.tradingAs || tenant.name || '');
    
    // 1.3-1.8 Premises sections (close together)
    yPosition += SPACING.section;
    renderSectionTitle('1.3 THE PREMISES:');
    renderValue(premises.unit || '');
    
    yPosition += SPACING.field; // Close spacing for subsections
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('1.4 BUILDING NAME:', margin, yPosition);
    yPosition += SPACING.sectionTitle;
    renderValue(premises.buildingName || '');
    
    yPosition += SPACING.field;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('1.5 BUILDING ADDRESS:', margin, yPosition);
    yPosition += SPACING.sectionTitle;
    renderValue(premises.buildingAddress || '');
    
    yPosition += SPACING.field;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('1.6 PREMISES MEASUREMENTS (APPROX):', margin, yPosition);
    yPosition += SPACING.sectionTitle;
    renderValue(premises.size || '');
    
    yPosition += SPACING.field;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('1.7 TENANT\'S PERCENTAGE PROPORTIONATE SHARE:', margin, yPosition);
    yPosition += SPACING.sectionTitle;
    renderValue(premises.percentage || '');
    
    yPosition += SPACING.field;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('1.8 PERMITTED USE OF PREMISES:', margin, yPosition);
    yPosition += SPACING.sectionTitle;
    renderValue(premises.permittedUse || '');
    
    // 1.9 & 1.10 Lease Period Table
    yPosition += SPACING.section;
    checkPageBreak(60);
    const tableStartY = yPosition;
    const tableWidth = pageWidth - 2 * margin;
    const colWidth = tableWidth / 4;
    const headerHeight = 15;
    const rowHeight = 10;
    
    // Table header
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPosition, colWidth * 2, headerHeight, 'F');
    doc.rect(margin + colWidth * 2, yPosition, colWidth * 2, headerHeight, 'F');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('1.9 INITIAL PERIOD OF LEASE', margin + colWidth, yPosition + 7, { align: 'center' });
    
    const optionDate = lease.optionExerciseDate ? formatDateShort(lease.optionExerciseDate) : '[EXERCISE DATE]';
    doc.text('1.10 OPTION PERIOD OF LEASE', margin + colWidth * 3, yPosition + 5, { align: 'center' });
    doc.setFontSize(7);
    doc.text(`(TO BE EXERCISED BY ${optionDate})`, margin + colWidth * 3, yPosition + 11, { align: 'center' });
    yPosition += headerHeight;
    
    // Draw borders
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    
    // Row 1: YEARS
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPosition, colWidth, rowHeight, 'F');
    doc.text('YEARS', margin + colWidth / 2, yPosition + 6, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFillColor(255, 255, 255);
    doc.rect(margin + colWidth, yPosition, colWidth, rowHeight, 'F');
    doc.text(String(lease.years || 0), margin + colWidth + colWidth / 2, yPosition + 6, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(margin + colWidth * 2, yPosition, colWidth, rowHeight, 'F');
    doc.text('YEARS', margin + colWidth * 2 + colWidth / 2, yPosition + 6, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFillColor(255, 255, 255);
    doc.rect(margin + colWidth * 3, yPosition, colWidth, rowHeight, 'F');
    doc.text(String(lease.optionYears || 0), margin + colWidth * 3 + colWidth / 2, yPosition + 6, { align: 'center' });
    yPosition += rowHeight;
    
    // Row 2: MONTHS
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPosition, colWidth, rowHeight, 'F');
    doc.text('MONTHS', margin + colWidth / 2, yPosition + 6, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFillColor(255, 255, 255);
    doc.rect(margin + colWidth, yPosition, colWidth, rowHeight, 'F');
    doc.text(String(lease.months || 0), margin + colWidth + colWidth / 2, yPosition + 6, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(margin + colWidth * 2, yPosition, colWidth, rowHeight, 'F');
    doc.text('MONTHS', margin + colWidth * 2 + colWidth / 2, yPosition + 6, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFillColor(255, 255, 255);
    doc.rect(margin + colWidth * 3, yPosition, colWidth, rowHeight, 'F');
    doc.text(String(lease.optionMonths || 0), margin + colWidth * 3 + colWidth / 2, yPosition + 6, { align: 'center' });
    yPosition += rowHeight;
    
    // Row 3: COMMENCEMENT DATE
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPosition, colWidth, rowHeight, 'F');
    doc.text('COMMENCEMENT DATE', margin + colWidth / 2, yPosition + 6, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setFillColor(255, 255, 255);
    doc.rect(margin + colWidth, yPosition, colWidth, rowHeight, 'F');
    doc.text(lease.commencementDate ? formatDateLong(lease.commencementDate) : '', margin + colWidth + colWidth / 2, yPosition + 6, { align: 'center' });
    doc.setFillColor(249, 249, 249);
    doc.rect(margin + colWidth * 2, yPosition, colWidth * 2, rowHeight, 'F');
    yPosition += rowHeight;
    
    // Row 4: TERMINATION DATE
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPosition, colWidth, rowHeight, 'F');
    doc.text('TERMINATION DATE', margin + colWidth / 2, yPosition + 6, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setFillColor(255, 255, 255);
    doc.rect(margin + colWidth, yPosition, colWidth, rowHeight, 'F');
    doc.text(lease.terminationDate ? formatDateLong(lease.terminationDate) : '', margin + colWidth + colWidth / 2, yPosition + 6, { align: 'center' });
    doc.setFillColor(249, 249, 249);
    doc.rect(margin + colWidth * 2, yPosition, colWidth * 2, rowHeight, 'F');
    yPosition += rowHeight;
    
    // Draw table borders
    const tableEndY = yPosition;
    doc.rect(margin, tableStartY, tableWidth, tableEndY - tableStartY);
    doc.line(margin + colWidth, tableStartY, margin + colWidth, tableEndY);
    doc.line(margin + colWidth * 2, tableStartY, margin + colWidth * 2, tableEndY);
    doc.line(margin + colWidth * 3, tableStartY, margin + colWidth * 3, tableEndY);
    doc.line(margin, tableStartY + headerHeight, margin + tableWidth, tableStartY + headerHeight);
    doc.line(margin, tableStartY + headerHeight + rowHeight, margin + tableWidth, tableStartY + headerHeight + rowHeight);
    doc.line(margin, tableStartY + headerHeight + rowHeight * 2, margin + tableWidth, tableStartY + headerHeight + rowHeight * 2);
    doc.line(margin, tableStartY + headerHeight + rowHeight * 3, margin + tableWidth, tableStartY + headerHeight + rowHeight * 3);
    
    yPosition += SPACING.table;
    doc.setFontSize(10);
    
    // 1.11 SURETY
    yPosition += SPACING.section;
    renderSectionTitle('1.11 SURETY:');
    renderField('NAME:', surety.name || '');
    renderField('ID NUMBER:', surety.idNumber || '');
    renderField('ADDRESS:', surety.address || '');
    
    // 1 INITIAL HERE
    yPosition += SPACING.section;
    checkPageBreak();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('1 INITIAL HERE: _________', pageWidth - margin, yPosition, { align: 'right' });
    yPosition += SPACING.field;
    
    // 1.12 MONTHLY RENTAL TABLE
    yPosition += SPACING.section;
    checkPageBreak(80);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('1.12 MONTHLY RENTAL AND OTHER MONTHLY CHARGES:', margin, yPosition);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('1 INITIAL HERE: _________', pageWidth - margin, yPosition, { align: 'right' });
    yPosition += SPACING.sectionTitle + SPACING.table;
    
    const tableMargin = margin;
    const rentalColWidth = (pageWidth - 2 * tableMargin) / 8;
    const rentalHeaderHeight = 20;
    
    // Table header
    doc.setFillColor(240, 240, 240);
    doc.rect(tableMargin, yPosition, pageWidth - 2 * tableMargin, rentalHeaderHeight, 'F');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const headers = ['BASIC RENT\nEXCL. VAT', 'BASIC RENT\nINCL. VAT', 'SECURITY\nEXCL. VAT', 
                     'ELECTRICITY\nSEWERAGE & WATER', 'REFUSE\n(AS AT 01/06/2025)', 
                     'RATES\n(AS AT 01/06/2025)', 'FROM', 'TO'];
    
    headers.forEach((header, i) => {
      const xPos = tableMargin + i * rentalColWidth;
      doc.text(header, xPos + rentalColWidth / 2, yPosition + 8, { align: 'center', maxWidth: rentalColWidth - 2 });
    });
    
    yPosition += rentalHeaderHeight + 2;
    
    // Table rows
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const formatDatePDF = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    };
    
    const rows = [
      [formatCurrency(financial.year1.basicRent), formatCurrency(calculateVAT(financial.year1.basicRent)), 
       formatCurrency(financial.year1.security), financial.year1.sewerageWater || 'METERED OR % OF EXPENSE',
       `${formatCurrency(financial.year1.refuse)} p/m`, formatCurrency(financial.year1.rates),
       formatDatePDF(financial.year1.from), formatDatePDF(financial.year1.to)],
      [formatCurrency(financial.year2.basicRent), formatCurrency(calculateVAT(financial.year2.basicRent)),
       formatCurrency(financial.year2.security), financial.year2.sewerageWater || 'METERED OR % OF EXPENSE',
       '*', '*', formatDatePDF(financial.year2.from), formatDatePDF(financial.year2.to)],
      [formatCurrency(financial.year3.basicRent), formatCurrency(calculateVAT(financial.year3.basicRent)),
       formatCurrency(financial.year3.security), financial.year3.sewerageWater || 'METERED OR % OF EXPENSE',
       '*', '*', formatDatePDF(financial.year3.from), formatDatePDF(financial.year3.to)]
    ];
    
    rows.forEach((row, rowIndex) => {
      checkPageBreak(25);
      const rentalRowHeight = 22;
      const startY = yPosition;
      
      row.forEach((cell, colIndex) => {
        const xPos = tableMargin + colIndex * rentalColWidth;
        doc.text(cell || '', xPos + rentalColWidth / 2, yPosition + 6, { align: 'center', maxWidth: rentalColWidth - 2 });
      });
      
      // Draw borders
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      for (let i = 0; i <= 8; i++) {
        const x = tableMargin + i * rentalColWidth;
        doc.line(x, startY, x, startY + rentalRowHeight);
      }
      doc.line(tableMargin, startY, pageWidth - tableMargin, startY);
      doc.line(tableMargin, startY + rentalRowHeight, pageWidth - tableMargin, startY + rentalRowHeight);
      
      yPosition += rentalRowHeight;
    });
    
    yPosition += SPACING.table;
    
    // Note
    checkPageBreak();
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text('*INCREASES AS PER RELEVANT MUNICIPAL AUTHORITY/CONTRACTOR IN RATES AND REFUSE TO APPLY ON A PROPORTIONATE BASIS.', margin, yPosition);
    yPosition += SPACING.field;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    // Remaining sections
    yPosition += SPACING.section;
    renderSectionTitle('1.13 DEPOSIT:');
    renderValue(`${formatCurrency(financial.deposit)} – DEPOSIT HELD.`);
    
    yPosition += SPACING.field;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('1.14.1 TURNOVER PERCENTAGE:', margin, yPosition);
    yPosition += SPACING.sectionTitle;
    renderValue(financial.turnoverPercentage || 'N/A');
    
    yPosition += SPACING.field;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('1.14.2 TENANT\'S FINANCIAL YEAR END:', margin, yPosition);
    yPosition += SPACING.sectionTitle;
    renderValue(financial.financialYearEnd || 'N/A');
    
    yPosition += SPACING.field;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('1.14.3 MINIMUM TURNOVER REQUIREMENT:', margin, yPosition);
    yPosition += SPACING.sectionTitle;
    renderValue(financial.minimumTurnover || 'N/A');
    
    yPosition += SPACING.field;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('1.15 ADVERTISING CONTRIBUTION:', margin, yPosition);
    yPosition += SPACING.sectionTitle;
    renderValue(financial.advertisingContribution || 'N/A');
    
    yPosition += SPACING.field;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('1.16 TENANT\'S BANK ACCOUNT DETAILS:', margin, yPosition);
    yPosition += SPACING.sectionTitle;
    const bankDetails = [];
    if (tenant.bankName) bankDetails.push(`BANK: ${tenant.bankName}`);
    if (tenant.bankAccountNumber) bankDetails.push(`A/C NO: ${tenant.bankAccountNumber}`);
    if (tenant.bankBranchCode) bankDetails.push(`BRANCH CODE: ${tenant.bankBranchCode}`);
    if (tenant.bankAccountType) bankDetails.push(`ACCOUNT TYPE: ${tenant.bankAccountType}`);
    if (tenant.bankAccountHolder) bankDetails.push(`ACCOUNT HOLDER: ${tenant.bankAccountHolder}`);
    renderValue(bankDetails.length > 0 ? bankDetails.join(', ') : (financial.tenantBankAccount || 'N/A'));
    
    yPosition += SPACING.field;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('1.17 LEASE FEES PAYABLE ON SIGNATURE:', margin, yPosition);
    yPosition += SPACING.sectionTitle;
    renderValue(`${formatCurrency(financial.leaseFee || '750.00')} (EXCL. VAT)`);
    
    yPosition += SPACING.field;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('1.18 ANNEXURES:', margin, yPosition);
    yPosition += SPACING.sectionTitle;
    renderValue('"A"; "B"; "C"; "D"');
    
    // 2 INITIAL HERE
    yPosition += SPACING.section;
    checkPageBreak();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
      doc.text('2 INITIAL HERE: _________', pageWidth - margin, yPosition, { align: 'right' });
      
      // Save PDF
      doc.save(`Lease_Agreement_${extractedData.tenant.name || 'Draft'}_${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast.success('PDF generated successfully!');
      
      // Clear form immediately after generating PDF
      handleClearAllForms(true);
    } catch (error) {
      toast.error('Failed to generate PDF. Please try again.');
      console.error('PDF generation error:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const exportLeaseWord = async () => {
    setIsGeneratingWord(true);
    try {
      toast.info('Generating Word document...');
      const blob = await leasesAPI.generateWordFromData({
        ...extractedData,
        showFinancialYear2,
        showFinancialYear3
      });
      
      if (!blob || blob.size === 0) {
        throw new Error('Word generation returned empty file');
      }
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Lease_Agreement_${extractedData.tenant.name || 'Draft'}_${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
      
      toast.success('Word document generated and downloaded successfully!');
      
      // Clear the form after successful generation
      handleClearAllForms(true);
    } catch (error) {
      toast.error(`Failed to generate Word document: ${error.message || 'Please try again.'}`);
      console.error('Word generation error:', error);
    } finally {
      setIsGeneratingWord(false);
    }
  };

  // Show login if not authenticated (AFTER all hooks)
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      {(isGeneratingPDF || isGeneratingWord || isGeneratingLease) && (
        <LoadingSpinner 
          fullScreen 
          text={isGeneratingPDF ? 'Generating PDF...' : isGeneratingWord ? 'Generating Word Document...' : 'Generating Lease Document...'} 
        />
      )}
      <ConfirmationDialog
        isOpen={showClearConfirm}
        title="Clear All Forms?"
        message="This will clear all entered data. Are you sure you want to continue?"
        confirmText="Yes, Clear All"
        cancelText="Cancel"
        type="warning"
        onConfirm={() => {
          handleClearAllForms(true);
          setShowClearConfirm(false);
          toast.info('Form cleared');
        }}
        onCancel={() => setShowClearConfirm(false)}
      />
      <ConfirmationDialog
        isOpen={showDeleteConfirm !== null}
        title="Delete Draft?"
        message={`Are you sure you want to delete "${showDeleteConfirm?.name || 'this draft'}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={() => {
          if (showDeleteConfirm) {
            const updatedDrafts = drafts.filter(d => d.id !== showDeleteConfirm.id);
            setDrafts(updatedDrafts);
            localStorage.setItem('leaseDrafts', JSON.stringify(updatedDrafts));
            toast.success('Draft deleted');
            setShowDeleteConfirm(null);
          }
        }}
        onCancel={() => setShowDeleteConfirm(null)}
      />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
        <div className="max-w-7xl mx-auto">
        {/* Modern Elegant Header */}
        <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-2xl border border-white/20 mb-6">
          {/* Header Top Section */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Logo & Title */}
              <div className="flex items-center gap-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2">
                  <FileText className="text-white" size={32} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    Automated Lease Drafting System
                    <Sparkles size={20} className="text-yellow-300" />
                  </h1>
                  <p className="text-blue-100 text-sm">Professional lease agreement generation platform</p>
                </div>
              </div>
              
              {/* User Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl px-4 py-2 transition-all duration-200 border border-white/30"
                >
                  <div className="text-right">
                    <p className="text-white font-semibold text-sm">{currentUser?.name || 'User'}</p>
                    <p className="text-blue-100 text-xs">{currentUser?.role || 'Client'}</p>
                  </div>
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                    {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <ChevronDown size={16} className={`text-white transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 z-[9999]">
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                      <p className="font-semibold text-gray-900">{currentUser?.name}</p>
                      <p className="text-sm text-gray-600">{currentUser?.role}</p>
                      <p className="text-xs text-gray-500 mt-1">@{currentUser?.username}</p>
                    </div>
                    <div className="p-2">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-red-50 text-red-600 transition-colors rounded-lg font-medium"
                      >
                        <LogOut size={20} />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons Bar */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              {/* Left: Management Buttons */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setShowDraftsModal(true)}
                  className="group relative flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl hover:from-purple-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 transform"
                >
                  <Save size={18} />
                  <span className="font-medium">Drafts</span>
                  {drafts.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-yellow-400 text-purple-900 text-xs font-bold px-2 py-0.5 rounded-full shadow-lg">
                      {drafts.length}
                    </span>
                  )}
                </button>
                
                <button
                  onClick={() => setShowHistoryModal(true)}
                  className="group relative flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl hover:from-orange-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 transform"
                >
                  <History size={18} />
                  <span className="font-medium">History</span>
                  {leaseHistory.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-yellow-400 text-red-900 text-xs font-bold px-2 py-0.5 rounded-full shadow-lg">
                      {leaseHistory.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Center: Main Action Buttons */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={async () => {
                    if (showPreview) {
                      setShowPreview(false);
                      if (previewPdfUrl) {
                        URL.revokeObjectURL(previewPdfUrl);
                        setPreviewPdfUrl(null);
                      }
                    } else {
                      try {
                        setIsLoadingPreview(true);
                        toast.info('Generating PDF preview...');
                        const blob = await leasesAPI.generatePDFFromData({
                          ...extractedData,
                          showFinancialYear2,
                          showFinancialYear3
                        }, true); // true = isPreview
                        const url = URL.createObjectURL(blob);
                        setPreviewPdfUrl(url);
                        setShowPreview(true);
                        toast.success('Preview generated successfully!');
                      } catch (error) {
                        console.error('Preview error:', error);
                        toast.error(`Failed to generate preview: ${error.message || 'Check if server is running.'}`);
                      } finally {
                        setIsLoadingPreview(false);
                      }
                    }
                  }}
                  disabled={isLoadingPreview}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-xl hover:from-blue-600 hover:to-cyan-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 transform font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingPreview ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Loading Preview...</span>
                    </>
                  ) : (
                    <>
                      <Eye size={18} />
                      <span>{showPreview ? 'Hide' : 'Preview'}</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={exportLeasePDF}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 transform font-medium"
                >
                  <Download size={18} />
                  <span>Generate PDF</span>
                </button>
                
                <button
                  onClick={exportLeaseWord}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 transform font-medium"
                >
                  <FileText size={18} />
                  <span>Generate Word</span>
                </button>
              </div>

              {/* Right: Utility Buttons */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    try {
                      // Create draft from current form data
                      const draftName = extractedData.tenant.name 
                        ? `${extractedData.tenant.name} - Draft`
                        : `Draft ${new Date().toLocaleString()}`;
                      
                      const newDraft = {
                        id: Date.now(),
                        name: draftName,
                        date: new Date().toISOString(),
                        data: { ...extractedData }
                      };
                      
                      // Save to localStorage
                      const existingDrafts = JSON.parse(localStorage.getItem('leaseDrafts') || '[]');
                      existingDrafts.push(newDraft);
                      // Keep only last 50 drafts
                      const trimmedDrafts = existingDrafts.slice(-50);
                      localStorage.setItem('leaseDrafts', JSON.stringify(trimmedDrafts));
                      setDrafts(trimmedDrafts);
                      
                      toast.success('Draft saved successfully!');
                      addAuditEntry('Draft Saved', `Saved draft: ${draftName}`);
                    } catch (error) {
                      console.error('Error saving draft:', error);
                      toast.error('Failed to save draft. Please try again.');
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-green-600 text-white rounded-xl hover:from-teal-600 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 transform font-medium"
                  title="Save current form as draft"
                >
                  <Save size={18} />
                  <span>Save</span>
                </button>
                
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-xl hover:from-rose-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 transform font-medium"
                  title="Clear all fields to start fresh"
                >
                  <Trash2 size={18} />
                  <span>Clear</span>
                </button>
                
                <button
                  onClick={() => {
                    const savedPackages = localStorage.getItem('leasePackages');
                    if (savedPackages) {
                      setLeasePackages(JSON.parse(savedPackages));
                    }
                    setShowLeasePackagesModal(true);
                  }}
                  className="group relative flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 transform font-medium"
                >
                  <Folder size={18} />
                  <span>Saved</span>
                  {leasePackages.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-yellow-400 text-purple-900 text-xs font-bold px-2 py-0.5 rounded-full shadow-lg">
                      {leasePackages.length}
                    </span>
                  )}
                </button>
              </div>
            </div>
            
            {/* Auto-save Status Indicator */}
            {autoSaveStatus && (
              <div className="mt-3 flex items-center justify-center">
                {autoSaveStatus === 'saving' && (
                  <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
                    <Loader2 size={14} className="animate-spin" />
                    <span className="font-medium">Auto-saving...</span>
                  </div>
                )}
                {autoSaveStatus === 'saved' && (
                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
                    <CheckCircle size={14} />
                    <span className="font-medium">All changes saved</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Upload className="text-blue-600" size={24} />
                  Upload Documents
                </h2>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                  <FileCheck className="text-blue-600" size={16} />
                  <span className="text-sm font-semibold text-blue-700">
                    {uploadedDocumentsCount} {uploadedDocumentsCount === 1 ? 'Document' : 'Documents'}
                  </span>
                </div>
              </div>
              
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Landlord CIPC Document
                  </label>
                  {verificationStatus.landlordCIPC.verified && (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <FileCheck size={14} />
                      <span>Verified</span>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.txt"
                  multiple
                  onChange={(e) => handleFileUpload('landlordCIPC', e.target.files)}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {documents.landlordCIPC && documents.landlordCIPC.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {documents.landlordCIPC.map((file, index) => (
                      <div key={index} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-sm text-green-700 flex-1 min-w-0">
                            <CheckCircle size={16} className="flex-shrink-0" />
                            <span className="truncate font-medium">{file.name}</span>
                          </div>
                          <button
                            onClick={() => handleRemoveDocument('landlordCIPC', index)}
                            className="ml-2 p-1 text-red-600 hover:bg-red-100 rounded transition flex-shrink-0"
                            title="Remove document"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        {verificationStatus.landlordCIPC.regNo && index === 0 && (
                          <div className="mt-2 pl-6 text-xs text-gray-700">
                            <span className="font-semibold">Registration No:</span> <span className="font-mono">{verificationStatus.landlordCIPC.regNo}</span>
                          </div>
                        )}
                        {verificationStatus.landlordCIPC.verified && verificationStatus.landlordCIPC.date && index === 0 && (
                          <div className="mt-1 pl-6 text-xs text-gray-500">
                            Verified: {new Date(verificationStatus.landlordCIPC.date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {processing.landlordCIPC && (
                  <div className="mt-2 text-sm text-blue-600">Processing...</div>
                )}
                {processingErrors.landlordCIPC && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={16} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-800">Processing Error</p>
                        <p className="text-sm text-red-700 mt-1">{processingErrors.landlordCIPC}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Tenant CIPC Document *
                  </label>
                  {verificationStatus.tenantCIPC.verified && (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <FileCheck size={14} />
                      <span>Verified</span>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.txt"
                  multiple
                  onChange={(e) => handleFileUpload('tenantCIPC', e.target.files)}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {documents.tenantCIPC && documents.tenantCIPC.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {documents.tenantCIPC.map((file, index) => (
                      <div key={index} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 text-sm text-green-700 flex-1 min-w-0">
                            <CheckCircle size={16} className="flex-shrink-0" />
                            <span className="truncate font-medium">{file.name}</span>
                          </div>
                          <button
                            onClick={() => handleRemoveDocument('tenantCIPC', index)}
                            className="ml-2 p-1 text-red-600 hover:bg-red-100 rounded transition flex-shrink-0"
                            title="Remove document"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        {verificationStatus.tenantCIPC.regNo && index === 0 && (
                          <div className="mt-2 pl-6 text-xs text-gray-600">
                            <span className="font-medium">Registration No:</span> {verificationStatus.tenantCIPC.regNo}
                          </div>
                        )}
                        {verificationStatus.tenantCIPC.verified && verificationStatus.tenantCIPC.date && index === 0 && (
                          <div className="mt-1 pl-6 text-xs text-gray-500">
                            Verified: {new Date(verificationStatus.tenantCIPC.date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {processing.tenantCIPC && (
                  <div className="mt-2 text-sm text-blue-600">Processing...</div>
                )}
                {processingErrors.tenantCIPC && (
                  <div className="mt-2 text-sm text-red-600">{processingErrors.tenantCIPC}</div>
                )}
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Tenant ID Document
                  </label>
                  {verificationStatus.tenantID.verified && (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <FileCheck size={14} />
                      <span>Verified</span>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.txt"
                  multiple
                  onChange={(e) => handleFileUpload('tenantID', e.target.files)}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {documents.tenantID && documents.tenantID.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {documents.tenantID.map((file, index) => (
                      <div key={index} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 text-sm text-green-700 flex-1 min-w-0">
                            <CheckCircle size={16} className="flex-shrink-0" />
                            <span className="truncate font-medium">{file.name}</span>
                          </div>
                          <button
                            onClick={() => handleRemoveDocument('tenantID', index)}
                            className="ml-2 p-1 text-red-600 hover:bg-red-100 rounded transition flex-shrink-0"
                            title="Remove document"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        {verificationStatus.tenantID.idNumber && index === 0 && (
                          <div className="mt-2 pl-6 text-xs text-gray-600">
                            <span className="font-medium">ID Number:</span> {verificationStatus.tenantID.idNumber}
                          </div>
                        )}
                        {verificationStatus.tenantID.verified && verificationStatus.tenantID.date && index === 0 && (
                          <div className="mt-1 pl-6 text-xs text-gray-500">
                            Verified: {new Date(verificationStatus.tenantID.date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {processing.tenantID && (
                  <div className="mt-2 text-sm text-blue-600">Processing...</div>
                )}
                {processingErrors.tenantID && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={16} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-800">Processing Error</p>
                        <p className="text-sm text-red-700 mt-1">{processingErrors.tenantID}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-4 p-4 bg-blue-50 rounded-lg border-2 border-dashed border-blue-300">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Clipboard className="text-blue-600" size={18} />
                  Or Paste FICA Document Text
                </label>
                <textarea
                  value={pastedFicaText}
                  onChange={(e) => setPastedFicaText(e.target.value)}
                  placeholder="Paste FICA document text here (Ctrl+V)..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={18}
                  style={{ minHeight: '400px' }}
                />
                <button
                  onClick={handlePasteFica}
                  disabled={processing.pastedFica || !pastedFicaText.trim()}
                  className="mt-2 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {processing.pastedFica ? (
                    <>
                      <AlertCircle size={16} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Clipboard size={16} />
                      Extract Data from Pasted Text
                    </>
                  )}
                </button>
                {processingErrors.pastedFica && (
                  <div className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle size={14} />
                    {processingErrors.pastedFica}
                  </div>
                )}
                {!processing.pastedFica && !processingErrors.pastedFica && pastedFicaText.trim() && (
                  <div className="mt-2 text-xs text-gray-500">
                    Click "Extract Data" to populate tenant fields from the pasted text.
                  </div>
                )}
              </div>


              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Surety ID Document *
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.txt"
                  multiple
                  onChange={(e) => handleFileUpload('suretyID', e.target.files)}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {documents.suretyID && documents.suretyID.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {documents.suretyID.map((file, index) => (
                      <div key={index} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 text-sm text-green-700 flex-1 min-w-0">
                            <CheckCircle size={16} className="flex-shrink-0" />
                            <span className="truncate font-medium">{file.name}</span>
                          </div>
                          <button
                            onClick={() => handleRemoveDocument('suretyID', index)}
                            className="ml-2 p-1 text-red-600 hover:bg-red-100 rounded transition flex-shrink-0"
                            title="Remove document"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        {verificationStatus.suretyID.idNumber && index === 0 && (
                          <div className="mt-2 pl-6 text-xs text-gray-600">
                            <span className="font-medium">ID Number:</span> {verificationStatus.suretyID.idNumber}
                          </div>
                        )}
                        {verificationStatus.suretyID.verified && verificationStatus.suretyID.date && index === 0 && (
                          <div className="mt-1 pl-6 text-xs text-gray-500">
                            Verified: {new Date(verificationStatus.suretyID.date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {processing.suretyID && (
                  <div className="mt-2 text-sm text-blue-600">Processing...</div>
                )}
                {processingErrors.suretyID && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={16} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-800">Processing Error</p>
                        <p className="text-sm text-red-700 mt-1">{processingErrors.suretyID}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {(processing.landlordCIPC || processing.tenantCIPC || processing.tenantID || processing.suretyID) && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center gap-2 text-blue-700">
                  <AlertCircle size={20} />
                  <span className="text-sm">Processing documents...</span>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {/* 1.1 Landlord Information Section */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Building className="text-purple-600" size={24} />
                  1.1 THE LANDLORD
                </h2>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasDefaultLandlord}
                    onChange={(e) => {
                      if (e.target.checked) {
                        // Check if landlord data exists
                        const landlordName = extractedData?.landlord?.name;
                        if (!landlordName || landlordName.trim() === '') {
                          toast.warning('Please fill in landlord information first before setting as default.');
                          e.target.checked = false;
                          return;
                        }
                        // Save as default
                        localStorage.setItem('defaultLandlord', JSON.stringify(extractedData.landlord));
                        setHasDefaultLandlord(true);
                        toast.success('Default landlord saved!');
                      } else {
                        // Remove default
                        localStorage.removeItem('defaultLandlord');
                        setHasDefaultLandlord(false);
                        toast.success('Default landlord removed');
                      }
                    }}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <Star size={16} fill={hasDefaultLandlord ? 'currentColor' : 'none'} className={hasDefaultLandlord ? 'text-yellow-500' : 'text-gray-400'} />
                    Save as Default
                  </span>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Landlord Name"
                  value={extractedData.landlord.name}
                  onChange={(e) => updateField('landlord', 'name', e.target.value)}
                  className="col-span-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Phone Number"
                  value={extractedData.landlord.phone}
                  onChange={(e) => updateField('landlord', 'phone', e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Registration Number"
                  value={extractedData.landlord.regNo}
                  onChange={(e) => updateField('landlord', 'regNo', e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="VAT Number"
                  value={extractedData.landlord.vatNo}
                  onChange={(e) => updateField('landlord', 'vatNo', e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Bank Name"
                  value={extractedData.landlord.bank}
                  onChange={(e) => updateField('landlord', 'bank', e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Bank Branch"
                  value={extractedData.landlord.branch}
                  onChange={(e) => updateField('landlord', 'branch', e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Account Number"
                  value={extractedData.landlord.accountNo}
                  onChange={(e) => updateField('landlord', 'accountNo', e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Branch Code"
                  value={extractedData.landlord.branchCode}
                  onChange={(e) => updateField('landlord', 'branchCode', e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* 1.2 Tenant Information Section */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Building className="text-blue-600" size={24} />
                1.2 THE TENANT
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Company Name"
                  value={extractedData.tenant.name}
                  onChange={(e) => updateField('tenant', 'name', e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="ID Number"
                  value={extractedData.tenant.idNumber}
                  onChange={(e) => updateField('tenant', 'idNumber', e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Registration Number"
                  value={extractedData.tenant.regNo}
                  onChange={(e) => updateField('tenant', 'regNo', e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="VAT Number"
                  value={extractedData.tenant.vatNo}
                  onChange={(e) => updateField('tenant', 'vatNo', e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Trading As"
                  value={extractedData.tenant.tradingAs}
                  onChange={(e) => updateField('tenant', 'tradingAs', e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Postal Address"
                  value={extractedData.tenant.postalAddress}
                  onChange={(e) => updateField('tenant', 'postalAddress', e.target.value)}
                  className="col-span-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Physical Address"
                  value={extractedData.tenant.physicalAddress}
                  onChange={(e) => updateField('tenant', 'physicalAddress', e.target.value)}
                  className="col-span-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                
                {/* Tenant Bank Details */}
                <div className="col-span-2 border-t pt-4 mt-2">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Bank Account Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Bank Name"
                      value={extractedData.tenant.bankName || ''}
                      onChange={(e) => updateField('tenant', 'bankName', e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      placeholder="Account Number"
                      value={extractedData.tenant.bankAccountNumber || ''}
                      onChange={(e) => updateField('tenant', 'bankAccountNumber', e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      placeholder="Branch Code"
                      value={extractedData.tenant.bankBranchCode || ''}
                      onChange={(e) => updateField('tenant', 'bankBranchCode', e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      placeholder="Account Type (e.g., Cheque/Savings)"
                      value={extractedData.tenant.bankAccountType || ''}
                      onChange={(e) => updateField('tenant', 'bankAccountType', e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      placeholder="Account Holder Name"
                      value={extractedData.tenant.bankAccountHolder || ''}
                      onChange={(e) => updateField('tenant', 'bankAccountHolder', e.target.value)}
                      className="col-span-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Building className="text-blue-600" size={24} />
                1.3-1.8 THE PREMISES
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Unit Number"
                  value={extractedData.premises.unit}
                  onChange={(e) => updateField('premises', 'unit', e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Building Name"
                  value={extractedData.premises.buildingName}
                  onChange={(e) => updateField('premises', 'buildingName', e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Building Address"
                  value={extractedData.premises.buildingAddress}
                  onChange={(e) => updateField('premises', 'buildingAddress', e.target.value)}
                  className="col-span-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="relative">
                  <input
                    type="text"
                    placeholder="361.00"
                    value={extractedData.premises.size}
                    onChange={(e) => updateField('premises', 'size', e.target.value)}
                    className="px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">m²</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="4.325"
                    value={extractedData.premises.percentage}
                    onChange={(e) => updateField('premises', 'percentage', e.target.value)}
                    className="px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">%</span>
                </div>
                <input
                  type="text"
                  placeholder="Permitted Use"
                  value={extractedData.premises.permittedUse}
                  onChange={(e) => updateField('premises', 'permittedUse', e.target.value)}
                  className="col-span-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* 1.9 INITIAL PERIOD OF LEASE */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="text-blue-600" size={24} />
                1.9 INITIAL PERIOD OF LEASE
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">YEARS</label>
                  <input
                    type="number"
                    value={extractedData.lease.years}
                    onChange={(e) => updateField('lease', 'years', parseInt(e.target.value) || 0)}
                    placeholder="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MONTHS</label>
                  <input
                    type="number"
                    value={extractedData.lease.months}
                    onChange={(e) => updateField('lease', 'months', parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">COMMENCEMENT DATE</label>
                  <input
                    type="date"
                    value={extractedData.lease.commencementDate}
                    onChange={(e) => updateField('lease', 'commencementDate', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TERMINATION DATE</label>
                  <input
                    type="date"
                    value={extractedData.lease.terminationDate}
                    onChange={(e) => updateField('lease', 'terminationDate', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* 1.10 OPTION PERIOD OF LEASE */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="text-green-600" size={24} />
                1.10 OPTION PERIOD OF LEASE
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                (TO BE EXERCISED BY A SPECIFIC DATE) OPTION PERIOD IS TO BE MUTUALLY DETERMINED BY THE PARTIES
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">YEARS</label>
                  <input
                    type="number"
                    value={extractedData.lease.optionYears}
                    onChange={(e) => updateField('lease', 'optionYears', parseInt(e.target.value) || 0)}
                    placeholder="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MONTHS</label>
                  <input
                    type="number"
                    value={extractedData.lease.optionMonths}
                    onChange={(e) => updateField('lease', 'optionMonths', parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">OPTION TO BE EXERCISED BY</label>
                  <input
                    type="date"
                    value={extractedData.lease.optionExerciseDate}
                    onChange={(e) => updateField('lease', 'optionExerciseDate', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* 1.11 SURETY */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <User className="text-blue-600" size={24} />
                1.11 SURETY
              </h2>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasDefaultSurety}
                    onChange={(e) => {
                      if (e.target.checked) {
                        // Check if surety data exists
                        const suretyName = extractedData?.surety?.name;
                        if (!suretyName || suretyName.trim() === '') {
                          toast.warning('Please fill in surety information first before setting as default.');
                          e.target.checked = false;
                          return;
                        }
                        // Save as default
                        localStorage.setItem('defaultSurety', JSON.stringify(extractedData.surety));
                        setHasDefaultSurety(true);
                        toast.success('Default surety saved!');
                      } else {
                        // Remove default
                        localStorage.removeItem('defaultSurety');
                        setHasDefaultSurety(false);
                        toast.success('Default surety removed');
                      }
                    }}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <Star size={16} fill={hasDefaultSurety ? 'currentColor' : 'none'} className={hasDefaultSurety ? 'text-yellow-500' : 'text-gray-400'} />
                    Save as Default
                  </span>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NAME</label>
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={extractedData.surety.name}
                    onChange={(e) => updateField('surety', 'name', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID NUMBER</label>
                  <input
                    type="text"
                    placeholder="ID Number"
                    value={extractedData.surety.idNumber}
                    onChange={(e) => updateField('surety', 'idNumber', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">ADDRESS</label>
                  <input
                    type="text"
                    placeholder="Physical Address"
                    value={extractedData.surety.address}
                    onChange={(e) => updateField('surety', 'address', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* 1.12 MONTHLY RENTAL AND OTHER MONTHLY CHARGES */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-blue-600 text-2xl">💰</span>
                1.12 MONTHLY RENTAL AND OTHER MONTHLY CHARGES
              </h2>
              
              {/* Compact Note */}
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <p className="text-xs text-gray-700">
                  💡 <strong>Tip:</strong> The "AS AT" date for RATES and REFUSE fields is set inline with each field label below.
                </p>
              </div>
              
              <div className="mb-6 p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm border border-blue-200">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-2xl">📅</span>
                  <span>Year 1</span>
                </h3>
                
                {/* Single Row - 7 Columns to match PDF exactly */}
                <div className="grid grid-cols-7 gap-3">
                  {/* Column 1: BASIC RENT EXCL. VAT */}
                  <div className="border-r-2 border-blue-200 pr-2">
                    <label className="block text-xs font-bold text-gray-800 mb-2 text-center uppercase tracking-wide">BASIC RENT<br/>EXCL. VAT</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">R</span>
                      <input
                        type="text"
                        placeholder="22730.00"
                        value={extractedData.financial.year1.basicRent}
                        onChange={(e) => updateFinancialField('year1', 'basicRent', e.target.value)}
                        className="w-full pl-7 pr-2 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-400 bg-white shadow-sm"
                      />
                    </div>
                  </div>
                  
                  {/* Column 2: BASIC RENT INCL. VAT */}
                  <div className="border-r-2 border-blue-200 pr-2">
                    <label className="block text-xs font-bold text-gray-800 mb-2 text-center uppercase tracking-wide">BASIC RENT<br/>INCL. VAT</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">R</span>
                      <input
                        type="text"
                        value={extractedData.financial.year1.basicRent ? (parseFloat(extractedData.financial.year1.basicRent) * 1.15).toFixed(2) : ''}
                        readOnly
                        placeholder="Auto"
                        className="w-full pl-7 pr-2 py-2.5 text-sm border-2 border-gray-300 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 text-gray-700 shadow-sm"
                      />
                    </div>
                  </div>
                  
                  {/* Column 3: SECURITY EXCL. VAT */}
                  <div className="border-r-2 border-blue-200 pr-2">
                    <label className="block text-xs font-bold text-gray-800 mb-2 text-center uppercase tracking-wide">SECURITY<br/>EXCL. VAT</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">R</span>
                      <input
                        type="text"
                        placeholder="1033.18"
                        value={extractedData.financial.year1.security}
                        onChange={(e) => updateFinancialField('year1', 'security', e.target.value)}
                        className="w-full pl-7 pr-2 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-400 bg-white shadow-sm"
                      />
                    </div>
                  </div>
                  
                  {/* Column 4: ELECTRICITY SEWERAGE & WATER + *REFUSE AS AT (COMBINED) - HIGHLIGHTED */}
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-2.5 rounded-lg border-2 border-amber-200 shadow-md">
                    <label className="block text-xs font-bold text-gray-800 mb-2 text-center leading-tight uppercase tracking-wide">
                      ELECTRICITY<br/>SEWERAGE & WATER<br/>
                      <span className="text-[11px] text-orange-700 font-semibold">*REFUSE AS AT</span><br/>
                      <input
                        type="date"
                        value={extractedData.financial.ratesEffectiveDate}
                        onChange={(e) => setExtractedData(prev => ({
                          ...prev,
                          financial: { ...prev.financial, ratesEffectiveDate: e.target.value }
                        }))}
                        className="w-full px-2 py-1 text-[11px] border-2 border-amber-300 rounded focus:ring-2 focus:ring-orange-400 mt-1 bg-white shadow-sm"
                      />
                      <span className="text-[11px] text-orange-700 font-semibold">EXCL. VAT</span>
                    </label>
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        placeholder="METERED"
                        value={extractedData.financial.year1.sewerageWater}
                        onChange={(e) => updateFinancialField('year1', 'sewerageWater', e.target.value)}
                        className="w-full px-2.5 py-2 text-xs border-2 border-amber-300 rounded focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-200 hover:border-orange-300 bg-white shadow-sm"
                      />
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600 font-medium text-xs">R</span>
                        <input
                          type="text"
                          placeholder="515.94"
                          value={extractedData.financial.year1.refuse}
                          onChange={(e) => updateFinancialField('year1', 'refuse', e.target.value)}
                          className="w-full pl-6 pr-2 py-2 text-xs border-2 border-amber-300 rounded focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-200 hover:border-orange-300 bg-white shadow-sm"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Column 5: *RATES AS AT */}
                  <div className="border-r-2 border-blue-200 pr-2">
                    <label className="block text-xs font-bold text-gray-800 mb-2 text-center uppercase tracking-wide">
                      *RATES AS AT<br/>
                      <input
                        type="date"
                        value={extractedData.financial.ratesEffectiveDate}
                        onChange={(e) => setExtractedData(prev => ({
                          ...prev,
                          financial: { ...prev.financial, ratesEffectiveDate: e.target.value }
                        }))}
                        className="w-full px-2 py-1 text-[11px] border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-400 mt-1 bg-white shadow-sm"
                      />
                      <span className="text-[11px]">EXCL. VAT</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">R</span>
                      <input
                        type="text"
                        placeholder="251.29"
                        value={extractedData.financial.year1.rates}
                        onChange={(e) => updateFinancialField('year1', 'rates', e.target.value)}
                        className="w-full pl-7 pr-2 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-400 bg-white shadow-sm"
                      />
                    </div>
                  </div>
                  
                  {/* Column 6: FROM */}
                  <div className="border-r-2 border-blue-200 pr-2">
                    <label className="block text-xs font-bold text-gray-800 mb-2 text-center uppercase tracking-wide">FROM</label>
                    <input
                      type="date"
                      value={extractedData.financial.year1.from}
                      onChange={(e) => updateFinancialField('year1', 'from', e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-400 bg-white shadow-sm"
                    />
                  </div>
                  
                  {/* Column 7: TO */}
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-2 text-center uppercase tracking-wide">TO</label>
                    <input
                      type="date"
                      value={extractedData.financial.year1.to}
                      onChange={(e) => updateFinancialField('year1', 'to', e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-400 bg-white shadow-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="mb-4 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="showYear2"
                  checked={showFinancialYear2}
                  onChange={(e) => setShowFinancialYear2(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="showYear2" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Include Year 2 in lease agreement
                </label>
              </div>

              {showFinancialYear2 && (
                <div className="mb-6 p-5 bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl shadow-sm border border-green-200">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-2xl">📅</span>
                    <span>Year 2 (Auto-escalated 6%)</span>
                  </h3>
                
                {/* Single Row - 7 Columns to match PDF exactly */}
                <div className="grid grid-cols-7 gap-3">
                  <div className="border-r-2 border-green-200 pr-2">
                    <label className="block text-xs font-bold text-gray-800 mb-2 text-center uppercase tracking-wide">BASIC RENT<br/>EXCL. VAT</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">R</span>
                      <input
                        type="text"
                        value={extractedData.financial.year2.basicRent}
                        readOnly
                        placeholder="Auto"
                        className="w-full pl-7 pr-2 py-2.5 text-sm border-2 border-gray-300 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 text-gray-700 shadow-sm"
                      />
                    </div>
                  </div>
                  <div className="border-r-2 border-green-200 pr-2">
                    <label className="block text-xs font-bold text-gray-800 mb-2 text-center uppercase tracking-wide">BASIC RENT<br/>INCL. VAT</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">R</span>
                      <input
                        type="text"
                        value={extractedData.financial.year2.basicRent ? (parseFloat(extractedData.financial.year2.basicRent) * 1.15).toFixed(2) : ''}
                        readOnly
                        placeholder="Auto"
                        className="w-full pl-7 pr-2 py-2.5 text-sm border-2 border-gray-300 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 text-gray-700 shadow-sm"
                      />
                    </div>
                  </div>
                  <div className="border-r-2 border-green-200 pr-2">
                    <label className="block text-xs font-bold text-gray-800 mb-2 text-center uppercase tracking-wide">SECURITY<br/>EXCL. VAT</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">R</span>
                      <input
                        type="text"
                        value={extractedData.financial.year2.security}
                        readOnly
                        placeholder="Auto"
                        className="w-full pl-7 pr-2 py-2.5 text-sm border-2 border-gray-300 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 text-gray-700 shadow-sm"
                      />
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-2.5 rounded-lg border-2 border-amber-200 shadow-md">
                    <label className="block text-xs font-bold text-gray-800 mb-2 text-center leading-tight uppercase tracking-wide">
                      ELECTRICITY<br/>SEWERAGE & WATER<br/>
                      <span className="text-[11px] text-orange-700 font-semibold">*REFUSE AS AT</span><br/>
                      <input
                        type="date"
                        value={extractedData.financial.ratesEffectiveDate}
                        onChange={(e) => setExtractedData(prev => ({
                          ...prev,
                          financial: { ...prev.financial, ratesEffectiveDate: e.target.value }
                        }))}
                        className="w-full px-2 py-1 text-[11px] border-2 border-amber-300 rounded focus:ring-2 focus:ring-orange-400 mt-1 bg-white shadow-sm"
                      />
                      <span className="text-[11px] text-orange-700 font-semibold">EXCL. VAT</span>
                    </label>
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        placeholder="METERED"
                        value={extractedData.financial.year2.sewerageWater}
                        onChange={(e) => updateFinancialField('year2', 'sewerageWater', e.target.value)}
                        className="w-full px-2.5 py-2 text-xs border-2 border-amber-300 rounded focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-200 hover:border-orange-300 bg-white shadow-sm"
                      />
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600 font-medium text-xs">R</span>
                        <input
                          type="text"
                          placeholder="0.00"
                          value={extractedData.financial.year2.refuse}
                          onChange={(e) => updateFinancialField('year2', 'refuse', e.target.value)}
                          className="w-full pl-6 pr-2 py-2 text-xs border-2 border-amber-300 rounded focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-200 hover:border-orange-300 bg-white shadow-sm"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="border-r-2 border-green-200 pr-2">
                    <label className="block text-xs font-bold text-gray-800 mb-2 text-center uppercase tracking-wide">
                      *RATES AS AT<br/>
                      <input
                        type="date"
                        value={extractedData.financial.ratesEffectiveDate}
                        onChange={(e) => setExtractedData(prev => ({
                          ...prev,
                          financial: { ...prev.financial, ratesEffectiveDate: e.target.value }
                        }))}
                        className="w-full px-2 py-1 text-[11px] border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-400 mt-1 bg-white shadow-sm"
                      />
                      <span className="text-[11px]">EXCL. VAT</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">R</span>
                      <input
                        type="text"
                        placeholder="0.00"
                        value={extractedData.financial.year2.rates}
                        onChange={(e) => updateFinancialField('year2', 'rates', e.target.value)}
                        className="w-full pl-7 pr-2 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-400 bg-white shadow-sm"
                      />
                    </div>
                  </div>
                  <div className="border-r-2 border-green-200 pr-2">
                    <label className="block text-xs font-bold text-gray-800 mb-2 text-center uppercase tracking-wide">FROM</label>
                    <input
                      type="date"
                      value={extractedData.financial.year2.from}
                      onChange={(e) => updateFinancialField('year2', 'from', e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-400 bg-white shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-2 text-center uppercase tracking-wide">TO</label>
                    <input
                      type="date"
                      value={extractedData.financial.year2.to}
                      onChange={(e) => updateFinancialField('year2', 'to', e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-400 bg-white shadow-sm"
                    />
                  </div>
                </div>
              </div>
              )}

              <div className="mb-4 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="showYear3"
                  checked={showFinancialYear3}
                  onChange={(e) => setShowFinancialYear3(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="showYear3" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Include Year 3 in lease agreement
                </label>
              </div>

              {showFinancialYear3 && (
                <div className="mb-6 p-5 bg-gradient-to-br from-yellow-50 to-amber-100 rounded-xl shadow-sm border border-yellow-200">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-2xl">📅</span>
                    <span>Year 3 (Auto-escalated 6%)</span>
                  </h3>
                
                {/* Single Row - 7 Columns to match PDF exactly */}
                <div className="grid grid-cols-7 gap-3">
                  <div className="border-r-2 border-yellow-200 pr-2">
                    <label className="block text-xs font-bold text-gray-800 mb-2 text-center uppercase tracking-wide">BASIC RENT<br/>EXCL. VAT</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">R</span>
                      <input
                        type="text"
                        value={extractedData.financial.year3.basicRent}
                        readOnly
                        placeholder="Auto"
                        className="w-full pl-7 pr-2 py-2.5 text-sm border-2 border-gray-300 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 text-gray-700 shadow-sm"
                      />
                    </div>
                  </div>
                  <div className="border-r-2 border-yellow-200 pr-2">
                    <label className="block text-xs font-bold text-gray-800 mb-2 text-center uppercase tracking-wide">BASIC RENT<br/>INCL. VAT</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">R</span>
                      <input
                        type="text"
                        value={extractedData.financial.year3.basicRent ? (parseFloat(extractedData.financial.year3.basicRent) * 1.15).toFixed(2) : ''}
                        readOnly
                        placeholder="Auto"
                        className="w-full pl-7 pr-2 py-2.5 text-sm border-2 border-gray-300 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 text-gray-700 shadow-sm"
                      />
                    </div>
                  </div>
                  <div className="border-r-2 border-yellow-200 pr-2">
                    <label className="block text-xs font-bold text-gray-800 mb-2 text-center uppercase tracking-wide">SECURITY<br/>EXCL. VAT</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">R</span>
                      <input
                        type="text"
                        value={extractedData.financial.year3.security}
                        readOnly
                        placeholder="Auto"
                        className="w-full pl-7 pr-2 py-2.5 text-sm border-2 border-gray-300 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 text-gray-700 shadow-sm"
                      />
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-2.5 rounded-lg border-2 border-amber-200 shadow-md">
                    <label className="block text-xs font-bold text-gray-800 mb-2 text-center leading-tight uppercase tracking-wide">
                      ELECTRICITY<br/>SEWERAGE & WATER<br/>
                      <span className="text-[11px] text-orange-700 font-semibold">*REFUSE AS AT</span><br/>
                      <input
                        type="date"
                        value={extractedData.financial.ratesEffectiveDate}
                        onChange={(e) => setExtractedData(prev => ({
                          ...prev,
                          financial: { ...prev.financial, ratesEffectiveDate: e.target.value }
                        }))}
                        className="w-full px-2 py-1 text-[11px] border-2 border-amber-300 rounded focus:ring-2 focus:ring-orange-400 mt-1 bg-white shadow-sm"
                      />
                      <span className="text-[11px] text-orange-700 font-semibold">EXCL. VAT</span>
                    </label>
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        placeholder="METERED"
                        value={extractedData.financial.year3.sewerageWater}
                        onChange={(e) => updateFinancialField('year3', 'sewerageWater', e.target.value)}
                        className="w-full px-2.5 py-2 text-xs border-2 border-amber-300 rounded focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-200 hover:border-orange-300 bg-white shadow-sm"
                      />
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600 font-medium text-xs">R</span>
                        <input
                          type="text"
                          placeholder="0.00"
                          value={extractedData.financial.year3.refuse}
                          onChange={(e) => updateFinancialField('year3', 'refuse', e.target.value)}
                          className="w-full pl-6 pr-2 py-2 text-xs border-2 border-amber-300 rounded focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-200 hover:border-orange-300 bg-white shadow-sm"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="border-r-2 border-yellow-200 pr-2">
                    <label className="block text-xs font-bold text-gray-800 mb-2 text-center uppercase tracking-wide">
                      *RATES AS AT<br/>
                      <input
                        type="date"
                        value={extractedData.financial.ratesEffectiveDate}
                        onChange={(e) => setExtractedData(prev => ({
                          ...prev,
                          financial: { ...prev.financial, ratesEffectiveDate: e.target.value }
                        }))}
                        className="w-full px-2 py-1 text-[11px] border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-400 mt-1 bg-white shadow-sm"
                      />
                      <span className="text-[11px]">EXCL. VAT</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">R</span>
                      <input
                        type="text"
                        placeholder="0.00"
                        value={extractedData.financial.year3.rates}
                        onChange={(e) => updateFinancialField('year3', 'rates', e.target.value)}
                        className="w-full pl-7 pr-2 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-400 bg-white shadow-sm"
                      />
                    </div>
                  </div>
                  <div className="border-r-2 border-yellow-200 pr-2">
                    <label className="block text-xs font-bold text-gray-800 mb-2 text-center uppercase tracking-wide">FROM</label>
                    <input
                      type="date"
                      value={extractedData.financial.year3.from}
                      onChange={(e) => updateFinancialField('year3', 'from', e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-400 bg-white shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-2 text-center uppercase tracking-wide">TO</label>
                    <input
                      type="date"
                      value={extractedData.financial.year3.to}
                      onChange={(e) => updateFinancialField('year3', 'to', e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-400 bg-white shadow-sm"
                    />
                  </div>
                </div>
              </div>
              )}

              {/* Note about increases */}
              <div className="mt-6 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                <p className="text-sm font-bold text-gray-900">
                  *INCREASES AS PER RELEVANT MUNICIPAL AUTHORITY/CONTRACTOR IN RATES AND REFUSE TO APPLY ON A PROPORTIONATE BASIS.
                </p>
              </div>

              {/* 1.13-1.18 Sections matching PDF */}
              <div className="mt-6 space-y-3">
                <div className="grid grid-cols-2 gap-4 items-center p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                  <label className="text-sm font-bold text-gray-900">1.13 DEPOSIT</label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 font-medium">R</span>
                      <input
                        type="text"
                        placeholder="39710.00"
                        value={extractedData.financial.deposit}
                        onChange={(e) => updateField('financial', 'deposit', e.target.value)}
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <span className="text-sm text-gray-700 whitespace-nowrap">– DEPOSIT HELD.</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 items-center p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                  <label className="text-sm font-bold text-gray-900">1.14.1 TURNOVER PERCENTAGE</label>
                  <input
                    type="text"
                    placeholder="N/A"
                    value={extractedData.financial.turnoverPercentage}
                    onChange={(e) => updateField('financial', 'turnoverPercentage', e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 items-center p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                  <label className="text-sm font-bold text-gray-900">1.14.2 TENANT'S FINANCIAL YEAR END</label>
                  <input
                    type="text"
                    placeholder="N/A"
                    value={extractedData.financial.financialYearEnd}
                    onChange={(e) => updateField('financial', 'financialYearEnd', e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 items-center p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                  <label className="text-sm font-bold text-gray-900">1.14.3 MINIMUM TURNOVER REQUIREMENT ESCALATING ANNUALLY</label>
                  <input
                    type="text"
                    placeholder="N/A"
                    value={extractedData.financial.minimumTurnover}
                    onChange={(e) => updateField('financial', 'minimumTurnover', e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 items-start p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                  <div>
                    <label className="text-sm font-bold text-gray-900 block mb-1">
                      1.15 TENANT'S ADVERTISING AND PROMOTIONAL CONTRIBUTION
                    </label>
                    <p className="text-xs text-gray-600">
                      % AGE OF TENANT'S NET MONTHLY RENTAL PLUS ATTRIBUTABLE VALUE ADDED TAX THEREON
                    </p>
                  </div>
                  <input
                    type="text"
                    placeholder="N/A"
                    value={extractedData.financial.advertisingContribution}
                    onChange={(e) => updateField('financial', 'advertisingContribution', e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 items-center p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                  <label className="text-sm font-bold text-gray-900">1.16 TENANT'S BANK ACCOUNT DETAILS</label>
                  <input
                    type="text"
                    placeholder="N/A or Bank details"
                    value={extractedData.financial.tenantBankAccount}
                    onChange={(e) => updateField('financial', 'tenantBankAccount', e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 items-center p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                  <label className="text-sm font-bold text-gray-900">
                    1.17 THE FOLLOWING LEASE FEES SHALL BE PAYABLE BY THE TENANT ON SIGNATURE OF THIS LEASE (EXCL. VAT)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 font-medium">R</span>
                    <input
                      type="text"
                      placeholder="750.00"
                      value={extractedData.financial.leaseFee}
                      onChange={(e) => updateField('financial', 'leaseFee', e.target.value)}
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border-l-4 border-blue-600 rounded-lg">
                  <p className="text-sm font-bold text-gray-900">
                    1.18 THE FOLLOWING ANNEXURES SHALL FORM PART OF THIS AGREEMENT OF LEASE: "A"; "B"; "C"; "D"
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showPreview && previewPdfUrl && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-4 w-[95vw] h-[95vh] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">📄 Lease Preview (PDF)</h2>
                <button
                  onClick={() => {
                    setShowPreview(false);
                    if (previewPdfUrl) {
                      URL.revokeObjectURL(previewPdfUrl);
                      setPreviewPdfUrl(null);
                    }
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl px-3 py-1 rounded hover:bg-gray-100"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 bg-gray-100 rounded-lg overflow-hidden">
                <iframe
                  src={previewPdfUrl}
                  className="w-full h-full border-0"
                  title="Lease Preview"
                />
              </div>
            </div>
          </div>
        )}

        {/* Drafts Modal */}
        {showDraftsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Saved Drafts ({drafts.length})</h2>
                <button
                  onClick={() => setShowDraftsModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>
              {drafts.length === 0 ? (
                <p className="text-gray-500">No drafts saved yet.</p>
              ) : (
                <div className="space-y-2">
                  {drafts.map((draft) => (
                    <div key={draft.id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{draft.name}</h3>
                        <p className="text-sm text-gray-500">
                          {new Date(draft.date).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            try {
                              console.log('📂 Loading draft:', draft.name, draft.data);
                              if (!draft.data) {
                                toast.error('Draft data is corrupted');
                                return;
                              }
                              
                              // Merge draft data with current extractedData to preserve structure
                              setExtractedData(prev => ({
                                landlord: {
                                  ...prev.landlord,
                                  ...(draft.data.landlord || {})
                                },
                                tenant: {
                                  ...prev.tenant,
                                  ...(draft.data.tenant || {})
                                },
                                surety: {
                                  ...prev.surety,
                                  ...(draft.data.surety || {})
                                },
                                premises: {
                                  ...prev.premises,
                                  ...(draft.data.premises || {})
                                },
                                lease: {
                                  ...prev.lease,
                                  ...(draft.data.lease || {})
                                },
                                financial: {
                                  ...prev.financial,
                                  ...(draft.data.financial || {}),
                                  year1: {
                                    ...prev.financial.year1,
                                    ...(draft.data.financial?.year1 || {})
                                  },
                                  year2: {
                                    ...prev.financial.year2,
                                    ...(draft.data.financial?.year2 || {})
                                  },
                                  year3: {
                                    ...prev.financial.year3,
                                    ...(draft.data.financial?.year3 || {})
                                  }
                                }
                              }));
                              
                              setShowDraftsModal(false);
                              toast.success('Draft loaded successfully!');
                              addAuditEntry('Draft Loaded', `Loaded draft: ${draft.name}`);
                            } catch (error) {
                              console.error('Error loading draft:', error);
                              toast.error('Failed to load draft. Data may be corrupted.');
                            }
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(draft)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* History Modal */}
        {showHistoryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Lease History ({leaseHistory.length})</h2>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>
              {leaseHistory.length === 0 ? (
                <p className="text-gray-500">No lease history yet.</p>
              ) : (
                <div className="space-y-2">
                  {leaseHistory.map((item) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{item.name}</h3>
                        <p className="text-sm text-gray-500">
                          {new Date(item.date).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            try {
                              // Generate PDF from leaseData
                              if (!item.leaseData) {
                                toast.error('No lease data available for PDF generation');
                                return;
                              }
                              
                              setDownloadingHistoryId(item.id);
                              toast.info('Generating PDF...');
                              
                              const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        const response = await fetch(`${apiUrl}/api/leases/generate-pdf`, {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                  ...item.leaseData,
                                  financial: {
                                    ...item.leaseData.financial,
                                    showYear2: item.leaseData.financial?.showYear2 !== false,
                                    showYear3: item.leaseData.financial?.showYear3 !== false
                                  }
                                }),
                              });

                              if (response.ok) {
                                const blob = await response.blob();
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `Lease_${item.name}_${new Date(item.date).toISOString().split('T')[0]}.pdf`;
                                a.click();
                                URL.revokeObjectURL(url);
                                toast.success('PDF downloaded successfully!');
                              } else {
                                throw new Error('PDF generation failed');
                              }
                            } catch (error) {
                              console.error('PDF download error:', error);
                              toast.error('Failed to generate PDF. Please try again.');
                            } finally {
                              setDownloadingHistoryId(null);
                            }
                          }}
                          disabled={downloadingHistoryId === item.id}
                          className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-105 transform"
                        >
                          {downloadingHistoryId === item.id ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              <span>Downloading...</span>
                            </>
                          ) : (
                            <>
                              <Download size={16} />
                              <span>Download PDF</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            const updatedHistory = leaseHistory.filter(h => h.id !== item.id);
                            setLeaseHistory(updatedHistory);
                            localStorage.setItem('leaseHistory', JSON.stringify(updatedHistory));
                          }}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Audit Trail Modal */}
        {showAuditTrailModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Shield className="text-teal-600" size={24} />
                  Audit Trail ({auditTrail.length})
                </h2>
                <button
                  onClick={() => setShowAuditTrailModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>
            
            {/* Compliance Status Summary */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">Compliance Status</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className={`p-3 rounded-lg ${verificationStatus.landlordCIPC.verified ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <div className="flex items-center gap-2">
                    {verificationStatus.landlordCIPC.verified ? <CheckCircle className="text-green-600" size={16} /> : <AlertCircle className="text-gray-400" size={16} />}
                    <span className="text-sm font-medium">Landlord CIPC</span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${verificationStatus.tenantCIPC.verified ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <div className="flex items-center gap-2">
                    {verificationStatus.tenantCIPC.verified ? <CheckCircle className="text-green-600" size={16} /> : <AlertCircle className="text-gray-400" size={16} />}
                    <span className="text-sm font-medium">Tenant CIPC</span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${verificationStatus.tenantID.verified ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <div className="flex items-center gap-2">
                    {verificationStatus.tenantID.verified ? <CheckCircle className="text-green-600" size={16} /> : <AlertCircle className="text-gray-400" size={16} />}
                    <span className="text-sm font-medium">Tenant ID</span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${verificationStatus.suretyID.verified ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <div className="flex items-center gap-2">
                    {verificationStatus.suretyID.verified ? <CheckCircle className="text-green-600" size={16} /> : <AlertCircle className="text-gray-400" size={16} />}
                    <span className="text-sm font-medium">Surety ID</span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${verificationStatus.fica.verified ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <div className="flex items-center gap-2">
                    {verificationStatus.fica.verified ? <CheckCircle className="text-green-600" size={16} /> : <AlertCircle className="text-gray-400" size={16} />}
                    <span className="text-sm font-medium">FICA</span>
                  </div>
                </div>
              </div>
            </div>

            {auditTrail.length === 0 ? (
              <p className="text-gray-500">No audit trail entries yet.</p>
            ) : (
              <div className="space-y-2">
                {auditTrail.map((entry) => (
                  <div key={entry.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900">{entry.action}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(entry.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          <div>Tenant: {entry.userData?.tenant || 'N/A'}</div>
                          <div>Landlord: {entry.userData?.landlord || 'N/A'}</div>
                        </div>
                        {entry.details && (
                          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded mt-2">
                            <pre className="whitespace-pre-wrap">{JSON.stringify(entry.details, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>
        )}

        {/* Lease Packages Modal */}
        {showLeasePackagesModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Folder className="text-indigo-600" size={24} />
                  Saved Leases ({leasePackages.length})
                </h2>
                <button
                  onClick={() => setShowLeasePackagesModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>
              
              {leasePackages.length === 0 ? (
                <div className="text-center py-8">
                  <Folder className="mx-auto text-gray-400 mb-3" size={48} />
                  <p className="text-gray-500">No lease packages stored yet.</p>
                  <p className="text-sm text-gray-400 mt-2">Generate a lease to create a package with attached documents.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {leasePackages.map((pkg) => (
                    <div key={pkg.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">
                            {pkg.metadata.tenantName} ↔ {pkg.metadata.landlordName}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Generated: {new Date(pkg.metadata.generatedDate).toLocaleString()}
                          </p>
                          <div className="mt-2 flex items-center gap-4 text-xs text-gray-600">
                            <span className="flex items-center gap-1">
                              <FileText size={14} />
                              Lease Document
                            </span>
                            <span className="flex items-center gap-1">
                              <Folder size={14} />
                              {Object.keys(pkg.documents || {}).length} Attached Documents
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                setDownloadingSavedId(pkg.id);
                                toast.info('Generating PDF...');
                                // Generate PDF from stored leaseData using centralized API
                                const blob = await leasesAPI.generatePDFFromData({
                                  ...pkg.leaseData,
                                  showFinancialYear2: pkg.leaseData.financial?.showYear2 !== false,
                                  showFinancialYear3: pkg.leaseData.financial?.showYear3 !== false
                                }, false); // false = not preview, will download
                                
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `Lease_${pkg.metadata.tenantName}_${new Date(pkg.metadata.generatedDate).toISOString().split('T')[0]}.pdf`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                                toast.success('PDF downloaded successfully!');
                              } catch (error) {
                                console.error('PDF download error:', error);
                                toast.error(`Failed to generate PDF: ${error.message || 'Please try again.'}`);
                              } finally {
                                setDownloadingSavedId(null);
                              }
                            }}
                            disabled={downloadingSavedId === pkg.id}
                            className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-600 text-white text-sm rounded-lg hover:from-blue-600 hover:to-cyan-700 transition-all duration-200 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-105 transform"
                          >
                            {downloadingSavedId === pkg.id ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                <span>Downloading...</span>
                              </>
                            ) : (
                              <>
                                <Download size={14} />
                                <span>Download PDF</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                // Download all documents with proper delay between downloads
                                const allDocs = [];
                                
                                // Collect all documents
                                Object.entries(pkg.documents || {}).forEach(([key, docs]) => {
                                  if (Array.isArray(docs)) {
                                    docs.forEach(doc => {
                                      allDocs.push(doc);
                                    });
                                  } else if (docs && docs.data) {
                                    // Handle old format (single document)
                                    allDocs.push(docs);
                                  }
                                });
                                
                                if (allDocs.length === 0) {
                                  toast.info('No documents attached to this lease');
                                  return;
                                }
                                
                                // Download each document with a small delay to prevent browser blocking
                                for (let i = 0; i < allDocs.length; i++) {
                                  const doc = allDocs[i];
                                  
                                  // Check if data already includes data URL prefix
                                  let dataUrl = doc.data;
                                  if (!dataUrl.startsWith('data:')) {
                                    // Add data URL prefix if not present
                                    const mimeType = doc.type || 'application/octet-stream';
                                    dataUrl = `data:${mimeType};base64,${doc.data}`;
                                  }
                                  
                                  // Create download link
                                  const link = document.createElement('a');
                                  link.href = dataUrl;
                                  link.download = doc.name || `document_${i + 1}`;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  
                                  // Small delay between downloads
                                  if (i < allDocs.length - 1) {
                                    await new Promise(resolve => setTimeout(resolve, 300));
                                  }
                                }
                                
                                toast.success(`Downloaded ${allDocs.length} document(s)`);
                              } catch (error) {
                                console.error('Error downloading documents:', error);
                                toast.error('Failed to download documents. Please try again.');
                              }
                            }}
                            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition flex items-center gap-1"
                          >
                            <Download size={14} />
                            Download Docs
                          </button>
                          <button
                            onClick={() => {
                              const updatedPackages = leasePackages.filter(p => p.id !== pkg.id);
                              setLeasePackages(updatedPackages);
                              localStorage.setItem('leasePackages', JSON.stringify(updatedPackages));
                            }}
                            className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      {Object.keys(pkg.documents || {}).length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs font-medium text-gray-700 mb-2">Attached Documents:</p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(pkg.documents).map(([key, doc]) => (
                              <span key={key} className="px-2 py-1 bg-gray-100 text-xs text-gray-700 rounded flex items-center gap-1">
                                <FileText size={12} />
                                {doc.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </>
  );
};

export default LeaseDraftingSystem;

