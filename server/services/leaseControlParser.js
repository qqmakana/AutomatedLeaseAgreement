/**
 * Lease Control Schedule PDF Parser
 * Extracts all lease data from Lease Control Schedule PDF documents
 * Uses pdf-parse (JavaScript) for reliable PDF text extraction
 */

const pdfParse = require('pdf-parse');

/**
 * Extract text from PDF using pdf-parse (JavaScript)
 */
async function extractTextFromPDF(pdfBuffer) {
  try {
    const data = await pdfParse(pdfBuffer);
    return data.text;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error(`PDF text extraction failed: ${error.message}`);
  }
}

/**
 * Parse a Lease Control Schedule PDF and extract all relevant data
 * @param {Buffer} pdfBuffer - The PDF file buffer
 * @returns {Object} Extracted lease data in the app's format
 */
async function parseLeaseControlPDF(pdfBuffer) {
  try {
    console.log('📄 Parsing Lease Control Schedule PDF...');
    
    // Extract text using pdf-parse (JavaScript)
    const text = await extractTextFromPDF(pdfBuffer);
    console.log('📝 Extracted text length:', text.length);
    
    // DEBUG: Log first 3000 chars of extracted text
    console.log('=== RAW PDF TEXT (first 3000 chars) ===');
    console.log(text.substring(0, 3000));
    console.log('=== END RAW TEXT ===');
    
    // Normalize text for better matching
    const normalizedText = normalizeText(text);
    
    // Extract all the data
    const extractedData = {
      landlord: extractLandlordData(text, normalizedText),
      tenant: extractTenantData(text, normalizedText),
      surety: extractSuretyData(text, normalizedText),
      premises: extractPremisesData(text, normalizedText),
      lease: extractLeaseTerms(text, normalizedText),
      financial: extractFinancialData(text, normalizedText)
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
 * Normalize text for better pattern matching
 */
function normalizeText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n');
}

/**
 * Extract landlord/owner data
 */
function extractLandlordData(text, normalizedText) {
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
  
  // Find all company names - (Pty) Ltd pattern
  const companyPattern = /([A-Za-z0-9][A-Za-z0-9\-\.&'\s]*?)\s*\((?:Pty|PTY)\)\s*(?:Ltd|LTD)/gi;
  const allCompanies = [];
  let companyMatch;
  while ((companyMatch = companyPattern.exec(text)) !== null) {
    allCompanies.push(companyMatch[0].trim());
  }
  console.log('🏢 All companies found:', allCompanies);
  
  // Try multiple patterns for Owner/Lessor
  const ownerPatterns = [
    /Owner\s*[\/\\]\s*Lessor[\s\n]+([A-Za-z0-9][A-Za-z0-9\-\.&'\s]*?\s*\((?:Pty|PTY)\)\s*(?:Ltd|LTD))/i,
    /Owner[\s\n]+([A-Za-z0-9][A-Za-z0-9\-\.&'\s]*?\s*\((?:Pty|PTY)\)\s*(?:Ltd|LTD))/i,
    /Lessor[\s\n]+([A-Za-z0-9][A-Za-z0-9\-\.&'\s]*?\s*\((?:Pty|PTY)\)\s*(?:Ltd|LTD))/i,
    /(?:Landlord|Property Owner)[\s\n:]+([A-Za-z0-9][A-Za-z0-9\-\.&'\s]*?\s*\((?:Pty|PTY)\)\s*(?:Ltd|LTD))/i
  ];
  
  for (const pattern of ownerPatterns) {
    const match = text.match(pattern);
    if (match) {
      landlord.name = cleanText(match[1]);
      console.log('🏠 Found Owner/Lessor:', landlord.name);
      break;
    }
  }
  
  // If still not found, try to find by context
  if (!landlord.name && allCompanies.length > 0) {
    // Look for Reflect pattern (common in sample)
    const reflectCompany = allCompanies.find(c => /Reflect/i.test(c));
    if (reflectCompany) {
      landlord.name = cleanText(reflectCompany);
      console.log('🏠 Found Owner (Reflect pattern):', landlord.name);
    }
  }
  
  // Registration Number patterns
  const regPatterns = [
    /Entity\s*(?:Ref|Reference)\s*(?:No)?[\s:]+(\d{4}\/\d+\/\d+)/i,
    /Reg(?:istration)?\s*(?:No|Number)?[\s:]+(\d{4}\/\d+\/\d+)/i,
    /Reference\s*No[\s:]+(\d{4}\/\d+\/\d+)/i,
    /(\d{4}\/\d{6}\/\d{2})/
  ];
  
  for (const pattern of regPatterns) {
    const match = text.match(pattern);
    if (match) {
      landlord.regNo = cleanText(match[1]);
      console.log('📋 Found Landlord Reg No:', landlord.regNo);
      break;
    }
  }
  
  // VAT Number patterns
  const vatPatterns = [
    /VAT\s*(?:No|Number)?[\s:]+(\d{10})/i,
    /Vat\s*No[\s:]+(\d+)/i
  ];
  
  for (const pattern of vatPatterns) {
    const match = text.match(pattern);
    if (match) {
      landlord.vatNo = cleanText(match[1]);
      console.log('📋 Found Landlord VAT No:', landlord.vatNo);
      break;
    }
  }
  
  // Phone patterns
  const phonePatterns = [
    /(?:Telephone|Tel|Phone)[\s:]+(\(?0\d{2}\)?\s*\d{3}\s*\d{4})/i,
    /(?:Telephone|Tel|Phone)[\s:]+(\d[\d\s\-]+)/i,
    /Mobile[\s:]+(\d[\d\s\-]+)/i
  ];
  
  for (const pattern of phonePatterns) {
    const match = text.match(pattern);
    if (match) {
      landlord.phone = cleanText(match[1]);
      break;
    }
  }
  
  return landlord;
}

/**
 * Extract tenant data
 */
function extractTenantData(text, normalizedText) {
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
  
  // Try multiple patterns for tenant name
  const tenantPatterns = [
    /(?:List|Trading)\s*[\/\\]?\s*Trading\s*As[\s\n]+([A-Za-z0-9][A-Za-z0-9\-\.&'\s]*?\s*\((?:Pty|PTY)\)\s*(?:Ltd|LTD))/i,
    /Trading\s*As[\s\n:]+([A-Za-z0-9][A-Za-z0-9\-\.&'\s]*?\s*\((?:Pty|PTY)\)\s*(?:Ltd|LTD))/i,
    /Tenant\s*[\/\\]\s*Lessee[\s\n]+([A-Za-z0-9][A-Za-z0-9\-\.&'\s]*?\s*\((?:Pty|PTY)\)\s*(?:Ltd|LTD))/i,
    /Tenant[\s\n:]+([A-Za-z0-9][A-Za-z0-9\-\.&'\s]*?\s*\((?:Pty|PTY)\)\s*(?:Ltd|LTD))/i,
    /Lessee[\s\n:]+([A-Za-z0-9][A-Za-z0-9\-\.&'\s]*?\s*\((?:Pty|PTY)\)\s*(?:Ltd|LTD))/i,
    // Header pattern - company name at top with ID
    /^([A-Za-z0-9][A-Za-z0-9\-\.&'\s]*?\s*\((?:Pty|PTY)\)\s*(?:Ltd|LTD))\s*\(\d+\)/mi
  ];
  
  for (const pattern of tenantPatterns) {
    const match = text.match(pattern);
    if (match) {
      tenant.name = cleanText(match[1]);
      tenant.tradingAs = tenant.name;
      console.log('👤 Found Tenant:', tenant.name);
      break;
    }
  }
  
  // If tenant not found, look for Exceedprops or similar patterns
  if (!tenant.name) {
    const exceedMatch = text.match(/(Exceedprops[A-Za-z0-9\-\.&'\s]*?\s*\((?:Pty|PTY)\)\s*(?:Ltd|LTD))/i);
    if (exceedMatch) {
      tenant.name = cleanText(exceedMatch[1]);
      tenant.tradingAs = tenant.name;
      console.log('👤 Found Tenant (Exceedprops pattern):', tenant.name);
    }
  }
  
  // Registration Number
  const regPatterns = [
    /Ref\s*No[\s:]+(\d{4}\/\d+\/\d+)/i,
    /Reg(?:istration)?\s*(?:No|Number)?[\s:]+(\d{4}\/\d+\/\d+)/i,
    /Company\s*Reg[\s:]+(\d{4}\/\d+\/\d+)/i
  ];
  
  for (const pattern of regPatterns) {
    const match = text.match(pattern);
    if (match) {
      tenant.regNo = cleanText(match[1]);
      console.log('📋 Found Tenant Reg No:', tenant.regNo);
      break;
    }
  }
  
  // VAT Number
  const vatPatterns = [
    /Vat\s*No[\s:]+(\d{10})/i,
    /VAT[\s:]+(\d{10})/i
  ];
  
  for (const pattern of vatPatterns) {
    const match = text.match(pattern);
    if (match) {
      tenant.vatNo = cleanText(match[1]);
      console.log('📋 Found Tenant VAT No:', tenant.vatNo);
      break;
    }
  }
  
  // Physical Address (Domicile)
  const physicalPatterns = [
    /Domicile[\s\n:]+([A-Za-z0-9][A-Za-z0-9\s,\-\.]+?(?:Park|Street|Road|Lane|Drive|Avenue|Office|Centre|Center|Woodmead|Estate)[A-Za-z0-9\s,\-\.]*)/i,
    /Physical\s*Address[\s\n:]+(.+?)(?=\n|Postal|Email|$)/i,
    /Street\s*Address[\s\n:]+(.+?)(?=\n|Postal|Email|$)/i
  ];
  
  for (const pattern of physicalPatterns) {
    const match = text.match(pattern);
    if (match) {
      tenant.physicalAddress = cleanAddress(match[1]);
      console.log('📍 Found Physical Address:', tenant.physicalAddress);
      break;
    }
  }
  
  // Postal Address
  const postalPatterns = [
    /Postal[\s\n:]+([A-Za-z0-9][A-Za-z0-9\s,\-\.]+?(?:Park|Street|Road|Lane|Drive|Avenue|Office|Centre|Center|Woodmead|Estate|Box)[A-Za-z0-9\s,\-\.]*)/i,
    /Postal\s*Address[\s\n:]+(.+?)(?=\n|Physical|Email|$)/i,
    /P\.?O\.?\s*Box[\s\n:]+(.+?)(?=\n|$)/i
  ];
  
  for (const pattern of postalPatterns) {
    const match = text.match(pattern);
    if (match) {
      tenant.postalAddress = cleanAddress(match[1]);
      console.log('📍 Found Postal Address:', tenant.postalAddress);
      break;
    }
  }
  
  // Email
  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  if (emailMatch) {
    tenant.email = cleanText(emailMatch[1]);
  }
  
  // Bank details
  const bankPatterns = [
    /Bank[\s\n:]+([A-Za-z]+(?:\s+Bank)?)/i,
    /Banking[\s\n]+Bank[\s\n:]+([A-Za-z]+)/i
  ];
  
  for (const pattern of bankPatterns) {
    const match = text.match(pattern);
    if (match && !match[1].toLowerCase().includes('account')) {
      tenant.bankName = cleanText(match[1]);
      break;
    }
  }
  
  // Account Number
  const accountPatterns = [
    /Account\s*(?:No|Number)?[\s:]+(\d{8,15})/i,
    /Acc(?:ount)?\s*No[\s:]+(\d+)/i
  ];
  
  for (const pattern of accountPatterns) {
    const match = text.match(pattern);
    if (match) {
      tenant.bankAccountNumber = cleanText(match[1]);
      break;
    }
  }
  
  // Branch Code
  const branchPatterns = [
    /Branch\s*(?:No|Code)?[\s:]+(\d{5,6})/i,
    /Branch[\s:]+(\d+)/i
  ];
  
  for (const pattern of branchPatterns) {
    const match = text.match(pattern);
    if (match) {
      tenant.bankBranchCode = cleanText(match[1]);
      break;
    }
  }
  
  // Account Name/Holder
  const holderPatterns = [
    /Account\s*Name[\s\n:]+([A-Za-z0-9][A-Za-z0-9\s\(\)\-\.&']+)/i,
    /Account\s*Holder[\s\n:]+([A-Za-z0-9][A-Za-z0-9\s\(\)\-\.&']+)/i
  ];
  
  for (const pattern of holderPatterns) {
    const match = text.match(pattern);
    if (match) {
      tenant.bankAccountHolder = cleanText(match[1]);
      break;
    }
  }
  
  return tenant;
}

/**
 * Extract surety/representative data
 */
function extractSuretyData(text, normalizedText) {
  const surety = {
    name: '',
    idNumber: '',
    address: '',
    capacity: ''
  };
  
  // Representative patterns
  const repPatterns = [
    /(?:Authorised|Authorized)\s*Representative[\s\n:]+([A-Za-z][A-Za-z\s]+?)(?=\s+Capacity|\s+Director|\s+Member|\n|$)/i,
    /Representative[\s\n:]+([A-Za-z][A-Za-z\s]+?)(?=\s+Capacity|\n|$)/i,
    /Surety[\s\n:]+([A-Za-z][A-Za-z\s]+?)(?=\s+ID|\s+Identity|\n|$)/i
  ];
  
  for (const pattern of repPatterns) {
    const match = text.match(pattern);
    if (match) {
      surety.name = cleanText(match[1]);
      break;
    }
  }
  
  // Capacity
  const capacityMatch = text.match(/Capacity[\s\n:]+(\w+)/i);
  if (capacityMatch) {
    surety.capacity = cleanText(capacityMatch[1]);
  }
  
  // ID Number (13 digit SA ID)
  const idMatch = text.match(/(?:ID|Identity)\s*(?:No|Number)?[\s:]+(\d{13})/i);
  if (idMatch) {
    surety.idNumber = cleanText(idMatch[1]);
  }
  
  return surety;
}

/**
 * Extract premises data
 */
function extractPremisesData(text, normalizedText) {
  const premises = {
    unit: '',
    buildingName: '',
    buildingAddress: '',
    size: '',
    percentage: '',
    permittedUse: ''
  };
  
  console.log('🔍 Extracting premises data...');
  
  // Unit patterns
  const unitPatterns = [
    /Unit\s*(?:No)?[\s:]+([A-Za-z0-9][A-Za-z0-9\s\-]+?)(?=\s+\d+\.\d+|\s+Area|\s*\n|$)/i,
    /(?:Erf|ERF|Stand)\s*(\d+)/i,
    /Property[\s\n:]+([A-Za-z0-9][A-Za-z0-9\s,]+?)(?=\s+Stand|\s+Township|\s+Address|\n|$)/i,
    /Unit[\s:]+([^\n]+)/i
  ];
  
  for (const pattern of unitPatterns) {
    const match = text.match(pattern);
    if (match) {
      premises.unit = cleanText(match[1]);
      console.log('🏢 Found Unit:', premises.unit);
      break;
    }
  }
  
  // Building Name patterns
  const buildingPatterns = [
    /(?:Property|Building)[\s\n:]+([A-Za-z0-9][A-Za-z0-9\s,]+?(?:Park|Estate|Centre|Center|Office|Building)[A-Za-z0-9\s,]*)/i,
    /Stand\s*No[\s\n]+Township[\s\n:]+([A-Za-z0-9\s,]+?)(?=\s+Address|\n|$)/i,
    /Township[\s\n:]+([A-Za-z]+)/i
  ];
  
  for (const pattern of buildingPatterns) {
    const match = text.match(pattern);
    if (match) {
      premises.buildingName = cleanText(match[1]);
      console.log('🏢 Found Building:', premises.buildingName);
      break;
    }
  }
  
  // Building Address patterns
  const addressPatterns = [
    /Address[\s\n:]+(\d+[A-Za-z0-9\s,\-\.]+?(?:Park|Street|Road|Lane|Drive|Avenue|Office)[A-Za-z0-9\s,\-\.]*)/i,
    /Physical\s*Address[\s\n:]+(.+?)(?=\n\n|Postal|$)/i,
    /(\d+\s+[A-Za-z]+\s+(?:Street|Road|Lane|Drive|Avenue)[^,\n]*(?:,\s*[A-Za-z\s]+)?)/i
  ];
  
  for (const pattern of addressPatterns) {
    const match = text.match(pattern);
    if (match) {
      premises.buildingAddress = cleanAddress(match[1]);
      console.log('📍 Found Building Address:', premises.buildingAddress);
      break;
    }
  }
  
  // Size (Area in m²) patterns
  const sizePatterns = [
    /\*?\s*Main\s*Unit[\s:]+(\d+\.?\d*)/i,
    /Area[\s:]+(\d+\.?\d*)\s*(?:m²|sqm|m2)?/i,
    /Size[\s:]+(\d+\.?\d*)\s*(?:m²|sqm|m2)?/i,
    /(\d{2,4}\.\d{2})\s*(?:m²|sqm|m2)/i,
    /Unit\s*No[^\n]*?(\d{2,4}\.\d{2})/i
  ];
  
  for (const pattern of sizePatterns) {
    const match = text.match(pattern);
    if (match) {
      premises.size = match[1];
      console.log('📐 Found Size:', premises.size);
      break;
    }
  }
  
  // Percentage
  const percentMatch = text.match(/(\d+\.?\d*)\s*%/);
  if (percentMatch && parseFloat(percentMatch[1]) < 100) {
    premises.percentage = percentMatch[1] + '%';
  }
  
  // Permitted Usage patterns
  const usagePatterns = [
    /Permitted\s*Usage[\s\n:]+([A-Za-z][A-Za-z\s,.&]+?)(?=\n\n|Base\s*Rentals|Recoveries|$)/is,
    /(?:Use|Usage)[\s\n:]+([A-Za-z][A-Za-z\s,.&]+?)(?=\n\n|$)/i,
    /Purpose[\s\n:]+([A-Za-z][A-Za-z\s,.&]+?)(?=\n|$)/i
  ];
  
  for (const pattern of usagePatterns) {
    const match = text.match(pattern);
    if (match) {
      premises.permittedUse = cleanText(match[1]);
      console.log('📋 Found Permitted Use:', premises.permittedUse);
      break;
    }
  }
  
  return premises;
}

/**
 * Extract lease terms
 */
function extractLeaseTerms(text, normalizedText) {
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
  
  // Date formats: DD/MM/YYYY or YYYY-MM-DD
  const datePattern1 = /(\d{2}\/\d{2}\/\d{4})/;
  const datePattern2 = /(\d{4}-\d{2}-\d{2})/;
  
  // Lease Start Date patterns
  const startPatterns = [
    /Lease\s*Starts?[\s\n:]+(\d{2}\/\d{2}\/\d{4})/i,
    /(?:Start|Commencement)\s*Date[\s\n:]+(\d{2}\/\d{2}\/\d{4})/i,
    /(?:Start|Commencement)\s*Date[\s\n:]+(\d{4}-\d{2}-\d{2})/i,
    /From[\s\n:]+(\d{2}\/\d{2}\/\d{4})/i
  ];
  
  for (const pattern of startPatterns) {
    const match = text.match(pattern);
    if (match) {
      lease.commencementDate = convertDateFormat(match[1]);
      console.log('📅 Found Start Date:', lease.commencementDate);
      break;
    }
  }
  
  // Lease End Date patterns
  const endPatterns = [
    /Lease\s*Ends?[\s\n:]+(\d{2}\/\d{2}\/\d{4})/i,
    /(?:End|Termination)\s*Date[\s\n:]+(\d{2}\/\d{2}\/\d{4})/i,
    /(?:End|Termination)\s*Date[\s\n:]+(\d{4}-\d{2}-\d{2})/i,
    /To[\s\n:]+(\d{2}\/\d{2}\/\d{4})/i
  ];
  
  for (const pattern of endPatterns) {
    const match = text.match(pattern);
    if (match) {
      lease.terminationDate = convertDateFormat(match[1]);
      console.log('📅 Found End Date:', lease.terminationDate);
      break;
    }
  }
  
  // Period in Months
  const periodPatterns = [
    /Period\s*(?:in)?\s*Months?[\s\n:]+(\d+)/i,
    /Lease\s*Period[\s\n:]+(\d+)\s*months?/i,
    /Duration[\s\n:]+(\d+)\s*months?/i
  ];
  
  for (const pattern of periodPatterns) {
    const match = text.match(pattern);
    if (match) {
      const totalMonths = parseInt(match[1]);
      lease.years = Math.floor(totalMonths / 12);
      lease.months = totalMonths % 12;
      console.log('📅 Found Period:', totalMonths, 'months');
      break;
    }
  }
  
  // Option Period
  const optionPatterns = [
    /Option\s*Period[\s\n]*\(?(?:in)?\s*months?\)?[\s\n:]+(\d+)/i,
    /Option[\s\n:]+(\d+)\s*months?/i
  ];
  
  for (const pattern of optionPatterns) {
    const match = text.match(pattern);
    if (match) {
      const optionMonths = parseInt(match[1]);
      lease.optionYears = Math.floor(optionMonths / 12);
      lease.optionMonths = optionMonths % 12;
      break;
    }
  }
  
  // Exercise By Date
  const exercisePatterns = [
    /Exercise\s*By[\s\n:]+(\d{2}\/\d{2}\/\d{4})/i,
    /Option\s*Exercise[\s\n:]+(\d{2}\/\d{2}\/\d{4})/i
  ];
  
  for (const pattern of exercisePatterns) {
    const match = text.match(pattern);
    if (match) {
      lease.optionExerciseDate = convertDateFormat(match[1]);
      break;
    }
  }
  
  return lease;
}

/**
 * Extract financial/rental data
 */
function extractFinancialData(text, normalizedText) {
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
  
  // Find rental entries - multiple pattern attempts
  // Pattern 1: From Date | To Date | Amount | Rate | Escalation %
  const rentalPattern1 = /(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+([\d,]+\.?\d*)\s+([\d.]+)\s+([\d.]+)/g;
  
  // Pattern 2: Just amounts with dates
  const rentalPattern2 = /(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+([\d,]+\.?\d*)/g;
  
  // Pattern 3: Basic Rent with amount
  const rentPattern3 = /(?:Basic\s*)?Rent(?:al)?[\s\n:]+R?\s*([\d,]+\.?\d*)/gi;
  
  let match;
  let yearIndex = 1;
  
  // Try pattern 1 first (most complete)
  while ((match = rentalPattern1.exec(text)) !== null && yearIndex <= 5) {
    const fromDate = convertDateFormat(match[1]);
    const toDate = convertDateFormat(match[2]);
    const amount = match[3].replace(/,/g, '');
    const escalation = match[5];
    
    const yearKey = `year${yearIndex}`;
    if (financial[yearKey]) {
      financial[yearKey].basicRent = amount;
      financial[yearKey].from = fromDate;
      financial[yearKey].to = toDate;
      console.log(`📊 Found Year ${yearIndex} Rent:`, amount);
    }
    
    // Get escalation rate from first entry
    if (yearIndex === 1) {
      financial.escalationRate = escalation;
      console.log('📊 Found Escalation Rate:', escalation);
    }
    
    yearIndex++;
  }
  
  // If no results, try pattern 2
  if (yearIndex === 1) {
    while ((match = rentalPattern2.exec(text)) !== null && yearIndex <= 5) {
      const fromDate = convertDateFormat(match[1]);
      const toDate = convertDateFormat(match[2]);
      const amount = match[3].replace(/,/g, '');
      
      const yearKey = `year${yearIndex}`;
      if (financial[yearKey]) {
        financial[yearKey].basicRent = amount;
        financial[yearKey].from = fromDate;
        financial[yearKey].to = toDate;
        console.log(`📊 Found Year ${yearIndex} Rent (pattern 2):`, amount);
      }
      
      yearIndex++;
    }
  }
  
  // If still no results, try simple rent pattern
  if (yearIndex === 1) {
    const rentMatches = text.matchAll(rentPattern3);
    for (const rentMatch of rentMatches) {
      if (yearIndex > 5) break;
      const amount = rentMatch[1].replace(/,/g, '');
      if (parseFloat(amount) > 1000) { // Filter out small numbers
        const yearKey = `year${yearIndex}`;
        if (financial[yearKey]) {
          financial[yearKey].basicRent = amount;
          console.log(`📊 Found Year ${yearIndex} Rent (simple):`, amount);
        }
        yearIndex++;
      }
    }
  }
  
  // Deposit patterns
  const depositPatterns = [
    /Cash\s*Amount\s*Required[\s\n:]+R?\s*([\d,]+\.?\d*)/i,
    /Deposit[\s\n:]+R?\s*([\d,]+\.?\d*)/i,
    /Security\s*Deposit[\s\n:]+R?\s*([\d,]+\.?\d*)/i
  ];
  
  for (const pattern of depositPatterns) {
    const match = text.match(pattern);
    if (match) {
      financial.deposit = match[1].replace(/,/g, '');
      console.log('📊 Found Deposit:', financial.deposit);
      break;
    }
  }
  
  // Lease Fees
  const feePatterns = [
    /Lease\s*Fees?\s*Amount[\s\n:]+R?\s*([\d,]+\.?\d*)/i,
    /Admin(?:istration)?\s*Fee[\s\n:]+R?\s*([\d,]+\.?\d*)/i
  ];
  
  for (const pattern of feePatterns) {
    const match = text.match(pattern);
    if (match) {
      financial.leaseFee = match[1].replace(/,/g, '');
      break;
    }
  }
  
  // Escalation Rate (if not found above)
  if (financial.escalationRate === '6') {
    const escPatterns = [
      /Escalation[\s\n:]+(\d+\.?\d*)\s*%/i,
      /(\d+\.?\d*)\s*%\s*(?:escalation|increase)/i,
      /Annual\s*Increase[\s\n:]+(\d+\.?\d*)\s*%/i
    ];
    
    for (const pattern of escPatterns) {
      const match = text.match(pattern);
      if (match) {
        financial.escalationRate = match[1];
        console.log('📊 Found Escalation Rate:', financial.escalationRate);
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
    .replace(/\n/g, ', ')
    .trim();
}

/**
 * Convert DD/MM/YYYY to YYYY-MM-DD format
 */
function convertDateFormat(dateStr) {
  if (!dateStr) return '';
  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  // Convert from DD/MM/YYYY
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
}

module.exports = { parseLeaseControlPDF };
