// Process custom template with tenant and lease data
export const processTemplate = (templateContent, tenantData, leaseDetails) => {
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

  const calculateLeaseDuration = () => {
    if (!leaseDetails.leaseStartDate || !leaseDetails.leaseEndDate) return 'N/A';
    const start = new Date(leaseDetails.leaseStartDate);
    const end = new Date(leaseDetails.leaseEndDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const months = Math.floor(diffDays / 30);
    const days = diffDays % 30;
    return `${months} month(s) and ${days} day(s)`;
  };

  // Replace placeholders with actual data
  let processed = templateContent;

  // Date
  processed = processed.replace(/\{\{DATE\}\}/g, formatDate(new Date().toISOString()));

  // Landlord
  processed = processed.replace(/\{\{LANDLORD_NAME\}\}/g, leaseDetails.landlordName || '');
  processed = processed.replace(/\{\{LANDLORD_EMAIL\}\}/g, leaseDetails.landlordEmail || '');
  processed = processed.replace(/\{\{LANDLORD_PHONE\}\}/g, leaseDetails.landlordPhone || '');

  // Tenant
  processed = processed.replace(/\{\{TENANT_NAME\}\}/g, tenantData.fullName || '');
  processed = processed.replace(/\{\{TENANT_ID\}\}/g, tenantData.idNumber || '');
  processed = processed.replace(/\{\{TENANT_EMAIL\}\}/g, tenantData.email || '');
  processed = processed.replace(/\{\{TENANT_PHONE\}\}/g, tenantData.phone || '');
  processed = processed.replace(/\{\{TENANT_ADDRESS\}\}/g, tenantData.address || '');

  // Property
  processed = processed.replace(/\{\{PROPERTY_ADDRESS\}\}/g, leaseDetails.propertyAddress || '');
  processed = processed.replace(/\{\{PROPERTY_TYPE\}\}/g, leaseDetails.propertyType || '');

  // Lease Terms
  processed = processed.replace(/\{\{LEASE_START_DATE\}\}/g, formatDate(leaseDetails.leaseStartDate));
  processed = processed.replace(/\{\{LEASE_END_DATE\}\}/g, formatDate(leaseDetails.leaseEndDate));
  processed = processed.replace(/\{\{LEASE_DURATION\}\}/g, calculateLeaseDuration());

  // Financial
  processed = processed.replace(/\{\{MONTHLY_RENT\}\}/g, formatCurrency(leaseDetails.monthlyRent));
  processed = processed.replace(/\{\{SECURITY_DEPOSIT\}\}/g, formatCurrency(leaseDetails.securityDeposit));

  return processed;
};


















