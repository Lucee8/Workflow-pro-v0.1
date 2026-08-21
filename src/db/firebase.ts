/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  initializeAuth, 
  browserLocalPersistence,
  browserSessionPersistence, 
  inMemoryPersistence, 
  browserPopupRedirectResolver,
  getAuth 
} from 'firebase/auth';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase (Singleton pattern to prevent re-initialization errors)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Use custom database ID if specified and not default
const rawDbId = (firebaseConfig as any).firestoreDatabaseId;
const databaseId = rawDbId && rawDbId !== "(default)" && !rawDbId.startsWith("ai-studio-") ? rawDbId : undefined;

function getOrInitFirestore() {
  try {
    const settings = {
      experimentalAutoDetectLongPolling: true,
    };
    return databaseId 
      ? initializeFirestore(app, settings, databaseId) 
      : initializeFirestore(app, settings);
  } catch {
    return databaseId ? getFirestore(app, databaseId) : getFirestore(app);
  }
}

export const db = getOrInitFirestore();

// Clean Auth initialization
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth.currentUser?.uid || 'offline-simulated-user',
      email: auth.currentUser?.email || 'admin@bhisesworkshop.com',
      emailVerified: auth.currentUser?.emailVerified || true,
      isAnonymous: auth.currentUser?.isAnonymous || false,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn(`[Firestore ${operationType} ${path || ''}] Warning/Error:`, errMessage);
  return errInfo;
}
