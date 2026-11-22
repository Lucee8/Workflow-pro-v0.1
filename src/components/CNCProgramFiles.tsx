/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { CNCProgramFile, User } from '../types';
import {
  uploadJobProgramFile,
  downloadCNCProgramFile,
  openCNCProgramFile,
  deleteCNCProgramFileFromStorage,
  validateCNCProgramFile,
  UploadProgressInfo,
} from '../db/firebaseStorage';
import {
  listenCNCProgramFiles,
  saveCNCProgramFileMetadata,
  deleteCNCProgramFileMetadata,
  updateCNCJobFilesCount,
} from '../db/firebaseService';
import { generateUUID } from '../db/store';
import { auth } from '../db/firebase';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  FileCode,
  Upload,
  Download,
  ExternalLink,
  RefreshCw,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  History,
  FileCheck2,
  Plus,
  ShieldCheck,
  ShieldAlert,
  Lock,
  RotateCw,
} from 'lucide-react';
import type { UploadTask } from 'firebase/storage';

interface CNCProgramFilesProps {
  jobId: string;
  jobArticleNo?: string;
  currentUser: User;
  readOnly?: boolean;
  isUnsavedJob?: boolean;
  onStagedFilesChange?: (files: CNCProgramFile[]) => void;
  onFilesCountChange?: (count: number, latestFile?: CNCProgramFile) => void;
  legacyFile?: {
    name?: string;
    url?: string;
    size?: number;
    uploadedAt?: string;
  };
}

interface QueuedUpload {
  tempId: string;
  file: File;
  fileName: string;
  fileSize: number;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
  task?: UploadTask;
  isReplaceFor?: CNCProgramFile;
}

export const CNCProgramFiles: React.FC<CNCProgramFilesProps> = ({
  jobId,
  currentUser,
  readOnly = false,
  isUnsavedJob = false,
  onStagedFilesChange,
  onFilesCountChange,
  legacyFile,
}) => {
  const [files, setFiles] = useState<CNCProgramFile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(!isUnsavedJob);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [uploadQueue, setUploadQueue] = useState<QueuedUpload[]>([]);
  const [fileToDelete, setFileToDelete] = useState<CNCProgramFile | null>(null);
  const [replacingTarget, setReplacingTarget] = useState<CNCProgramFile | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);

  // Firebase Auth session tracking for Storage RBAC
  const [isAuthSessionActive, setIsAuthSessionActive] = useState<boolean>(() => Boolean(auth.currentUser));
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [authModalError, setAuthModalError] = useState<string | null>(null);
  const [reauthEmail, setReauthEmail] = useState<string>(() => currentUser?.email || '');
  const [reauthPassword, setReauthPassword] = useState<string>('');
  const [pendingFilesToUpload, setPendingFilesToUpload] = useState<{
    files: File[];
    targetToReplace?: CNCProgramFile;
  } | null>(null);
  const [copiedRules, setCopiedRules] = useState<boolean>(false);

  // Monitor Firebase Auth session state in real-time
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setIsAuthSessionActive(Boolean(user));
      if (user) {
        setShowAuthModal(false);
        setAuthModalError(null);
      }
    });
    return () => unsub();
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  const activeJobIdRef = useRef<string>(jobId);
  activeJobIdRef.current = jobId;
  const lastReportedCountRef = useRef<number | null>(null);

  // Role verification: Admin, Super Admin, Manager, and CNC Workshop personnel/operators are authorized
  const isRoleAuthorized = Boolean(
    currentUser &&
      ['super_admin', 'admin', 'manager', 'cnc_manager', 'cnc_workshop', 'cnc_operator', 'operator'].includes(
        (currentUser.role || '').toLowerCase().replace(/[\s-]+/g, '_')
      )
  );

  useEffect(() => {
    if (showAuthModal && !reauthEmail && currentUser?.email) {
      setReauthEmail(currentUser.email);
    }
  }, [showAuthModal, currentUser?.email, reauthEmail]);

  // Real-time listener for this job's programFiles subcollection (only when job doc exists in Firestore)
  useEffect(() => {
    if (!jobId) {
      setFiles([]);
      setIsLoading(false);
      return;
    }

    if (isUnsavedJob) {
      lastReportedCountRef.current = null;
      setFiles([]);
      onStagedFilesChange?.([]);
      setIsLoading(false);
      return;
    }

    lastReportedCountRef.current = null;
    setIsLoading(true);
    const unsubscribe = listenCNCProgramFiles(jobId, (fetchedFiles) => {
      setFiles(fetchedFiles);
      setIsLoading(false);

      const activeFiles = fetchedFiles.filter((f) => f.isActive !== false);
      const activeCount = activeFiles.length;
      if (onFilesCountChange) {
        onFilesCountChange(activeCount, activeFiles[0]);
      }
      if (lastReportedCountRef.current !== activeCount) {
        lastReportedCountRef.current = activeCount;
        updateCNCJobFilesCount(jobId, activeCount).catch(() => {});
      }

      // Safe legacy data migration: only migrate if subcollection is empty and a real legacy file URL exists
      if (
        fetchedFiles.length === 0 &&
        legacyFile &&
        legacyFile.url
      ) {
        const legacyName = legacyFile.name || 'cnc_program.nc';
        const isDxf = legacyName.toLowerCase().endsWith('.dxf');
        const legacyId = 'pf_migrated_' + generateUUID().split('-')[0];
        const migratedRecord: CNCProgramFile = {
          id: legacyId,
          jobId: jobId,
          fileName: legacyName,
          extension: isDxf ? '.dxf' : '.nc',
          storagePath: `cnc-programs/${jobId}/${legacyId}/${legacyName}`,
          fileUrl: legacyFile.url,
          size: legacyFile.size || 0,
          description: 'Preserved from previous CNC program record',
          version: 1,
          uploadedAt: legacyFile.uploadedAt || new Date().toISOString(),
          uploadedBy: currentUser.name || 'System Migration',
          isActive: true,
        };

        saveCNCProgramFileMetadata(jobId, migratedRecord).catch((err) => {
          console.warn('Note: Legacy CNC file migration check:', err);
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [jobId, isUnsavedJob]);

  // Upload handler for single or multiple files
  const handleUploadFiles = async (
    fileList: FileList | File[],
    targetToReplace?: CNCProgramFile
  ) => {
    if (!jobId) {
      setGlobalError('Please save the CNC Job entry before uploading program files.');
      return;
    }

    if (!isRoleAuthorized) {
      setGlobalError('Permission Denied: Only Admin, Manager, and CNC Workshop personnel are authorized to upload CNC program files.');
      return;
    }

    const filesArray = Array.from(fileList);
    if (filesArray.length === 0) return;

    setGlobalError(null);

    // Validate all files first (extension and size <= 50MB)
    for (const file of filesArray) {
      const validation = validateCNCProgramFile(file);
      if (!validation.isValid) {
        setGlobalError(
          validation.error || 'Invalid file format. Only .dxf and .nc files under 50MB are permitted.'
        );
        return;
      }
    }

    // Pre-flight check: ensure user has an active Firebase Auth session for Storage security rules
    if (!auth.currentUser) {
      setPendingFilesToUpload({ files: filesArray, targetToReplace });
      setShowAuthModal(true);
      return;
    }

    // Process uploads directly to Firebase Storage
    for (const file of filesArray) {
      const tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const newFileId = 'pf_' + generateUUID().split('-')[0] + '_' + Date.now();

      // Add to queue state
      setUploadQueue((prev) => [
        ...prev,
        {
          tempId,
          file,
          fileName: file.name,
          fileSize: file.size,
          progress: 0,
          status: 'uploading',
          isReplaceFor: targetToReplace,
        },
      ]);

      try {
        const result = await uploadJobProgramFile(file, jobId, newFileId, {
          onProgress: (p: UploadProgressInfo) => {
            setUploadQueue((prev) =>
              prev.map((item) =>
                item.tempId === tempId ? { ...item, progress: p.percent } : item
              )
            );
          },
          onTaskCreated: (task) => {
            setUploadQueue((prev) =>
              prev.map((item) => (item.tempId === tempId ? { ...item, task } : item))
            );
          },
        });

        // Calculate version number: if replacing, increment target version; else 1
        let newVersion = 1;
        let prevId: string | undefined = undefined;

        if (targetToReplace) {
          newVersion = (targetToReplace.version || 1) + 1;
          prevId = targetToReplace.id;
          // Archive old version in Firestore when the parent job document already exists
          if (!isUnsavedJob) {
            await saveCNCProgramFileMetadata(jobId, {
              ...targetToReplace,
              isActive: false,
            });
          }
        }

        const newRecord: CNCProgramFile = {
          id: newFileId,
          jobId: jobId,
          fileName: result.fileName,
          extension: result.extension,
          storagePath: result.storagePath,
          fileUrl: result.fileUrl,
          size: result.size,
          description: targetToReplace
            ? `Updated from v${targetToReplace.version || 1} on ${new Date().toLocaleDateString()}`
            : 'Initial version',
          version: newVersion,
          uploadedAt: new Date().toISOString(),
          uploadedBy: currentUser.name || 'CNC Operator',
          isActive: true,
          previousVersionId: prevId,
        };

        // Persist file metadata in Firestore only if the parent job doc already exists;
        // otherwise keep staged in state and persist immediately upon job save
        if (!isUnsavedJob) {
          await saveCNCProgramFileMetadata(jobId, newRecord);
        }

        // Optimistically update local files state immediately so the file is visible instantly
        // and NEVER disappears after the 2-second upload progress bar timeout!
        setFiles((prev) => {
          let updated = [...prev];
          if (targetToReplace) {
            updated = updated.map((f) => (f.id === targetToReplace.id ? { ...f, isActive: false } : f));
          }
          const nextFiles = [newRecord, ...updated.filter((f) => f.id !== newRecord.id)];
          const activeCount = nextFiles.filter((f) => f.isActive !== false).length;
          if (onFilesCountChange) {
            onFilesCountChange(activeCount, newRecord);
          }
          if (onStagedFilesChange) {
            onStagedFilesChange(nextFiles);
          }
          if (!isUnsavedJob) {
            updateCNCJobFilesCount(jobId, activeCount).catch(() => {});
          }
          return nextFiles;
        });

        // Mark upload as completed in queue and clean up after delay
        setUploadQueue((prev) =>
          prev.map((item) =>
            item.tempId === tempId ? { ...item, progress: 100, status: 'completed' } : item
          )
        );

        setTimeout(() => {
          setUploadQueue((prev) => prev.filter((item) => item.tempId !== tempId));
        }, 2000);

        setGlobalSuccess(
          targetToReplace
            ? `Replaced with v${newVersion}: ${file.name}`
            : `Uploaded: ${file.name}`
        );
        setTimeout(() => setGlobalSuccess(null), 3500);
      } catch (err: any) {
        console.error('File upload failed:', err);
        const userMsg = err?.message || 'Upload failed. Please check storage permissions.';
        setUploadQueue((prev) =>
          prev.map((item) =>
            item.tempId === tempId
              ? { ...item, status: 'error', error: userMsg }
              : item
          )
        );
      }
    }
  };

  const handleRetryUpload = (item: QueuedUpload) => {
    setUploadQueue((prev) => prev.filter((q) => q.tempId !== item.tempId));
    handleUploadFiles([item.file], item.isReplaceFor);
  };

  const handleAuthenticateWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = reauthEmail.trim().toLowerCase();
    if (!cleanEmail || !reauthPassword) {
      setAuthModalError('Please enter your workshop email address and password.');
      return;
    }

    setIsAuthenticating(true);
    setAuthModalError(null);
    try {
      const result = await signInWithEmailAndPassword(auth, cleanEmail, reauthPassword);
      if (result.user) {
        setShowAuthModal(false);
        setIsAuthSessionActive(true);
        setReauthPassword('');
        if (pendingFilesToUpload) {
          const queued = { ...pendingFilesToUpload };
          setPendingFilesToUpload(null);
          handleUploadFiles(queued.files, queued.targetToReplace);
        }
      }
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setAuthModalError('Incorrect email or password. Please verify your workshop credentials and try again.');
      } else if (code === 'auth/too-many-requests') {
        setAuthModalError('Too many failed attempts. Please wait a moment before retrying.');
      } else {
        setAuthModalError(err?.message || 'Email sign-in failed. Please try again.');
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleAuthenticateWithGoogle = async () => {
    setIsAuthenticating(true);
    setAuthModalError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        setShowAuthModal(false);
        setIsAuthSessionActive(true);
        if (pendingFilesToUpload) {
          const queued = { ...pendingFilesToUpload };
          setPendingFilesToUpload(null);
          handleUploadFiles(queued.files, queued.targetToReplace);
        }
      }
    } catch (err: any) {
      console.warn('Google authentication notice:', err);
      const msg = err?.message || String(err);
      if (
        msg.includes('popup-closed-by-user') ||
        msg.includes('cancelled-popup-request') ||
        err?.code === 'auth/popup-closed-by-user'
      ) {
        setAuthModalError('Google Sign-In popup was closed before completion. Please retry.');
      } else if (msg.includes('auth/unauthorized-domain')) {
        setAuthModalError(
          'Current domain is not authorized in Firebase Console > Authentication > Settings > Authorized Domains.'
        );
      } else {
        setAuthModalError(`Authentication failed: ${msg}`);
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleCancelUpload = (tempId: string) => {
    const item = uploadQueue.find((u) => u.tempId === tempId);
    if (item?.task) {
      try {
        item.task.cancel();
      } catch (e) {
        console.warn('Cancel upload error:', e);
      }
    }
    setUploadQueue((prev) => prev.filter((u) => u.tempId !== tempId));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!readOnly) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (readOnly) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFiles(e.dataTransfer.files);
    }
  };

  const triggerReplaceFile = (targetFile: CNCProgramFile) => {
    setReplacingTarget(targetFile);
    if (replaceFileInputRef.current) {
      replaceFileInputRef.current.value = '';
      replaceFileInputRef.current.click();
    }
  };

  const handleReplaceFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && replacingTarget) {
      handleUploadFiles([file], replacingTarget);
    }
    setReplacingTarget(null);
  };

  const confirmDeleteFile = async () => {
    if (!fileToDelete || !jobId) return;

    try {
      // 1. Delete actual file from Firebase Storage
      if (fileToDelete.storagePath || fileToDelete.fileUrl) {
        await deleteCNCProgramFileFromStorage(
          fileToDelete.storagePath || fileToDelete.fileUrl
        );
      }
      // 2. Delete metadata doc from Firestore subcollection if job already exists in Firestore
      if (!isUnsavedJob) {
        await deleteCNCProgramFileMetadata(jobId, fileToDelete.id);
      }

      // Optimistically update local files state
      setFiles((prev) => {
        const remaining = prev.filter((f) => f.id !== fileToDelete.id);
        const activeRemaining = remaining.filter((f) => f.isActive !== false);
        if (onFilesCountChange) {
          onFilesCountChange(activeRemaining.length, activeRemaining[0]);
        }
        if (onStagedFilesChange) {
          onStagedFilesChange(remaining);
        }
        if (!isUnsavedJob) {
          updateCNCJobFilesCount(jobId, activeRemaining.length).catch(() => {});
        }
        return remaining;
      });

      setGlobalSuccess(`Deleted: ${fileToDelete.fileName}`);
      setTimeout(() => setGlobalSuccess(null), 3500);
    } catch (err: any) {
      console.error('Delete file error:', err);
      setGlobalError(err.message || 'Failed to delete file. Please retry.');
    } finally {
      setFileToDelete(null);
    }
  };

  // Filter files based on Active vs History view
  const activeFiles = files.filter((f) => f.isActive !== false);
  const archivedFiles = files.filter((f) => f.isActive === false);
  const displayFiles = showHistory ? files : activeFiles;

  return (
    <div className="space-y-2.5">
      {/* Hidden file pickers */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".dxf,.nc"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleUploadFiles(e.target.files);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }}
        disabled={readOnly}
      />
      <input
        ref={replaceFileInputRef}
        type="file"
        accept=".dxf,.nc"
        className="hidden"
        onChange={handleReplaceFileSelected}
        disabled={readOnly}
      />

      {/* Header with Title, Count Badge, Version History Toggle and Upload Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
            <FileCode size={13} className="text-teal-700" />
            <span>Program Files (.dxf / .nc)</span>
          </label>
          <span className="px-2 py-0.5 bg-teal-100 text-teal-900 font-mono text-[10px] font-extrabold rounded-full border border-teal-200">
            {activeFiles.length} {activeFiles.length === 1 ? 'File' : 'Files'}
          </span>
          {isAuthSessionActive && auth.currentUser ? (
            <span
              className="text-[9px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-medium flex items-center gap-1"
              title={`Authenticated in Firebase Auth as ${auth.currentUser.email}`}
            >
              <ShieldCheck size={10} className="text-emerald-600" />
              <span className="truncate max-w-[130px]">{auth.currentUser.email || 'Auth Active'}</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="text-[9px] text-amber-800 bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 font-semibold flex items-center gap-1 cursor-pointer transition"
              title="Verify your workshop sign-in session to upload CNC program files"
            >
              <Lock size={9} className="text-amber-700" />
              <span>Sign in to Upload</span>
            </button>
          )}
          {archivedFiles.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition flex items-center gap-1 cursor-pointer ${
                showHistory
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
              }`}
              title="Toggle version history"
            >
              <History size={10} />
              <span>{showHistory ? 'Showing All Versions' : `History (${archivedFiles.length})`}</span>
            </button>
          )}
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#115e59] hover:bg-[#0f4c4a] text-white rounded-lg text-[11px] font-bold transition shadow-2xs cursor-pointer"
            title="Browse and upload one or more .dxf or .nc files"
          >
            <Upload size={12} />
            <span>Upload Files</span>
          </button>
        )}
      </div>

      {/* Global Alerts */}
      {globalSuccess && (
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-teal-800 bg-teal-50 border border-teal-200/90 rounded-lg px-2.5 py-1.5 animate-in fade-in">
          <CheckCircle2 size={13} className="text-teal-600 shrink-0" />
          <span>{globalSuccess}</span>
        </div>
      )}

      {globalError && (
        <div className="flex items-center justify-between text-[11px] font-semibold text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5 animate-in fade-in">
          <div className="flex items-center gap-1.5">
            <AlertCircle size={13} className="text-rose-600 shrink-0" />
            <span>{globalError}</span>
          </div>
          <button
            type="button"
            onClick={() => setGlobalError(null)}
            className="text-stone-400 hover:text-stone-600 p-0.5 rounded cursor-pointer"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Active Upload Queue Display */}
      {uploadQueue.length > 0 && (
        <div className="space-y-1.5 bg-teal-50/90 border border-teal-200 rounded-xl p-2.5 shadow-2xs animate-in fade-in">
          <div className="text-[10px] font-extrabold text-teal-900 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Loader2 size={11} className="animate-spin text-teal-700" />
              <span>Uploading {uploadQueue.length} {uploadQueue.length === 1 ? 'file' : 'files'}...</span>
            </span>
          </div>
          {uploadQueue.map((item) => (
            <div key={item.tempId} className="bg-white p-2 rounded-lg border border-teal-100 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0 pr-2">
                  <FileCode size={13} className="text-teal-700 shrink-0" />
                  <span className="font-mono font-bold text-teal-950 truncate max-w-[200px]" title={item.fileName}>
                    {item.fileName}
                  </span>
                  <span className="text-[9px] text-stone-500 font-mono">
                    ({(item.fileSize / 1024).toFixed(1)} KB)
                  </span>
                  {item.isReplaceFor && (
                    <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded">
                      v{(item.isReplaceFor.version || 1) + 1}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-mono text-[10px] font-bold text-teal-900">
                    {item.status === 'error' ? 'Failed' : `${item.progress}%`}
                  </span>
                  {item.status === 'error' && (
                    <button
                      type="button"
                      onClick={() => handleRetryUpload(item)}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded text-[10px] font-bold transition cursor-pointer"
                      title="Retry upload"
                    >
                      <RotateCw size={10} />
                      <span>Retry</span>
                    </button>
                  )}
                  {item.status === 'uploading' && (
                    <button
                      type="button"
                      onClick={() => handleCancelUpload(item.tempId)}
                      className="text-stone-400 hover:text-rose-600 p-0.5 rounded cursor-pointer"
                      title="Cancel upload"
                    >
                      <X size={12} />
                    </button>
                  )}
                  {item.status === 'error' && (
                    <button
                      type="button"
                      onClick={() => setUploadQueue((prev) => prev.filter((q) => q.tempId !== item.tempId))}
                      className="text-stone-400 hover:text-stone-600 p-0.5 rounded cursor-pointer"
                      title="Dismiss"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
              <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden border border-stone-200/80">
                <div
                  className={`h-full transition-all duration-150 rounded-full ${
                    item.status === 'error' ? 'bg-rose-500' : 'bg-teal-600'
                  }`}
                  style={{ width: `${Math.max(4, item.progress)}%` }}
                />
              </div>
              {item.error && (
                <div className="flex flex-col gap-1.5 text-[10px] text-rose-700 font-semibold bg-rose-50/70 p-2.5 rounded-xl border border-rose-200">
                  <div className="flex items-start gap-1.5 text-rose-800 font-bold">
                    <AlertCircle size={13} className="shrink-0 text-rose-600 mt-0.5" />
                    <span className="leading-tight">{item.error}</span>
                  </div>

                  {!auth.currentUser ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPendingFilesToUpload({ files: [item.file], targetToReplace: item.isReplaceFor });
                        setShowAuthModal(true);
                      }}
                      className="self-start inline-flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold transition cursor-pointer shadow-2xs mt-1"
                    >
                      <Lock size={10} />
                      <span>Verify Workshop Sign-In</span>
                    </button>
                  ) : (
                    <div className="space-y-1.5 text-[10px] text-stone-700 font-normal pt-1.5 border-t border-rose-200/80">
                      <p className="font-semibold text-rose-900 leading-tight">
                        Signed in as <span className="font-mono font-bold text-stone-900">{auth.currentUser.email}</span>, but the cloud Storage Rules in your Firebase Console must be published to permit uploads to <code className="bg-stone-100 px-1 py-0.5 rounded font-mono text-rose-900">cnc-programs/</code>.
                      </p>
                      <div className="flex items-center gap-2 flex-wrap pt-0.5">
                        <a
                          href="https://console.firebase.google.com/project/myworkshop-orderflow/storage/rules"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#115e59] hover:bg-[#0f4c4a] text-white rounded-lg text-[10px] font-bold shadow-2xs transition"
                        >
                          <ExternalLink size={10} />
                          <span>Open Firebase Storage Rules</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(
                              "rules_version = '2';\nservice firebase.storage {\n  match /b/{bucket}/o {\n    match /cnc-programs/{allPaths=**} {\n      allow read, write: if request.auth != null;\n    }\n    match /{allPaths=**} {\n      allow read, write: if false;\n    }\n  }\n}"
                            );
                            setCopiedRules(true);
                            setTimeout(() => setCopiedRules(false), 2500);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-stone-100 border border-stone-300 text-stone-700 rounded-lg text-[10px] font-bold transition shadow-2xs cursor-pointer"
                        >
                          <CheckCircle2 size={10} className={copiedRules ? 'text-emerald-600' : 'text-stone-400'} />
                          <span>{copiedRules ? 'Rules Copied!' : 'Copy Storage Rules'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Drag & Drop Zone / Empty State */}
      {!readOnly && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-3 text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
            isDragging
              ? 'border-teal-500 bg-teal-50/90 ring-2 ring-teal-300'
              : 'border-stone-200 hover:border-teal-300 bg-stone-50/50 hover:bg-teal-50/30'
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100">
            <Upload size={15} />
          </div>
          <div>
            <span className="text-xs font-bold text-teal-950 block">
              Drag & Drop .dxf or .nc files here, or <span className="text-teal-700 underline">browse</span>
            </span>
            <span className="text-[10px] text-stone-500 block">
              Supports multiple files • Up to 50MB per file • Full version history preserved
            </span>
          </div>
        </div>
      )}

      {/* Program Files List */}
      {isLoading ? (
        <div className="p-4 text-center text-xs text-stone-500 flex items-center justify-center gap-2">
          <Loader2 size={14} className="animate-spin text-teal-600" />
          <span>Loading attached program files...</span>
        </div>
      ) : displayFiles.length === 0 ? (
        <div className="p-3 bg-stone-50/80 rounded-xl border border-stone-200/70 text-center text-xs text-stone-500 space-y-1">
          <FileCheck2 size={20} className="mx-auto text-stone-400" />
          <p className="font-semibold text-stone-700">No program files attached to this job yet.</p>
          <p className="text-[11px] text-stone-400">
            Click "Upload Files" above to upload your CNC cutting or carving code.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
          {displayFiles.map((file) => {
            const isDxf = (file.extension || file.fileName || '').toLowerCase().endsWith('.dxf');
            const isSuperseded = file.isActive === false;

            return (
              <div
                key={file.id}
                className={`p-2.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-2xs ${
                  isSuperseded
                    ? 'bg-stone-50/80 border-stone-200 opacity-70'
                    : 'bg-white border-teal-200/80 hover:border-teal-300'
                }`}
              >
                {/* File info */}
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isSuperseded
                        ? 'bg-stone-200 text-stone-600'
                        : 'bg-teal-600 text-white shadow-2xs'
                    }`}
                  >
                    <FileCode size={14} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className="font-mono font-bold text-xs text-stone-900 truncate max-w-[150px] sm:max-w-[200px]"
                        title={file.fileName}
                      >
                        {file.fileName}
                      </span>
                      <span className="px-1.5 py-0.2 bg-teal-100 text-teal-900 font-mono text-[9px] font-extrabold rounded uppercase shrink-0">
                        {isDxf ? 'DXF' : 'NC'}
                      </span>
                      <span className="px-1.5 py-0.2 bg-stone-100 text-stone-800 font-mono text-[9px] font-bold rounded shrink-0">
                        v{file.version || 1}
                      </span>
                      {isSuperseded && (
                        <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 text-[9px] font-bold rounded shrink-0">
                          Superseded
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-stone-500 font-mono flex items-center gap-1.5 flex-wrap -mt-0.5">
                      {file.size ? <span>{(file.size / 1024).toFixed(1)} KB</span> : null}
                      <span>•</span>
                      <span>
                        {file.uploadedAt
                          ? new Date(file.uploadedAt).toLocaleDateString()
                          : 'Recent'}
                      </span>
                      {file.uploadedBy && (
                        <>
                          <span>•</span>
                          <span className="text-teal-800 font-semibold truncate max-w-[100px]">
                            {file.uploadedBy}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* File Actions */}
                <div className="flex items-center gap-1 shrink-0 justify-end flex-wrap">
                  {/* Direct Open in new tab */}
                  {file.fileUrl && (
                    <button
                      type="button"
                      onClick={() => openCNCProgramFile(file.fileUrl)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-[#115e59] hover:bg-[#0f4c4a] text-white rounded-lg text-[10px] font-bold transition shadow-2xs cursor-pointer"
                      title="Open file directly in new browser tab"
                    >
                      <ExternalLink size={10} />
                      <span>Open</span>
                    </button>
                  )}

                  {/* Direct Download */}
                  {file.fileUrl && (
                    <button
                      type="button"
                      onClick={() => downloadCNCProgramFile(file.fileUrl, file.fileName)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-teal-50 text-teal-800 border border-teal-200 rounded-lg text-[10px] font-bold transition shadow-2xs cursor-pointer"
                      title="Download program file"
                    >
                      <Download size={10} />
                      <span>Download</span>
                    </button>
                  )}

                  {/* Replace with automatic version increment */}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => triggerReplaceFile(file)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-lg text-[10px] font-semibold transition shadow-2xs cursor-pointer"
                      title="Replace this file with a new revision (version will increment)"
                    >
                      <RefreshCw size={10} />
                      <span>Replace</span>
                    </button>
                  )}

                  {/* Delete file */}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => setFileToDelete(file)}
                      className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Delete this file"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Deletion Confirmation Modal */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 border border-stone-200 shadow-xl space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-stone-900">Delete Program File?</h4>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                  Are you sure you want to delete <span className="font-mono font-bold text-stone-900 break-all">{fileToDelete.fileName}</span> (v{fileToDelete.version || 1})?
                </p>
                <p className="text-[11px] text-rose-600 font-semibold mt-1">
                  This will remove the file from cloud storage and the job file directory.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                className="px-3 py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteFile}
                className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition shadow-2xs cursor-pointer flex items-center gap-1"
              >
                <Trash2 size={12} />
                <span>Delete File</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Firebase Storage Authentication Required Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-stone-200 shadow-2xl space-y-3.5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200">
                <ShieldAlert size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-stone-900">Workshop Session Verification</h4>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                  Cloud Storage rules require an active authenticated session before uploading CNC program files (.dxf / .nc).
                </p>
              </div>
            </div>

            {authModalError && (
              <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-xl text-rose-800 text-[11px] font-medium flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0 text-rose-600" />
                <span>{authModalError}</span>
              </div>
            )}

            <form onSubmit={handleAuthenticateWithPassword} className="space-y-2.5 pt-1 border-t border-stone-100">
              <div>
                <label className="text-[10px] font-bold text-stone-600 uppercase tracking-wider block mb-1">
                  Workshop Email
                </label>
                <input
                  type="email"
                  required
                  value={reauthEmail}
                  onChange={(e) => setReauthEmail(e.target.value)}
                  placeholder="operator@workshop.com"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-700"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-stone-600 uppercase tracking-wider block mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={reauthPassword}
                  onChange={(e) => setReauthPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-700"
                />
              </div>
              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full flex items-center justify-center gap-2 bg-[#115e59] hover:bg-[#0f4c4a] text-white font-bold py-2 px-3 rounded-xl shadow-xs text-xs cursor-pointer disabled:opacity-50 transition"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <Lock size={12} />
                    <span>Sign In with Email &amp; Password</span>
                  </>
                )}
              </button>
            </form>

            <div className="flex flex-col gap-2 pt-1 border-t border-stone-100">
              <button
                type="button"
                onClick={handleAuthenticateWithGoogle}
                disabled={isAuthenticating}
                className="w-full flex items-center justify-center gap-2.5 bg-white hover:bg-stone-50 text-stone-700 font-bold py-2 px-3 rounded-xl border border-stone-300 shadow-xs text-xs cursor-pointer disabled:opacity-50 transition"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Or Continue with Google</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAuthModal(false);
                  setAuthModalError(null);
                  setReauthPassword('');
                  setPendingFilesToUpload(null);
                }}
                disabled={isAuthenticating}
                className="w-full text-center py-1.5 text-xs text-stone-500 hover:text-stone-800 font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
