const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const { extractTextFromDocument } = require('../services/ocrService');
const { extractWithPythonOCR, isOllamaAvailable } = require('../services/pythonOCRService');

// Process document with OCR
router.post('/extract', authenticateToken, async (req, res) => {
  try {
    const { documentId, documentPath, usePythonOCR, useOllama } = req.body;

    if (!documentPath && !documentId) {
      return res.status(400).json({ error: 'Document path or ID required' });
    }

    let extractedText = '';
    let tenantData = {};

    // Try Python OCR first (better accuracy) if requested and available
    if (usePythonOCR !== false) {
      try {
        // Auto-detect Ollama if not specified
        const ollamaAvailable = useOllama !== undefined ? useOllama : await isOllamaAvailable();
        const pythonResult = await extractWithPythonOCR(documentPath, ollamaAvailable);
        if (pythonResult && pythonResult.success) {
          console.log('✅ Using Python OCR results');
          return res.json({
            success: true,
            extractedText: pythonResult.extractedText,
            tenantData: pythonResult.tenantData,
            method: ollamaAvailable ? 'python-ocr+ollama' : 'python-ocr'
          });
        }
      } catch (pythonErr) {
        console.log('Python OCR failed, falling back to JavaScript OCR:', pythonErr.message);
      }
    }

    // Fallback to JavaScript OCR
    console.log('📄 Using JavaScript OCR (Tesseract.js)...');
    extractedText = await extractTextFromDocument(documentPath);
    tenantData = parseExtractedData(extractedText);

    res.json({
      success: true,
      extractedText: extractedText,
      tenantData: tenantData,
      method: 'javascript-ocr'
    });
  } catch (error) {
    console.error('OCR extraction error:', error);
    res.status(500).json({ error: 'OCR extraction failed', message: error.message });
  }
});

// Helper function to parse extracted text into structured data
function parseExtractedData(text) {
  // Improved parser with better ID number detection
  const data = {
    fullName: extractField(text, [
      /name[:\s]+([A-Z][A-Z\s]+[A-Z])/i,  // All caps names
      /name[:\s]+([A-Z][a-z]+ [A-Z][a-z]+)/i,  // First Last format
      /([A-Z][A-Z\s]{5,})/  // Any all-caps text (likely name)
    ]),
    idNumber: extractField(text, [
      /(?:id|identity|id\s*number)[\s#:]+([0-9]{13})/i,  // Explicit ID label
      /([0-9]{6}[0-9]{7})/,  // 13 digits together
      /([0-9]{6}\s+[0-9]{7})/,  // 13 digits with space
      /([0-9]{2}[0-1][0-9][0-3][0-9][0-9]{7})/  // SA ID format: YYMMDD + 7 digits
    ]),
    email: extractField(text, [
      /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
    ]),
    phone: extractField(text, [
      /(\+27[\s]?[0-9]{2}[\s]?[0-9]{3}[\s]?[0-9]{4})/,  // +27 format
      /(0[0-9]{2}[\s]?[0-9]{3}[\s]?[0-9]{4})/,  // 0XX format
      /([0-9]{10})/  // 10 digits
    ]),
    address: extractField(text, [
      /address[:\s]+(.+?)(?:\n|email|phone|occupation|income)/i,
      /(?:residential|physical)[\s]+address[:\s]+(.+?)(?:\n|email)/i,
      /([0-9]+\s+[A-Za-z\s,]+(?:Street|Road|Avenue|Drive|Lane|Way|Crescent|Close|Place)[^,\n]*(?:,\s*[A-Za-z\s]+)?(?:,\s*[0-9]{4})?)/i
    ]),
    employment: extractField(text, [
      /(?:occupation|employment|job|profession)[:\s]+(.+?)(?:\n|income|employer)/i
    ]),
    income: extractField(text, [
      /(?:income|salary|monthly\s+income)[:\s]+R?\s?([0-9,]+)/i,
      /R\s?([0-9,]+)/  // Any R amount
    ])
  };

  return data;
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

module.exports = router;

