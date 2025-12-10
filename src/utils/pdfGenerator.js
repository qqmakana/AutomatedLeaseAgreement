// Client-side PDF generator (fallback when backend isn't available)
import { jsPDF } from 'jspdf';

export const generateLeasePDFClient = (tenantData, leaseDetails) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;
  const margin = 20;

  // Helper function to add new page if needed
  const checkNewPage = (requiredSpace) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }
  };

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('AGREEMENT OF LEASE', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${new Date().toLocaleDateString('en-ZA')}`, margin, yPosition);
  yPosition += 10;

  // Section 1: Parties
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('1. PARTIES', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('LANDLORD:', margin, yPosition);
  yPosition += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${leaseDetails.landlordName}`, margin + 5, yPosition);
  yPosition += 5;
  doc.text(`Email: ${leaseDetails.landlordEmail}`, margin + 5, yPosition);
  yPosition += 5;
  doc.text(`Phone: ${leaseDetails.landlordPhone}`, margin + 5, yPosition);
  yPosition += 8;

  doc.setFont('helvetica', 'bold');
  doc.text('TENANT:', margin, yPosition);
  yPosition += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${tenantData.fullName}`, margin + 5, yPosition);
  yPosition += 5;
  doc.text(`ID Number: ${tenantData.idNumber}`, margin + 5, yPosition);
  yPosition += 5;
  doc.text(`Email: ${tenantData.email}`, margin + 5, yPosition);
  yPosition += 5;
  doc.text(`Phone: ${tenantData.phone}`, margin + 5, yPosition);
  yPosition += 5;
  doc.text(`Address: ${tenantData.address}`, margin + 5, yPosition);
  yPosition += 10;

  // Section 2: Property Description
  checkNewPage(15);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('2. PROPERTY DESCRIPTION', margin, yPosition);
  yPosition += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Property Address: ${leaseDetails.propertyAddress}`, margin, yPosition);
  yPosition += 5;
  if (leaseDetails.propertyType) {
    doc.text(`Property Type: ${leaseDetails.propertyType}`, margin, yPosition);
    yPosition += 5;
  }
  yPosition += 5;

  // Section 3: Lease Term
  checkNewPage(15);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('3. LEASE TERM AND POSSESSION', margin, yPosition);
  yPosition += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const startDate = leaseDetails.leaseStartDate ? new Date(leaseDetails.leaseStartDate).toLocaleDateString('en-ZA') : 'N/A';
  const endDate = leaseDetails.leaseEndDate ? new Date(leaseDetails.leaseEndDate).toLocaleDateString('en-ZA') : 'N/A';
  doc.text(`Start Date: ${startDate}`, margin, yPosition);
  yPosition += 5;
  doc.text(`End Date: ${endDate}`, margin, yPosition);
  yPosition += 10;

  // Section 4: Rental Payments
  checkNewPage(15);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('4. RENTAL PAYMENTS', margin, yPosition);
  yPosition += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const rent = leaseDetails.monthlyRent ? parseFloat(leaseDetails.monthlyRent).toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '0.00';
  const deposit = leaseDetails.securityDeposit ? parseFloat(leaseDetails.securityDeposit).toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '0.00';
  doc.text(`Monthly Rent: R ${rent}`, margin, yPosition);
  yPosition += 5;
  doc.text(`Security Deposit: R ${deposit}`, margin, yPosition);
  yPosition += 10;

  // Signatures section
  checkNewPage(30);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('SIGNATURES', margin, yPosition);
  yPosition += 15;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('LANDLORD:', margin, yPosition);
  yPosition += 15;
  doc.setFont('helvetica', 'normal');
  doc.text('_________________________', margin, yPosition);
  yPosition += 5;
  doc.text(`Name: ${leaseDetails.landlordName}`, margin, yPosition);
  yPosition += 10;

  doc.setFont('helvetica', 'bold');
  doc.text('TENANT:', margin, yPosition);
  yPosition += 15;
  doc.setFont('helvetica', 'normal');
  doc.text('_________________________', margin, yPosition);
  yPosition += 5;
  doc.text(`Name: ${tenantData.fullName}`, margin, yPosition);

  // Return PDF blob
  return doc.output('blob');
};











