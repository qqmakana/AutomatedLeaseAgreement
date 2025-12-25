const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  console.log('Testing with OLD headless mode...');
  
  const html = `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: Arial; margin: 20px; }
  table { width: 100%; border-collapse: collapse; }
  td { border: 2px solid black; padding: 10px; }
  .label { font-weight: bold; width: 50%; }
</style>
</head>
<body>
  <h1 style="text-align:center;">TEST PDF - OLD HEADLESS</h1>
  <table>
    <tr>
      <td class="label">Label 1:</td>
      <td>Value 1</td>
    </tr>
    <tr>
      <td class="label">Label 2:</td>
      <td>Value 2</td>
    </tr>
  </table>
</body>
</html>`;
  
  try {
    const browser = await puppeteer.launch({
      headless: true,  // OLD headless mode (not 'new')
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(html);
    
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true
    });
    
    fs.writeFileSync('test-old-headless.pdf', pdf);
    await browser.close();
    
    console.log('✅ Created test-old-headless.pdf');
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
})();




















