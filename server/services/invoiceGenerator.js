/**
 * Invoice Generator Service
 * Generates PDF invoices for lease deposits and monthly charges
 * Uses Puppeteer for PDF generation (same as lease PDF)
 */

const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

// Format currency
const formatMoney = (amount) => {
  if (!amount && amount !== 0) return 'R 0.00';
  const num = parseFloat(amount) || 0;
  return `R ${num.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

// Format date
const formatDate = (dateStr) => {
  if (!dateStr) return new Date().toLocaleDateString('en-ZA');
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-ZA', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Format month/year
const formatMonth = (dateStr) => {
  if (!dateStr) {
    const now = new Date();
    return now.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
  }
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
};

// Generate invoice number
const generateInvoiceNumber = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV${year}${month}/${random}`;
};

/**
 * Generate Deposit Invoice PDF
 * @param {Object} leaseData - The lease data from the form
 * @returns {Buffer} - PDF buffer
 */
async function generateDepositInvoice(leaseData) {
  const { landlord, tenant, premises, lease, financial } = leaseData;
  
  const invoiceNumber = generateInvoiceNumber();
  const invoiceDate = formatDate(new Date());
  const dueDate = formatDate(lease?.commencementDate);
  
  // Calculate line items
  const lineItems = [];
  
  // First month's rent
  const basicRent = parseFloat(financial?.year1?.basicRent) || 0;
  if (basicRent > 0) {
    lineItems.push({
      description: 'Basic Rent (First Month)',
      exclusive: basicRent,
      vat: parseFloat(calcVAT(basicRent)),
      inclusive: parseFloat(calcInclusive(basicRent))
    });
  }
  
  // Deposit
  const deposit = parseFloat(financial?.deposit) || 0;
  if (deposit > 0) {
    lineItems.push({
      description: 'Deposit',
      exclusive: deposit,
      vat: 0, // Deposits are typically VAT exempt
      inclusive: deposit
    });
  }
  
  // Lease fees
  const leaseFee = parseFloat(financial?.leaseFee) || 750;
  if (leaseFee > 0) {
    lineItems.push({
      description: 'Lease Administration Fee',
      exclusive: leaseFee,
      vat: parseFloat(calcVAT(leaseFee)),
      inclusive: parseFloat(calcInclusive(leaseFee))
    });
  }
  
  // Security (if different from deposit)
  const security = parseFloat(financial?.year1?.security) || 0;
  if (security > 0 && security !== deposit) {
    lineItems.push({
      description: 'Security Deposit',
      exclusive: security,
      vat: 0,
      inclusive: security
    });
  }
  
  // Calculate totals
  const totalExclusive = lineItems.reduce((sum, item) => sum + item.exclusive, 0);
  const totalVAT = lineItems.reduce((sum, item) => sum + item.vat, 0);
  const totalInclusive = lineItems.reduce((sum, item) => sum + item.inclusive, 0);
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: Arial, sans-serif; 
      font-size: 10pt; 
      line-height: 1.4;
      padding: 20px;
      color: #333;
    }
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 3px solid #1e40af;
    }
    .company-info h1 {
      color: #1e40af;
      font-size: 18pt;
      margin-bottom: 5px;
    }
    .company-info p {
      font-size: 9pt;
      color: #666;
    }
    .invoice-title {
      text-align: right;
    }
    .invoice-title h2 {
      color: #1e40af;
      font-size: 24pt;
      margin-bottom: 10px;
    }
    .invoice-title p {
      font-size: 10pt;
    }
    .invoice-title .invoice-number {
      font-weight: bold;
      font-size: 12pt;
      color: #333;
    }
    .parties {
      display: flex;
      justify-content: space-between;
      margin: 20px 0;
      gap: 30px;
    }
    .party-box {
      flex: 1;
      background: #f8fafc;
      padding: 15px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .party-box h3 {
      color: #1e40af;
      font-size: 10pt;
      margin-bottom: 8px;
      text-transform: uppercase;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 5px;
    }
    .party-box p {
      font-size: 9pt;
      margin: 3px 0;
    }
    .party-box .name {
      font-weight: bold;
      font-size: 11pt;
    }
    .property-info {
      background: #fef3c7;
      padding: 12px 15px;
      border-radius: 8px;
      margin: 15px 0;
      border: 1px solid #fcd34d;
    }
    .property-info h3 {
      color: #92400e;
      font-size: 10pt;
      margin-bottom: 5px;
    }
    .property-info p {
      font-size: 10pt;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th {
      background: #1e40af;
      color: white;
      padding: 12px 10px;
      text-align: left;
      font-size: 10pt;
    }
    th:last-child, th:nth-child(3), th:nth-child(4) {
      text-align: right;
    }
    td {
      padding: 10px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 10pt;
    }
    td:last-child, td:nth-child(3), td:nth-child(4) {
      text-align: right;
    }
    tr:nth-child(even) {
      background: #f8fafc;
    }
    .totals {
      margin-top: 10px;
    }
    .totals-row {
      display: flex;
      justify-content: flex-end;
      padding: 8px 10px;
      font-size: 10pt;
    }
    .totals-row .label {
      width: 150px;
      text-align: right;
      padding-right: 20px;
    }
    .totals-row .value {
      width: 120px;
      text-align: right;
      font-weight: bold;
    }
    .totals-row.grand-total {
      background: #1e40af;
      color: white;
      font-size: 12pt;
      border-radius: 5px;
      margin-top: 5px;
    }
    .bank-details {
      background: #ecfdf5;
      padding: 15px;
      border-radius: 8px;
      margin-top: 25px;
      border: 1px solid #6ee7b7;
    }
    .bank-details h3 {
      color: #047857;
      font-size: 11pt;
      margin-bottom: 10px;
    }
    .bank-details table {
      margin: 0;
      width: auto;
    }
    .bank-details td {
      border: none;
      padding: 3px 15px 3px 0;
      font-size: 10pt;
    }
    .bank-details td:first-child {
      font-weight: bold;
      width: 120px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #e2e8f0;
      font-size: 8pt;
      color: #666;
      text-align: center;
    }
    .footer p {
      margin: 3px 0;
    }
    .due-notice {
      background: #fef2f2;
      border: 2px solid #ef4444;
      padding: 12px;
      border-radius: 8px;
      margin: 15px 0;
      text-align: center;
    }
    .due-notice p {
      color: #b91c1c;
      font-weight: bold;
      font-size: 11pt;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-info">
      <h1>${landlord?.name || 'BENAV PROPERTIES (PTY) LTD'}</h1>
      <p>Reg No: ${landlord?.regNumber || '2018/060720/07'}</p>
      <p>VAT No: ${landlord?.vatNumber || '4200288134'}</p>
      <p>Tel: ${landlord?.phone || '(0861) 999 118'}</p>
    </div>
    <div class="invoice-title">
      <h2>TAX INVOICE</h2>
      <p>Invoice No: <span class="invoice-number">${invoiceNumber}</span></p>
      <p>Date: ${invoiceDate}</p>
      <p>Due Date: ${dueDate}</p>
    </div>
  </div>
  
  <div class="parties">
    <div class="party-box">
      <h3>Bill To (Tenant)</h3>
      <p class="name">${tenant?.name || '[TENANT NAME]'}</p>
      <p>Reg No: ${tenant?.regNumber || 'N/A'}</p>
      <p>VAT No: ${tenant?.vatNumber || 'N/A'}</p>
      ${tenant?.tradingAs ? `<p>Trading As: ${tenant.tradingAs}</p>` : ''}
      <p>${tenant?.physicalAddress || '[ADDRESS]'}</p>
    </div>
    <div class="party-box">
      <h3>From (Landlord)</h3>
      <p class="name">${landlord?.name || 'BENAV PROPERTIES (PTY) LTD'}</p>
      <p>Reg No: ${landlord?.regNumber || '2018/060720/07'}</p>
      <p>VAT No: ${landlord?.vatNumber || '4200288134'}</p>
    </div>
  </div>
  
  <div class="property-info">
    <h3>Property Details</h3>
    <p><strong>Unit:</strong> ${premises?.unitNumber || '[UNIT]'} | 
       <strong>Building:</strong> ${premises?.buildingName || '[BUILDING]'} | 
       <strong>Address:</strong> ${premises?.buildingAddress || '[ADDRESS]'}</p>
  </div>
  
  <div class="due-notice">
    <p>⚠️ DEPOSIT INVOICE - Payment due before lease commencement: ${dueDate}</p>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Date</th>
        <th>Exclusive (R)</th>
        <th>VAT (R)</th>
        <th>Inclusive (R)</th>
      </tr>
    </thead>
    <tbody>
      ${lineItems.map(item => `
        <tr>
          <td>${item.description}</td>
          <td>${invoiceDate}</td>
          <td>${formatMoney(item.exclusive)}</td>
          <td>${formatMoney(item.vat)}</td>
          <td>${formatMoney(item.inclusive)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="totals">
    <div class="totals-row">
      <span class="label">Subtotal (Excl. VAT):</span>
      <span class="value">${formatMoney(totalExclusive)}</span>
    </div>
    <div class="totals-row">
      <span class="label">VAT (15%):</span>
      <span class="value">${formatMoney(totalVAT)}</span>
    </div>
    <div class="totals-row grand-total">
      <span class="label">TOTAL DUE:</span>
      <span class="value">${formatMoney(totalInclusive)}</span>
    </div>
  </div>
  
  <div class="bank-details">
    <h3>💳 Banking Details for Payment</h3>
    <table>
      <tr><td>Bank:</td><td>${landlord?.bank || 'NEDBANK'} - ${landlord?.bankBranch || 'NORTHERN GAUTENG'}</td></tr>
      <tr><td>Account Name:</td><td>${landlord?.name || 'BENAV PROPERTIES (PTY) LTD'}</td></tr>
      <tr><td>Account No:</td><td>${landlord?.accountNumber || '120 459 4295'}</td></tr>
      <tr><td>Branch Code:</td><td>${landlord?.branchCode || '14690500'}</td></tr>
      <tr><td>Reference:</td><td>${tenant?.name || 'TENANT'} - ${premises?.unitNumber || 'UNIT'}</td></tr>
    </table>
    <p style="margin-top: 10px; font-size: 9pt; color: #047857;">
      📧 Please email proof of payment to accounts@benavproperties.co.za
    </p>
  </div>
  
  <div class="footer">
    <p>All payments accepted without prejudice to our rights and to those of our clients.</p>
    <p>This is a computer-generated invoice. No signature required.</p>
    <p style="margin-top: 10px;">Software: Lease Drafting System | Generated: ${new Date().toLocaleString('en-ZA')}</p>
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
      margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' }
    });
    
    return pdfBuffer;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = { generateDepositInvoice };





