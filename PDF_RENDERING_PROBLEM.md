# PDF Rendering Problem - Render Deployment

## Problem Summary
PDFs generated on Render (production) have incorrect spacing/layout compared to local development, despite using identical code and Docker configuration.

## Technical Stack
- **Backend**: Node.js/Express
- **PDF Library**: Puppeteer (server-side HTML/CSS to PDF)
- **Deployment**: Render.com (Docker)
- **Local Environment**: Docker Compose (works perfectly)
- **Production Environment**: Render Docker (spacing issues)

## Symptoms
- **Local**: PDF spacing is perfect, beautiful layout
- **Render**: PDF has large gaps between fields, incorrect spacing
- **Same code**: Identical codebase, same Dockerfile, same CSS

## What Works Locally
- PDF spacing: Perfect (1px field margins, 2px subsection margins)
- Fonts: Arial renders correctly
- Layout: All sections align properly
- Tables: Proper spacing and alignment

## What Fails on Render
- Large gaps between form fields (e.g., between "TEL:" and "REGISTRATION NO:")
- Inconsistent spacing despite CSS values being identical
- Same Dockerfile, same code, different rendering results

## Code Structure

### PDF Generation (Puppeteer)
```javascript
// server/services/pdfGeneratorPuppeteer.js
async function generateLeasePDF(leaseData) {
  browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--single-process',
      '--disable-gpu',
      '--font-render-hinting=none'
    ]
  });
  
  const page = await browser.newPage();
  await page.emulateMediaType('print');
  const html = generateLeaseHTML(leaseData);
  await page.setContent(html, { waitUntil: 'networkidle0' });
  
  // Wait for fonts
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 800)));
  
  // Force layout recalculation
  await page.evaluate(() => {
    const elements = document.querySelectorAll('*');
    elements.forEach(el => el.offsetHeight);
  });
  
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' }
  });
}
```

### CSS Spacing (Current)
```css
.field {
    margin-bottom: 1px !important;
    margin-top: 0 !important;
    display: flex;
    align-items: baseline;
    line-height: 1.2 !important;
}

.subsection {
    margin-left: 0px;
    margin-bottom: 2px !important;
    margin-top: 0 !important;
}

.section {
    margin-bottom: 8px !important;
    margin-top: 0 !important;
}
```

### Dockerfile
```dockerfile
FROM node:18-slim

RUN apt-get update && apt-get install -y \
    fonts-liberation \
    libfontconfig1 \
    # ... other dependencies

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["node", "server.js"]
```

## What We've Tried

### 1. CSS Fixes
- ✅ Reduced margins (1px fields, 2px subsections)
- ✅ Added `!important` flags to force spacing
- ✅ Set explicit `margin: 0` and `padding: 0`
- ✅ Used `line-height: 1.2`

### 2. Puppeteer Configuration
- ✅ Added `--single-process` for Render
- ✅ Added `--disable-gpu`, `--font-render-hinting=none`
- ✅ Increased font loading wait time (800ms)
- ✅ Added layout recalculation before PDF generation
- ✅ Force layout pass with `offsetHeight` checks

### 3. Deployment Configuration
- ✅ Using Docker (same as local)
- ✅ Fonts installed in Dockerfile
- ✅ Same Node.js version (18)
- ✅ Same Puppeteer version

### 4. Rendering Improvements
- ✅ `emulateMediaType('print')` before content
- ✅ `waitUntil: 'networkidle0'`
- ✅ Multiple layout recalculation passes
- ✅ Font ready checks

## Current Status
- **Local**: ✅ Perfect spacing, beautiful PDFs
- **Render**: ❌ Large gaps, incorrect spacing
- **Code**: Identical on both environments
- **Docker**: Same Dockerfile, same fonts

## Key Question
**Why does identical code produce different PDF spacing on Render vs local Docker?**

## Possible Causes (Need Investigation)
1. **Font rendering differences** - Render's Docker environment might render fonts differently
2. **CSS calculation timing** - Layout might be calculated before fonts load on Render
3. **Puppeteer version differences** - Though versions should match
4. **System font fallbacks** - Different default fonts on Render
5. **Print media emulation** - Might behave differently on Render
6. **Memory/resource constraints** - Render free tier limitations affecting rendering

## Request
Need help identifying why Puppeteer PDF generation produces different spacing on Render vs local, despite:
- Identical code
- Identical Dockerfile
- Identical CSS values
- Same Puppeteer configuration

Any insights or solutions would be greatly appreciated!


