#!/bin/bash

echo "Installing Python OCR Service Dependencies..."
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    echo "Please install Python 3 from https://www.python.org/"
    exit 1
fi

echo "Python found!"
echo ""

# Install Python packages
echo "Installing pytesseract, Pillow, requests..."
pip3 install -r requirements.txt

echo ""
echo "========================================"
echo "Python OCR Service Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Install Tesseract OCR:"
echo "   Ubuntu/Debian: sudo apt-get install tesseract-ocr"
echo "   macOS: brew install tesseract"
echo ""
echo "2. (Optional) Install Ollama from: https://ollama.ai"
echo "3. (Optional) Run: ollama pull llama3"
echo ""
echo "The Node.js backend will automatically use Python OCR when available."
echo "========================================"


















