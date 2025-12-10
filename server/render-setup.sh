#!/bin/bash
# Render deployment script - Install fonts for Puppeteer PDF generation

echo "Installing fonts for Puppeteer PDF generation..."

# Install system fonts (required for Puppeteer on Render)
apt-get update && apt-get install -y \
    fonts-liberation \
    fonts-dejavu-core \
    fontconfig \
    && rm -rf /var/lib/apt/lists/*

# Update font cache
fc-cache -f -v

echo "✅ Fonts installed successfully"


