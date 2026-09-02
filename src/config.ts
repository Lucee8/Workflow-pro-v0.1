/**
 * Centralized Application & UPI Payment Configuration
 */

export const UPI_CONFIG = {
  // UPI ID (VPA) for receiving invoice balance payments
  upiId: 'aradhyabhise-1@okhdfcbank',
  payeeName: 'Bhisez Furniture',
  currency: 'INR',
};

/**
 * Constructs standard UPI payment URI scheme for invoice balance clearance.
 * Amount is formatted to 2 decimal places.
 */
export function buildUPIPaymentString(options: {
  amount: number;
  invoiceRef: string;
  upiId?: string;
  payeeName?: string;
  currency?: string;
}): string {
  const upiId = options.upiId || (import.meta.env.VITE_UPI_ID as string) || UPI_CONFIG.upiId;
  const payeeName = options.payeeName || UPI_CONFIG.payeeName;
  const currency = options.currency || UPI_CONFIG.currency;
  const balanceAmount = Math.max(0, options.amount).toFixed(2);
  const note = `Invoice ${options.invoiceRef} Balance Payment`;

  return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${balanceAmount}&cu=${currency}&tn=${encodeURIComponent(note)}`;
}

/**
 * Generates dynamic UPI QR Code image URL via qrserver API.
 */
export function getUPIQRCodeUrl(upiString: string, size: number = 250): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(upiString)}`;
}
