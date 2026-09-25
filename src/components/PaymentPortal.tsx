import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Check, 
  Copy, 
  ExternalLink, 
  QrCode, 
  Smartphone, 
  Building2, 
  ArrowLeft, 
  CheckCircle2, 
  Receipt,
  CreditCard,
  Wallet,
  Lock,
  Sparkles,
  Info,
  ChevronRight
} from 'lucide-react';
import { 
  UPI_CONFIG, 
  buildUPIPaymentString, 
  buildPaymentLinks, 
  generateUPIQRCodeDataUrl 
} from '../config';

interface PaymentPortalProps {
  onExit?: () => void;
}

export default function PaymentPortal({ onExit }: PaymentPortalProps) {
  // Detect mobile OS
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/i.test(navigator.userAgent || '');
  const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent || '');
  const isMobile = isIOS || isAndroid || (typeof navigator !== 'undefined' && /mobile/i.test(navigator.userAgent || ''));

  // Parse query parameters
  const [params] = useState(() => {
    if (typeof window === 'undefined') return { amount: 0, invoiceRef: '', upiId: '', payeeName: '' };
    const sp = new URLSearchParams(window.location.search);
    const rawAmt = parseFloat(sp.get('am') || sp.get('amount') || '0');
    return {
      amount: isNaN(rawAmt) ? 0 : rawAmt,
      invoiceRef: sp.get('ref') || sp.get('invoiceRef') || sp.get('id') || 'INV-DIRECT',
      upiId: sp.get('pa') || sp.get('upiId') || UPI_CONFIG.upiId,
      payeeName: sp.get('pn') || sp.get('payeeName') || UPI_CONFIG.accountHolder,
    };
  });

  const { amount, invoiceRef, upiId, payeeName } = params;

  // States
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);
  const [autoTriggered, setAutoTriggered] = useState<boolean>(false);

  // Generate payment links and UPI URI
  const paymentLinks = React.useMemo(() => {
    return buildPaymentLinks({
      amount: amount > 0 ? amount : undefined,
      invoiceRef: invoiceRef,
      upiId: upiId,
      payeeName: payeeName,
    });
  }, [amount, invoiceRef, upiId, payeeName]);

  // Primary URL for Google Pay
  const googlePayUrl = isIOS 
    ? paymentLinks.googlePayIos 
    : paymentLinks.googlePayAndroid;

  // PhonePe URL
  const phonepeUrl = isIOS 
    ? paymentLinks.phonepeUri 
    : paymentLinks.phonepeAndroid;

  // Paytm URL
  const paytmUrl = isIOS 
    ? paymentLinks.paytmUri 
    : paymentLinks.paytmAndroid;

  // Generate local high-contrast QR code
  useEffect(() => {
    let mounted = true;
    generateUPIQRCodeDataUrl(paymentLinks.upiUri, { width: 320, margin: 2 })
      .then((dataUrl) => {
        if (mounted) setQrCodeDataUrl(dataUrl);
      })
      .catch((err) => {
        console.error('Failed to generate payment portal QR:', err);
      });
    return () => {
      mounted = false;
    };
  }, [paymentLinks.upiUri]);

  // Automatic launch attempt on mobile device load
  useEffect(() => {
    if (isMobile && !autoTriggered) {
      setAutoTriggered(true);
      const timer = setTimeout(() => {
        try {
          // On mobile Android, upiUri triggers the system intent picker or Google Pay
          window.location.href = isIOS ? paymentLinks.googlePayIos : paymentLinks.upiUri;
        } catch (e) {
          console.warn('Auto trigger prevented by browser', e);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isMobile, isIOS, paymentLinks, autoTriggered]);

  const copyToClipboard = (text: string, fieldName: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const copyAllBankDetails = () => {
    const details = [
      `Bhisez Furniture - Official Bank Details:`,
      `Account Holder: ${UPI_CONFIG.accountHolder}`,
      `Account Number: ${UPI_CONFIG.accountNumber}`,
      `IFSC Code: ${UPI_CONFIG.ifscCode}`,
      `Branch: ${UPI_CONFIG.branch}`,
      `Account Type: ${UPI_CONFIG.accountType}`,
      amount > 0 ? `Amount: ₹${amount.toFixed(2)}` : '',
      `Reference: ${invoiceRef}`,
      `UPI ID: ${upiId}`,
    ].filter(Boolean).join('\n');

    if (navigator.clipboard) {
      navigator.clipboard.writeText(details);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    }
  };

  const handleReturnToSite = () => {
    if (onExit) {
      onExit();
    } else {
      window.history.replaceState({}, '', '/');
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-between text-stone-800 font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-stone-200 px-4 py-3 sticky top-0 z-30 shadow-xs">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-700 flex items-center justify-center text-white font-black text-sm shadow-xs">
              B
            </div>
            <div>
              <h1 className="text-sm font-black text-stone-900 leading-tight tracking-tight">
                Bhisez Furniture
              </h1>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-bold">
                <ShieldCheck size={11} />
                <span>Verified Direct UPI & Bank Settlement</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleReturnToSite}
            className="text-stone-500 hover:text-stone-800 text-xs font-semibold px-2.5 py-1 rounded-lg border border-stone-200 hover:bg-stone-50 transition cursor-pointer flex items-center gap-1"
          >
            <ArrowLeft size={12} />
            <span>Back</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {/* Invoice Summary Card */}
        <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-start justify-between border-b border-stone-100 pb-3.5">
            <div>
              <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
                Invoice Reference
              </span>
              <span className="text-base font-black text-stone-900 font-mono">
                {invoiceRef}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
                Amount to Pay
              </span>
              <span className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">
                ₹{amount > 0 ? amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
              </span>
            </div>
          </div>

          {/* Primary Action Button: Pay with Google Pay */}
          <div className="space-y-2 pt-1">
            <a
              href={googlePayUrl}
              onClick={() => {
                // Fallback attempt to ensure app launch on all Android browser builds
                if (isAndroid) {
                  setTimeout(() => {
                    try {
                      window.location.href = paymentLinks.upiUri;
                    } catch (e) {}
                  }, 600);
                }
              }}
              className="w-full bg-[#1b9a59] hover:bg-[#158047] active:scale-[0.98] text-white py-4 px-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-md shadow-emerald-700/25 transition cursor-pointer text-center select-none"
              style={{ textDecoration: 'none' }}
            >
              <Smartphone size={20} />
              <span>PAY WITH GOOGLE PAY</span>
            </a>
            <p className="text-center text-[11px] text-stone-500 font-medium">
              Tap above to launch <strong>Google Pay</strong> with verified settlement details
            </p>
          </div>

          {/* Universal UPI App Chooser */}
          <div>
            <a
              href={paymentLinks.upiUri}
              className="w-full bg-stone-900 hover:bg-black active:scale-[0.98] text-white py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition text-center select-none"
              style={{ textDecoration: 'none' }}
            >
              <CreditCard size={15} />
              <span>Open Any UPI App (PhonePe / Paytm / BHIM)</span>
            </a>
          </div>

          {/* Dedicated Individual UPI Apps Grid */}
          <div className="pt-2 border-t border-stone-100">
            <span className="text-[10px] font-bold uppercase text-stone-400 tracking-wider block mb-2 text-center">
              Or Select Your Preferred Payment App
            </span>
            <div className="grid grid-cols-3 gap-2">
              {/* Google Pay */}
              <a
                href={googlePayUrl}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-stone-200 hover:border-emerald-500 hover:bg-emerald-50/40 text-stone-800 transition text-center"
                style={{ textDecoration: 'none' }}
              >
                <div className="w-8 h-8 rounded-full bg-[#1b9a59] text-white flex items-center justify-center font-black text-xs mb-1 shadow-xs">
                  G
                </div>
                <span className="text-[11px] font-extrabold">Google Pay</span>
              </a>

              {/* PhonePe */}
              <a
                href={phonepeUrl}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-stone-200 hover:border-purple-500 hover:bg-purple-50/40 text-stone-800 transition text-center"
                style={{ textDecoration: 'none' }}
              >
                <div className="w-8 h-8 rounded-full bg-[#5f259f] text-white flex items-center justify-center font-black text-xs mb-1 shadow-xs">
                  Pe
                </div>
                <span className="text-[11px] font-extrabold">PhonePe</span>
              </a>

              {/* Paytm */}
              <a
                href={paytmUrl}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-stone-200 hover:border-sky-500 hover:bg-sky-50/40 text-stone-800 transition text-center"
                style={{ textDecoration: 'none' }}
              >
                <div className="w-8 h-8 rounded-full bg-[#00b9f5] text-white flex items-center justify-center font-black text-xs mb-1 shadow-xs">
                  ₹
                </div>
                <span className="text-[11px] font-extrabold">Paytm</span>
              </a>
            </div>
          </div>
        </div>

        {/* QR Code Card for Scanning */}
        <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 shadow-sm space-y-3 text-center">
          <div className="flex items-center justify-center gap-1.5 text-stone-700 font-bold text-xs">
            <QrCode size={16} className="text-emerald-600" />
            <span>Scan QR Code with Google Pay / Any UPI App</span>
          </div>

          <div className="flex justify-center my-2">
            <div className="p-3 bg-white border-2 border-stone-200 rounded-2xl shadow-xs inline-block">
              {qrCodeDataUrl ? (
                <img 
                  src={qrCodeDataUrl} 
                  alt="Google Pay UPI QR Code" 
                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain block" 
                />
              ) : (
                <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center text-stone-400 text-xs font-medium">
                  Generating QR Code...
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-50 border border-stone-200 rounded-full text-[11px] font-mono font-bold text-stone-700">
              <span>{upiId}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(upiId, 'upiId')}
                className="hover:text-emerald-600 transition cursor-pointer p-0.5"
                title="Copy UPI ID"
              >
                {copiedField === 'upiId' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              </button>
            </div>
            <p className="text-[10px] text-stone-400">
              Payee: <strong className="text-stone-700">{payeeName}</strong>
            </p>
          </div>
        </div>

        {/* Direct Bank Transfer Details Card */}
        <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-emerald-700" />
              <h3 className="text-xs font-black uppercase tracking-wider text-stone-800">
                Direct Bank Transfer Details
              </h3>
            </div>
            <button
              type="button"
              onClick={copyAllBankDetails}
              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
            >
              {copiedAll ? <Check size={12} /> : <Copy size={12} />}
              <span>{copiedAll ? 'Copied All!' : 'Copy All'}</span>
            </button>
          </div>

          {/* Tip for Google Pay Bank Transfer */}
          <div className="bg-amber-50/80 border border-amber-200 p-2.5 rounded-xl text-xs text-amber-900 flex items-start gap-2">
            <Info size={14} className="text-amber-700 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>Tip for Google Pay:</strong> Tap <strong>"Bank transfer"</strong> on the Google Pay home screen and paste our Account Number and IFSC code below for instant direct transfer.
            </div>
          </div>

          <div className="space-y-2 text-xs bg-stone-50/80 p-3.5 rounded-2xl border border-stone-200">
            <div className="flex items-center justify-between py-1 border-b border-stone-200/60">
              <span className="text-stone-500 font-medium">Account Holder</span>
              <span className="font-bold text-stone-900 text-right">{UPI_CONFIG.accountHolder}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-stone-200/60">
              <span className="text-stone-500 font-medium">Account Number</span>
              <div className="flex items-center gap-1.5 font-mono font-extrabold text-stone-900">
                <span>{UPI_CONFIG.accountNumber}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(UPI_CONFIG.accountNumber, 'acc')}
                  className="p-1 hover:text-emerald-600 transition cursor-pointer"
                  title="Copy Account Number"
                >
                  {copiedField === 'acc' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-stone-200/60">
              <span className="text-stone-500 font-medium">IFSC Code</span>
              <div className="flex items-center gap-1.5 font-mono font-extrabold text-stone-900">
                <span>{UPI_CONFIG.ifscCode}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(UPI_CONFIG.ifscCode, 'ifsc')}
                  className="p-1 hover:text-emerald-600 transition cursor-pointer"
                  title="Copy IFSC Code"
                >
                  {copiedField === 'ifsc' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-stone-200/60">
              <span className="text-stone-500 font-medium">Branch</span>
              <span className="font-bold text-stone-900">{UPI_CONFIG.branch}</span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-stone-500 font-medium">Account Type</span>
              <span className="font-bold text-stone-900">{UPI_CONFIG.accountType}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-stone-500 bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-xl">
            <Lock size={12} className="text-emerald-600 shrink-0" />
            <span>Payments made through Google Pay, PhonePe, Paytm, or direct NEFT/IMPS credit directly to SUKALWAD branch account with zero commission.</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-[10px] text-stone-400 border-t border-stone-200 bg-white">
        <p>Bhisez Furniture, Near Bus Stand, Sukalwad-416534 • Official Settlement Portal</p>
      </footer>
    </div>
  );
}
