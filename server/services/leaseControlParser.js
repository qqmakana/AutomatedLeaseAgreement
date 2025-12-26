/**
 * Lease Control Schedule PDF Parser
 * Extracts all lease data from Lease Control Schedule PDF documents
 * Uses Python pdfplumber (preferred) with JavaScript pdf-parse fallback
 * Robust extraction with aggressive pattern matching
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
    const tempFile = path.join(os.tmpdir(), `lease_control_${Date.now()}.pdf`);
    fs.writeFileSync(tempFile, pdfBuffer);
    
    const pythonScript = `
import pdfplumber
import sys

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
  try {
    console.log('📄 Attempting PDF extraction with Python pdfplumber...');
    const text = await extractTextWithPython(pdfBuffer);
    console.log('✅ Python extraction successful');
    return { text, method: 'python' };
  } catch (pythonError) {
    console.log('⚠️ Python extraction failed:', pythonError.message);
    
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
 * Parse a Lease Control Schedule PDF and extract all relevant data
 */
async function parseLeaseControlPDF(pdfBuffer) {
  try {
    console.log('📄 Parsing Lease Control Schedule PDF...');
    
    const { text, method } = await extractTextFromPDF(pdfBuffer);
    console.log('📝 Extracted text length:', text.length, '(using', method, ')');
    
    // Log full text for debugging
    console.log('=== FULL PDF TEXT ===');
    console.log(text);
    console.log('=== END FULL TEXT ===');
    
    // Extract all the data
    const extractedData = {
      landlord: extractLandlordData(text),
      tenant: extractTenantData(text),
      surety: extractSuretyData(text),
      premises: extractPremisesData(text),
      lease: extractLeaseTerms(text),
      financial: extractFinancialData(text)
    };
    
    console.log('✅ Successfully extracted lease control data');
    console.log('📊 FINAL EXTRACTED DATA:', JSON.stringify(extractedData, null, 2));
    return extractedData;
  } catch (error) {
    console.error('❌ Error parsing Lease Control PDF:', error);
    throw error;
  }
}

/**
 * Find all (Pty) Ltd company names in text
 */
function findAllCompanies(text) {
  const companies = [];
  // Multiple patterns to catch company names
  const patterns = [
    /([A-Za-z0-9][\w\s\-\.&']+?)\s*\(Pty\)\s*Ltd/gi,
    /([A-Za-z0-9][\w\s\-\.&']+?)\s*\(PTY\)\s*LTD/gi,
    /([A-Za-z0-9][\w\s\-\.&']+?)(?:\s+|\s*)\(Pty\)(?:\s+|\s*)Ltd/gi
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const fullName = match[0].trim();
      if (!companies.includes(fullName) && fullName.length > 5) {
        companies.push(fullName);
      }
    }
  }
  
  return companies;
}

/**
 * Extract landlord/owner data
 */
function extractLandlordData(text) {
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
  
  console.log('🔍 Extracting landlord data...');
  
  // Find all companies
  const companies = findAllCompanies(text);
  console.log('🏢 Companies found:', companies);
  
  // Look for owner/lessor company
  // First try to find text near "Owner" or "Lessor"
  const ownerArea = text.match(/Owner[^\n]*\n?[^\n]*/i) || 
                    text.match(/Lessor[^\n]*\n?[^\n]*/i);
  
  if (ownerArea) {
    console.log('📋 Owner area:', ownerArea[0]);
    for (const company of companies) {
      if (ownerArea[0].includes(company.replace(/\s*\(Pty\)\s*Ltd/i, ''))) {
        landlord.name = company;
        break;
      }
    }
  }
  
  // If not found, try specific patterns
  if (!landlord.name) {
    // Look for Reflect-All specifically (common in these docs)
    const reflectMatch = text.match(/Reflect[\-\s]?All[\s\d]+\s*\(Pty\)\s*Ltd/i);
    if (reflectMatch) {
      landlord.name = reflectMatch[0].trim();
    }
  }
  
  // If still not found, take the first company that appears
  if (!landlord.name && companies.length > 0) {
    // Try to find one near "Owner" or "Lessor" keyword
    const ownerIndex = text.toLowerCase().indexOf('owner');
    const lessorIndex = text.toLowerCase().indexOf('lessor');
    const keyIndex = ownerIndex >= 0 ? ownerIndex : lessorIndex;
    
    if (keyIndex >= 0) {
      // Find company closest to this keyword
      let closestCompany = companies[0];
      let closestDist = Infinity;
      
      for (const company of companies) {
        const compIndex = text.indexOf(company);
        const dist = Math.abs(compIndex - keyIndex);
        if (dist < closestDist && compIndex > keyIndex) {
          closestDist = dist;
          closestCompany = company;
        }
      }
      landlord.name = closestCompany;
    } else {
      landlord.name = companies[0];
    }
  }
  
  console.log('🏠 Landlord name:', landlord.name);
  
  // Extract registration number
  const regPatterns = [
    /(?:Reg(?:istration)?|Reference)\s*(?:No|Number)?[:\s]*(\d{4}\/\d+\/\d+)/i,
    /(\d{4}\/\d{5,}\/\d{2})/
  ];
  
  for (const pattern of regPatterns) {
    const match = text.match(pattern);
    if (match) {
      landlord.regNo = match[1];
      console.log('📋 Landlord Reg No:', landlord.regNo);
      break;
    }
  }
  
  // Extract phone
  const phoneMatch = text.match(/(?:Tel(?:ephone)?|Phone|Mobile)[:\s]*(\d[\d\s\-\(\)]{8,})/i);
  if (phoneMatch) {
    landlord.phone = phoneMatch[1].trim();
    console.log('📞 Phone:', landlord.phone);
  }
  
  return landlord;
}

/**
 * Extract tenant data
 */
function extractTenantData(text) {
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
  
  console.log('🔍 Extracting tenant data...');
  
  // Find all companies
  const companies = findAllCompanies(text);
  
  // Look for tenant/lessee - usually near "Trading As" or "Tenant" or "Lessee"
  const tenantArea = text.match(/(?:Trading\s*As|Tenant|Lessee)[^\n]*\n?[^\n]*/i);
  
  if (tenantArea) {
    console.log('📋 Tenant area:', tenantArea[0]);
    for (const company of companies) {
      const companyBase = company.replace(/\s*\(Pty\)\s*Ltd/i, '').trim();
      if (tenantArea[0].toLowerCase().includes(companyBase.toLowerCase())) {
        tenant.name = company;
        tenant.tradingAs = company;
        break;
      }
    }
  }
  
  // If not found, look for pattern at start of document (header)
  if (!tenant.name) {
    const headerMatch = text.match(/^([A-Za-z][\w\s\-\.&']+\s*\(Pty\)\s*Ltd)/im);
    if (headerMatch) {
      tenant.name = headerMatch[1].trim();
      tenant.tradingAs = tenant.name;
    }
  }
  
  // If still not found and we have multiple companies, take second one (first is usually landlord)
  if (!tenant.name && companies.length > 1) {
    tenant.name = companies[1];
    tenant.tradingAs = tenant.name;
  } else if (!tenant.name && companies.length === 1) {
    tenant.name = companies[0];
    tenant.tradingAs = tenant.name;
  }
  
  console.log('👤 Tenant name:', tenant.name);
  
  // Extract registration number (Ref No)
  const refMatch = text.match(/Ref\s*No[:\s]*(\d{4}\/\d+\/\d+)/i);
  if (refMatch) {
    tenant.regNo = refMatch[1];
    console.log('📋 Tenant Reg No:', tenant.regNo);
  }
  
  // Extract VAT number
  const vatMatch = text.match(/(?:VAT|Vat)\s*(?:No|Number)?[:\s]*(\d{10,})/i);
  if (vatMatch) {
    tenant.vatNo = vatMatch[1];
    console.log('📋 Tenant VAT No:', tenant.vatNo);
  }
  
  // Extract addresses
  const domicileMatch = text.match(/Domicile[:\s]+([^\n]+)/i);
  if (domicileMatch) {
    tenant.physicalAddress = domicileMatch[1].trim();
    console.log('📍 Physical Address:', tenant.physicalAddress);
  }
  
  const postalMatch = text.match(/Postal[:\s]+([^\n]+)/i);
  if (postalMatch) {
    tenant.postalAddress = postalMatch[1].trim();
    console.log('📍 Postal Address:', tenant.postalAddress);
  }
  
  // Extract bank details
  const bankMatch = text.match(/Bank[:\s]+([A-Za-z]+)/i);
  if (bankMatch) {
    tenant.bankName = bankMatch[1];
    console.log('🏦 Bank:', tenant.bankName);
  }
  
  const accountNoMatch = text.match(/Account\s*No[:\s]*(\d+)/i);
  if (accountNoMatch) {
    tenant.bankAccountNumber = accountNoMatch[1];
    console.log('🏦 Account No:', tenant.bankAccountNumber);
  }
  
  const branchNoMatch = text.match(/Branch\s*(?:No|Code)?[:\s]*(\d+)/i);
  if (branchNoMatch) {
    tenant.bankBranchCode = branchNoMatch[1];
    console.log('🏦 Branch Code:', tenant.bankBranchCode);
  }
  
  return tenant;
}

/**
 * Extract surety data
 */
function extractSuretyData(text) {
  const surety = {
    name: '',
    idNumber: '',
    address: '',
    capacity: ''
  };
  
  // Look for representative/surety name
  const repMatch = text.match(/(?:Authorised\s+)?Representative[:\s]+([A-Za-z\s]+?)(?:\s+Capacity|\s+Director|\n)/i);
  if (repMatch) {
    surety.name = repMatch[1].trim();
    console.log('👤 Surety name:', surety.name);
  }
  
  // Look for capacity
  const capacityMatch = text.match(/Capacity[:\s]+(Director|Member|Owner|Partner|Manager)/i);
  if (capacityMatch) {
    surety.capacity = capacityMatch[1];
    console.log('💼 Capacity:', surety.capacity);
  }
  
  // Look for ID number
  const idMatch = text.match(/(?:ID|Identity)\s*(?:No|Number)?[:\s]*(\d{13})/i);
  if (idMatch) {
    surety.idNumber = idMatch[1];
    console.log('🆔 ID Number:', surety.idNumber);
  }
  
  return surety;
}

/**
 * Extract premises data
 */
function extractPremisesData(text) {
  const premises = {
    unit: '',
    buildingName: '',
    buildingAddress: '',
    size: '',
    percentage: '',
    permittedUse: ''
  };
  
  console.log('🔍 Extracting premises data...');
  
  // Extract unit
  const unitMatch = text.match(/Unit\s*(?:No)?[:\s]*([A-Za-z0-9\s]+?)(?=\s+\d+\.|\s+Area|\n|$)/i);
  if (unitMatch) {
    premises.unit = unitMatch[1].trim();
    console.log('🏢 Unit:', premises.unit);
  }
  
  // Extract property/building name (look for Erf, Building, Property patterns)
  const propertyMatch = text.match(/Property[:\s]+([^\n]+)/i) ||
                        text.match(/Erf\s+\d+[,\s]*([^\n]+)/i);
  if (propertyMatch) {
    premises.buildingName = propertyMatch[1].trim();
    console.log('🏢 Building:', premises.buildingName);
  }
  
  // Extract address
  const addressMatch = text.match(/Address[:\s]+(\d+[^\n]+)/i);
  if (addressMatch) {
    premises.buildingAddress = addressMatch[1].trim();
    console.log('📍 Building Address:', premises.buildingAddress);
  }
  
  // Extract size (area in m²)
  const sizePatterns = [
    /Main\s*Unit[:\s]*(\d+\.?\d*)/i,
    /Area[:\s]*(\d+\.?\d*)\s*(?:m²|sqm)?/i,
    /(\d{2,4}\.\d{2})\s*(?:m²|sqm|square)/i,
    /Size[:\s]*(\d+\.?\d*)/i
  ];
  
  for (const pattern of sizePatterns) {
    const match = text.match(pattern);
    if (match && parseFloat(match[1]) > 10) {  // Minimum reasonable size
      premises.size = match[1];
      console.log('📐 Size:', premises.size);
      break;
    }
  }
  
  // Extract permitted use
  const usageMatch = text.match(/Permitted\s*Usage?[:\s]+([^\n]+)/i);
  if (usageMatch) {
    premises.permittedUse = usageMatch[1].trim();
    console.log('📋 Permitted Use:', premises.permittedUse);
  }
  
  return premises;
}

/**
 * Extract lease terms
 */
function extractLeaseTerms(text) {
  const lease = {
    years: 3,
    months: 0,
    commencementDate: '',
    terminationDate: '',
    optionYears: 3,
    optionMonths: 0,
    optionExerciseDate: ''
  };
  
  console.log('🔍 Extracting lease terms...');
  
  // Find all dates in DD/MM/YYYY format
  const datePattern = /(\d{2}\/\d{2}\/\d{4})/g;
  const allDates = [];
  let match;
  while ((match = datePattern.exec(text)) !== null) {
    allDates.push({ date: match[1], index: match.index });
  }
  console.log('📅 All dates found:', allDates.map(d => d.date));
  
  // Look for lease start date
  const startMatch = text.match(/(?:Lease\s+Start|Commencement)[^\d]*(\d{2}\/\d{2}\/\d{4})/i);
  if (startMatch) {
    lease.commencementDate = convertDateFormat(startMatch[1]);
    console.log('📅 Start date:', lease.commencementDate);
  } else if (allDates.length > 0) {
    // Use first date as start
    lease.commencementDate = convertDateFormat(allDates[0].date);
    console.log('📅 Start date (first found):', lease.commencementDate);
  }
  
  // Look for lease end date
  const endMatch = text.match(/(?:Lease\s+End|Termination)[^\d]*(\d{2}\/\d{2}\/\d{4})/i);
  if (endMatch) {
    lease.terminationDate = convertDateFormat(endMatch[1]);
    console.log('📅 End date:', lease.terminationDate);
  } else if (allDates.length > 1) {
    // Use second date as end
    lease.terminationDate = convertDateFormat(allDates[1].date);
    console.log('📅 End date (second found):', lease.terminationDate);
  }
  
  // Extract period in months
  const periodMatch = text.match(/Period\s*(?:in\s*)?Months?[:\s]*(\d+)/i);
  if (periodMatch) {
    const totalMonths = parseInt(periodMatch[1]);
    lease.years = Math.floor(totalMonths / 12);
    lease.months = totalMonths % 12;
    console.log('📅 Period:', totalMonths, 'months');
  }
  
  // Extract option period
  const optionMatch = text.match(/Option\s*Period[^\d]*(\d+)/i);
  if (optionMatch) {
    const optionMonths = parseInt(optionMatch[1]);
    lease.optionYears = Math.floor(optionMonths / 12);
    lease.optionMonths = optionMonths % 12;
    console.log('📅 Option Period:', optionMonths, 'months');
  }
  
  return lease;
}

/**
 * Extract financial data
 */
function extractFinancialData(text) {
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
  
  console.log('🔍 Extracting financial data...');
  
  // Find all monetary amounts (numbers with decimals or commas)
  const amountPattern = /([\d,]+\.\d{2})/g;
  const amounts = [];
  let match;
  while ((match = amountPattern.exec(text)) !== null) {
    const value = parseFloat(match[1].replace(/,/g, ''));
    if (value > 100) {  // Filter out small values
      amounts.push({ value: match[1].replace(/,/g, ''), index: match.index });
    }
  }
  console.log('💰 Large amounts found:', amounts.slice(0, 10).map(a => a.value));
  
  // Look for rental pattern: DD/MM/YYYY DD/MM/YYYY Amount Rate Escalation%
  const rentalPattern = /(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+([\d,]+\.?\d*)\s+([\d.]+)\s+([\d.]+)/g;
  
  let yearIndex = 1;
  while ((match = rentalPattern.exec(text)) !== null && yearIndex <= 5) {
    const fromDate = convertDateFormat(match[1]);
    const toDate = convertDateFormat(match[2]);
    const amount = match[3].replace(/,/g, '');
    const escalation = match[5];
    
    const yearKey = `year${yearIndex}`;
    financial[yearKey].basicRent = amount;
    financial[yearKey].from = fromDate;
    financial[yearKey].to = toDate;
    
    console.log(`💰 Year ${yearIndex}: Rent=${amount}, From=${fromDate}, To=${toDate}`);
    
    if (yearIndex === 1 && escalation) {
      financial.escalationRate = escalation;
      console.log('💰 Escalation Rate:', escalation);
    }
    
    yearIndex++;
  }
  
  // If no structured rental found, try to find rent amount near "Rent" keyword
  if (!financial.year1.basicRent) {
    const rentArea = text.match(/(?:Basic\s*)?Rent[al]?[^\d]*([\d,]+\.?\d*)/i);
    if (rentArea && parseFloat(rentArea[1].replace(/,/g, '')) > 1000) {
      financial.year1.basicRent = rentArea[1].replace(/,/g, '');
      console.log('💰 Year 1 Rent (keyword):', financial.year1.basicRent);
    }
  }
  
  // If still no rent found, use the largest amount (likely to be rent)
  if (!financial.year1.basicRent && amounts.length > 0) {
    const sorted = [...amounts].sort((a, b) => parseFloat(b.value) - parseFloat(a.value));
    const largestReasonable = sorted.find(a => parseFloat(a.value) < 100000);
    if (largestReasonable) {
      financial.year1.basicRent = largestReasonable.value;
      console.log('💰 Year 1 Rent (largest):', financial.year1.basicRent);
    }
  }
  
  // Extract deposit
  const depositMatch = text.match(/(?:Cash\s*Amount|Deposit)[^\d]*([\d,]+\.?\d*)/i);
  if (depositMatch && parseFloat(depositMatch[1].replace(/,/g, '')) > 100) {
    financial.deposit = depositMatch[1].replace(/,/g, '');
    console.log('💰 Deposit:', financial.deposit);
  }
  
  // Extract lease fee
  const feeMatch = text.match(/Lease\s*Fee[^\d]*([\d,]+\.?\d*)/i);
  if (feeMatch) {
    financial.leaseFee = feeMatch[1].replace(/,/g, '');
    console.log('💰 Lease Fee:', financial.leaseFee);
  }
  
  // Extract escalation rate
  const escMatch = text.match(/(?:Escalation|Annual\s*Increase)[^\d]*(\d+(?:\.\d+)?)\s*%/i);
  if (escMatch) {
    financial.escalationRate = escMatch[1];
    console.log('💰 Escalation Rate:', financial.escalationRate);
  }
  
  return financial;
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
