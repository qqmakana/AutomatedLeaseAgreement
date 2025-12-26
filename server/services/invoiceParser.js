/**
 * Invoice Parser Service
 * Extracts deposit, utilities, and tenant bank details from invoice PDFs
 * Uses pdf-parse (JavaScript) for reliable PDF text extraction
 */

const pdfParse = require('pdf-parse');

/**
 * Parse Invoice PDF and extract relevant data
 * @param {Buffer} pdfBuffer - The PDF file buffer
 * @returns {Object} - Extracted invoice data
 */
async function parseInvoicePDF(pdfBuffer) {
  try {
    console.log('🧾 Parsing Invoice PDF...');
    
    // Extract text using pdf-parse (JavaScript)
    const data = await pdfParse(pdfBuffer);
    const text = data.text;
    
    console.log('📝 Extracted text length:', text.length);
    
    // DEBUG: Log first 2000 chars
    console.log('=== RAW INVOICE TEXT (first 2000 chars) ===');
    console.log(text.substring(0, 2000));
    console.log('=== END RAW TEXT ===');

    const extractedData = {
      deposit: extractDeposit(text),
      utilities: extractUtilities(text),
      tenantBank: extractTenantBankDetails(text),
      rent: extractRent(text),
      tenant: extractTenantFromInvoice(text),
      landlord: extractLandlordFromInvoice(text)
    };

    console.log('✅ Invoice parsing complete');
    console.log('📋 Extracted:', {
      deposit: extractedData.deposit || 'N/A',
      electricity: extractedData.utilities.electricity || 'N/A',
      water: extractedData.utilities.water || 'N/A',
      sewerage: extractedData.utilities.sewerage || 'N/A',
      rent: extractedData.rent || 'N/A',
      landlordName: extractedData.landlord?.name || 'N/A',
      landlordVat: extractedData.landlord?.vatNo || 'N/A',
      landlordRegNo: extractedData.landlord?.regNo || 'N/A'
    });

    return extractedData;
  } catch (error) {
    console.error('❌ Invoice PDF parsing error:', error);
    throw new Error(`Invoice PDF parsing failed: ${error.message}`);
  }
}

/**
 * Extract deposit amount from invoice
 */
function extractDeposit(text) {
  console.log('🔍 Extracting deposit...');
  
  // Multiple patterns for deposit
  const patterns = [
    /Deposit[\s\n]+[\d,]+\.?\d*[\s\n]+[\d,]+\.?\d*[\s\n]+([\d,]+\.?\d*)/i,
    /Deposit[\s\n:]+R?\s*([\d,]+\.?\d*)/i,
    /Bank\s*Guarantee[\s\n:]+R?\s*([\d,]+\.?\d*)/i,
    /Security\s*Deposit[\s\n:]+R?\s*([\d,]+\.?\d*)/i,
    /DEPOSIT[\s\n:]+R?\s*([\d,]+\.?\d*)/i,
    // Table format: Description Amount
    /Deposit[^\d]*([\d,]+\.?\d{2})/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const value = match[1].replace(/[R,\s]/g, '');
      if (parseFloat(value) > 0) {
        console.log('💰 Found Deposit:', value);
        return value;
      }
    }
  }

  return null;
}

/**
 * Extract utility charges from invoice
 */
function extractUtilities(text) {
  console.log('🔍 Extracting utilities...');
  
  const utilities = {
    electricity: null,
    water: null,
    sewerage: null,
    municipalCharges: null,
    refuse: null
  };

  // Electricity - multiple patterns
  const electricityPatterns = [
    /Electricity[\s\n]+[\d,]+\.?\d*[\s\n]+[\d,]+\.?\d*[\s\n]+([\d,]+\.?\d*)/gi,
    /Electricity[\s\n:]+R?\s*([\d,]+\.?\d*)/gi,
    /Electric(?:ity)?[^\d]*([\d,]+\.?\d{2})/gi
  ];
  
  let totalElectricity = 0;
  for (const pattern of electricityPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const value = parseFloat(match[1].replace(/,/g, ''));
      if (value > 0 && value < 1000000) { // Sanity check
        totalElectricity += value;
      }
    }
    if (totalElectricity > 0) break;
  }
  if (totalElectricity > 0) {
    utilities.electricity = totalElectricity.toFixed(2);
    console.log('⚡ Found Electricity:', utilities.electricity);
  }

  // Water
  const waterPatterns = [
    /Water[\s\n]+[\d,]+\.?\d*[\s\n]+[\d,]+\.?\d*[\s\n]+([\d,]+\.?\d*)/i,
    /Water[\s\n:]+R?\s*([\d,]+\.?\d*)/i,
    /Water[^\d]*([\d,]+\.?\d{2})/i
  ];
  
  for (const pattern of waterPatterns) {
    const match = text.match(pattern);
    if (match) {
      const value = match[1].replace(/,/g, '');
      if (parseFloat(value) > 0) {
        utilities.water = value;
        console.log('💧 Found Water:', utilities.water);
        break;
      }
    }
  }

  // Sewerage
  const seweragePatterns = [
    /Sewerage[\s\n]+[\d,]+\.?\d*[\s\n]+[\d,]+\.?\d*[\s\n]+([\d,]+\.?\d*)/i,
    /Sewerage[\s\n:]+R?\s*([\d,]+\.?\d*)/i,
    /Sewer(?:age)?[^\d]*([\d,]+\.?\d{2})/i
  ];
  
  for (const pattern of seweragePatterns) {
    const match = text.match(pattern);
    if (match) {
      const value = match[1].replace(/,/g, '');
      if (parseFloat(value) > 0) {
        utilities.sewerage = value;
        console.log('🚿 Found Sewerage:', utilities.sewerage);
        break;
      }
    }
  }

  // Municipal Charges (rates)
  const municipalPatterns = [
    /Municipal\s*Charges[\s\n]+[\d,]+\.?\d*[\s\n]+[\d,]+\.?\d*[\s\n]+([\d,]+\.?\d*)/i,
    /Municipal[\s\n:]+R?\s*([\d,]+\.?\d*)/i,
    /Rates[\s\n:]+R?\s*([\d,]+\.?\d*)/i,
    /Municipal[^\d]*([\d,]+\.?\d{2})/i
  ];
  
  for (const pattern of municipalPatterns) {
    const match = text.match(pattern);
    if (match) {
      const value = match[1].replace(/,/g, '');
      if (parseFloat(value) > 0) {
        utilities.municipalCharges = value;
        console.log('🏛️ Found Municipal:', utilities.municipalCharges);
        break;
      }
    }
  }

  // Refuse
  const refusePatterns = [
    /Refuse[\s\n]+[\d,]+\.?\d*[\s\n]+[\d,]+\.?\d*[\s\n]+([\d,]+\.?\d*)/i,
    /Refuse[\s\n:]+R?\s*([\d,]+\.?\d*)/i,
    /Refuse[^\d]*([\d,]+\.?\d{2})/i
  ];
  
  for (const pattern of refusePatterns) {
    const match = text.match(pattern);
    if (match) {
      const value = match[1].replace(/,/g, '');
      if (parseFloat(value) > 0) {
        utilities.refuse = value;
        console.log('🗑️ Found Refuse:', utilities.refuse);
        break;
      }
    }
  }

  return utilities;
}

/**
 * Extract tenant bank details from invoice (payment section)
 */
function extractTenantBankDetails(text) {
  console.log('🔍 Extracting bank details...');
  
  const bankDetails = {
    bankName: null,
    accountNumber: null,
    branchCode: null,
    accountName: null
  };

  // Bank name patterns
  const bankPatterns = [
    /Bank[\s\n:]+([A-Za-z]+(?:\s*-\s*[A-Za-z\s]+)?)/i,
    /(?:Nedbank|FNB|ABSA|Standard Bank|Capitec|Investec)/i
  ];
  
  for (const pattern of bankPatterns) {
    const match = text.match(pattern);
    if (match) {
      const bankName = match[1] || match[0];
      if (!bankName.toLowerCase().includes('account') && !bankName.toLowerCase().includes('number')) {
        bankDetails.bankName = bankName.trim();
        console.log('🏦 Found Bank:', bankDetails.bankName);
        break;
      }
    }
  }

  // Account Number patterns
  const accountPatterns = [
    /Account\s*(?:No|Number)?[\s\n:]+(\d{8,15})/i,
    /Acc(?:ount)?\s*(?:No)?[\s\n:]+(\d{8,15})/i,
    /(?:Account|A\/C)[\s\n:]*(\d{8,15})/i
  ];
  
  for (const pattern of accountPatterns) {
    const match = text.match(pattern);
    if (match) {
      bankDetails.accountNumber = match[1].replace(/\s/g, '');
      console.log('🔢 Found Account Number:', bankDetails.accountNumber);
      break;
    }
  }

  // Branch Code patterns
  const branchPatterns = [
    /Branch\s*Code[\s\n:]+(\d{5,6})/i,
    /Branch[\s\n:]+(\d{5,6})/i,
    /Code[\s\n:]+(\d{6})/i
  ];
  
  for (const pattern of branchPatterns) {
    const match = text.match(pattern);
    if (match) {
      bankDetails.branchCode = match[1];
      console.log('🏦 Found Branch Code:', bankDetails.branchCode);
      break;
    }
  }

  // Account Name patterns
  const namePatterns = [
    /Account\s*Name[\s\n:]+([A-Za-z0-9][A-Za-z0-9\s\-\(\)]+)/i,
    /Account\s*Holder[\s\n:]+([A-Za-z0-9][A-Za-z0-9\s\-\(\)]+)/i,
    /Name[\s\n:]+([A-Za-z0-9][A-Za-z0-9\s\-\(\)]+?(?:Pty|Ltd))/i
  ];
  
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match) {
      bankDetails.accountName = match[1].trim();
      console.log('👤 Found Account Name:', bankDetails.accountName);
      break;
    }
  }

  return bankDetails;
}

/**
 * Extract rent from invoice
 */
function extractRent(text) {
  console.log('🔍 Extracting rent...');
  
  const rentPatterns = [
    /(?:Basic\s*)?Rent(?:al)?[\s\n]+[\d,]+\.?\d*[\s\n]+[\d,]+\.?\d*[\s\n]+([\d,]+\.?\d*)/i,
    /(?:Basic\s*)?Rent(?:al)?[\s\n:]+R?\s*([\d,]+\.?\d*)/i,
    /Monthly\s*Rent(?:al)?[\s\n:]+R?\s*([\d,]+\.?\d*)/i,
    /Rent[^\d]*([\d,]+\.?\d{2})/i
  ];
  
  for (const pattern of rentPatterns) {
    const match = text.match(pattern);
    if (match) {
      const value = match[1].replace(/,/g, '');
      if (parseFloat(value) > 1000) { // Filter small amounts
        console.log('🏠 Found Rent:', value);
        return value;
      }
    }
  }
  
  return null;
}

/**
 * Extract tenant info from invoice
 */
function extractTenantFromInvoice(text) {
  console.log('🔍 Extracting tenant from invoice...');
  
  const tenant = {
    name: null,
    regNumber: null,
    vatNumber: null
  };

  // Recipient/Tenant name patterns
  const namePatterns = [
    /Recipient[\s\n:]+([A-Za-z0-9][A-Za-z0-9\s\(\)]+?(?:Pty|PTY)\s*(?:Ltd|LTD)?)/i,
    /Tenant[\s\n:]+([A-Za-z0-9][A-Za-z0-9\s\(\)]+?(?:Pty|PTY)\s*(?:Ltd|LTD)?)/i,
    /To[\s\n:]+([A-Za-z0-9][A-Za-z0-9\s\(\)]+?(?:Pty|PTY)\s*(?:Ltd|LTD)?)/i,
    /Bill\s*To[\s\n:]+([A-Za-z0-9][A-Za-z0-9\s\(\)]+?(?:Pty|PTY)\s*(?:Ltd|LTD)?)/i
  ];
  
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match) {
      tenant.name = match[1].trim();
      console.log('👤 Found Tenant Name:', tenant.name);
      break;
    }
  }

  // Recipient Reg No patterns
  const regPatterns = [
    /Recipient\s*Reg\s*No[\s\n:]+(\d{4}\/\d+\/\d+)/i,
    /Reg(?:istration)?\s*(?:No|Number)?[\s\n:]+(\d{4}\/\d+\/\d+)/i
  ];
  
  for (const pattern of regPatterns) {
    const match = text.match(pattern);
    if (match) {
      tenant.regNumber = match[1];
      console.log('📋 Found Tenant Reg No:', tenant.regNumber);
      break;
    }
  }

  // VAT Number patterns
  const vatPatterns = [
    /Recipient\s*VAT\s*No[\s\n:]+(\d{10})/i,
    /VAT\s*(?:No|Number)?[\s\n:]+(\d{10})/i
  ];
  
  for (const pattern of vatPatterns) {
    const match = text.match(pattern);
    if (match) {
      tenant.vatNumber = match[1];
      console.log('📋 Found Tenant VAT No:', tenant.vatNumber);
      break;
    }
  }

  return tenant;
}

/**
 * Extract landlord info from invoice (Entity = the one issuing the invoice)
 * This extracts from the "Tax Invoice & Statement" header section
 */
function extractLandlordFromInvoice(text) {
  console.log('🔍 Extracting landlord from invoice...');
  
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

  // Entity name (landlord - the one issuing the invoice)
  const entityPatterns = [
    /Entity[\s\n]+([A-Za-z0-9][A-Za-z0-9\s\-\(\)]+?(?:Pty|PTY)\s*(?:Ltd|LTD)?)/i,
    /From[\s\n:]+([A-Za-z0-9][A-Za-z0-9\s\-\(\)]+?(?:Pty|PTY)\s*(?:Ltd|LTD)?)/i,
    /Issued\s*By[\s\n:]+([A-Za-z0-9][A-Za-z0-9\s\-\(\)]+?(?:Pty|PTY)\s*(?:Ltd|LTD)?)/i
  ];
  
  for (const pattern of entityPatterns) {
    const match = text.match(pattern);
    if (match) {
      landlord.name = match[1].trim();
      console.log('🏠 Found Landlord Name:', landlord.name);
      break;
    }
  }

  // Entity VAT No
  const vatPatterns = [
    /Entity\s*VAT\s*No[\s\n]+(\d{10})/i,
    /VAT\s*(?:No|Number)?[\s\n:]+(\d{10})/i
  ];
  
  for (const pattern of vatPatterns) {
    const match = text.match(pattern);
    if (match) {
      landlord.vatNo = match[1].trim();
      console.log('📋 Found Landlord VAT No:', landlord.vatNo);
      break;
    }
  }

  // Entity Reg No
  const regPatterns = [
    /Entity\s*Reg\s*No[\s\n]+(\d{4}\/\d+\/\d+)/i,
    /Reg(?:istration)?\s*(?:No|Number)?[\s\n:]+(\d{4}\/\d+\/\d+)/i
  ];
  
  for (const pattern of regPatterns) {
    const match = text.match(pattern);
    if (match) {
      landlord.regNo = match[1].trim();
      console.log('📋 Found Landlord Reg No:', landlord.regNo);
      break;
    }
  }

  // Bank details from "PLEASE NOTE BANK DETAILS" section
  const bankLinePatterns = [
    /Bank[\s\n:]+([A-Za-z\s\-]+?)(?:\/|\s+Branch)/i,
    /Bank[\s\n:]+([A-Za-z]+(?:\s*-\s*[A-Za-z\s]+)?)/i,
    /(?:Nedbank|FNB|ABSA|Standard Bank|Capitec|Investec)/i
  ];
  
  for (const pattern of bankLinePatterns) {
    const match = text.match(pattern);
    if (match) {
      const bankName = match[1] || match[0];
      if (!bankName.toLowerCase().includes('account')) {
        landlord.bank = bankName.trim();
        console.log('🏦 Found Landlord Bank:', landlord.bank);
        break;
      }
    }
  }

  // Branch Code
  const branchPatterns = [
    /Branch\s*Code[\s\n:]+(\d{5,6})/i,
    /Branch[\s\n:]+(\d{5,6})/i
  ];
  
  for (const pattern of branchPatterns) {
    const match = text.match(pattern);
    if (match) {
      landlord.branchCode = match[1].trim();
      console.log('🏦 Found Landlord Branch Code:', landlord.branchCode);
      break;
    }
  }

  // Account Number
  const accountPatterns = [
    /Account\s*Number[\s\n:]+(\d{8,15})/i,
    /Account\s*No[\s\n:]+(\d{8,15})/i,
    /Acc(?:ount)?[\s\n:]+(\d{8,15})/i
  ];
  
  for (const pattern of accountPatterns) {
    const match = text.match(pattern);
    if (match) {
      landlord.accountNo = match[1].trim();
      console.log('🔢 Found Landlord Account No:', landlord.accountNo);
      break;
    }
  }

  // Account Name (fallback for landlord name)
  if (!landlord.name) {
    const accountNamePatterns = [
      /Account\s*Name[\s\n:]+([A-Za-z0-9][A-Za-z0-9\s\-]+)/i
    ];
    
    for (const pattern of accountNamePatterns) {
      const match = text.match(pattern);
      if (match) {
        landlord.name = match[1].trim();
        console.log('🏠 Found Landlord from Account Name:', landlord.name);
        break;
      }
    }
  }

  return landlord;
}

module.exports = { parseInvoicePDF };
