/**
 * Invoice Parser Service
 * Extracts deposit, utilities, and tenant bank details from invoice PDFs
 * Uses Python pdfplumber (preferred) with JavaScript pdf-parse fallback
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
  // Try Python first (better extraction quality)
  try {
    console.log('🧾 Attempting PDF extraction with Python pdfplumber...');
    const text = await extractTextWithPython(pdfBuffer);
    console.log('✅ Python extraction successful');
    return { text, method: 'python' };
  } catch (pythonError) {
    console.log('⚠️ Python extraction failed:', pythonError.message);
    
    // Fall back to JavaScript pdf-parse
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
 * @param {Buffer} pdfBuffer - The PDF file buffer
 * @returns {Object} - Extracted invoice data
 */
async function parseInvoicePDF(pdfBuffer) {
  try {
    console.log('🧾 Parsing Invoice PDF...');
    
    // Extract text (tries Python first, falls back to JavaScript)
    const { text, method } = await extractTextFromPDF(pdfBuffer);
    console.log('📝 Extracted text length:', text.length, '(using', method, ')');

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
  // Look for deposit patterns
  const patterns = [
    /Deposit\s+[\d,]+\.?\d*\s+[\d,]+\.?\d*\s+([\d,]+\.?\d*)/i,
    /Bank Guarantee\s+([\d,]+\.?\d*)/i,
    /Deposit[:\s]*(R?\s*[\d,]+\.?\d*)/i,
    /DEPOSIT[:\s]*(R?\s*[\d,]+\.?\d*)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const value = match[1].replace(/[R,\s]/g, '');
      if (parseFloat(value) > 0) {
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
  const utilities = {
    electricity: null,
    water: null,
    sewerage: null,
    municipalCharges: null,
    refuse: null
  };

  // Electricity - may have multiple entries, sum them
  const electricityMatches = text.matchAll(/Electricity\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/gi);
  let totalElectricity = 0;
  for (const match of electricityMatches) {
    const value = parseFloat(match[1].replace(/,/g, ''));
    if (value > 0) {
      totalElectricity += value;
    }
  }
  if (totalElectricity > 0) {
    utilities.electricity = totalElectricity.toFixed(2);
  }

  // Water
  const waterMatch = text.match(/Water\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/i);
  if (waterMatch) {
    utilities.water = waterMatch[1].replace(/,/g, '');
  }

  // Sewerage
  const sewerageMatch = text.match(/Sewerage\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/i);
  if (sewerageMatch) {
    utilities.sewerage = sewerageMatch[1].replace(/,/g, '');
  }

  // Municipal Charges (rates)
  const municipalMatch = text.match(/Municipal Charges\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/i);
  if (municipalMatch) {
    utilities.municipalCharges = municipalMatch[1].replace(/,/g, '');
  }

  // Refuse
  const refuseMatch = text.match(/Refuse\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/i);
  if (refuseMatch) {
    utilities.refuse = refuseMatch[1].replace(/,/g, '');
  }

  return utilities;
}

/**
 * Extract tenant bank details from invoice (payment section)
 */
function extractTenantBankDetails(text) {
  const bankDetails = {
    bankName: null,
    accountNumber: null,
    branchCode: null,
    accountName: null
  };

  // Bank name
  const bankMatch = text.match(/Bank[:\s]*([A-Za-z]+(?:\s*-\s*[A-Za-z\s]+)?)/i);
  if (bankMatch) {
    bankDetails.bankName = bankMatch[1].trim();
  }

  // Account Number
  const accountMatch = text.match(/Account\s*(?:Number|No)[:\s]*(\d[\d\s]+\d)/i);
  if (accountMatch) {
    bankDetails.accountNumber = accountMatch[1].replace(/\s/g, '');
  }

  // Branch Code
  const branchMatch = text.match(/Branch\s*Code[:\s]*(\d+)/i);
  if (branchMatch) {
    bankDetails.branchCode = branchMatch[1];
  }

  // Account Name
  const accountNameMatch = text.match(/Account\s*Name[:\s]*([A-Za-z0-9\s\-\(\)]+)/i);
  if (accountNameMatch) {
    bankDetails.accountName = accountNameMatch[1].trim();
  }

  return bankDetails;
}

/**
 * Extract rent from invoice
 */
function extractRent(text) {
  const rentMatch = text.match(/Rent\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/i);
  if (rentMatch) {
    return rentMatch[1].replace(/,/g, '');
  }
  return null;
}

/**
 * Extract tenant info from invoice
 */
function extractTenantFromInvoice(text) {
  const tenant = {
    name: null,
    regNumber: null,
    vatNumber: null
  };

  // Entity name (recipient)
  const entityMatch = text.match(/Recipient[:\s]*([A-Za-z0-9\s\(\)]+(?:Pty|Ltd|PTY|LTD)[\s\w]*)/i);
  if (entityMatch) {
    tenant.name = entityMatch[1].trim();
  }

  // Recipient Reg No
  const regMatch = text.match(/Recipient\s*Reg\s*No[:\s]*([\d\/]+)/i);
  if (regMatch) {
    tenant.regNumber = regMatch[1];
  }

  // Recipient VAT No
  const vatMatch = text.match(/Recipient\s*VAT\s*No[:\s]*(\d+)/i);
  if (vatMatch) {
    tenant.vatNumber = vatMatch[1];
  }

  return tenant;
}

/**
 * Extract landlord info from invoice (Entity = the one issuing the invoice)
 * This extracts from the "Tax Invoice & Statement" header section
 */
function extractLandlordFromInvoice(text) {
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

  console.log('🏠 Extracting landlord from invoice...');
  
  // Debug: Log first 2000 chars to see structure
  console.log('📝 Invoice text sample:', text.substring(0, 2000));

  // Entity name (landlord - the one issuing the invoice)
  // Pattern: "Entity    Reflect-All 1025 (Pty) Ltd"
  const entityMatch = text.match(/Entity\s+([A-Za-z0-9\s\-\(\)]+(?:Pty|PTY)\s*(?:Ltd|LTD)?)/i);
  if (entityMatch) {
    landlord.name = entityMatch[1].trim();
    console.log('✅ Found Entity name:', landlord.name);
  }

  // Entity VAT No: "Entity VAT No    4410191920"
  const entityVatMatch = text.match(/Entity\s*VAT\s*No\s+(\d+)/i);
  if (entityVatMatch) {
    landlord.vatNo = entityVatMatch[1].trim();
    console.log('✅ Found Entity VAT No:', landlord.vatNo);
  }

  // Entity Reg No: "Entity Reg No    2016/348963/07"
  const entityRegMatch = text.match(/Entity\s*Reg\s*No\s+([\d\/]+)/i);
  if (entityRegMatch) {
    landlord.regNo = entityRegMatch[1].trim();
    console.log('✅ Found Entity Reg No:', landlord.regNo);
  }

  // Bank details from "PLEASE NOTE BANK DETAILS" section
  // Pattern: "Bank: Nedbank - Northern Gauteng /  Branch Code: 146905"
  const bankLineMatch = text.match(/Bank[:\s]*([A-Za-z\s\-]+)(?:\/|\s+)Branch\s*Code[:\s]*(\d+)/i);
  if (bankLineMatch) {
    landlord.bank = bankLineMatch[1].trim();
    landlord.branchCode = bankLineMatch[2].trim();
    console.log('✅ Found Bank:', landlord.bank, 'Branch Code:', landlord.branchCode);
  } else {
    // Try separate patterns
    const bankMatch = text.match(/Bank[:\s]*([A-Za-z\s\-]+?)(?:\s*\/|\s+Branch)/i);
    if (bankMatch) {
      landlord.bank = bankMatch[1].trim();
      console.log('✅ Found Bank (alt):', landlord.bank);
    }
    
    const branchCodeMatch = text.match(/Branch\s*Code[:\s]*(\d+)/i);
    if (branchCodeMatch) {
      landlord.branchCode = branchCodeMatch[1].trim();
      console.log('✅ Found Branch Code (alt):', landlord.branchCode);
    }
  }

  // Account Name: "Account Name: Reflect-All 1025"
  const accountNameMatch = text.match(/Account\s*Name[:\s]*([A-Za-z0-9\s\-]+)/i);
  if (accountNameMatch) {
    // Use account name if entity name wasn't found
    if (!landlord.name) {
      landlord.name = accountNameMatch[1].trim();
      console.log('✅ Using Account Name as landlord:', landlord.name);
    }
  }

  // Account Number: "Account Number: 1050761243"
  const accountNumMatch = text.match(/Account\s*Number[:\s]*(\d+)/i);
  if (accountNumMatch) {
    landlord.accountNo = accountNumMatch[1].trim();
    console.log('✅ Found Account Number:', landlord.accountNo);
  }

  console.log('🏠 Final landlord extracted:', landlord);
  return landlord;
}

module.exports = { parseInvoicePDF };
