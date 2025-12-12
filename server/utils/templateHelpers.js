// utils/templateHelpers.js

function escapeHtml(input) {
  if (input == null) return '';
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function currencyR(amount) {
  if (amount == null || isNaN(amount)) return '';
  // Use Intl then normalize to "R 12 345.67" (space after R; regular spaces)
  const formatted = new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));
  // Some environments emit non-breaking spaces; normalize for consistency:
  return formatted.replace(/\u00A0/g, ' ');
}

function vatInclusive(amount, rate = 0.15) {
  if (amount == null || isNaN(amount)) return '';
  return currencyR(Number(amount) * (1 + rate));
}

function formatDateShort(isoOrDate) {
  const d = isoOrDate ? new Date(isoOrDate) : null;
  if (!d || isNaN(d)) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatDateLong(isoOrDate) {
  const d = isoOrDate ? new Date(isoOrDate) : null;
  if (!d || isNaN(d)) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const months = [
    'JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE',
    'JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'
  ];
  const MMMM = months[d.getMonth()];
  const yyyy = d.getFullYear();
  return `${dd} ${MMMM} ${yyyy}`; // e.g., "01 MARCH 2026"
}

function addressToHtml(address) {
  // Split on commas and trim; join with <br/> to preserve line breaks:
  if (!address) return '';
  return address
    .split(',')
    .map(s => escapeHtml(s.trim()))
    .filter(Boolean)
    .join('<br/>');
}

function orNA(value) {
  const v = (value === 0 ? '0' : value); // keep zero as a valid value
  return v == null || v === '' ? 'N/A' : escapeHtml(v);
}

module.exports = {
  escapeHtml,
  currencyR,
  vatInclusive,
  formatDateShort,
  formatDateLong,
  addressToHtml,
  orNA
};



