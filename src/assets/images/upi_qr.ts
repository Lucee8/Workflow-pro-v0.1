// Embedded SVG fallback and utilities for quotation UPI payment
export const DEFAULT_UPI_QR_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <rect width="200" height="200" fill="#ffffff" rx="8"/>
  <!-- Corner Squares -->
  <rect x="20" y="20" width="45" height="45" fill="#000000" rx="4"/>
  <rect x="28" y="28" width="29" height="29" fill="#ffffff" rx="2"/>
  <rect x="34" y="34" width="17" height="17" fill="#000000" rx="2"/>

  <rect x="135" y="20" width="45" height="45" fill="#000000" rx="4"/>
  <rect x="143" y="28" width="29" height="29" fill="#ffffff" rx="2"/>
  <rect x="149" y="34" width="17" height="17" fill="#000000" rx="2"/>

  <rect x="20" y="135" width="45" height="45" fill="#000000" rx="4"/>
  <rect x="28" y="143" width="29" height="29" fill="#ffffff" rx="2"/>
  <rect x="34" y="149" width="17" height="17" fill="#000000" rx="2"/>

  <!-- Center and Data Matrix Pattern -->
  <rect x="75" y="25" width="12" height="12" fill="#000000"/>
  <rect x="95" y="25" width="12" height="12" fill="#000000"/>
  <rect x="115" y="25" width="12" height="12" fill="#000000"/>

  <rect x="75" y="45" width="12" height="24" fill="#000000"/>
  <rect x="95" y="45" width="25" height="12" fill="#000000"/>

  <rect x="25" y="75" width="25" height="12" fill="#000000"/>
  <rect x="60" y="75" width="12" height="12" fill="#000000"/>
  <rect x="80" y="75" width="40" height="12" fill="#000000"/>
  <rect x="130" y="75" width="15" height="25" fill="#000000"/>
  <rect x="155" y="75" width="25" height="12" fill="#000000"/>

  <rect x="25" y="95" width="12" height="25" fill="#000000"/>
  <rect x="45" y="95" width="25" height="12" fill="#000000"/>
  <rect x="80" y="95" width="25" height="25" fill="#1b9a59" rx="3"/>
  <text x="92.5" y="112" font-size="12" font-family="sans-serif" font-weight="900" fill="#ffffff" text-anchor="middle">₹</text>
  
  <rect x="115" y="95" width="12" height="25" fill="#000000"/>
  <rect x="155" y="95" width="25" height="12" fill="#000000"/>

  <rect x="75" y="130" width="12" height="40" fill="#000000"/>
  <rect x="95" y="130" width="25" height="12" fill="#000000"/>
  <rect x="130" y="130" width="15" height="15" fill="#000000"/>
  <rect x="155" y="130" width="25" height="25" fill="#000000"/>

  <rect x="95" y="150" width="25" height="25" fill="#000000"/>
  <rect x="130" y="155" width="15" height="25" fill="#000000"/>
  <rect x="155" y="165" width="25" height="15" fill="#000000"/>
</svg>
`)}`;
