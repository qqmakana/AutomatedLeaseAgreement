const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  console.log('Testing Puppeteer...');
  
  const html = `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: Arial; margin: 20px; }
  table { width: 100%; border-collapse: collapse; }
  td { border: 1px solid black; padding: 10px; }
  .label { font-weight: bold; width: 50%; }
</style>
</head>
<body>
  <h1 style="text-align:center;">TEST PDF</h1>
  <table>
    <tr>
      <td class="label">Label 1:</td>
      <td>Value 1</td>
    </tr>
    <tr>
      <td class="label">Label 2:</td>
      <td>Value 2</td>
    </tr>
    <tr>
      <td class="label">Label 3:</td>
      <td>Value 3</td>
    </tr>
  </table>
  <p>If you see a 2-column table above, Puppeteer works!</p>
</body>
</html>`;
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setContent(html);
  
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' }
  });
  
  fs.writeFileSync('test-simple.pdf', pdf);
  await browser.close();
  
  console.log('✅ Created test-simple.pdf - open it and check if the table shows correctly!');
})();




















