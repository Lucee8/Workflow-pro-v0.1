/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { storage, auth } from './firebase';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  UploadTask,
} from 'firebase/storage';

export interface CNCFileUploadResult {
  fileName: string;
  fileUrl: string;
  storagePath: string;
  fileSize: number;
  uploadedAt: string;
  // Backward compatibility fields
  name: string;
  url: string;
  size: number;
  isCloudStorage: boolean;
  design_file?: string;
  design_file_name?: string;
  design_file_url?: string;
  design_file_size?: number;
  design_file_uploaded_at?: string;
}

export interface UploadProgressInfo {
  percent: number;
  bytesTransferred: number;
  totalBytes: number;
}

const SUPPORTED_CNC_EXTENSIONS = ['.dxf', '.nc'];
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB limit

/**
 * Validates whether a file is an acceptable CNC program file (.dxf or .nc)
 * and verifies that it does not exceed the maximum file size.
 */
export function validateCNCProgramFile(file: File): { isValid: boolean; error?: string } {
  if (!file) {
    return { isValid: false, error: 'No file selected.' };
  }

  const name = (file.name || '').toLowerCase();
  const hasValidExt = SUPPORTED_CNC_EXTENSIONS.some((ext) => name.endsWith(ext));

  if (!hasValidExt) {
    return {
      isValid: false,
      error: 'Unsupported file format. Please upload only .dxf or .nc CNC program files.',
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: 'File size exceeds 50MB limit. Please upload a smaller .dxf or .nc file.',
    };
  }

  return { isValid: true };
}

/**
 * Diagnoses Firebase Storage errors and translates them into actionable user messages.
 */
export function diagnoseStorageError(error: any): string {
  if (!error) return 'Upload failed. Please try again.';

  const code = error.code || '';
  const message = error.message || '';

  if (code === 'auth/not-authenticated' || error.name === 'FirebaseAuthRequiredError') {
    return 'Authentication required: An active Firebase session is required to upload files to Cloud Storage. Please sign in with your authorized workshop account (Email & Password or Google).';
  }
  if (code === 'storage/unauthorized') {
    return 'Permission denied (storage/unauthorized): Firebase Storage security rules in Firebase Console rejected this upload. Ensure your Firebase Storage Rules allow authenticated uploads to cnc-programs/.';
  }
  if (code === 'storage/canceled') {
    return 'Upload was canceled.';
  }
  if (code === 'storage/retry-limit-exceeded' || code === 'storage/cannot-slice-blob') {
    return 'Upload timed out. Firebase Storage may be unreachable or the network connection dropped. Click Retry to try again.';
  }
  if (code === 'storage/unknown' || message.includes('404') || message.includes('NoSuchBucket')) {
    return "Firebase Storage bucket is not found or not yet enabled for project 'myworkshop-orderflow'. Please enable Storage in Firebase Console (Build > Storage > Get Started).";
  }
  if (code === 'storage/quota-exceeded') {
    return 'Storage quota exceeded for your Firebase project.';
  }
  if (code === 'storage/invalid-checksum') {
    return 'File checksum mismatch. Please try uploading the file again.';
  }

  return message || 'An unexpected error occurred during upload. Please retry.';
}

/**
 * Uploads a CNC program file (.dxf / .nc) directly to Firebase Storage using uploadBytesResumable.
 * Does NOT convert to base64 or perform unnecessary processing.
 *
 * Storage path format: cnc-programs/{jobId}/{timestamp}_{fileName}
 */
export function uploadCNCProgramFile(
  file: File,
  jobId: string,
  options?: {
    onProgress?: (progress: UploadProgressInfo) => void;
    onTaskCreated?: (task: UploadTask) => void;
  }
): Promise<CNCFileUploadResult> {
  const validation = validateCNCProgramFile(file);
  if (!validation.isValid) {
    return Promise.reject(new Error(validation.error || 'Invalid file.'));
  }

  if (!auth.currentUser) {
    const authErr: any = new Error(
      'Authentication required: An active Firebase Authentication session is required to upload files to Firebase Storage. Please sign in with your authorized workshop account.'
    );
    authErr.code = 'auth/not-authenticated';
    authErr.name = 'FirebaseAuthRequiredError';
    return Promise.reject(authErr);
  }

  // Sanitize path names
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const safeJobId = (jobId || 'new_job').replace(/[^a-zA-Z0-9_-]/g, '_');
  const timestamp = Date.now();
  const storagePath = `cnc-programs/${safeJobId}/${timestamp}_${cleanName}`;
  const storageRef = ref(storage, storagePath);

  const isDxf = file.name.toLowerCase().endsWith('.dxf');
  const contentType = isDxf ? 'application/dxf' : 'text/plain';

  return new Promise((resolve, reject) => {
    try {
      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType,
        customMetadata: {
          originalName: file.name,
          jobId: safeJobId,
          fileSize: String(file.size),
          uploadedAt: new Date().toISOString(),
        },
      });

      if (options?.onTaskCreated) {
        options.onTaskCreated(uploadTask);
      }

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0 && options?.onProgress) {
            const percent = Math.min(
              100,
              Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
            );
            options.onProgress({
              percent,
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapshot.totalBytes,
            });
          }
        },
        (error) => {
          const userMessage = diagnoseStorageError(error);
          console.error('[Firebase Storage] Upload failed:', error.code, error.message);
          const customErr = new Error(userMessage);
          (customErr as any).code = error.code;
          reject(customErr);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            const isoTimestamp = new Date().toISOString();

            if (options?.onProgress) {
              options.onProgress({
                percent: 100,
                bytesTransferred: file.size,
                totalBytes: file.size,
              });
            }

            resolve({
              fileName: file.name,
              fileUrl: downloadUrl,
              storagePath,
              fileSize: file.size,
              uploadedAt: isoTimestamp,
              // Backward compatibility aliases
              name: file.name,
              url: downloadUrl,
              size: file.size,
              isCloudStorage: true,
              design_file: file.name,
              design_file_name: file.name,
              design_file_url: downloadUrl,
              design_file_size: file.size,
              design_file_uploaded_at: isoTimestamp,
            });
          } catch (urlErr: any) {
            console.error('[Firebase Storage] Failed to get download URL:', urlErr);
            reject(new Error(diagnoseStorageError(urlErr)));
          }
        }
      );
    } catch (err: any) {
      console.error('[Firebase Storage] Immediate upload initialization failure:', err);
      reject(new Error(diagnoseStorageError(err)));
    }
  });
}

/**
 * Opens the uploaded file directly in a new browser tab.
 */
export function openCNCProgramFile(fileUrl: string): void {
  if (!fileUrl) return;
  window.open(fileUrl, '_blank', 'noopener,noreferrer');
}

/**
 * Downloads a CNC program file (.dxf or .nc) onto the user's local machine.
 */
export function downloadCNCProgramFile(fileUrl: string, fileName?: string): void {
  if (!fileUrl) return;

  const targetName = fileName || 'cnc_program.nc';

  // Handle blob or data URL
  if (fileUrl.startsWith('data:') || fileUrl.startsWith('blob:')) {
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = targetName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  // Handle remote Firebase Storage download URL
  fetch(fileUrl)
    .then((response) => {
      if (!response.ok) throw new Error('Network fetch response not ok');
      return response.blob();
    })
    .then((blob) => {
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = targetName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 2000);
    })
    .catch((err) => {
      console.warn('Direct blob download failed, falling back to anchor click:', err);
      const a = document.createElement('a');
      a.href = fileUrl;
      a.download = targetName;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
}

/**
 * Safely deletes a file from Firebase Storage given its storage path or full download URL.
 */
export async function deleteCNCProgramFileFromStorage(storagePathOrUrl: string): Promise<boolean> {
  if (!storagePathOrUrl) return false;

  try {
    let fileRef;
    if (storagePathOrUrl.startsWith('http://') || storagePathOrUrl.startsWith('https://')) {
      if (!storagePathOrUrl.includes('firebasestorage.googleapis.com')) {
        return false;
      }
      fileRef = ref(storage, storagePathOrUrl);
    } else {
      fileRef = ref(storage, storagePathOrUrl);
    }

    await deleteObject(fileRef);
    return true;
  } catch (err: any) {
    // If already deleted or not found (404), treat as benign
    if (err?.code === 'storage/object-not-found') {
      return true;
    }
    console.warn('Could not delete old file from Firebase Storage:', err?.message || err);
    return false;
  }
}

/**
 * Uploads an individual CNC program file (.dxf / .nc) to Firebase Storage
 * under path: cnc-programs/{jobId}/{fileId}/{fileName}
 * Uses uploadBytesResumable directly from browser with progress and cancel support.
 */
export function uploadJobProgramFile(
  file: File,
  jobId: string,
  fileId: string,
  options?: {
    onProgress?: (progress: UploadProgressInfo) => void;
    onTaskCreated?: (task: UploadTask) => void;
  }
): Promise<{ fileUrl: string; storagePath: string; size: number; fileName: string; extension: string }> {
  const validation = validateCNCProgramFile(file);
  if (!validation.isValid) {
    return Promise.reject(new Error(validation.error || 'Invalid file format.'));
  }

  if (!auth.currentUser) {
    const authErr: any = new Error(
      'Authentication required: An active Firebase Authentication session is required to upload files to Firebase Storage. Please sign in with your authorized workshop account.'
    );
    authErr.code = 'auth/not-authenticated';
    authErr.name = 'FirebaseAuthRequiredError';
    return Promise.reject(authErr);
  }

  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const safeJobId = (jobId || 'new_job').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeFileId = (fileId || 'file_' + Date.now()).replace(/[^a-zA-Z0-9_-]/g, '_');
  const storagePath = `cnc-programs/${safeJobId}/${safeFileId}/${cleanName}`;
  const storageRef = ref(storage, storagePath);

  const isDxf = file.name.toLowerCase().endsWith('.dxf');
  const contentType = isDxf ? 'application/dxf' : 'text/plain';

  return new Promise((resolve, reject) => {
    try {
      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType,
        customMetadata: {
          originalName: file.name,
          jobId: safeJobId,
          fileId: safeFileId,
          fileSize: String(file.size),
          uploadedAt: new Date().toISOString(),
        },
      });

      if (options?.onTaskCreated) {
        options.onTaskCreated(uploadTask);
      }

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0 && options?.onProgress) {
            const percent = Math.min(
              100,
              Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
            );
            options.onProgress({
              percent,
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapshot.totalBytes,
            });
          }
        },
        (error) => {
          const userMessage = diagnoseStorageError(error);
          console.error('[Firebase Storage] Program file upload failed:', error.code, error.message);
          const customErr = new Error(userMessage);
          (customErr as any).code = error.code;
          reject(customErr);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            if (options?.onProgress) {
              options.onProgress({
                percent: 100,
                bytesTransferred: file.size,
                totalBytes: file.size,
              });
            }
            resolve({
              fileUrl: downloadUrl,
              storagePath,
              size: file.size,
              fileName: file.name,
              extension: isDxf ? '.dxf' : '.nc',
            });
          } catch (urlErr) {
            console.error('[Firebase Storage] Failed to get download URL:', urlErr);
            reject(new Error(diagnoseStorageError(urlErr)));
          }
        }
      );
    } catch (err) {
      console.error('[Firebase Storage] Direct upload start error:', err);
      reject(new Error(diagnoseStorageError(err)));
    }
  });
}
