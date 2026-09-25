import React, { useState, useEffect } from 'react';
import { 
  X, 
  QrCode, 
  Check, 
  Copy, 
  Upload, 
  RefreshCw, 
  Building2, 
  CreditCard, 
  AlertCircle, 
  ExternalLink,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { 
  UPI_CONFIG, 
  buildUPIPaymentString, 
  generateUPIQRCodeDataUrl,
  launchGooglePay
} from '../config';

interface UPISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customUPIId: string;
  setCustomUPIId: (val: string) => void;
  customPayeeName: string;
  setCustomPayeeName: (val: string) => void;
  customQR: string | null;
  setCustomQR: (val: string | null) => void;
  sampleInvoiceRef?: string;
  sampleAmount?: number;
}

export const UPISettingsModal: React.FC<UPISettingsModalProps> = ({
  isOpen,
  onClose,
  customUPIId,
  setCustomUPIId,
  customPayeeName,
  setCustomPayeeName,
  customQR,
  setCustomQR,
  sampleInvoiceRef = 'QT-SAMPLE',
  sampleAmount = 5000,
}) => {
  const [mode, setMode] = useState<'npci' | 'custom'>(() => {
    return customUPIId && customUPIId !== UPI_CONFIG.upiId ? 'custom' : 'npci';
  });
  const [tempCustomUpi, setTempCustomUpi] = useState(customUPIId || '');
  const [tempPayeeName, setTempPayeeName] = useState(customPayeeName || UPI_CONFIG.payeeName);
  const [tempQRImage, setTempQRImage] = useState<string | null>(customQR);
  const [previewQRDataUrl, setPreviewQRDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Determine active effective UPI ID based on mode
  const effectiveUPIId = mode === 'npci' 
    ? UPI_CONFIG.upiId 
    : (tempCustomUpi.trim() || UPI_CONFIG.upiId);

  const effectivePayee = tempPayeeName.trim() || UPI_CONFIG.payeeName;

  // Generate live preview QR code whenever parameters change
  useEffect(() => {
    if (!isOpen) return;
    const upiString = buildUPIPaymentString({
      amount: sampleAmount,
      invoiceRef: sampleInvoiceRef,
      upiId: effectiveUPIId,
      payeeName: effectivePayee,
    });

    generateUPIQRCodeDataUrl(upiString, { width: 280, margin: 2 })
      .then((url) => setPreviewQRDataUrl(url))
      .catch((err) => console.error('Error generating preview QR:', err));
  }, [isOpen, effectiveUPIId, effectivePayee, sampleAmount, sampleInvoiceRef]);

  if (!isOpen) return null;

  const currentUpiString = buildUPIPaymentString({
    amount: sampleAmount,
    invoiceRef: sampleInvoiceRef,
    upiId: effectiveUPIId,
    payeeName: effectivePayee,
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setTempQRImage(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const finalUpi = mode === 'npci' ? '' : tempCustomUpi.trim();
    setCustomUPIId(finalUpi);
    if (finalUpi) {
      localStorage.setItem('estimate_custom_upi_id', finalUpi);
    } else {
      localStorage.removeItem('estimate_custom_upi_id');
    }

    const finalPayee = tempPayeeName.trim();
    setCustomPayeeName(finalPayee);
    if (finalPayee && finalPayee !== UPI_CONFIG.payeeName) {
      localStorage.setItem('estimate_custom_payee_name', finalPayee);
    } else {
      localStorage.removeItem('estimate_custom_payee_name');
    }

    setCustomQR(tempQRImage);
    if (tempQRImage) {
      localStorage.setItem('estimate_custom_qr', tempQRImage);
    } else {
      localStorage.removeItem('estimate_custom_qr');
    }

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 800);
  };

  const handleResetToDefault = () => {
    setMode('npci');
    setTempCustomUpi('');
    setTempPayeeName(UPI_CONFIG.payeeName);
    setTempQRImage(null);
    localStorage.removeItem('estimate_custom_upi_id');
    localStorage.removeItem('estimate_custom_payee_name');
    localStorage.removeItem('estimate_custom_qr');
    setCustomUPIId('');
    setCustomPayeeName('');
    setCustomQR(null);
  };

  const copyUpiId = () => {
    navigator.clipboard?.writeText(effectiveUPIId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const copyUpiLink = () => {
    navigator.clipboard?.writeText(currentUpiString);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div 
      id="upi-settings-modal-backdrop"
      className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-[70] p-3 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="upi-settings-modal-card"
        className="bg-white rounded-3xl shadow-2xl p-5 sm:p-6 w-full max-w-2xl my-6 border border-stone-200 text-stone-800 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-2xl">
              <QrCode size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-stone-900 leading-tight flex items-center gap-2">
                UPI Payment & QR Code Configuration
              </h2>
              <p className="text-xs text-stone-500 font-medium mt-0.5">
                Ensure error-free scanning in Google Pay, PhonePe, Paytm, BHIM, and banking apps.
              </p>
            </div>
          </div>
          <button
            id="upi-settings-close-btn"
            onClick={onClose}
            className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Bank & NPCI Info Banner */}
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3.5 flex items-start gap-3">
          <ShieldCheck size={20} className="text-emerald-700 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1 text-emerald-950">
            <div className="font-bold flex items-center gap-2">
              <span>SUKALWAD Branch Official NPCI Settlement Configured</span>
              <span className="bg-emerald-200 text-emerald-900 text-[10px] px-2 py-0.5 rounded-full font-extrabold">Active</span>
            </div>
            <p className="text-emerald-800 text-[11px] leading-relaxed">
              Payments route directly to <strong>{UPI_CONFIG.branch} Branch</strong>, Account: <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono font-bold">{UPI_CONFIG.accountNumber}</code> (IFSC: <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono font-bold">{UPI_CONFIG.ifscCode}</code>, Type: {UPI_CONFIG.accountType}).
            </p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
            Select Payment Routing Method
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* NPCI Bank Transfer Mode */}
            <div 
              onClick={() => setMode('npci')}
              className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                mode === 'npci'
                  ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                  : 'border-stone-200 hover:border-stone-300 bg-stone-50/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs text-stone-900">
                  <Building2 size={16} className={mode === 'npci' ? 'text-emerald-600' : 'text-stone-500'} />
                  <span>Direct Bank Account (NPCI)</span>
                </div>
                {mode === 'npci' && <Check size={16} className="text-emerald-600" />}
              </div>
              <p className="text-[11px] text-stone-500 mt-2 font-mono break-all font-semibold">
                {UPI_CONFIG.upiId}
              </p>
              <span className="text-[10px] text-emerald-700 font-bold mt-1">
                ✓ Recommended • Directly credits SUKALWAD account
              </span>
            </div>

            {/* Custom VPA Mode */}
            <div 
              onClick={() => setMode('custom')}
              className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                mode === 'custom'
                  ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                  : 'border-stone-200 hover:border-stone-300 bg-stone-50/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs text-stone-900">
                  <Smartphone size={16} className={mode === 'custom' ? 'text-emerald-600' : 'text-stone-500'} />
                  <span>Google Pay / PhonePe VPA</span>
                </div>
                {mode === 'custom' && <Check size={16} className="text-emerald-600" />}
              </div>
              <p className="text-[11px] text-stone-500 mt-2 font-medium">
                Enter your Google Pay UPI ID (e.g. mobile@okhdfcbank).
              </p>
              <span className="text-[10px] text-emerald-700 font-bold mt-1">
                ⭐ Best for phone cameras & Google Pay QR scanners
              </span>
            </div>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          {mode === 'custom' && (
            <div className="sm:col-span-2 space-y-1.5 bg-stone-50 p-3 rounded-2xl border border-stone-200">
              <label className="text-xs font-bold text-stone-700 flex items-center justify-between">
                <span>Google Pay / UPI ID (VPA)</span>
                <span className="text-[10px] font-semibold text-emerald-700">Prevents Wikipedia redirects</span>
              </label>
              <input
                type="text"
                value={tempCustomUpi}
                onChange={(e) => setTempCustomUpi(e.target.value)}
                placeholder="e.g. 9823xxxxxx@okhdfcbank or aaradhya@okhdfcbank"
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-xs font-mono font-medium outline-hidden bg-white"
              />
              {/* Quick Handle Suffix Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-stone-400 font-medium">Quick handles:</span>
                {[
                  '@okhdfcbank',
                  '@okaxis',
                  '@oksbi',
                  '@okicici',
                  '@hdfcbank',
                  '@ybl',
                  '@paytm'
                ].map((handle) => (
                  <button
                    key={handle}
                    type="button"
                    onClick={() => {
                      const base = tempCustomUpi.includes('@') 
                        ? tempCustomUpi.split('@')[0] 
                        : (tempCustomUpi.trim() || 'mandar.bhise');
                      setTempCustomUpi(`${base}${handle}`);
                    }}
                    className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-white hover:bg-emerald-50 text-stone-700 hover:text-emerald-800 border border-stone-200 hover:border-emerald-300 rounded-lg transition cursor-pointer"
                  >
                    {handle}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700">
              Payee Name (Account Holder / Firm)
            </label>
            <input
              type="text"
              value={tempPayeeName}
              onChange={(e) => setTempPayeeName(e.target.value)}
              placeholder="e.g. MANDAR NANDKISHOR BHISE"
              className="w-full px-3.5 py-2 rounded-xl border border-stone-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-xs font-medium outline-hidden"
            />
            <p className="text-[10px] text-stone-400">Must match the bank account holder or business name.</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700 flex items-center justify-between">
              <span>Optional Shop QR Standee</span>
              {tempQRImage && (
                <button
                  type="button"
                  onClick={() => setTempQRImage(null)}
                  className="text-[10px] text-rose-600 font-bold hover:underline cursor-pointer"
                >
                  Remove Upload
                </button>
              )}
            </label>
            <label className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-stone-300 hover:border-emerald-500 bg-stone-50 hover:bg-emerald-50/40 text-stone-600 hover:text-emerald-700 text-xs font-semibold cursor-pointer transition">
              <Upload size={14} />
              <span>{tempQRImage ? 'Replace Standee Image' : 'Upload Shop QR Photo'}</span>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
            </label>
            <p className="text-[10px] text-stone-400">Upload your physical shop's printed GPay standee photo if preferred.</p>
          </div>
        </div>

        {/* Live Preview Box */}
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex flex-col items-center">
            <div className="p-1.5 bg-white rounded-xl shadow-xs border border-stone-200">
              <img 
                src={tempQRImage || previewQRDataUrl} 
                alt="UPI QR Code Preview"
                className="w-32 h-32 object-contain block bg-white"
              />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded mt-1.5">
              {tempQRImage ? 'Shop QR Standee' : (mode === 'custom' ? 'Google Pay VPA QR' : 'NPCI Direct QR')}
            </span>
          </div>

          <div className="flex-1 space-y-2 text-xs w-full">
            <div>
              <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">Effective VPA Address</span>
              <div className="flex items-center gap-2 mt-0.5">
                <code className="bg-white border border-stone-200 px-2 py-1 rounded text-stone-900 font-mono text-[11px] font-bold break-all flex-1">
                  {effectiveUPIId}
                </code>
                <button
                  type="button"
                  onClick={copyUpiId}
                  className="p-1.5 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg text-stone-600 hover:text-emerald-600 transition cursor-pointer"
                  title="Copy UPI ID"
                >
                  {copiedUpi ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">Scan Compatibility</span>
              <p className="text-[11px] text-stone-600 leading-snug mt-0.5">
                ✓ Google Pay • PhonePe • Paytm • BHIM • HDFC MobileBanking • All UPI apps.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={copyUpiLink}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
              >
                {copiedLink ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedLink ? 'Link Copied!' : 'Copy Payment Link'}</span>
              </button>
              <span className="text-stone-300">•</span>
              <button
                type="button"
                onClick={() => {
                  const res = launchGooglePay({
                    amount: sampleAmount,
                    invoiceRef: sampleInvoiceRef,
                    upiId: effectiveUPIId,
                    payeeName: effectivePayee,
                  });
                    if (!res.isMobile) {
                    navigator.clipboard?.writeText(effectiveUPIId);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }
                }}
                className="text-[11px] font-bold text-stone-700 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                title="Test launching Google Pay with current parameters"              
              >
                <Smartphone size={13} />
                <span>Test Launch Google Pay</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-stone-100 pt-3">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="text-xs font-bold text-stone-500 hover:text-stone-800 flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw size={13} />
            <span>Reset to Bank Default ({UPI_CONFIG.branch})</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              {saveSuccess ? <Check size={14} /> : <QrCode size={14} />}
              <span>{saveSuccess ? 'Saved & Applied!' : 'Save & Update QR'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
