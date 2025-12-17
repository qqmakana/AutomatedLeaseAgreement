const {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  BorderStyle,
  WidthType,
  AlignmentType,
  VerticalAlign,
  PageOrientation,
  convertInchesToTwip,
  HeadingLevel,
  TableLayoutType,
  UnderlineType
} = require('docx');

async function generateLeaseWord(leaseData) {
  console.log('📄 Starting Word document generation...');
  console.log('📋 Full leaseData received:', JSON.stringify(leaseData, null, 2));
  
  const { landlord = {}, tenant = {}, premises = {}, lease = {}, financial = {}, surety = {} } = leaseData || {};
  console.log('📋 Lease object:', JSON.stringify(lease, null, 2));
  
  // Get rates effective date (defaults to 01/06/2025 if not provided)
  const ratesEffectiveDate = financial.ratesEffectiveDate || '2025-06-01';
  
  const formatDateLong = (d) => {
    if (!d) return '';
    const date = new Date(d);
    const months = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
    return `${String(date.getDate()).padStart(2,'0')} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };
  
  const formatDateShort = (d) => {
    if (!d) return '';
    const date = new Date(d);
    return `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}/${date.getFullYear()}`;
  };
  
  const formatMoney = (amt) => {
    if (!amt) return '';
    const num = parseFloat(amt);
    if (isNaN(num)) return '';
    return 'R ' + num.toLocaleString('en-ZA', {minimumFractionDigits:2, maximumFractionDigits:2});
  };
  
  const calcVAT = (amt) => {
    if (!amt) return '';
    const num = parseFloat(amt);
    if (isNaN(num)) return '';
    return formatMoney(num * 1.15);
  };
  
  const formatAddress = (addr) => {
    if (!addr) return '';
    return addr.split(/[,\n]+/).map(part => part.trim()).filter(part => part).join('\n');
  };

  // Common border style
  const borders = {
    top: { style: BorderStyle.SINGLE, size: 12, color: "000000" },
    bottom: { style: BorderStyle.SINGLE, size: 12, color: "000000" },
    left: { style: BorderStyle.SINGLE, size: 12, color: "000000" },
    right: { style: BorderStyle.SINGLE, size: 12, color: "000000" },
  };

  const noBorders = {
    top: { style: BorderStyle.NONE },
    bottom: { style: BorderStyle.NONE },
    left: { style: BorderStyle.NONE },
    right: { style: BorderStyle.NONE },
  };

  // Helper to create a text run
  const text = (content, bold = false) => new TextRun({ text: content || '', bold, font: "Arial", size: 18 }); // 9pt = 18 half-points

  // Helper to create bold text
  const boldText = (content) => new TextRun({ text: content || '', bold: true, font: "Arial", size: 18 });

  // Helper to create a simple cell
  const cell = (content, options = {}) => {
    const runs = Array.isArray(content) ? content : [text(content)];
    return new TableCell({
      children: [new Paragraph({ children: runs, spacing: { before: 20, after: 20 } })],
      borders: options.borders || borders,
      width: options.width ? { size: options.width, type: WidthType.PERCENTAGE } : undefined,
      columnSpan: options.colSpan,
      rowSpan: options.rowSpan,
      verticalAlign: options.verticalAlign || VerticalAlign.TOP,
    });
  };

  // Helper to create a centered cell
  const centeredCell = (content, options = {}) => {
    const runs = Array.isArray(content) ? content : [text(content)];
    return new TableCell({
      children: [new Paragraph({ children: runs, alignment: AlignmentType.CENTER, spacing: { before: 20, after: 20 } })],
      borders: options.borders || borders,
      width: options.width ? { size: options.width, type: WidthType.PERCENTAGE } : undefined,
      columnSpan: options.colSpan,
      rowSpan: options.rowSpan,
      verticalAlign: options.verticalAlign || VerticalAlign.TOP,
    });
  };

  // Helper to create a label cell (left column)
  const labelCell = (content, options = {}) => {
    const runs = Array.isArray(content) ? content : [text(content)];
    return new TableCell({
      children: [new Paragraph({ children: runs, spacing: { before: 20, after: 20 } })],
      borders: options.borders || borders,
      width: options.width ? { size: options.width, type: WidthType.PERCENTAGE } : { size: 50, type: WidthType.PERCENTAGE },
      columnSpan: options.colSpan,
      rowSpan: options.rowSpan,
      verticalAlign: options.verticalAlign || VerticalAlign.TOP,
    });
  };

  // Helper to create value cell (right column)
  const valueCell = (content, options = {}) => {
    const runs = Array.isArray(content) ? content : [text(content)];
    return new TableCell({
      children: [new Paragraph({ children: runs, spacing: { before: 20, after: 20 } })],
      borders: options.borders || borders,
      width: options.width ? { size: options.width, type: WidthType.PERCENTAGE } : { size: 50, type: WidthType.PERCENTAGE },
      columnSpan: options.colSpan,
      verticalAlign: options.verticalAlign || VerticalAlign.TOP,
    });
  };

  const y2Exists = financial.year2?.basicRent;
  const y3Exists = financial.year3?.basicRent;

  // Build document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.1),
              right: convertInchesToTwip(0.1),
              bottom: convertInchesToTwip(0.1),
              left: convertInchesToTwip(0.1),
            },
          },
        },
        children: [
          // Title
          new Paragraph({
            children: [new TextRun({ text: "AGREEMENT OF LEASE", bold: true, font: "Arial", size: 24 })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 600, after: 300 },
          }),
          
          // PART A
          new Paragraph({
            children: [new TextRun({ text: "PART A", bold: true, font: "Arial", size: 18, underline: { type: UnderlineType.SINGLE } })],
            spacing: { before: 100, after: 150 },
            indent: { left: 700 },
          }),
          
          // Introduction
          new Paragraph({
            children: [
              text("THE PREMISES ARE HIRED BY THE "),
              boldText("TENANT"),
              text(" FROM THE "),
              boldText("LANDLORD"),
              text(" SUBJECT TO THE TERMS AND CONDITIONS SET OUT HEREIN AND IN ANY ANNEXURE HERETO:"),
            ],
            spacing: { before: 100, after: 150 },
            indent: { left: 700 },
          }),
          
          // 1.1 THE LANDLORD
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.FIXED,
            rows: [
              new TableRow({
                children: [
                  labelCell([boldText("1.1 THE LANDLORD:")]),
                  valueCell([
                    boldText(landlord.name || ''),
                    new TextRun({ text: `\nTEL:(${landlord.phone || ''})`, font: "Arial", size: 18 })
                  ]),
                ],
              }),
              new TableRow({
                children: [
                  labelCell("REGISTRATION NO:"),
                  valueCell(landlord.regNo || ''),
                ],
              }),
              new TableRow({
                children: [
                  labelCell("VAT REGISTRATION NO:"),
                  valueCell(landlord.vatNo || ''),
                ],
              }),
              new TableRow({
                children: [
                  labelCell("BANKING DETAILS:"),
                  valueCell([
                    text(`BANK: ${landlord.bank || ''}, ${landlord.branch || ''}`),
                    new TextRun({ text: `\nA/C NO: ${landlord.accountNo || ''}, BRANCH CODE: ${landlord.branchCode || ''}`, font: "Arial", size: 18 })
                  ]),
                ],
              }),
            ],
          }),
          
          // 1.2 THE TENANT
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.FIXED,
            rows: [
              new TableRow({
                children: [
                  labelCell([boldText("1.2 THE TENANT:")]),
                  valueCell(tenant.name || ''),
                ],
              }),
              new TableRow({
                children: [
                  labelCell("REGISTRATION NO:"),
                  valueCell(tenant.regNo || ''),
                ],
              }),
              new TableRow({
                children: [
                  labelCell("VAT REGISTRATION NO:"),
                  valueCell(tenant.vatNo || ''),
                ],
              }),
            ],
          }),
          
          // 1.2 POSTAL/PHYSICAL
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.FIXED,
            columnWidths: [5000, 2500, 2500],
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [] })],
                    borders,
                    rowSpan: 2,
                  }),
                  centeredCell([new TextRun({ text: "POSTAL:", font: "Arial", size: 18 })], { borders: { ...borders, bottom: { style: BorderStyle.SINGLE, size: 12, color: "000000" } } }),
                  centeredCell([new TextRun({ text: "PHYSICAL:", font: "Arial", size: 18 })], { borders: { ...borders, bottom: { style: BorderStyle.SINGLE, size: 12, color: "000000" } } }),
                ],
              }),
              new TableRow({
                children: [
                  cell(formatAddress(tenant.postalAddress)),
                  cell(formatAddress(tenant.physicalAddress)),
                ],
              }),
            ],
          }),
          
          // TRADING AS
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.FIXED,
            rows: [
              new TableRow({
                children: [
                  labelCell([boldText("TRADING AS:")]),
                  valueCell(tenant.tradingAs || tenant.name || ''),
                ],
              }),
            ],
          }),
          
          // 1.3 - 1.8 PREMISES
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.FIXED,
            rows: [
              new TableRow({
                children: [
                  labelCell([boldText("1.3"), text(" THE PREMISES:")]),
                  valueCell(premises.unit || ''),
                ],
              }),
              new TableRow({
                children: [
                  labelCell([boldText("1.4"), text(" BUILDING NAME:")]),
                  valueCell(premises.buildingName || ''),
                ],
              }),
              new TableRow({
                children: [
                  labelCell([boldText("1.5"), text(" BUILDING ADDRESS:")]),
                  valueCell(premises.buildingAddress || ''),
                ],
              }),
              new TableRow({
                children: [
                  labelCell([boldText("1.6"), text(" PREMISES MEASUREMENTS (APPROX):")]),
                  valueCell(`${premises.size || ''}m²`),
                ],
              }),
              new TableRow({
                children: [
                  labelCell([
                    boldText("1.7"),
                    text(" TENANT'S PERCENTAGE PROPORTIONATE SHARE\nOF BUILDING AND/OR PROPERTY EXCLUDING\nPARKING AND FACILITY AREAS")
                  ]),
                  valueCell(`${premises.percentage || ''}%`),
                ],
              }),
              new TableRow({
                children: [
                  labelCell([
                    boldText("1.8"),
                    text(" PERMITTED USE OF PREMISES:\nTO BE USED BY THE TENANT FOR THESE PURPOSES\nAND FOR NO OTHER PURPOSES WHATSOEVER")
                  ]),
                  valueCell(premises.permittedUse || ''),
                ],
              }),
            ],
          }),
          
          // 1.9 INITIAL PERIOD OF LEASE
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.FIXED,
            columnWidths: [5000, 2500, 2500],
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [boldText("1.9"), text(" INITIAL PERIOD OF LEASE:")],
                      spacing: { before: 20, after: 20 }
                    })],
                    borders,
                    rowSpan: 2,
                  }),
                  centeredCell("YEARS", { borders: { ...borders, bottom: { style: BorderStyle.SINGLE, size: 12, color: "000000" } } }),
                  centeredCell("MONTHS", { borders: { ...borders, bottom: { style: BorderStyle.SINGLE, size: 12, color: "000000" } } }),
                ],
              }),
              new TableRow({
                children: [
                  centeredCell(String(lease.years ?? '0')),
                  centeredCell(String(lease.months ?? '0')),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [text("COMMENCEMENT DATE:")],
                      spacing: { before: 20, after: 20 },
                      indent: { left: 350 }
                    })],
                    borders,
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [text(formatDateLong(lease.commencementDate))],
                      alignment: AlignmentType.LEFT,
                      spacing: { before: 20, after: 20 },
                      indent: { left: 50 }
                    })],
                    borders,
                    columnSpan: 2,
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [text("TERMINATION DATE:")],
                      spacing: { before: 20, after: 20 },
                      indent: { left: 350 }
                    })],
                    borders,
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [text(formatDateLong(lease.terminationDate))],
                      alignment: AlignmentType.LEFT,
                      spacing: { before: 20, after: 20 },
                      indent: { left: 50 }
                    })],
                    borders,
                    columnSpan: 2,
                  }),
                ],
              }),
            ],
          }),
          
          // 1.10 OPTION PERIOD
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.FIXED,
            columnWidths: [5000, 2500, 2500],
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [
                        boldText("1.10"),
                        text(" OPTION PERIOD OF LEASE (TO BE EXERCISED\nBY 31/08/2028) OPTION PERIOD IS TO BE MUTUALLY\nDETERMINED BY THE PARTIES. IF BUSINESS SOLD\nLEASE TO BE RENEWED SUBJECT TO APPROVAL OF\nNEW TENANT BY LANDLORD.")
                      ],
                      spacing: { before: 20, after: 20 }
                    })],
                    borders,
                    rowSpan: 2,
                    verticalAlign: VerticalAlign.TOP,
                  }),
                  centeredCell("YEARS"),
                  centeredCell("MONTHS"),
                ],
              }),
              new TableRow({
                children: [
                  centeredCell(String(lease.optionYears ?? '0')),
                  centeredCell(String(lease.optionMonths ?? '0')),
                ],
              }),
            ],
          }),
          
          // 1.11 SURETY
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.FIXED,
            rows: [
              new TableRow({
                children: [
                  labelCell([boldText("1.11"), text(" SURETY")]),
                  valueCell(''),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [text("NAME:")],
                      spacing: { before: 20, after: 20 },
                      indent: { left: 400 }
                    })],
                    borders,
                    width: { size: 50, type: WidthType.PERCENTAGE },
                  }),
                  valueCell(surety.name || ''),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [text("ID NUMBER:")],
                      spacing: { before: 20, after: 20 },
                      indent: { left: 400 }
                    })],
                    borders,
                    width: { size: 50, type: WidthType.PERCENTAGE },
                  }),
                  valueCell(surety.idNumber || ''),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [text("ADDRESS:")],
                      spacing: { before: 20, after: 20 },
                      indent: { left: 400 }
                    })],
                    borders,
                    width: { size: 50, type: WidthType.PERCENTAGE },
                  }),
                  valueCell(surety.address || ''),
                ],
              }),
            ],
          }),
          
          // Footer page 1
          new Paragraph({
            children: [new TextRun({ text: "1      INITIAL HERE: _______", bold: true, font: "Arial", size: 18 })],
            alignment: AlignmentType.RIGHT,
            spacing: { before: 100 },
          }),
          
          // Page break
          new Paragraph({ pageBreakBefore: true }),
          
          // PAGE 2 - 1.12 Monthly Rental
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.FIXED,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [boldText("1.12 MONTHLY RENTAL AND OTHER MONTHLY CHARGES.")],
                      spacing: { before: 20, after: 20 }
                    })],
                    borders,
                    columnSpan: 7,
                  }),
                ],
              }),
              new TableRow({
                children: [
                  centeredCell([text("BASIC RENT"), new TextRun({ text: "\nEXCL. VAT", font: "Arial", size: 18 })]),
                  centeredCell([text("BASIC RENT"), new TextRun({ text: "\nINCL. VAT", font: "Arial", size: 18 })]),
                  centeredCell([text("SECURITY"), new TextRun({ text: "\nEXCL. VAT", font: "Arial", size: 18 })]),
                  centeredCell([
                    text("ELECTRICITY\nSEWERAGE & WATER\n\n"),
                    boldText(`*REFUSE AS AT\n${formatDateShort(ratesEffectiveDate)}\nEXCL. VAT`)
                  ]),
                  centeredCell([boldText(`*RATES AS AT\n${formatDateShort(ratesEffectiveDate)}\nEXCL. VAT`)]),
                  centeredCell("FROM"),
                  centeredCell("TO"),
                ],
              }),
              // Year 1
              new TableRow({
                children: [
                  centeredCell(formatMoney(financial.year1?.basicRent)),
                  centeredCell(calcVAT(financial.year1?.basicRent)),
                  centeredCell(formatMoney(financial.year1?.security)),
                  centeredCell([
                    text("ELECTRICITY\nSEWERAGE & WATER\n\nMETERED OR % AGE OF\nEXPENSE\n\n*REFUSE -\n"),
                    text(`${formatMoney(financial.year1?.refuse)} p/m`)
                  ]),
                  centeredCell(`*${formatMoney(financial.year1?.rates)}`),
                  centeredCell(formatDateShort(financial.year1?.from)),
                  centeredCell(formatDateShort(financial.year1?.to)),
                ],
              }),
              // Year 2 (conditional)
              ...(y2Exists ? [new TableRow({
                children: [
                  centeredCell(formatMoney(financial.year2.basicRent)),
                  centeredCell(calcVAT(financial.year2.basicRent)),
                  centeredCell(formatMoney(financial.year2.security)),
                  centeredCell("ELECTRICITY\nSEWERAGE & WATER\n\nMETERED OR % AGE OF\nEXPENSE\n\n* REFUSE"),
                  centeredCell("*"),
                  centeredCell(formatDateShort(financial.year2.from)),
                  centeredCell(formatDateShort(financial.year2.to)),
                ],
              })] : []),
              // Year 3 (conditional)
              ...(y3Exists ? [new TableRow({
                children: [
                  centeredCell(formatMoney(financial.year3.basicRent)),
                  centeredCell(calcVAT(financial.year3.basicRent)),
                  centeredCell(formatMoney(financial.year3.security)),
                  centeredCell("ELECTRICITY\nSEWERAGE & WATER\n\nMETERED OR % AGE OF\nEXPENSE\n\n* REFUSE"),
                  centeredCell("*"),
                  centeredCell(formatDateShort(financial.year3.from)),
                  centeredCell(formatDateShort(financial.year3.to)),
                ],
              })] : []),
            ],
          }),
          
          // Note about rates increases
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [boldText("*INCREASES AS PER RELEVANT MUNICIPAL AUTHORITY/CONTRACTOR IN RATES AND REFUSE TO APPLY ON A PROPORTIONATE BASIS.")],
                      spacing: { before: 20, after: 20 }
                    })],
                    borders,
                  }),
                ],
              }),
            ],
          }),
          
          // 1.13 - 1.14.3
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.FIXED,
            rows: [
              new TableRow({
                children: [
                  labelCell([boldText("1.13 DEPOSIT -")]),
                  valueCell([boldText(`${formatMoney(financial.deposit)} – DEPOSIT HELD.`)]),
                ],
              }),
              new TableRow({
                children: [
                  labelCell([boldText("1.14.1"), text(" TURNOVER PERCENTAGE")]),
                  valueCell(financial.turnoverPercentage || 'N/A'),
                ],
              }),
              new TableRow({
                children: [
                  labelCell([boldText("1.14.2"), text(" TENANT'S FINANCIAL YEAR END:")]),
                  valueCell(financial.financialYearEnd || 'N/A'),
                ],
              }),
              new TableRow({
                children: [
                  labelCell([boldText("1.14.3"), text(" MINIMUM TURNOVER REQUIREMENT ESCALATING ANNUALLY")]),
                  valueCell(financial.minimumTurnover || 'N/A'),
                ],
              }),
            ],
          }),
          
          // 1.15
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.FIXED,
            rows: [
              new TableRow({
                children: [
                  labelCell([
                    boldText("1.15"),
                    text(" TENANT'S ADVERTISING AND PROMOTIONAL\nCONTRIBUTION: % AGE OF TENANT'S NET MONTHLY RENTAL\nPLUS ATTRIBUTABLE VALUE ADDED TAX THEREON")
                  ]),
                  valueCell(financial.advertisingContribution || 'N/A'),
                ],
              }),
            ],
          }),
          
          // 1.16
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [boldText("1.16"), text(` TENANT'S BANK ACCOUNT DETAILS: ${tenant.bankName || 'N/A'}`)],
                      spacing: { before: 20, after: 20 }
                    })],
                    borders,
                  }),
                ],
              }),
            ],
          }),
          
          // 1.17
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.FIXED,
            columnWidths: [7500, 2500],
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [
                        boldText("1.17"),
                        text(" THE FOLLOWING LEASE FEES SHALL BE PAYABLE BY THE TENANT ON SIGNATURE OF THIS\nLEASE.(EXCL. VAT)")
                      ],
                      spacing: { before: 20, after: 20 }
                    })],
                    borders,
                  }),
                  valueCell(formatMoney(financial.leaseFee)),
                ],
              }),
            ],
          }),
          
          // 1.18
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [boldText("1.18"), text(' THE FOLLOWING ANNEXURES SHALL FORM PART OF THIS AGREEMENT OF LEASE: "A";"B";"C";"D"')],
                      spacing: { before: 20, after: 20 }
                    })],
                    borders,
                  }),
                ],
              }),
            ],
          }),
          
          // Footer page 2
          new Paragraph({
            children: [new TextRun({ text: "2      INITIAL HERE: _______", bold: true, font: "Arial", size: 18 })],
            alignment: AlignmentType.RIGHT,
            spacing: { before: 100 },
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  console.log('✅ Word document generated successfully');
  return buffer;
}

module.exports = { generateLeaseWord };


