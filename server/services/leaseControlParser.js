/**
 * Lease Control Schedule PDF Parser
 * Extracts all lease data from Lease Control Schedule PDF documents
 * Uses Python pdfplumber (preferred) with JavaScript pdf-parse fallback
 * Optimized regex patterns for both extraction methods
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Try to load pdf-parse for fallback
let pdfParse;
try {
  pdfParse = require('pdf-parse');
} catch (e) {
  console.log('pdf-parse not available, Python-only mode');
}

/**
 * Extract text from PDF using Python pdfplumber (preferred method)
 */
async function extractTextWithPython(pdfBuffer) {
  return new Promise((resolve, reject) => {
    // Write buffer to temp file
    const tempFile = path.join(os.tmpdir(), `lease_control_${Date.now()}.pdf`);
    fs.writeFileSync(tempFile, pdfBuffer);
    
    const pythonScript = `
import pdfplumber
import sys
import json

try:
    pdf = pdfplumber.open(sys.argv[1])
    text = '\\n'.join([page.extract_text() or '' for page in pdf.pages])
    print(text)
    pdf.close()
except Exception as e:
    print(f"ERROR: {str(e)}", file=sys.stderr)
    sys.exit(1)
`;
    
    const python = spawn('python', ['-c', pythonScript, tempFile]);
    
    let stdout = '';
    let stderr = '';
    
    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    python.on('close', (code) => {
      // Clean up temp file
      try { fs.unlinkSync(tempFile); } catch (e) {}
      
      if (code !== 0) {
        reject(new Error(`Python PDF extraction failed: ${stderr}`));
      } else {
        resolve(stdout);
      }
    });
    
    python.on('error', (err) => {
      try { fs.unlinkSync(tempFile); } catch (e) {}
      reject(new Error(`Failed to run Python: ${err.message}`));
    });
  });
}

/**
 * Extract text from PDF using JavaScript pdf-parse (fallback method)
 */
async function extractTextWithJavaScript(pdfBuffer) {
  if (!pdfParse) {
    throw new Error('pdf-parse not available');
  }
  const data = await pdfParse(pdfBuffer);
  return data.text;
}

/**
 * Extract text from PDF - tries Python first, falls back to JavaScript
 */
async function extractTextFromPDF(pdfBuffer) {
  // Try Python first (better extraction quality)
  try {
    console.log('📄 Attempting PDF extraction with Python pdfplumber...');
    const text = await extractTextWithPython(pdfBuffer);
    console.log('✅ Python extraction successful');
    return { text, method: 'python' };
  } catch (pythonError) {
    console.log('⚠️ Python extraction failed:', pythonError.message);
    
    // Fall back to JavaScript pdf-parse
    try {
      console.log('📄 Falling back to JavaScript pdf-parse...');
      const text = await extractTextWithJavaScript(pdfBuffer);
      console.log('✅ JavaScript extraction successful');
      return { text, method: 'javascript' };
    } catch (jsError) {
      console.error('❌ Both extraction methods failed');
      throw new Error(`PDF extraction failed. Python: ${pythonError.message}, JavaScript: ${jsError.message}`);
    }
  }
}

/**
 * Normalize text to handle variations between pdf-parse and pdfplumber
 */
function normalizeText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ ]+/g, ' ');  // Multiple spaces to single space
}

/**
 * Parse a Lease Control Schedule PDF and extract all relevant data
 * @param {Buffer} pdfBuffer - The PDF file buffer
 * @returns {Object} Extracted lease data in the app's format
 */
async function parseLeaseControlPDF(pdfBuffer) {
  try {
    console.log('📄 Parsing Lease Control Schedule PDF...');
    
    // Extract text (tries Python first, falls back to JavaScript)
    const { text: rawText, method } = await extractTextFromPDF(pdfBuffer);
    const text = normalizeText(rawText);
    console.log('📝 Extracted text length:', text.length, '(using', method, ')');
    
    // DEBUG: Log first 3000 chars of extracted text
    console.log('=== RAW PDF TEXT (first 3000 chars) ===');
    console.log(text.substring(0, 3000));
    console.log('=== END RAW TEXT ===');
    
    // Extract all the data
    const extractedData = {
      landlord: extractLandlordData(text, method),
      tenant: extractTenantData(text, method),
      surety: extractSuretyData(text, method),
      premises: extractPremisesData(text, method),
      lease: extractLeaseTerms(text, method),
      financial: extractFinancialData(text, method)
    };
    
    console.log('✅ Successfully extracted lease control data');
    console.log('📊 Extracted landlord:', extractedData.landlord);
    console.log('📊 Extracted tenant:', extractedData.tenant);
    console.log('📊 Extracted premises:', extractedData.premises);
    console.log('📊 Extracted lease:', extractedData.lease);
    console.log('📊 Extracted financial:', extractedData.financial);
    return extractedData;
  } catch (error) {
    console.error('❌ Error parsing Lease Control PDF:', error);
    throw error;
  }
}

/**
 * Extract landlord/owner data
 */
function extractLandlordData(text, method) {
  const landlord = {
    name: '',
    regNo: '',
    vatNo: '',
    phone: '',
    bank: '',
    branch: '',
    accountNo: '',
    branchCode: ''
  };
  
  console.log('🔍 Searching for Owner/Lessor in text...');
  
  // Find all company names with (Pty) Ltd pattern
  const companyPattern = /([A-Za-z0-9\-\.&'\s]+?)\s*\(Pty\)\s*Ltd/gi;
  const allCompanies = [];
  let match;
  while ((match = companyPattern.exec(text)) !== null) {
    allCompanies.push(match[0].trim());
  }
  console.log('🏢 All companies found:', allCompanies);
  
  // Multiple patterns to find Owner/Lessor
  const ownerPatterns = [
    /Owner\s*[\/\\]\s*Lessor\s+([A-Za-z0-9\-\.&'\s]+?\s*\(Pty\)\s*Ltd)/i,
    /Owner\s*[\/\\]\s*Lessor\s*\n\s*([A-Za-z0-9\-\.&'\s]+?\s*\(Pty\)\s*Ltd)/i,
    /Owner\s*\/\s*Lessor\s*([A-Za-z0-9\-\.&'\s]+?\(Pty\)\s*Ltd)/i,
    /Lessor\s+([A-Za-z0-9\-\.&'\s]+?\s*\(Pty\)\s*Ltd)/i,
    /(Reflect[A-Za-z0-9\-\.&'\s]*\s*\(Pty\)\s*Ltd)/i  // Specific for Reflect-All
  ];
  
  for (const pattern of ownerPatterns) {
    const ownerMatch = text.match(pattern);
    if (ownerMatch) {
      landlord.name = cleanText(ownerMatch[1]);
      console.log('🏠 Found Owner/Lessor:', landlord.name);
      break;
    }
  }
  
  // If still not found, try to find the first company after "Owner"
  if (!landlord.name) {
    const ownerIndex = text.toLowerCase().indexOf('owner');
    if (ownerIndex !== -1) {
      const afterOwner = text.substring(ownerIndex, ownerIndex + 500);
      const companyInOwner = afterOwner.match(/([A-Za-z0-9\-\.&'\s]+?\s*\(Pty\)\s*Ltd)/i);
      if (companyInOwner) {
        landlord.name = cleanText(companyInOwner[1]);
        console.log('🏠 Found Owner (from context):', landlord.name);
      }
    }
  }
  
  // Owner Registration Number - multiple patterns
  const regPatterns = [
    /Entity\s+Type\s+Company[^R]*Reference\s+No\s+([\d\/]+)/i,
    /Entity\s+Type\s*Company\s*Reference\s*No\s*([\d\/]+)/i,
    /Reference\s+No\s+([\d\/]+)/i,
    /Reg(?:istration)?\s*(?:No|Number)[:\s]+([\d\/]+)/i
  ];
  
  for (const pattern of regPatterns) {
    const regMatch = text.match(pattern);
    if (regMatch) {
      landlord.regNo = cleanText(regMatch[1]);
      console.log('📋 Found Landlord Reg No:', landlord.regNo);
      break;
    }
  }
  
  // Phone - multiple patterns
  const phonePatterns = [
    /Telephone\s+(\d[\d\s\-]+\d)/i,
    /Tel[:\s]+(\d[\d\s\-]+\d)/i,
    /Phone[:\s]+(\d[\d\s\-]+\d)/i,
    /Mobile\s+(\d[\d\s\-]+\d)/i
  ];
  
  for (const pattern of phonePatterns) {
    const phoneMatch = text.match(pattern);
    if (phoneMatch) {
      landlord.phone = cleanText(phoneMatch[1]);
      break;
    }
  }
  
  return landlord;
}

/**
 * Extract tenant data
 */
function extractTenantData(text, method) {
  const tenant = {
    name: '',
    regNo: '',
    vatNo: '',
    tradingAs: '',
    postalAddress: '',
    physicalAddress: '',
    bankName: '',
    bankAccountNumber: '',
    bankBranchCode: '',
    bankAccountType: '',
    bankAccountHolder: ''
  };
  
  console.log('🔍 Searching for Tenant/Lessee in text...');
  
  // Multiple patterns for tenant name
  const tenantPatterns = [
    /List[\/\\]Trading\s+As\s+([A-Za-z0-9\-\.&'\s]+?\s*\(Pty\)\s*Ltd)/i,
    /Trading\s+As\s+([A-Za-z0-9\-\.&'\s]+?\s*\(Pty\)\s*Ltd)/i,
    /Tenant\s*[\/\\]\s*Lessee\s+([A-Za-z0-9\-\.&'\s]+?\s*\(Pty\)\s*Ltd)/i,
    /Lessee\s+([A-Za-z0-9\-\.&'\s]+?\s*\(Pty\)\s*Ltd)/i,
    /^([A-Za-z0-9\-\.&'\s]+?\s*\(Pty\)\s*Ltd)\s*\(\d+\)/mi  // Header pattern
  ];
  
  for (const pattern of tenantPatterns) {
    const tenantMatch = text.match(pattern);
    if (tenantMatch) {
      tenant.name = cleanText(tenantMatch[1]);
      tenant.tradingAs = tenant.name;
      console.log('👤 Found Tenant:', tenant.name);
      break;
    }
  }
  
  // If still not found, try after "Trading As"
  if (!tenant.name) {
    const tradingIndex = text.toLowerCase().indexOf('trading as');
    if (tradingIndex !== -1) {
      const afterTrading = text.substring(tradingIndex, tradingIndex + 300);
      const companyMatch = afterTrading.match(/([A-Za-z0-9\-\.&'\s]+?\s*\(Pty\)\s*Ltd)/i);
      if (companyMatch) {
        tenant.name = cleanText(companyMatch[1]);
        tenant.tradingAs = tenant.name;
        console.log('👤 Found Tenant (from context):', tenant.name);
      }
    }
  }
  
  // Registration Number - multiple patterns
  const refPatterns = [
    /Ref\s+No\s+([\d\/]+)/i,
    /Registration\s+No[:\s]+([\d\/]+)/i,
    /Reg\s+No[:\s]+([\d\/]+)/i
  ];
  
  for (const pattern of refPatterns) {
    const refMatch = text.match(pattern);
    if (refMatch) {
      tenant.regNo = cleanText(refMatch[1]);
      console.log('📋 Found Tenant Reg No:', tenant.regNo);
      break;
    }
  }
  
  // VAT Number
  const vatPatterns = [
    /Vat\s+No\s+(\d+)/i,
    /VAT\s+No[:\s]+(\d+)/i,
    /VAT\s*Number[:\s]+(\d+)/i
  ];
  
  for (const pattern of vatPatterns) {
    const vatMatch = text.match(pattern);
    if (vatMatch) {
      tenant.vatNo = cleanText(vatMatch[1]);
      console.log('📋 Found Tenant VAT No:', tenant.vatNo);
      break;
    }
  }
  
  // Physical Address - flexible patterns
  const domicilePatterns = [
    /Domicile\s+([^\n]+(?:Park|Street|Road|Lane|Drive|Avenue|Office|Centre|Center|Woodmead)[^\n]*)/i,
    /Physical\s+Address[:\s]+([^\n]+)/i,
    /Domicile[:\s]+([^\n]+)/i
  ];
  
  for (const pattern of domicilePatterns) {
    const domicileMatch = text.match(pattern);
    if (domicileMatch) {
      tenant.physicalAddress = cleanAddress(domicileMatch[1]);
      console.log('📍 Found Physical Address:', tenant.physicalAddress);
      break;
    }
  }
  
  // Postal Address
  const postalPatterns = [
    /Postal\s+([^\n]+(?:Park|Street|Road|Lane|Drive|Avenue|Office|Centre|Center|Woodmead|Box)[^\n]*)/i,
    /Postal\s+Address[:\s]+([^\n]+)/i,
    /PO\s+Box[:\s]+([^\n]+)/i
  ];
  
  for (const pattern of postalPatterns) {
    const postalMatch = text.match(pattern);
    if (postalMatch) {
      tenant.postalAddress = cleanAddress(postalMatch[1]);
      console.log('📍 Found Postal Address:', tenant.postalAddress);
      break;
    }
  }
  
  // Email
  const emailMatch = text.match(/[\w.\-]+@[\w.\-]+\.[a-z]{2,}/i);
  if (emailMatch) {
    tenant.email = emailMatch[0];
  }
  
  // Bank details
  const bankPatterns = [
    /Banking\s*\n?\s*Bank\s+([A-Za-z\s]+)/i,
    /Bank\s+Name[:\s]+([A-Za-z\s]+)/i,
    /Bank[:\s]+([A-Za-z]+)/i
  ];
  
  for (const pattern of bankPatterns) {
    const bankMatch = text.match(pattern);
    if (bankMatch) {
      tenant.bankName = cleanText(bankMatch[1]);
      break;
    }
  }
  
  // Bank Account Number
  const accountNoPatterns = [
    /Account\s+No\s+(\d+)/i,
    /Account\s+Number[:\s]+(\d+)/i,
    /Acc\s+No[:\s]+(\d+)/i
  ];
  
  for (const pattern of accountNoPatterns) {
    const accountNoMatch = text.match(pattern);
    if (accountNoMatch) {
      tenant.bankAccountNumber = cleanText(accountNoMatch[1]);
      break;
    }
  }
  
  // Branch Code
  const branchPatterns = [
    /Branch\s+No\s+(\d+)/i,
    /Branch\s+Code[:\s]+(\d+)/i
  ];
  
  for (const pattern of branchPatterns) {
    const branchMatch = text.match(pattern);
    if (branchMatch) {
      tenant.bankBranchCode = cleanText(branchMatch[1]);
      break;
    }
  }
  
  // Bank Account Name/Holder
  const accountNameMatch = text.match(/Account\s+Name\s+([A-Za-z0-9\s\(\)\-\.&']+?)(?=\s+Account|\s+Branch|\s*\n)/i);
  if (accountNameMatch) {
    tenant.bankAccountHolder = cleanText(accountNameMatch[1]);
  }
  
  return tenant;
}

/**
 * Extract surety/representative data
 */
function extractSuretyData(text, method) {
  const surety = {
    name: '',
    idNumber: '',
    address: '',
    capacity: ''
  };
  
  // Authorised Representative - multiple patterns
  const repPatterns = [
    /Authorised\s+Representative\s+([A-Za-z\s]+?)(?:\s+Capacity|\s+Director|\s+Member|\n)/i,
    /Representative[:\s]+([A-Za-z\s]+?)(?:\s+Capacity|\n)/i
  ];
  
  for (const pattern of repPatterns) {
    const repMatch = text.match(pattern);
    if (repMatch) {
      surety.name = cleanText(repMatch[1]);
      break;
    }
  }
  
  // Capacity
  const capacityMatch = text.match(/Capacity\s+(Director|Member|Owner|Partner|Manager)/i);
  if (capacityMatch) {
    surety.capacity = cleanText(capacityMatch[1]);
  }
  
  // ID Number
  const idMatch = text.match(/ID\s*(?:Number|No)[:\s]*(\d{13})/i);
  if (idMatch) {
    surety.idNumber = idMatch[1];
  }
  
  return surety;
}

/**
 * Extract premises data
 */
function extractPremisesData(text, method) {
  const premises = {
    unit: '',
    buildingName: '',
    buildingAddress: '',
    size: '',
    percentage: '',
    permittedUse: ''
  };
  
  // Unit - multiple patterns
  const unitPatterns = [
    /Unit\s+No\s+([A-Za-z0-9\s]+?)(?=\s+\d+\.|\s+Area|\n)/i,
    /Unit[:\s]+([A-Za-z0-9\s]+?)(?=\s+Area|\n)/i,
    /Property\s+([A-Za-z0-9\s,]+?)(?=\s+Stand|\s+Township|\s+Address|\n)/i
  ];
  
  for (const pattern of unitPatterns) {
    const unitMatch = text.match(pattern);
    if (unitMatch) {
      premises.unit = cleanText(unitMatch[1]);
      console.log('🏢 Found Unit:', premises.unit);
      break;
    }
  }
  
  // Building Name - from Property or Stand/Township
  const buildingPatterns = [
    /Property\s*\n?\s*([A-Za-z0-9\s,]+?(?:Woodmead|Park|Estate|Centre|Center|Office))/i,
    /Stand\s+No\s+Township\s*\n?\s*([A-Za-z0-9\s,]+?)(?=\s+Address|\n)/i,
    /Building[:\s]+([A-Za-z0-9\s,]+)/i
  ];
  
  for (const pattern of buildingPatterns) {
    const buildingMatch = text.match(pattern);
    if (buildingMatch) {
      premises.buildingName = cleanText(buildingMatch[1]);
      console.log('🏢 Found Building:', premises.buildingName);
      break;
    }
  }
  
  // Building Address - multiple patterns
  const addressPatterns = [
    /Address\s*\n?\s*(\d+\s+[A-Za-z\s,]+(?:Park|Street|Road|Lane|Drive|Avenue|Office)[A-Za-z0-9\s,]*)/i,
    /Address[:\s]+(\d+[^\n]+)/i,
    /(\d+\s+[A-Za-z]+\s+(?:Street|Road|Lane|Drive|Avenue)[^\n]*)/i
  ];
  
  for (const pattern of addressPatterns) {
    const addressMatch = text.match(pattern);
    if (addressMatch) {
      premises.buildingAddress = cleanAddress(addressMatch[1]);
      console.log('📍 Found Building Address:', premises.buildingAddress);
      break;
    }
  }
  
  // Size/Area - multiple patterns
  const sizePatterns = [
    /\*\s*Main\s+Unit\s+(\d+\.?\d*)/i,
    /Area\s+(\d+\.?\d*)\s*(?:m²|sqm|square)/i,
    /(\d+\.?\d*)\s*(?:m²|sqm|square\s*met)/i,
    /Unit\s+No\s+[A-Za-z0-9\s]+\s+(\d+\.\d+)/i,
    /Size[:\s]+(\d+\.?\d*)/i
  ];
  
  for (const pattern of sizePatterns) {
    const sizeMatch = text.match(pattern);
    if (sizeMatch) {
      premises.size = sizeMatch[1];
      console.log('📐 Found Size:', premises.size);
      break;
    }
  }
  
  // If no size found, look for number in Area column
  if (!premises.size) {
    const areaColMatch = text.match(/Area[^\n]*\n[^\d]*(\d+\.?\d+)/i);
    if (areaColMatch) {
      premises.size = areaColMatch[1];
      console.log('📐 Found Size (column):', premises.size);
    }
  }
  
  // Permitted Usage
  const usagePatterns = [
    /Permitted\s+Usage\s*\n?\s*([A-Za-z\s,.&]+?)(?=\n\n|Base|Recoveries|$)/is,
    /Permitted\s+Use[:\s]+([^\n]+)/i,
    /Usage[:\s]+([^\n]+)/i
  ];
  
  for (const pattern of usagePatterns) {
    const usageMatch = text.match(pattern);
    if (usageMatch) {
      premises.permittedUse = cleanText(usageMatch[1]);
      console.log('📋 Found Permitted Use:', premises.permittedUse);
      break;
    }
  }
  
  return premises;
}

/**
 * Extract lease terms
 */
function extractLeaseTerms(text, method) {
  const lease = {
    years: 3,
    months: 0,
    commencementDate: '',
    terminationDate: '',
    optionYears: 3,
    optionMonths: 0,
    optionExerciseDate: ''
  };
  
  // Lease Start Date - multiple formats
  const startPatterns = [
    /Lease\s+Starts?\s+(\d{2}\/\d{2}\/\d{4})/i,
    /Commencement\s+Date[:\s]+(\d{2}\/\d{2}\/\d{4})/i,
    /Start\s+Date[:\s]+(\d{2}\/\d{2}\/\d{4})/i,
    /Lease\s+Starts?\s+(\d{4}[-\/]\d{2}[-\/]\d{2})/i
  ];
  
  for (const pattern of startPatterns) {
    const startMatch = text.match(pattern);
    if (startMatch) {
      lease.commencementDate = convertDateFormat(startMatch[1]);
      console.log('📅 Found Start Date:', lease.commencementDate);
      break;
    }
  }
  
  // Lease End Date - multiple formats
  const endPatterns = [
    /Lease\s+Ends?\s+(\d{2}\/\d{2}\/\d{4})/i,
    /Termination\s+Date[:\s]+(\d{2}\/\d{2}\/\d{4})/i,
    /End\s+Date[:\s]+(\d{2}\/\d{2}\/\d{4})/i,
    /Lease\s+Ends?\s+(\d{4}[-\/]\d{2}[-\/]\d{2})/i
  ];
  
  for (const pattern of endPatterns) {
    const endMatch = text.match(pattern);
    if (endMatch) {
      lease.terminationDate = convertDateFormat(endMatch[1]);
      console.log('📅 Found End Date:', lease.terminationDate);
      break;
    }
  }
  
  // Period in Months
  const periodPatterns = [
    /Period\s+in\s+Months\s+(\d+)/i,
    /Lease\s+Period[:\s]+(\d+)\s*months/i,
    /Duration[:\s]+(\d+)\s*months/i
  ];
  
  for (const pattern of periodPatterns) {
    const periodMatch = text.match(pattern);
    if (periodMatch) {
      const totalMonths = parseInt(periodMatch[1]);
      lease.years = Math.floor(totalMonths / 12);
      lease.months = totalMonths % 12;
      console.log('📅 Found Period:', totalMonths, 'months');
      break;
    }
  }
  
  // Option Period
  const optionPatterns = [
    /Option\s+Period\s*\(?in\s*months\)?\s*(\d+)/i,
    /Option[:\s]+(\d+)\s*months/i
  ];
  
  for (const pattern of optionPatterns) {
    const optionMatch = text.match(pattern);
    if (optionMatch) {
      const optionMonths = parseInt(optionMatch[1]);
      lease.optionYears = Math.floor(optionMonths / 12);
      lease.optionMonths = optionMonths % 12;
      break;
    }
  }
  
  // Exercise By Date
  const exercisePatterns = [
    /Exercise\s+By\s+(\d{2}\/\d{2}\/\d{4})/i,
    /Exercise\s+Date[:\s]+(\d{2}\/\d{2}\/\d{4})/i
  ];
  
  for (const pattern of exercisePatterns) {
    const exerciseMatch = text.match(pattern);
    if (exerciseMatch) {
      lease.optionExerciseDate = convertDateFormat(exerciseMatch[1]);
      break;
    }
  }
  
  return lease;
}

/**
 * Extract financial/rental data
 */
function extractFinancialData(text, method) {
  const financial = {
    year1: { basicRent: '', security: '', refuse: '', rates: '', sewerageWater: '', from: '', to: '' },
    year2: { basicRent: '', security: '', refuse: '', rates: '', sewerageWater: '', from: '', to: '' },
    year3: { basicRent: '', security: '', refuse: '', rates: '', sewerageWater: '', from: '', to: '' },
    year4: { basicRent: '', security: '', refuse: '', rates: '', sewerageWater: '', from: '', to: '' },
    year5: { basicRent: '', security: '', refuse: '', rates: '', sewerageWater: '', from: '', to: '' },
    deposit: '',
    leaseFee: '750.00',
    utilities: 'METERED OR % AGE OF EXPENSE',
    escalationRate: '6',
    turnoverPercentage: 'N/A',
    financialYearEnd: 'N/A',
    minimumTurnover: 'N/A',
    advertisingContribution: 'N/A'
  };
  
  console.log('💰 Extracting financial data...');
  
  // Find rental entries - Pattern: DD/MM/YYYY DD/MM/YYYY Amount Rate Escalation%
  // More flexible pattern to handle various spacing
  const rentalPattern = /(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+([\d,]+\.?\d*)\s+([\d.]+)\s+([\d.]+)/g;
  
  let match;
  let yearIndex = 1;
  
  while ((match = rentalPattern.exec(text)) !== null && yearIndex <= 5) {
    const fromDate = convertDateFormat(match[1]);
    const toDate = convertDateFormat(match[2]);
    const amount = match[3].replace(/,/g, '');
    const escalation = match[5];
    
    const yearKey = `year${yearIndex}`;
    if (financial[yearKey]) {
      financial[yearKey].basicRent = amount;
      financial[yearKey].from = fromDate;
      financial[yearKey].to = toDate;
      console.log(`💰 Year ${yearIndex}: Rent=${amount}, From=${fromDate}, To=${toDate}`);
    }
    
    // Get escalation rate from first entry
    if (yearIndex === 1 && escalation) {
      financial.escalationRate = escalation;
      console.log('💰 Escalation Rate:', escalation);
    }
    
    yearIndex++;
  }
  
  // If no rentals found with the complex pattern, try simpler patterns
  if (yearIndex === 1) {
    console.log('💰 Trying alternative rental extraction...');
    
    // Try to find amounts after date patterns
    const simpleDatePattern = /(\d{2}\/\d{2}\/\d{4})/g;
    const dates = [];
    let dateMatch;
    while ((dateMatch = simpleDatePattern.exec(text)) !== null) {
      dates.push({ date: dateMatch[1], index: dateMatch.index });
    }
    
    // Look for amounts near Base Rentals section
    const baseRentalsIndex = text.toLowerCase().indexOf('base rentals');
    if (baseRentalsIndex !== -1) {
      const rentalSection = text.substring(baseRentalsIndex, baseRentalsIndex + 1000);
      const amountPattern = /([\d,]+\.\d{2})/g;
      const amounts = [];
      let amountMatch;
      while ((amountMatch = amountPattern.exec(rentalSection)) !== null) {
        const val = parseFloat(amountMatch[1].replace(/,/g, ''));
        if (val > 1000) {  // Likely a rent amount
          amounts.push(amountMatch[1].replace(/,/g, ''));
        }
      }
      
      // Assign to years
      amounts.slice(0, 5).forEach((amount, idx) => {
        const yearKey = `year${idx + 1}`;
        if (financial[yearKey]) {
          financial[yearKey].basicRent = amount;
          console.log(`💰 Year ${idx + 1} (alt): Rent=${amount}`);
        }
      });
    }
  }
  
  // Cash Deposit - multiple patterns
  const depositPatterns = [
    /Cash\s+Amount\s+Required\s+([\d,]+\.?\d*)/i,
    /Deposit[:\s]+([\d,]+\.?\d*)/i,
    /Security\s+Deposit[:\s]+([\d,]+\.?\d*)/i
  ];
  
  for (const pattern of depositPatterns) {
    const depositMatch = text.match(pattern);
    if (depositMatch) {
      financial.deposit = depositMatch[1].replace(/,/g, '');
      console.log('💰 Found Deposit:', financial.deposit);
      break;
    }
  }
  
  // Lease Fees
  const leaseFeesPatterns = [
    /Lease\s+Fees?\s+Amount\s+([\d,]+\.?\d*)/i,
    /Lease\s+Fee[:\s]+([\d,]+\.?\d*)/i
  ];
  
  for (const pattern of leaseFeesPatterns) {
    const leaseFeesMatch = text.match(pattern);
    if (leaseFeesMatch) {
      financial.leaseFee = leaseFeesMatch[1].replace(/,/g, '');
      console.log('💰 Found Lease Fee:', financial.leaseFee);
      break;
    }
  }
  
  // Escalation rate if not found from rentals
  if (financial.escalationRate === '6') {
    const escPatterns = [
      /Escalation[:\s]+(\d+(?:\.\d+)?)\s*%/i,
      /(\d+(?:\.\d+)?)\s*%\s*(?:annual|escalation)/i
    ];
    
    for (const pattern of escPatterns) {
      const escMatch = text.match(pattern);
      if (escMatch) {
        financial.escalationRate = escMatch[1];
        console.log('💰 Found Escalation Rate:', financial.escalationRate);
        break;
      }
    }
  }
  
  return financial;
}

/**
 * Helper function to clean text
 */
function cleanText(text) {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Helper function to clean address
 */
function cleanAddress(text) {
  if (!text) return '';
  return text
    .replace(/\s+/g, ' ')
    .replace(/,\s*,/g, ',')
    .trim();
}

/**
 * Convert DD/MM/YYYY to YYYY-MM-DD format
 */
function convertDateFormat(dateStr) {
  if (!dateStr) return '';
  
  // If already in YYYY-MM-DD format
  if (/^\d{4}[-\/]\d{2}[-\/]\d{2}$/.test(dateStr)) {
    return dateStr.replace(/\//g, '-');
  }
  
  // Convert DD/MM/YYYY to YYYY-MM-DD
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
}

module.exports = { parseLeaseControlPDF };
