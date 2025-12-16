import React, { useState } from 'react';
import './Step3LeaseDetails.css';
import { leasesAPI } from '../services/api';

const Step3LeaseDetails = ({ leaseDetails, setLeaseDetails, tenantData, onNext, onBack, onSaveDraft }) => {
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const handleChange = (e) => {
    const { name, value } = e.target;
    setLeaseDetails({
      ...leaseDetails,
      [name]: value
    });
  };

  const isFormValid = () => {
    return leaseDetails.propertyAddress &&
           leaseDetails.landlordName &&
           leaseDetails.landlordEmail &&
           leaseDetails.leaseStartDate &&
           leaseDetails.leaseEndDate &&
           leaseDetails.monthlyRent &&
           leaseDetails.securityDeposit;
  };

  const handleSaveDraft = async () => {
    if (!isFormValid()) {
      setSaveMessage('Please fill in all required fields');
      return;
    }

    setSaving(true);
    setSaveMessage('');

    try {
      const leaseData = {
        tenantData,
        leaseDetails
      };

      const response = await leasesAPI.create(leaseData);
      setSaveMessage('✅ Draft saved successfully!');
      if (onSaveDraft && response.lease) {
        onSaveDraft(response.lease.id);
      }
      
      // Clear message after 3 seconds
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Save draft error:', error);
      setSaveMessage('⚠️ Failed to save draft. ' + (error.message || 'Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    // Auto-save draft before proceeding
    if (isFormValid()) {
      await handleSaveDraft();
    }
    onNext();
  };

  return (
    <div className="step3-lease-details">
      <h2>Step 3: Enter Lease Details</h2>
      <p className="step-description">
        Please provide all the necessary information for the lease agreement.
      </p>

      <div className="form-section">
        <h3>Property Information</h3>
        <div className="form-group">
          <label htmlFor="propertyAddress">Property Address *</label>
          <textarea
            id="propertyAddress"
            name="propertyAddress"
            value={leaseDetails.propertyAddress}
            onChange={handleChange}
            placeholder="Enter full property address"
            rows="2"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="propertyType">Property Type</label>
          <select
            id="propertyType"
            name="propertyType"
            value={leaseDetails.propertyType}
            onChange={handleChange}
          >
            <option value="">Select property type</option>
            <option value="Apartment">Apartment</option>
            <option value="House">House</option>
            <option value="Townhouse">Townhouse</option>
            <option value="Condo">Condo</option>
            <option value="Studio">Studio</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <div className="form-section">
        <h3>Landlord Information</h3>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="landlordName">Landlord Name *</label>
            <input
              type="text"
              id="landlordName"
              name="landlordName"
              value={leaseDetails.landlordName}
              onChange={handleChange}
              placeholder="Enter landlord's full name"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="landlordPhone">Landlord Phone *</label>
            <input
              type="tel"
              id="landlordPhone"
              name="landlordPhone"
              value={leaseDetails.landlordPhone}
              onChange={handleChange}
              placeholder="Enter phone number"
              required
            />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="landlordEmail">Landlord Email *</label>
          <input
            type="email"
            id="landlordEmail"
            name="landlordEmail"
            value={leaseDetails.landlordEmail}
            onChange={handleChange}
            placeholder="Enter email address"
            required
          />
        </div>
      </div>

      <div className="form-section">
        <h3>Lease Terms</h3>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="leaseStartDate">Lease Start Date *</label>
            <input
              type="date"
              id="leaseStartDate"
              name="leaseStartDate"
              value={leaseDetails.leaseStartDate}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="leaseEndDate">Lease End Date *</label>
            <input
              type="date"
              id="leaseEndDate"
              name="leaseEndDate"
              value={leaseDetails.leaseEndDate}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="monthlyRent">Monthly Rent *</label>
            <div className="input-with-symbol">
              <span className="input-symbol">R</span>
              <input
                type="number"
                id="monthlyRent"
                name="monthlyRent"
                value={leaseDetails.monthlyRent}
                onChange={handleChange}
                placeholder="0.00"
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="securityDeposit">Security Deposit *</label>
            <div className="input-with-symbol">
              <span className="input-symbol">R</span>
              <input
                type="number"
                id="securityDeposit"
                name="securityDeposit"
                value={leaseDetails.securityDeposit}
                onChange={handleChange}
                placeholder="0.00"
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Additional Terms</h3>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="utilities">Utilities Responsibility</label>
            <select
              id="utilities"
              name="utilities"
              value={leaseDetails.utilities}
              onChange={handleChange}
            >
              <option value="">Select option</option>
              <option value="Tenant">Tenant</option>
              <option value="Landlord">Landlord</option>
              <option value="Shared">Shared</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="maintenance">Maintenance Responsibility</label>
            <select
              id="maintenance"
              name="maintenance"
              value={leaseDetails.maintenance}
              onChange={handleChange}
            >
              <option value="">Select option</option>
              <option value="Tenant">Tenant</option>
              <option value="Landlord">Landlord</option>
              <option value="Shared">Shared</option>
            </select>
          </div>
        </div>
      </div>

      {saveMessage && (
        <div className={`info-box ${saveMessage.includes('✅') ? 'success' : 'warning'}`} style={{
          background: saveMessage.includes('✅') ? '#d4edda' : '#fff3cd',
          borderLeftColor: saveMessage.includes('✅') ? '#28a745' : '#ffc107',
          marginBottom: '20px'
        }}>
          {saveMessage}
        </div>
      )}

      <div className="button-group">
        <div>
          <button 
            className="btn btn-secondary" 
            onClick={handleSaveDraft}
            disabled={saving || !isFormValid()}
            style={{ marginRight: '10px' }}
          >
            {saving ? 'Saving...' : '💾 Save Draft'}
          </button>
        </div>
        <div>
          <button className="btn btn-secondary" onClick={onBack} style={{ marginRight: '10px' }}>
            Back
          </button>
          <button
            className="btn btn-primary"
            onClick={handleNext}
            disabled={!isFormValid() || saving}
          >
            Next: Review & Download
          </button>
        </div>
      </div>
    </div>
  );
};

export default Step3LeaseDetails;

