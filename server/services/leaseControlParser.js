/**
 * Lease Control Schedule PDF Parser
 * Extracts all lease data from Lease Control Schedule PDF documents
 * Uses Python pdfplumber (preferred) with JavaScript pdf-parse fallback
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
    
    // FIX: Set lease years based on how many rental periods have rent values
    const rentalYearsCount = countRentalYears(extractedData.financial);
    if (rentalYearsCount > 0) {
      extractedData.lease.years = rentalYearsCount;
      extractedData.lease.months = 0;
      console.log('📅 Lease years set from rental periods:', rentalYearsCount);
    }
    
    console.log('✅ Successfully extracted lease control data');
    console.log('📊 FINAL EXTRACTED DATA:', JSON.stringify(extractedData, null, 2));
    return extractedData;
  } catch (error) {
    console.error('❌ Error parsing Lease Control PDF:', error);
    throw error;
  }
}

/**
 * Count how many years have rent values in financial data
 */
function countRentalYears(financial) {
  let count = 0;
  for (let i = 1; i <= 5; i++) {
    const yearKey = `year${i}`;
    if (financial[yearKey] && financial[yearKey].basicRent && parseFloat(financial[yearKey].basicRent) > 0) {
      count++;
    }
  }
  return count;
}

/**
 * Clean company name - remove prefixes like "Trading As\n"
 */
function cleanCompanyName(name) {
  if (!name) return '';
  return name
    .replace(/^.*?(?:Trading\s*As|List\s*\/\s*Trading\s*As)\s*\n?/i, '')
    .replace(/^\d+\s*\n/, '')  // Remove leading numbers
    .replace(/\n/g, ' ')
    .trim();
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
  
  // Look for Reflect-All pattern (common landlord)
  const reflectMatch = text.match(/Reflect[\-\s]?All\s*\d*\s*\(Pty\)\s*Ltd/i);
  if (reflectMatch) {
    landlord.name = reflectMatch[0].trim();
    console.log('🏠 Landlord name (Reflect):', landlord.name);
  }
  
  // If not found, look near Owner / Lessor
  if (!landlord.name) {
    // Find text after "Owner / Lessor" that contains (Pty) Ltd
    const ownerSection = text.match(/Owner\s*\/\s*Lessor[\s\S]{0,500}/i);
    if (ownerSection) {
      const companyMatch = ownerSection[0].match(/([A-Za-z][\w\s\-\.&']+?)\s*\(Pty\)\s*Ltd/i);
      if (companyMatch) {
        landlord.name = companyMatch[0].trim();
        console.log('🏠 Landlord name (Owner section):', landlord.name);
      }
    }
  }
  
  // Extract registration number - look for format YYYY/NNNNNN/NN
  const regMatches = text.match(/\d{4}\/\d{5,}\/\d{2}/g) || [];
  if (regMatches.length > 0) {
    // Take the one that appears near "Entity" or "Reference" or use the first one for landlord
    landlord.regNo = regMatches[0];
    console.log('📋 Landlord Reg No:', landlord.regNo);
  }
  
  // Extract phone
  const phoneMatch = text.match(/(?:Tel|Phone)[:\s]*(\d[\d\s\-]+\d)/i);
  if (phoneMatch) {
    landlord.phone = phoneMatch[1].replace(/\s+/g, ' ').trim();
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
  
  // Look for company name after "Trading As" or at the start (header)
  // Pattern: Trading As followed by company name
  const tradingMatch = text.match(/(?:Trading\s*As|List\s*\/\s*Trading\s*As)\s*\n?\s*([A-Za-z][\w\s\-\.&']+?\s*\(Pty\)\s*Ltd)/i);
  if (tradingMatch) {
    tenant.name = tradingMatch[1].trim();
    tenant.tradingAs = tenant.name;
    console.log('👤 Tenant name:', tenant.name);
  }
  
  // If not found, look for first company name in document (usually tenant in header)
  if (!tenant.name) {
    const headerMatch = text.match(/^[\s\S]{0,200}?([A-Za-z][\w\s\-\.&']+?\s*\(Pty\)\s*Ltd)/i);
    if (headerMatch) {
      tenant.name = headerMatch[1].trim();
      tenant.tradingAs = tenant.name;
      console.log('👤 Tenant name (header):', tenant.name);
    }
  }
  
  // Extract registration number (Ref No) - usually second one in document
  const regMatches = text.match(/\d{4}\/\d{5,}\/\d{2}/g) || [];
  if (regMatches.length > 1) {
    tenant.regNo = regMatches[1];
    console.log('📋 Tenant Reg No:', tenant.regNo);
  }
  
  // Extract VAT number
  const vatMatch = text.match(/(?:VAT|Vat)\s*(?:No|Number)?[:\s]*(\d{10})/i);
  if (vatMatch) {
    tenant.vatNo = vatMatch[1];
    console.log('📋 Tenant VAT No:', tenant.vatNo);
  }
  
  // Extract physical address - look for street address pattern
  // Pattern like "22 Stirrup Lane, Woodmead Office Park, Woodmead"
  const addressMatch = text.match(/(\d+\s+[A-Za-z]+\s+(?:Lane|Street|Road|Avenue|Drive)[,\s]+[A-Za-z\s,]+(?:Park|Office|Estate|Centre)?[,\s]*[A-Za-z]*)/i);
  if (addressMatch) {
    tenant.physicalAddress = addressMatch[1].replace(/\s+/g, ' ').trim();
    console.log('📍 Physical Address:', tenant.physicalAddress);
  }
  
  // Also look for Domicile pattern
  if (!tenant.physicalAddress) {
    const domicileMatch = text.match(/Domicile[:\s]+([^\n]+(?:Lane|Street|Road|Park|Office)[^\n]*)/i);
    if (domicileMatch) {
      tenant.physicalAddress = domicileMatch[1].trim();
      console.log('📍 Physical Address (Domicile):', tenant.physicalAddress);
    }
  }
  
  // Extract Erf/Property address
  const erfMatch = text.match(/(Erf\s+\d+[,\s]+[A-Za-z]+[,\s]+\d+\s+[A-Za-z\s,]+(?:Park|Office)?[^\n]*)/i);
  if (erfMatch && !tenant.physicalAddress) {
    tenant.physicalAddress = erfMatch[1].replace(/\s+/g, ' ').trim();
    console.log('📍 Physical Address (Erf):', tenant.physicalAddress);
  }
  
  // Postal address - look for PO Box or postal section
  const postalMatch = text.match(/(?:Postal|PO\s*Box)[:\s]+([^\n]+)/i);
  if (postalMatch) {
    tenant.postalAddress = postalMatch[1].trim();
    // Make sure it's not just a company name
    if (tenant.postalAddress.includes('(Pty)')) {
      tenant.postalAddress = tenant.physicalAddress || '';
    }
    console.log('📍 Postal Address:', tenant.postalAddress);
  } else {
    tenant.postalAddress = tenant.physicalAddress || '';
  }
  
  // Extract bank details - look for Banking section
  const bankSection = text.match(/Banking[\s\S]{0,300}/i);
  if (bankSection) {
    const bankNameMatch = bankSection[0].match(/Bank\s+([A-Za-z]+)/i);
    if (bankNameMatch && bankNameMatch[1].toLowerCase() !== 'guarantee' && bankNameMatch[1].toLowerCase() !== 'authorisation') {
      tenant.bankName = bankNameMatch[1];
      console.log('🏦 Bank:', tenant.bankName);
    }
    
    const accountNoMatch = bankSection[0].match(/Account\s*No\s*(\d+)/i);
    if (accountNoMatch) {
      tenant.bankAccountNumber = accountNoMatch[1];
      console.log('🏦 Account No:', tenant.bankAccountNumber);
    }
    
    const branchNoMatch = bankSection[0].match(/Branch\s*No\s*(\d+)/i);
    if (branchNoMatch) {
      tenant.bankBranchCode = branchNoMatch[1];
      console.log('🏦 Branch Code:', tenant.bankBranchCode);
    }
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
  
  console.log('🔍 Extracting surety data...');
  
  // Look for pattern: Person Name + Director/Member
  // The format is usually "Peter Allan MarksDirector" or "Name    Capacity"
  // Also handle "Woodmead\nPeter Allan MarksDirector" - need to extract just the name part
  
  // First, find text near "Director" and extract the person name before it
  const directorPatterns = [
    // Pattern: "Peter Allan Marks Director" or "Peter Allan MarksDirector"
    /([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*(Director|Member)/i,
    // Pattern: Name immediately before Director (no space)
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)(?=Director)/,
    // Authorised Representative pattern
    /Authorised\s*Representative\s*\n?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i
  ];
  
  for (const pattern of directorPatterns) {
    const match = text.match(pattern);
    if (match) {
      let name = match[1].trim();
      // Clean up any location prefixes (e.g., "Woodmead\nPeter" -> "Peter")
      name = name.replace(/^[A-Za-z]+\n/, '').trim();
      // Only accept if it looks like a person name (2-4 words, all capitalized)
      const words = name.split(/\s+/);
      if (words.length >= 2 && words.length <= 4 && words.every(w => /^[A-Z][a-z]+$/.test(w))) {
        surety.name = name;
        surety.capacity = match[2] ? match[2].trim() : 'Director';
        console.log('👤 Surety name:', surety.name);
        console.log('💼 Capacity:', surety.capacity);
        break;
      }
    }
  }
  
  // Fallback: Look for Capacity field and extract name before it
  if (!surety.name) {
    const capacityMatch = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s*\n?\s*Capacity\s*\n?\s*(Director|Member|Owner)/i);
    if (capacityMatch) {
      surety.name = capacityMatch[1].trim();
      surety.capacity = capacityMatch[2].trim();
      console.log('👤 Surety name (Capacity pattern):', surety.name);
    }
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
  
  // Invalid values to reject
  const invalidValues = ['area', 'address', 'noarea', 'noaddress', 'no', 'n/a'];
  
  // First priority: Look for "Erf NNN" pattern (most reliable)
  const erfMatch = text.match(/Erf\s+(\d+)/i);
  if (erfMatch) {
    premises.unit = 'Erf ' + erfMatch[1];
    console.log('🏢 Unit (Erf):', premises.unit);
  }
  
  // Second priority: Look for Unit No with actual value
  if (!premises.unit) {
    const unitMatch = text.match(/Unit\s*(?:No)?\s+([A-Za-z0-9]+(?:\s+[A-Za-z0-9]+)?)/i);
    if (unitMatch) {
      const unit = unitMatch[1].trim();
      if (!invalidValues.includes(unit.toLowerCase())) {
        premises.unit = unit;
        console.log('🏢 Unit:', premises.unit);
      }
    }
  }
  
  // Third priority: Look for Property with Erf
  if (!premises.unit) {
    const propertyMatch = text.match(/Property\s+(Erf\s+\d+[,\s]*[A-Za-z]*)/i);
    if (propertyMatch) {
      premises.unit = propertyMatch[1].trim();
      console.log('🏢 Unit (Property):', premises.unit);
    }
  }
  
  // Extract building name/property
  const buildingMatch = text.match(/Property\s+([A-Za-z0-9\s,]+?(?:Park|Estate|Centre|Office)?)/i);
  if (buildingMatch) {
    const building = buildingMatch[1].trim();
    if (building.toLowerCase() !== 'address') {
      premises.buildingName = building;
      console.log('🏢 Building:', premises.buildingName);
    }
  }
  
  // Extract address - look for street address
  const addressMatch = text.match(/(\d+\s+[A-Za-z]+\s+(?:Lane|Street|Road|Avenue|Drive)[,\s]+[A-Za-z\s]+(?:Park|Office)?[^\n]*)/i);
  if (addressMatch) {
    premises.buildingAddress = addressMatch[1].replace(/\s+/g, ' ').trim();
    console.log('📍 Building Address:', premises.buildingAddress);
  }
  
  // Extract size (area in m²) - look for number like 417.00
  const sizePatterns = [
    /Main\s*Unit\s*(\d+\.?\d*)/i,
    /Area\s*(?:No of Units)?[\s\S]*?(\d{2,4}\.\d{2})/i,
    /(\d{3,4}\.\d{2})\s*(?:m²|sqm)?/
  ];
  
  for (const pattern of sizePatterns) {
    const match = text.match(pattern);
    if (match) {
      const size = parseFloat(match[1]);
      if (size > 10 && size < 10000) {  // Reasonable building size
        premises.size = match[1];
        console.log('📐 Size:', premises.size);
        break;
      }
    }
  }
  
  // Extract permitted use
  const usageMatch = text.match(/Permitted\s*Usage?\s*\n?\s*([A-Za-z][A-Za-z\s,\.&]+?)(?=\n\n|Base|Recoveries|Deposit)/is);
  if (usageMatch) {
    premises.permittedUse = usageMatch[1].replace(/\s+/g, ' ').trim();
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
    allDates.push(match[1]);
  }
  console.log('📅 All dates found:', allDates);
  
  // Look for "Lease Starts" and "Lease Ends" patterns
  const startMatch = text.match(/Lease\s*Starts?\s*(\d{2}\/\d{2}\/\d{4})/i);
  const endMatch = text.match(/Lease\s*Ends?\s*(\d{2}\/\d{2}\/\d{4})/i);
  
  if (startMatch) {
    lease.commencementDate = convertDateFormat(startMatch[1]);
    console.log('📅 Start date (Lease Starts):', lease.commencementDate);
  }
  
  if (endMatch) {
    lease.terminationDate = convertDateFormat(endMatch[1]);
    console.log('📅 End date (Lease Ends):', lease.terminationDate);
  }
  
  // If not found, look at the rental periods - find the range
  if (!lease.commencementDate || !lease.terminationDate) {
    // Find dates that look like rental periods (01/04/YYYY pattern common for lease starts)
    const rentalDates = allDates.filter(d => d.startsWith('01/04/') || d.startsWith('01/03/') || d.startsWith('01/01/'));
    const endDates = allDates.filter(d => d.startsWith('31/03/') || d.startsWith('30/09/') || d.startsWith('31/12/'));
    
    if (rentalDates.length > 0 && !lease.commencementDate) {
      // Sort to find earliest
      rentalDates.sort((a, b) => {
        const [da, ma, ya] = a.split('/');
        const [db, mb, yb] = b.split('/');
        return new Date(ya, ma-1, da) - new Date(yb, mb-1, db);
      });
      lease.commencementDate = convertDateFormat(rentalDates[0]);
      console.log('📅 Start date (rental period):', lease.commencementDate);
    }
    
    if (endDates.length > 0 && !lease.terminationDate) {
      // Sort to find latest
      endDates.sort((a, b) => {
        const [da, ma, ya] = a.split('/');
        const [db, mb, yb] = b.split('/');
        return new Date(yb, mb-1, db) - new Date(ya, ma-1, da);
      });
      lease.terminationDate = convertDateFormat(endDates[0]);
      console.log('📅 End date (rental period):', lease.terminationDate);
    }
  }
  
  // Calculate years from dates
  if (lease.commencementDate && lease.terminationDate) {
    const start = new Date(lease.commencementDate);
    const end = new Date(lease.terminationDate);
    const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    
    if (monthsDiff > 0) {
      lease.years = Math.floor(monthsDiff / 12);
      lease.months = monthsDiff % 12;
      console.log('📅 Calculated period:', lease.years, 'years', lease.months, 'months');
    }
  }
  
  // Also look for explicit "Period in Months" - but be careful, might be option period
  const periodMatch = text.match(/Period\s*(?:in\s*)?Months?\s*(\d+)/i);
  if (periodMatch) {
    const months = parseInt(periodMatch[1]);
    // Only use if reasonable (12-120 months = 1-10 years)
    if (months >= 12 && months <= 120) {
      const years = Math.floor(months / 12);
      const remainingMonths = months % 12;
      // Only override if we didn't calculate from dates or if significantly different
      if (!lease.commencementDate || !lease.terminationDate) {
        lease.years = years;
        lease.months = remainingMonths;
        console.log('📅 Period from text:', months, 'months =', years, 'years', remainingMonths, 'months');
      }
    }
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
  
  // Find rental amounts - look for pattern: DD/MM/YYYY DD/MM/YYYY Amount Rate Escalation%
  const rentalPattern = /(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+([\d,]+\.?\d*)\s+([\d.]+)\s+([\d.]+)/g;
  
  const rentals = [];
  let match;
  while ((match = rentalPattern.exec(text)) !== null) {
    rentals.push({
      from: match[1],
      to: match[2],
      amount: match[3].replace(/,/g, ''),
      rate: match[4],
      escalation: match[5]
    });
  }
  
  console.log('💰 Rental periods found:', rentals.length);
  
  // Assign to years - SORTED by from date (earliest first)
  if (rentals.length > 0) {
    rentals.sort((a, b) => {
      const [da, ma, ya] = a.from.split('/');
      const [db, mb, yb] = b.from.split('/');
      return new Date(ya, ma-1, da) - new Date(yb, mb-1, db);
    });
    
    rentals.slice(0, 5).forEach((rental, idx) => {
      const yearKey = `year${idx + 1}`;
      financial[yearKey].basicRent = rental.amount;
      financial[yearKey].from = convertDateFormat(rental.from);
      financial[yearKey].to = convertDateFormat(rental.to);
      console.log(`💰 Year ${idx + 1}: Rent=${rental.amount}, From=${rental.from}, To=${rental.to}`);
    });
    
    // Get escalation rate from first rental
    if (rentals[0].escalation) {
      financial.escalationRate = rentals[0].escalation;
      console.log('💰 Escalation Rate:', financial.escalationRate);
    }
  }
  
  // If no structured rentals found, look for amounts in ascending order (Year 1 = smallest)
  if (!financial.year1.basicRent) {
    // Find amounts that look like rent (between 10000 and 100000)
    const amountPattern = /([\d,]+\.\d{2})/g;
    const amounts = [];
    while ((match = amountPattern.exec(text)) !== null) {
      const value = parseFloat(match[1].replace(/,/g, ''));
      if (value >= 10000 && value <= 100000) {
        amounts.push(value);
      }
    }
    
    // Remove duplicates and sort ascending (Year 1 is usually smallest with escalation)
    const uniqueAmounts = [...new Set(amounts)].sort((a, b) => a - b);
    console.log('💰 Rent-like amounts (sorted):', uniqueAmounts);
    
    uniqueAmounts.slice(0, 5).forEach((amount, idx) => {
      const yearKey = `year${idx + 1}`;
      financial[yearKey].basicRent = amount.toFixed(2);
      console.log(`💰 Year ${idx + 1} Rent (sorted):`, financial[yearKey].basicRent);
    });
  }
  
  // Extract deposit
  const depositMatch = text.match(/Cash\s*Amount\s*Required\s*([\d,]+\.?\d*)/i);
  if (depositMatch && parseFloat(depositMatch[1].replace(/,/g, '')) > 0) {
    financial.deposit = depositMatch[1].replace(/,/g, '');
    console.log('💰 Deposit:', financial.deposit);
  }
  
  // Extract lease fee
  const feeMatch = text.match(/Lease\s*Fees?\s*Amount\s*([\d,]+\.?\d*)/i);
  if (feeMatch) {
    financial.leaseFee = feeMatch[1].replace(/,/g, '');
    console.log('💰 Lease Fee:', financial.leaseFee);
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

