const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  console.log('Testing with real lease structure...');
  
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { 
    font-family: Arial, Helvetica, sans-serif; 
    font-size: 10pt; 
    margin: 20px;
  }
  h1 { 
    text-align: center; 
    font-size: 16pt; 
    margin: 10px 0; 
  }
  .part {
    text-align: center;
    font-weight: bold;
    font-size: 11pt;
    margin: 5px 0 10px;
  }
  table { 
    width: 100%; 
    border-collapse: collapse; 
    margin: 5px 0; 
  }
  td { 
    border: 1px solid #000; 
    padding: 8px; 
    vertical-align: top;
  }
  .label { 
    font-weight: bold; 
    width: 50%;
  }
</style>
</head>
<body>
  <h1>AGREEMENT OF LEASE</h1>
  <div class="part">PART A</div>
  
  <table>
    <tr>
      <td class="label">1.1 THE LANDLORD:</td>
      <td><strong>BENAV PROPERTIES (PTY) LTD</strong><br>TEL: (0861) 999 118</td>
    </tr>
    <tr>
      <td class="label">REGISTRATION NO:</td>
      <td>2018/060720/07</td>
    </tr>
    <tr>
      <td class="label">VAT REGISTRATION NO:</td>
      <td>4200288134</td>
    </tr>
    <tr>
      <td class="label">BANKING DETAILS:</td>
      <td>BANK: NEDBANK, NORTHERN GAUTENG<br>A/C NO: 120 459 4295, BRANCH CODE: 14690500</td>
    </tr>
    <tr>
      <td class="label">1.2 THE TENANT:</td>
      <td><strong>TENANT COMPANY NAME (PTY) LTD</strong></td>
    </tr>
    <tr>
      <td class="label">REGISTRATION NO:</td>
      <td>1986/032873/078</td>
    </tr>
    <tr>
      <td class="label">VAT REGISTRATION NO:</td>
      <td>4510124892</td>
    </tr>
  </table>
  
</body>
</html>`;
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setContent(html);
  
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '15mm', bottom: '15mm', left: '18mm', right: '18mm' }
  });
  
  fs.writeFileSync('test-real-lease.pdf', pdf);
  await browser.close();
  
  console.log('✅ Created test-real-lease.pdf with actual lease structure');
})();




















