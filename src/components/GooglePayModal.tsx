import React, { useState } from 'react';
import { 
  X, 
  Check, 
  Copy, 
  Smartphone, 
  Building2, 
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  QrCode
} from 'lucide-react';
import { 
  UPI_CONFIG, 
  buildPaymentLinks, 
  launchGooglePay 
} from '../config';

interface GooglePayModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  invoiceRef: string;
  qrCodeUrl: string;
  effectiveUPIId: string;
  effectivePayeeName: string;
}

export const GooglePayModal: React.FC<GooglePayModalProps> = ({
  isOpen,
  onClose,
  amount,
  invoiceRef,
  qrCodeUrl,
  effectiveUPIId,
  effectivePayeeName,
}) => {
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedAcc, setCopiedAcc] = useState(false);
  const [copiedIfsc, setCopiedIfsc] = useState(false);
  const [copiedAllBank, setCopiedAllBank] = useState(false);

  if (!isOpen) return null;

  const paymentLinks = buildPaymentLinks({
    amount,
    invoiceRef,
    upiId: effectiveUPIId,
    payeeName: effectivePayeeName,
  });

  const handleCopyUpi = () => {
    navigator.clipboard?.writeText(effectiveUPIId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleCopyAcc = () => {
    navigator.clipboard?.writeText(UPI_CONFIG.accountNumber);
    setCopiedAcc(true);
    setTimeout(() => setCopiedAcc(false), 2000);
  };

  const handleCopyIfsc = () => {
    navigator.clipboard?.writeText(UPI_CONFIG.ifscCode);
    setCopiedIfsc(true);
    setTimeout(() => setCopiedIfsc(false), 2000);
  };

  const handleCopyAllBank = () => {
    const text = `Bank Transfer Details (Google Pay):\nAccount Number: ${UPI_CONFIG.accountNumber}\nIFSC Code: ${UPI_CONFIG.ifscCode}\nName: ${effectivePayeeName}\nBank: ${UPI_CONFIG.bankName}\nAmount: ₹${amount.toFixed(2)}`;
    navigator.clipboard?.writeText(text);
    setCopiedAllBank(true);
    setTimeout(() => setCopiedAllBank(false), 2000);
  };

  const handleOpenGPay = () => {
    launchGooglePay({
      amount,
      invoiceRef,
      upiId: effectiveUPIId,
      payeeName: effectivePayeeName,
    });
  };

  return (
    <div 
      id="gpay-payment-modal-backdrop"
      className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-[80] p-3 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="gpay-payment-modal-card"
        className="bg-white rounded-3xl shadow-2xl p-5 sm:p-6 w-full max-w-lg my-6 border border-stone-200 text-stone-800 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-stone-900 flex items-center justify-center text-white font-black text-sm shadow-xs">
              GPay
            </div>
            <div>
              <h2 className="text-base font-black text-stone-900 leading-tight">
                Pay with Google Pay & UPI
              </h2>
              <p className="text-xs text-stone-500 font-medium">
                Invoice {invoiceRef} • Amount Due: <strong className="text-emerald-700 font-black">₹{amount.toFixed(2)}</strong>
              </p>
            </div>
          </div>
          <button
            id="gpay-modal-close-btn"
            onClick={onClose}
            className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Wikipedia Scan Warning & Help Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-amber-900">
          <AlertTriangle size={17} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed text-[11px]">
            <strong>Important Scanning Tip:</strong>
            <p className="mt-0.5 text-amber-800">
              Open the <strong>Google Pay app</strong> first and tap <strong>"Scan any QR code"</strong>.
              Scanning with a generic phone camera or browser can search the web and open Wikipedia instead of Google Pay.
            </p>
          </div>
        </div>

        {/* QR Code and Scan Section */}
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-200/80">
          <div className="flex flex-col items-center">
            <div className="p-2 bg-white rounded-2xl shadow-sm border border-stone-200">
              <img 
                src={qrCodeUrl} 
                alt={`Google Pay QR code for ${invoiceRef}`}
                className="w-36 h-36 object-contain block bg-white"
              />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full mt-1.5 flex items-center gap-1">
              <QrCode size={10} /> Scan in Google Pay
            </span>
          </div>

          <div className="flex-1 space-y-2.5 text-xs w-full">
            <div>
              <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
                Payee UPI ID
              </span>
              <div className="flex items-center gap-2 mt-1">
                <code className="bg-white border border-stone-200 px-2 py-1 rounded text-stone-900 font-mono text-[11px] font-bold break-all flex-1">
                  {effectiveUPIId}
                </code>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="p-1.5 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg text-stone-700 hover:text-emerald-700 transition cursor-pointer shrink-0"
                  title="Copy UPI ID"
                >
                  {copiedUpi ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
                Recipient Name
              </span>
              <p className="font-bold text-stone-900 text-xs mt-0.5">
                {effectivePayeeName}
              </p>
            </div>

            {/* Mobile Instant App Trigger */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleOpenGPay}
                className="w-full bg-[#1b9a59] hover:bg-[#158047] active:scale-[0.98] text-white py-2 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
              >
                <Smartphone size={14} />
                <span>Open in Google Pay App</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bank Transfer in Google Pay Option */}
        <div className="border border-stone-200 rounded-2xl p-3.5 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-stone-900">
              <Building2 size={15} className="text-emerald-700" />
              <span>Direct Bank Transfer in Google Pay (0% Fee)</span>
            </div>
            <button
              type="button"
              onClick={handleCopyAllBank}
              className="text-[10px] text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              {copiedAllBank ? <Check size={12} /> : <Copy size={12} />}
              <span>{copiedAllBank ? 'Copied All!' : 'Copy Details'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-stone-50 p-2 rounded-xl border border-stone-100 flex items-center justify-between">
              <div>
                <span className="text-[9px] text-stone-400 block font-bold uppercase">Account No</span>
                <span className="font-mono font-bold text-stone-900">{UPI_CONFIG.accountNumber}</span>
              </div>
              <button 
                type="button" 
                onClick={handleCopyAcc} 
                className="p-1 hover:bg-stone-200 rounded text-stone-500 cursor-pointer"
              >
                {copiedAcc ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
              </button>
            </div>

            <div className="bg-stone-50 p-2 rounded-xl border border-stone-100 flex items-center justify-between">
              <div>
                <span className="text-[9px] text-stone-400 block font-bold uppercase">IFSC Code</span>
                <span className="font-mono font-bold text-stone-900">{UPI_CONFIG.ifscCode}</span>
              </div>
              <button 
                type="button" 
                onClick={handleCopyIfsc} 
                className="p-1 hover:bg-stone-200 rounded text-stone-500 cursor-pointer"
              >
                {copiedIfsc ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
              </button>
            </div>
          </div>

          <p className="text-[10px] text-stone-500">
            In Google Pay, tap <strong>"Bank transfer"</strong> on the home screen, paste these details, and send payment directly to HDFC Bank, Malwan.
          </p>
        </div>

        {/* Alternative App Links (PhonePe / Paytm) */}
        <div className="flex items-center justify-between text-[11px] pt-1">
          <span className="text-stone-400 font-medium">Other UPI Apps:</span>
          <div className="flex items-center gap-2">
            <a
              href={paymentLinks.phonepeAndroid}
              className="text-stone-600 hover:text-purple-700 font-bold px-2 py-1 rounded bg-stone-100 hover:bg-purple-50 transition text-[10px]"
            >
              PhonePe
            </a>
            <a
              href={paymentLinks.paytmAndroid}
              className="text-stone-600 hover:text-sky-700 font-bold px-2 py-1 rounded bg-stone-100 hover:bg-sky-50 transition text-[10px]"
            >
              Paytm
            </a>
            <a
              href={paymentLinks.upiUri}
              className="text-stone-600 hover:text-emerald-700 font-bold px-2 py-1 rounded bg-stone-100 hover:bg-emerald-50 transition text-[10px]"
            >
              Any UPI App
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-stone-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
