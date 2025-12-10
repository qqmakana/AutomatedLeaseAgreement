# Python OCR Service

Enhanced OCR service using Tesseract + Ollama for better accuracy and AI-powered parsing.

## Setup

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 2. Install Tesseract OCR

**Windows:**
- Download from: https://github.com/UB-Mannheim/tesseract/wiki
- Install to default location: `C:\Program Files\Tesseract-OCR`
- Add to PATH or set environment variable:
  ```bash
  setx TESSDATA_PREFIX "C:\Program Files\Tesseract-OCR\tessdata"
  ```

**Linux:**
```bash
sudo apt-get install tesseract-ocr
```

**macOS:**
```bash
brew install tesseract
```

### 3. Install Ollama (Optional - for AI parsing)

```bash
# Download from https://ollama.ai
# Or use:
curl -fsSL https://ollama.ai/install.sh | sh

# Pull Llama 3 model:
ollama pull llama3
```

## Usage

### Basic (Regex Parsing):
```bash
python ocr_service.py path/to/id_document.jpg
```

### With Ollama (AI Parsing):
```bash
python ocr_service.py path/to/id_document.jpg --use-ollama
```

## Output

Returns JSON:
```json
{
  "success": true,
  "extractedText": "Full OCR text...",
  "tenantData": {
    "fullName": "John Doe",
    "idNumber": "9001015800085",
    "email": "john@example.com",
    "phone": "+27123456789",
    "address": "123 Main St",
    "employment": "Software Developer",
    "income": "R50000"
  }
}
```

## Integration with Node.js Backend

The Node.js backend will call this Python service automatically when available.


















