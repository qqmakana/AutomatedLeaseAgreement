# Server Dockerfile with Puppeteer for PDF generation
# Using Node 20 for better compatibility with Render
FROM node:20-slim

# Install dependencies for Puppeteer + fonts (critical for consistent rendering)
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    # CRITICAL: Install fonts (Liberation Sans is Arial-compatible)
    fonts-liberation \
    fonts-liberation2 \
    fonts-roboto \
    fonts-noto-core \
    fonts-noto-cjk \
    fonts-dejavu-core \
    fonts-dejavu-extra \
    fonts-freefont-ttf \
    fontconfig \
    # Chromium and dependencies
    chromium \
    chromium-sandbox \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxshmfence1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    xdg-utils \
    && fc-cache -f -v \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Verify fonts are installed
RUN fc-list | grep -i liberation || echo "WARNING: Liberation fonts not found"
RUN fc-list | grep -i dejavu || echo "WARNING: DejaVu fonts not found"

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port 5000
EXPOSE 5000

# Start server
CMD ["node", "server.js"]







