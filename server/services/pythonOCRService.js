const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');

const execAsync = promisify(exec);

/**
 * Check if Python OCR service is available
 */
async function isPythonOCRAvailable() {
  try {
    const pythonScript = path.join(__dirname, '../../python-ocr/ocr_service.py');
    await fs.access(pythonScript);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if Ollama is available and running
 */
async function isOllamaAvailable() {
  try {
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const response = await axios.get(`${ollamaUrl}/api/tags`, { timeout: 2000 });
    
    // Check if llama3 model is available
    if (response.status === 200) {
      const models = response.data.models || [];
      const hasLlama3 = models.some(m => m.name && m.name.includes('llama3'));
      if (hasLlama3) {
        console.log('🤖 Ollama detected with Llama 3 model!');
        return true;
      } else {
        console.log('⚠️ Ollama detected but Llama 3 model not found. Run: ollama pull llama3');
        return false;
      }
    }
    return false;
  } catch (error) {
    console.log('⚠️ Ollama not available:', error.message);
    return false;
  }
}

/**
 * Extract text and parse data using Python OCR service (better accuracy)
 * Falls back to JavaScript OCR if Python service unavailable
 */
async function extractWithPythonOCR(filePath, useOllama = null) {
  const pythonAvailable = await isPythonOCRAvailable();
  
  if (!pythonAvailable) {
    console.log('⚠️ Python OCR service not available, using JavaScript OCR');
    return null;
  }

  // Auto-detect Ollama if not specified
  if (useOllama === null) {
    useOllama = await isOllamaAvailable();
    if (useOllama) {
      console.log('🤖 Ollama detected! Using AI-powered parsing...');
    }
  }

  try {
    const pythonScript = path.join(__dirname, '../../python-ocr/ocr_service.py');
    const ollamaFlag = useOllama ? '--use-ollama' : '';
    
    console.log(`🐍 Using Python OCR service${useOllama ? ' + Ollama AI' : ''}...`);
    
    const { stdout, stderr } = await execAsync(
      `python "${pythonScript}" "${filePath}" ${ollamaFlag}`,
      { maxBuffer: 10 * 1024 * 1024 } // 10MB buffer
    );

    if (stderr && !stderr.includes('Ollama not available')) {
      console.warn('Python OCR warnings:', stderr);
    }

    const result = JSON.parse(stdout);
    
    if (result.error) {
      throw new Error(result.error);
    }

    console.log(`✅ Python OCR extraction completed${useOllama ? ' (with AI parsing)' : ''}`);
    return result;
  } catch (error) {
    console.error('❌ Python OCR error:', error.message);
    // Return null to fallback to JavaScript OCR
    return null;
  }
}

module.exports = {
  extractWithPythonOCR,
  isPythonOCRAvailable,
  isOllamaAvailable
};

