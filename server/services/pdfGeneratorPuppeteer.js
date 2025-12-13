const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

async function generateLeasePDF(leaseData) {
  let browser;
  try {
    console.log('🚀 Starting PDF generation...');
    
    const isProduction = process.env.NODE_ENV === 'production';
    
    const launchOptions = {
      headless: chromium.headless,
      args: isProduction 
        ? [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox']
        : ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: isProduction 
        ? await chromium.executablePath()
        : process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser'
    };
    
    console.log('🔧 Launch options:', { 
      isProduction, 
      executablePath: launchOptions.executablePath 
    });
    
    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    
    const html = generateLeaseHTML(leaseData);
    
    // Set content with increased timeout and less strict waiting
    await page.setContent(html, { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 // 60 seconds timeout
    });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }, // Use CSS @page margins instead
      preferCSSPageSize: true
    });
    
    await browser.close();
    console.log('✅ PDF generated successfully');
    return pdfBuffer;
  } catch (error) {
    if (browser) await browser.close();
    console.error('❌ PDF error:', error);
    throw error;
  }
}

function generateLeaseHTML(data) {
  const { landlord = {}, tenant = {}, premises = {}, lease = {}, financial = {}, surety = {} } = data || {};
  
  // Get rates effective date (defaults to 01/06/2025 if not provided)
  const ratesEffectiveDate = financial.ratesEffectiveDate || '2025-06-01';
  
  const formatDateLong = (d) => {
    if (!d) return '';
    const date = new Date(d);
    const months = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
    return `${String(date.getDate()).padStart(2,'0')} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };
  
  const formatDateShort = (d) => {
    if (!d) return '';
    const date = new Date(d);
    return `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}/${date.getFullYear()}`;
  };
  
  const formatMoney = (amt) => {
    if (!amt) return '';
    const num = parseFloat(amt);
    if (isNaN(num)) return '';
    return 'R ' + num.toLocaleString('en-ZA', {minimumFractionDigits:2, maximumFractionDigits:2});
  };
  
  const calcVAT = (amt) => {
    if (!amt) return '';
    const num = parseFloat(amt);
    if (isNaN(num)) return '';
    return formatMoney(num * 1.15);
  };
  
  const y2Exists = financial.year2?.basicRent;
  const y3Exists = financial.year3?.basicRent;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Lease Agreement</title>
<style>
  /* ===== FIXED PAGE BREAK CSS ===== */
  @page {
    size: A4;
    margin: 15mm 18mm; /* top/bottom 15mm, left/right 18mm = 174mm content width */
  }
  
  html, body {
    margin: 0;
    padding: 0;
    font-family: "Calibri", Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.3;
    color: #000;
  }
  
  /* Remove padding for print - only use @page margins */
  .page {
    width: 210mm;
    margin: 0 auto;
    box-sizing: border-box;
    padding: 0;
    min-height: auto;
  }
  
  /* Optional: padding for screen preview only */
  @media screen {
    .page { padding: 1cm; }
  }
  
  /* Trim margins at page boundaries */
  .page > *:first-child { margin-top: 0 !important; }
  .page > *:last-child { margin-bottom: 0 !important; }
  
  h1 {
    text-align: center;
    font-weight: bold;
    font-size: 17pt;
    margin: 0 0 10px 0;
    letter-spacing: 0.5px;
    width: 174mm;
    max-width: 174mm;
  }
  
  .part {
    display: block;
    text-align: left;
    font-weight: bold;
    font-size: 11pt;
    margin: 0 0 6px 0;
    text-decoration: underline;
    width: 174mm !important;
    max-width: 174mm !important;
    box-sizing: border-box;
  }
  
  .intro {
    display: block;
    text-align: left;
    margin: 0 0 10px 0;
    font-size: 11pt;
    line-height: 1.3;
    width: 174mm !important;
    max-width: 174mm !important;
    word-wrap: break-word;
    overflow-wrap: break-word;
    white-space: normal;
    box-sizing: border-box;
  }
  
  /* CRITICAL: Prevent table splitting */
  table {
    width: 174mm;
    border-collapse: collapse;
    table-layout: fixed;
    margin: 6px 0;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
  
  th, td {
    border: 1px solid #000;
    padding: 3px 4px;
    vertical-align: top;
    word-wrap: break-word;
    font-size: 10pt;
    line-height: 1.2;
  }
  
  th {
    font-weight: bold;
    background: #ffffff;
    text-align: center;
  }
  
  .label {
    font-weight: bold;
  }
  
  .center {
    text-align: center;
  }
  
  .date-cell {
    text-align: center;
    white-space: nowrap !important;
    word-wrap: normal !important;
    overflow-wrap: normal !important;
  }
  
  .note {
    border: 1px solid #000;
    padding: 4px 6px;
    font-weight: bold;
    margin: 6px 0;
  }
  
  .footer {
    text-align: right;
    font-weight: normal;
    margin: 8px 0 0 0;
    font-size: 10pt;
    width: 174mm;
  }
  
  .footer strong {
    font-weight: bold;
  }
  
  /* CRITICAL: Zero-height page break */
  .page-break {
    page-break-after: always;
    break-after: page;
    display: block;
    height: 0;
    margin: 0;
    padding: 0;
    border: 0;
    line-height: 0;
    font-size: 0;
  }
</style>
</head>
<body>

<!-- PAGE 1 -->
<div class="page">
  <h1>AGREEMENT OF LEASE</h1>
  
  <div class="part">PART A</div>
  
  <div class="intro">THE PREMISES ARE HIRED BY THE <strong>TENANT</strong> FROM THE <strong>LANDLORD</strong> SUBJECT TO THE TERMS AND CONDITIONS SET OUT HEREIN AND IN ANY ANNEXURE HERETO:</div>
  
  <!-- 2-column sections: 1.1 Landlord -->
  <table>
    <colgroup>
      <col style="width:82mm">
      <col style="width:92mm">
    </colgroup>
    <tr>
      <td class="label">1.1 THE LANDLORD:</td>
      <td><strong>${landlord.name || ''}</strong><br>TEL:(${landlord.phone || ''})</td>
    </tr>
    <tr>
      <td class="label">REGISTRATION NO:</td>
      <td>${landlord.regNo || ''}</td>
    </tr>
    <tr>
      <td class="label">VAT REGISTRATION NO:</td>
      <td>${landlord.vatNo || ''}</td>
    </tr>
    <tr>
      <td class="label">BANKING DETAILS:</td>
      <td>BANK: ${landlord.bank || ''}, ${landlord.branch || ''}<br>A/C NO: ${landlord.accountNo || ''}, BRANCH CODE: ${landlord.branchCode || ''}</td>
    </tr>
  </table>
  
  <!-- 3-column section: 1.2 Tenant with POSTAL/PHYSICAL split -->
  <table>
    <colgroup>
      <col style="width:82mm">
      <col style="width:46mm">
      <col style="width:46mm">
    </colgroup>
    <tr>
      <td class="label">1.2 THE TENANT:</td>
      <td colspan="2"><strong>${tenant.name || ''}</strong></td>
    </tr>
    <tr>
      <td class="label">REGISTRATION NO:</td>
      <td colspan="2">${tenant.regNo || ''}</td>
    </tr>
    <tr>
      <td class="label">VAT REGISTRATION NO:</td>
      <td colspan="2">${tenant.vatNo || ''}</td>
    </tr>
    <tr>
      <td></td>
      <th>POSTAL:</th>
      <th>PHYSICAL:</th>
    </tr>
    <tr>
      <td style="border-right: none;"></td>
      <td style="border-left: 1.5px solid #000;">${tenant.postalAddress || ''}</td>
      <td style="border-left: 1.5px solid #000;">${tenant.physicalAddress || ''}</td>
    </tr>
    <tr>
      <td class="label">TRADING AS:</td>
      <td colspan="2">${tenant.tradingAs || tenant.name || ''}</td>
    </tr>
  </table>
  
  <!-- 2-column sections: 1.3-1.8 Premises -->
  <table>
    <colgroup>
      <col style="width:82mm">
      <col style="width:92mm">
    </colgroup>
    <tr>
      <td class="label">1.3 THE PREMISES:</td>
      <td>${premises.unit || ''}</td>
    </tr>
    <tr>
      <td class="label">1.4 BUILDING NAME:</td>
      <td>${premises.buildingName || ''}</td>
    </tr>
    <tr>
      <td class="label">1.5 BUILDING ADDRESS:</td>
      <td>${premises.buildingAddress || ''}</td>
    </tr>
    <tr>
      <td class="label">1.6 PREMISES MEASUREMENTS (APPROX):</td>
      <td>${premises.size || ''}</td>
    </tr>
    <tr>
      <td class="label">1.7 TENANT'S PERCENTAGE PROPORTIONATE SHARE<br>OF BUILDING AND/OR PROPERTY EXCLUDING<br>PARKING AND FACILITY AREAS</td>
      <td>${premises.percentage || ''}</td>
    </tr>
    <tr>
      <td class="label">1.8 PERMITTED USE OF PREMISES:<br>TO BE USED BY THE TENANT FOR THESE PURPOSES<br>AND FOR NO OTHER PURPOSES WHATSOEVER</td>
      <td>${premises.permittedUse || ''}</td>
    </tr>
  </table>
  
  <!-- 3-column section: 1.9 Lease Period with YEARS/MONTHS -->
  <table>
    <colgroup>
      <col style="width:82mm">
      <col style="width:46mm">
      <col style="width:46mm">
    </colgroup>
    <tr>
      <td class="label">1.9 INITIAL PERIOD OF LEASE:</td>
      <th>YEARS</th>
      <th>MONTHS</th>
    </tr>
    <tr>
      <td></td>
      <td class="center"><strong>${lease.years || '0'}</strong></td>
      <td class="center"><strong>${lease.months || '0'}</strong></td>
    </tr>
    <tr>
      <td class="label">COMMENCEMENT DATE:</td>
      <td class="center"><strong>${formatDateLong(lease.commencementDate)}</strong></td>
      <td></td>
    </tr>
    <tr>
      <td class="label">TERMINATION DATE:</td>
      <td class="center"><strong>${formatDateLong(lease.terminationDate)}</strong></td>
      <td></td>
    </tr>
  </table>
  
  <!-- 3-column section: 1.10 Option Period -->
  <table>
    <colgroup>
      <col style="width:82mm">
      <col style="width:46mm">
      <col style="width:46mm">
    </colgroup>
    <tr>
      <td class="label">1.10 OPTION PERIOD OF LEASE (TO BE EXERCISED<br>BY 31/08/2028) OPTION PERIOD IS TO BE MUTUALLY<br>DETERMINED BY THE PARTIES. IF BUSINESS SOLD<br>LEASE TO BE RENEWED SUBJECT TO APPROVAL OF<br>NEW TENANT BY LANDLORD.</td>
      <th>YEARS</th>
      <th>MONTHS</th>
    </tr>
    <tr>
      <td></td>
      <td class="center"><strong>${lease.optionYears || '0'}</strong></td>
      <td class="center"><strong>${lease.optionMonths || '0'}</strong></td>
    </tr>
  </table>
  
  <!-- 2-column section: 1.11 Surety -->
  <table>
    <colgroup>
      <col style="width:82mm">
      <col style="width:92mm">
    </colgroup>
    <tr>
      <td class="label">1.11 SURETY</td>
      <td></td>
    </tr>
    <tr>
      <td class="label">NAME:</td>
      <td>${surety.name || ''}</td>
    </tr>
    <tr>
      <td class="label">ID NUMBER:</td>
      <td>${surety.idNumber || ''}</td>
    </tr>
    <tr>
      <td class="label">ADDRESS:</td>
      <td>${surety.address || ''}</td>
    </tr>
  </table>
  
  <div class="footer">1&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong>INITIAL HERE:</strong> _______</div>
</div>

<!-- Page break -->
<div class="page-break"></div>

<!-- PAGE 2 -->
<div class="page">
  <!-- 1.12 - Wide 7-column table for Monthly Rental -->
  <table>
    <colgroup>
      <col style="width:20mm">
      <col style="width:20mm">
      <col style="width:18mm">
      <col style="width:42mm">
      <col style="width:22mm">
      <col style="width:26mm">
      <col style="width:26mm">
    </colgroup>
    <tr>
      <th colspan="7">1.12 MONTHLY RENTAL AND OTHER MONTHLY CHARGES.</th>
    </tr>
    <tr>
      <th>BASIC RENT<br>EXCL. VAT</th>
      <th>BASIC RENT<br>INCL. VAT</th>
      <th>SECURITY<br>EXCL. VAT</th>
      <th>ELECTRICITY<br>SEWERAGE & WATER<br><br>*REFUSE AS AT<br>${formatDateShort(ratesEffectiveDate)}<br>EXCL. VAT</th>
      <th>*RATES AS AT<br>${formatDateShort(ratesEffectiveDate)}<br>EXCL. VAT</th>
      <th>FROM</th>
      <th>TO</th>
    </tr>
    <tr>
      <td class="center">${formatMoney(financial.year1?.basicRent)}</td>
      <td class="center">${calcVAT(financial.year1?.basicRent)}</td>
      <td class="center">${formatMoney(financial.year1?.security)}</td>
      <td class="center">ELECTRICITY<br>SEWERAGE & WATER<br><br>METERED OR % AGE OF<br>EXPENSE<br><br>*REFUSE -<br>${formatMoney(financial.year1?.refuse)} p/m</td>
      <td class="center">*${formatMoney(financial.year1?.rates)}</td>
      <td class="date-cell">${formatDateShort(financial.year1?.from)}</td>
      <td class="date-cell">${formatDateShort(financial.year1?.to)}</td>
    </tr>
    ${y2Exists ? `<tr>
      <td class="center">${formatMoney(financial.year2.basicRent)}</td>
      <td class="center">${calcVAT(financial.year2.basicRent)}</td>
      <td class="center">${formatMoney(financial.year2.security)}</td>
      <td class="center">ELECTRICITY<br>SEWERAGE & WATER<br><br>METERED OR % AGE OF<br>EXPENSE<br><br>* REFUSE</td>
      <td class="center">*</td>
      <td class="date-cell">${formatDateShort(financial.year2.from)}</td>
      <td class="date-cell">${formatDateShort(financial.year2.to)}</td>
    </tr>` : ''}
    ${y3Exists ? `<tr>
      <td class="center">${formatMoney(financial.year3.basicRent)}</td>
      <td class="center">${calcVAT(financial.year3.basicRent)}</td>
      <td class="center">${formatMoney(financial.year3.security)}</td>
      <td class="center">ELECTRICITY<br>SEWERAGE & WATER<br><br>METERED OR % AGE OF<br>EXPENSE<br><br>* REFUSE</td>
      <td class="center">*</td>
      <td class="date-cell">${formatDateShort(financial.year3.from)}</td>
      <td class="date-cell">${formatDateShort(financial.year3.to)}</td>
    </tr>` : ''}
  </table>
  
  <table>
    <tr>
      <td class="small" colspan="2"><strong>*INCREASES AS PER RELEVANT MUNICIPAL AUTHORITY/CONTRACTOR IN RATES AND REFUSE TO APPLY ON A PROPORTIONATE BASIS.</strong></td>
    </tr>
  </table>
  
  <!-- Back to 2-column: 1.13-1.18 -->
  <table>
    <colgroup>
      <col style="width:82mm">
      <col style="width:92mm">
    </colgroup>
    <tr>
      <td class="label">1.13 DEPOSIT</td>
      <td><strong>${formatMoney(financial.deposit)}</strong> – DEPOSIT HELD.</td>
    </tr>
    <tr>
      <td class="label">1.14.1 TURNOVER PERCENTAGE</td>
      <td>${financial.turnoverPercentage || 'N/A'}</td>
    </tr>
    <tr>
      <td class="label">1.14.2 TENANT'S FINANCIAL YEAR END:</td>
      <td>${financial.financialYearEnd || 'N/A'}</td>
    </tr>
    <tr>
      <td class="label">1.14.3 MINIMUM TURNOVER REQUIREMENT ESCALATING ANNUALLY</td>
      <td>${financial.minimumTurnover || 'N/A'}</td>
    </tr>
    <tr>
      <td class="label">1.15 TENANT'S ADVERTISING AND PROMOTIONAL<br>CONTRIBUTION: % AGE OF TENANT'S NET MONTHLY RENTAL<br>PLUS ATTRIBUTABLE VALUE ADDED TAX THEREON</td>
      <td>${financial.advertisingContribution || 'N/A'}</td>
    </tr>
    <tr>
      <td class="label">1.16 TENANT'S BANK ACCOUNT DETAILS:</td>
      <td>${tenant.bankName || 'N/A'}</td>
    </tr>
    <tr>
      <td class="label">1.17 THE FOLLOWING LEASE FEES SHALL BE PAYABLE BY THE TENANT ON SIGNATURE OF THIS LEASE.(EXCL. VAT)</td>
      <td>${formatMoney(financial.leaseFee)}</td>
    </tr>
    <tr>
      <td class="label">1.18 THE FOLLOWING ANNEXURES SHALL FORM PART OF THIS AGREEMENT OF LEASE: "A"; "B"; "C"; "D"</td>
      <td></td>
    </tr>
  </table>
  
  <div class="footer">2&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong>INITIAL HERE:</strong> _______</div>
</div>

</body>
</html>`;
}

module.exports = { generateLeasePDF };
