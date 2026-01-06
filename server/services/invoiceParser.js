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
      landlord: extractLandlordFromInvoice(text),
      premises: extractPremisesFromInvoice(text)  // Also extract premises from invoice
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
 * Extract premises/building info from invoice
 */
function extractPremisesFromInvoice(text) {
  console.log('🏢 Extracting premises from invoice...');
  
  const premises = {
    buildingName: null,
    buildingAddress: null,
    unit: null
  };
  
  // Look for "Office Park" or similar
  const parkMatch = text.match(/([A-Za-z]+\s+(?:Office|Business|Industrial)\s+Park)/i);
  if (parkMatch) {
    premises.buildingName = parkMatch[1];
    console.log('🏢 Building Name:', premises.buildingName);
  }
  
  // Look for street address (e.g., "22 Stirrup Lane")
  const streetMatch = text.match(/(\d+\s+[A-Za-z]+\s+(?:Lane|Street|Road|Avenue|Drive))/i);
  if (streetMatch) {
    premises.buildingAddress = streetMatch[1];
    console.log('🏢 Building Address:', premises.buildingAddress);
  }
  
  // Look for Erf/Property
  const erfMatch = text.match(/(?:Property|Unit\s*No)\s*(Erf\s+\d+)/i);
  if (erfMatch) {
    premises.unit = erfMatch[1];
    console.log('🏢 Unit:', premises.unit);
  }
  
  return premises;
}

/**
 * Extract deposit amount from invoice
 */
function extractDeposit(text) {
  console.log('💰 Extracting deposit...');
  
  // Look for Cash Deposit or Bank Guarantee with actual amount
  // Pattern: "Deposit ... amount amount amount" where last is total
  const depositPatterns = [
    // Cash deposit with line item format
    /(?:Cash\s*)?Deposit\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/i,
    // Bank Guarantee amount
    /Bank\s*Guarantee\s*Required?\s*([\d,]+\.?\d*)/i,
    /Bank\s*Guarantee\s+([\d,]+\.?\d*)/i,
    // Deposit section with amount
    /Deposit\s*\n\s*([\d,]+\.?\d*)/i
  ];

  for (const pattern of depositPatterns) {
    const match = text.match(pattern);
    if (match) {
      // Get the last captured group (usually the total)
      let value = match[match.length - 1] || match[1];
      value = value.replace(/,/g, '');
      const numValue = parseFloat(value);
      // Must be a reasonable deposit amount (more than 1000, not a reference number)
      if (numValue > 1000 && numValue < 1000000) {
        console.log('💰 Found Deposit:', value);
        return value;
      }
    }
  }

  // If no deposit found, check if it's explicitly 0
  const zeroDeposit = text.match(/(?:Cash\s*Amount|Deposit|Bank\s*Guarantee)[^\d]*0\.00/i);
  if (zeroDeposit) {
    console.log('💰 Deposit is 0');
    return '0.00';
  }

  console.log('💰 No deposit found');
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

  // Extract electricity - may have multiple entries, take the positive total
  const electricityMatches = [...text.matchAll(/Electricity\s+([\d,]+\.?\d*)/gi)];
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

  // Water - take first positive value
  const waterMatches = [...text.matchAll(/Water\s+([\d,]+\.?\d*)/gi)];
  for (const match of waterMatches) {
    const value = parseFloat(match[1].replace(/,/g, ''));
    if (value > 0) {
      utilities.water = value.toFixed(2);
      console.log('💧 Water:', utilities.water);
      break;
    }
  }

  // Sewerage
  const sewerageMatches = [...text.matchAll(/Sewerage\s+([\d,]+\.?\d*)/gi)];
  for (const match of sewerageMatches) {
    const value = parseFloat(match[1].replace(/,/g, ''));
    if (value > 0) {
      utilities.sewerage = value.toFixed(2);
      console.log('🚿 Sewerage:', utilities.sewerage);
      break;
    }
  }

  // Municipal Charges
  const municipalMatch = text.match(/Municipal\s*Charges?\s+([\d,]+\.?\d*)/i);
  if (municipalMatch) {
    const value = parseFloat(municipalMatch[1].replace(/,/g, ''));
    if (value > 0) {
      utilities.municipalCharges = value.toFixed(2);
      console.log('🏛️ Municipal:', utilities.municipalCharges);
    }
  }

  // Refuse
  const refuseMatch = text.match(/Refuse\s+([\d,]+\.?\d*)/i);
  if (refuseMatch) {
    const value = parseFloat(refuseMatch[1].replace(/,/g, ''));
    if (value > 0) {
      utilities.refuse = value.toFixed(2);
      console.log('🗑️ Refuse:', utilities.refuse);
    }
  }

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

  // Look for bank details section (usually at bottom of invoice)
  const bankSection = text.match(/PLEASE\s*NOTE\s*BANK\s*DETAILS[\s\S]*?(?:email|$)/i);
  const searchText = bankSection ? bankSection[0] : text;

  // Bank name - look for known SA banks first
  const bankNames = ['Nedbank', 'FNB', 'ABSA', 'Standard Bank', 'Capitec', 'Investec', 'First National Bank'];
  for (const bank of bankNames) {
    if (searchText.includes(bank)) {
      bankDetails.bankName = bank;
      console.log('🏦 Bank:', bankDetails.bankName);
      break;
    }
  }

  // Account Number - 10+ digits
  const accountMatch = searchText.match(/Account\s*(?:Number|No)?[:\s]*(\d{10,})/i);
  if (accountMatch) {
    bankDetails.accountNumber = accountMatch[1];
    console.log('🏦 Account Number:', bankDetails.accountNumber);
  }

  // Branch Code - 6 digits, often after "Branch Code:"
  const branchMatch = searchText.match(/Branch\s*Code[:\s]*(\d{6})/i);
  if (branchMatch) {
    bankDetails.branchCode = branchMatch[1];
    console.log('🏦 Branch Code:', bankDetails.branchCode);
  }

  // Account Name
  const accountNameMatch = searchText.match(/Account\s*Name[:\s]*([A-Za-z0-9\s\-]+?)(?=\s*Account|\s*\n|$)/i);
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
  
  // Look for Rent line item - take positive value
  const rentMatches = [...text.matchAll(/Rent\s+([\d,]+\.?\d*)/gi)];
  
  for (const match of rentMatches) {
    const value = parseFloat(match[1].replace(/,/g, ''));
    if (value > 1000) {  // Must be reasonable rent amount
      console.log('💰 Rent:', value.toFixed(2));
      return value.toFixed(2);
    }
  }
  
  // Also try "Basic Rent" or "Monthly Rent"
  const basicRentMatch = text.match(/(?:Basic|Monthly)\s*Rent[:\s]*([\d,]+\.?\d*)/i);
  if (basicRentMatch) {
    const value = parseFloat(basicRentMatch[1].replace(/,/g, ''));
    if (value > 1000) {
      console.log('💰 Rent (Basic/Monthly):', value.toFixed(2));
      return value.toFixed(2);
    }
  }
  
  return null;
}

/**
 * Extract tenant info from invoice
 */
function extractTenantFromInvoice(text) {
  console.log('👤 Extracting tenant from invoice...');
  
  const tenant = {
    name: null,
    regNo: null,
    vatNo: null
  };

  // Look for Recipient Reg No
  const regMatch = text.match(/Recipient\s*Reg\s*No\s*([\d\/]+)/i);
  if (regMatch) {
    tenant.regNo = regMatch[1];
    console.log('👤 Tenant Reg No:', tenant.regNo);
  }

  // Prefer explicit "Tenant / Debtor" line for tenant name (covers non-(Pty) Ltd like ABSA Bank Limited)
  const debtorMatch = text.match(/Tenant\s*\/\s*Debtor\s+([^\n]+)/i);
  if (debtorMatch) {
    tenant.name = debtorMatch[1].trim();
    console.log('👤 Tenant Name (Tenant/Debtor):', tenant.name);
  }

  // Look for Recipient VAT No - pdf-parse puts values in unusual places
  // The pattern in this PDF is:
  // 2016/348963/07 (Entity Reg)
  // 4060152289 (Recipient VAT - appears here!)
  // Entity Reg No
  // Recipient Reg No
  // 1995/008835/07 (Recipient Reg)
  // Recipient VAT No
  
  // First, extract the Entity VAT from the text (so we can exclude it)
  const entityVatMatch = text.match(/Entity\s*VAT\s*No\s*(\d{10})/i);
  const entityVat = entityVatMatch ? entityVatMatch[1] : null;
  console.log('👤 Entity VAT (to exclude):', entityVat);
  
  // Find all 10-digit numbers (VAT numbers)
  const allVatNumbers = text.match(/\d{10}/g) || [];
  console.log('👤 All 10-digit numbers found:', allVatNumbers);
  
  // Filter out the Entity VAT and account numbers (account numbers are usually after "Account")
  const accountNumberMatch = text.match(/Account\s*(?:Number|No)?[:\s]*(\d{10})/i);
  const accountNumber = accountNumberMatch ? accountNumberMatch[1] : null;
  
  const recipientVatCandidates = allVatNumbers.filter(v => 
    v !== entityVat && v !== accountNumber
  );
  console.log('👤 Recipient VAT candidates:', recipientVatCandidates);
  
  if (recipientVatCandidates.length > 0) {
    // Take the first one that's not the entity VAT
    tenant.vatNo = recipientVatCandidates[0];
    console.log('👤 Tenant VAT No:', tenant.vatNo);
  }
  
  // Also try explicit patterns
  if (!tenant.vatNo) {
    const vatPatterns = [
      /Recipient\s*VAT\s*No\s*(\d{10})/i,
      /(\d{10})\s*[\n\s]*(?:Entity\s*Reg|Recipient)/i  // VAT before Entity Reg or Recipient
    ];
    
    for (const pattern of vatPatterns) {
      const vatMatch = text.match(pattern);
      if (vatMatch && vatMatch[1] !== entityVat) {
        tenant.vatNo = vatMatch[1];
        console.log('👤 Tenant VAT No (pattern):', tenant.vatNo);
        break;
      }
    }
  }

  // Look for tenant name - company with (Pty) Ltd or Limited/Ltd
  const companyPattern = /([A-Za-z][\w\s\-\.&']+?\s+(?:\(Pty\)\s*Ltd|Limited|Ltd))/gi;
  const isLikelyLandlord = (name) => {
    const lower = name.toLowerCase();
    return lower.includes('stand 278') || lower.includes('exceedprops') || lower.includes('entity ');
  };
  const companies = [];
  let match;
  while (!tenant.name && (match = companyPattern.exec(text)) !== null) {
    let name = match[0].trim();
    name = name.replace(/^.*?\n/, '');
    if (!name.toLowerCase().includes('reflect') && !isLikelyLandlord(name)) {
      companies.push(name);
    }
  }
  
  if (companies.length > 0 && !tenant.name) {
    tenant.name = companies[0];
    console.log('👤 Tenant Name:', tenant.name);
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

  // Entity name (the issuer of the invoice is the landlord)
  const entityMatch = text.match(/Entity\s*\n?\s*([A-Za-z][\w\s\-\.&']+?\s*\(Pty\)\s*Ltd)/i);
  if (entityMatch) {
    landlord.name = entityMatch[1].trim();
    console.log('🏠 Landlord (Entity):', landlord.name);
  }
  
  // Also look for Reflect-All pattern
  if (!landlord.name) {
    const reflectMatch = text.match(/Reflect[\-\s]?All\s*\d*\s*\(Pty\)\s*Ltd/i);
    if (reflectMatch) {
      landlord.name = reflectMatch[0].trim();
      console.log('🏠 Landlord (Reflect):', landlord.name);
    }
  }

  // Entity VAT No
  const vatMatch = text.match(/Entity\s*VAT\s*No\s*(\d+)/i);
  if (vatMatch) {
    landlord.vatNo = vatMatch[1];
    console.log('🏠 VAT No:', landlord.vatNo);
  }

  // Entity Reg No - number may appear before or after the label in pdf-parse
  const regPatterns = [
    /Entity\s*Reg\s*No\s*([\d\/]+)/i,  // Label then number
    /([\d]{4}\/[\d]+\/[\d]+)\s*[\n\s]*(?:[\d]+\s*)?Entity\s*Reg\s*No/i,  // Number before label
    /Entity\s*Reg\s*No[\s\S]{0,20}?([\d]{4}\/[\d]+\/[\d]+)/i  // Label with number nearby
  ];
  
  for (const pattern of regPatterns) {
    const regMatch = text.match(pattern);
    if (regMatch) {
      landlord.regNo = regMatch[1];
      console.log('🏠 Reg No:', landlord.regNo);
      break;
    }
  }
  
  // If still not found, look for registration numbers and take the one for Entity (usually first)
  if (!landlord.regNo) {
    const allRegNos = text.match(/\d{4}\/\d{5,}\/\d{2}/g) || [];
    // Find the one near "Entity" 
    const entityIndex = text.toLowerCase().indexOf('entity reg');
    if (entityIndex >= 0 && allRegNos.length > 0) {
      // Look for reg number within 100 chars before Entity Reg
      const textBefore = text.substring(Math.max(0, entityIndex - 100), entityIndex);
      for (const regNo of allRegNos) {
        if (textBefore.includes(regNo)) {
          landlord.regNo = regNo;
          console.log('🏠 Reg No (nearby):', landlord.regNo);
          break;
        }
      }
    }
  }

  // Bank details from "PLEASE NOTE BANK DETAILS" section
  const bankNames = ['Nedbank', 'FNB', 'ABSA', 'Standard Bank', 'Capitec', 'Investec'];
  for (const bank of bankNames) {
    if (text.includes(bank)) {
      landlord.bank = bank;
      console.log('🏠 Bank:', landlord.bank);
      break;
    }
  }

  // Branch Code
  const branchCodeMatch = text.match(/Branch\s*Code[:\s]*(\d{6})/i);
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
  const phoneMatch = text.match(/Tel[:\s]*(\d[\d\s]+\d)/i);
  if (phoneMatch) {
    landlord.phone = phoneMatch[1].replace(/\s+/g, ' ').trim();
    console.log('🏠 Phone:', landlord.phone);
  }

  return landlord;
}

module.exports = { parseInvoicePDF };
