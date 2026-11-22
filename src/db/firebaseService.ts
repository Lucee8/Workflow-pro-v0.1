/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  onSnapshot, 
  writeBatch, 
  getDoc,
  getDocFromServer,
  deleteDoc,
  updateDoc,
  query,
  where,
  limit,
  orderBy,
  QueryConstraint
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { AppState } from './store';
import { User, Customer, Order, StatusLog, Material, Payment, CRMCustomer, CRMQuotation, CRMFollowUp, CRMPayment, CRMNote, CRMAttachment, CRMTimelineEvent, AuditLog, normalizeStage, CNCJob, CNCTool, CNCProgramFile } from '../types';
import { sha256Hex, isOperatorRole } from '../components/cncHelpers';

// Connect with proper authentication securely or proceed with existing auth session
export async function authenticateFirebase(): Promise<boolean> {
  try {
    // Await Firebase Auth state initialization cleanly without calling restricted anonymous auth
    if (typeof auth.authStateReady === 'function') {
      await auth.authStateReady();
    }
    // Test if Firestore is reachable
    await testConnection();
    return true;
  } catch (error) {
    console.warn("Firestore connection check note:", error instanceof Error ? error.message : error);
    return true;
  }
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    console.warn("Firestore connection check note:", error instanceof Error ? error.message : error);
  }
}

/**
 * Lightweight check to verify if Firestore has already been populated with data.
 * Uses limit(1) queries to consume only 1-2 document reads instead of full collection scans.
 */
export async function isDatabasePopulated(): Promise<boolean> {
  try {
    const ordersSnap = await getDocs(query(collection(db, 'orders'), limit(1)));
    if (!ordersSnap.empty) return true;

    const customersSnap = await getDocs(query(collection(db, 'customers'), limit(1)));
    if (!customersSnap.empty) return true;

    const quotesSnap = await getDocs(query(collection(db, 'crmQuotations'), limit(1)));
    return !quotesSnap.empty;
  } catch (err) {
    console.warn("isDatabasePopulated check failed:", err);
    throw err;
  }
}

// Check with server and sync any local cache records to Firestore if they are missing or if the DB is empty
export async function seedFirestoreIfEmpty(seedData: AppState): Promise<void> {
  try {
    const syncCollectionToFirestore = async (name: string, items: any[]) => {
      if (!items || items.length === 0) return;
      const colRef = collection(db, name);
      // Lightweight emptiness check using limit(1) to avoid reading entire collections!
      const checkSnap = await getDocs(query(colRef, limit(1)));
      
      if (checkSnap.empty) {
        console.log(`Cloud collection '${name}' is empty. Initially seeding '${name}' with ${items.length} initial items...`);
        // Batch write with chunking (max 450 items per batch)
        const chunkSize = 450;
        for (let i = 0; i < items.length; i += chunkSize) {
          const chunk = items.slice(i, i + chunkSize);
          const batch = writeBatch(db);
          for (const item of chunk) {
            if (item && item.id) {
              batch.set(doc(db, name, String(item.id)), cleanUndefined(item));
            }
          }
          await batch.commit();
        }
      } else if (name === 'users') {
        const usersSnap = await getDocs(colRef);
        const batch = writeBatch(db);
        let modified = false;
        const existingEmails = new Set<string>();
        const existingIds = new Set<string>();

        usersSnap.docs.forEach((d) => {
          const userData = d.data();
          existingIds.add(d.id);
          if (typeof userData.email === 'string' && userData.email.trim()) {
            existingEmails.add(userData.email.trim().toLowerCase());
          }
        });

        // Only add missing non-demo seed users without deleting or overwriting any existing users
        for (const item of items) {
          const emailLower = typeof item?.email === 'string' ? item.email.trim().toLowerCase() : '';
          if (!item?.id || !emailLower || emailLower.endsWith('@example.com')) continue;
          if (!existingIds.has(item.id) && !existingEmails.has(emailLower)) {
            batch.set(doc(db, 'users', item.id), cleanUndefined(sanitizeUserForFirestore(item)));
            modified = true;
          }
        }

        if (modified) {
          console.log("Synchronizing missing non-demo users in Firestore...");
          await batch.commit();
        }
      }
    };

    // Synchronize and seed all collections step by step
    await syncCollectionToFirestore('users', seedData.users || []);
    await syncCollectionToFirestore('customers', seedData.customers || []);
    await syncCollectionToFirestore('orders', seedData.orders || []);
    await syncCollectionToFirestore('statusLogs', seedData.statusLogs || []);
    await syncCollectionToFirestore('materials', seedData.materials || []);
    await syncCollectionToFirestore('payments', seedData.payments || []);
    await syncCollectionToFirestore('crmCustomers', seedData.crmCustomers || []);
    await syncCollectionToFirestore('crmQuotations', seedData.crmQuotations || []);
    await syncCollectionToFirestore('crmFollowUps', seedData.crmFollowUps || []);
    await syncCollectionToFirestore('crmPayments', seedData.crmPayments || []);
    await syncCollectionToFirestore('crmNotes', seedData.crmNotes || []);
    await syncCollectionToFirestore('crmAttachments', seedData.crmAttachments || []);
    await syncCollectionToFirestore('crmTimelineEvents', seedData.crmTimelineEvents || []);
    await syncCollectionToFirestore('cncJobs', seedData.cncJobs || []);
    await syncCollectionToFirestore('cncTools', seedData.cncTools || []);

    console.log("Database initialization and synchronization sync phase complete.");
  } catch (error) {
    console.error("Failed to complete local-to-cloud sync phase on initialization:", error);
  }
}

/**
 * Pushes ALL local state data explicitly to Firestore.
 * Useful when syncing data across devices or restoring after reconnect.
 */
export async function pushAllLocalDataToFirestore(state: AppState): Promise<{ success: boolean; count: number; message: string }> {
  try {
    let totalWritten = 0;
    const collectionsToSync: Array<{ name: string; items: any[] }> = [
      { name: 'users', items: state.users || [] },
      { name: 'customers', items: state.customers || [] },
      { name: 'orders', items: state.orders || [] },
      { name: 'statusLogs', items: state.statusLogs || [] },
      { name: 'materials', items: state.materials || [] },
      { name: 'payments', items: state.payments || [] },
      { name: 'crmCustomers', items: state.crmCustomers || [] },
      { name: 'crmQuotations', items: state.crmQuotations || [] },
      { name: 'crmFollowUps', items: state.crmFollowUps || [] },
      { name: 'crmPayments', items: state.crmPayments || [] },
      { name: 'crmNotes', items: state.crmNotes || [] },
      { name: 'crmAttachments', items: state.crmAttachments || [] },
      { name: 'crmTimelineEvents', items: state.crmTimelineEvents || [] },
      { name: 'auditLogs', items: state.auditLogs || [] },
      { name: 'cncJobs', items: state.cncJobs || [] },
      { name: 'cncTools', items: state.cncTools || [] },
    ];

    for (const col of collectionsToSync) {
      if (col.items.length === 0) continue;
      const chunkSize = 400;
      for (let i = 0; i < col.items.length; i += chunkSize) {
        const chunk = col.items.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        for (const item of chunk) {
          if (item && item.id) {
            batch.set(doc(db, col.name, String(item.id)), cleanUndefined(item));
            totalWritten++;
          }
        }
        await batch.commit();
      }
    }

    return {
      success: true,
      count: totalWritten,
      message: `Successfully synchronized ${totalWritten} records to Firebase Cloud Firestore.`,
    };
  } catch (error) {
    console.error("Failed to push all local data to Firestore:", error);
    return {
      success: false,
      count: 0,
      message: `Sync failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Explicitly pulls all documents across all collections from Cloud Firestore.
 */
export async function fetchFullFirestoreState(): Promise<Partial<AppState>> {
  const result: Partial<AppState> = {};

  const fetchCollection = async (name: string): Promise<any[]> => {
    try {
      const colRef = collection(db, name);
      const snapshot = await getDocs(colRef);
      return snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        if (name === 'orders') {
          const norm = normalizeStage(data.current_status || data.stage || data.status || data.production_stage || data.stage_name || 'Pending');
          return {
            ...data,
            id: docSnap.id,
            current_status: norm,
            stage: norm,
          };
        }
        return {
          ...data,
          id: docSnap.id,
        };
      });
    } catch (err) {
      console.warn(`Could not fetch collection ${name}:`, err);
      return [];
    }
  };

  const [
    users,
    customers,
    orders,
    statusLogs,
    materials,
    payments,
    crmCustomers,
    crmQuotations,
    crmFollowUps,
    crmPayments,
    crmNotes,
    crmAttachments,
    crmTimelineEvents,
    auditLogs,
    cncJobs,
    cncTools,
  ] = await Promise.all([
    fetchCollection('users'),
    fetchCollection('customers'),
    fetchCollection('orders'),
    fetchCollection('statusLogs'),
    fetchCollection('materials'),
    fetchCollection('payments'),
    fetchCollection('crmCustomers'),
    fetchCollection('crmQuotations'),
    fetchCollection('crmFollowUps'),
    fetchCollection('crmPayments'),
    fetchCollection('crmNotes'),
    fetchCollection('crmAttachments'),
    fetchCollection('crmTimelineEvents'),
    fetchCollection('auditLogs'),
    fetchCollection('cncJobs'),
    fetchCollection('cncTools'),
  ]);

  if (users.length > 0) result.users = users as User[];
  if (customers.length > 0) result.customers = customers as Customer[];
  if (orders.length > 0) result.orders = orders as Order[];
  if (statusLogs.length > 0) result.statusLogs = statusLogs as StatusLog[];
  if (materials.length > 0) result.materials = materials as Material[];
  if (payments.length > 0) result.payments = payments as Payment[];
  if (crmCustomers.length > 0) result.crmCustomers = crmCustomers as CRMCustomer[];
  if (crmQuotations.length > 0) result.crmQuotations = crmQuotations as CRMQuotation[];
  if (crmFollowUps.length > 0) result.crmFollowUps = crmFollowUps as CRMFollowUp[];
  if (crmPayments.length > 0) result.crmPayments = crmPayments as CRMPayment[];
  if (crmNotes.length > 0) result.crmNotes = crmNotes as CRMNote[];
  if (crmAttachments.length > 0) result.crmAttachments = crmAttachments as CRMAttachment[];
  if (crmTimelineEvents.length > 0) result.crmTimelineEvents = crmTimelineEvents as CRMTimelineEvent[];
  if (auditLogs.length > 0) result.auditLogs = auditLogs as AuditLog[];
  if (cncJobs.length > 0) result.cncJobs = cncJobs as CNCJob[];
  if (cncTools.length > 0) result.cncTools = cncTools as CNCTool[];

  return result;
}

export interface SyncFirestoreOptions {
  currentUser?: User | null;
}

// Sync Firestore changes in real-time
export function syncFirestore(
  onUpdate: (updatedState: Partial<AppState>) => void,
  onError: (error: Error) => void,
  options?: SyncFirestoreOptions
): () => void {
  const unsubscribers: (() => void)[] = [];
  const activeUser = options?.currentUser;
  const operatorOnly = Boolean(activeUser && isOperatorRole(activeUser.role));

  const listenCollection = (
    name: string, 
    callback: (docs: any[]) => void,
    constraints?: QueryConstraint[]
  ) => {
    const colRef = collection(db, name);
    const targetQuery = constraints && constraints.length > 0
      ? query(colRef, ...constraints)
      : colRef;

    const unsub = onSnapshot(
      targetQuery,
      (snapshot) => {
        const docs = snapshot.docs
          .map(docSnap => {
            const data = docSnap.data();
            const docId = docSnap.id;
            // Retain all non-empty documents safely without executing destructive auto-deletes
            if (!data) return null;
            if (name === 'orders') {
              const norm = normalizeStage(data.current_status || data.stage || data.status || data.production_stage || data.stage_name || 'Pending');
              return {
                ...data,
                id: docId,
                current_status: norm,
                stage: norm,
              };
            }
            return {
              ...data,
              id: docId // Firestore document ID is authoritative
            };
          })
          .filter(Boolean);
        callback(docs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, name);
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    );
    unsubscribers.push(unsub);
  };

  if (operatorOnly && activeUser) {
    // Operators strictly sync only their own user record and CNC jobs assigned to their user ID
    listenCollection('users', (docs) => onUpdate({ users: docs as User[] }), [where('id', '==', activeUser.id)]);
    listenCollection('cncJobs', (docs) => onUpdate({ cncJobs: docs as CNCJob[] }), [where('operator_id', '==', activeUser.id)]);
  } else {
    listenCollection('users', (docs) => onUpdate({ users: docs as User[] }));
    listenCollection('customers', (docs) => onUpdate({ customers: docs as Customer[] }));
    listenCollection('orders', (docs) => onUpdate({ orders: docs as Order[] }));
    // Bound append-only collections to avoid reading thousands of historical logs repeatedly
    listenCollection('statusLogs', (docs) => onUpdate({ statusLogs: docs as StatusLog[] }), [orderBy('timestamp', 'desc'), limit(500)]);
    listenCollection('materials', (docs) => onUpdate({ materials: docs as Material[] }));
    listenCollection('payments', (docs) => onUpdate({ payments: docs as Payment[] }));
    listenCollection('crmCustomers', (docs) => onUpdate({ crmCustomers: docs as CRMCustomer[] }));
    listenCollection('crmQuotations', (docs) => onUpdate({ crmQuotations: docs as CRMQuotation[] }));
    listenCollection('crmFollowUps', (docs) => onUpdate({ crmFollowUps: docs as CRMFollowUp[] }));
    listenCollection('crmPayments', (docs) => onUpdate({ crmPayments: docs as CRMPayment[] }));
    listenCollection('crmNotes', (docs) => onUpdate({ crmNotes: docs as CRMNote[] }));
    listenCollection('crmAttachments', (docs) => onUpdate({ crmAttachments: docs as CRMAttachment[] }));
    listenCollection('crmTimelineEvents', (docs) => onUpdate({ crmTimelineEvents: docs as CRMTimelineEvent[] }));
    listenCollection('auditLogs', (docs) => onUpdate({ auditLogs: docs as AuditLog[] }), [orderBy('timestamp', 'desc'), limit(100)]);
    listenCollection('cncJobs', (docs) => onUpdate({ cncJobs: docs as CNCJob[] }));
    listenCollection('cncTools', (docs) => onUpdate({ cncTools: docs as CNCTool[] }));
  }

  return () => {
    unsubscribers.forEach(unsub => unsub());
  };
}

// Helper to transitively strip out "undefined" fields which are unsupported by firestore
function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj.toISOString() as unknown as T;
  if (Array.isArray(obj)) {
    return obj
      .filter(item => item !== undefined)
      .map(item => cleanUndefined(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      const val = (obj as any)[key];
      if (val !== undefined) {
        cleaned[key] = cleanUndefined(val);
      }
    }
    return cleaned as T;
  }
  return obj;
}

function sanitizeUserForFirestore(user: User): Record<string, any> {
  const { permissions: _ignoredPermissions, ...rest } = user as User & { permissions?: unknown };
  const normalizedStatus = (user.status || (user.is_active !== false ? 'ACTIVE' : 'INACTIVE')).toUpperCase() as User['status'];
  const normalizedRole = (String(user.role) === 'operator' ? 'cnc_operator' : user.role) as User['role'];
  return {
    ...rest,
    email: (user.email || '').trim().toLowerCase(),
    role: normalizedRole,
    initials: (user.initials || user.name?.slice(0, 2) || 'US').trim().toUpperCase().slice(0, 6),
    status: normalizedStatus,
    is_active: normalizedStatus === 'ACTIVE',
  };
}

// Standard Write and Mutate Operations securely isolated with handleFirestoreError
export async function saveUserToFirebase(user: User): Promise<void> {
  const path = `users/${user.id}`;
  try {
    await setDoc(doc(db, 'users', user.id), cleanUndefined(sanitizeUserForFirestore(user)), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function updateUserLoginMetadataInFirebase(
  userId: string,
  metadata: Partial<Pick<User, 'auth_uid' | 'google_linked' | 'password_configured' | 'activation_status' | 'last_seen'>>
): Promise<void> {
  if (!userId) return;
  const path = `users/${userId}`;
  const allowedPayload = cleanUndefined({
    ...(metadata.auth_uid !== undefined ? { auth_uid: metadata.auth_uid } : {}),
    ...(metadata.google_linked !== undefined ? { google_linked: metadata.google_linked } : {}),
    ...(metadata.password_configured !== undefined ? { password_configured: metadata.password_configured } : {}),
    ...(metadata.activation_status !== undefined ? { activation_status: metadata.activation_status } : {}),
    ...(metadata.last_seen !== undefined ? { last_seen: metadata.last_seen } : {}),
  });
  if (Object.keys(allowedPayload).length === 0) return;
  try {
    await updateDoc(doc(db, 'users', userId), allowedPayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

export async function saveCustomerToFirebase(customer: Customer): Promise<void> {
  const path = `customers/${customer.id}`;
  try {
    await setDoc(doc(db, 'customers', customer.id), cleanUndefined(customer));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteCustomerFromFirebase(customerId: string): Promise<void> {
  const path = `customers/${customerId}`;
  try {
    await deleteDoc(doc(db, 'customers', customerId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fetchOrdersFromFirestore(): Promise<Order[]> {
  const path = 'orders';
  try {
    const colRef = collection(db, path);
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      const norm = normalizeStage(data.current_status || data.stage || data.status || data.production_stage || data.stage_name || 'Pending');
      return {
        ...data,
        id: docSnap.id,
        current_status: norm,
        stage: norm,
      } as Order;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    throw error;
  }
}

export async function fetchStatusLogsFromFirestore(): Promise<StatusLog[]> {
  const path = 'statusLogs';
  try {
    const colRef = collection(db, path);
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        ...data,
        id: docSnap.id
      } as StatusLog;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function fetchPaymentsFromFirestore(): Promise<Payment[]> {
  const path = 'payments';
  try {
    const colRef = collection(db, path);
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        ...data,
        id: docSnap.id
      } as Payment;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function saveOrderToFirebase(order: Order): Promise<void> {
  const path = `orders/${order.id}`;
  const norm = normalizeStage(order.current_status || (order as any).stage || 'Pending');
  const payload = {
    ...order,
    current_status: norm,
    stage: norm,
  };
  try {
    await setDoc(doc(db, 'orders', order.id), cleanUndefined(payload));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteOrderFromFirebase(orderId: string): Promise<void> {
  if (!orderId || !orderId.trim()) {
    throw new Error('Invalid order ID provided for deletion');
  }

  const trimmedId = orderId.trim();
  const path = `orders/${trimmedId}`;

  try {
    // 1. Direct document deletion using doc ID
    await deleteDoc(doc(db, 'orders', trimmedId));

    // 2. Cascade cleanup of related status logs via targeted query (reads only this order's logs!)
    try {
      const logsQuery = query(collection(db, 'statusLogs'), where('order_id', '==', trimmedId));
      const logsSnap = await getDocs(logsQuery);
      if (!logsSnap.empty) {
        const batch = writeBatch(db);
        logsSnap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (logErr) {
      console.warn(`Targeted cascading statusLogs deletion notice for ${trimmedId}:`, logErr);
    }

    // 3. Cascade cleanup of related payments via targeted query (reads only this order's payments!)
    try {
      const payQuery = query(collection(db, 'payments'), where('order_id', '==', trimmedId));
      const paySnap = await getDocs(payQuery);
      if (!paySnap.empty) {
        const batch = writeBatch(db);
        paySnap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (payErr) {
      console.warn(`Targeted cascading payments deletion notice for ${trimmedId}:`, payErr);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

export async function saveStatusLogToFirebase(log: StatusLog): Promise<void> {
  const path = `statusLogs/${log.id}`;
  try {
    await setDoc(doc(db, 'statusLogs', log.id), cleanUndefined(log));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteStatusLogFromFirebase(logId: string): Promise<void> {
  const path = `statusLogs/${logId}`;
  try {
    await deleteDoc(doc(db, 'statusLogs', logId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveMaterialToFirebase(material: Material): Promise<void> {
  const path = `materials/${material.id}`;
  try {
    await setDoc(doc(db, 'materials', material.id), cleanUndefined(material));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function savePaymentToFirebase(payment: Payment): Promise<void> {
  const path = `payments/${payment.id}`;
  try {
    await setDoc(doc(db, 'payments', payment.id), cleanUndefined(payment));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deletePaymentFromFirebase(paymentId: string): Promise<void> {
  const path = `payments/${paymentId}`;
  try {
    await deleteDoc(doc(db, 'payments', paymentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function deleteUserFromFirebase(userId: string): Promise<void> {
  const path = `users/${userId}`;
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// CRM write and delete operations
export async function fetchCRMCustomersFromFirestore(): Promise<CRMCustomer[]> {
  const path = 'crmCustomers';
  try {
    const colRef = collection(db, path);
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        ...data,
        id: docSnap.id
      } as CRMCustomer;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function saveCRMCustomerToFirebase(cust: CRMCustomer): Promise<void> {
  const path = `crmCustomers/${cust.id}`;
  try {
    await setDoc(doc(db, 'crmCustomers', cust.id), cleanUndefined(cust));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteCRMCustomerFromFirebase(id: string): Promise<void> {
  if (!id || !id.trim()) return;
  const trimmedId = id.trim();
  const path = `crmCustomers/${trimmedId}`;
  try {
    await deleteDoc(doc(db, 'crmCustomers', trimmedId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveCRMQuotationToFirebase(quote: CRMQuotation): Promise<void> {
  const path = `crmQuotations/${quote.id}`;
  try {
    const sanitizedQuote: CRMQuotation = {
      ...quote,
      items: Array.isArray(quote.items) ? quote.items.map((item, idx) => ({
        ...item,
        id: item.id || `item_${quote.id}_${idx + 1}`,
        images: Array.isArray(item.images)
          ? item.images.map((img: any) => {
              if (typeof img === 'string') return { url: img, description: '' };
              if (img && typeof img === 'object' && img.url) return { url: img.url, description: img.description || '' };
              return null;
            }).filter(Boolean)
          : []
      })) : []
    };
    await setDoc(doc(db, 'crmQuotations', quote.id), cleanUndefined(sanitizedQuote));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteCRMQuotationFromFirebase(id: string): Promise<void> {
  if (!id || !id.trim()) return;
  const trimmedId = id.trim();
  const path = `crmQuotations/${trimmedId}`;
  try {
    await deleteDoc(doc(db, 'crmQuotations', trimmedId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

export async function saveCRMFollowUpToFirebase(item: CRMFollowUp): Promise<void> {
  const path = `crmFollowUps/${item.id}`;
  try {
    await setDoc(doc(db, 'crmFollowUps', item.id), cleanUndefined(item));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCRMFollowUpFromFirebase(id: string): Promise<void> {
  const path = `crmFollowUps/${id}`;
  try {
    await deleteDoc(doc(db, 'crmFollowUps', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveCRMPaymentToFirebase(item: CRMPayment): Promise<void> {
  const path = `crmPayments/${item.id}`;
  try {
    await setDoc(doc(db, 'crmPayments', item.id), cleanUndefined(item));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCRMPaymentFromFirebase(id: string): Promise<void> {
  const path = `crmPayments/${id}`;
  try {
    await deleteDoc(doc(db, 'crmPayments', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveCRMNoteToFirebase(item: CRMNote): Promise<void> {
  const path = `crmNotes/${item.id}`;
  try {
    await setDoc(doc(db, 'crmNotes', item.id), cleanUndefined(item));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCRMNoteFromFirebase(id: string): Promise<void> {
  const path = `crmNotes/${id}`;
  try {
    await deleteDoc(doc(db, 'crmNotes', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveCRMAttachmentToFirebase(item: CRMAttachment): Promise<void> {
  const path = `crmAttachments/${item.id}`;
  try {
    await setDoc(doc(db, 'crmAttachments', item.id), cleanUndefined(item));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCRMAttachmentFromFirebase(id: string): Promise<void> {
  const path = `crmAttachments/${id}`;
  try {
    await deleteDoc(doc(db, 'crmAttachments', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveCRMTimelineEventToFirebase(item: CRMTimelineEvent): Promise<void> {
  const path = `crmTimelineEvents/${item.id}`;
  try {
    await setDoc(doc(db, 'crmTimelineEvents', item.id), cleanUndefined(item));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveAuditLogToFirebase(log: AuditLog): Promise<void> {
  const path = `auditLogs/${log.id}`;
  try {
    await setDoc(doc(db, 'auditLogs', log.id), cleanUndefined(log));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    // Don't crash caller on background audit logging, but log warning
    console.warn("Audit log save note:", error);
  }
}

/**
 * Replaces old CRM Customer document IDs (e.g. 477..483) with new continuous IDs (e.g. 033..039)
 * and updates any related quotations, followups, notes, attachments, payments, timeline events, and orders in Firestore.
 */
export async function syncResequencedCRMCustomersToFirestore(
  idMapping: Record<string, string>,
  updatedState: AppState
): Promise<void> {
  const oldIds = Object.keys(idMapping);
  if (oldIds.length === 0) return;

  try {
    const batch = writeBatch(db);
    const newIdsSet = new Set(Object.values(idMapping));

    // 1. Delete old customer docs and write new ones
    for (const oldId of oldIds) {
      const newId = idMapping[oldId];
      const customer = updatedState.crmCustomers?.find((c) => c.id === newId);
      if (customer) {
        // Delete old doc
        const oldDocRef = doc(db, 'crmCustomers', oldId);
        batch.delete(oldDocRef);
        // Write new doc
        const newDocRef = doc(db, 'crmCustomers', newId);
        batch.set(newDocRef, cleanUndefined(customer));
      }

      // Also clean up any directory customer doc with oldId
      const oldDirectoryDocRef = doc(db, 'customers', oldId);
      batch.delete(oldDirectoryDocRef);
      const dirCust = updatedState.customers?.find((c) => c.id === newId);
      if (dirCust) {
        const newDirectoryDocRef = doc(db, 'customers', newId);
        batch.set(newDirectoryDocRef, cleanUndefined(dirCust));
      }
    }

    // 2. Update quotations that referenced old customer IDs
    (updatedState.crmQuotations || []).forEach((q) => {
      if (q && q.id && newIdsSet.has(q.customer_id)) {
        const qRef = doc(db, 'crmQuotations', q.id);
        batch.set(qRef, cleanUndefined(q));
      }
    });

    // 3. Update follow-ups
    (updatedState.crmFollowUps || []).forEach((f) => {
      if (f && f.id && newIdsSet.has(f.customer_id)) {
        const fRef = doc(db, 'crmFollowUps', f.id);
        batch.set(fRef, cleanUndefined(f));
      }
    });

    // 4. Update notes
    (updatedState.crmNotes || []).forEach((n) => {
      if (n && n.id && newIdsSet.has(n.customer_id)) {
        const nRef = doc(db, 'crmNotes', n.id);
        batch.set(nRef, cleanUndefined(n));
      }
    });

    // 5. Update attachments
    (updatedState.crmAttachments || []).forEach((a) => {
      if (a && a.id && newIdsSet.has(a.customer_id)) {
        const aRef = doc(db, 'crmAttachments', a.id);
        batch.set(aRef, cleanUndefined(a));
      }
    });

    // 6. Update payments
    (updatedState.crmPayments || []).forEach((p) => {
      if (p && p.id && newIdsSet.has(p.customer_id)) {
        const pRef = doc(db, 'crmPayments', p.id);
        batch.set(pRef, cleanUndefined(p));
      }
    });

    // 7. Update timeline events
    (updatedState.crmTimelineEvents || []).forEach((e) => {
      if (e && e.id && newIdsSet.has(e.customer_id)) {
        const eRef = doc(db, 'crmTimelineEvents', e.id);
        batch.set(eRef, cleanUndefined(e));
      }
    });

    // 8. Update orders
    (updatedState.orders || []).forEach((o) => {
      if (o && o.id && newIdsSet.has(o.customer_id || '')) {
        const oRef = doc(db, 'orders', o.id);
        batch.set(oRef, cleanUndefined(o));
      }
    });

    await batch.commit();
    console.log(`Successfully synced ${oldIds.length} resequenced CRM customer IDs to Firestore.`);
  } catch (err) {
    console.error('Failed to sync resequenced CRM customer IDs to Firestore:', err);
  }
}

export async function saveCNCJobToFirebase(job: CNCJob): Promise<void> {
  const path = `cncJobs/${job.id}`;
  try {
    await setDoc(doc(db, 'cncJobs', job.id), cleanUndefined(job));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCNCJobFromFirebase(jobId: string): Promise<void> {
  const path = `cncJobs/${jobId}`;
  try {
    await deleteDoc(doc(db, 'cncJobs', jobId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveCNCToolToFirebase(tool: CNCTool): Promise<void> {
  const path = `cncTools/${tool.id}`;
  try {
    await setDoc(doc(db, 'cncTools', tool.id), cleanUndefined(tool));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCNCToolFromFirebase(toolId: string): Promise<void> {
  const path = `cncTools/${toolId}`;
  try {
    await deleteDoc(doc(db, 'cncTools', toolId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Saves or updates CNC Program File metadata in subcollection:
 * cncJobs/{jobId}/programFiles/{fileId}
 */
export async function saveCNCProgramFileMetadata(
  jobId: string,
  programFile: CNCProgramFile
): Promise<void> {
  if (!jobId || !programFile?.id) {
    throw new Error('Missing CNC Job ID or Program File ID.');
  }
  const path = `cncJobs/${jobId}/programFiles/${programFile.id}`;
  try {
    const fileRef = doc(db, 'cncJobs', jobId, 'programFiles', programFile.id);
    await setDoc(fileRef, cleanUndefined(programFile), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

/**
 * Fetches all CNC Program File metadata documents for a job from subcollection.
 */
export async function fetchCNCProgramFiles(jobId: string): Promise<CNCProgramFile[]> {
  if (!jobId) return [];
  const path = `cncJobs/${jobId}/programFiles`;
  try {
    const subColRef = collection(db, 'cncJobs', jobId, 'programFiles');
    const snapshot = await getDocs(subColRef);
    const files: CNCProgramFile[] = [];
    snapshot.forEach((d) => {
      files.push(d.data() as CNCProgramFile);
    });
    return files.sort((a, b) => (b.version || 1) - (a.version || 1));
  } catch (error) {
    console.warn(`Could not fetch program files from ${path}:`, error);
    return [];
  }
}

/**
 * Real-time listener for CNC Program Files of a specific CNC job document.
 */
export function listenCNCProgramFiles(
  jobId: string,
  onUpdate: (files: CNCProgramFile[]) => void
): () => void {
  if (!jobId) {
    onUpdate([]);
    return () => {};
  }
  const subColRef = collection(db, 'cncJobs', jobId, 'programFiles');
  const unsubscribe = onSnapshot(
    subColRef,
    (snapshot) => {
      const files: CNCProgramFile[] = [];
      snapshot.forEach((d) => {
        files.push(d.data() as CNCProgramFile);
      });
      // Sort newest / highest version and active first
      files.sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return (b.version || 1) - (a.version || 1);
      });
      onUpdate(files);
    },
    (err) => {
      console.warn(`Realtime listener error on cncJobs/${jobId}/programFiles:`, err);
    }
  );
  return unsubscribe;
}

/**
 * Deletes CNC Program File metadata document from subcollection.
 */
export async function deleteCNCProgramFileMetadata(
  jobId: string,
  fileId: string
): Promise<void> {
  if (!jobId || !fileId) return;
  const path = `cncJobs/${jobId}/programFiles/${fileId}`;
  try {
    const fileRef = doc(db, 'cncJobs', jobId, 'programFiles', fileId);
    await deleteDoc(fileRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Updates program_files_count on an existing parent CNC job document.
 */
export async function updateCNCJobFilesCount(
  jobId: string,
  count: number
): Promise<void> {
  if (!jobId) return;
  try {
    const jobRef = doc(db, 'cncJobs', jobId);
    await updateDoc(jobRef, {
      program_files_count: count,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn(`Could not update program_files_count for job ${jobId}:`, err);
  }
}

function normalizeUserDocFromFirestore(docId: string, rawData: any): User {
  const status = String(rawData?.status || (rawData?.is_active !== false ? 'ACTIVE' : 'INACTIVE')).toUpperCase() as User['status'];
  return {
    ...rawData,
    id: docId,
    email: String(rawData?.email || '').trim().toLowerCase(),
    name: String(rawData?.name || rawData?.email || 'Staff User'),
    role: (rawData?.role || 'carpenter') as User['role'],
    initials: String(rawData?.initials || rawData?.name?.slice(0, 2) || 'SU').toUpperCase(),
    status,
    is_active: status === 'ACTIVE',
    created_at: rawData?.created_at || new Date().toISOString(),
  };
}

/**
 * Resolves the authoritative staff user document from Firestore after Firebase Auth sign-in.
 * Supports existing users across fresh browsers even before localStorage or users collection listeners hydrate.
 */
export async function resolveAuthenticatedUserFromFirebase(
  authUid: string,
  authEmail?: string | null
): Promise<User | null> {
  const emailLower = (authEmail || '').trim().toLowerCase();

  // 1. Check authoritative UID mapping first
  if (authUid) {
    try {
      const mapSnap = await getDoc(doc(db, 'userAuthMap', authUid));
      if (mapSnap.exists()) {
        const mapData = mapSnap.data() as { userId?: string; email?: string; name?: string; role?: string; status?: string };
        if (mapData?.userId) {
          try {
            const userSnap = await getDoc(doc(db, 'users', mapData.userId));
            if (userSnap.exists()) {
              return normalizeUserDocFromFirestore(userSnap.id, userSnap.data());
            }
          } catch (userLookupErr) {
            console.warn('Mapped user profile fetch notice:', userLookupErr);
          }
          return normalizeUserDocFromFirestore(mapData.userId, {
            email: mapData.email || emailLower,
            name: mapData.name || emailLower.split('@')[0] || 'Staff User',
            role: mapData.role || 'carpenter',
            status: mapData.status || 'ACTIVE',
            auth_uid: authUid,
          });
        }
      }
    } catch (mapErr) {
      console.warn('userAuthMap lookup notice:', mapErr);
    }
  }

  // 2. Check hashed operator/staff invite -> fetch full authoritative /users/{userId} doc
  if (emailLower) {
    try {
      const invite = await checkOperatorInviteByEmail(emailLower);
      if (invite?.userId) {
        try {
          const userSnap = await getDoc(doc(db, 'users', invite.userId));
          if (userSnap.exists()) {
            return normalizeUserDocFromFirestore(userSnap.id, userSnap.data());
          }
        } catch (inviteUserErr) {
          console.warn('Invite user document lookup notice:', inviteUserErr);
        }
      }
    } catch (inviteErr) {
      console.warn('Invite check notice:', inviteErr);
    }
  }

  // 3. Check direct UID-keyed /users documents (readable when auth_uid or email matches)
  if (authUid) {
    for (const candidateId of [authUid, `user_${authUid}`]) {
      try {
        const directSnap = await getDoc(doc(db, 'users', candidateId));
        if (directSnap.exists()) {
          return normalizeUserDocFromFirestore(directSnap.id, directSnap.data());
        }
      } catch {
        // Ignore permission-denied on non-existent or unowned candidate IDs
      }
    }
  }

  // 4. For bootstrap admin or already-verified staff, query /users by email
  if (emailLower) {
    const emailCandidates = Array.from(new Set([emailLower, (authEmail || '').trim()].filter(Boolean)));
    for (const candidateEmail of emailCandidates) {
      try {
        const q = query(collection(db, 'users'), where('email', '==', candidateEmail), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const d = snap.docs[0];
          return normalizeUserDocFromFirestore(d.id, d.data());
        }
      } catch {
        // Non-admin unmapped sessions cannot list /users under security rules; expected fallback
      }
    }
  }

  return null;
}

/**
 * Persists the authoritative Firebase Auth UID -> Staff User mapping in /userAuthMap/{authUid}
 * so Firestore security rules can enforce RBAC & operator job ownership without relying on client claims.
 * Propagates errors to callers so UID mapping failures are never silently masked.
 */
export async function syncUserAuthMapToFirebase(authUid: string, user: User): Promise<void> {
  if (!authUid || !user?.id) {
    throw new Error('Missing Firebase UID or staff user ID for authorization mapping.');
  }
  const path = `userAuthMap/${authUid}`;
  try {
    const normalizedEmail = (user.email || '').trim().toLowerCase();
    const status = (user.status || (user.is_active !== false ? 'ACTIVE' : 'INACTIVE')).toUpperCase();
    await setDoc(
      doc(db, 'userAuthMap', authUid),
      cleanUndefined({
        auth_uid: authUid,
        userId: user.id,
        email: normalizedEmail,
        name: user.name,
        role: user.role,
        status,
        updated_at: new Date().toISOString(),
      }),
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

/**
 * Writes a non-PII operator/staff activation invite keyed by SHA-256(lowercaseEmail)
 * so first-time account activation can verify eligibility before signing in.
 */
export async function syncOperatorInviteToFirebase(user: User, previousEmail?: string): Promise<void> {
  if (!user?.email || !user?.id) return;
  const cleanEmail = user.email.trim().toLowerCase();
  if (cleanEmail.endsWith('@example.com')) return;
  try {
    if (previousEmail && previousEmail.trim().toLowerCase() !== cleanEmail) {
      await deleteOperatorInviteFromFirebase(previousEmail);
    }
    const inviteId = await sha256Hex(cleanEmail);
    const status = (user.status || (user.is_active ? 'ACTIVE' : 'INACTIVE')).toUpperCase();
    await setDoc(
      doc(db, 'operatorInvites', inviteId),
      cleanUndefined({
        userId: user.id,
        name: user.name,
        initials: user.initials,
        role: user.role,
        status,
        password_configured: Boolean(user.password_configured),
        is_operator: isOperatorRole(user.role),
        updated_at: new Date().toISOString(),
      }),
      { merge: true }
    );
  } catch (error) {
    console.warn('Operator invite sync notice:', error);
  }
}

/**
 * Updates only password_configured + updated_at on an existing operatorInvites record,
 * matching non-admin Firestore update rules.
 */
export async function markOperatorInvitePasswordConfigured(email: string): Promise<void> {
  if (!email) return;
  const cleanEmail = email.trim().toLowerCase();
  if (cleanEmail.endsWith('@example.com')) return;
  try {
    const inviteId = await sha256Hex(cleanEmail);
    const ref = doc(db, 'operatorInvites', inviteId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    await updateDoc(ref, {
      password_configured: true,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Operator invite password status update notice:', error);
  }
}

export async function deleteOperatorInviteFromFirebase(email: string): Promise<void> {
  if (!email) return;
  try {
    const inviteId = await sha256Hex(email.trim().toLowerCase());
    await deleteDoc(doc(db, 'operatorInvites', inviteId));
  } catch (error) {
    console.warn('Operator invite cleanup notice:', error);
  }
}

export interface OperatorInviteRecord {
  userId: string;
  name?: string;
  initials?: string;
  role: string;
  status: string;
  password_configured?: boolean;
}

/**
 * Looks up a single hashed invite doc by exact SHA-256(email) during first-time account activation.
 */
export async function checkOperatorInviteByEmail(email: string): Promise<OperatorInviteRecord | null> {
  if (!email) return null;
  try {
    const inviteId = await sha256Hex(email.trim().toLowerCase());
    const snap = await getDoc(doc(db, 'operatorInvites', inviteId));
    if (!snap.exists()) return null;
    return snap.data() as OperatorInviteRecord;
  } catch (error) {
    console.warn('Operator invite lookup notice:', error);
    return null;
  }
}





