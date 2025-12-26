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
    
    // DEBUG: Log first 2000 chars of extracted text
    console.log('=== RAW PDF TEXT (first 2000 chars) ===');
    console.log(text.substring(0, 2000));
    console.log('=== END RAW TEXT ===');
    
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
    console.log('📊 Extracted landlord:', extractedData.landlord);
    console.log('📊 Extracted tenant:', extractedData.tenant);
    return extractedData;
  } catch (error) {
    console.error('❌ Error parsing Lease Control PDF:', error);
    throw error;
  }
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
  
  console.log('🔍 Searching for Owner/Lessor in text...');
  
  // Pattern: "Owner / Lessor Reflect-All 1025 (Pty) Ltd Earle Marks Director"
  // We need to extract "Reflect-All 1025 (Pty) Ltd"
  
  // First, find all company names in the format "XXX (Pty) Ltd"
  const companyPattern = /([A-Za-z0-9\-\.&'\s]+\s*\(Pty\)\s*Ltd)/gi;
  const allCompanies = text.match(companyPattern) || [];
  console.log('🏢 All companies found:', allCompanies);
  
  // Look for Owner / Lessor section and extract company name
  const ownerSection = text.match(/Owner\s*[\/\\]\s*Lessor\s+(.{5,100})/i);
  if (ownerSection) {
    console.log('📋 Owner section text:', ownerSection[1]);
    // Find the company name pattern within this section
    const companyInOwner = ownerSection[1].match(/([A-Za-z0-9\-\.&'\s]+\s*\(Pty\)\s*Ltd)/i);
    if (companyInOwner) {
      landlord.name = cleanText(companyInOwner[1]);
      console.log('🏠 Found Owner/Lessor:', landlord.name);
    }
  }
  
  // Debug: show context around "Owner" if not found
  if (!landlord.name) {
    const ownerIndex = text.indexOf('Owner');
    if (ownerIndex !== -1) {
      console.log('📋 Context around "Owner":', text.substring(ownerIndex, ownerIndex + 300));
    }
    // Try to find by looking for "Reflect" specifically (common pattern)
    const reflectMatch = text.match(/(Reflect[A-Za-z0-9\-\.&'\s]+\s*\(Pty\)\s*Ltd)/i);
    if (reflectMatch) {
      landlord.name = cleanText(reflectMatch[1]);
      console.log('🏠 Found Owner (Reflect pattern):', landlord.name);
    }
  }
  
  // Owner Registration Number (Entity Reference No)
  const ownerRegMatch = text.match(/Entity Type\s+Company[^R]*Reference No\s+([\d\/]+)/i);
  if (ownerRegMatch) {
    landlord.regNo = cleanText(ownerRegMatch[1]);
  }
  
  // Phone from General Contact
  const phoneMatch = text.match(/Telephone\s+(\d[\d\s]+)/i);
  if (phoneMatch) {
    landlord.phone = cleanText(phoneMatch[1]);
  }
  
  // Mobile (if telephone not found)
  if (!landlord.phone) {
    const mobileMatch = text.match(/Mobile\s+(\d[\d\s]+)/i);
    if (mobileMatch) {
      landlord.phone = cleanText(mobileMatch[1]);
    }
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
  
  console.log('🔍 Searching for Tenant/Lessee in text...');
  
  // Tenant name is often in "List/Trading As" field
  // Pattern: "List/Trading As Exceedprops Management Services (Pty) Ltd Entity..."
  const tradingMatch = text.match(/List[\/\\]Trading As\s+([A-Za-z0-9\-\.&'\s]+\s*\(Pty\)\s*Ltd)/i);
  if (tradingMatch) {
    tenant.name = cleanText(tradingMatch[1]);
    tenant.tradingAs = tenant.name;
    console.log('👤 Found Tenant from Trading As:', tenant.name);
  }
  
  // Also look for tenant name at the top of document (often appears as header)
  // Pattern: "Exceedprops Management Services (Pty) Ltd (11035)"
  if (!tenant.name) {
    const headerMatch = text.match(/^([A-Za-z0-9\-\.&'\s]+\s*\(Pty\)\s*Ltd)\s*\(\d+\)/mi);
    if (headerMatch) {
      tenant.name = cleanText(headerMatch[1]);
      console.log('👤 Found Tenant from header:', tenant.name);
    }
  }
  
  // Try standard Tenant / Lessee pattern
  if (!tenant.name) {
    const tenantSection = text.match(/Tenant\s*[\/\\]\s*Lessee\s*\n?\s*(.{5,200})/i);
    if (tenantSection) {
      console.log('📋 Tenant section text:', tenantSection[1]);
      const companyInTenant = tenantSection[1].match(/([A-Za-z0-9\-\.&'\s]+\s*\(Pty\)\s*Ltd)/i);
      if (companyInTenant) {
        tenant.name = cleanText(companyInTenant[1]);
        console.log('👤 Found Tenant:', tenant.name);
      }
    }
  }
  
  // Debug: show context if not found
  if (!tenant.name) {
    const tradingIndex = text.indexOf('Trading As');
    if (tradingIndex !== -1) {
      console.log('📋 Context around "Trading As":', text.substring(tradingIndex, tradingIndex + 200));
    }
  }
  
  // Registration Number (Ref No) - get the first one which should be tenant's
  const refMatch = text.match(/Ref No\s+([\d\/]+)/i);
  if (refMatch) {
    tenant.regNo = cleanText(refMatch[1]);
    console.log('📋 Found Tenant Reg No:', tenant.regNo);
  }
  
  // VAT Number - get the first one which should be tenant's
  const vatMatch = text.match(/Vat No\s+(\d+)/i);
  if (vatMatch) {
    tenant.vatNo = cleanText(vatMatch[1]);
    console.log('📋 Found Tenant VAT No:', tenant.vatNo);
  }
  
  // Domicile Address (Physical) - more flexible matching
  const domicileMatch = text.match(/Domicile\s+([A-Za-z0-9\s,\-\.]+(?:Park|Street|Road|Lane|Drive|Avenue|Office|Centre|Center|Woodmead)[A-Za-z0-9\s,\-\.]*)/i);
  if (domicileMatch) {
    tenant.physicalAddress = cleanAddress(domicileMatch[1]);
    console.log('📍 Found Physical Address:', tenant.physicalAddress);
  }
  
  // Postal Address - more flexible matching  
  const postalMatch = text.match(/Postal\s+([A-Za-z0-9\s,\-\.]+(?:Park|Street|Road|Lane|Drive|Avenue|Office|Centre|Center|Woodmead)[A-Za-z0-9\s,\-\.]*)/i);
  if (postalMatch) {
    tenant.postalAddress = cleanAddress(postalMatch[1]);
    console.log('📍 Found Postal Address:', tenant.postalAddress);
  }
  
  // Email
  const emailMatch = text.match(/Email\s+([\w.\-@]+@[\w.\-]+)/i);
  if (emailMatch) {
    tenant.email = cleanText(emailMatch[1]);
  }
  
  // Bank details from Banking section
  const bankMatch = text.match(/Banking\s*\n?\s*Bank\s+([A-Za-z]+)/i);
  if (bankMatch) {
    tenant.bankName = cleanText(bankMatch[1]);
  }
  
  // Bank Account Number
  const accountNoMatch = text.match(/Account No\s+(\d+)/i);
  if (accountNoMatch) {
    tenant.bankAccountNumber = cleanText(accountNoMatch[1]);
  }
  
  // Branch Code
  const branchNoMatch = text.match(/Branch No\s+(\d+)/i);
  if (branchNoMatch) {
    tenant.bankBranchCode = cleanText(branchNoMatch[1]);
  }
  
  // Bank Account Name
  const accountNameMatch = text.match(/Account Name\s+([A-Za-z0-9\s\(\)\-\.&']+(?:Pty|PTY)?\s*(?:Ltd|LTD)?)/i);
  if (accountNameMatch) {
    tenant.bankAccountHolder = cleanText(accountNameMatch[1]);
  }
  
  return tenant;
}

/**
 * Extract surety/representative data
 */
function extractSuretyData(text) {
  const surety = {
    name: '',
    idNumber: '',
    address: '',
    capacity: ''
  };
  
  // Authorised Representative
  const repMatch = text.match(/Authorised Representative\s+([A-Za-z\s]+?)(?:\s+Capacity)/i);
  if (repMatch) {
    surety.name = cleanText(repMatch[1]);
  }
  
  // Capacity
  const capacityMatch = text.match(/Capacity\s+(Director|Member|Owner|Partner)/i);
  if (capacityMatch) {
    surety.capacity = cleanText(capacityMatch[1]);
  }
  
  // Get address from tenant physical address as fallback
  const domicileMatch = text.match(/Domicile\s+(.+?)(?=Postal|General Contact)/is);
  if (domicileMatch) {
    surety.address = cleanAddress(domicileMatch[1]);
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
  
  // Unit No - "Unit No Erf 726 417.00" -> extract "Erf 726"
  const unitMatch = text.match(/Unit No\s+([A-Za-z0-9\s]+?)(?=\s+\d+\.\d+|\s+Area|\s+\n)/i);
  if (unitMatch) {
    premises.unit = cleanText(unitMatch[1]);
    console.log('🏢 Found Unit:', premises.unit);
  }
  
  // Alternative: Property name
  if (!premises.unit) {
    const propMatch = text.match(/Property\s+([A-Za-z0-9\s,]+?)(?=\s+Stand|\s+Township|\s+Address|\n)/i);
    if (propMatch) {
      premises.unit = cleanText(propMatch[1]);
      console.log('🏢 Found Unit (from Property):', premises.unit);
    }
  }
  
  // Stand No / Township for Building Name
  const standMatch = text.match(/Stand No\s+Township\s*\n?\s*([A-Za-z0-9\s,]+?)(?=\s+Address|\n)/i);
  if (standMatch) {
    premises.buildingName = cleanText(standMatch[1]);
  }
  
  // Property (Building Name) - "Erf 726, Woodmead"
  if (!premises.buildingName) {
    const buildingMatch = text.match(/Property\s*\n?\s*([A-Za-z0-9\s,]+?(?:Woodmead|Park|Estate|Centre|Center|Office))/i);
    if (buildingMatch) {
      premises.buildingName = cleanText(buildingMatch[1]);
      console.log('🏢 Found Building:', premises.buildingName);
    }
  }
  
  // Address - "22 Stirrup Lane, Woodmead Office Park, Woodmead"
  const addressMatch = text.match(/Address\s*\n?\s*([0-9]+\s+[A-Za-z\s,]+(?:Park|Street|Road|Lane|Drive|Avenue|Office)[A-Za-z0-9\s,]*)/i);
  if (addressMatch) {
    premises.buildingAddress = cleanAddress(addressMatch[1]);
    console.log('📍 Found Building Address:', premises.buildingAddress);
  }
  
  // Area (Size in m²) - look for pattern like "417.00" after Unit info
  // First try Main Unit area
  const mainUnitMatch = text.match(/\*\s*Main Unit\s+(\d+\.?\d*)/i);
  if (mainUnitMatch) {
    premises.size = mainUnitMatch[1];
    console.log('📐 Found Size (Main Unit):', premises.size);
  }
  
  // Alternative: Area column value
  if (!premises.size) {
    const areaMatch = text.match(/Area\s+No of Units[\s\S]*?(\d+\.?\d+)\s*\n/i);
    if (areaMatch) {
      premises.size = areaMatch[1];
      console.log('📐 Found Size (Area):', premises.size);
    }
  }
  
  // Alternative: Look for number after Unit No
  if (!premises.size) {
    const unitAreaMatch = text.match(/Unit No\s+[A-Za-z0-9\s]+\s+(\d+\.?\d+)/i);
    if (unitAreaMatch) {
      premises.size = unitAreaMatch[1];
      console.log('📐 Found Size (after Unit):', premises.size);
    }
  }
  
  // Permitted Usage
  const usageMatch = text.match(/Permitted Usage\s*\n?\s*([A-Za-z\s,.&]+?)(?=\n\n|Base Rentals|Recoveries)/is);
  if (usageMatch) {
    premises.permittedUse = cleanText(usageMatch[1]);
    console.log('📋 Found Permitted Use:', premises.permittedUse);
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
  
  // Lease Starts
  const startMatch = text.match(/Lease Starts\s+(\d{2}\/\d{2}\/\d{4})/i);
  if (startMatch) {
    lease.commencementDate = convertDateFormat(startMatch[1]);
  }
  
  // Lease Ends
  const endMatch = text.match(/Lease Ends\s+(\d{2}\/\d{2}\/\d{4})/i);
  if (endMatch) {
    lease.terminationDate = convertDateFormat(endMatch[1]);
  }
  
  // Period in Months
  const periodMatch = text.match(/Period in Months\s+(\d+)/i);
  if (periodMatch) {
    const totalMonths = parseInt(periodMatch[1]);
    lease.years = Math.floor(totalMonths / 12);
    lease.months = totalMonths % 12;
  }
  
  // Option Period
  const optionPeriodMatch = text.match(/Option Period\s*\(in months\)\s*(\d+)/i);
  if (optionPeriodMatch) {
    const optionMonths = parseInt(optionPeriodMatch[1]);
    lease.optionYears = Math.floor(optionMonths / 12);
    lease.optionMonths = optionMonths % 12;
  }
  
  // Exercise By
  const exerciseMatch = text.match(/Exercise By\s+(\d{2}\/\d{2}\/\d{4})/i);
  if (exerciseMatch) {
    lease.optionExerciseDate = convertDateFormat(exerciseMatch[1]);
  }
  
  return lease;
}

/**
 * Extract financial/rental data
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
  
  // Find all rental entries in the Base Rentals section
  // Pattern: From Date | To Date | Amount | Rate | Escalation %
  const rentalPattern = /(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+([\d,]+\.?\d*)\s+([\d.]+)\s+([\d.]+)/g;
  
  let match;
  let yearIndex = 1;
  
  while ((match = rentalPattern.exec(text)) !== null && yearIndex <= 5) {
    const fromDate = convertDateFormat(match[1]);
    const toDate = convertDateFormat(match[2]);
    const amount = match[3].replace(',', '');
    const escalation = match[5];
    
    const yearKey = `year${yearIndex}`;
    if (financial[yearKey]) {
      financial[yearKey].basicRent = amount;
      financial[yearKey].from = fromDate;
      financial[yearKey].to = toDate;
    }
    
    // Get escalation rate from first entry
    if (yearIndex === 1) {
      financial.escalationRate = escalation;
    }
    
    yearIndex++;
  }
  
  // Cash Deposit
  const depositMatch = text.match(/Cash Amount Required\s+([\d,.]+)/i);
  if (depositMatch) {
    financial.deposit = depositMatch[1].replace(',', '');
  }
  
  // Lease Fees
  const leaseFeesMatch = text.match(/Lease Fees Amount\s+([\d,.]+)/i);
  if (leaseFeesMatch) {
    financial.leaseFee = leaseFeesMatch[1].replace(',', '');
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
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
}

module.exports = { parseLeaseControlPDF };

