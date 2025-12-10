// Client-side OCR using Tesseract.js (works without backend)
import { createWorker } from 'tesseract.js';

// PDF.js will be loaded dynamically to avoid build issues
let pdfjsLib = null;
let workerInitialized = false;

const loadPDFJS = async () => {
  if (!pdfjsLib) {
    try {
      pdfjsLib = await import('pdfjs-dist');
      
      // Configure PDF.js worker - try multiple CDN options
      if (pdfjsLib && !workerInitialized) {
        const version = pdfjsLib.version || '5.4.449';
        
        // Use local worker file (copied to public folder) - most reliable
        const localWorkerPath = '/pdf.worker.min.js';
        
        // Try local worker first, then CDN
        pdfjsLib.GlobalWorkerOptions.workerSrc = localWorkerPath;
        workerInitialized = true;
        console.log('✅ PDF.js worker configured (local):', pdfjsLib.GlobalWorkerOptions.workerSrc);
      }
    } catch (e) {
      console.warn('⚠️ PDF.js not available, PDF files will use OCR fallback:', e);
      return null;
    }
  }
  return pdfjsLib;
};

/**
 * Extract text from PDF file
 */
const extractTextFromPDF = async (file) => {
  try {
    const pdfjs = await loadPDFJS();
    if (!pdfjs) {
      console.log('⚠️ PDF.js not available, falling back to OCR...');
      return null; // PDF.js not available, use OCR fallback
    }
    console.log('📄 Extracting text from PDF...');
    const arrayBuffer = await file.arrayBuffer();
    
    // Try to load PDF with error handling for worker failures
    let pdf;
    try {
      pdf = await pdfjs.getDocument({ 
        data: arrayBuffer,
        useSystemFonts: true,
        verbosity: 0
      }).promise;
    } catch (loadError) {
      // If worker fails, return null to use OCR fallback
      if (loadError.message && (loadError.message.includes('worker') || loadError.message.includes('fetch') || loadError.message.includes('Failed to fetch'))) {
        console.warn('⚠️ PDF worker failed, using OCR fallback:', loadError);
        return null;
      }
      throw loadError;
    }
    
    let fullText = '';
    
    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    console.log('✅ PDF text extraction completed');
    console.log('📄 Extracted text length:', fullText ? fullText.length : 0);
    
    if (!fullText || fullText.trim().length === 0) {
      // If PDF has no text layer, it's likely a scanned PDF - use OCR
      console.log('⚠️ PDF has no text layer, converting to image for OCR...');
      return null; // Return null to trigger OCR fallback
    }
    
    return fullText;
  } catch (error) {
    console.error('❌ PDF extraction error:', error);
    // If PDF extraction fails, try OCR as fallback
    return null;
  }
};

/**
 * Convert PDF page to image for OCR
 */
const pdfPageToImage = async (pdf, pageNum) => {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale: 2.0 });
  
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  
  await page.render({
    canvasContext: context,
    viewport: viewport
  }).promise;
  
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/png');
  });
};

/**
 * Extract text from PDF using OCR (for scanned PDFs)
 */
const extractTextFromPDFWithOCR = async (file) => {
  try {
    const pdfjs = await loadPDFJS();
    if (!pdfjs) {
      throw new Error('PDF.js is not available. Please install pdfjs-dist package.');
    }
    console.log('📄 Converting PDF pages to images for OCR...');
    const arrayBuffer = await file.arrayBuffer();
    
    // Try to load PDF with error handling
    let pdf;
    try {
      pdf = await pdfjs.getDocument({ 
        data: arrayBuffer,
        useSystemFonts: true,
        verbosity: 0
      }).promise;
    } catch (loadError) {
      // If worker fails, throw user-friendly error
      if (loadError.message && (loadError.message.includes('worker') || loadError.message.includes('fetch') || loadError.message.includes('Failed to fetch'))) {
        throw new Error('PDF processing service is temporarily unavailable. Please convert your PDF to a text file (.txt) or image format (PNG/JPG) and upload that instead.');
      }
      throw loadError;
    }
    
    const worker = await createWorker('eng');
    let fullText = '';
    
    // Process each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      console.log(`⏳ Processing page ${pageNum} of ${pdf.numPages}...`);
      const imageBlob = await pdfPageToImage(pdf, pageNum);
      const { data: { text } } = await worker.recognize(imageBlob);
      fullText += text + '\n';
    }
    
    await worker.terminate();
    console.log('✅ PDF OCR extraction completed');
    
    return fullText;
  } catch (error) {
    console.error('❌ PDF OCR error:', error);
    throw error;
  }
};

/**
 * Check if file is a PDF
 */
const isPDF = (file) => {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
};

export const extractTextFromImage = async (file) => {
  if (!file) {
    throw new Error('No file provided for OCR extraction');
  }

  try {
    console.log('🔍 Starting text extraction...');
    console.log('📁 File details:', {
      name: file.name,
      type: file.type,
      size: file.size
    });
    
    // Handle PDF files
    if (isPDF(file)) {
      console.log('📄 Detected PDF file');
      
      try {
        // Try to extract text directly first
        const pdfText = await extractTextFromPDF(file);
        
        if (pdfText && pdfText.trim().length > 0) {
          // PDF has text layer - use extracted text
          console.log('✅ PDF text extracted successfully');
          return pdfText;
        } else {
          // PDF is scanned or has no text layer - use OCR
          console.log('🖼️ PDF has no text layer, using OCR...');
          return await extractTextFromPDFWithOCR(file);
        }
      } catch (pdfError) {
        console.warn('⚠️ PDF extraction failed, using OCR fallback:', pdfError);
        // Fallback to OCR if PDF.js fails completely
        try {
          return await extractTextFromPDFWithOCR(file);
        } catch (ocrError) {
          // Provide helpful error message
          const errorMsg = ocrError.message || 'Unknown error';
          if (errorMsg.includes('worker') || errorMsg.includes('fetch') || errorMsg.includes('Failed to fetch')) {
            throw new Error('PDF processing service is temporarily unavailable. Please convert your PDF to a text file (.txt) or image format (PNG/JPG) and upload that instead.');
          }
          throw new Error(`Unable to process PDF file. Please try converting it to a text file (.txt) or image format (PNG/JPG).`);
        }
      }
    }
    
    // Handle image files with OCR
    console.log('⏳ Creating Tesseract worker...');
    const worker = await createWorker('eng');
    
    console.log('⏳ Processing image with Tesseract...');
    console.log('⏳ This may take 10-30 seconds for the first time...');
    const { data: { text } } = await worker.recognize(file);
    
    await worker.terminate();
    
    console.log('✅ OCR extraction completed');
    console.log('📄 Extracted text length:', text ? text.length : 0);
    console.log('📄 First 500 chars:', text ? text.substring(0, 500) : 'No text');
    
    if (!text || text.trim().length === 0) {
      throw new Error('No text could be extracted from the image. The image might be too blurry or contain no readable text.');
    }
    
    return text;
  } catch (error) {
    console.error('❌ Extraction error:', error);
    console.error('Error message:', error.message);
    
    if (error.message && error.message.includes('Cannot find module')) {
      throw new Error('Required libraries are not installed. Please run: npm install tesseract.js pdfjs-dist and restart the app. For now, you can manually enter your information.');
    }
    
    throw new Error(`Text extraction failed: ${error.message}`);
  }
};

// Extract registration number (format: YYYY/XXXXXX/XX)
function extractRegistrationNumber(text) {
  const regNoPatterns = [
    /(?:registration\s+number|reg\s+no|reg\s+number|company\s+reg|registration\s+no)[:\s#]+([0-9]{4}\/[0-9]{6,8}\/[0-9]{2})/i,
    /([0-9]{4}\/[0-9]{6,8}\/[0-9]{2})/,
    /(?:registration)[:\s]+([0-9]{4}\/[0-9]{6,8}\/[0-9]{2})/i
  ];

  for (const pattern of regNoPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return '';
}

// Extract VAT number (10 digits)
function extractVATNumber(text) {
  const vatPatterns = [
    /(?:vat\s+registration\s+number|vat\s+no|vat\s+number|vat\s+reg|vat\s+registration\s+no)[:\s#]+([0-9]{10})/i,
    /(?:vat)[:\s]+([0-9]{10})/i
  ];

  for (const pattern of vatPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      // Make sure it's not part of an ID number or phone number
      const vatNo = match[1].trim();
      // Exclude if it's part of a 13-digit ID number
      if (match.index !== undefined) {
        const idContext = text.substring(Math.max(0, match.index - 5), Math.min(text.length, match.index + match[0].length + 5));
        if (!idContext.match(/[0-9]{13}/)) {
          return vatNo;
        }
      } else {
        return vatNo;
      }
    }
  }
  return '';
}

// Extract trading as name
function extractTradingAs(text) {
  const tradingAsPatterns = [
    /(?:trading\s+as|trading\s+name|trade\s+name)[:\s]+(.+?)(?:\n|postal|physical|address|registration|vat|reg\s+no)/i,
    /(?:trading)[:\s]+(.+?)(?:\n|postal|physical|address)/i,
    /TRADING\s+AS:\s*(.+?)(?:\n|REGISTRATION|VAT|1\.)/is
  ];

  for (const pattern of tradingAsPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let tradingAs = match[1].trim();
      // Clean up - remove extra whitespace and normalize
      tradingAs = tradingAs.replace(/\s+/g, ' ').trim();
      return tradingAs.toUpperCase();
    }
  }
  return '';
}

// Extract bank account details from FICA documents
function extractBankAccount(text) {
  const bankAccount = {
    bankName: '',
    accountNumber: '',
    branchCode: '',
    accountType: '',
    accountHolder: ''
  };

  // Extract Bank Name (from PART E: BANKING DETAILS section)
  const bankNamePatterns = [
    /PART\s+E[:\s]*BANKING\s+DETAILS[^]*?Bank\s+Name[:\s]+(.+?)(?:\n|Account\s+Type|Account\s+Number)/is,
    /Bank\s+Name[:\s]+(.+?)(?:\n|Account\s+Type|Account\s+Number|Branch\s+Code)/i,
    /bank\s+name[:\s]+(.+?)(?:\n|account\s+type|account\s+number|branch)/i
  ];
  
  for (const pattern of bankNamePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      bankAccount.bankName = match[1].trim();
      console.log('✅ Extracted bank name:', bankAccount.bankName);
      break;
    }
  }

  // Extract Account Number
  const accountNumberPatterns = [
    /Account\s+Number[:\s]+([0-9\s-]+)(?:\n|Branch\s+Code|Account\s+Type|Account\s+Holder)/i,
    /account\s+number[:\s]+([0-9\s-]+)(?:\n|branch|account\s+type|account\s+holder)/i,
    /account\s+no[:\s]+([0-9\s-]+)(?:\n|branch|account\s+type)/i
  ];
  
  for (const pattern of accountNumberPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      bankAccount.accountNumber = match[1].trim().replace(/\s+/g, '');
      console.log('✅ Extracted account number:', bankAccount.accountNumber);
      break;
    }
  }

  // Extract Branch Code
  const branchCodePatterns = [
    /Branch\s+Code[:\s]+([0-9]+)(?:\n|Account|Bank|Account\s+Holder)/i,
    /branch\s+code[:\s]+([0-9]+)(?:\n|account|bank)/i,
    /branch\s+code[:\s]+([0-9\s-]+)(?:\n|account)/i
  ];
  
  for (const pattern of branchCodePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      bankAccount.branchCode = match[1].trim().replace(/\s+/g, '');
      console.log('✅ Extracted branch code:', bankAccount.branchCode);
      break;
    }
  }

  // Extract Account Type
  const accountTypePatterns = [
    /Account\s+Type[:\s]+(.+?)(?:\n|Account\s+Number|Branch\s+Code)/i,
    /account\s+type[:\s]+(.+?)(?:\n|account\s+number|branch)/i
  ];
  
  for (const pattern of accountTypePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      bankAccount.accountType = match[1].trim();
      console.log('✅ Extracted account type:', bankAccount.accountType);
      break;
    }
  }

  // Extract Account Holder
  const accountHolderPatterns = [
    /Account\s+Holder[:\s]+(.+?)(?:\n|PART|SIGNATURE|DIRECTOR)/i,
    /account\s+holder[:\s]+(.+?)(?:\n|PART|SIGNATURE|DIRECTOR)/i
  ];
  
  for (const pattern of accountHolderPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      bankAccount.accountHolder = match[1].trim();
      console.log('✅ Extracted account holder:', bankAccount.accountHolder);
      break;
    }
  }

  return bankAccount;
}

// Extract company name from FICA documents
function extractCompanyName(text) {
  if (!text) return '';
  
  console.log('🔍 Extracting company name from text...');
  
  // Split text into lines for more precise matching
  const lines = text.split('\n');
  
  // Look for "Company Name:" line explicitly (NOT "Bank Name:")
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lowerLine = line.toLowerCase();
    
    // CRITICAL: Skip ANY line that mentions "bank name" 
    if (lowerLine.includes('bank name') || lowerLine.startsWith('bank name')) {
      console.log('⏭️ Skipping bank name line:', line);
      continue;
    }
    
    // Only match lines that start with "Company Name:" (case insensitive, with optional spaces)
    // Pattern: "Company Name:" or "Company Name " followed by the value
    if (lowerLine.startsWith('company name')) {
      // Extract everything after "Company Name:" or "Company Name "
      const match = line.match(/^company\s+name\s*[:\s]+\s*(.+)$/i);
      if (match && match[1]) {
        let companyName = match[1].trim();
        console.log('✅ Found company name candidate:', companyName);
        
        // Exclude bank names from the value itself
        const bankNames = ['standard bank', 'nedbank', 'absa', 'fnb', 'capitec', 'investec', 'first national bank', 'african bank'];
        const lowerName = companyName.toLowerCase();
        if (bankNames.some(bank => lowerName === bank || lowerName.includes(bank))) {
          console.log('❌ Rejected - contains bank name:', companyName);
          continue; // Skip this match, it's a bank name
        }
        
        // Clean up
        companyName = companyName.replace(/\s+/g, ' ').trim();
        companyName = companyName.replace(/[.,]+$/, '').trim();
        
        // Make sure it's valid (not empty, reasonable length)
        if (companyName.length > 2 && companyName.length < 200) {
          console.log('✅ Returning company name:', companyName);
          return companyName;
        }
      }
    }
  }
  
  console.log('⚠️ No company name found');
  return '';
}

// Parse extracted text into structured data
export const parseExtractedData = (text) => {
  if (!text) {
    console.warn('parseExtractedData: No text provided');
    return {};
  }

  try {
    // Extract ID number first (to exclude it from phone matching)
    // Try multiple patterns including signatories section
    let idNumber = extractField(text, [
      /(?:id|identity|id\s*number|id\s*no|south\s+african\s+id)[\s#:]+([0-9]{13})/i,  // Explicit ID label
      /identity\s+number[:\s]+([0-9]{13})/i,  // "Identity Number:"
      /(?:director|signatory|authorized)[^:]*id\s*number[:\s]+([0-9]{13})/i,  // From signatories section
    ]);
    
    // If no ID found with labels, try finding 13-digit numbers in context
    if (!idNumber) {
      const idMatch = text.match(/(?:director|signatory|authorized)[^:]*\n[^:]*\n[^:]*id\s*number[:\s]+([0-9]{13})/i);
      if (idMatch && idMatch[1]) {
        idNumber = idMatch[1].trim();
      }
    }
    
    // Fallback: find any 13-digit number that looks like an ID (not phone, not account number)
    if (!idNumber) {
      const all13Digits = text.match(/\b([0-9]{13})\b/g);
      if (all13Digits) {
        // Filter out phone numbers and account numbers
        for (const candidate of all13Digits) {
          // Check if it's near ID-related keywords
          const context = text.substring(Math.max(0, text.indexOf(candidate) - 50), Math.min(text.length, text.indexOf(candidate) + 50));
          if (context.match(/(?:id|identity|director|signatory)/i) && !context.match(/(?:phone|mobile|account|bank)/i)) {
            idNumber = candidate;
            break;
          }
        }
      }
    }

    // Extract company name (for FICA documents)
    const companyName = extractCompanyName(text);
    
    // Extract bank account details
    const bankAccount = extractBankAccount(text);
    
    const data = {
      fullName: extractFullName(text),
      idNumber: idNumber,
      email: extractEmail(text),
      phone: extractPhoneNumber(text, idNumber),
      address: extractAddress(text),
      employment: extractEmployment(text),
      income: extractIncome(text),
      // Company/Entity fields
      regNo: extractRegistrationNumber(text),
      vatNo: extractVATNumber(text),
      tradingAs: extractTradingAs(text),
      companyName: companyName, // Company name from FICA documents
      // Bank account details
      bankName: bankAccount.bankName,
      bankAccountNumber: bankAccount.accountNumber,
      bankBranchCode: bankAccount.branchCode,
      bankAccountType: bankAccount.accountType,
      bankAccountHolder: bankAccount.accountHolder
    };

    return data;
  } catch (error) {
    console.error('parseExtractedData: Error during extraction:', error);
    // Return empty data structure instead of throwing
    return {
      fullName: '',
      idNumber: '',
      email: '',
      phone: '',
      address: '',
      employment: '',
      income: '',
      regNo: '',
      vatNo: '',
      tradingAs: '',
      companyName: '',
      bankName: '',
      bankAccountNumber: '',
      bankBranchCode: '',
      bankAccountType: '',
      bankAccountHolder: ''
    };
  }
};

// Extract email with better pattern matching
function extractEmail(text) {
  const emailPatterns = [
    /(?:email|e-mail)[\s:]+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
    /email\s+address[:\s]+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/  // Any email format
  ];

  for (const pattern of emailPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return '';
}

// Extract phone number, avoiding ID number matches
function extractPhoneNumber(text, idNumber) {
  // Remove ID number from text to avoid false matches
  let textWithoutId = text;
  if (idNumber) {
    textWithoutId = text.replace(new RegExp(idNumber.replace(/\s/g, '\\s*'), 'g'), '');
  }

  // Try explicit phone labels first (prioritize mobile phone)
  const phonePatterns = [
    /mobile\s+(?:phone|number)[:\s]+(\+?27[\s]?[0-9]{2}[\s]?[0-9]{3}[\s]?[0-9]{4})/i,
    /mobile\s+(?:phone|number)[:\s]+(0[0-9]{2}[\s]?[0-9]{3}[\s]?[0-9]{4})/i,
    /(?:mobile\s+)?phone[:\s]+(\+?27[\s]?[0-9]{2}[\s]?[0-9]{3}[\s]?[0-9]{4})/i,
    /(?:mobile\s+)?phone[:\s]+(0[0-9]{2}[\s]?[0-9]{3}[\s]?[0-9]{4})/i,
    /(?:contact|phone|mobile)[:\s]+(\+?27[\s]?[0-9]{2}[\s]?[0-9]{3}[\s]?[0-9]{4})/i,
    /(?:contact|phone|mobile)[:\s]+(0[0-9]{2}[\s]?[0-9]{3}[\s]?[0-9]{4})/i,
    // General patterns (but avoid 13-digit matches)
    /(\+27[\s]?[0-9]{2}[\s]?[0-9]{3}[\s]?[0-9]{4})/,
    /(0[0-9]{2}[\s]?[0-9]{3}[\s]?[0-9]{4})/,
  ];

  for (const pattern of phonePatterns) {
    const match = textWithoutId.match(pattern);
    if (match && match[1]) {
      const phone = match[1].trim().replace(/\s+/g, ' ');
      // Verify it's not part of an ID number (should be 9-11 digits total)
      const digitsOnly = phone.replace(/\D/g, '');
      if (digitsOnly.length >= 9 && digitsOnly.length <= 11) {
        return phone;
      }
    }
  }
  return '';
}

// Extract multi-line address
function extractAddress(text) {
  // Try to find address section with multi-line format (new format)
  const addressSectionMatch = text.match(/(?:physical|residential)[\s]+address[:\s]*\n((?:[^\n]+\n){2,8})/i);
  if (addressSectionMatch) {
    const addressLines = addressSectionMatch[1]
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.match(/^(same|postal|contact|south\s+africa)$/i))
      .slice(0, 6); // Take up to 6 lines
    
    if (addressLines.length > 0) {
      return addressLines.join(', ');
    }
  }

  // Try old format: "Full Address: ..."
  const fullAddressMatch = text.match(/full\s+address[:\s]+(.+?)(?:\n|part|section|employment|bank)/i);
  if (fullAddressMatch) {
    return fullAddressMatch[1].trim();
  }

  // Try building address from parts (old format)
  const streetMatch = text.match(/street\s+address[:\s]+(.+?)(?:\n|suburb|city|province)/i);
  const suburbMatch = text.match(/suburb[:\s]+(.+?)(?:\n|city|province|postal)/i);
  const cityMatch = text.match(/city[:\s]+(.+?)(?:\n|province|postal|full)/i);
  const provinceMatch = text.match(/province[:\s]+(.+?)(?:\n|postal|full|part)/i);
  const postalMatch = text.match(/postal\s+code[:\s]+(.+?)(?:\n|full|part|section)/i);

  if (streetMatch || suburbMatch || cityMatch) {
    const addressParts = [];
    if (streetMatch) addressParts.push(streetMatch[1].trim());
    if (suburbMatch) addressParts.push(suburbMatch[1].trim());
    if (cityMatch) addressParts.push(cityMatch[1].trim());
    if (provinceMatch) addressParts.push(provinceMatch[1].trim());
    if (postalMatch) addressParts.push(postalMatch[1].trim());
    
    if (addressParts.length > 0) {
      return addressParts.join(', ');
    }
  }

  // Fallback: try single-line address patterns
  const singleLinePatterns = [
    /(?:physical|residential)[\s]+address[:\s]+(.+?)(?:\n|postal|contact|email|phone)/i,
    /address[:\s]+(.+?)(?:\n|email|phone|occupation|income)/i,
    /([0-9]+\s+[A-Za-z\s,]+(?:Street|Road|Avenue|Drive|Lane|Way|Crescent|Close|Place)[^,\n]*(?:,\s*[A-Za-z\s]+)?(?:,\s*[0-9]{4})?)/i
  ];

  for (const pattern of singleLinePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return '';
}

function extractField(text, patterns) {
  if (!Array.isArray(patterns)) {
    patterns = [patterns];
  }
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const value = match[1].trim();
      // Clean up ID numbers (remove spaces)
      if (pattern.source.includes('[0-9]{13}') || pattern.source.includes('[0-9]{6}')) {
        return value.replace(/\s+/g, '');
      }
      return value;
    }
  }
  return '';
}

// Extract full name with better pattern matching
function extractFullName(text) {
  // Split into lines to check context and avoid "Bank Name:"
  const lines = text.split('\n');
  
  const namePatterns = [
    /(?:full\s+)?name[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,  // "Full Name: First Last" format
    /(?:full\s+)?name[:\s]+([A-Z][A-Z\s]{2,}[A-Z])/i,  // All caps names like "JOHN DOE"
    /(?:full\s+)?name[:\s]+([A-Z][A-Z\s]+)/i,  // All caps names (more flexible)
    /surname[:\s]+([A-Z][A-Z\s]+)/i,  // Surname field
    /names?[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,  // Names field
  ];

  // First, try line-by-line matching to exclude "Bank Name:"
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lowerLine = line.toLowerCase();
    
    // CRITICAL: Skip lines with "Bank Name:" 
    if (lowerLine.includes('bank name') || lowerLine.startsWith('bank name')) {
      continue;
    }
    
    // Try each pattern on this line
    for (const pattern of namePatterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        let name = match[1].trim();
        // Exclude bank names
        const bankNames = ['standard bank', 'nedbank', 'absa', 'fnb', 'capitec', 'investec', 'first national bank', 'african bank'];
        const lowerName = name.toLowerCase();
        if (bankNames.some(bank => lowerName.includes(bank))) {
          continue; // Skip bank names
        }
        // Clean up extra spaces
        name = name.replace(/\s+/g, ' ');
        // Remove any trailing text that might have been captured
        name = name.split(/\s+(?:identity|id|number)/i)[0].trim();
        // Capitalize properly if all caps
        if (name === name.toUpperCase() && name.length > 2) {
          name = name.split(' ').map(word => {
            if (word.length > 0) {
              return word.charAt(0) + word.slice(1).toLowerCase();
            }
            return word;
          }).join(' ');
        }
        if (name.length > 2) {
          return name;
        }
      }
    }
  }
  
  // Fallback: try on full text (but still exclude bank names)
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      // Check context - make sure it's not "Bank Name:"
      const matchIndex = text.indexOf(match[0]);
      const contextBefore = text.substring(Math.max(0, matchIndex - 20), matchIndex).toLowerCase();
      if (contextBefore.includes('bank name')) {
        continue; // Skip if it's "Bank Name:"
      }
      
      let name = match[1].trim();
      // Exclude bank names
      const bankNames = ['standard bank', 'nedbank', 'absa', 'fnb', 'capitec', 'investec'];
      const lowerName = name.toLowerCase();
      if (bankNames.some(bank => lowerName.includes(bank))) {
        continue; // Skip bank names
      }
      // Clean up extra spaces
      name = name.replace(/\s+/g, ' ');
      // Remove any trailing text that might have been captured
      name = name.split(/\s+(?:identity|id|number)/i)[0].trim();
      // Capitalize properly if all caps
      if (name === name.toUpperCase() && name.length > 2) {
        name = name.split(' ').map(word => {
          if (word.length > 0) {
            return word.charAt(0) + word.slice(1).toLowerCase();
          }
          return word;
        }).join(' ');
      }
      if (name.length > 2) {
        return name;
      }
    }
  }
  return '';
}

// Extract employment information (position and company)
function extractEmployment(text) {
  // Try to get position/job title
  const positionMatch = text.match(/(?:position|job\s+title)[:\s]+(.+?)(?:\n|employment|income|employer|bank|start|company)/i);
  const companyMatch = text.match(/company\s+name[:\s]+(.+?)(?:\n|position|job|employment|start|employer)/i);
  const employerMatch = text.match(/employer\s+name[:\s]+(.+?)(?:\n|position|job|employment|start|address)/i);
  
  let employment = '';
  
  if (positionMatch && (companyMatch || employerMatch)) {
    const company = (companyMatch || employerMatch)[1].trim();
    employment = `${positionMatch[1].trim()} at ${company}`;
  } else if (positionMatch) {
    employment = positionMatch[1].trim();
  } else if (companyMatch || employerMatch) {
    employment = (companyMatch || employerMatch)[1].trim();
  } else {
    // Fallback to general employment patterns
    const generalMatch = text.match(/(?:employment|occupation|job|profession)[:\s]+(.+?)(?:\n|income|employer|bank|monthly)/i);
    if (generalMatch) {
      employment = generalMatch[1].trim();
    }
  }
  
  return employment;
}

// Extract income with better pattern matching
function extractIncome(text) {
  const incomePatterns = [
    /total\s+gross\s+monthly\s+income[:\s]+R?\s?([0-9,]+(?:\.[0-9]{2})?)/i,
    /(?:total\s+)?(?:gross\s+)?(?:monthly\s+)?income[:\s]+R?\s?([0-9,]+(?:\.[0-9]{2})?)/i,
    /(?:basic\s+)?salary[:\s]+R?\s?([0-9,]+(?:\.[0-9]{2})?)/i,
    /monthly\s+income[:\s]+R\s?([0-9,]+(?:\.[0-9]{2})?)/i,
    // Look for R amounts near "income" or "salary"
    /(?:income|salary)[^:\n]*R\s?([0-9,]+(?:\.[0-9]{2})?)/i,
  ];

  for (const pattern of incomePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let income = match[1].trim();
      // Format as R amount
      if (!income.startsWith('R')) {
        income = `R ${income}`;
      } else if (!income.startsWith('R ')) {
        income = income.replace('R', 'R ');
      }
      return income;
    }
  }
  
  return '';
}

