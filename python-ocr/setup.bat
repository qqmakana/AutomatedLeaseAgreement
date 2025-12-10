@echo off
echo Installing Python OCR Service Dependencies...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from https://www.python.org/
    pause
    exit /b 1
)

echo Python found!
echo.

REM Install Python packages
echo Installing pytesseract, Pillow, requests...
pip install -r requirements.txt

echo.
echo ========================================
echo Python OCR Service Setup Complete!
echo.
echo Next steps:
echo 1. Install Tesseract OCR from: https://github.com/UB-Mannheim/tesseract/wiki
echo 2. (Optional) Install Ollama from: https://ollama.ai
echo 3. (Optional) Run: ollama pull llama3
echo.
echo The Node.js backend will automatically use Python OCR when available.
echo ========================================
pause


















