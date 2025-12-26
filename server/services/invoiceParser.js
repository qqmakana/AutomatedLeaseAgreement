/**
 * Invoice Parser Service
 * Extracts deposit, utilities, and tenant bank details from invoice PDFs
 * Uses Python pdfplumber (preferred) with JavaScript pdf-parse fallback
 * Robust extraction with aggressive pattern matching
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
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
    const tempFile = path.join(os.tmpdir(), `invoice_${Date.now()}.pdf`);
    fs.writeFileSync(tempFile, pdfBuffer);
    
    const pythonScript = `
import pdfplumber
import sys

try:
    pdf = pdfplumber.open(sys.argv[1])
    text = '\\n'.join([page.extract_text() or '' for page in pdf.pages])
    pdf.close()
    print(text)
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
    console.log('🧾 Attempting PDF extraction with Python pdfplumber...');
    const text = await extractTextWithPython(pdfBuffer);
    console.log('✅ Python extraction successful');
    return { text, method: 'python' };
  } catch (pythonError) {
    console.log('⚠️ Python extraction failed:', pythonError.message);
    
    try {
      console.log('🧾 Falling back to JavaScript pdf-parse...');
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
 * Parse Invoice PDF and extract relevant data
 */
async function parseInvoicePDF(pdfBuffer) {
  try {
    console.log('🧾 Parsing Invoice PDF...');
    
    const { text, method } = await extractTextFromPDF(pdfBuffer);
    console.log('📝 Extracted text length:', text.length, '(using', method, ')');

    // Log full text for debugging
    console.log('=== FULL INVOICE TEXT ===');
    console.log(text);
    console.log('=== END FULL TEXT ===');

    const extractedData = {
      deposit: extractDeposit(text),
      utilities: extractUtilities(text),
      tenantBank: extractTenantBankDetails(text),
      rent: extractRent(text),
      tenant: extractTenantFromInvoice(text),
      landlord: extractLandlordFromInvoice(text)
    };

    console.log('✅ Invoice parsing complete');
    console.log('📊 FINAL EXTRACTED DATA:', JSON.stringify(extractedData, null, 2));

    return extractedData;
  } catch (error) {
    console.error('❌ Invoice PDF parsing error:', error);
    throw new Error(`Invoice PDF parsing failed: ${error.message}`);
  }
}

/**
 * Find all monetary amounts in text
 */
function findAllAmounts(text) {
  const amounts = [];
  const pattern = /([\d,]+\.?\d*)/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const value = parseFloat(match[1].replace(/,/g, ''));
    if (value > 0) {
      amounts.push({ value: value, str: match[1].replace(/,/g, ''), index: match.index });
    }
  }
  return amounts;
}

/**
 * Extract deposit amount from invoice
 */
function extractDeposit(text) {
  console.log('💰 Extracting deposit...');
  
  // Look for deposit patterns
  const patterns = [
    /Deposit[^\d]*([\d,]+\.?\d*)[^\d]*([\d,]+\.?\d*)[^\d]*([\d,]+\.?\d*)/i,  // Deposit with 3 numbers, take last
    /Deposit[:\s]*([\d,]+\.?\d*)/i,
    /Bank\s*Guarantee[:\s]*([\d,]+\.?\d*)/i,
    /Security\s*Deposit[:\s]*([\d,]+\.?\d*)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Get the last captured group (usually the total)
      let value = match[match.length - 1] || match[1];
      value = value.replace(/,/g, '');
      if (parseFloat(value) > 100) {
        console.log('💰 Found Deposit:', value);
        return value;
      }
    }
  }

  // If not found, look for large amounts near "Deposit" keyword
  const depositIndex = text.toLowerCase().indexOf('deposit');
  if (depositIndex >= 0) {
    const nearbyText = text.substring(depositIndex, depositIndex + 200);
    const amounts = findAllAmounts(nearbyText);
    const largeAmounts = amounts.filter(a => a.value > 1000);
    if (largeAmounts.length > 0) {
      // Take the last one (usually the total)
      const deposit = largeAmounts[largeAmounts.length - 1].str;
      console.log('💰 Found Deposit (nearby):', deposit);
      return deposit;
    }
  }

  return null;
}

/**
 * Extract utility charges from invoice
 */
function extractUtilities(text) {
  console.log('💡 Extracting utilities...');
  
  const utilities = {
    electricity: null,
    water: null,
    sewerage: null,
    municipalCharges: null,
    refuse: null
  };

  // Helper to find amount near keyword
  const findAmountNear = (keyword) => {
    const pattern = new RegExp(keyword + '[^\\d]*(\\d[\\d,]*\\.?\\d*)', 'i');
    const match = text.match(pattern);
    if (match) {
      const value = match[1].replace(/,/g, '');
      if (parseFloat(value) > 0) {
        return value;
      }
    }
    return null;
  };

  // Electricity - may have multiple, sum them
  const electricityMatches = text.matchAll(/Electricity[^\d]*([\d,]+\.?\d*)/gi);
  let totalElectricity = 0;
  for (const match of electricityMatches) {
    const value = parseFloat(match[1].replace(/,/g, ''));
    if (value > 0) {
      totalElectricity += value;
    }
  }
  if (totalElectricity > 0) {
    utilities.electricity = totalElectricity.toFixed(2);
    console.log('💡 Electricity:', utilities.electricity);
  }

  // Water
  utilities.water = findAmountNear('Water');
  if (utilities.water) console.log('💧 Water:', utilities.water);

  // Sewerage
  utilities.sewerage = findAmountNear('Sewer');
  if (utilities.sewerage) console.log('🚿 Sewerage:', utilities.sewerage);

  // Municipal Charges / Rates
  utilities.municipalCharges = findAmountNear('Municipal') || findAmountNear('Rates');
  if (utilities.municipalCharges) console.log('🏛️ Municipal:', utilities.municipalCharges);

  // Refuse
  utilities.refuse = findAmountNear('Refuse');
  if (utilities.refuse) console.log('🗑️ Refuse:', utilities.refuse);

  return utilities;
}

/**
 * Extract tenant bank details from invoice
 */
function extractTenantBankDetails(text) {
  console.log('🏦 Extracting bank details...');
  
  const bankDetails = {
    bankName: null,
    accountNumber: null,
    branchCode: null,
    accountName: null
  };

  // Bank name - look for known SA banks
  const bankNames = ['Nedbank', 'FNB', 'ABSA', 'Standard Bank', 'Capitec', 'Investec', 'First National'];
  for (const bank of bankNames) {
    if (text.toLowerCase().includes(bank.toLowerCase())) {
      bankDetails.bankName = bank;
      console.log('🏦 Bank:', bankDetails.bankName);
      break;
    }
  }

  // Also try generic pattern
  if (!bankDetails.bankName) {
    const bankMatch = text.match(/Bank[:\s]+([A-Za-z\s\-]+?)(?:\s+Branch|\s+Account|\n|$)/i);
    if (bankMatch) {
      bankDetails.bankName = bankMatch[1].trim();
      console.log('🏦 Bank (pattern):', bankDetails.bankName);
    }
  }

  // Account Number - look for 8+ digit numbers
  const accountMatch = text.match(/Account\s*(?:Number|No)?[:\s]*(\d{8,})/i);
  if (accountMatch) {
    bankDetails.accountNumber = accountMatch[1];
    console.log('🏦 Account Number:', bankDetails.accountNumber);
  }

  // Branch Code - 6 digit number
  const branchMatch = text.match(/Branch\s*(?:Code|No)?[:\s]*(\d{6})/i);
  if (branchMatch) {
    bankDetails.branchCode = branchMatch[1];
    console.log('🏦 Branch Code:', bankDetails.branchCode);
  }

  // Account Name
  const accountNameMatch = text.match(/Account\s*Name[:\s]+([A-Za-z0-9\s\-\(\)]+?)(?:\n|Account|Branch)/i);
  if (accountNameMatch) {
    bankDetails.accountName = accountNameMatch[1].trim();
    console.log('🏦 Account Name:', bankDetails.accountName);
  }

  return bankDetails;
}

/**
 * Extract rent from invoice
 */
function extractRent(text) {
  console.log('💰 Extracting rent...');
  
  // Look for rent patterns
  const patterns = [
    /(?:Basic\s*)?Rent[al]?[^\d]*([\d,]+\.?\d*)/i,
    /Monthly\s*Rent[:\s]*([\d,]+\.?\d*)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const value = match[1].replace(/,/g, '');
      if (parseFloat(value) > 100) {
        console.log('💰 Rent:', value);
        return value;
      }
    }
  }
  
  return null;
}

/**
 * Find all (Pty) Ltd company names in text
 */
function findAllCompanies(text) {
  const companies = [];
  const pattern = /([A-Za-z0-9][\w\s\-\.&']+?)\s*\(Pty\)\s*Ltd/gi;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const fullName = match[0].trim();
    if (!companies.includes(fullName) && fullName.length > 5) {
      companies.push(fullName);
    }
  }
  return companies;
}

/**
 * Extract tenant info from invoice
 */
function extractTenantFromInvoice(text) {
  console.log('👤 Extracting tenant from invoice...');
  
  const tenant = {
    name: null,
    regNumber: null,
    vatNumber: null
  };

  // Look for Recipient
  const recipientMatch = text.match(/Recipient[:\s]+([A-Za-z0-9\s\(\)\-\.&']+?(?:Pty|Ltd)[^\n]*)/i);
  if (recipientMatch) {
    tenant.name = recipientMatch[1].trim();
    console.log('👤 Tenant name:', tenant.name);
  }

  // Reg number
  const regMatch = text.match(/Recipient\s*Reg\s*No[:\s]*([\d\/]+)/i);
  if (regMatch) {
    tenant.regNumber = regMatch[1];
    console.log('👤 Tenant Reg No:', tenant.regNumber);
  }

  // VAT number
  const vatMatch = text.match(/Recipient\s*VAT\s*No[:\s]*(\d+)/i);
  if (vatMatch) {
    tenant.vatNumber = vatMatch[1];
    console.log('👤 Tenant VAT No:', tenant.vatNumber);
  }

  return tenant;
}

/**
 * Extract landlord info from invoice
 */
function extractLandlordFromInvoice(text) {
  console.log('🏠 Extracting landlord from invoice...');
  
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

  // Find all companies
  const companies = findAllCompanies(text);
  console.log('🏢 Companies found:', companies);

  // Entity is usually the landlord (issuer of invoice)
  const entityMatch = text.match(/Entity[:\s]+([A-Za-z0-9\s\-\(\)]+?(?:Pty|PTY)\s*(?:Ltd|LTD)?)/i);
  if (entityMatch) {
    landlord.name = entityMatch[1].trim();
    console.log('🏠 Landlord (Entity):', landlord.name);
  }

  // If Entity not found, look for the first company or Reflect-All pattern
  if (!landlord.name) {
    const reflectMatch = text.match(/Reflect[\-\s]?All[\s\d]+\s*\(Pty\)\s*Ltd/i);
    if (reflectMatch) {
      landlord.name = reflectMatch[0].trim();
      console.log('🏠 Landlord (Reflect):', landlord.name);
    } else if (companies.length > 0) {
      landlord.name = companies[0];
      console.log('🏠 Landlord (first company):', landlord.name);
    }
  }

  // Entity VAT No
  const vatMatch = text.match(/Entity\s*VAT\s*No[:\s]*(\d+)/i);
  if (vatMatch) {
    landlord.vatNo = vatMatch[1];
    console.log('🏠 VAT No:', landlord.vatNo);
  }

  // Entity Reg No
  const regMatch = text.match(/Entity\s*Reg\s*No[:\s]*([\d\/]+)/i);
  if (regMatch) {
    landlord.regNo = regMatch[1];
    console.log('🏠 Reg No:', landlord.regNo);
  }

  // Bank details
  const bankNames = ['Nedbank', 'FNB', 'ABSA', 'Standard Bank', 'Capitec', 'Investec'];
  for (const bank of bankNames) {
    if (text.includes(bank)) {
      landlord.bank = bank;
      console.log('🏠 Bank:', landlord.bank);
      break;
    }
  }

  // Branch Code
  const branchCodeMatch = text.match(/Branch\s*Code[:\s]*(\d+)/i);
  if (branchCodeMatch) {
    landlord.branchCode = branchCodeMatch[1];
    console.log('🏠 Branch Code:', landlord.branchCode);
  }

  // Account Number
  const accountNumMatch = text.match(/Account\s*Number[:\s]*(\d+)/i);
  if (accountNumMatch) {
    landlord.accountNo = accountNumMatch[1];
    console.log('🏠 Account Number:', landlord.accountNo);
  }

  // Phone
  const phoneMatch = text.match(/(?:Tel|Phone)[:\s]*(\d[\d\s\-\(\)]+)/i);
  if (phoneMatch) {
    landlord.phone = phoneMatch[1].trim();
    console.log('🏠 Phone:', landlord.phone);
  }

  return landlord;
}

module.exports = { parseInvoicePDF };
