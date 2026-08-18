/**
 * Global Asset Registry & Resilient Asset Provider
 * Provides unified image asset imports with built-in fallbacks to prevent
 * missing asset crashes across local environments, clones, or builds.
 */

import logoImage from "../assets/images/logo.png";
import upiQrImage from "../assets/images/UPI QR code.jpeg";
import signatureImage from "../assets/images/Authorized Signatory.png";

// Default SVG signature fallback
export const DEFAULT_SIGNATURE_DATA = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns='http://www.w3.org/2000/svg' width='300' height='100' viewBox='0 0 300 100'>
  <style>
    .sig { font-family: 'Brush Script MT', 'Dancing Script', 'Caveat', cursive, sans-serif; font-size: 38px; fill: #1e293b; font-weight: bold; }
    .sub { font-family: sans-serif; font-size: 11px; fill: #64748b; font-weight: 600; letter-spacing: 1px; }
  </style>
  <path d='M 30 55 Q 50 15 70 50 T 110 40 T 140 60 T 180 35 T 220 55 T 260 45' stroke='#1e293b' stroke-width='2.5' fill='none' stroke-linecap='round'/>
  <text x='40' y='55' class='sig'>Mandar Bhise</text>
  <line x1='30' y1='70' x2='270' y2='70' stroke='#94a3b8' stroke-width='1' stroke-dasharray='4 2'/>
  <text x='75' y='86' class='sub'>FOR BHISEZ FURNITURE</text>
</svg>
`)}`;

// Default UPI QR code SVG Fallback
export const DEFAULT_UPI_QR_DATA = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <rect width="200" height="200" fill="#ffffff" rx="8"/>
  <rect x="20" y="20" width="45" height="45" fill="#1e293b" rx="4"/>
  <rect x="26" y="26" width="33" height="33" fill="#ffffff" rx="2"/>
  <rect x="32" y="32" width="21" height="21" fill="#1e293b"/>
  
  <rect x="135" y="20" width="45" height="45" fill="#1e293b" rx="4"/>
  <rect x="141" y="26" width="33" height="33" fill="#ffffff" rx="2"/>
  <rect x="147" y="32" width="21" height="21" fill="#1e293b"/>
  
  <rect x="20" y="135" width="45" height="45" fill="#1e293b" rx="4"/>
  <rect x="26" y="141" width="33" height="33" fill="#ffffff" rx="2"/>
  <rect x="32" y="147" width="21" height="21" fill="#1e293b"/>
  
  <rect x="80" y="25" width="12" height="12" fill="#1e293b"/>
  <rect x="100" y="35" width="15" height="15" fill="#1e293b"/>
  <rect x="85" y="60" width="30" height="10" fill="#1e293b"/>
  <rect x="30" y="80" width="40" height="12" fill="#1e293b"/>
  <rect x="85" y="85" width="30" height="30" fill="#1e293b" rx="2"/>
  <rect x="92" y="92" width="16" height="16" fill="#ffffff"/>
  <rect x="96" y="96" width="8" height="8" fill="#1e293b"/>
  
  <rect x="135" y="80" width="20" height="15" fill="#1e293b"/>
  <rect x="165" y="90" width="15" height="20" fill="#1e293b"/>
  <rect x="80" y="135" width="15" height="30" fill="#1e293b"/>
  <rect x="110" y="140" width="25" height="15" fill="#1e293b"/>
  <rect x="145" y="135" width="35" height="12" fill="#1e293b"/>
  <rect x="140" y="160" width="40" height="20" fill="#1e293b"/>
</svg>
`)}`;

export const companyLogoImg = logoImage || '/logo.png';
export const logoImg = logoImage || '/logo.png';
export const upiQrImg = upiQrImage || '/assets/UPI QR code.jpeg' || DEFAULT_UPI_QR_DATA;
export const signatureImg = signatureImage || '/Authorized Signatory.png' || DEFAULT_SIGNATURE_DATA;

export default {
  companyLogoImg,
  logoImg,
  upiQrImg,
  signatureImg,
  DEFAULT_SIGNATURE_DATA,
  DEFAULT_UPI_QR_DATA
};
