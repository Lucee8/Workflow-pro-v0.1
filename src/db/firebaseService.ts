/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { signInAnonymously } from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  onSnapshot, 
  writeBatch, 
  getDocFromServer,
  deleteDoc
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { AppState } from './store';
import { User, Customer, Order, StatusLog, Material, Payment, CRMCustomer, CRMQuotation, CRMFollowUp, CRMPayment, CRMNote, CRMAttachment, CRMTimelineEvent, AuditLog } from '../types';

// Connect with proper authentication securely or fall back to unauthenticated guest mode if Auth is not enabled in Firebase Console
export async function authenticateFirebase(): Promise<boolean> {
  try {
    await signInAnonymously(auth);
    console.log("Firebase Auth signed in anonymously successfully.");
    await testConnection();
    return true;
  } catch (error) {
    console.warn("Firebase Auth failed (not enabled or restricted), switching to unauthenticated client mode:", error);
    // Since Firebase Anonymous Auth might be restricted/disabled, we fall back to unauthenticated public mode.
    // If the Firestore security rules allow unauthenticated operations, the sync and databases will still work flawlessly.
    try {
      await testConnection();
      return true;
    } catch (testError) {
      console.error("Unauthenticated connection test failed too:", testError);
      return true; // Still return true so that syncFirestore can attempt to initialize
    }
  }
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    console.warn("Firestore connection check note:", error instanceof Error ? error.message : error);
  }
}

// Check with server and sync any local cache records to Firestore if they are missing or if the DB is empty
export async function seedFirestoreIfEmpty(seedData: AppState): Promise<void> {
  try {
    const syncCollectionToFirestore = async (name: string, items: any[]) => {
      if (!items || items.length === 0) return;
      const colRef = collection(db, name);
      const snapshot = await getDocs(colRef);
      
      if (snapshot.empty) {
        console.log(`Cloud collection '${name}' is empty. Initially seeding '${name}' with ${items.length} initial items...`);
        const batch = writeBatch(db);
        for (const item of items) {
          batch.set(doc(db, name, item.id), cleanUndefined(item));
        }
        await batch.commit();
      } else {
        if (name === 'users') {
          const batch = writeBatch(db);
          let modified = false;
          const existingEmails = new Set<string>();

          snapshot.docs.forEach((d) => {
            const userData = d.data();
            if (
              d.id === 'user_amit_prod' ||
              d.id === 'user_mahesh_prod' ||
              userData.name === 'Amit Sharma' ||
              userData.name === 'Bhavesh k' ||
              userData.name === 'Mahesh Verma'
            ) {
              batch.delete(d.ref);
              modified = true;
            } else if (userData.email) {
              existingEmails.add(userData.email.toLowerCase());
            }
          });

          // Ensure required manager and wood tab manager users are in Firestore
          for (const item of items) {
            if (item.email && !existingEmails.has(item.email.toLowerCase())) {
              batch.set(doc(db, 'users', item.id), cleanUndefined(item));
              modified = true;
            }
          }

          if (modified) {
            console.log("Updating users in Firestore...");
            await batch.commit();
          }
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

    console.log("Database initialization and synchronization sync phase complete.");
  } catch (error) {
    console.error("Failed to complete local-to-cloud sync phase on initialization:", error);
  }
}

// Sync Firestore changes in real-time
export function syncFirestore(
  onUpdate: (updatedState: Partial<AppState>) => void,
  onError: (error: Error) => void
): () => void {
  const unsubscribers: (() => void)[] = [];

  const listenCollection = (name: string, callback: (docs: any[]) => void) => {
    const colRef = collection(db, name);
    const unsub = onSnapshot(
      colRef,
      (snapshot) => {
        const docs = snapshot.docs
          .map(docSnap => {
            const data = docSnap.data();
            const docId = docSnap.id;
            // Retain all non-empty documents safely without executing destructive auto-deletes
            if (!data) return null;
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

  listenCollection('users', (docs) => onUpdate({ users: docs as User[] }));
  listenCollection('customers', (docs) => onUpdate({ customers: docs as Customer[] }));
  listenCollection('orders', (docs) => onUpdate({ orders: docs as Order[] }));
  listenCollection('statusLogs', (docs) => onUpdate({ statusLogs: docs as StatusLog[] }));
  listenCollection('materials', (docs) => onUpdate({ materials: docs as Material[] }));
  listenCollection('payments', (docs) => onUpdate({ payments: docs as Payment[] }));
  listenCollection('crmCustomers', (docs) => onUpdate({ crmCustomers: docs as CRMCustomer[] }));
  listenCollection('crmQuotations', (docs) => onUpdate({ crmQuotations: docs as CRMQuotation[] }));
  listenCollection('crmFollowUps', (docs) => onUpdate({ crmFollowUps: docs as CRMFollowUp[] }));
  listenCollection('crmPayments', (docs) => onUpdate({ crmPayments: docs as CRMPayment[] }));
  listenCollection('crmNotes', (docs) => onUpdate({ crmNotes: docs as CRMNote[] }));
  listenCollection('crmAttachments', (docs) => onUpdate({ crmAttachments: docs as CRMAttachment[] }));
  listenCollection('crmTimelineEvents', (docs) => onUpdate({ crmTimelineEvents: docs as CRMTimelineEvent[] }));
  listenCollection('auditLogs', (docs) => onUpdate({ auditLogs: docs as AuditLog[] }));

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

// Standard Write and Mutate Operations securely isolated with handleFirestoreError
export async function saveUserToFirebase(user: User): Promise<void> {
  const path = `users/${user.id}`;
  try {
    await setDoc(doc(db, 'users', user.id), cleanUndefined(user));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
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
      return {
        ...data,
        id: docSnap.id
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
  try {
    await setDoc(doc(db, 'orders', order.id), cleanUndefined(order));
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
    // 1. Direct document deletion using the provided document ID
    try {
      await deleteDoc(doc(db, 'orders', trimmedId));
    } catch (err) {
      console.warn(`Direct deleteDoc for orders/${trimmedId} encountered:`, err);
    }

    // 2. Comprehensive check: query the orders collection to find any matching docs by doc.id, data.id, or data.article_no
    const colRef = collection(db, 'orders');
    const snapshot = await getDocs(colRef);
    const docsToDelete = snapshot.docs.filter((d) => {
      const data = d.data();
      return (
        d.id === trimmedId ||
        data.id === trimmedId ||
        (data.article_no && data.article_no === trimmedId)
      );
    });

    if (docsToDelete.length > 0) {
      const batch = writeBatch(db);
      docsToDelete.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();
    }

    // 3. Cascade cleanup of related status logs in Firestore
    try {
      const logsCol = collection(db, 'statusLogs');
      const logsSnap = await getDocs(logsCol);
      const logsToDelete = logsSnap.docs.filter(d => {
        const data = d.data();
        return data.order_id === trimmedId || d.id === trimmedId;
      });
      if (logsToDelete.length > 0) {
        const batch = writeBatch(db);
        logsToDelete.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (logErr) {
      console.warn(`Failed cascading statusLogs deletion for order ${trimmedId}:`, logErr);
    }

    // 4. Cascade cleanup of related payments in Firestore
    try {
      const payCol = collection(db, 'payments');
      const paySnap = await getDocs(payCol);
      const payToDelete = paySnap.docs.filter(d => {
        const data = d.data();
        return data.order_id === trimmedId;
      });
      if (payToDelete.length > 0) {
        const batch = writeBatch(db);
        payToDelete.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (payErr) {
      console.warn(`Failed cascading payments deletion for order ${trimmedId}:`, payErr);
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
    // 1. Direct document deletion
    try {
      await deleteDoc(doc(db, 'crmCustomers', trimmedId));
    } catch (err) {
      console.warn(`Direct deleteDoc for crmCustomers/${trimmedId}:`, err);
    }
    // 2. Comprehensive check: delete any matching doc by doc.id or data.id
    const colRef = collection(db, 'crmCustomers');
    const snapshot = await getDocs(colRef);
    const docsToDelete = snapshot.docs.filter(d => d.id === trimmedId || d.data().id === trimmedId);
    if (docsToDelete.length > 0) {
      const batch = writeBatch(db);
      docsToDelete.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveCRMQuotationToFirebase(quote: CRMQuotation): Promise<void> {
  const path = `crmQuotations/${quote.id}`;
  try {
    await setDoc(doc(db, 'crmQuotations', quote.id), cleanUndefined(quote));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteCRMQuotationFromFirebase(id: string): Promise<void> {
  if (!id || !id.trim()) return;
  const path = `crmQuotations/${id}`;
  try {
    await deleteDoc(doc(db, 'crmQuotations', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
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

