import React from 'react';
import { X, Upload, RotateCcw } from 'lucide-react';
import { buildUPIPaymentString, generateUPIQRCodeDataUrl, UPI_CONFIG } from '../config';

interface UPISettingsModalProps {
	isOpen: boolean;
	onClose: () => void;
	customUPIId: string;
	setCustomUPIId: React.Dispatch<React.SetStateAction<string>>;
	customPayeeName: string;
	setCustomPayeeName: React.Dispatch<React.SetStateAction<string>>;
	customQR: string | null;
	setCustomQR: React.Dispatch<React.SetStateAction<string | null>>;
	sampleInvoiceRef: string;
	sampleAmount: number;
}

export function UPISettingsModal({
	isOpen,
	onClose,
	customUPIId,
	setCustomUPIId,
	customPayeeName,
	setCustomPayeeName,
	customQR,
	setCustomQR,
	sampleInvoiceRef,
	sampleAmount,
}: UPISettingsModalProps) {
	const [previewQR, setPreviewQR] = React.useState('');

	React.useEffect(() => {
		if (!isOpen) return;

		const paymentString = buildUPIPaymentString({
			amount: sampleAmount,
			invoiceRef: sampleInvoiceRef,
			upiId: customUPIId || undefined,
			payeeName: customPayeeName || undefined,
		});

		generateUPIQRCodeDataUrl(paymentString, { width: 240, margin: 2 }).then(setPreviewQR);
	}, [isOpen, sampleAmount, sampleInvoiceRef, customUPIId, customPayeeName]);

	if (!isOpen) return null;

	const handleQrUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = () => {
			if (typeof reader.result === 'string') setCustomQR(reader.result);
		};
		reader.readAsDataURL(file);
	};

	const resetSettings = () => {
		setCustomUPIId('');
		setCustomPayeeName('');
		setCustomQR(null);
		localStorage.removeItem('estimate_custom_upi_id');
		localStorage.removeItem('estimate_custom_payee_name');
		localStorage.removeItem('estimate_custom_qr');
	};

	const saveSettings = () => {
		const upiId = customUPIId.trim();
		const payeeName = customPayeeName.trim();

		if (upiId) localStorage.setItem('estimate_custom_upi_id', upiId);
		else localStorage.removeItem('estimate_custom_upi_id');
		if (payeeName) localStorage.setItem('estimate_custom_payee_name', payeeName);
		else localStorage.removeItem('estimate_custom_payee_name');
		if (customQR) localStorage.setItem('estimate_custom_qr', customQR);
		else localStorage.removeItem('estimate_custom_qr');

		setCustomUPIId(upiId);
		setCustomPayeeName(payeeName);
		onClose();
	};

	return (
		<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="upi-settings-title">
			<div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
				<div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
					<div>
						<h2 id="upi-settings-title" className="text-lg font-bold text-stone-900">UPI QR Settings</h2>
						<p className="text-xs text-stone-500">Customize payment details shown on estimates.</p>
					</div>
					<button type="button" onClick={onClose} className="rounded-lg p-2 text-stone-500 hover:bg-stone-100" aria-label="Close UPI settings">
						<X size={20} />
					</button>
				</div>

				<div className="grid gap-5 p-5 sm:grid-cols-[1fr_180px]">
					<div className="space-y-4">
						<label className="block text-sm font-medium text-stone-700">
							UPI ID
							<input
								value={customUPIId}
								onChange={(event) => setCustomUPIId(event.target.value)}
								placeholder={UPI_CONFIG.upiId}
								className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
							/>
						</label>
						<label className="block text-sm font-medium text-stone-700">
							Payee name
							<input
								value={customPayeeName}
								onChange={(event) => setCustomPayeeName(event.target.value)}
								placeholder={UPI_CONFIG.payeeName}
								className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
							/>
						</label>
						<label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-stone-300 px-3 py-2 text-sm text-stone-600 hover:border-emerald-500 hover:text-emerald-700">
							<Upload size={16} />
							Upload custom QR image
							<input type="file" accept="image/*" onChange={handleQrUpload} className="sr-only" />
						</label>
						{customQR && <button type="button" onClick={() => setCustomQR(null)} className="text-xs text-red-600 hover:underline">Remove custom QR</button>}
					</div>

					<div className="flex flex-col items-center gap-2 rounded-lg bg-stone-50 p-3">
						<img src={customQR || previewQR} alt="UPI QR preview" className="h-40 w-40 object-contain" />
						<span className="text-center text-[11px] text-stone-500">Preview QR</span>
					</div>
				</div>

				<div className="flex items-center justify-between border-t border-stone-200 px-5 py-4">
					<button type="button" onClick={resetSettings} className="inline-flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900">
						<RotateCcw size={15} /> Reset
					</button>
					<div className="flex gap-2">
						<button type="button" onClick={onClose} className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50">Cancel</button>
						<button type="button" onClick={saveSettings} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Save settings</button>
					</div>
				</div>
			</div>
		</div>
	);
}

export default UPISettingsModal;
