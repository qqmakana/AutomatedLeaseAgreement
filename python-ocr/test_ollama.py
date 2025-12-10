#!/usr/bin/env python3
"""
Quick test script to verify Ollama is working
"""

import requests
import json
import sys

def test_ollama():
    ollama_url = "http://localhost:11434"
    
    try:
        # Test 1: Check if Ollama is running
        print("🔍 Testing Ollama connection...")
        response = requests.get(f"{ollama_url}/api/tags", timeout=5)
        
        if response.status_code == 200:
            print("✅ Ollama is running!")
            
            # Test 2: Check if llama3 model is available
            models = response.json().get("models", [])
            llama3_models = [m for m in models if "llama3" in m.get("name", "").lower()]
            
            if llama3_models:
                print(f"✅ Llama 3 model found: {llama3_models[0]['name']}")
                
                # Test 3: Test a simple query
                print("\n🧪 Testing Llama 3 with a simple query...")
                test_response = requests.post(
                    f"{ollama_url}/api/generate",
                    json={
                        "model": "llama3",
                        "prompt": "Say 'Hello, Ollama is working!'",
                        "stream": False
                    },
                    timeout=30
                )
                
                if test_response.status_code == 200:
                    result = test_response.json()
                    print(f"✅ Llama 3 responded: {result.get('response', '')[:100]}")
                    print("\n🎉 All tests passed! Ollama is ready to use.")
                    return True
                else:
                    print(f"❌ Llama 3 test failed: {test_response.status_code}")
                    return False
            else:
                print("⚠️  Llama 3 model not found!")
                print("   Run: ollama pull llama3")
                return False
        else:
            print(f"❌ Ollama not responding: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to Ollama!")
        print("   Make sure Ollama is running: ollama serve")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = test_ollama()
    sys.exit(0 if success else 1)


















