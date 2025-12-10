export const generateLeaseDocument = (tenantData, leaseDetails) => {
  const formatCurrency = (amount) => {
    if (!amount) return 'N/A';
    return `R ${parseFloat(amount).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    // Format as YYYY/MM/DD for professional appearance
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  };

  const formatDateLong = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZA', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const calculateLeaseDuration = () => {
    if (!leaseDetails.leaseStartDate || !leaseDetails.leaseEndDate) return 'N/A';
    const start = new Date(leaseDetails.leaseStartDate);
    const end = new Date(leaseDetails.leaseEndDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const months = Math.floor(diffDays / 30);
    const days = diffDays % 30;
    return `${months} month(s) and ${days} day(s)`;
  };

  const leaseText = `
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║                          AGREEMENT OF LEASE                                   ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝


                                                                    Date: ${formatDate(new Date().toISOString())}


This Lease Agreement ("Agreement") is entered into on ${formatDateLong(new Date().toISOString())}, 
between the Landlord and Tenant identified below.


╔═══════════════════════════════════════════════════════════════════════════════╗
║                             1. PARTIES                                        ║
╚═══════════════════════════════════════════════════════════════════════════════╝


  ┌─ LANDLORD ────────────────────────────────────────────────────────────────┐
  │                                                                             │
  │  Name:     ${(leaseDetails.landlordName || '[Landlord Name]').padEnd(50)}│
  │  Email:    ${(leaseDetails.landlordEmail || '[landlord@email.com]').padEnd(50)}│
  │  Phone:    ${(leaseDetails.landlordPhone || '[000-000-0000]').padEnd(50)}│
  │                                                                             │
  └─────────────────────────────────────────────────────────────────────────────┘


  ┌─ TENANT ───────────────────────────────────────────────────────────────────┐
  │                                                                             │
  │  Name:          ${(tenantData.fullName || '[Tenant Name]').padEnd(45)}│
  │  ID Number:     ${(tenantData.idNumber || '[ID Number]').padEnd(45)}│
  │  Email:         ${(tenantData.email || '[tenant@email.com]').padEnd(45)}│
  │  Phone:         ${(tenantData.phone || '[Phone Number]').padEnd(45)}│
  │  Address:       ${(tenantData.address || '[Residential Address]').padEnd(45)}│
${tenantData.employment ? `  │  Occupation:    ${tenantData.employment.padEnd(45)}│` : ''}
${tenantData.income ? `  │  Monthly Income: ${tenantData.income.padEnd(45)}│` : ''}
  │                                                                             │
  └─────────────────────────────────────────────────────────────────────────────┘

╔═══════════════════════════════════════════════════════════════════════════════╗
║                        2. PROPERTY DESCRIPTION                                ║
╚═══════════════════════════════════════════════════════════════════════════════╝


The Landlord hereby leases to the Tenant, and the Tenant hereby leases from the 
Landlord, the following described premises:


  ┌───────────────────────────────────────────────────────────────────────────┐
  │  Property Address:  ${(leaseDetails.propertyAddress || '[Property Address]').padEnd(40)}│
  │  Property Type:     ${(leaseDetails.propertyType || 'Residential').padEnd(40)}│
  └───────────────────────────────────────────────────────────────────────────┘


The Tenant shall have the exclusive right to use and occupy the Property for 
residential purposes only, subject to the terms and conditions of this Agreement.


╔═══════════════════════════════════════════════════════════════════════════════╗
║                        3. LEASE TERM AND POSSESSION                            ║
╚═══════════════════════════════════════════════════════════════════════════════╝


  TERM: This lease shall commence on ${formatDate(leaseDetails.leaseStartDate)} 
        ("Commencement Date") and shall terminate on ${formatDate(leaseDetails.leaseEndDate)} 
        ("Termination Date"), unless sooner terminated in accordance with the 
        provisions of this Agreement.

  DURATION: The lease term is ${calculateLeaseDuration()}.

  POSSESSION: The Tenant shall be entitled to possession of the Property on the 
              Commencement Date, provided that all required payments have been 
              made and this Agreement has been fully executed.

╔═══════════════════════════════════════════════════════════════════════════════╗
║                             4. RENTAL PAYMENTS                                 ║
╚═══════════════════════════════════════════════════════════════════════════════╝


  MONTHLY RENT: The Tenant agrees to pay to the Landlord a monthly rental 
                amount of ${formatCurrency(leaseDetails.monthlyRent)} 
                ("Monthly Rent"), payable in advance on or before the first day 
                of each calendar month during the term of this lease.

  PAYMENT METHOD: All rental payments shall be made by electronic transfer, 
                  direct deposit, or such other method as may be agreed upon 
                  in writing by the parties.

  LATE PAYMENT: If the Tenant fails to pay the Monthly Rent within five (5) 
                days of the due date, the Tenant shall pay a late fee as 
                permitted by applicable law. The Landlord reserves the right 
                to charge interest on overdue amounts at the maximum rate 
                permitted by law.


╔═══════════════════════════════════════════════════════════════════════════════╗
║                           5. SECURITY DEPOSIT                                  ║
╚═══════════════════════════════════════════════════════════════════════════════╝


  SECURITY DEPOSIT: The Tenant has deposited with the Landlord the sum of 
                    ${formatCurrency(leaseDetails.securityDeposit)} as security 
                    for the faithful performance by the Tenant of all terms and 
                    conditions of this Agreement.

  RETURN OF DEPOSIT: The security deposit, or any balance thereof, shall be 
                     returned to the Tenant within thirty (30) days after the 
                     termination of this lease and the Tenant's vacating of the 
                     Property, less any amounts properly deducted for damages, 
                     unpaid rent, or other charges permitted by law.

╔═══════════════════════════════════════════════════════════════════════════════╗
║                        6. UTILITIES AND SERVICES                              ║
╚═══════════════════════════════════════════════════════════════════════════════╝

UTILITIES: ${leaseDetails.utilities === 'Tenant' 
  ? 'The Tenant shall be responsible for all utilities including electricity, water, gas, internet, and other services connected to the Property.'
  : leaseDetails.utilities === 'Landlord'
  ? 'The Landlord shall be responsible for all utilities including electricity, water, gas, internet, and other services connected to the Property.'
  : leaseDetails.utilities === 'Shared'
  ? 'Utilities shall be shared between the Landlord and Tenant as agreed upon separately.'
  : 'Utility responsibilities shall be as agreed upon separately between the parties.'}

The Tenant agrees to maintain all utility accounts in good standing and to 
promptly pay all utility bills when due.

╔═══════════════════════════════════════════════════════════════════════════════╗
║                           7. MAINTENANCE AND REPAIRS                           ║
╚═══════════════════════════════════════════════════════════════════════════════╝

MAINTENANCE RESPONSIBILITY: ${leaseDetails.maintenance === 'Tenant'
  ? 'The Tenant shall be responsible for maintaining the Property in good condition and making all necessary repairs, except for structural repairs and major systems which remain the Landlord\'s responsibility.'
  : leaseDetails.maintenance === 'Landlord'
  ? 'The Landlord shall be responsible for maintaining the Property in good condition and making all necessary repairs.'
  : leaseDetails.maintenance === 'Shared'
  ? 'Maintenance responsibilities shall be shared between the Landlord and Tenant as agreed upon separately.'
  : 'Maintenance responsibilities shall be as agreed upon separately between the parties.'}

TENANT'S OBLIGATIONS: The Tenant agrees to:
- Keep the Property clean and sanitary
- Not commit waste or permit waste to be committed
- Notify the Landlord promptly of any needed repairs
- Use all fixtures, appliances, and systems in a reasonable manner

LANDLORD'S OBLIGATIONS: The Landlord agrees to:
- Maintain the Property in a habitable condition
- Comply with all applicable building and housing codes
- Make necessary repairs to keep the Property in good condition

╔═══════════════════════════════════════════════════════════════════════════════╗
║                        8. USE AND OCCUPANCY                                   ║
╚═══════════════════════════════════════════════════════════════════════════════╝

USE: The Property shall be used solely for residential purposes. The Tenant 
shall not use the Property for any business, commercial, or illegal purposes.

OCCUPANTS: The Property shall be occupied only by the Tenant and the following 
authorized occupants: [To be specified if applicable]

The Tenant shall not allow any other person to occupy the Property without the 
prior written consent of the Landlord.

╔═══════════════════════════════════════════════════════════════════════════════╗
║                           9. ALTERATIONS                                       ║
╚═══════════════════════════════════════════════════════════════════════════════╝

The Tenant shall not make any alterations, additions, or improvements to the 
Property without the prior written consent of the Landlord. Any alterations, 
additions, or improvements made with the Landlord's consent shall become the 
property of the Landlord upon termination of this lease, unless otherwise agreed 
in writing.

╔═══════════════════════════════════════════════════════════════════════════════╗
║                           10. SUBLETTING                                       ║
╚═══════════════════════════════════════════════════════════════════════════════╝

The Tenant shall not sublet the Property or assign this Agreement without the 
prior written consent of the Landlord. Any attempted subletting or assignment 
without consent shall be void and may result in termination of this Agreement.

╔═══════════════════════════════════════════════════════════════════════════════╗
║                       11. INSURANCE AND LIABILITY                             ║
╚═══════════════════════════════════════════════════════════════════════════════╝

The Tenant is strongly advised to obtain renter's insurance to protect their 
personal property. The Landlord's insurance does not cover the Tenant's 
personal belongings.

The Landlord shall not be liable for any damage to the Tenant's personal 
property, regardless of the cause, unless such damage is due to the Landlord's 
negligence or willful misconduct.

╔═══════════════════════════════════════════════════════════════════════════════╗
║                        12. DEFAULT AND TERMINATION                            ║
╚═══════════════════════════════════════════════════════════════════════════════╝

DEFAULT: The Tenant shall be in default of this Agreement if:
- The Tenant fails to pay rent when due
- The Tenant violates any term or condition of this Agreement
- The Tenant abandons the Property
- The Tenant uses the Property for illegal purposes

TERMINATION: Upon default by the Tenant, the Landlord may terminate this 
Agreement and pursue all remedies available under applicable law, including 
eviction proceedings.

EARLY TERMINATION: Either party may terminate this Agreement early only with 
the written consent of the other party or as otherwise provided by applicable law.

╔═══════════════════════════════════════════════════════════════════════════════╗
║                        13. QUIET ENJOYMENT                                     ║
╚═══════════════════════════════════════════════════════════════════════════════╝

The Landlord covenants that the Tenant, upon paying the rent and performing 
all covenants and conditions of this Agreement, shall and may peaceably and 
quietly have, hold, and enjoy the Property for the term of this lease.

╔═══════════════════════════════════════════════════════════════════════════════╗
║                        14. GOVERNING LAW                                       ║
╚═══════════════════════════════════════════════════════════════════════════════╝

This Agreement shall be governed by and construed in accordance with the laws 
of the Republic of South Africa. Any disputes arising under this Agreement 
shall be resolved in accordance with applicable South African law.

╔═══════════════════════════════════════════════════════════════════════════════╗
║                        15. ENTIRE AGREEMENT                                    ║
╚═══════════════════════════════════════════════════════════════════════════════╝

This Agreement contains the entire agreement between the parties and supersedes 
all prior negotiations, representations, or agreements, whether written or oral. 
This Agreement may not be modified except in writing signed by both parties.

╔═══════════════════════════════════════════════════════════════════════════════╗
║                             16. SIGNATURES                                     ║
╚═══════════════════════════════════════════════════════════════════════════════╝


IN WITNESS WHEREOF, the parties have executed this Lease Agreement on the date 
first written above.


  ┌─ LANDLORD ────────────────────────────────────────────────────────────────┐
  │                                                                             │
  │                                                                             │
  │  _________________________                    _________________________    │
  │  Signature                                   Date                          │
  │                                                                             │
  │  Print Name: ${(leaseDetails.landlordName || '[Landlord Name]').padEnd(50)}│
  │                                                                             │
  │                                                                             │
  └─────────────────────────────────────────────────────────────────────────────┘


  ┌─ WITNESS ─────────────────────────────────────────────────────────────────┐
  │                                                                             │
  │                                                                             │
  │  _________________________                    _________________________    │
  │  Signature                                   Date                          │
  │                                                                             │
  │  Print Name: _________________________                                      │
  │                                                                             │
  │                                                                             │
  └─────────────────────────────────────────────────────────────────────────────┘


  ┌─ TENANT ───────────────────────────────────────────────────────────────────┐
  │                                                                             │
  │                                                                             │
  │  _________________________                    _________________________    │
  │  Signature                                   Date                          │
  │                                                                             │
  │  Print Name: ${(tenantData.fullName || '[Tenant Name]').padEnd(50)}│
  │                                                                             │
  │                                                                             │
  └─────────────────────────────────────────────────────────────────────────────┘


  ┌─ WITNESS ─────────────────────────────────────────────────────────────────┐
  │                                                                             │
  │                                                                             │
  │  _________________________                    _________________________    │
  │  Signature                                   Date                          │
  │                                                                             │
  │  Print Name: _________________________                                      │
  │                                                                             │
  │                                                                             │
  └─────────────────────────────────────────────────────────────────────────────┘


╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║                              END OF AGREEMENT                                 ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝


Generated on: ${formatDate(new Date().toISOString())}
Document ID: LEASE-${Date.now()}
`;

  return leaseText;
};


