const puppeteer = require('puppeteer');
const fs = require('fs');

/**
 * Generate PDF lease document using Puppeteer (HTML/CSS rendering)
 * This provides perfect CSS rendering and spacing control
 */
async function generateLeasePDF(leaseData) {
  let browser;
  try {
    // DEBUGGING: Check environment
    console.log('=== RENDER ENVIRONMENT DEBUG ===');
    console.log('Node env:', process.env.NODE_ENV);
    console.log('Platform:', process.platform);
    console.log('Puppeteer executable:', process.env.PUPPETEER_EXECUTABLE_PATH || 'default');
    
    // Puppeteer configuration - adjust for environment
    const isProduction = process.env.NODE_ENV === 'production';
    const puppeteerArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--font-render-hinting=none', // Critical for consistent rendering
      '--force-color-profile=srgb',
      '--disable-font-subpixel-positioning' // Prevents spacing variations
    ];
    
    // Add --single-process only in production (Render) - can cause issues locally
    if (isProduction) {
      puppeteerArgs.push('--single-process');
    }

    // Determine Chromium path:
    // - In production (Render Docker): Use system Chromium (/usr/bin/chromium) installed via Dockerfile
    // - In development: Use Puppeteer's bundled Chromium
    let chromiumPath = process.env.PUPPETEER_EXECUTABLE_PATH;
    
    // Auto-detect system Chromium in production if not explicitly set
    if (!chromiumPath && isProduction) {
      const systemChromiumPaths = ['/usr/bin/chromium', '/usr/bin/chromium-browser'];
      for (const path of systemChromiumPaths) {
        if (fs.existsSync(path)) {
          chromiumPath = path;
          console.log(`✅ Using system Chromium: ${path}`);
          break;
        }
      }
    }
    
    const launchOptions = {
      headless: 'new',
      args: puppeteerArgs
    };
    
    // Use system Chromium if available (production), otherwise use bundled (development)
    if (chromiumPath) {
      launchOptions.executablePath = chromiumPath;
      console.log(`🔧 Puppeteer executable: ${chromiumPath}`);
    } else {
      console.log('🔧 Puppeteer executable: bundled Chromium');
    }
    
    browser = await puppeteer.launch(launchOptions);

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
    
    // DEBUGGING: Comprehensive font and layout verification
    const fontDebug = await page.evaluate(() => {
        // Test multiple font names (Liberation Sans has variations)
        const testFonts = [
            'Liberation Sans',
            'LiberationSans',
            'Liberation Sans Regular',
            'Arial',
            'Helvetica',
            'DejaVu Sans',
            'Roboto',
            'Times New Roman'
        ];
        
        const available = [];
        testFonts.forEach(font => {
            if (document.fonts.check(`12px "${font}"`)) {
                available.push(font);
            }
        });
        
        // Check what font is actually being used on body
        const bodyElement = document.body;
        const bodyComputed = window.getComputedStyle(bodyElement);
        const bodyFontFamily = bodyComputed.fontFamily;
        
        // Check what font is actually being used on a field element
        const testField = document.querySelector('.field');
        let fieldFontFamily = 'N/A';
        let fieldMetrics = null;
        
        if (testField) {
            const fieldComputed = window.getComputedStyle(testField);
            fieldFontFamily = fieldComputed.fontFamily;
            fieldMetrics = {
                fontSize: fieldComputed.fontSize,
                lineHeight: fieldComputed.lineHeight,
                height: fieldComputed.height,
                marginBottom: fieldComputed.marginBottom,
                paddingTop: fieldComputed.paddingTop,
                paddingBottom: fieldComputed.paddingBottom
            };
        }
        
        // Verify Liberation Sans is available via font loading API
        return new Promise((resolve) => {
            document.fonts.ready.then(() => {
                const liberationAvailable = document.fonts.check('12px "Liberation Sans"') ||
                                           document.fonts.check('12px Liberation Sans') ||
                                           available.some(f => f.toLowerCase().includes('liberation'));
                
                resolve({
                    availableFonts: available,
                    liberationSansAvailable: liberationAvailable,
                    bodyFontFamily: bodyFontFamily,
                    fieldFontFamily: fieldFontFamily,
                    fieldMetrics: fieldMetrics,
                    totalFontsLoaded: document.fonts.size
                });
            });
        });
    });
    
    console.log('=== FONT VERIFICATION ===');
    console.log('🔍 Available fonts:', fontDebug.availableFonts);
    console.log('🔍 Liberation Sans available:', fontDebug.liberationSansAvailable);
    console.log('🔍 Body font family:', fontDebug.bodyFontFamily);
    console.log('🔍 Field font family:', fontDebug.fieldFontFamily);
    console.log('🔍 Field metrics:', JSON.stringify(fontDebug.fieldMetrics, null, 2));
    console.log('🔍 Total fonts loaded:', fontDebug.totalFontsLoaded);
    
    // DEBUGGING: Check computed spacing
    const spacingDebug = await page.evaluate(() => {
        const field = document.querySelector('.field');
        const subsection = document.querySelector('.subsection');
        
        if (!field) return { error: 'No .field element found' };
        
        const fieldStyles = window.getComputedStyle(field);
        const subsectionStyles = subsection ? window.getComputedStyle(subsection) : null;
        
        return {
            field: {
                height: fieldStyles.height,
                lineHeight: fieldStyles.lineHeight,
                marginBottom: fieldStyles.marginBottom,
                fontSize: fieldStyles.fontSize,
                fontFamily: fieldStyles.fontFamily
            },
            subsection: subsectionStyles ? {
                height: subsectionStyles.height,
                marginBottom: subsectionStyles.marginBottom
            } : null
        };
    });
    
    console.log('🔍 Field spacing:', JSON.stringify(spacingDebug, null, 2));
    console.log('=== END DEBUG ===');
    
    // Force CSS recalculation for consistent rendering
    await page.evaluate(() => {
        // Force layout recalculation
        document.body.offsetHeight;
        // Wait for fonts
        return document.fonts.ready;
    });
    
    // Extra wait for Render/production environments - ensure everything is rendered
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));
    
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
            font-family: 'Liberation Sans', 'LiberationSans', 'Arial', 'Helvetica', sans-serif !important;
            background: #f5f5f5;
            padding: 20px;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: optimizeLegibility;
            line-height: 1.2;
            font-size: 10px;
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
        
        .section-title {
            font-weight: bold;
            margin: 0 0 2px 0 !important;
            padding: 0 !important;
            font-size: 10px;
            display: block;
            line-height: 12px !important;
        }
        
        .field {
            margin: 0 0 1px 0 !important;
            padding: 0 !important;
            display: block;
            line-height: 12px !important;
            min-height: 12px !important;
            overflow: hidden;
            font-size: 10px;
            font-family: 'Liberation Sans', 'LiberationSans', 'Arial', 'Helvetica', sans-serif !important;
        }
        
        .label {
            font-weight: bold;
            width: 250px;
            display: inline-block;
            font-size: 9px;
            text-align: left;
            margin: 0 !important;
            padding: 0 !important;
            vertical-align: top;
            line-height: 12px !important;
            height: 12px !important;
            font-family: 'Liberation Sans', 'LiberationSans', 'Arial', 'Helvetica', sans-serif !important;
        }
        
        .value {
            display: inline-block;
            font-size: 10px;
            margin: 0 !important;
            padding: 0 !important;
            vertical-align: top;
            line-height: 12px !important;
            min-height: 12px !important;
            font-family: 'Liberation Sans', 'LiberationSans', 'Arial', 'Helvetica', sans-serif !important;
        }
        
        .subsection {
            margin: 0 0 2px 0 !important;
            padding: 0 !important;
            display: block;
        }
        
        .section {
            margin: 0 0 4px 0 !important;
            padding: 0 !important;
            font-size: 10px;
            page-break-inside: avoid;
            display: block;
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
