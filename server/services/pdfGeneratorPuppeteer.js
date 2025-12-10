const puppeteer = require('puppeteer');

/**
 * Generate PDF lease document using Puppeteer (HTML/CSS rendering)
 * This provides perfect CSS rendering and spacing control
 */
async function generateLeasePDF(leaseData) {
  let browser;
  try {
    // Puppeteer configuration for both development and production (Render)
    const puppeteerArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process', // Required for Render's limited resources
      '--disable-gpu',
      '--font-render-hinting=none', // Critical for consistent rendering
      '--force-color-profile=srgb',
      '--disable-font-subpixel-positioning' // Prevents spacing variations
    ];

    browser = await puppeteer.launch({
      headless: 'new', // Use new headless mode for better consistency
      args: puppeteerArgs,
      // Use system Chrome if available (Render)
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
    });

    const page = await browser.newPage();
    
    // Set explicit viewport for consistent rendering across environments
    await page.setViewport({
        width: 1200,
        height: 1600,
        deviceScaleFactor: 1
    });
    
    // Emulate print media FIRST
    await page.emulateMediaType('print');
    
    // Generate HTML from lease data
    const html = generateLeaseHTML(leaseData);
    
    await page.setContent(html, { 
        waitUntil: 'networkidle0',
        timeout: 30000
    });
    
    // Force CSS recalculation for consistent rendering
    await page.evaluate(() => {
        // Force layout recalculation
        document.body.offsetHeight;
        // Wait for fonts
        return document.fonts.ready;
    });
    
    // Extra wait for Render/production environments - ensure everything is rendered
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));
    
    // Force another layout pass before PDF generation
    await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        elements.forEach(el => {
            el.offsetHeight;
            el.getBoundingClientRect();
        });
    });
    
    // Generate PDF with consistent settings
    const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: false, // Use format, not CSS (critical for consistency)
        displayHeaderFooter: false,
        margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });

    return pdfBuffer;
  } catch (error) {
    console.error('Puppeteer PDF generation error:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Generate HTML template from lease data
 */
function generateLeaseHTML(data) {
  // Safely destructure with defaults
  const { 
    landlord = {}, 
    tenant = {}, 
    surety = {}, 
    premises = {}, 
    lease = {}, 
    financial = {},
    showFinancialYear2 = true,
    showFinancialYear3 = true
  } = data || {};
  
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
    if (!amount || amount === '') return 'N/A';
    const num = parseFloat(amount);
    if (isNaN(num)) return 'N/A';
    const vatAmount = num * 1.15;
    return `R ${vatAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  const optionDate = lease.optionExerciseDate ? formatDateShort(lease.optionExerciseDate) : '31/08/2028';
  
  // Format document date
  const formatDocumentDate = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const month = monthNames[now.getMonth()];
    const year = now.getFullYear();
    return `${day} ${month} ${year}`;
  };
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lease Agreement - Part A</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', 'Helvetica', sans-serif;
            background: #f5f5f5;
            padding: 20px;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            line-height: 1.2;
        }
        
        .page {
            max-width: 850px;
            margin: 0 auto;
            background: white;
            padding: 30px 50px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        h1 {
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
            letter-spacing: 1px;
        }
        
        .document-date {
            text-align: center;
            font-size: 10px;
            margin-bottom: 8px;
            color: #333;
        }
        
        h2 {
            text-align: center;
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 12px;
        }
        
        .intro {
            text-align: center;
            margin-bottom: 15px;
            font-size: 11px;
            line-height: 1.6;
        }
        
        .section {
            margin-bottom: 8px !important;
            margin-top: 0 !important;
            font-size: 10px;
            page-break-inside: avoid;
        }
        
        .section-title {
            font-weight: bold;
            margin-bottom: 3px !important;
            margin-top: 0 !important;
            font-size: 10px;
        }
        
        .field {
            margin-bottom: 1px !important;
            margin-top: 0 !important;
            padding: 0 !important;
            display: flex;
            align-items: baseline;
            line-height: 1.2 !important;
        }
        
        .label {
            font-weight: bold;
            width: 250px;
            flex-shrink: 0;
            font-size: 9px;
            text-align: left;
            display: inline-block;
            margin: 0 !important;
            padding: 0 !important;
        }
        
        .value {
            flex: 1;
            font-size: 10px;
            margin: 0 !important;
            padding: 0 !important;
        }
        
        .subsection {
            margin-left: 0px;
            margin-bottom: 2px !important;
            margin-top: 0 !important;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 8px 0;
            font-size: 9px;
        }
        
        th, td {
            border: 1px solid #000;
            padding: 4px;
            text-align: center;
        }
        
        th {
            background: #f0f0f0;
            font-weight: bold;
        }
        
        .note {
            font-size: 8px;
            margin-top: 5px;
            font-style: italic;
        }
        
        .initial-box {
            text-align: right;
            font-size: 9px;
            margin-top: 15px;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="page">
        <h1>AGREEMENT OF LEASE</h1>
        <div class="document-date">${formatDocumentDate()}</div>
        <h2>PART A</h2>
        
        <div class="intro">
            THE PREMISES ARE HIRED BY THE TENANT FROM THE LANDLORD SUBJECT TO THE TERMS AND<br>
            CONDITIONS SET OUT HEREIN AND IN ANY ANNEXURE HERETO:
        </div>
        
        <!-- Section 1.1 - LANDLORD -->
        <div class="section">
            <div class="section-title">1.1 THE LANDLORD:</div>
            <div class="subsection">
                <div class="field">
                    <span class="value">${landlord.name || ''}</span>
                </div>
                <div class="field">
                    <span class="label">TEL:</span>
                    <span class="value">${landlord.phone || ''}</span>
                </div>
                <div class="field">
                    <span class="label">REGISTRATION NO:</span>
                    <span class="value">${landlord.regNo || ''}</span>
                </div>
                <div class="field">
                    <span class="label">VAT REGISTRATION NO:</span>
                    <span class="value">${landlord.vatNo || ''}</span>
                </div>
                <div class="field">
                    <span class="label">BANKING DETAILS:</span>
                    <span class="value">BANK: ${landlord.bank || ''}, ${landlord.branch || ''}</span>
                </div>
                <div class="field">
                    <span class="label"></span>
                    <span class="value">A/C NO: ${landlord.accountNo || ''}, BRANCH CODE: ${landlord.branchCode || ''}</span>
                </div>
            </div>
        </div>
        
        <!-- Section 1.2 - TENANT -->
        <div class="section">
            <div class="section-title">1.2 THE TENANT:</div>
            <div class="subsection">
                <div class="field">
                    <span class="value">${tenant.name || ''}</span>
                </div>
                <div class="field">
                    <span class="label">REGISTRATION NO:</span>
                    <span class="value">${tenant.regNo || ''}</span>
                </div>
                <div class="field">
                    <span class="label">VAT REGISTRATION NO:</span>
                    <span class="value">${tenant.vatNo || ''}</span>
                </div>
                <div class="field">
                    <span class="label">POSTAL:</span>
                    <span class="value">${tenant.postalAddress || ''}</span>
                </div>
                <div class="field">
                    <span class="label">PHYSICAL:</span>
                    <span class="value">${tenant.physicalAddress || ''}</span>
                </div>
                <div class="field">
                    <span class="label">TRADING AS:</span>
                    <span class="value">${tenant.tradingAs || ''}</span>
                </div>
            </div>
        </div>
        
        <!-- Section 1.3-1.8 - PREMISES -->
        <div class="section">
            <div class="field">
                <span class="label">1.3 THE PREMISES:</span>
                <span class="value">${premises.unit || ''}</span>
            </div>
            <div class="field">
                <span class="label">1.4 BUILDING NAME:</span>
                <span class="value">${premises.buildingName || ''}</span>
            </div>
            <div class="field">
                <span class="label">1.5 BUILDING ADDRESS:</span>
                <span class="value">${premises.buildingAddress || ''}</span>
            </div>
            <div class="field">
                <span class="label">1.6 PREMISES MEASUREMENTS (APPROX):</span>
                <span class="value">${premises.size || ''}</span>
            </div>
            <div class="field">
                <span class="label">1.7 TENANT'S PERCENTAGE PROPORTIONATE SHARE:</span>
                <span class="value">${premises.percentage || ''}</span>
            </div>
            <div class="field">
                <span class="label">1.8 PERMITTED USE OF PREMISES:</span>
                <span class="value">${premises.permittedUse || ''}</span>
            </div>
        </div>
        
        <!-- Section 1.9 & 1.10 - LEASE PERIODS TABLE (same style as 1.12) -->
        <div class="section">
            <table>
                <thead>
                    <tr>
                        <th colspan="2">1.9 INITIAL PERIOD OF LEASE</th>
                        <th colspan="2">1.10 OPTION PERIOD OF LEASE<br>(TO BE EXERCISED BY ${optionDate})</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <th>YEARS</th>
                        <td>${lease.years || 0}</td>
                        <th>YEARS</th>
                        <td>${lease.optionYears || 0}</td>
                    </tr>
                    <tr>
                        <th>MONTHS</th>
                        <td>${lease.months || 0}</td>
                        <th>MONTHS</th>
                        <td>${lease.optionMonths || 0}</td>
                    </tr>
                    <tr>
                        <th>COMMENCEMENT DATE</th>
                        <td>${lease.commencementDate ? formatDateLong(lease.commencementDate) : ''}</td>
                        <td colspan="2" style="background: #f0f0f0;"></td>
                    </tr>
                    <tr>
                        <th>TERMINATION DATE</th>
                        <td>${lease.terminationDate ? formatDateLong(lease.terminationDate) : ''}</td>
                        <td colspan="2" style="background: #f0f0f0;"></td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <!-- Section 1.11 - SURETY -->
        <div class="section">
            <div class="section-title">1.11 SURETY:</div>
            <div class="subsection">
                <div class="field">
                    <span class="label">NAME:</span>
                    <span class="value">${surety.name || ''}</span>
                </div>
                <div class="field">
                    <span class="label">ID NUMBER:</span>
                    <span class="value">${surety.idNumber || ''}</span>
                </div>
                <div class="field">
                    <span class="label">ADDRESS:</span>
                    <span class="value">${surety.address || ''}</span>
                </div>
            </div>
        </div>
        
        <div class="initial-box">1 INITIAL HERE: _________</div>
        
        <!-- Section 1.12 - RENTAL TABLE -->
        <div class="section">
            <div class="section-title">1.12 MONTHLY RENTAL AND OTHER MONTHLY CHARGES:</div>
            <table>
                <thead>
                    <tr>
                        <th>BASIC RENT<br>EXCL. VAT</th>
                        <th>BASIC RENT<br>INCL. VAT</th>
                        <th>SECURITY<br>EXCL. VAT</th>
                        <th>ELECTRICITY<br>SEWERAGE & WATER</th>
                        <th>REFUSE<br>(AS AT 01/06/2025)</th>
                        <th>RATES<br>(AS AT 01/06/2025)</th>
                        <th>FROM</th>
                        <th>TO</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>${formatCurrency(financial.year1?.basicRent)}</td>
                        <td>${calculateVAT(financial.year1?.basicRent)}</td>
                        <td>${formatCurrency(financial.year1?.security)}</td>
                        <td>${financial.year1?.sewerageWater || 'METERED OR % OF EXPENSE'}</td>
                        <td>${financial.year1?.refuse ? formatCurrency(financial.year1.refuse) + ' p/m' : 'N/A'}</td>
                        <td>${formatCurrency(financial.year1?.rates)}</td>
                        <td>${financial.year1?.from ? formatDateShort(financial.year1.from) : ''}</td>
                        <td>${financial.year1?.to ? formatDateShort(financial.year1.to) : ''}</td>
                    </tr>
                    ${showFinancialYear2 ? `<tr>
                        <td>${formatCurrency(financial.year2?.basicRent)}</td>
                        <td>${calculateVAT(financial.year2?.basicRent)}</td>
                        <td>${formatCurrency(financial.year2?.security)}</td>
                        <td>${financial.year2?.sewerageWater || 'METERED OR % OF EXPENSE'}</td>
                        <td>*</td>
                        <td>*</td>
                        <td>${financial.year2?.from ? formatDateShort(financial.year2.from) : ''}</td>
                        <td>${financial.year2?.to ? formatDateShort(financial.year2.to) : ''}</td>
                    </tr>` : ''}
                    ${showFinancialYear3 ? `<tr>
                        <td>${formatCurrency(financial.year3?.basicRent)}</td>
                        <td>${calculateVAT(financial.year3?.basicRent)}</td>
                        <td>${formatCurrency(financial.year3?.security)}</td>
                        <td>${financial.year3?.sewerageWater || 'METERED OR % OF EXPENSE'}</td>
                        <td>*</td>
                        <td>*</td>
                        <td>${financial.year3?.from ? formatDateShort(financial.year3.from) : ''}</td>
                        <td>${financial.year3?.to ? formatDateShort(financial.year3.to) : ''}</td>
                    </tr>` : ''}
                </tbody>
            </table>
            <div class="note">
                *INCREASES AS PER RELEVANT MUNICIPAL AUTHORITY/CONTRACTOR IN RATES AND REFUSE TO APPLY ON A PROPORTIONATE BASIS.
            </div>
        </div>
        
        <!-- Remaining sections -->
        <div class="section">
            <div class="field">
                <span class="label">1.13 DEPOSIT:</span>
                <span class="value">${financial.deposit ? formatCurrency(financial.deposit) + ' – DEPOSIT HELD' : 'N/A'}</span>
            </div>
            <div class="field">
                <span class="label">1.14.1 TURNOVER PERCENTAGE:</span>
                <span class="value">${financial.turnoverPercentage || 'N/A'}</span>
            </div>
            <div class="field">
                <span class="label">1.14.2 TENANT'S FINANCIAL YEAR END:</span>
                <span class="value">${financial.financialYearEnd || 'N/A'}</span>
            </div>
            <div class="field">
                <span class="label">1.14.3 MINIMUM TURNOVER REQUIREMENT:</span>
                <span class="value">${financial.minimumTurnover || 'N/A'}</span>
            </div>
            <div class="field">
                <span class="label">1.15 ADVERTISING CONTRIBUTION:</span>
                <span class="value">${financial.advertisingContribution || 'N/A'}</span>
            </div>
            <div class="field">
                <span class="label">1.16 TENANT'S BANK ACCOUNT DETAILS:</span>
                <span class="value">${tenant.bankName && tenant.bankAccountNumber ? `BANK: ${tenant.bankName}, A/C NO: ${tenant.bankAccountNumber}, BRANCH CODE: ${tenant.bankBranchCode || 'N/A'}` : 'N/A'}</span>
            </div>
            <div class="field">
                <span class="label">1.17 LEASE FEES PAYABLE ON SIGNATURE:</span>
                <span class="value">${financial.leaseFee ? formatCurrency(financial.leaseFee) + ' (EXCL. VAT)' : 'N/A'}</span>
            </div>
            <div class="field">
                <span class="label">1.18 ANNEXURES:</span>
                <span class="value">"A"; "B"; "C"; "D"</span>
            </div>
        </div>
        
        <div class="initial-box">2 INITIAL HERE: _________</div>
    </div>
</body>
</html>`;
}

module.exports = {
  generateLeasePDF
};
