// Document parsers for CIPC and ID documents
import { extractTextFromImage } from './clientOCR';

/**
 * Parse CIPC document text to extract company information
 */
export const parseCIPCDocument = (text) => {
  if (!text) return {};

  const data = {
    name: '',
    regNo: '',
    vatNo: '',
    tradingAs: '',
    postalAddress: '',
    physicalAddress: ''
  };

  // Extract company name - try multiple patterns
  const namePatterns = [
    /(?:company\s+name|entity\s+name|registered\s+name)[:\s]+(.+?)(?:\n|registration|reg\s+no|vat)/i,
    /(?:name\s+of\s+company|name\s+of\s+entity)[:\s]+(.+?)(?:\n|registration|reg\s+no)/i,
    /^([A-Z][A-Z\s&()]+(?:PTY|LTD|CC|PROPRIETARY|LIMITED|CLOSE\s+CORPORATION))(?:\n|$)/im,
    /([A-Z][A-Z\s&()]+(?:PTY|LTD|CC|PROPRIETARY|LIMITED|CLOSE\s+CORPORATION))/i
  ];

  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      data.name = match[1].trim().toUpperCase();
      break;
    }
  }

  // Extract registration number (format: YYYY/XXXXXX/XX)
  const regNoPatterns = [
    /(?:registration\s+number|reg\s+no|reg\s+number|company\s+reg)[:\s#]+([0-9]{4}\/[0-9]{6,8}\/[0-9]{2})/i,
    /([0-9]{4}\/[0-9]{6,8}\/[0-9]{2})/,
    /(?:registration)[:\s]+([0-9]{4}\/[0-9]{6,8}\/[0-9]{2})/i
  ];

  for (const pattern of regNoPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      data.regNo = match[1].trim();
      break;
    }
  }

  // Extract VAT number (10 digits)
  const vatPatterns = [
    /(?:vat\s+registration\s+number|vat\s+no|vat\s+number|vat\s+reg)[:\s#]+([0-9]{10})/i,
    /(?:vat)[:\s]+([0-9]{10})/i,
    /([0-9]{10})(?=\s|$|\n)/ // 10 consecutive digits
  ];

  for (const pattern of vatPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      data.vatNo = match[1].trim();
      break;
    }
  }

  // Extract trading as name
  const tradingAsPatterns = [
    /(?:trading\s+as|trading\s+name|trade\s+name)[:\s]+(.+?)(?:\n|postal|physical|address|registration)/i,
    /(?:trading)[:\s]+(.+?)(?:\n|postal|physical)/i
  ];

  for (const pattern of tradingAsPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      data.tradingAs = match[1].trim().toUpperCase();
      break;
    }
  }

  // Extract postal address (multi-line)
  const postalAddressMatch = text.match(/(?:postal\s+address|postal)[:\s]*\n((?:[^\n]+\n){2,6})/i);
  if (postalAddressMatch) {
    const addressLines = postalAddressMatch[1]
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.match(/^(same|physical|contact|south\s+africa)$/i))
      .slice(0, 6);
    if (addressLines.length > 0) {
      data.postalAddress = addressLines.join(', ');
    }
  }

  // Extract physical address (multi-line)
  const physicalAddressMatch = text.match(/(?:physical\s+address|physical)[:\s]*\n((?:[^\n]+\n){2,6})/i);
  if (physicalAddressMatch) {
    const addressLines = physicalAddressMatch[1]
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.match(/^(same|postal|contact|south\s+africa)$/i))
      .slice(0, 6);
    if (addressLines.length > 0) {
      data.physicalAddress = addressLines.join(', ');
    }
  }

  // If trading as is empty, use company name
  if (!data.tradingAs && data.name) {
    data.tradingAs = data.name;
  }

  // Validate CIPC document - check if it's actually a CIPC document
  const isValidCIPC = () => {
    // Must have at least registration number OR company name
    const hasRegNo = data.regNo && data.regNo.match(/^\d{4}\/\d{6,8}\/\d{2}$/);
    const hasCompanyName = data.name && data.name.length > 3;
    
    // Check if text contains CIPC-related keywords
    const cipcKeywords = /(cipc|companies\s+and\s+intellectual\s+property|certificate\s+of\s+incorporation|registration\s+certificate)/i;
    const hasCIPCKeywords = cipcKeywords.test(text);
    
    // Valid if: (has reg number OR company name) AND (has CIPC keywords OR has reg number)
    return (hasRegNo || hasCompanyName) && (hasCIPCKeywords || hasRegNo);
  };

  // Add validation flag
  data.isValidCIPC = isValidCIPC();

  return data;
};

/**
 * Parse ID document text to extract personal information
 */
export const parseIDDocument = (text) => {
  if (!text) return {};

  const data = {
    name: '',
    idNumber: '',
    address: ''
  };

  // Extract name - try multiple patterns
  const namePatterns = [
    /(?:full\s+name|name|surname)[:\s]+([A-Z][A-Z\s]{2,}[A-Z])/i,
    /(?:full\s+name|name)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
    /^([A-Z][A-Z\s]{2,}[A-Z])(?:\n|$)/m
  ];

  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let name = match[1].trim();
      // Clean up extra spaces
      name = name.replace(/\s+/g, ' ');
      // Capitalize properly if all caps
      if (name === name.toUpperCase() && name.length > 2) {
        name = name.split(' ').map(word => {
          if (word.length > 0) {
            return word.charAt(0) + word.slice(1).toLowerCase();
          }
          return word;
        }).join(' ');
      }
      data.name = name.toUpperCase();
      break;
    }
  }

  // Extract ID number (13 digits)
  const idPatterns = [
    /(?:id\s+number|identity\s+number|id\s+no)[:\s#]+([0-9]{13})/i,
    /([0-9]{13})(?=\s|$|\n)/ // 13 consecutive digits
  ];

  for (const pattern of idPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      data.idNumber = match[1].trim();
      break;
    }
  }

  // Extract address (multi-line)
  const addressMatch = text.match(/(?:address|residential\s+address|physical\s+address)[:\s]*\n((?:[^\n]+\n){2,6})/i);
  if (addressMatch) {
    const addressLines = addressMatch[1]
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.match(/^(same|postal|contact|south\s+africa)$/i))
      .slice(0, 6);
    if (addressLines.length > 0) {
      data.address = addressLines.join(', ');
    }
  }

  return data;
};

/**
 * Read text from a text file directly (without OCR)
 */
const readTextFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      resolve(e.target.result);
    };
    
    reader.onerror = (e) => {
      reject(new Error('Failed to read text file'));
    };
    
    reader.readAsText(file);
  });
};

/**
 * Check if file is a text file
 */
const isTextFile = (file) => {
  const textExtensions = ['.txt', '.text'];
  const fileName = file.name.toLowerCase();
  return textExtensions.some(ext => fileName.endsWith(ext)) || 
         file.type === 'text/plain' ||
         file.type.startsWith('text/');
};

/**
 * Process uploaded document file with OCR and parsing
 */
export const processDocument = async (file, documentType) => {
  if (!file) {
    throw new Error('No file provided');
  }

  try {
    let extractedText = '';
    
    // Check if it's a text file - read directly without OCR
    if (isTextFile(file)) {
      console.log('📄 Reading text file directly (no OCR needed)...');
      extractedText = await readTextFile(file);
      console.log('✅ Text file read successfully');
    } else {
      // Use OCR for images and PDFs
      console.log('🖼️ Using OCR for image/PDF file...');
      extractedText = await extractTextFromImage(file);
    }
    
    // Parse based on document type
    let parsedData = {};
    if (documentType === 'cipc') {
      parsedData = parseCIPCDocument(extractedText);
    } else if (documentType === 'id') {
      parsedData = parseIDDocument(extractedText);
    }

    return {
      success: true,
      extractedText,
      parsedData
    };
  } catch (error) {
    console.error(`Error processing ${documentType} document:`, error);
    throw error;
  }
};


