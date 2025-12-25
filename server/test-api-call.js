const fs = require('fs');
const { generateLeasePDF } = require('./services/pdfGeneratorPuppeteer');

const sampleData = {
  landlord: {
    name: 'BENAV PROPERTIES (PTY) LTD',
    phone: '(0861) 999 118',
    regNo: '2018/060720/07',
    vatNo: '4200288134',
    bank: 'NEDBANK',
    branch: 'NORTHERN GAUTENG',
    accountNo: '120 459 4295',
    branchCode: '14690500'
  },
  tenant: {
    name: 'TENANT COMPANY NAME (PTY) LTD',
    regNo: '1986/032873/078',
    vatNo: '4510124892',
    postalAddress: 'Unit 14, Rodium Park',
    physicalAddress: 'Unit 14, Rodium Park',
    tradingAs: 'Test Company'
  },
  premises: {
    unit: 'UNIT 14',
    buildingName: 'RODIUM INDUSTRIAL PARK',
    buildingAddress: 'CNR FABRIEK & MASJIEN ROADS',
    size: '361.00m²',
    percentage: '4.325%',
    permittedUse: 'HVAC ENGINEERING'
  },
  lease: {
    years: 3,
    months: 0,
    commencementDate: '2026-03-01',
    terminationDate: '2029-02-28',
    optionYears: 3,
    optionMonths: 0
  },
  financial: {
    year1: {
      basicRent: 22730.00,
      security: 1033.18,
      refuse: 515.94,
      rates: 251.29,
      from: '2026-03-01',
      to: '2027-02-28'
    },
    deposit: 39710.00
  },
  surety: {
    name: 'JOHN DOE',
    idNumber: '7810025482029',
    address: '4 PLANE ROAD, RANDBURG'
  }
};

(async () => {
  console.log('Testing actual PDF generator function...');
  try {
    const pdf = await generateLeasePDF(sampleData);
    fs.writeFileSync('test-from-api.pdf', pdf);
    console.log('✅ Created test-from-api.pdf - open it and check if it works!');
  } catch (err) {
    console.error('❌ Error:', err);
  }
})();




















