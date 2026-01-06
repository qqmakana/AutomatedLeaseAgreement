// Conditionally load Puppeteer based on environment
const isProduction = process.env.NODE_ENV === 'production';

let puppeteer, chromium;
if (isProduction) {
  puppeteer = require('puppeteer-core');
  chromium = require('@sparticuz/chromium');
} else {
  puppeteer = require('puppeteer');
}

async function generateLeasePDF(leaseData) {
  let browser;
  try {
    console.log('🚀 Starting PDF generation...');
    
    const launchOptions = isProduction && chromium
      ? {
          headless: chromium.headless,
          args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
          executablePath: await chromium.executablePath()
        }
      : {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
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
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      printBackground: true,
      preferCSSPageSize: true,
      scale: 1
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
  
  // Format address with line breaks - filter out email addresses and phone numbers
  const formatAddress = (addr) => {
    if (!addr) return '';
    let cleaned = addr;
    // Cut off everything from these keywords onwards
    cleaned = cleaned.replace(/\s*(Marks\s+)?Telephone\s*.*/gi, '');
    cleaned = cleaned.replace(/\s*Mobile\s*.*/gi, '');
    cleaned = cleaned.replace(/\s*Cell\s*.*/gi, '');
    cleaned = cleaned.replace(/\s*Phone\s*.*/gi, '');
    cleaned = cleaned.replace(/\s*Tel\s*[:.]?\s*.*/gi, '');
    cleaned = cleaned.replace(/\s*Fax\s*.*/gi, '');
    cleaned = cleaned.replace(/\s*Email\s*.*/gi, '');
    cleaned = cleaned.replace(/\s*General\s+Contact\s*.*/gi, '');
    cleaned = cleaned.replace(/\s*Contact\s*.*/gi, '');
    // Remove any remaining phone number patterns
    cleaned = cleaned.replace(/\b0\d{2,3}[\s\-]?\d{3}[\s\-]?\d{3,4}\b/g, '');
    cleaned = cleaned.replace(/\b\d{10,12}\b/g, '');
    // Remove email addresses
    cleaned = cleaned.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '');
    // Clean up and format
    return cleaned
      .split(/\n/)
      .map(part => part.trim())
      .filter(part => part && part.length > 1)
      .join('<br>');
  };
  
  // Calculate total years based on lease period (section 1.9)
  const leaseYears = parseInt(lease.years) || 0;
  const leaseMonths = parseInt(lease.months) || 0;
  const totalLeaseYears = leaseYears + (leaseMonths > 0 ? 1 : 0); // If there are extra months, add 1 year
  
  // Show years based on initial lease period
  const y2Exists = totalLeaseYears >= 2;
  const y3Exists = totalLeaseYears >= 3;
  const y4Exists = totalLeaseYears >= 4;
  const y5Exists = totalLeaseYears >= 5;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Lease Agreement</title>
<style>
  /* ===== A4 PAGE WITH EXTREME EDGE MARGINS ===== */
  @page {
    size: A4;
    margin: 0.25cm; /* Extreme edge margins - absolute maximum width */
  }
  
  html, body {
    margin: 0;
    padding: 0;
    font-family: Arial, sans-serif;
    font-size: 9pt;
    line-height: 1.15;
    color: #000;
    text-transform: uppercase;
  }

  /* Force uppercase everywhere */
  body, table, td, th, p, div, span {
    text-transform: uppercase !important;
  }
  
  /* Lock content to exact usable width */
  .page {
    position: relative;
    width: 204mm;       /* EXTREME MAXIMUM width - 0.25cm equal margins on both sides */
    margin: 0 auto;     /* center at 105mm - vertical center line stays perfectly centered */
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
  
  h1.title {
    text-align: center;
    font-weight: 700;
    font-size: 12pt;
    margin-top: 50px;
    margin-bottom: 20px;
    letter-spacing: 0.2px;
  }
  
  .part {
    display: block;
    text-align: left;
    font-weight: 700;
    font-size: 9pt;
    text-decoration: underline;
    margin: 0 0 10px 0;
    padding-left: 50px; /* About 7-8 character spaces from edge */
  }
  
  .intro {
    display: block;
    text-align: left;
    font-size: 9pt;
    line-height: 1.4;
    margin: 0 0 10px 0;
    padding-left: 50px; /* About 7-8 character spaces from edge */
    text-indent: 0;
    word-wrap: break-word;
    overflow-wrap: break-word;
    white-space: normal;
    box-sizing: border-box;
  }
  
  /* CRITICAL: Prevent table splitting */
  table {
    width: 100%; /* Fill the form width */
    border-collapse: collapse;
    table-layout: fixed; /* Stable column widths */
    margin: 0;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
  
  /* Remove double borders where tables join */
  table + table {
    margin-top: -2px; /* Overlap borders to prevent doubling */
  }
  
  th, td {
    border: 2px solid #000;
    padding: 2px 3px;
    vertical-align: top;
    word-wrap: break-word;
    font-size: 9pt;
    line-height: 1.15;
    font-weight: normal;
  }
  
  /* Nested tables - consistent borders */
  td table {
    border: none !important;
    border-collapse: collapse !important;
  }
  td table th,
  td table td {
    padding: 2px 3px;
    border: none !important;
  }
  /* Center vertical lines in nested tables */
  td table th:first-child,
  td table td:first-child {
    border-right: 2px solid #000 !important;
  }
  
  th {
    background: #ffffff;
    text-align: center;
    font-weight: normal;
  }
  
  /* Allow bold tags to work inside th and td elements */
  th b, td b {
    font-weight: bold !important;
  }
  
  td.label, th.label, .label {
    font-size: 9pt !important;
    font-family: Arial, sans-serif !important;
    font-weight: normal;
  }
  
  /* No hanging indent - let text wrap naturally */
  td.label {
    /* Hanging indent removed - not working properly in PDF renderer */
  }
  
  td.value {
    font-weight: normal;
    font-size: 9pt;
  }
  
  /* Column ratios managed via colgroup in HTML:
     2-column: 75mm (32%) + 84mm (68%) = 159mm
     3-column: 75mm + 42mm + 42mm = 159mm */
  
  strong, b {
    font-weight: 700 !important;
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
    border: 1.5px solid #000;
    padding: 4px 6px;
    font-weight: bold;
    margin: 6px 0;
  }
  
  /* Footer handled by Puppeteer header/footer templates */
  
  .footer .page-number::after {
    content: counter(page);
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
  <h1 class="title">AGREEMENT OF LEASE</h1>
  
  <div class="part">PART A</div>
  
  <div class="intro">THE PREMISES ARE HIRED BY THE <b>TENANT</b> FROM THE <b>LANDLORD</b> SUBJECT TO THE TERMS AND<br>CONDITIONS SET OUT HEREIN AND IN ANY ANNEXURE HERETO:</div>
  
  <!-- 2-column sections: 1.1 Landlord (50/50 split) -->
  <table>
    <colgroup>
      <col style="width:50%">
      <col style="width:50%">
    </colgroup>
    <tr>
      <td class="label"><b>1.1 THE LANDLORD:</b></td>
      <td><b>${(landlord.name || '').toUpperCase()}<br>0861 999 118</b></td>
    </tr>
    <tr>
      <td>REGISTRATION NO:</td>
      <td>${(landlord.regNo || '').toUpperCase()}</td>
    </tr>
    <tr>
      <td>VAT REGISTRATION NO:</td>
      <td>${(landlord.vatNo || 'TBA').toUpperCase()}</td>
    </tr>
    <tr>
      <td>BANKING DETAILS:</td>
      <td>BANK: ${(landlord.bank || '').toUpperCase()}, ${(landlord.branch || '').toUpperCase()}<br>A/C NO: ${(landlord.accountNo || '').toUpperCase()}, BRANCH CODE: ${(landlord.branchCode || '').toUpperCase()}</td>
    </tr>
  </table>
  
  <!-- 2-column section: 1.2 Tenant (50/50 split) -->
  <table>
    <colgroup>
      <col style="width:50%">
      <col style="width:50%">
    </colgroup>
    <tr>
      <td class="label"><b>1.2 THE TENANT:</b></td>
      <td>${tenant.name || ''}</td>
    </tr>
    <tr>
      <td>REGISTRATION NO:</td>
      <td>${tenant.regNo || ''}</td>
    </tr>
    <tr>
      <td>VAT REGISTRATION NO:</td>
      <td>${tenant.vatNo || ''}</td>
    </tr>
  </table>
  <!-- 1.2 POSTAL/PHYSICAL Address section (3-column layout) -->
  <table>
    <colgroup>
      <col style="width:50%">
      <col style="width:25%">
      <col style="width:25%">
    </colgroup>
    <tr>
      <td class="label" rowspan="2"></td>
      <th style="text-align:center; border-bottom: 2px solid #000;">POSTAL:</th>
      <th style="text-align:center; border-bottom: 2px solid #000;">PHYSICAL:</th>
    </tr>
    <tr>
      <td style="vertical-align:top;">${formatAddress(tenant.postalAddress)}</td>
      <td style="vertical-align:top;">${formatAddress(tenant.physicalAddress)}</td>
    </tr>
  </table>
  <!-- Continue 1.2 -->
  <table>
    <colgroup>
      <col style="width:50%">
      <col style="width:50%">
    </colgroup>
    <tr>
      <td class="label"><b>TRADING AS:</b></td>
      <td>${tenant.tradingAs || tenant.name || ''}</td>
    </tr>
  </table>
  
  <!-- 2-column sections: 1.3-1.8 Premises (50/50 split) -->
  <table>
    <colgroup>
      <col style="width:50%">
      <col style="width:50%">
    </colgroup>
    <tr>
      <td class="label"><b>1.3</b> THE PREMISES:</td>
      <td>${premises.unit || ''}</td>
    </tr>
    <tr>
      <td class="label"><b>1.4</b> BUILDING NAME:</td>
      <td>${premises.buildingName || ''}</td>
    </tr>
    <tr>
      <td class="label"><b>1.5</b> BUILDING ADDRESS:</td>
      <td>${premises.buildingAddress || ''}</td>
    </tr>
    <tr>
      <td class="label"><b>1.6</b> PREMISES MEASUREMENTS (APPROX):</td>
      <td>${premises.size || ''}m²</td>
    </tr>
    <tr>
      <td class="label"><b>1.7</b> TENANT'S PERCENTAGE PROPORTIONATE SHARE<br>OF BUILDING AND/OR PROPERTY EXCLUDING<br>PARKING AND FACILITY AREAS</td>
      <td>${premises.percentage || ''}%</td>
    </tr>
    <tr>
      <td class="label"><b>1.8</b> PERMITTED USE OF PREMISES:<br>TO BE USED BY THE TENANT FOR THESE PURPOSES<br>AND FOR NO OTHER PURPOSES WHATSOEVER</td>
      <td>${premises.permittedUse || ''}</td>
    </tr>
  </table>
  
  <!-- 2-column section: 1.9 Lease Period (50/50 split) -->
  <table>
    <colgroup>
      <col style="width:50%">
      <col style="width:25%">
      <col style="width:25%">
    </colgroup>
    <tr>
      <td class="label" rowspan="2"><b>1.9</b> INITIAL PERIOD OF LEASE:</td>
      <th style="text-align:center; border-bottom: 2px solid #000;">YEARS</th>
      <th style="text-align:center; border-bottom: 2px solid #000;">MONTHS</th>
    </tr>
    <tr>
      <td class="center">${String(lease.years ?? '0')}</td>
      <td class="center">${String(lease.months ?? '0')}</td>
    </tr>
    <tr>
      <td style="padding-left: 24px;">COMMENCEMENT DATE:</td>
      <td colspan="2" style="text-align: left; padding-left: 3px;">${formatDateLong(lease.commencementDate)}</td>
    </tr>
    <tr>
      <td style="padding-left: 24px;">TERMINATION DATE:</td>
      <td colspan="2" style="text-align: left; padding-left: 3px;">${formatDateLong(lease.terminationDate)}</td>
    </tr>
  </table>
  
  <!-- 2-column section: 1.10 Option Period (50/50 split) -->
  <table>
    <colgroup>
      <col style="width:50%">
      <col style="width:25%">
      <col style="width:25%">
    </colgroup>
    <tr>
      <td class="label" rowspan="2" style="vertical-align: top;"><b>1.10</b> OPTION PERIOD OF LEASE (TO BE EXERCISED<br>BY 31/08/2028) OPTION PERIOD IS TO BE MUTUALLY<br>DETERMINED BY THE PARTIES. IF BUSINESS SOLD<br>LEASE TO BE RENEWED SUBJECT TO APPROVAL OF<br>NEW TENANT BY LANDLORD.</td>
      <th style="text-align:center;">YEARS</th>
      <th style="text-align:center;">MONTHS</th>
    </tr>
    <tr>
      <td class="center">${String(lease.optionYears ?? '0')}</td>
      <td class="center">${String(lease.optionMonths ?? '0')}</td>
    </tr>
  </table>
  
  <!-- 2-column section: 1.11 Surety (50/50 split) -->
  <table>
    <colgroup>
      <col style="width:50%">
      <col style="width:50%">
    </colgroup>
    <tr>
      <td class="label"><b>1.11</b> SURETY</td>
      <td></td>
    </tr>
    <tr>
      <td style="padding-left: 28px;">NAME:</td>
      <td>${surety.name || ''}</td>
    </tr>
    <tr>
      <td style="padding-left: 28px;">ID NUMBER:</td>
      <td>${surety.idNumber || ''}</td>
    </tr>
    <tr>
      <td style="padding-left: 28px;">ADDRESS:</td>
      <td>${surety.address || ''}</td>
    </tr>
  </table>
  
  <!-- Page 1 footer - page number left, INITIAL HERE: positioned at ~65% from left -->
  <table style="width: 100%; border: none; margin-top: 25px; font-family: Calibri, sans-serif; font-size: 11pt;">
    <tr>
      <td style="border: none; text-align: left; padding: 0; font-weight: normal; width: 65%;">1</td>
      <td style="border: none; text-align: left; padding: 0; font-weight: bold; width: 35%;">INITIAL HERE:</td>
    </tr>
  </table>
</div>

<!-- Page break -->
<div class="page-break"></div>

<!-- PAGE 2 -->
<div class="page">
  <!-- 1.12 - Wide 7-column table for Monthly Rental -->
  <table>
    <colgroup>
      <col style="width:12%">
      <col style="width:12%">
      <col style="width:11%">
      <col style="width:26%">
      <col style="width:13%">
      <col style="width:13%">
      <col style="width:13%">
    </colgroup>
    <tr>
      <th colspan="7" style="text-align: left;"><b>1.12 MONTHLY RENTAL AND OTHER MONTHLY CHARGES.</b></th>
    </tr>
    <tr>
      <th>BASIC RENT<br>EXCL. VAT</th>
      <th>BASIC RENT<br>INCL. VAT</th>
      <th>SECURITY<br>EXCL. VAT</th>
      <th>ELECTRICITY<br>SEWERAGE & WATER<br><br><b>*REFUSE AS AT<br>${formatDateShort(ratesEffectiveDate)}<br>EXCL. VAT</b></th>
      <th><b>*RATES AS AT<br>${formatDateShort(ratesEffectiveDate)}<br>EXCL. VAT</b></th>
      <th>FROM</th>
      <th>TO</th>
    </tr>
    <tr>
      <td class="center">${formatMoney(financial.year1?.basicRent)}</td>
      <td class="center">${calcVAT(financial.year1?.basicRent)}</td>
      <td class="center">${formatMoney(financial.year1?.security)}</td>
      <td class="center">ELECTRICITY<br>SEWERAGE & WATER<br><br>*${formatMoney(financial.year1?.refuse)}<br>p/m</td>
      <td class="center">*${formatMoney(financial.year1?.rates)}</td>
      <td class="date-cell">${formatDateShort(financial.year1?.from)}</td>
      <td class="date-cell">${formatDateShort(financial.year1?.to)}</td>
    </tr>
    ${y2Exists ? `<tr>
      <td class="center">${formatMoney(financial.year2.basicRent)}</td>
      <td class="center">${calcVAT(financial.year2.basicRent)}</td>
      <td class="center">${formatMoney(financial.year2.security)}</td>
      <td class="center">ELECTRICITY<br>SEWERAGE & WATER<br><br>*${formatMoney(financial.year2?.refuse)}<br>p/m</td>
      <td class="center">*${formatMoney(financial.year2?.rates)}</td>
      <td class="date-cell">${formatDateShort(financial.year2.from)}</td>
      <td class="date-cell">${formatDateShort(financial.year2.to)}</td>
    </tr>` : ''}
    ${y3Exists ? `<tr>
      <td class="center">${formatMoney(financial.year3.basicRent)}</td>
      <td class="center">${calcVAT(financial.year3.basicRent)}</td>
      <td class="center">${formatMoney(financial.year3.security)}</td>
      <td class="center">ELECTRICITY<br>SEWERAGE & WATER<br><br>*${formatMoney(financial.year3?.refuse)}<br>p/m</td>
      <td class="center">*${formatMoney(financial.year3?.rates)}</td>
      <td class="date-cell">${formatDateShort(financial.year3.from)}</td>
      <td class="date-cell">${formatDateShort(financial.year3.to)}</td>
    </tr>` : ''}
    ${y4Exists ? `<tr>
      <td class="center">${formatMoney(financial.year4.basicRent)}</td>
      <td class="center">${calcVAT(financial.year4.basicRent)}</td>
      <td class="center">${formatMoney(financial.year4.security)}</td>
      <td class="center">ELECTRICITY<br>SEWERAGE & WATER<br><br>*${formatMoney(financial.year4?.refuse)}<br>p/m</td>
      <td class="center">*${formatMoney(financial.year4?.rates)}</td>
      <td class="date-cell">${formatDateShort(financial.year4.from)}</td>
      <td class="date-cell">${formatDateShort(financial.year4.to)}</td>
    </tr>` : ''}
    ${y5Exists ? `<tr>
      <td class="center">${formatMoney(financial.year5.basicRent)}</td>
      <td class="center">${calcVAT(financial.year5.basicRent)}</td>
      <td class="center">${formatMoney(financial.year5.security)}</td>
      <td class="center">ELECTRICITY<br>SEWERAGE & WATER<br><br>*${formatMoney(financial.year5?.refuse)}<br>p/m</td>
      <td class="center">*${formatMoney(financial.year5?.rates)}</td>
      <td class="date-cell">${formatDateShort(financial.year5.from)}</td>
      <td class="date-cell">${formatDateShort(financial.year5.to)}</td>
    </tr>` : ''}
  </table>
  
  <table>
    <tr>
      <td class="small" colspan="2"><b>*INCREASES AS PER RELEVANT MUNICIPAL AUTHORITY/CONTRACTOR IN RATES AND REFUSE TO APPLY ON A PROPORTIONATE BASIS.</b></td>
    </tr>
  </table>
  
  <!-- Back to 2-column: 1.13-1.14.3 (50/50 split) -->
  <table>
    <colgroup>
      <col style="width:50%">
      <col style="width:50%">
    </colgroup>
    <tr>
      <td class="label"><b>1.13 DEPOSIT -</b></td>
      <td><b>${financial.deposit ? `${formatMoney(financial.deposit)} – ${financial.depositType === 'payable' ? 'DEPOSIT PAYABLE UPON SIGNATURE OF LEASE.' : 'DEPOSIT HELD.'}` : 'N/A'}</b></td>
    </tr>
    <tr>
      <td class="label"><b>1.14.1</b> TURNOVER PERCENTAGE</td>
      <td>${financial.turnoverPercentage || 'N/A'}</td>
    </tr>
    <tr>
      <td class="label"><b>1.14.2</b> TENANT'S FINANCIAL YEAR END:</td>
      <td>${financial.financialYearEnd || 'N/A'}</td>
    </tr>
    <tr>
      <td class="label"><b>1.14.3</b> MINIMUM TURNOVER REQUIREMENT ESCALATING ANNUALLY</td>
      <td>${financial.minimumTurnover || 'N/A'}</td>
    </tr>
  </table>
  
  <!-- 1.15 (50/50 split - 3 lines matching original) -->
  <table>
    <colgroup>
      <col style="width:50%">
      <col style="width:50%">
    </colgroup>
    <tr>
      <td class="label"><b>1.15</b> TENANT'S ADVERTISING AND PROMOTIONAL<br>CONTRIBUTION: % AGE OF TENANT'S NET MONTHLY RENTAL<br>PLUS ATTRIBUTABLE VALUE ADDED TAX THEREON</td>
      <td>${financial.advertisingContribution || 'N/A'}</td>
    </tr>
  </table>
  
  <!-- 1.16 (75/25 split - line 1 is 84 chars, needs wide column) -->
  <table>
    <colgroup>
      <col style="width:75%">
      <col style="width:25%">
    </colgroup>
    <tr>
      <td class="label"><b>1.16</b> THE FOLLOWING LEASE FEES SHALL BE PAYABLE BY THE TENANT ON SIGNATURE OF THIS<br>LEASE.(EXCL. VAT)</td>
      <td>${formatMoney(financial.leaseFee)}</td>
    </tr>
  </table>
  
  <!-- 1.17 (Full width - no dividing line) -->
  <table>
    <tr>
      <td class="label"><b>1.17</b> THE FOLLOWING ANNEXURES SHALL FORM PART OF THIS AGREEMENT OF LEASE: ${(() => {
        const annexures = financial.annexures || { A: true, B: true, C: true, D: true };
        const selected = Object.keys(annexures).filter(l => annexures[l]).sort();
        return selected.length > 0 ? selected.map(l => `"${l}"`).join(';') : 'NONE';
      })()}</td>
    </tr>
  </table>
  
  <!-- Page 2 footer - page number left, INITIAL HERE: positioned at ~65% from left -->
  <table style="width: 100%; border: none; margin-top: 50px; font-family: Calibri, sans-serif; font-size: 11pt;">
    <tr>
      <td style="border: none; text-align: left; padding: 0; font-weight: normal; width: 65%;">2</td>
      <td style="border: none; text-align: left; padding: 0; font-weight: bold; width: 35%;">INITIAL HERE:</td>
    </tr>
  </table>
</div>

</body>
</html>`;
}

module.exports = { generateLeasePDF };
