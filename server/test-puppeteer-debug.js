const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  console.log('🔍 Debugging Puppeteer table rendering...');
  
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  table { display: table !important; border-collapse: collapse; width: 100%; }
  tr { display: table-row !important; }
  td { display: table-cell !important; border: 2px solid black; padding: 10px; }
</style>
</head>
<body>
  <h1>TEST</h1>
  <table>
    <tr>
      <td style="width:50%; font-weight:bold;">LABEL:</td>
      <td style="width:50%;">VALUE</td>
    </tr>
  </table>
</body>
</html>`;
  
  // Save the HTML so you can open it in browser
  fs.writeFileSync('test-debug.html', html);
  console.log('✅ Saved test-debug.html - open this in Chrome and verify it shows correctly');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setContent(html);
  
  // Check what Puppeteer actually sees
  const debug = await page.evaluate(() => {
    const table = document.querySelector('table');
    const tr = document.querySelector('tr');
    const td = document.querySelector('td');
    return {
      tableDisplay: table ? getComputedStyle(table).display : 'not found',
      trDisplay: tr ? getComputedStyle(tr).display : 'not found',
      tdDisplay: td ? getComputedStyle(td).display : 'not found',
      tableHTML: table ? table.outerHTML : 'no table'
    };
  });
  
  console.log('🔍 Puppeteer sees:', JSON.stringify(debug, null, 2));
  
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' }
  });
  
  fs.writeFileSync('test-debug.pdf', pdf);
  await browser.close();
  
  console.log('✅ Created test-debug.pdf');
  console.log('\n📋 Next steps:');
  console.log('1. Open test-debug.html in Chrome - does it show LABEL | VALUE side-by-side?');
  console.log('2. Open test-debug.pdf - does it show the same?');
  console.log('3. Check the console output above - does it show display: table/table-row/table-cell?');
})();

