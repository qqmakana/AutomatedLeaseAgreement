#!/usr/bin/env python3
"""
Enhanced OCR Service with Tesseract + Ollama AI Parsing
Provides better accuracy than client-side OCR
"""

import sys
import json
import base64
import os
from pathlib import Path

try:
    import pytesseract
    from PIL import Image
    import requests
except ImportError as e:
    print(json.dumps({"error": f"Missing dependency: {e}. Run: pip install pytesseract pillow requests"}))
    sys.exit(1)


def extract_text_with_tesseract(image_path):
    """Extract text using Tesseract OCR (server-side, better accuracy)"""
    try:
        # Read image
        image = Image.open(image_path)
        
        # Extract text using Tesseract
        text = pytesseract.image_to_string(image, lang='eng')
        
        return text.strip()
    except Exception as e:
        raise Exception(f"Tesseract OCR error: {str(e)}")


def parse_with_ollama(text, ollama_url="http://localhost:11434"):
    """
    Use Ollama + Llama 3 to intelligently parse extracted text
    This corrects OCR errors and extracts structured data
    """
    try:
        prompt = f"""Extract the following information from this South African ID/FICA document text. 
Return ONLY a valid JSON object with these fields: fullName, idNumber, email, phone, address, employment, income.
If a field is not found, use empty string "".

Document text:
{text}

Return JSON only, no other text:"""

        response = requests.post(
            f"{ollama_url}/api/generate",
            json={
                "model": "llama3",
                "prompt": prompt,
                "stream": False,
                "format": "json"
            },
            timeout=30
        )

        if response.status_code == 200:
            result = response.json()
            parsed_json = json.loads(result.get("response", "{}"))
            return parsed_json
        else:
            print(f"Ollama API error: {response.status_code}", file=sys.stderr)
            return None
    except requests.exceptions.ConnectionError:
        print("Ollama not available, using regex parsing", file=sys.stderr)
        return None
    except Exception as e:
        print(f"Ollama parsing error: {e}", file=sys.stderr)
        return None


def parse_with_regex(text):
    """Fallback: Parse using regex patterns (works without Ollama)"""
    import re
    
    data = {
        "fullName": "",
        "idNumber": "",
        "email": "",
        "phone": "",
        "address": "",
        "employment": "",
        "income": ""
    }
    
    # Extract ID number (13 digits)
    id_patterns = [
        r'(?:id|identity|id\s*number|id\s*no)[\s#:]+([0-9]{13})',
        r'([0-9]{13})',
        r'([0-9]{6}[0-9]{7})',
        r'([0-9]{6}\s+[0-9]{7})',
        r'([0-9]{2}[0-1][0-9][0-3][0-9][0-9]{7})'
    ]
    
    for pattern in id_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            data["idNumber"] = re.sub(r'\s+', '', match.group(1))
            break
    
    # Extract name
    name_patterns = [
        r'name[:\s]+([A-Z][A-Z\s]+[A-Z])',
        r'name[:\s]+([A-Z][a-z]+ [A-Z][a-z]+)',
        r'([A-Z][A-Z\s]{5,})'
    ]
    
    for pattern in name_patterns:
        match = re.search(pattern, text)
        if match:
            data["fullName"] = match.group(1).strip()
            break
    
    # Extract email
    email_match = re.search(r'([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})', text)
    if email_match:
        data["email"] = email_match.group(1)
    
    # Extract phone
    phone_patterns = [
        r'(\+27[\s]?[0-9]{2}[\s]?[0-9]{3}[\s]?[0-9]{4})',
        r'(0[0-9]{2}[\s]?[0-9]{3}[\s]?[0-9]{4})',
        r'([0-9]{10})'
    ]
    
    for pattern in phone_patterns:
        match = re.search(pattern, text)
        if match:
            data["phone"] = match.group(1).strip()
            break
    
    # Extract address
    address_match = re.search(r'address[:\s]+(.+?)(?:\n|email|phone|occupation|income)', text, re.IGNORECASE)
    if address_match:
        data["address"] = address_match.group(1).strip()
    
    # Extract employment
    emp_match = re.search(r'(?:occupation|employment|job|profession)[:\s]+(.+?)(?:\n|income|employer)', text, re.IGNORECASE)
    if emp_match:
        data["employment"] = emp_match.group(1).strip()
    
    # Extract income
    income_match = re.search(r'(?:income|salary|monthly\s+income)[:\s]+R?\s?([0-9,]+)', text, re.IGNORECASE)
    if income_match:
        data["income"] = f"R{income_match.group(1).replace(',', '')}"
    
    return data


def main():
    """Main entry point for OCR service"""
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python ocr_service.py <image_path> [--use-ollama]"}))
        sys.exit(1)
    
    image_path = sys.argv[1]
    use_ollama = "--use-ollama" in sys.argv
    
    if not os.path.exists(image_path):
        print(json.dumps({"error": f"File not found: {image_path}"}))
        sys.exit(1)
    
    try:
        # Step 1: Extract text with Tesseract
        extracted_text = extract_text_with_tesseract(image_path)
        
        if not extracted_text:
            print(json.dumps({"error": "No text extracted from image"}))
            sys.exit(1)
        
        # Step 2: Parse with Ollama (if available) or regex fallback
        if use_ollama:
            parsed_data = parse_with_ollama(extracted_text)
            if not parsed_data:
                parsed_data = parse_with_regex(extracted_text)
        else:
            parsed_data = parse_with_regex(extracted_text)
        
        # Return results
        result = {
            "success": True,
            "extractedText": extracted_text,
            "tenantData": parsed_data
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()


















