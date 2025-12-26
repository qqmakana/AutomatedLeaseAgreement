/**
 * Invoice Parser Service
 * Extracts deposit, utilities, and tenant bank details from invoice PDFs
 * Uses Python pdfplumber (preferred) with JavaScript pdf-parse fallback
 * Optimized regex patterns for both extraction methods
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
 * Parse Invoice PDF and extract relevant data
 * @param {Buffer} pdfBuffer - The PDF file buffer
 * @returns {Object} - Extracted invoice data
 */
async function parseInvoicePDF(pdfBuffer) {
  try {
    console.log('🧾 Parsing Invoice PDF...');
    
    // Extract text (tries Python first, falls back to JavaScript)
    const { text: rawText, method } = await extractTextFromPDF(pdfBuffer);
    const text = normalizeText(rawText);
    console.log('📝 Extracted text length:', text.length, '(using', method, ')');

    // DEBUG: Log first 3000 chars
    console.log('=== RAW INVOICE TEXT (first 3000 chars) ===');
    console.log(text.substring(0, 3000));
    console.log('=== END RAW TEXT ===');

    const extractedData = {
      deposit: extractDeposit(text, method),
      utilities: extractUtilities(text, method),
      tenantBank: extractTenantBankDetails(text, method),
      rent: extractRent(text, method),
      tenant: extractTenantFromInvoice(text, method),
      landlord: extractLandlordFromInvoice(text, method)
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
function extractDeposit(text, method) {
  console.log('💰 Extracting deposit...');
  
  // Multiple patterns for deposit
  const patterns = [
    // Pattern: "Deposit 0.00 0.00 45,000.00" - take the last amount
    /Deposit\s+[\d,]+\.?\d*\s+[\d,]+\.?\d*\s+([\d,]+\.?\d*)/i,
    // Pattern: "Deposit: R 45,000.00"
    /Deposit[:\s]+R?\s*([\d,]+\.?\d*)/i,
    // Pattern: "Bank Guarantee 45000.00"
    /Bank\s+Guarantee[:\s]*([\d,]+\.?\d*)/i,
    // Pattern: "DEPOSIT R45000"
    /DEPOSIT[:\s]*R?\s*([\d,]+\.?\d*)/i,
    // Pattern: "Security Deposit: 45000"
    /Security\s+Deposit[:\s]*([\d,]+\.?\d*)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const value = match[1].replace(/[,\s]/g, '');
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
function extractUtilities(text, method) {
  console.log('💡 Extracting utilities...');
  
  const utilities = {
    electricity: null,
    water: null,
    sewerage: null,
    municipalCharges: null,
    refuse: null
  };

  // Electricity - may have multiple entries, sum them
  // Pattern: "Electricity 1234.56 0.00 1234.56"
  const electricityPatterns = [
    /Electricity\s+([\d,]+\.?\d*)/gi,
    /Elec(?:tric)?\s+Charge[:\s]*([\d,]+\.?\d*)/gi
  ];
  
  let totalElectricity = 0;
  for (const pattern of electricityPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const value = parseFloat(match[1].replace(/,/g, ''));
      if (value > 0) {
        totalElectricity += value;
      }
    }
  }
  if (totalElectricity > 0) {
    utilities.electricity = totalElectricity.toFixed(2);
    console.log('💡 Found Electricity:', utilities.electricity);
  }

  // Water - multiple patterns
  const waterPatterns = [
    /Water\s+([\d,]+\.?\d*)/i,
    /Water\s+Charge[:\s]*([\d,]+\.?\d*)/i
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
    /Sewerage\s+([\d,]+\.?\d*)/i,
    /Sewer(?:age)?\s+Charge[:\s]*([\d,]+\.?\d*)/i
  ];
  
  for (const pattern of seweragePatterns) {
    const match = text.match(pattern);
    if (match) {
      utilities.sewerage = match[1].replace(/,/g, '');
      console.log('🚿 Found Sewerage:', utilities.sewerage);
      break;
    }
  }

  // Municipal Charges (rates)
  const municipalPatterns = [
    /Municipal\s+Charges?\s+([\d,]+\.?\d*)/i,
    /Rates\s+([\d,]+\.?\d*)/i,
    /Municipal[:\s]*([\d,]+\.?\d*)/i
  ];
  
  for (const pattern of municipalPatterns) {
    const match = text.match(pattern);
    if (match) {
      utilities.municipalCharges = match[1].replace(/,/g, '');
      console.log('🏛️ Found Municipal Charges:', utilities.municipalCharges);
      break;
    }
  }

  // Refuse
  const refusePatterns = [
    /Refuse\s+([\d,]+\.?\d*)/i,
    /Refuse\s+Removal[:\s]*([\d,]+\.?\d*)/i
  ];
  
  for (const pattern of refusePatterns) {
    const match = text.match(pattern);
    if (match) {
      utilities.refuse = match[1].replace(/,/g, '');
      console.log('🗑️ Found Refuse:', utilities.refuse);
      break;
    }
  }

  return utilities;
}

/**
 * Extract tenant bank details from invoice (payment section)
 */
function extractTenantBankDetails(text, method) {
  console.log('🏦 Extracting tenant bank details...');
  
  const bankDetails = {
    bankName: null,
    accountNumber: null,
    branchCode: null,
    accountName: null
  };

  // Bank name - multiple patterns
  const bankPatterns = [
    /Bank[:\s]+([A-Za-z]+(?:\s+-\s+[A-Za-z\s]+)?)/i,
    /Bank\s+Name[:\s]+([A-Za-z\s]+)/i,
    /(Nedbank|FNB|ABSA|Standard\s+Bank|Capitec|Investec)/i
  ];
  
  for (const pattern of bankPatterns) {
    const match = text.match(pattern);
    if (match) {
      bankDetails.bankName = match[1].trim();
      console.log('🏦 Found Bank:', bankDetails.bankName);
      break;
    }
  }

  // Account Number - multiple patterns
  const accountPatterns = [
    /Account\s*(?:Number|No)[:\s]*(\d[\d\s]+\d)/i,
    /Acc(?:ount)?\s*No[:\s]*(\d+)/i,
    /Account[:\s]*(\d{8,})/i
  ];
  
  for (const pattern of accountPatterns) {
    const match = text.match(pattern);
    if (match) {
      bankDetails.accountNumber = match[1].replace(/\s/g, '');
      console.log('🏦 Found Account Number:', bankDetails.accountNumber);
      break;
    }
  }

  // Branch Code - multiple patterns
  const branchPatterns = [
    /Branch\s*Code[:\s]*(\d+)/i,
    /Branch\s*No[:\s]*(\d+)/i,
    /Branch[:\s]*(\d{6})/i
  ];
  
  for (const pattern of branchPatterns) {
    const match = text.match(pattern);
    if (match) {
      bankDetails.branchCode = match[1];
      console.log('🏦 Found Branch Code:', bankDetails.branchCode);
      break;
    }
  }

  // Account Name
  const accountNamePatterns = [
    /Account\s*Name[:\s]*([A-Za-z0-9\s\-\(\)]+)/i,
    /Acc\s*Name[:\s]*([A-Za-z0-9\s\-\(\)]+)/i
  ];
  
  for (const pattern of accountNamePatterns) {
    const match = text.match(pattern);
    if (match) {
      bankDetails.accountName = match[1].trim();
      console.log('🏦 Found Account Name:', bankDetails.accountName);
      break;
    }
  }

  return bankDetails;
}

/**
 * Extract rent from invoice
 */
function extractRent(text, method) {
  console.log('💰 Extracting rent...');
  
  const rentPatterns = [
    // Pattern: "Rent 22730.00 0.00 22730.00"
    /Rent\s+([\d,]+\.?\d*)/i,
    // Pattern: "Basic Rent: R22730.00"
    /Basic\s+Rent[:\s]*R?\s*([\d,]+\.?\d*)/i,
    // Pattern: "Monthly Rent 22730"
    /Monthly\s+Rent[:\s]*([\d,]+\.?\d*)/i,
    // Pattern: "Rental: 22730.00"
    /Rental[:\s]*([\d,]+\.?\d*)/i
  ];
  
  for (const pattern of rentPatterns) {
    const match = text.match(pattern);
    if (match) {
      const value = match[1].replace(/,/g, '');
      if (parseFloat(value) > 0) {
        console.log('💰 Found Rent:', value);
        return value;
      }
    }
  }
  
  return null;
}

/**
 * Extract tenant info from invoice
 */
function extractTenantFromInvoice(text, method) {
  console.log('👤 Extracting tenant from invoice...');
  
  const tenant = {
    name: null,
    regNumber: null,
    vatNumber: null
  };

  // Entity/Recipient name - multiple patterns
  const namePatterns = [
    /Recipient[:\s]*([A-Za-z0-9\s\(\)]+(?:Pty|Ltd|PTY|LTD)[\s\w]*)/i,
    /Tenant[:\s]*([A-Za-z0-9\s\(\)]+(?:Pty|Ltd)[\s\w]*)/i,
    /To[:\s]*([A-Za-z0-9\s\(\)]+(?:Pty|Ltd)[\s\w]*)/i
  ];
  
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match) {
      tenant.name = match[1].trim();
      console.log('👤 Found Tenant Name:', tenant.name);
      break;
    }
  }

  // Recipient Reg No
  const regPatterns = [
    /Recipient\s*Reg\s*No[:\s]*([\d\/]+)/i,
    /Reg(?:istration)?\s*No[:\s]*([\d\/]+)/i
  ];
  
  for (const pattern of regPatterns) {
    const match = text.match(pattern);
    if (match) {
      tenant.regNumber = match[1];
      console.log('👤 Found Tenant Reg No:', tenant.regNumber);
      break;
    }
  }

  // Recipient VAT No
  const vatPatterns = [
    /Recipient\s*VAT\s*No[:\s]*(\d+)/i,
    /VAT\s*No[:\s]*(\d+)/i
  ];
  
  for (const pattern of vatPatterns) {
    const match = text.match(pattern);
    if (match) {
      tenant.vatNumber = match[1];
      console.log('👤 Found Tenant VAT No:', tenant.vatNumber);
      break;
    }
  }

  return tenant;
}

/**
 * Extract landlord info from invoice (Entity = the one issuing the invoice)
 * This extracts from the "Tax Invoice & Statement" header section
 */
function extractLandlordFromInvoice(text, method) {
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

  // Entity name (landlord - the one issuing the invoice)
  // Multiple patterns for different formats
  const entityPatterns = [
    /Entity\s+([A-Za-z0-9\s\-\(\)]+?(?:Pty|PTY)\s*(?:Ltd|LTD)?)/i,
    /From[:\s]+([A-Za-z0-9\s\-\(\)]+?(?:Pty|PTY)\s*(?:Ltd|LTD)?)/i,
    /Lessor[:\s]+([A-Za-z0-9\s\-\(\)]+?(?:Pty|PTY)\s*(?:Ltd|LTD)?)/i,
    /(Reflect[A-Za-z0-9\-\s]+?\s*\(Pty\)\s*Ltd)/i  // Specific for Reflect-All
  ];
  
  for (const pattern of entityPatterns) {
    const match = text.match(pattern);
    if (match) {
      landlord.name = match[1].trim();
      console.log('🏠 Found Entity name:', landlord.name);
      break;
    }
  }

  // Entity VAT No
  const vatPatterns = [
    /Entity\s*VAT\s*No\s+(\d+)/i,
    /Vendor\s*VAT\s*No[:\s]*(\d+)/i,
    /VAT\s*Registration[:\s]*(\d+)/i
  ];
  
  for (const pattern of vatPatterns) {
    const match = text.match(pattern);
    if (match) {
      landlord.vatNo = match[1].trim();
      console.log('🏠 Found Entity VAT No:', landlord.vatNo);
      break;
    }
  }

  // Entity Reg No
  const regPatterns = [
    /Entity\s*Reg\s*No\s+([\d\/]+)/i,
    /Registration\s*No[:\s]*([\d\/]+)/i,
    /Company\s*Reg[:\s]*([\d\/]+)/i
  ];
  
  for (const pattern of regPatterns) {
    const match = text.match(pattern);
    if (match) {
      landlord.regNo = match[1].trim();
      console.log('🏠 Found Entity Reg No:', landlord.regNo);
      break;
    }
  }

  // Bank details from "PLEASE NOTE BANK DETAILS" section
  // Pattern: "Bank: Nedbank - Northern Gauteng /  Branch Code: 146905"
  const bankLinePatterns = [
    /Bank[:\s]*([A-Za-z\s\-]+?)(?:\/|\s+)Branch\s*Code[:\s]*(\d+)/i,
    /Bank[:\s]*([A-Za-z]+)/i
  ];
  
  for (const pattern of bankLinePatterns) {
    const match = text.match(pattern);
    if (match) {
      landlord.bank = match[1].trim();
      if (match[2]) {
        landlord.branchCode = match[2].trim();
      }
      console.log('🏠 Found Bank:', landlord.bank);
      break;
    }
  }
  
  // Separate branch code if not found above
  if (!landlord.branchCode) {
    const branchCodeMatch = text.match(/Branch\s*Code[:\s]*(\d+)/i);
    if (branchCodeMatch) {
      landlord.branchCode = branchCodeMatch[1].trim();
      console.log('🏠 Found Branch Code:', landlord.branchCode);
    }
  }

  // Account Name
  const accountNamePatterns = [
    /Account\s*Name[:\s]*([A-Za-z0-9\s\-]+?)(?=\s*Account\s*Number|\s*\n)/i,
    /Account\s*Name[:\s]*([A-Za-z0-9\s\-]+)/i
  ];
  
  for (const pattern of accountNamePatterns) {
    const match = text.match(pattern);
    if (match) {
      // Use account name if entity name wasn't found
      if (!landlord.name) {
        landlord.name = match[1].trim();
        console.log('🏠 Using Account Name as landlord:', landlord.name);
      }
      break;
    }
  }

  // Account Number
  const accountNumPatterns = [
    /Account\s*Number[:\s]*(\d+)/i,
    /Acc\s*No[:\s]*(\d+)/i
  ];
  
  for (const pattern of accountNumPatterns) {
    const match = text.match(pattern);
    if (match) {
      landlord.accountNo = match[1].trim();
      console.log('🏠 Found Account Number:', landlord.accountNo);
      break;
    }
  }

  // Phone
  const phonePatterns = [
    /Tel(?:ephone)?[:\s]+(\d[\d\s\-]+\d)/i,
    /Phone[:\s]+(\d[\d\s\-]+\d)/i
  ];
  
  for (const pattern of phonePatterns) {
    const match = text.match(pattern);
    if (match) {
      landlord.phone = match[1].replace(/\s/g, '');
      console.log('🏠 Found Phone:', landlord.phone);
      break;
    }
  }

  console.log('🏠 Final landlord extracted:', landlord);
  return landlord;
}

module.exports = { parseInvoicePDF };
