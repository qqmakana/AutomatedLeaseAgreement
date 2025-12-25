const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateToken } = require('./auth');
const { generateLeasePDF } = require('../services/pdfGeneratorPuppeteer');
const { generateLeaseWord } = require('../services/wordGenerator');
const { parseLeaseControlPDF } = require('../services/leaseControlParser');
const { generateDepositInvoice } = require('../services/invoiceGenerator');
const { parseInvoicePDF } = require('../services/invoiceParser');
const { generateMonthlyInvoice } = require('../services/monthlyInvoiceGenerator');
const { parseUtilityStatement } = require('../services/utilityStatementParser');
const { getPrisma } = require('../utils/prisma');

// Configure multer for PDF uploads (memory storage for processing)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// PARSE LEASE CONTROL SCHEDULE PDF - Extract all data automatically
router.post('/parse-lease-control', upload.single('pdf'), async (req, res) => {
  try {
    console.log('📄 Lease Control PDF upload received');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }
    
    console.log('📎 File details:', {
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
    
    // Parse the PDF
    const extractedData = await parseLeaseControlPDF(req.file.buffer);
    
    console.log('✅ Successfully parsed Lease Control Schedule');
    console.log('📋 Extracted fields:', {
      landlord: extractedData.landlord?.name || 'N/A',
      tenant: extractedData.tenant?.name || 'N/A',
      surety: extractedData.surety?.name || 'N/A',
      premises: extractedData.premises?.unit || 'N/A',
      leaseYears: extractedData.lease?.years || 'N/A',
      year1Rent: extractedData.financial?.year1?.basicRent || 'N/A'
    });
    
    res.json({
      success: true,
      message: 'Lease Control Schedule parsed successfully',
      data: extractedData
    });
    
  } catch (error) {
    console.error('❌ Parse Lease Control error:', error);
    res.status(500).json({
      error: 'Failed to parse Lease Control PDF',
      details: error.message
    });
  }
});

// PARSE INVOICE PDF - Extract deposit, utilities, and tenant bank details
router.post('/parse-invoice', upload.single('pdf'), async (req, res) => {
  try {
    console.log('🧾 Invoice PDF upload received');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }
    
    console.log('📎 File details:', {
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
    
    // Parse the Invoice PDF
    const extractedData = await parseInvoicePDF(req.file.buffer);
    
    console.log('✅ Successfully parsed Invoice');
    console.log('📋 Extracted fields:', {
      deposit: extractedData.deposit || 'N/A',
      electricity: extractedData.utilities?.electricity || 'N/A',
      water: extractedData.utilities?.water || 'N/A',
      sewerage: extractedData.utilities?.sewerage || 'N/A',
      rent: extractedData.rent || 'N/A',
      tenantBank: extractedData.tenantBank?.accountNumber || 'N/A'
    });
    
    res.json({
      success: true,
      message: 'Invoice parsed successfully',
      data: extractedData
    });
    
  } catch (error) {
    console.error('❌ Parse Invoice error:', error);
    res.status(500).json({
      error: 'Failed to parse Invoice PDF',
      details: error.message
    });
  }
});

// PARSE UTILITY STATEMENT PDF - Extract electricity, water, sewerage for monthly invoice
router.post('/parse-utility-statement', upload.single('pdf'), async (req, res) => {
  try {
    console.log('⚡ Utility Statement PDF upload received');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }
    
    console.log('📎 File details:', {
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
    
    // Parse the Utility Statement PDF
    const extractedData = await parseUtilityStatement(req.file.buffer);
    
    console.log('✅ Successfully parsed Utility Statement');
    console.log('📋 Extracted utility fields:', {
      electricity: extractedData.electricity || 'N/A',
      water: extractedData.water || 'N/A',
      sewerage: extractedData.sewerage || 'N/A',
      municipal: extractedData.municipal || 'N/A',
      refuse: extractedData.refuse || 'N/A',
      rent: extractedData.rent || 'N/A'
    });
    
    res.json({
      success: true,
      message: 'Utility Statement parsed successfully',
      data: extractedData
    });
    
  } catch (error) {
    console.error('❌ Parse Utility Statement error:', error);
    res.status(500).json({
      error: 'Failed to parse Utility Statement PDF',
      details: error.message
    });
  }
});

// TEST ENDPOINT: Generate PDF with sample data (NO AUTH - MUST BE FIRST)
router.get('/test-pdf-public', async (req, res) => {
  try {
    console.log('🧪 TEST PDF generation with hardcoded data');
    
    const testData = {
      tenant: {
        name: 'MAKANA PROPERTIES (PTY) LTD',
        regNo: '2018/060720/07',
        vatNo: '4200288134',
        tradingAs: 'MAKANA PROPERTIES',
        postalAddress: 'UNIT 14, RODIUM INDUSTRIAL PARK, CNR FABRIEK & MASJIEN ROADS, STRIJDOM PARK, 2194',
        physicalAddress: 'UNIT 14, RODIUM INDUSTRIAL PARK, CNR FABRIEK & MASJIEN ROADS, STRIJDOM PARK, 2194',
        bankName: 'STANDARD BANK',
        bankAccountNumber: '1234567890',
        bankBranchCode: '051001',
        bankAccountType: 'BUSINESS CURRENT ACCOUNT',
        bankAccountHolder: 'MAKANA PROPERTIES (PTY) LTD'
      },
      landlord: {
        name: 'BENAV PROPERTIES (PTY) LTD',
        regNo: '2018/060720/07',
        vatNo: '4200288134',
        phone: '(0861) 999 118',
        bank: 'NEDBANK',
        branch: 'NORTHERN GAUTENG',
        accountNo: '120 459 4295',
        branchCode: '14690500'
      },
      surety: {},
      premises: {
        unit: 'UNIT 14',
        buildingName: 'RODIUM INDUSTRIAL PARK',
        buildingAddress: 'CNR FABRIEK & MASJIEN ROADS, STRIJDOM PARK',
        size: '361.00m²',
        percentage: '4.325%',
        permittedUse: 'COMPUTER SOFTWARE AND RELATED SERVICES'
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
          basicRent: '22730',
          security: '1033.18',
          refuse: '515.94',
          rates: '251.29',
          from: '2026-03-01',
          to: '2027-02-28'
        },
        year2: {},
        year3: {}
      }
    };

    const pdfBuffer = await generateLeasePDF(testData);
    
    const buffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
    
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Length': buffer.length,
      'Content-Disposition': `attachment; filename="test-lease-${Date.now()}.pdf"`,
      'Cache-Control': 'no-cache'
    });
    res.end(buffer, 'binary');
    
    console.log('✅ TEST PDF generated successfully');
  } catch (error) {
    console.error('❌ TEST PDF generation error:', error);
    res.status(500).json({ error: 'Test PDF generation failed', details: error.message });
  }
});

// Get all leases for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const leases = await prisma.lease.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        tenant: true,
        landlord: true
      }
    });

    res.json({ leases });
  } catch (error) {
    console.error('Get leases error:', error);
    res.status(500).json({ error: 'Failed to fetch leases' });
  }
});

// Get single lease
router.get('/:id', authenticateToken, async (req, res) => {
  const prisma = getPrisma();
  if (!prisma) {
    return res.status(503).json({ error: 'Database not available' });
  }
  try {
    const lease = await prisma.lease.findFirst({
      where: {
        id: parseInt(req.params.id),
        userId: req.user.userId
      },
      include: {
        tenant: true,
        landlord: true
      }
    });

    if (!lease) {
      return res.status(404).json({ error: 'Lease not found' });
    }

    res.json({ lease });
  } catch (error) {
    console.error('Get lease error:', error);
    res.status(500).json({ error: 'Failed to fetch lease' });
  }
});

// Create new lease
router.post('/', authenticateToken, async (req, res) => {
  const prisma = getPrisma();
  if (!prisma) {
    return res.status(503).json({ error: 'Database not available' });
  }
  try {
    const { tenantData, leaseDetails } = req.body;

    // Create lease with related data
    const lease = await prisma.lease.create({
      data: {
        userId: req.user.userId,
        tenant: {
          create: tenantData
        },
        landlord: {
          create: {
            name: leaseDetails.landlordName,
            email: leaseDetails.landlordEmail,
            phone: leaseDetails.landlordPhone
          }
        },
        propertyAddress: leaseDetails.propertyAddress,
        propertyType: leaseDetails.propertyType,
        leaseStartDate: new Date(leaseDetails.leaseStartDate),
        leaseEndDate: new Date(leaseDetails.leaseEndDate),
        monthlyRent: parseFloat(leaseDetails.monthlyRent),
        securityDeposit: parseFloat(leaseDetails.securityDeposit),
        utilities: leaseDetails.utilities,
        maintenance: leaseDetails.maintenance,
        status: 'draft'
      },
      include: {
        tenant: true,
        landlord: true
      }
    });

    res.status(201).json({ lease });
  } catch (error) {
    console.error('Create lease error:', error);
    res.status(500).json({ error: 'Failed to create lease' });
  }
});

// Update lease
router.put('/:id', authenticateToken, async (req, res) => {
  const prisma = getPrisma();
  if (!prisma) {
    return res.status(503).json({ error: 'Database not available' });
  }
  try {
    const { tenantData, leaseDetails } = req.body;

    const lease = await prisma.lease.update({
      where: {
        id: parseInt(req.params.id),
        userId: req.user.userId
      },
      data: {
        tenant: {
          update: tenantData
        },
        landlord: {
          update: {
            name: leaseDetails.landlordName,
            email: leaseDetails.landlordEmail,
            phone: leaseDetails.landlordPhone
          }
        },
        propertyAddress: leaseDetails.propertyAddress,
        propertyType: leaseDetails.propertyType,
        leaseStartDate: new Date(leaseDetails.leaseStartDate),
        leaseEndDate: new Date(leaseDetails.leaseEndDate),
        monthlyRent: parseFloat(leaseDetails.monthlyRent),
        securityDeposit: parseFloat(leaseDetails.securityDeposit),
        utilities: leaseDetails.utilities,
        maintenance: leaseDetails.maintenance
      },
      include: {
        tenant: true,
        landlord: true
      }
    });

    res.json({ lease });
  } catch (error) {
    console.error('Update lease error:', error);
    res.status(500).json({ error: 'Failed to update lease' });
  }
});

// Generate PDF from lease ID (database)
router.get('/:id/pdf', authenticateToken, async (req, res) => {
  const prisma = getPrisma();
  if (!prisma) {
    return res.status(503).json({ error: 'Database not available' });
  }
  try {
    const lease = await prisma.lease.findFirst({
      where: {
        id: parseInt(req.params.id),
        userId: req.user.userId
      },
      include: {
        tenant: true,
        landlord: true
      }
    });

    if (!lease) {
      return res.status(404).json({ error: 'Lease not found' });
    }

    // Convert database lease to extractedData format
    const leaseData = {
      landlord: {
        name: lease.landlord?.name || '',
        regNo: lease.landlord?.regNo || '',
        vatNo: lease.landlord?.vatNo || '',
        phone: lease.landlord?.phone || ''
      },
      tenant: {
        name: lease.tenant?.fullName || lease.tenant?.name || '',
        regNo: lease.tenant?.regNo || '',
        vatNo: lease.tenant?.vatNo || '',
        tradingAs: lease.tenant?.tradingAs || '',
        postalAddress: lease.tenant?.address || '',
        physicalAddress: lease.tenant?.physicalAddress || '',
        bankName: lease.tenant?.bankName || '',
        bankAccountNumber: lease.tenant?.bankAccountNumber || '',
        bankBranchCode: lease.tenant?.bankBranchCode || '',
        bankAccountType: lease.tenant?.bankAccountType || '',
        bankAccountHolder: lease.tenant?.bankAccountHolder || ''
      },
      surety: {
        name: '',
        idNumber: '',
        address: ''
      },
      premises: {
        unit: '',
        buildingName: '',
        buildingAddress: lease.propertyAddress || '',
        size: '',
        percentage: '',
        permittedUse: ''
      },
      lease: {
        years: lease.leaseYears || 3,
        months: lease.leaseMonths || 0,
        commencementDate: lease.leaseStartDate || '',
        terminationDate: lease.leaseEndDate || '',
        optionYears: 3,
        optionMonths: 0,
        optionExerciseDate: ''
      },
      financial: {
        year1: {
          basicRent: lease.monthlyRent?.toString() || '',
          security: lease.securityDeposit?.toString() || '',
          refuse: '',
          rates: '',
          sewerageWater: 'METERED OR % OF EXPENSE',
          from: lease.leaseStartDate || '',
          to: ''
        },
        year2: {
          basicRent: '',
          security: '',
          refuse: '',
          rates: '',
          sewerageWater: 'METERED OR % OF EXPENSE',
          from: '',
          to: ''
        },
        year3: {
          basicRent: '',
          security: '',
          refuse: '',
          rates: '',
          sewerageWater: 'METERED OR % OF EXPENSE',
          from: '',
          to: ''
        }
      }
    };

    const pdfBuffer = await generateLeasePDF(leaseData);

    // Verify PDF buffer is valid
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Generated PDF buffer is empty');
    }
    
    // Set proper headers for PDF binary response
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="lease-${lease.id}.pdf"`,
      'Content-Length': pdfBuffer.length,
      'Cache-Control': 'no-cache'
    });
    res.end(Buffer.from(pdfBuffer), 'binary');
  } catch (error) {
    console.error('Generate PDF error:', error);
    res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
  }
});

// Generate PDF from full lease data (POST endpoint - accepts extractedData structure)
// Helper function to extract data from FICA text
function extractFromFICA(ficaText) {
  const data = {
    tenant: {},
    landlord: {},
    surety: {},
    premises: {},
    lease: { years: 3, months: 0 },
    financial: { year1: {}, year2: {}, year3: {} }
  };
  
  // Extract company name
  const companyMatch = ficaText.match(/Company Name:\s*(.+)/i);
  if (companyMatch) data.tenant.name = companyMatch[1].trim();
  
  // Extract registration number
  const regMatch = ficaText.match(/Registration Number:\s*(.+)/i);
  if (regMatch) data.tenant.regNo = regMatch[1].trim();
  
  // Extract VAT number
  const vatMatch = ficaText.match(/VAT Registration Number:\s*(.+)/i);
  if (vatMatch) data.tenant.vatNo = vatMatch[1].trim();
  
  // Extract trading as
  const tradingMatch = ficaText.match(/Trading As:\s*(.+)/i);
  if (tradingMatch) data.tenant.tradingAs = tradingMatch[1].trim();
  
  // Extract bank details
  const bankMatch = ficaText.match(/Bank Name:\s*(.+)/i);
  if (bankMatch) data.tenant.bankName = bankMatch[1].trim();
  
  const accountMatch = ficaText.match(/Account Number:\s*(.+)/i);
  if (accountMatch) data.tenant.bankAccountNumber = accountMatch[1].trim();
  
  const branchMatch = ficaText.match(/Branch Code:\s*(.+)/i);
  if (branchMatch) data.tenant.bankBranchCode = branchMatch[1].trim();
  
  const accountTypeMatch = ficaText.match(/Account Type:\s*(.+)/i);
  if (accountTypeMatch) data.tenant.bankAccountType = accountTypeMatch[1].trim();
  
  // Extract addresses
  const postalMatch = ficaText.match(/Postal Address:\s*(.+?)(?=Physical Address:|PART|$)/is);
  if (postalMatch) {
    data.tenant.postalAddress = postalMatch[1].trim().replace(/\n/g, ', ');
  }
  
  const physicalMatch = ficaText.match(/Physical Address:\s*(.+?)(?=PART|$)/is);
  if (physicalMatch) {
    data.tenant.physicalAddress = physicalMatch[1].trim().replace(/\n/g, ', ');
  }
  
  return data;
}

router.post('/generate-pdf', async (req, res) => {
  try {
    console.log('📄 PDF generation request received');
    console.log('📋 RAW REQUEST BODY:', JSON.stringify(req.body, null, 2));
    
    let leaseData = req.body;
    
    // If ficaText is provided, extract tenant data and merge with other details
    if (req.body.ficaText && typeof req.body.ficaText === 'string') {
      console.log('📝 FICA text provided, extracting tenant data...');
      const extractedData = extractFromFICA(req.body.ficaText);
      console.log('✅ Extracted tenant data:', extractedData.tenant);
      
      // Merge extracted tenant data with provided landlord/premises/lease/financial
      leaseData = {
        tenant: extractedData.tenant,
        landlord: req.body.landlord || {},
        surety: req.body.surety || {},
        premises: req.body.premises || {},
        lease: req.body.lease || extractedData.lease,
        financial: req.body.financial || extractedData.financial
      };
      
      console.log('📋 Merged lease data:', {
        hasTenant: !!leaseData.tenant.name,
        hasLandlord: !!leaseData.landlord.name,
        hasPremises: !!leaseData.premises.unit,
        hasLease: !!leaseData.lease.years
      });
    }
    
    if (!leaseData) {
      console.error('❌ No lease data provided');
      return res.status(400).json({ error: 'Lease data is required' });
    }

    console.log('📋 Lease data structure:', {
      hasLandlord: !!leaseData.landlord,
      hasTenant: !!leaseData.tenant,
      hasLease: !!leaseData.lease,
      hasFinancial: !!leaseData.financial
    });
    
    console.log('📋 TENANT DATA:', JSON.stringify(leaseData.tenant, null, 2));
    console.log('📋 LANDLORD DATA:', JSON.stringify(leaseData.landlord, null, 2));
    console.log('📋 FULL LEASE DATA:', JSON.stringify(leaseData, null, 2));

    console.log('🚀 Calling generateLeasePDF...');
    const pdfBuffer = await generateLeasePDF(leaseData);
    console.log('✅ generateLeasePDF completed');
    console.log('✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes');

    // Verify PDF buffer is valid
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Generated PDF buffer is empty');
    }
    
    // Verify it starts with PDF magic bytes (%PDF)
    if (pdfBuffer[0] !== 0x25 || pdfBuffer[1] !== 0x50 || pdfBuffer[2] !== 0x44 || pdfBuffer[3] !== 0x46) {
      console.error('⚠️ Warning: PDF buffer does not start with PDF magic bytes');
      console.error('First 20 bytes:', Array.from(pdfBuffer.slice(0, 20)).map(b => '0x' + b.toString(16)).join(' '));
    }

    // Ensure proper PDF response headers - use writeHead for binary
    const buffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
    
    // Check if this is a preview request (no download header)
    const isPreview = req.headers['x-preview'] === 'true' || req.query.preview === 'true';
    const disposition = isPreview 
      ? `inline; filename="lease-agreement-${Date.now()}.pdf"`
      : `attachment; filename="lease-agreement-${Date.now()}.pdf"`;
    
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Length': buffer.length,
      'Content-Disposition': disposition,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Preview'
    });
    
    // Send buffer as binary
    res.end(buffer, 'binary');
  } catch (error) {
    console.error('❌ Generate PDF error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    if (error.code) console.error('Error code:', error.code);
    res.status(500).json({ 
      error: 'Failed to generate PDF', 
      details: error.message,
      stack: error.stack 
    });
  }
});

// Generate Word document from full lease data (POST endpoint - accepts extractedData structure)
router.post('/generate-word', async (req, res) => {
  try {
    console.log('📄 Word generation request received');
    
    let leaseData = req.body;
    
    // If ficaText is provided, extract tenant data and merge with other details
    if (req.body.ficaText && typeof req.body.ficaText === 'string') {
      console.log('📝 FICA text provided, extracting tenant data...');
      const extractedData = extractFromFICA(req.body.ficaText);
      
      // Merge extracted tenant data with provided landlord/premises/lease/financial
      leaseData = {
        tenant: extractedData.tenant,
        landlord: req.body.landlord || {},
        surety: req.body.surety || {},
        premises: req.body.premises || {},
        lease: req.body.lease || extractedData.lease,
        financial: req.body.financial || extractedData.financial
      };
    }
    
    if (!leaseData) {
      console.error('❌ No lease data provided');
      return res.status(400).json({ error: 'Lease data is required' });
    }

    console.log('🚀 Calling generateLeaseWord...');
    const wordBuffer = await generateLeaseWord(leaseData);
    console.log('✅ Word document generated successfully, size:', wordBuffer.length, 'bytes');

    // Verify buffer is valid
    if (!wordBuffer || wordBuffer.length === 0) {
      throw new Error('Generated Word buffer is empty');
    }
    
    const buffer = Buffer.isBuffer(wordBuffer) ? wordBuffer : Buffer.from(wordBuffer);
    
    res.writeHead(200, {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Length': buffer.length,
      'Content-Disposition': `attachment; filename="lease-agreement-${Date.now()}.docx"`,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    
    res.end(buffer, 'binary');
  } catch (error) {
    console.error('❌ Generate Word error:', error);
    res.status(500).json({ 
      error: 'Failed to generate Word document', 
      details: error.message,
      stack: error.stack 
    });
  }
});

// GENERATE DEPOSIT INVOICE PDF
router.post('/generate-invoice', async (req, res) => {
  try {
    console.log('🧾 Invoice generation request received');
    
    const leaseData = req.body;
    
    if (!leaseData) {
      console.error('❌ No lease data provided for invoice');
      return res.status(400).json({ error: 'Lease data is required' });
    }

    console.log('🚀 Generating deposit invoice...');
    const pdfBuffer = await generateDepositInvoice(leaseData);
    console.log('✅ Invoice generated successfully, size:', pdfBuffer.length, 'bytes');

    // Verify buffer is valid
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Generated invoice PDF buffer is empty');
    }
    
    const buffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
    
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Length': buffer.length,
      'Content-Disposition': `attachment; filename="deposit-invoice-${Date.now()}.pdf"`,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    
    res.end(buffer, 'binary');
  } catch (error) {
    console.error('❌ Generate Invoice error:', error);
    res.status(500).json({ 
      error: 'Failed to generate invoice', 
      details: error.message,
      stack: error.stack 
    });
  }
});

// GENERATE MONTHLY INVOICE PDF
router.post('/generate-monthly-invoice', async (req, res) => {
  try {
    console.log('📅 Monthly Invoice generation request received');
    
    const invoiceData = req.body;
    
    if (!invoiceData) {
      console.error('❌ No invoice data provided');
      return res.status(400).json({ error: 'Invoice data is required' });
    }

    console.log('🚀 Generating monthly invoice...');
    console.log('📋 Invoice details:', {
      tenant: invoiceData.tenant?.name || 'N/A',
      property: invoiceData.property?.name || 'N/A',
      month: invoiceData.invoiceMonth || 'N/A',
      chargesCount: invoiceData.charges?.length || 0
    });
    
    const pdfBuffer = await generateMonthlyInvoice(invoiceData);
    console.log('✅ Monthly invoice generated successfully, size:', pdfBuffer.length, 'bytes');

    // Verify buffer is valid
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Generated monthly invoice PDF buffer is empty');
    }
    
    const buffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
    
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Length': buffer.length,
      'Content-Disposition': `attachment; filename="monthly-invoice-${invoiceData.invoiceMonth || Date.now()}.pdf"`,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    
    res.end(buffer, 'binary');
  } catch (error) {
    console.error('❌ Generate Monthly Invoice error:', error);
    res.status(500).json({ 
      error: 'Failed to generate monthly invoice', 
      details: error.message,
      stack: error.stack 
    });
  }
});

// Delete lease
router.delete('/:id', authenticateToken, async (req, res) => {
  const prisma = getPrisma();
  if (!prisma) {
    return res.status(503).json({ error: 'Database not available' });
  }
  try {
    await prisma.lease.delete({
      where: {
        id: parseInt(req.params.id),
        userId: req.user.userId
      }
    });

    res.json({ message: 'Lease deleted successfully' });
  } catch (error) {
    console.error('Delete lease error:', error);
    res.status(500).json({ error: 'Failed to delete lease' });
  }
});

// Make test endpoint public by exporting it separately before auth middleware
module.exports = router;












