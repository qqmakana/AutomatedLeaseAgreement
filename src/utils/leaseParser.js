/**
 * Parse lease agreement text to extract all fields
 */
export const parseLeaseAgreement = (text) => {
  if (!text) return {};

  const data = {
    landlord: {},
    tenant: {},
    premises: {},
    lease: {},
    surety: {},
    financial: {
      year1: {},
      year2: {},
      year3: {},
      deposit: '',
      leaseFee: '',
      turnoverPercentage: '',
      financialYearEnd: '',
      minimumTurnover: '',
      advertisingContribution: '',
      tenantBankAccount: '',
      utilities: ''
    }
  };

  // Extract Landlord details
  const landlordMatch = text.match(/1\.1\s+THE\s+LANDLORD:\s*(.+?)(?:\n|TEL:)/is);
  if (landlordMatch) {
    data.landlord.name = landlordMatch[1].trim();
  }

  const landlordTelMatch = text.match(/TEL:\s*\(?([^)]+)\)?\s*([0-9\s-]+)/i);
  if (landlordTelMatch) {
    data.landlord.phone = landlordTelMatch[0].replace(/TEL:\s*/i, '').trim();
  }

  const landlordRegMatch = text.match(/REGISTRATION\s+NO:\s*([0-9/]+)/i);
  if (landlordRegMatch) {
    data.landlord.regNo = landlordRegMatch[1].trim();
  }

  const landlordVATMatch = text.match(/VAT\s+REGISTRATION\s+NO:\s*([0-9]+)/i);
  if (landlordVATMatch) {
    data.landlord.vatNo = landlordVATMatch[1].trim();
  }

  const bankMatch = text.match(/BANK\s*:\s*([^,]+),\s*([^\n]+)/i);
  if (bankMatch) {
    data.landlord.bank = bankMatch[1].trim();
    data.landlord.branch = bankMatch[2].trim();
  }

  const accountMatch = text.match(/A\/C\s+NO:\s*([0-9\s]+)[,\s]+BRANCH\s+CODE:\s*([0-9]+)/i);
  if (accountMatch) {
    data.landlord.accountNo = accountMatch[1].trim();
    data.landlord.branchCode = accountMatch[2].trim();
  }

  // Extract Tenant details
  const tenantMatch = text.match(/1\.2\s+THE\s+TENANT:\s*(.+?)(?:\n|REGISTRATION)/is);
  if (tenantMatch) {
    data.tenant.name = tenantMatch[1].trim();
  }

  // Get tenant registration number (second occurrence after landlord)
  const regMatches = text.matchAll(/REGISTRATION\s+NO:\s*([0-9/]+)/gi);
  const regArray = Array.from(regMatches);
  if (regArray.length > 1) {
    data.tenant.regNo = regArray[1][1].trim();
  }

  // Get tenant VAT number (second occurrence after landlord)
  const vatMatches = text.matchAll(/VAT\s+REGISTRATION\s+NO:\s*([0-9]+)/gi);
  const vatArray = Array.from(vatMatches);
  if (vatArray.length > 1) {
    data.tenant.vatNo = vatArray[1][1].trim();
  }

  // Extract addresses - look for POSTAL: PHYSICAL: section
  const addressSectionMatch = text.match(/POSTAL:\s*PHYSICAL:\s*((?:[^\n]+\n)+?)(?=TRADING|1\.3)/is);
  if (addressSectionMatch) {
    const addressLines = addressSectionMatch[1].split('\n').map(l => l.trim()).filter(l => l && !l.match(/^\s*$/));
    
    // Find where physical address starts (usually has UNIT again)
    let physicalStart = -1;
    for (let i = 0; i < addressLines.length; i++) {
      if (addressLines[i].match(/^UNIT\s+\d+/i) && i > 0) {
        physicalStart = i;
        break;
      }
    }
    
    if (physicalStart > 0) {
      data.tenant.postalAddress = addressLines.slice(0, physicalStart).join(', ');
      data.tenant.physicalAddress = addressLines.slice(physicalStart).join(', ');
    } else if (addressLines.length > 0) {
      // If no clear separation, use all as both addresses
      const fullAddress = addressLines.join(', ');
      data.tenant.postalAddress = fullAddress;
      data.tenant.physicalAddress = fullAddress;
    }
  }

  const tradingMatch = text.match(/TRADING\s+AS:\s*(.+?)(?:\n|1\.3)/is);
  if (tradingMatch) {
    data.tenant.tradingAs = tradingMatch[1].trim();
  }

  // Extract Premises details
  const premisesMatch = text.match(/1\.3\s+THE\s+PREMISES:\s*(.+?)(?:\n|1\.4)/is);
  if (premisesMatch) {
    data.premises.unit = premisesMatch[1].trim();
  }

  const buildingNameMatch = text.match(/1\.4\s+BUILDING\s+NAME:\s*(.+?)(?:\n|1\.5)/is);
  if (buildingNameMatch) {
    data.premises.buildingName = buildingNameMatch[1].trim();
  }

  const buildingAddressMatch = text.match(/1\.5\s+BUILDING\s+ADDRESS:\s*(.+?)(?:\n|1\.6)/is);
  if (buildingAddressMatch) {
    data.premises.buildingAddress = buildingAddressMatch[1].trim();
  }

  const sizeMatch = text.match(/1\.6\s+PREMISES\s+MEASUREMENTS[^:]*:\s*(.+?)(?:\n|1\.7)/is);
  if (sizeMatch) {
    data.premises.size = sizeMatch[1].trim();
  }

  const percentageMatch = text.match(/1\.7[^:]*PERCENTAGE[^:]*:\s*([0-9.]+%)/is);
  if (percentageMatch) {
    data.premises.percentage = percentageMatch[1].trim();
  }

  const permittedUseMatch = text.match(/1\.8\s+PERMITTED\s+USE[^:]*:\s*(.+?)(?:\n|1\.9)/is);
  if (permittedUseMatch) {
    data.premises.permittedUse = permittedUseMatch[1].replace(/\n/g, ' ').trim();
  }

  // Extract Lease terms
  const yearsMatch = text.match(/1\.9[^:]*YEARS\s+(\d+)/is);
  if (yearsMatch) {
    data.lease.years = parseInt(yearsMatch[1]);
  }

  const monthsMatch = text.match(/MONTHS\s+(\d+)/i);
  if (monthsMatch) {
    data.lease.months = parseInt(monthsMatch[1]);
  }

  const commencementMatch = text.match(/COMMENCEMENT\s+DATE:\s*(\d{1,2}\s+\w+\s+\d{4})/i);
  if (commencementMatch) {
    const dateStr = commencementMatch[1];
    const date = parseDate(dateStr);
    if (date) {
      data.lease.commencementDate = date.toISOString().split('T')[0];
    }
  }

  const terminationMatch = text.match(/TERMINATION\s+DATE:\s*(\d{1,2}\s+\w+\s+\d{4})/i);
  if (terminationMatch) {
    const dateStr = terminationMatch[1];
    const date = parseDate(dateStr);
    if (date) {
      data.lease.terminationDate = date.toISOString().split('T')[0];
    }
  }

  const optionYearsMatch = text.match(/1\.10[^:]*YEARS\s+(\d+)/is);
  if (optionYearsMatch) {
    data.lease.optionYears = parseInt(optionYearsMatch[1]);
  }

  const optionMonthsMatch = text.match(/OPTION[^:]*MONTHS\s+(\d+)/is);
  if (optionMonthsMatch) {
    data.lease.optionMonths = parseInt(optionMonthsMatch[1]);
  }

  const optionExerciseMatch = text.match(/TO\s+BE\s+EXERCISED\s+BY\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (optionExerciseMatch) {
    const dateStr = optionExerciseMatch[1];
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      data.lease.optionExerciseDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }

  // Extract Surety details
  const suretyNameMatch = text.match(/1\.11\s+SURETY\s+NAME:\s*(.+?)(?:\n|ID)/is);
  if (suretyNameMatch) {
    data.surety.name = suretyNameMatch[1].trim();
  }

  const suretyIDMatch = text.match(/ID\s+NUMBER:\s*([0-9]{13})/i);
  if (suretyIDMatch) {
    data.surety.idNumber = suretyIDMatch[1].trim();
  }

  const suretyAddressMatch = text.match(/ADDRESS:\s*(.+?)(?:\n|1\s+INITIAL|1\.12)/is);
  if (suretyAddressMatch) {
    data.surety.address = suretyAddressMatch[1].trim();
  }

  // Extract Financial details - Year 1
  const year1RentMatch = text.match(/R\s+([0-9\s,]+\.\d{2})\s+R\s+([0-9\s,]+\.\d{2})\s+R\s+([0-9\s,]+\.\d{2})/);
  if (year1RentMatch) {
    data.financial.year1.basicRent = year1RentMatch[1].replace(/\s+/g, '').replace(/,/g, '');
    data.financial.year1.security = year1RentMatch[3].replace(/\s+/g, '').replace(/,/g, '');
  }

  const year1RefuseMatch = text.match(/\*REFUSE\s*-\s*R\s+([0-9,]+\.\d{2})\s+p\/m/i);
  if (year1RefuseMatch) {
    data.financial.year1.refuse = year1RefuseMatch[1].replace(/,/g, '');
  }

  const year1RatesMatch = text.match(/\*R\s+([0-9,]+\.\d{2})\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})/);
  if (year1RatesMatch) {
    data.financial.year1.rates = year1RatesMatch[1].replace(/,/g, '');
    data.financial.year1.from = parseDateString(year1RatesMatch[2]);
    data.financial.year1.to = parseDateString(year1RatesMatch[3]);
  }

  // Extract Year 2
  const year2Matches = text.match(/R\s+([0-9\s,]+\.\d{2})\s+R\s+([0-9\s,]+\.\d{2})\s+R\s+([0-9\s,]+\.\d{2})/g);
  if (year2Matches && year2Matches.length > 1) {
    const year2Match = year2Matches[1].match(/R\s+([0-9\s,]+\.\d{2})\s+R\s+([0-9\s,]+\.\d{2})\s+R\s+([0-9\s,]+\.\d{2})/);
    if (year2Match) {
      data.financial.year2.basicRent = year2Match[1].replace(/\s+/g, '').replace(/,/g, '');
      data.financial.year2.security = year2Match[3].replace(/\s+/g, '').replace(/,/g, '');
    }
  }

  const year2DatesMatch = text.match(/(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})/g);
  if (year2DatesMatch && year2DatesMatch.length > 1) {
    const dates = year2DatesMatch[1].split(/\s+/);
    if (dates.length === 2) {
      data.financial.year2.from = parseDateString(dates[0]);
      data.financial.year2.to = parseDateString(dates[1]);
    }
  }

  // Extract Year 3
  if (year2Matches && year2Matches.length > 2) {
    const year3Match = year2Matches[2].match(/R\s+([0-9\s,]+\.\d{2})\s+R\s+([0-9\s,]+\.\d{2})\s+R\s+([0-9\s,]+\.\d{2})/);
    if (year3Match) {
      data.financial.year3.basicRent = year3Match[1].replace(/\s+/g, '').replace(/,/g, '');
      data.financial.year3.security = year3Match[3].replace(/\s+/g, '').replace(/,/g, '');
    }
  }

  if (year2DatesMatch && year2DatesMatch.length > 2) {
    const dates = year2DatesMatch[2].split(/\s+/);
    if (dates.length === 2) {
      data.financial.year3.from = parseDateString(dates[0]);
      data.financial.year3.to = parseDateString(dates[1]);
    }
  }

  // Extract utilities
  const utilitiesMatch = text.match(/SEWERAGE\s+&\s+WATER\s+(.+?)(?:\n|\*)/is);
  if (utilitiesMatch) {
    data.financial.utilities = utilitiesMatch[1].trim();
  }

  // Extract Deposit
  const depositMatch = text.match(/1\.13\s+DEPOSIT\s*-\s*R\s+([0-9,\s]+\.\d{2})/i);
  if (depositMatch) {
    data.financial.deposit = depositMatch[1].replace(/\s+/g, '').replace(/,/g, '');
  }

  // Extract Lease Fee
  const leaseFeeMatch = text.match(/1\.17[^:]*R\s+([0-9,]+\.\d{2})/is);
  if (leaseFeeMatch) {
    data.financial.leaseFee = leaseFeeMatch[1].replace(/,/g, '');
  }

  // Extract Additional fields
  const turnoverMatch = text.match(/1\.14\.1\s+TURNOVER\s+PERCENTAGE\s+(.+?)(?:\n|1\.14)/is);
  if (turnoverMatch) {
    data.financial.turnoverPercentage = turnoverMatch[1].trim();
  }

  const yearEndMatch = text.match(/1\.14\.2\s+TENANT'S\s+FINANCIAL\s+YEAR\s+END:\s*(.+?)(?:\n|1\.14)/is);
  if (yearEndMatch) {
    data.financial.financialYearEnd = yearEndMatch[1].trim();
  }

  const minTurnoverMatch = text.match(/1\.14\.3\s+MINIMUM\s+TURNOVER[^:]*:\s*(.+?)(?:\n|1\.15)/is);
  if (minTurnoverMatch) {
    data.financial.minimumTurnover = minTurnoverMatch[1].trim();
  }

  const advertisingMatch = text.match(/1\.15[^:]*:\s*(.+?)(?:\n|1\.16)/is);
  if (advertisingMatch) {
    data.financial.advertisingContribution = advertisingMatch[1].replace(/\n/g, ' ').trim();
  }

  const bankAccountMatch = text.match(/1\.16[^:]*:\s*(.+?)(?:\n|1\.17)/is);
  if (bankAccountMatch) {
    data.financial.tenantBankAccount = bankAccountMatch[1].trim();
  }

  return data;
};

/**
 * Parse date string like "01 MARCH 2026" to Date object
 */
function parseDate(dateStr) {
  const months = {
    'january': 0, 'february': 1, 'march': 2, 'april': 3,
    'may': 4, 'june': 5, 'july': 6, 'august': 7,
    'september': 8, 'october': 9, 'november': 10, 'december': 11
  };

  const parts = dateStr.trim().split(/\s+/);
  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const month = months[parts[1].toLowerCase()];
    const year = parseInt(parts[2]);
    if (month !== undefined && !isNaN(day) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  return null;
}

/**
 * Parse date string like "01/03/2026" to YYYY-MM-DD format
 */
function parseDateString(dateStr) {
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return '';
}

