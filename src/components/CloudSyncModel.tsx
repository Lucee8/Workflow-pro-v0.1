/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cloud, 
  CloudUpload, 
  CloudDownload, 
  Check, 
  Loader2, 
  X, 
  Database, 
  Download, 
  Upload, 
  AlertCircle,
  HardDrive,
  RefreshCw,
  Server
} from 'lucide-react';
import { AppState, loadState, saveState } from '../db/store';
import { pushAllLocalDataToFirestore, fetchFullFirestoreState } from '../db/firebaseService';
import { reconcileQuotationsAndCustomers } from '../utils';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: AppState;
  onDbUpdate: (newDb: AppState) => void;
  firebaseConnected: boolean;
}

export default function CloudSyncModal({
  isOpen,
  onClose,
  db,
  onDbUpdate,
  firebaseConnected,
}: CloudSyncModalProps) {
  const [isPushing, setIsPushing] = React.useState(false);
  const [isPulling, setIsPulling] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const orderCount = db.orders?.length || 0;
  const customerCount = (db.customers?.length || 0) + (db.crmCustomers?.length || 0);
  const quotationCount = db.crmQuotations?.length || 0;
  const paymentCount = (db.payments?.length || 0) + (db.crmPayments?.length || 0);
  const userCount = db.users?.length || 0;

  const handlePushToCloud = async () => {
    setIsPushing(true);
    setMessage(null);
    try {
      const currentState = loadState();
      // Merge current db with loaded state in case in-memory is newer
      const stateToPush: AppState = {
        ...currentState,
        ...db,
      };
      const res = await pushAllLocalDataToFirestore(stateToPush);
      if (res.success) {
        setMessage({ type: 'success', text: `Uploaded ${res.count} records to Cloud Firestore. All your devices will now see this data!` });
      } else {
        setMessage({ type: 'error', text: res.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: `Upload failed: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setIsPushing(false);
    }
  };

  const handlePullFromCloud = async () => {
    setIsPulling(true);
    setMessage(null);
    try {
      const remote = await fetchFullFirestoreState();
      const nextDb: AppState = {
        ...db,
        ...remote,
      };
      const reconciled = reconcileQuotationsAndCustomers(nextDb);
      saveState(reconciled);
      onDbUpdate(reconciled);
      const totalPulled = (remote.orders?.length || 0) + (remote.customers?.length || 0) + (remote.crmQuotations?.length || 0);
      setMessage({ type: 'success', text: `Downloaded latest cloud data! Loaded ${totalPulled} items.` });
    } catch (err) {
      setMessage({ type: 'error', text: `Download failed: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setIsPulling(false);
    }
  };

  const handleExportBackup = () => {
    try {
      const backupData = {
        exportedAt: new Date().toISOString(),
        projectId: 'myworkshop-orderflow',
        version: '3.0',
        data: db,
      };
      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bhises_workshop_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'Backup JSON exported successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to export backup.' });
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const importedData: AppState = parsed.data || parsed;
        if (!importedData.users && !importedData.orders) {
          setMessage({ type: 'error', text: 'Invalid backup file format.' });
          return;
        }
        const reconciled = reconcileQuotationsAndCustomers(importedData);
        saveState(reconciled);
        onDbUpdate(reconciled);
        // Automatically sync imported data to Cloud Firestore
        setIsPushing(true);
        const res = await pushAllLocalDataToFirestore(reconciled);
        setIsPushing(false);
        setMessage({ type: 'success', text: `Backup imported and synced! ${res.count} records saved to Cloud.` });
      } catch (err) {
        setMessage({ type: 'error', text: 'Failed to parse backup JSON.' });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-[#2D1B10] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-300 rounded-xl">
              <Cloud size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-bold text-base text-stone-50">Cloud Sync & Cross-Device Data</h3>
              <p className="text-xs text-stone-300">Firebase Firestore Database Sync Manager</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-left">
          {/* Cloud Status Card */}
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Server size={18} className="text-[#593622]" />
              <div>
                <div className="text-xs font-bold text-stone-800">Firebase Project</div>
                <div className="text-[11px] text-stone-500 font-mono">myworkshop-orderflow (default)</div>
              </div>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
              firebaseConnected ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-amber-100 text-amber-800'
            }`}>
              <span className={`w-2 h-2 rounded-full ${firebaseConnected ? 'bg-green-600 animate-pulse' : 'bg-amber-500'}`} />
              {firebaseConnected ? 'Cloud Online' : 'Connecting'}
            </span>
          </div>

          {/* Local Record Counter */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Current Device Records</h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                <div className="text-lg font-bold text-[#593622]">{orderCount}</div>
                <div className="text-[10px] font-semibold text-stone-500 uppercase">Orders</div>
              </div>
              <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                <div className="text-lg font-bold text-[#593622]">{quotationCount}</div>
                <div className="text-[10px] font-semibold text-stone-500 uppercase">Quotations</div>
              </div>
              <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                <div className="text-lg font-bold text-[#593622]">{customerCount}</div>
                <div className="text-[10px] font-semibold text-stone-500 uppercase">Customers</div>
              </div>
            </div>
          </div>

          {/* Feedback Message */}
          {message && (
            <div className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
              message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
              message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
              'bg-blue-50 text-blue-800 border border-blue-200'
            }`}>
              {message.type === 'success' ? <Check size={16} className="shrink-0 mt-0.5" /> : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
              <span>{message.text}</span>
            </div>
          )}

          {/* Primary Cloud Actions */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">Cross-Device Synchronization</h4>
            
            <button
              onClick={handlePushToCloud}
              disabled={isPushing || isPulling}
              className="w-full bg-[#593622] hover:bg-[#432818] text-white p-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              {isPushing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Uploading All Data to Cloud...
                </>
              ) : (
                <>
                  <CloudUpload size={16} />
                  Upload Local Data to Cloud (Sync to Other Devices)
                </>
              )}
            </button>

            <button
              onClick={handlePullFromCloud}
              disabled={isPushing || isPulling}
              className="w-full bg-stone-100 hover:bg-stone-200 text-stone-800 p-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 border border-stone-200"
            >
              {isPulling ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Downloading Cloud Data...
                </>
              ) : (
                <>
                  <CloudDownload size={16} />
                  Download Cloud Data to this Device (Pull Latest)
                </>
              )}
            </button>
          </div>

          {/* Backup & Restore Tools */}
          <div className="pt-2 border-t border-stone-200 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">JSON Backup & Migration</h4>
            <div className="flex gap-2">
              <button
                onClick={handleExportBackup}
                className="flex-1 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 p-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Download size={14} />
                Export Backup
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 p-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Upload size={14} />
                Import Backup
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-stone-50 p-4 border-t border-stone-200 flex justify-end">
          <button
            onClick={onClose}
            className="bg-stone-200 hover:bg-stone-300 text-stone-700 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
