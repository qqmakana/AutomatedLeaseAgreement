import React, { useState, useEffect } from 'react';
import './TemplateEditor.css';

const TemplateEditor = ({ onSaveTemplate, onCancel }) => {
  const [templateName, setTemplateName] = useState('My Custom Lease Template');
  const [templateContent, setTemplateContent] = useState(`RESIDENTIAL LEASE AGREEMENT

This Lease Agreement is entered into on {{DATE}}, between the Landlord and Tenant identified below.

1. PARTIES

LANDLORD:
Name: {{LANDLORD_NAME}}
Email: {{LANDLORD_EMAIL}}
Phone: {{LANDLORD_PHONE}}

TENANT:
Name: {{TENANT_NAME}}
ID Number: {{TENANT_ID}}
Email: {{TENANT_EMAIL}}
Phone: {{TENANT_PHONE}}
Address: {{TENANT_ADDRESS}}

2. PROPERTY DESCRIPTION

Property Address: {{PROPERTY_ADDRESS}}
Property Type: {{PROPERTY_TYPE}}

3. LEASE TERM

Start Date: {{LEASE_START_DATE}}
End Date: {{LEASE_END_DATE}}
Duration: {{LEASE_DURATION}}

4. RENTAL PAYMENTS

Monthly Rent: {{MONTHLY_RENT}}
Security Deposit: {{SECURITY_DEPOSIT}}

5. SIGNATURES

LANDLORD:
_________________________
Name: {{LANDLORD_NAME}}

TENANT:
_________________________
Name: {{TENANT_NAME}}`);

  const placeholders = [
    '{{DATE}}', '{{LANDLORD_NAME}}', '{{LANDLORD_EMAIL}}', '{{LANDLORD_PHONE}}',
    '{{TENANT_NAME}}', '{{TENANT_ID}}', '{{TENANT_EMAIL}}', '{{TENANT_PHONE}}',
    '{{TENANT_ADDRESS}}', '{{PROPERTY_ADDRESS}}', '{{PROPERTY_TYPE}}',
    '{{LEASE_START_DATE}}', '{{LEASE_END_DATE}}', '{{LEASE_DURATION}}',
    '{{MONTHLY_RENT}}', '{{SECURITY_DEPOSIT}}'
  ];

  const insertPlaceholder = (placeholder) => {
    const textarea = document.getElementById('template-content');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = templateContent;
    const newText = text.substring(0, start) + placeholder + text.substring(end);
    setTemplateContent(newText);
    // Set cursor position after placeholder
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
    }, 0);
  };

  const handleSave = () => {
    if (onSaveTemplate) {
      onSaveTemplate({
        name: templateName,
        content: templateContent
      });
    }
  };

  return (
    <div className="template-editor">
      <h2>Customize Your Lease Template</h2>
      <p className="editor-description">
        Create your own lease format. Use placeholders below to insert tenant and lease information automatically.
      </p>

      <div className="form-group">
        <label htmlFor="template-name">Template Name</label>
        <input
          type="text"
          id="template-name"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          placeholder="My Custom Lease Template"
        />
      </div>

      <div className="form-group">
        <label>Available Placeholders</label>
        <div className="placeholder-buttons">
          {placeholders.map((placeholder) => (
            <button
              key={placeholder}
              type="button"
              className="placeholder-btn"
              onClick={() => insertPlaceholder(placeholder)}
              title={`Insert ${placeholder}`}
            >
              {placeholder}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="template-content">Template Content</label>
        <textarea
          id="template-content"
          value={templateContent}
          onChange={(e) => setTemplateContent(e.target.value)}
          rows={20}
          className="template-textarea"
          placeholder="Enter your lease template here..."
        />
      </div>

      <div className="button-group">
        <button className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={handleSave}>
          Save Template
        </button>
      </div>
    </div>
  );
};

export default TemplateEditor;


















