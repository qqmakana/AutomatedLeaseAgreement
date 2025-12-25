/**
 * Monthly Invoice Generator Service
 * Generates monthly tenant invoices in professional format
 */

const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

// Format currency
const formatMoney = (amount) => {
  if (!amount && amount !== 0) return '0.00';
  const num = parseFloat(amount) || 0;
  return num.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Calculate VAT (15%)
const calcVAT = (amount) => {
  const num = parseFloat(amount) || 0;
  return (num * 0.15).toFixed(2);
};

// Calculate inclusive amount
const calcInclusive = (amount) => {
  const num = parseFloat(amount) || 0;
  return (num * 1.15).toFixed(2);
};

// Format date as DD/MM/YYYY
const formatDate = (dateStr) => {
  if (!dateStr) return new Date().toLocaleDateString('en-ZA');
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-ZA', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Get month name and year
const getMonthYear = (dateStr) => {
  const date = dateStr ? new Date(dateStr) : new Date();
  return date.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
};

// Get statement period (YYYYMM format)
const getStatementPeriod = (dateStr) => {
  const date = dateStr ? new Date(dateStr) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}${month}`;
};

// Generate invoice number
const generateInvoiceNumber = (tenantCode, period) => {
  return `${tenantCode || '00000'}/${period}/1`;
};

/**
 * Generate Monthly Invoice PDF
 * @param {Object} invoiceData - The invoice data
 * @returns {Buffer} - PDF buffer
 */
async function generateMonthlyInvoice(invoiceData) {
  const {
    // Management Company (Entity)
    managementCompany = {
      name: 'Exceedprops Management Services (Pty) Ltd',
      regNo: '2016/348963/07',
      vatNo: '4060152289',
      phone: '0861 999 118',
      address: '22 Stirrup Lane\nWoodmead Office Park\nWoodmead'
    },
    // Property Details
    property = {
      name: 'Erf 726, Woodmead',
      code: '106',
      unitNo: 'Erf 726'
    },
    // Tenant (Recipient)
    tenant = {},
    // Contact Person
    contact = {
      name: 'Wayne Marks',
      email: 'wayne@exceedprops.co.za'
    },
    // Invoice Details
    invoiceDate,
    invoiceMonth, // The month being invoiced
    tenantCode = '11035',
    // Charges
    charges = [],
    // Previous Balance
    balanceBF = 0,
    bankGuarantee = 0,
    // Bank Details for Payment
    bankDetails = {
      bank: 'Nedbank - Northern Gauteng',
      branchCode: '146905',
      accountName: '',
      accountNumber: ''
    }
  } = invoiceData;

  const statementPeriod = getStatementPeriod(invoiceMonth);
  const invoiceNumber = generateInvoiceNumber(tenantCode, statementPeriod);
  const monthYear = getMonthYear(invoiceMonth);
  const printDate = new Date().toLocaleString('en-ZA');

  // Calculate totals
  let totalExclusive = 0;
  let totalVAT = 0;
  let totalInclusive = 0;

  const chargeRows = charges.map(charge => {
    const excl = parseFloat(charge.exclusive) || 0;
    const vat = parseFloat(calcVAT(excl));
    const incl = parseFloat(calcInclusive(excl));
    
    totalExclusive += excl;
    totalVAT += vat;
    totalInclusive += incl;

    return {
      date: formatDate(charge.date || invoiceMonth),
      description: charge.description,
      exclusive: formatMoney(excl),
      vat: formatMoney(vat),
      inclusive: formatMoney(incl)
    };
  });

  const amountDue = totalInclusive + parseFloat(balanceBF || 0);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: Arial, sans-serif; 
      font-size: 9pt; 
      line-height: 1.3;
      padding: 15px;
      color: #000;
    }
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
    }
    .logo-section {
      flex: 1;
    }
    .logo-section h1 {
      font-size: 14pt;
      margin-bottom: 3px;
    }
    .logo-section p {
      font-size: 8pt;
    }
    .invoice-title {
      text-align: right;
      flex: 1;
    }
    .invoice-title h2 {
      font-size: 16pt;
      color: #000;
      margin-bottom: 5px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin: 10px 0;
      font-size: 8pt;
    }
    .info-box {
      border: 1px solid #999;
      padding: 8px;
    }
    .info-box h3 {
      font-size: 9pt;
      border-bottom: 1px solid #999;
      padding-bottom: 3px;
      margin-bottom: 5px;
      background: #f0f0f0;
      margin: -8px -8px 5px -8px;
      padding: 5px 8px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin: 2px 0;
    }
    .info-row .label {
      font-weight: bold;
      width: 45%;
    }
    .info-row .value {
      width: 55%;
      text-align: right;
    }
    .charges-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 8pt;
    }
    .charges-table th {
      background: #e0e0e0;
      border: 1px solid #000;
      padding: 6px 4px;
      text-align: left;
      font-weight: bold;
    }
    .charges-table th.amount {
      text-align: right;
    }
    .charges-table td {
      border: 1px solid #000;
      padding: 4px;
    }
    .charges-table td.amount {
      text-align: right;
    }
    .charges-table tr:nth-child(even) {
      background: #f9f9f9;
    }
    .totals-section {
      margin: 10px 0;
    }
    .totals-row {
      display: flex;
      justify-content: flex-end;
      padding: 3px 0;
      font-size: 9pt;
    }
    .totals-row .label {
      width: 200px;
      text-align: right;
      padding-right: 15px;
    }
    .totals-row .value {
      width: 100px;
      text-align: right;
      font-weight: bold;
    }
    .totals-row.grand-total {
      background: #000;
      color: #fff;
      padding: 8px;
      font-size: 11pt;
      margin-top: 5px;
    }
    .bank-notice {
      background: #ffffcc;
      border: 2px solid #ffcc00;
      padding: 10px;
      margin: 15px 0;
      text-align: center;
      font-weight: bold;
    }
    .bank-details {
      background: #f5f5f5;
      border: 1px solid #999;
      padding: 10px;
      margin: 10px 0;
    }
    .bank-details h3 {
      font-size: 10pt;
      margin-bottom: 8px;
      border-bottom: 1px solid #999;
      padding-bottom: 5px;
    }
    .bank-details table {
      width: 100%;
      font-size: 9pt;
    }
    .bank-details td {
      padding: 2px 5px;
    }
    .bank-details td:first-child {
      font-weight: bold;
      width: 150px;
    }
    .payment-slip {
      border-top: 2px dashed #000;
      margin-top: 20px;
      padding-top: 15px;
    }
    .payment-slip h3 {
      font-size: 9pt;
      margin-bottom: 10px;
      text-align: center;
    }
    .payment-slip-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      font-size: 8pt;
    }
    .payment-slip-box {
      border: 1px solid #999;
      padding: 8px;
    }
    .footer {
      margin-top: 15px;
      font-size: 7pt;
      text-align: center;
      color: #666;
      border-top: 1px solid #ccc;
      padding-top: 10px;
    }
    .print-info {
      position: absolute;
      top: 10px;
      right: 15px;
      font-size: 7pt;
      color: #666;
    }
    .queries {
      font-size: 8pt;
      margin-top: 5px;
    }
    .queries strong {
      color: #000;
    }
  </style>
</head>
<body>
  <div class="print-info">Printed: ${printDate} Page: 1</div>
  
  <div class="header">
    <div class="logo-section">
      <h1>${managementCompany.name}</h1>
      <p>Tel: ${managementCompany.phone}</p>
      <p>${managementCompany.address.replace(/\n/g, '<br>')}</p>
    </div>
    <div class="invoice-title">
      <h2>Tax Invoice & Statement</h2>
      <p><strong>Tax Invoice No:</strong> ${invoiceNumber}</p>
      <p><strong>For the Month:</strong> ${monthYear}</p>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <h3>Entity (Management)</h3>
      <div class="info-row"><span class="label">Entity:</span><span class="value">${managementCompany.name}</span></div>
      <div class="info-row"><span class="label">Entity Reg No:</span><span class="value">${managementCompany.regNo}</span></div>
      <div class="info-row"><span class="label">Entity VAT No:</span><span class="value">${managementCompany.vatNo}</span></div>
    </div>
    <div class="info-box">
      <h3>Recipient (Tenant)</h3>
      <div class="info-row"><span class="label">Tenant:</span><span class="value">${tenant.name || '[TENANT NAME]'}</span></div>
      <div class="info-row"><span class="label">Recipient Reg No:</span><span class="value">${tenant.regNo || 'N/A'}</span></div>
      <div class="info-row"><span class="label">Recipient VAT No:</span><span class="value">${tenant.vatNo || 'N/A'}</span></div>
    </div>
    <div class="info-box">
      <h3>Property</h3>
      <div class="info-row"><span class="label">Property:</span><span class="value">${property.name} (${property.code})</span></div>
      <div class="info-row"><span class="label">Unit No:</span><span class="value">${property.unitNo}</span></div>
    </div>
    <div class="info-box">
      <h3>Queries</h3>
      <div class="info-row"><span class="label">Contact:</span><span class="value">${contact.name}</span></div>
      <div class="info-row"><span class="label">Email:</span><span class="value">${contact.email}</span></div>
      <div class="info-row"><span class="label">Tel:</span><span class="value">${managementCompany.phone}</span></div>
    </div>
  </div>

  <p style="font-size: 8pt; margin: 10px 0; font-style: italic;">Monthly Charges Generated on ${formatDate(invoiceDate || new Date())}</p>

  <table class="charges-table">
    <thead>
      <tr>
        <th style="width: 80px;">Date</th>
        <th>Allocation / Remarks</th>
        <th class="amount" style="width: 90px;">Exclusive</th>
        <th class="amount" style="width: 70px;">Tax</th>
        <th class="amount" style="width: 90px;">Inclusive</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td></td>
        <td><strong>Balance B/f</strong></td>
        <td class="amount"></td>
        <td class="amount"></td>
        <td class="amount">${formatMoney(balanceBF)}</td>
      </tr>
      <tr>
        <td></td>
        <td><strong>Bank Guarantee</strong></td>
        <td class="amount"></td>
        <td class="amount"></td>
        <td class="amount">${formatMoney(bankGuarantee)}</td>
      </tr>
      ${chargeRows.map(row => `
        <tr>
          <td>${row.date}</td>
          <td>${row.description}</td>
          <td class="amount">${row.exclusive}</td>
          <td class="amount">${row.vat}</td>
          <td class="amount">${row.inclusive}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals-section">
    <div class="totals-row">
      <span class="label">Arrears/Prepaid(-):</span>
      <span class="value">R${formatMoney(balanceBF)}</span>
    </div>
    <div class="totals-row">
      <span class="label">Current Month Charges:</span>
      <span class="value">${formatMoney(totalExclusive)} | ${formatMoney(totalVAT)} | ${formatMoney(totalInclusive)}</span>
    </div>
    <div class="totals-row grand-total">
      <span class="label">Amount Due:</span>
      <span class="value">R${formatMoney(amountDue)}</span>
    </div>
  </div>

  <div class="bank-notice">
    **** PLEASE NOTE BANK DETAILS ****
  </div>

  <div class="bank-details">
    <h3>Banking Details for Payment</h3>
    <table>
      <tr><td>Bank:</td><td>${bankDetails.bank}</td></tr>
      <tr><td>Branch Code:</td><td>${bankDetails.branchCode}</td></tr>
      <tr><td>Account Name:</td><td>${bankDetails.accountName || tenant.name || '[ACCOUNT NAME]'}</td></tr>
      <tr><td>Account Number:</td><td>${bankDetails.accountNumber || '[ACCOUNT NUMBER]'}</td></tr>
    </table>
    <p style="margin-top: 10px; font-size: 8pt;">Please email proof of deposit to <strong>${contact.email}</strong></p>
  </div>

  <p style="font-size: 8pt; text-align: center; margin: 10px 0;">
    All payments accepted without prejudice to our rights and to those of our clients.
  </p>

  <!-- Payment Slip Section -->
  <div class="payment-slip">
    <h3>PLEASE RETURN THIS PORTION WITH PROOF OF YOUR PAYMENT TO:</h3>
    <div class="payment-slip-grid">
      <div class="payment-slip-box">
        <p><strong>${managementCompany.name}</strong></p>
        <p>${managementCompany.address.replace(/\n/g, '<br>')}</p>
        <p style="margin-top: 10px;"><strong>Ref:</strong> ${String(tenantCode).padStart(7, '0')}</p>
      </div>
      <div class="payment-slip-box">
        <div class="info-row"><span class="label">Account No:</span><span class="value">${tenantCode}</span></div>
        <div class="info-row"><span class="label">Tenant/Debtor:</span><span class="value">${tenant.name || '[TENANT]'}</span></div>
        <div class="info-row"><span class="label">Property:</span><span class="value">${property.name} (${property.code})</span></div>
        <div class="info-row"><span class="label">Unit No:</span><span class="value">${property.unitNo}</span></div>
        <div class="info-row"><span class="label">Statement Period:</span><span class="value">${statementPeriod}</span></div>
        <div class="info-row" style="margin-top: 10px; font-size: 11pt;"><span class="label">Amount Due:</span><span class="value" style="font-weight: bold;">R${formatMoney(amountDue)}</span></div>
      </div>
    </div>
    <div class="queries" style="margin-top: 10px; text-align: center;">
      <strong>Queries:</strong> ${contact.name} | Tel: ${managementCompany.phone} | ${contact.email}
    </div>
  </div>

  <div class="footer">
    <p>Generated by Lease Drafting System</p>
  </div>
</body>
</html>
  `;

  // Generate PDF using Puppeteer
  let browser;
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });
    } else {
      const puppeteerFull = require('puppeteer');
      browser = await puppeteerFull.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
    });
    
    return pdfBuffer;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = { generateMonthlyInvoice };





