import QRCode from 'qrcode';

/**
 * Centralized Application & UPI Payment Configuration
 * 
 * In India, direct bank account transfer via UPI uses the official NPCI VPA format:
 * <AccountNumber>@<IFSC>.ifsc.npci
 * 
 * For Hdfc Bank, Malwan:
 * Account: 50100705616156
 * IFSC: HDFC0009348
 * NPCI UPI VPA: 50100705616156@HDFC0009348.ifsc.npci
 */
export const UPI_CONFIG = {
  // Official NPCI Account+IFSC UPI VPA for direct bank clearance
  upiId: '50100705616156@HDFC0009348.ifsc.npci',
  payeeName: 'Aaradhya Mandar Bhise',
  businessName: 'Bhisez Furniture',
  currency: 'INR',
  bankName: 'Hdfc Bank, Malwan',
  accountNumber: '50100705616156',
  ifscCode: 'HDFC0009348',
};

/**
 * Retrieves the currently active UPI ID, checking for user-customized UPI ID in localStorage.
 */
export function getActiveUPIId(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('estimate_custom_upi_id');
    if (custom && custom.trim().length > 0) {
      return custom.trim();
    }
  }
  return (import.meta.env?.VITE_UPI_ID as string) || UPI_CONFIG.upiId;
}

/**
 * Retrieves the active payee name.
 */
export function getActivePayeeName(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('estimate_custom_payee_name');
    if (custom && custom.trim().length > 0) {
      return custom.trim();
    }
  }
  return UPI_CONFIG.payeeName;
}

/**
 * Constructs a fully compliant standard UPI payment URI scheme (NPCI standard).
 * 
 * CRITICAL FIXES FOR SCANNING ERRORS:
 * 1. The `@` symbol in `pa` parameter MUST NOT be percent-encoded as `%40`.
 *    PhonePe, Google Pay, Paytm, BHIM regex parsers fail when `%40` is present.
 * 2. If amount is 0 or negative, `am` parameter is omitted so scanning does not throw 'Invalid Amount'.
 * 3. Includes `tr` (Transaction Reference) and clean `tn` (Transaction Note).
 */
export function buildUPIPaymentString(options: {
  amount?: number;
  invoiceRef: string;
  upiId?: string;
  payeeName?: string;
  currency?: string;
}): string {
  const rawUpiId = options.upiId || getActiveUPIId();
  // Ensure the UPI ID is trimmed and retains literal '@'
  const upiId = rawUpiId.trim().replace(/%40/g, '@');
  const payeeName = (options.payeeName || getActivePayeeName()).trim();
  const currency = options.currency || UPI_CONFIG.currency;
  
  // Clean invoice reference (alphanumeric only, max 35 chars as per NPCI spec)
  const cleanRef = options.invoiceRef.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 35);
  const note = `Invoice ${cleanRef} Payment`;

  const params: string[] = [
    `pa=${upiId}`,
    `pn=${encodeURIComponent(payeeName)}`,
  ];

  // Only include amount if greater than 0
  if (typeof options.amount === 'number' && options.amount > 0) {
    params.push(`am=${options.amount.toFixed(2)}`);
  }

  params.push(`cu=${currency}`);
  params.push(`tn=${encodeURIComponent(note)}`);
  if (cleanRef) {
    params.push(`tr=${encodeURIComponent(cleanRef)}`);
  }

  return `upi://pay?${params.join('&')}`;
}

/**
 * Builds direct application deep links for Google Pay, PhonePe, and Paytm.
 * Prevents browsers from falling back to web search or Wikipedia on desktop/mobile.
 */
export function buildPaymentLinks(options: {
  amount?: number;
  invoiceRef: string;
  upiId?: string;
  payeeName?: string;
  currency?: string;
}) {
  const upiUri = buildUPIPaymentString(options);
  const upiQuery = upiUri.replace(/^upi:\/\/pay\?/, '');
  
  return {
    upiUri,
    // Google Pay Android Package Intent
    googlePayAndroid: `intent://pay?${upiQuery}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`,
    // Google Pay iOS Scheme
    googlePayIos: `gpay://upi/pay?${upiQuery}`,
    // PhonePe Android Package Intent
    phonepeAndroid: `intent://pay?${upiQuery}#Intent;scheme=upi;package=com.phonepe.app;end`,
    // Paytm Android Package Intent
    paytmAndroid: `intent://pay?${upiQuery}#Intent;scheme=upi;package=net.one97.paytm;end`,
  };
}

/**
 * Safely launches Google Pay without triggering a new tab search or Wikipedia redirect.
 */
export function launchGooglePay(options: {
  amount?: number;
  invoiceRef: string;
  upiId?: string;
  payeeName?: string;
}): void {
  if (typeof window === 'undefined') return;
  const links = buildPaymentLinks(options);
  const userAgent = navigator.userAgent || '';
  const isAndroid = /android/i.test(userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);

  if (isAndroid) {
    window.location.href = links.googlePayAndroid;
  } else if (isIOS) {
    window.location.href = links.googlePayIos;
    setTimeout(() => {
      window.location.href = links.upiUri;
    }, 1200);
  } else {
    window.location.href = links.upiUri;
  }
}

/**
 * Generates dynamic high-contrast UPI QR Code Data URL directly on the client.
 * 
 * CRITICAL FIXES FOR SCANNING ERRORS:
 * 1. Generates local base64 Data URL so no external network call (qrserver) is needed.
 * 2. Adds mandatory 2-module quiet zone (margin: 2) so phone cameras can distinguish
 *    the corner finder squares from surrounding borders and text.
 * 3. Uses error correction level 'M' (15% redundancy) for optimal balance of density and readability.
 */
export async function generateUPIQRCodeDataUrl(
  upiString: string,
  options?: { width?: number; margin?: number }
): Promise<string> {
  try {
    return await QRCode.toDataURL(upiString, {
      width: options?.width || 256,
      margin: options?.margin ?? 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to generate local QR code Data URL:', err);
    // Safe fallback URL
    return `https://api.qrserver.com/v1/create-qr-code/?size=${options?.width || 250}x${options?.width || 250}&margin=2&data=${encodeURIComponent(upiString)}`;
  }
}

/**
 * Backward compatibility wrapper.
 */
export function getUPIQRCodeUrl(upiString: string, size: number = 250): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=2&data=${encodeURIComponent(upiString)}`;
}

