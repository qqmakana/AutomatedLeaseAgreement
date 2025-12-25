const { generateLeasePDF } = require('./services/pdfGeneratorPuppeteer');
const fs = require('fs');

const testData = {
  landlord: { name: 'TEST LANDLORD', phone: '1234567890' },
  tenant: { name: 'TEST TENANT' },
  premises: { unit: 'Unit 1' },
  lease: { years: 3, months: 0 },
  financial: { year1: { basicRent: 10000 } },
  surety: { name: 'Test Surety' }
};

(async () => {
  try {
    console.log('Starting PDF generation test...');
    const pdfBuffer = await generateLeasePDF(testData);
    fs.writeFileSync('test-quick-output.pdf', pdfBuffer);
    console.log('✅ PDF generated successfully: test-quick-output.pdf');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
})();



















