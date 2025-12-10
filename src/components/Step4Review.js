import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { generateLeaseDocument } from '../utils/leaseGenerator';
import { leasesAPI } from '../services/api';
import { generateLeasePDFClient } from '../utils/pdfGenerator';
import { processTemplate } from '../utils/templateProcessor';
import { toast } from '../utils/toast';
import './Step4Review.css';

const Step4Review = ({ tenantData, leaseDetails, leaseId, onBack, onClearForm }) => {
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [error, setError] = useState('');

  const handleDownloadText = () => {
    // Check if custom template exists
    const customTemplate = localStorage.getItem('customLeaseTemplate');
    let leaseText;
    
    if (customTemplate) {
      try {
        const template = JSON.parse(customTemplate);
        leaseText = processTemplate(template.content, tenantData, leaseDetails);
      } catch (err) {
        console.error('Error processing custom template:', err);
        leaseText = generateLeaseDocument(tenantData, leaseDetails);
      }
    } else {
      leaseText = generateLeaseDocument(tenantData, leaseDetails);
    }
    
    const blob = new Blob([leaseText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Lease_Agreement_${tenantData.fullName.replace(/\s+/g, '_')}_${new Date().getTime()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Lease document downloaded successfully!');
    
    // Clear form after downloading if callback provided
    if (onClearForm) {
      setTimeout(() => {
        onClearForm();
      }, 1500);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    setError('');

    try {
      let blob;
      
      // Try backend PDF generation directly (doesn't require database)
      try {
        // Map tenantData and leaseDetails to the backend expected structure
        const leaseData = {
          tenant: {
            name: tenantData.fullName || tenantData.name || '',
            regNo: tenantData.regNo || '',
            vatNo: tenantData.vatNo || '',
            tradingAs: tenantData.tradingAs || '',
            postalAddress: tenantData.postalAddress || tenantData.address || '',
            physicalAddress: tenantData.physicalAddress || tenantData.address || '',
            bankName: tenantData.bankName || '',
            bankAccountNumber: tenantData.bankAccountNumber || '',
            bankBranchCode: tenantData.bankBranchCode || '',
            bankAccountType: tenantData.bankAccountType || '',
            bankAccountHolder: tenantData.bankAccountHolder || ''
          },
          landlord: {
            name: leaseDetails.landlordName || leaseDetails.landlord?.name || '',
            regNo: leaseDetails.landlordRegNo || leaseDetails.landlord?.regNo || '',
            vatNo: leaseDetails.landlordVatNo || leaseDetails.landlord?.vatNo || '',
            phone: leaseDetails.landlordPhone || leaseDetails.landlord?.phone || '',
            bank: leaseDetails.landlordBank || leaseDetails.landlord?.bank || '',
            branch: leaseDetails.landlordBranch || leaseDetails.landlord?.branch || '',
            accountNo: leaseDetails.landlordAccountNo || leaseDetails.landlord?.accountNo || '',
            branchCode: leaseDetails.landlordBranchCode || leaseDetails.landlord?.branchCode || ''
          },
          surety: leaseDetails.surety || {},
          premises: leaseDetails.premises || {},
          lease: leaseDetails.lease || {},
          financial: leaseDetails.financial || {}
        };
        console.log('Sending lease data to backend:', JSON.stringify(leaseData, null, 2));
        blob = await leasesAPI.generatePDFFromData(leaseData);
        console.log('Backend PDF generated successfully');
      } catch (backendErr) {
        console.error('Backend PDF failed:', backendErr);
        console.error('Error details:', backendErr.message, backendErr.stack);
        // Fallback to client-side generation
        blob = generateLeasePDFClient(tenantData, leaseDetails);
      }

      // Download the PDF
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Lease_Agreement_${tenantData.fullName.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setError('');
      toast.success('PDF generated successfully!');
      
      // Clear form after downloading if callback provided
      if (onClearForm) {
        setTimeout(() => {
          onClearForm();
        }, 1500);
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('PDF generation failed. Please try again.');
      setError('⚠️ PDF generation failed. Please try again or use text download.');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'N/A';
    return `R ${parseFloat(amount).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZA', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="step4-review">
      <h2>Step 4: Review & Download Lease</h2>
      <p className="step-description">
        Please review all information below. Once confirmed, you can download the lease agreement.
      </p>

      <div className="review-sections">
        <div className="review-section">
          <h3>Tenant Information</h3>
          <div className="review-grid">
            <div className="review-item">
              <span className="review-label">Full Name:</span>
              <span className="review-value">{tenantData.fullName}</span>
            </div>
            <div className="review-item">
              <span className="review-label">ID Number:</span>
              <span className="review-value">{tenantData.idNumber}</span>
            </div>
            <div className="review-item">
              <span className="review-label">Email:</span>
              <span className="review-value">{tenantData.email}</span>
            </div>
            <div className="review-item">
              <span className="review-label">Phone:</span>
              <span className="review-value">{tenantData.phone}</span>
            </div>
            <div className="review-item full-width">
              <span className="review-label">Address:</span>
              <span className="review-value">{tenantData.address}</span>
            </div>
            {tenantData.employment && (
              <div className="review-item">
                <span className="review-label">Occupation:</span>
                <span className="review-value">{tenantData.employment}</span>
              </div>
            )}
            {tenantData.income && (
              <div className="review-item">
                <span className="review-label">Monthly Income:</span>
                <span className="review-value">{tenantData.income}</span>
              </div>
            )}
            {tenantData.regNo && (
              <div className="review-item">
                <span className="review-label">Registration Number:</span>
                <span className="review-value">{tenantData.regNo}</span>
              </div>
            )}
            {tenantData.vatNo && (
              <div className="review-item">
                <span className="review-label">VAT Number:</span>
                <span className="review-value">{tenantData.vatNo}</span>
              </div>
            )}
            {tenantData.tradingAs && (
              <div className="review-item">
                <span className="review-label">Trading As:</span>
                <span className="review-value">{tenantData.tradingAs}</span>
              </div>
            )}
            {(tenantData.bankName || tenantData.bankAccountNumber) && (
              <>
                <div className="review-item full-width" style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #ddd' }}>
                  <span className="review-label" style={{ fontWeight: 'bold', fontSize: '1.1em' }}>Bank Account Details:</span>
                </div>
                {tenantData.bankName && (
                  <div className="review-item">
                    <span className="review-label">Bank Name:</span>
                    <span className="review-value">{tenantData.bankName}</span>
                  </div>
                )}
                {tenantData.bankAccountNumber && (
                  <div className="review-item">
                    <span className="review-label">Account Number:</span>
                    <span className="review-value">{tenantData.bankAccountNumber}</span>
                  </div>
                )}
                {tenantData.bankBranchCode && (
                  <div className="review-item">
                    <span className="review-label">Branch Code:</span>
                    <span className="review-value">{tenantData.bankBranchCode}</span>
                  </div>
                )}
                {tenantData.bankAccountType && (
                  <div className="review-item">
                    <span className="review-label">Account Type:</span>
                    <span className="review-value">{tenantData.bankAccountType}</span>
                  </div>
                )}
                {tenantData.bankAccountHolder && (
                  <div className="review-item">
                    <span className="review-label">Account Holder:</span>
                    <span className="review-value">{tenantData.bankAccountHolder}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="review-section">
          <h3>Property Information</h3>
          <div className="review-grid">
            <div className="review-item full-width">
              <span className="review-label">Property Address:</span>
              <span className="review-value">{leaseDetails.propertyAddress}</span>
            </div>
            {leaseDetails.propertyType && (
              <div className="review-item">
                <span className="review-label">Property Type:</span>
                <span className="review-value">{leaseDetails.propertyType}</span>
              </div>
            )}
          </div>
        </div>

        <div className="review-section">
          <h3>Landlord Information</h3>
          <div className="review-grid">
            <div className="review-item">
              <span className="review-label">Name:</span>
              <span className="review-value">{leaseDetails.landlordName}</span>
            </div>
            <div className="review-item">
              <span className="review-label">Email:</span>
              <span className="review-value">{leaseDetails.landlordEmail}</span>
            </div>
            <div className="review-item">
              <span className="review-label">Phone:</span>
              <span className="review-value">{leaseDetails.landlordPhone}</span>
            </div>
          </div>
        </div>

        <div className="review-section">
          <h3>Lease Terms</h3>
          <div className="review-grid">
            <div className="review-item">
              <span className="review-label">Start Date:</span>
              <span className="review-value">{formatDate(leaseDetails.leaseStartDate)}</span>
            </div>
            <div className="review-item">
              <span className="review-label">End Date:</span>
              <span className="review-value">{formatDate(leaseDetails.leaseEndDate)}</span>
            </div>
            <div className="review-item">
              <span className="review-label">Monthly Rent:</span>
              <span className="review-value highlight">{formatCurrency(leaseDetails.monthlyRent)}</span>
            </div>
            <div className="review-item">
              <span className="review-label">Security Deposit:</span>
              <span className="review-value highlight">{formatCurrency(leaseDetails.securityDeposit)}</span>
            </div>
            {leaseDetails.utilities && (
              <div className="review-item">
                <span className="review-label">Utilities:</span>
                <span className="review-value">{leaseDetails.utilities}</span>
              </div>
            )}
            {leaseDetails.maintenance && (
              <div className="review-item">
                <span className="review-label">Maintenance:</span>
                <span className="review-value">{leaseDetails.maintenance}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="info-box" style={{ background: '#fee', borderLeftColor: '#c33', marginBottom: '20px' }}>
          <strong>⚠️ {error}</strong>
        </div>
      )}

      <div className="download-section">
        <div className="download-info">
          <h3>Ready to Download</h3>
          <p>Download your professional lease agreement in your preferred format.</p>
          {leaseId && (
            <p className="download-note" style={{ color: '#28a745' }}>
              ✅ <strong>Lease saved!</strong> Draft ID: {leaseId}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-primary btn-download" 
            onClick={handleDownloadPDF}
            disabled={downloadingPDF}
            style={{ minWidth: '200px' }}
          >
            {downloadingPDF ? '⏳ Generating PDF...' : '📄 Download PDF'}
          </button>
          <button 
            className="btn btn-secondary btn-download" 
            onClick={handleDownloadText}
            style={{ minWidth: '200px', background: 'white', color: '#667eea' }}
          >
            📝 Download Text File
          </button>
        </div>
        <p className="download-note" style={{ marginTop: '15px', color: '#28a745' }}>
          ✅ <strong>PDF Download:</strong> Now works! Click the PDF button to download a formatted lease document.
        </p>
      </div>

      <div className="button-group">
        <button className="btn btn-secondary" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
};

export default Step4Review;

