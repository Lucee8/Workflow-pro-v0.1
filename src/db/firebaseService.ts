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
import { User, Customer, Order, StatusLog, Material, Payment, CRMCustomer, CRMQuotation, CRMFollowUp, CRMPayment, CRMNote, CRMAttachment, CRMTimelineEvent, CRMAgreement } from '../types';

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
    if (error instanceof Error && error.message.includes('offline')) {
      console.warn("Please check your Firebase configuration or network status.");
    }
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
        console.log(`Cloud collection '${name}' is empty. Initially seeding '${name}' with ${items.length} local items...`);
        const batch = writeBatch(db);
        for (const item of items) {
          batch.set(doc(db, name, item.id), cleanUndefined(item));
        }
        await batch.commit();
      } else {
        let currentSnapshot = snapshot;
        if (name === 'users') {
          const batch = writeBatch(db);
          let deletedAny = false;
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
              deletedAny = true;
            }
          });
          if (deletedAny) {
            console.log("Deleting old legacy users from Firestore...");
            await batch.commit();
            // Re-fetch snapshot to get the fresh accurate state of cloud documents
            currentSnapshot = await getDocs(colRef);
          }
        }

        // If Firestore already has some items, let's identify which local items are missing from the cloud
        // and upload only the missing ones so local-only or offline-created items are never lost!
        const existingCloudIds = currentSnapshot.docs.map(doc => doc.id);
        const missingLocalItems = items.filter(item => item.id && !existingCloudIds.includes(item.id));
        
        if (missingLocalItems.length > 0) {
          console.log(`Uploading ${missingLocalItems.length} local-only items to cloud collection '${name}'...`);
          const batch = writeBatch(db);
          for (const item of missingLocalItems) {
            batch.set(doc(db, name, item.id), cleanUndefined(item));
          }
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
    await syncCollectionToFirestore('crmAgreements', seedData.crmAgreements || []);

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
        const docs = snapshot.docs.map(doc => doc.data());
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
  listenCollection('crmAgreements', (docs) => onUpdate({ crmAgreements: docs as CRMAgreement[] }));

  return () => {
    unsubscribers.forEach(unsub => unsub());
  };
}

// Helper to transitively strip out "undefined" fields which are unsupported by firestore
function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item)) as unknown as T;
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
  }
}

export async function saveCustomerToFirebase(customer: Customer): Promise<void> {
  const path = `customers/${customer.id}`;
  try {
    await setDoc(doc(db, 'customers', customer.id), cleanUndefined(customer));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
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

export async function saveOrderToFirebase(order: Order): Promise<void> {
  const path = `orders/${order.id}`;
  try {
    await setDoc(doc(db, 'orders', order.id), cleanUndefined(order));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteOrderFromFirebase(orderId: string): Promise<void> {
  const path = `orders/${orderId}`;
  try {
    await deleteDoc(doc(db, 'orders', orderId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
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

export async function deleteUserFromFirebase(userId: string): Promise<void> {
  const path = `users/${userId}`;
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// CRM write and delete operations
export async function saveCRMCustomerToFirebase(cust: CRMCustomer): Promise<void> {
  const path = `crmCustomers/${cust.id}`;
  try {
    await setDoc(doc(db, 'crmCustomers', cust.id), cleanUndefined(cust));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCRMCustomerFromFirebase(id: string): Promise<void> {
  const path = `crmCustomers/${id}`;
  try {
    await deleteDoc(doc(db, 'crmCustomers', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveCRMQuotationToFirebase(quote: CRMQuotation): Promise<void> {
  const path = `crmQuotations/${quote.id}`;
  try {
    await setDoc(doc(db, 'crmQuotations', quote.id), cleanUndefined(quote));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCRMQuotationFromFirebase(id: string): Promise<void> {
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

export async function saveCRMAgreementToFirebase(item: CRMAgreement): Promise<void> {
  const path = `crmAgreements/${item.id}`;
  try {
    await setDoc(doc(db, 'crmAgreements', item.id), cleanUndefined(item));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCRMAgreementFromFirebase(id: string): Promise<void> {
  const path = `crmAgreements/${id}`;
  try {
    await deleteDoc(doc(db, 'crmAgreements', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}


