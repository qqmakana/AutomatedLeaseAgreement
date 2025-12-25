/**
 * Utility Statement Parser Service
 * Extracts electricity, water, sewerage readings from municipal/utility PDFs
 */

const { spawn } = require('child_process');
const path = require('path');

async function parseUtilityStatement(pdfBuffer) {
  return new Promise((resolve, reject) => {
    const pythonScriptPath = path.join(__dirname, 'extract_pdf_text.py');
    const pythonProcess = spawn('python', [pythonScriptPath]);

    let stdout = '';
    let stderr = '';

    pythonProcess.stdin.write(pdfBuffer);
    pythonProcess.stdin.end();

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', async (code) => {
      if (code !== 0) {
        console.error(`Python script exited with code ${code}`);
        console.error(`Python stderr: ${stderr}`);
        return reject(new Error(`PDF parsing failed: ${stderr}`));
      }

      const text = stdout;
      console.log('📄 Parsing Utility Statement PDF...');
      console.log('📝 Extracted text length:', text.length);
      
      // Debug: Log first 2000 characters
      console.log('📋 Text preview:', text.substring(0, 2000));

      const extractedData = extractUtilityData(text);
      
      console.log('✅ Extracted utility data:', extractedData);
      resolve(extractedData);
    });
  });
}

function extractUtilityData(text) {
  const data = {
    electricity: null,
    water: null,
    sewerage: null,
    municipal: null,
    refuse: null,
    rates: null,
    totalDue: null,
    statementDate: null,
    accountNumber: null
  };

  // Normalize text for easier parsing
  const normalizedText = text.replace(/\s+/g, ' ').replace(/,/g, '');

  // ===== ELECTRICITY =====
  // Pattern: "Electricity" followed by amounts (Excl, VAT, Incl)
  // Example: "Electricity 4,475.37 671.31 5,146.68"
  const electricityPatterns = [
    /Electricity\s+(\d+[\d\s]*\.?\d*)\s+(\d+[\d\s]*\.?\d*)\s+(\d+[\d\s]*\.?\d*)/i,
    /Electricity[:\s]+R?\s*(\d+[\d\s]*\.?\d*)/i,
    /Elec(?:tricity)?\s+(?:Charge|Usage)?[:\s]+R?\s*(\d+[\d\s]*\.?\d*)/i,
    /ELECTRICITY\s+(\d+\.?\d*)/i
  ];
  
  for (const pattern of electricityPatterns) {
    const match = normalizedText.match(pattern);
    if (match) {
      // Take the first captured amount (exclusive amount)
      const amount = match[1].replace(/\s/g, '');
      if (parseFloat(amount) > 0) {
        data.electricity = parseFloat(amount).toFixed(2);
        console.log('⚡ Found Electricity:', data.electricity);
        break;
      }
    }
  }

  // ===== WATER =====
  const waterPatterns = [
    /Water\s+(\d+[\d\s]*\.?\d*)\s+(\d+[\d\s]*\.?\d*)\s+(\d+[\d\s]*\.?\d*)/i,
    /Water[:\s]+R?\s*(\d+[\d\s]*\.?\d*)/i,
    /Water\s+(?:Charge|Usage)?[:\s]+R?\s*(\d+[\d\s]*\.?\d*)/i,
    /WATER\s+(\d+\.?\d*)/i
  ];
  
  for (const pattern of waterPatterns) {
    const match = normalizedText.match(pattern);
    if (match) {
      const amount = match[1].replace(/\s/g, '');
      if (parseFloat(amount) > 0) {
        data.water = parseFloat(amount).toFixed(2);
        console.log('💧 Found Water:', data.water);
        break;
      }
    }
  }

  // ===== SEWERAGE =====
  const seweragePatterns = [
    /Sewerage\s+(\d+[\d\s]*\.?\d*)\s+(\d+[\d\s]*\.?\d*)\s+(\d+[\d\s]*\.?\d*)/i,
    /Sewerage[:\s]+R?\s*(\d+[\d\s]*\.?\d*)/i,
    /Sewer(?:age)?\s+(?:Charge)?[:\s]+R?\s*(\d+[\d\s]*\.?\d*)/i,
    /SEWERAGE\s+(\d+\.?\d*)/i
  ];
  
  for (const pattern of seweragePatterns) {
    const match = normalizedText.match(pattern);
    if (match) {
      const amount = match[1].replace(/\s/g, '');
      if (parseFloat(amount) > 0) {
        data.sewerage = parseFloat(amount).toFixed(2);
        console.log('🚿 Found Sewerage:', data.sewerage);
        break;
      }
    }
  }

  // ===== MUNICIPAL CHARGES =====
  const municipalPatterns = [
    /Municipal\s+Charges?\s+(\d+[\d\s]*\.?\d*)\s+(\d+[\d\s]*\.?\d*)\s+(\d+[\d\s]*\.?\d*)/i,
    /Municipal[:\s]+R?\s*(\d+[\d\s]*\.?\d*)/i,
    /Muni(?:cipal)?\s+(?:Charge|Levy)?[:\s]+R?\s*(\d+[\d\s]*\.?\d*)/i
  ];
  
  for (const pattern of municipalPatterns) {
    const match = normalizedText.match(pattern);
    if (match) {
      const amount = match[1].replace(/\s/g, '');
      if (parseFloat(amount) > 0) {
        data.municipal = parseFloat(amount).toFixed(2);
        console.log('🏛️ Found Municipal:', data.municipal);
        break;
      }
    }
  }

  // ===== REFUSE =====
  const refusePatterns = [
    /Refuse\s+(\d+[\d\s]*\.?\d*)\s+(\d+[\d\s]*\.?\d*)\s+(\d+[\d\s]*\.?\d*)/i,
    /Refuse[:\s]+R?\s*(\d+[\d\s]*\.?\d*)/i,
    /Refuse\s+(?:Removal|Collection)?[:\s]+R?\s*(\d+[\d\s]*\.?\d*)/i,
    /REFUSE\s+(\d+\.?\d*)/i
  ];
  
  for (const pattern of refusePatterns) {
    const match = normalizedText.match(pattern);
    if (match) {
      const amount = match[1].replace(/\s/g, '');
      if (parseFloat(amount) > 0) {
        data.refuse = parseFloat(amount).toFixed(2);
        console.log('🗑️ Found Refuse:', data.refuse);
        break;
      }
    }
  }

  // ===== RATES =====
  const ratesPatterns = [
    /Rates?\s+(\d+[\d\s]*\.?\d*)\s+(\d+[\d\s]*\.?\d*)\s+(\d+[\d\s]*\.?\d*)/i,
    /Rates?[:\s]+R?\s*(\d+[\d\s]*\.?\d*)/i,
    /Property\s+Rates?[:\s]+R?\s*(\d+[\d\s]*\.?\d*)/i
  ];
  
  for (const pattern of ratesPatterns) {
    const match = normalizedText.match(pattern);
    if (match) {
      const amount = match[1].replace(/\s/g, '');
      if (parseFloat(amount) > 0) {
        data.rates = parseFloat(amount).toFixed(2);
        console.log('📊 Found Rates:', data.rates);
        break;
      }
    }
  }

  // ===== RENT (if present) =====
  const rentPatterns = [
    /Rent\s+(\d+[\d\s]*\.?\d*)\s+(\d+[\d\s]*\.?\d*)\s+(\d+[\d\s]*\.?\d*)/i,
    /Rent[:\s]+R?\s*(\d+[\d\s]*\.?\d*)/i,
    /Basic\s+Rent[:\s]+R?\s*(\d+[\d\s]*\.?\d*)/i,
    /RENT\s+(\d+\.?\d*)/i
  ];
  
  for (const pattern of rentPatterns) {
    const match = normalizedText.match(pattern);
    if (match) {
      const amount = match[1].replace(/\s/g, '');
      if (parseFloat(amount) > 0) {
        data.rent = parseFloat(amount).toFixed(2);
        console.log('🏠 Found Rent:', data.rent);
        break;
      }
    }
  }

  // ===== TOTAL AMOUNT DUE =====
  const totalPatterns = [
    /Amount\s+Due\s+R?\s*(\d+[\d\s]*\.?\d*)/i,
    /Total\s+Due[:\s]+R?\s*(\d+[\d\s]*\.?\d*)/i,
    /Balance\s+Due[:\s]+R?\s*(\d+[\d\s]*\.?\d*)/i,
    /Total[:\s]+R?\s*(\d+[\d\s]*\.?\d*)/i
  ];
  
  for (const pattern of totalPatterns) {
    const match = normalizedText.match(pattern);
    if (match) {
      const amount = match[1].replace(/\s/g, '');
      if (parseFloat(amount) > 0) {
        data.totalDue = parseFloat(amount).toFixed(2);
        console.log('💰 Found Total Due:', data.totalDue);
        break;
      }
    }
  }

  // ===== STATEMENT DATE =====
  const datePatterns = [
    /Statement\s+(?:Date|Period)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /For\s+(?:the\s+)?Month[:\s]+(\w+\s+\d{4})/i,
    /Invoice\s+Date[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /Date[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      data.statementDate = match[1];
      console.log('📅 Found Statement Date:', data.statementDate);
      break;
    }
  }

  // ===== ACCOUNT NUMBER =====
  const accountPatterns = [
    /Account\s+(?:No|Number|#)[:\s]+(\d+)/i,
    /Acc(?:ount)?[:\s]+(\d+)/i,
    /Customer\s+(?:No|Number)[:\s]+(\d+)/i
  ];
  
  for (const pattern of accountPatterns) {
    const match = text.match(pattern);
    if (match) {
      data.accountNumber = match[1];
      console.log('🔢 Found Account Number:', data.accountNumber);
      break;
    }
  }

  return data;
}

module.exports = { parseUtilityStatement };




