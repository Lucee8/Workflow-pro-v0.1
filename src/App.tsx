/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { loadState, saveState, AppState } from './db/store';
import { User, Customer, Order, StatusLog, Payment, CRMCustomer, CRMQuotation, CRMFollowUp, CRMPayment, CRMNote, CRMAttachment, CRMTimelineEvent } from './types';
import {
  authenticateFirebase,
  seedFirestoreIfEmpty,
  syncFirestore,
  saveOrderToFirebase,
  deleteOrderFromFirebase,
  fetchOrdersFromFirestore,
  fetchStatusLogsFromFirestore,
  fetchPaymentsFromFirestore,
  saveCustomerToFirebase,
  deleteCustomerFromFirebase,
  saveStatusLogToFirebase,
  deleteStatusLogFromFirebase,
  savePaymentToFirebase,
  deletePaymentFromFirebase,
  saveUserToFirebase,
  deleteUserFromFirebase,
  saveCRMCustomerToFirebase,
  deleteCRMCustomerFromFirebase,
  saveCRMQuotationToFirebase,
  deleteCRMQuotationFromFirebase,
  saveCRMFollowUpToFirebase,
  deleteCRMFollowUpFromFirebase,
  saveCRMPaymentToFirebase,
  deleteCRMPaymentFromFirebase,
  saveCRMNoteToFirebase,
  deleteCRMNoteFromFirebase,
  saveCRMAttachmentToFirebase,
  deleteCRMAttachmentFromFirebase,
  saveCRMTimelineEventToFirebase
} from './db/firebaseService';

// Component imports
import SimulationHUD from './components/SimulationHUD';
import LoginScreen from './components/LoginScreen';
import Sidebar from './components/Sidebar';
import DashboardTab from './components/DashboardTab';
import OrdersTab from './components/OrdersTab';
import OrderForm from './components/OrderForm';
import OrderDetailsView from './components/OrderDetailsView';
import CalendarTab from './components/CalendarTab';
import { formatToDDMMYYYY } from './utils';
import UsersTab from './components/UsersTab';
import WorkerDashboard from './components/WorkerDashboard';
import NotificationCenter from './components/NotificationCenter';
import CustomersTab from './components/CustomersTab';
import DetailOrderFormTab from './components/DetailOrderFormTab';
import MaterialRequirementPlanning from './components/MaterialRequirementPlanning';
import CRMTab from './components/CRMTab';
import CarpenterReportsTab from './components/CarpenterReportsTab';
import WoodManagementTab from './components/WoodManagementTab';
import CarpenterProfileDashboard from './components/CarpenterProfileDashboard';
import { hasPermission, getDefaultTabForRole, getRoleDisplayName } from './permissions.ts';

// Utility icons
import { HardHat, SlidersHorizontal, Settings as SettingsIcon, ShieldCheck, RefreshCw, Check, Loader2, ShieldAlert } from 'lucide-react';

export default function App() {
  // Database store loader state (with local cache load)
  const [db, setDb] = React.useState<AppState>(() => loadState());
  const [currentTab, setCurrentTab] = React.useState<string>('dashboard');
  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(null);
  const [preselectedQuotationId, setPreselectedQuotationId] = React.useState<string | null>(null);
  const [crmAction, setCrmAction] = React.useState<'add-customer' | 'new-quotation' | null>(null);
  const [workOrderDraft, setWorkOrderDraft] = React.useState<any>(null);

  // Active simulated user session (start as null to show login page by default)
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);

  // Firebase connection and sync states
  const [firebaseConnected, setFirebaseConnected] = React.useState<boolean>(false);
  const [firebaseSeeding, setFirebaseSeeding] = React.useState<boolean>(false);
  const [isDeletingOrderId, setIsDeletingOrderId] = React.useState<string | null>(null);

  // Sync with Firestore asynchronously on initialization
  React.useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    async function initializeSync() {
      const authenticated = await authenticateFirebase();
      if (authenticated) {
        setFirebaseConnected(true);
        setFirebaseSeeding(true);
        // Seed if first time setup (empty)
        await seedFirestoreIfEmpty(db);
        setFirebaseSeeding(false);

        // Subscribes to snapshotted real-time database updates
        unsubscribe = syncFirestore(
          (updatedState) => {
            setDb((currentDb) => {
              const nextDb = {
                ...currentDb,
                ...updatedState,
              };
              saveState(nextDb);
              return nextDb;
            });
          },
          (error) => {
            console.error("Firestore sync subscription error:", error);
          }
        );
      }
    }

    initializeSync();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Handle direct url access with centralized RBAC route protection
  React.useEffect(() => {
    const handlePathname = () => {
      const rawPath = window.location.pathname.replace(/^\//, '').toLowerCase().replace(/[-_]/g, '');
      if (!rawPath) return;

      const tabMap: Record<string, string> = {
        carpenterreports: 'carpenter-reports',
        carpenterreport: 'carpenter-reports',
        orders: 'orders',
        detailorderform: 'detail_order_form',
        detailorder: 'detail_order_form',
        woodmanagement: 'wood_management',
        wood: 'wood_management',
        mrp: 'mrp',
        users: 'users',
        settings: 'settings',
        crm: 'crm',
        customers: 'customers',
        createorder: 'create_order',
        calendar: 'calendar',
        dashboard: 'dashboard',
        myorders: 'my_orders',
        profile: 'profile',
      };

      const targetTab = tabMap[rawPath];
      if (targetTab) {
        if (currentUser) {
          if (hasPermission(currentUser.role, targetTab)) {
            setCurrentTab(targetTab);
          } else {
            console.warn(`Direct URL access to ${targetTab} blocked for role ${currentUser.role}`);
            setCurrentTab(getDefaultTabForRole(currentUser.role));
          }
        } else {
          setCurrentTab(targetTab);
        }
      }
    };
    handlePathname();
    window.addEventListener('popstate', handlePathname);
    return () => window.removeEventListener('popstate', handlePathname);
  }, [currentUser]);

  // Enforce route-level and tab-level access control on any state change
  React.useEffect(() => {
    if (currentUser) {
      if (!hasPermission(currentUser.role, currentTab)) {
        console.warn(`Unauthorized tab access '${currentTab}' for role '${currentUser.role}'. Enforcing redirect.`);
        const defaultTab = getDefaultTabForRole(currentUser.role);
        setCurrentTab(defaultTab);
        setSelectedOrderId(null);
      }
    }
  }, [currentUser, currentTab]);

  // Save database shifts on mutations
  const updateDbState = (newDb: AppState) => {
    setDb(newDb);
    saveState(newDb);
  };

  // Wire automatic login bypasses when role-swapping in HUD
  const handleHUDUserSwitch = (user: User) => {
    setCurrentUser(user);
    const defaultTab = getDefaultTabForRole(user.role);
    setCurrentTab(defaultTab);
    setSelectedOrderId(null);
  };

  const [isRestarting, setIsRestarting] = React.useState(false);
  const [restartStage, setRestartStage] = React.useState(-1);

  const handleRestartApp = () => {
    setIsRestarting(true);
    setRestartStage(0);
    
    setTimeout(() => setRestartStage(1), 350);
    setTimeout(() => setRestartStage(2), 700);
    setTimeout(() => setRestartStage(3), 1050);
    setTimeout(() => setRestartStage(4), 1400);
    setTimeout(() => setRestartStage(5), 1750);
    setTimeout(() => {
      window.location.reload();
    }, 2100);
  };

  const handleResetDB = () => {
    if (window.confirm('Reset workshop demo database to factory defaults?')) {
      localStorage.removeItem('bhise_workshop_tracker_db');
      const fresh = loadState();
      setDb(fresh);
      setCurrentUser(fresh.users[0]);
      setCurrentTab('dashboard');
      setSelectedOrderId(null);
      alert('Local database re-seeded successfully.');
    }
  };

  // Simulation viewport helper state (handled in HUD)
  const [simWidth] = React.useState<string>('100%');

  // Trigger login from screen
  const handleLoginSuccess = (matched: User) => {
    const timeString = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const dateString = formatToDDMMYYYY(new Date());
    const updatedUser: User = {
      ...matched,
      last_seen: `Today, ${timeString} (${dateString})`
    };

    saveUserToFirebase(updatedUser).catch((err) => {
      console.error("Failed to update last_seen in Firestore:", err);
    });

    setCurrentUser(updatedUser);
    const defaultTab = getDefaultTabForRole(matched.role);
    setCurrentTab(defaultTab);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentTab('dashboard');
  };

  // Staging CRUD updates actions
  const handleSaveOrder = async (newOrderOrOrders: Order | Order[], newCustomer?: Customer) => {
    const ordersToAdd = Array.isArray(newOrderOrOrders) ? newOrderOrOrders : [newOrderOrOrders];

    const updatedOrders = [...ordersToAdd, ...db.orders];
    let updatedCusts = [...db.customers];
    if (newCustomer) {
      updatedCusts = [newCustomer, ...db.customers];
    }

    let updatedPayments = [...db.payments];
    const newPayments: Payment[] = [];
    const newLogs: StatusLog[] = [];

    const firebasePromises: Promise<any>[] = [];

    ordersToAdd.forEach((newOrder) => {
      if (newOrder.total_amount !== undefined && newOrder.total_amount !== null) {
        const totalAmt = Number(newOrder.total_amount) || 0;
        const advPaid = Number(newOrder.advance_paid) || 0;
        const pid = 'pay_' + Math.random().toString(36).substring(2, 9);
        const paymentRecord: Payment = {
          id: pid,
          order_id: newOrder.id,
          total_amount: totalAmt,
          advance_paid: advPaid,
          balance_due: Math.max(0, totalAmt - advPaid),
          payment_date: newOrder.order_date || new Date().toISOString().split('T')[0],
          payment_mode: 'cash',
          notes: 'Auto-created payment record from Detail Order Form details.',
          created_by: currentUser?.id || 'admin',
          created_at: new Date().toISOString(),
        };
        newPayments.push(paymentRecord);
        firebasePromises.push(savePaymentToFirebase(paymentRecord).catch(err => console.error("Payment save failed:", err)));
      }

      const log: StatusLog = {
        id: 'log_' + Math.random().toString(36).substring(2, 9),
        order_id: newOrder.id,
        stage: 'Pending',
        changed_by: currentUser?.id || 'admin',
        changed_by_name: currentUser?.name || 'Admin',
        changed_by_role: currentUser?.role || 'admin',
        timestamp: new Date().toISOString(),
        note: `Bespoke furniture order registered. Article Code: ${newOrder.article_no}.`,
      };
      newLogs.push(log);
      firebasePromises.push(saveStatusLogToFirebase(log).catch(err => console.error("StatusLog save failed:", err)));
      firebasePromises.push(saveOrderToFirebase(newOrder).catch(err => console.error("Order save failed:", err)));
    });

    if (newCustomer) {
      firebasePromises.push(saveCustomerToFirebase(newCustomer).catch(err => console.error("Customer save failed:", err)));
    }

    updateDbState({
      ...db,
      orders: updatedOrders,
      customers: updatedCusts,
      statusLogs: [...newLogs, ...db.statusLogs],
      payments: [...newPayments, ...db.payments],
    });

    setCurrentTab('orders'); // Jump back to listings tab
    const articleSummary = ordersToAdd.map((o) => o.article_no).join(', ');
    alert(`Success: ${ordersToAdd.length} Work Order(s) registered! Article NO(s): ${articleSummary}`);
  };

  const handleUpdateOrder = (updatedOrder: Order, newLog?: StatusLog) => {
    const freshOrders = db.orders.map((o) => (o.id === updatedOrder.id ? updatedOrder : o));
    let freshLogs = [...db.statusLogs];
    if (newLog) {
      freshLogs = [newLog, ...db.statusLogs];
    }

    updateDbState({
      ...db,
      orders: freshOrders,
      statusLogs: freshLogs,
    });

    // Write to Firestore asynchronously with catch guard
    saveOrderToFirebase(updatedOrder).catch(err => console.error("Failed to update order in Firestore:", err));
    if (newLog) {
      saveStatusLogToFirebase(newLog).catch(err => console.error("Failed to save status log in Firestore:", err));
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    const targetOrder = db.orders.find((o) => o.id === orderId);
    const label = targetOrder?.article_no ? `order ${targetOrder.article_no}` : "this order";
    if (
      !window.confirm(
        `Are you sure you want to cancel and permanently delete ${label}? This will remove it from all sections including all carpenter and polish person workbenches, wood management, and reports. This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setIsDeletingOrderId(orderId);

      // 1. Delete order permanently from Firestore database
      await deleteOrderFromFirebase(orderId);

      // 2. Cascade delete related logs and payments from Firestore
      const logsToDelete = db.statusLogs.filter((l) => l.order_id === orderId);
      const paymentsToDelete = db.payments.filter((p) => p.order_id === orderId);
      await Promise.allSettled([
        ...logsToDelete.map((l) => deleteStatusLogFromFirebase(l.id)),
        ...paymentsToDelete.map((p) => deletePaymentFromFirebase(p.id)),
      ]);

      // 3. Re-fetch fresh Orders, StatusLogs, and Payments directly from the database to ensure synchronization
      const [freshOrders, freshLogs, freshPayments] = await Promise.all([
        fetchOrdersFromFirestore().catch(() => db.orders.filter((o) => o.id !== orderId)),
        fetchStatusLogsFromFirestore().catch(() => db.statusLogs.filter((l) => l.order_id !== orderId)),
        fetchPaymentsFromFirestore().catch(() => db.payments.filter((p) => p.order_id !== orderId)),
      ]);

      // 4. Update UI and local state only after successful database deletion
      updateDbState({
        ...db,
        orders: freshOrders,
        statusLogs: freshLogs,
        payments: freshPayments,
      });
    } catch (error: any) {
      console.error("Failed to delete order from database:", error);
      const message = error?.message || "Failed to permanently delete order from database. Please check your connection and try again.";
      alert(`Error deleting order: ${message}`);
    } finally {
      setIsDeletingOrderId(null);
    }
  };

  const handleSaveCustomerFromDirectory = (cust: Customer, crmCust?: CRMCustomer) => {
    const updatedCustomers = [cust, ...db.customers.filter((c) => c.id !== cust.id)];
    const synthesizedCrm: CRMCustomer = crmCust || {
      id: cust.id,
      name: cust.name,
      phone: cust.phone,
      address: cust.address,
      notes: cust.notes,
      preferredContactMethod: cust.whatsapp_opt_in ? 'WhatsApp' : 'Phone',
      source: 'Walkin',
      status: 'New Inquiry',
      created_at: cust.created_at || new Date().toISOString(),
      created_by: cust.created_by || currentUser?.name || 'Admin',
    };
    const updatedCrmCustomers = [synthesizedCrm, ...(db.crmCustomers || []).filter((c) => c.id !== cust.id)];

    updateDbState({
      ...db,
      customers: updatedCustomers,
      crmCustomers: updatedCrmCustomers,
    });

    saveCustomerToFirebase(cust).catch((err) => console.error("Failed saving customer to Firebase:", err));
    saveCRMCustomerToFirebase(synthesizedCrm).catch((err) => console.error("Failed saving CRM customer to Firebase:", err));
  };

  const handleDeleteCustomer = (customerId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this customer profile? This action cannot be undone.")) return;
    const targetId = customerId.trim();
    const updated = db.customers.filter((c) => c.id !== targetId);
    const updatedCrm = (db.crmCustomers || []).filter((c) => c && c.id && c.id.trim() !== targetId);
    updateDbState({
      ...db,
      customers: updated,
      crmCustomers: updatedCrm,
    });
    deleteCustomerFromFirebase(targetId).catch((err) => console.error("Failed deleting customer from Firebase:", err));
    deleteCRMCustomerFromFirebase(targetId).catch((err) => console.error("Failed deleting CRM customer from Firebase:", err));
  };

  const handleAddPayment = (payment: Payment) => {
    const existsIdx = db.payments.findIndex(p => p.id === payment.id || p.order_id === payment.order_id);
    let updatedPayments = [...db.payments];
    if (existsIdx > -1) {
      updatedPayments[existsIdx] = payment;
    } else {
      updatedPayments.push(payment);
    }
    updateDbState({
      ...db,
      payments: updatedPayments,
    });

    // Write to Firestore asynchronously
    savePaymentToFirebase(payment);
  };

  const handleAddUser = (newUser: User) => {
    const updatedUsers = [...db.users, newUser];
    updateDbState({
      ...db,
      users: updatedUsers,
    });

    // Write to Firestore asynchronously
    saveUserToFirebase(newUser);
  };

  const handleUpdateUser = (updatedUser: User) => {
    const updatedUsers = db.users.map((u) => (u.id === updatedUser.id ? updatedUser : u));
    updateDbState({
      ...db,
      users: updatedUsers,
    });

    // Check if updating currently simulated user
    if (currentUser && currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }

    // Write to Firestore asynchronously
    saveUserToFirebase(updatedUser);
  };

  const handleDeleteUser = (userId: string) => {
    const updatedUsers = db.users.filter((u) => u.id !== userId);
    updateDbState({
      ...db,
      users: updatedUsers,
    });

    // Logout if user deletes their own current session account
    if (currentUser && currentUser.id === userId) {
      handleLogout();
    }

    deleteUserFromFirebase(userId).catch(console.error);
  };

  // CRM CRUD State Handlers
  const handleSaveCRMCustomer = (cust: CRMCustomer) => {
    const exists = db.crmCustomers.some(c => c.id === cust.id);
    const updated = exists 
      ? db.crmCustomers.map(c => c.id === cust.id ? cust : c)
      : [cust, ...db.crmCustomers];

    // Synchronize customer directory
    const synthesizedCust: Customer = {
      id: cust.id,
      name: cust.name,
      phone: cust.phone,
      address: [cust.address, cust.city, cust.state, cust.pinCode].filter(Boolean).join(', ') || cust.address,
      notes: cust.notes || (cust.productRequirement ? `Requirement: ${cust.productRequirement}` : undefined),
      whatsapp_opt_in: cust.preferredContactMethod === 'WhatsApp' || Boolean(cust.whatsappNumber),
      created_at: cust.created_at || new Date().toISOString(),
      created_by: cust.created_by || currentUser?.name || 'Admin',
    };
    const updatedCustomers = [synthesizedCust, ...db.customers.filter(c => c.id !== cust.id)];

    updateDbState({ 
      ...db, 
      crmCustomers: updated,
      customers: updatedCustomers,
    });

    saveCRMCustomerToFirebase(cust).catch((err) => console.error("Failed saving CRM customer to Firebase:", err));
    saveCustomerToFirebase(synthesizedCust).catch((err) => console.error("Failed syncing customer to Firebase:", err));
  };

  const handleDeleteCRMCustomer = async (id: string) => {
    if (!id) return;
    const targetId = id.trim();
    const updated = (db.crmCustomers || []).filter(c => c && c.id && c.id.trim() !== targetId);
    const updatedCust = db.customers.filter((c) => c.id !== targetId);
    updateDbState({ 
      ...db, 
      crmCustomers: updated,
      customers: updatedCust,
    });
    if (targetId) {
      deleteCRMCustomerFromFirebase(targetId).catch((err) => console.error("Failed to delete CRM customer from Firebase:", err));
      deleteCustomerFromFirebase(targetId).catch((err) => console.error("Failed to delete Customer from Firebase:", err));
    }
  };

  const handleSaveCRMQuotation = (quote: CRMQuotation) => {
    const exists = db.crmQuotations.some(q => q.id === quote.id);
    const updated = exists
      ? db.crmQuotations.map(q => q.id === quote.id ? quote : q)
      : [quote, ...db.crmQuotations];
    updateDbState({ ...db, crmQuotations: updated });
    saveCRMQuotationToFirebase(quote).catch((err) => console.error("Failed saving quotation to Firebase:", err));
  };

  const handleDeleteCRMQuotation = (id: string) => {
    const updated = db.crmQuotations.filter(q => q.id !== id && q.id && q.id.trim() !== '' && (q.customer_name?.trim() || (q.items && q.items.length > 0)));
    updateDbState({ ...db, crmQuotations: updated });
    if (id && id.trim()) {
      deleteCRMQuotationFromFirebase(id);
    }
  };

  const handleSaveCRMFollowUp = (item: CRMFollowUp) => {
    const exists = db.crmFollowUps.some(f => f.id === item.id);
    const updated = exists
      ? db.crmFollowUps.map(f => f.id === item.id ? item : f)
      : [item, ...db.crmFollowUps];
    updateDbState({ ...db, crmFollowUps: updated });
    saveCRMFollowUpToFirebase(item);
  };

  const handleDeleteCRMFollowUp = (id: string) => {
    const updated = db.crmFollowUps.filter(f => f.id !== id);
    updateDbState({ ...db, crmFollowUps: updated });
    deleteCRMFollowUpFromFirebase(id);
  };

  const handleSaveCRMPayment = (item: CRMPayment) => {
    const exists = db.crmPayments.some(p => p.id === item.id);
    const updated = exists
      ? db.crmPayments.map(p => p.id === item.id ? item : p)
      : [item, ...db.crmPayments];
    updateDbState({ ...db, crmPayments: updated });
    saveCRMPaymentToFirebase(item);
  };

  const handleDeleteCRMPayment = (id: string) => {
    const updated = db.crmPayments.filter(p => p.id !== id);
    updateDbState({ ...db, crmPayments: updated });
    deleteCRMPaymentFromFirebase(id);
  };

  const handleSaveCRMNote = (item: CRMNote) => {
    const exists = db.crmNotes.some(n => n.id === item.id);
    const updated = exists
      ? db.crmNotes.map(n => n.id === item.id ? item : n)
      : [item, ...db.crmNotes];
    updateDbState({ ...db, crmNotes: updated });
    saveCRMNoteToFirebase(item);
  };

  const handleDeleteCRMNote = (id: string) => {
    const updated = db.crmNotes.filter(n => n.id !== id);
    updateDbState({ ...db, crmNotes: updated });
    deleteCRMNoteFromFirebase(id);
  };

  const handleSaveCRMAttachment = (item: CRMAttachment) => {
    const exists = db.crmAttachments.some(a => a.id === item.id);
    const updated = exists
      ? db.crmAttachments.map(a => a.id === item.id ? item : a)
      : [item, ...db.crmAttachments];
    updateDbState({ ...db, crmAttachments: updated });
    saveCRMAttachmentToFirebase(item);
  };

  const handleDeleteCRMAttachment = (id: string) => {
    const updated = db.crmAttachments.filter(a => a.id !== id);
    updateDbState({ ...db, crmAttachments: updated });
    deleteCRMAttachmentFromFirebase(id);
  };

  const handleSaveCRMTimelineEvent = (item: CRMTimelineEvent) => {
    const exists = db.crmTimelineEvents.some(e => e.id === item.id);
    const updated = exists
      ? db.crmTimelineEvents.map(e => e.id === item.id ? item : e)
      : [item, ...db.crmTimelineEvents];
    updateDbState({ ...db, crmTimelineEvents: updated });
    saveCRMTimelineEventToFirebase(item);
  };

  // Nav to specific order details tab
  const handleViewOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setCurrentTab('order_details');
  };

  // Production Flag to show/hide Sandbox Simulation controls
  const SHOW_DEBUG_HUD = false;

  // If logged out entirely, render promotional Login Screen
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-stone-100/50 relative">
        {SHOW_DEBUG_HUD && (
          <SimulationHUD
            users={db.users}
            currentUser={null}
            onUserChange={handleHUDUserSwitch}
            onReset={handleResetDB}
          />
        )}
        <div className="mx-auto transition-all" style={{ maxWidth: simWidth }}>
          <LoginScreen onLoginSuccess={handleLoginSuccess} users={db.users} />
        </div>
      </div>
    );
  }

  const isAdmin = currentUser.role === 'admin';
  const isManager = currentUser.role === 'manager';

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col relative transition-all duration-300">
      
      {isRestarting && (
        <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl border border-stone-200 p-6 shadow-2xl space-y-6 text-left">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 text-[#593622] p-2.5 rounded-xl flex items-center justify-center">
                <RefreshCw size={20} className="animate-spin text-[#593622]" />
              </div>
              <div>
                <h3 className="font-extrabold text-stone-900 text-sm uppercase tracking-wider">Restarting Workspace</h3>
                <p className="text-stone-500 text-[11px]">Re-initializing environment state and cache pipelines...</p>
              </div>
            </div>
            
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className={restartStage >= 1 ? "text-[#593622]" : "text-stone-400"}>
                  Dashboard (Overview of active orders, workers, & workshop)
                </span>
                {restartStage > 1 ? (
                  <Check size={14} className="text-green-600 font-extrabold" />
                ) : restartStage === 1 ? (
                  <Loader2 size={14} className="animate-spin text-[#593622]" />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full border border-stone-300" />
                )}
              </div>

              <div className="flex items-center justify-between text-xs font-semibold">
                <span className={restartStage >= 2 ? "text-[#593622]" : "text-stone-400"}>
                  Financial Ledger Overview
                </span>
                {restartStage > 2 ? (
                  <Check size={14} className="text-green-600 font-extrabold" />
                ) : restartStage === 2 ? (
                  <Loader2 size={14} className="animate-spin text-[#593622]" />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full border border-stone-300" />
                )}
              </div>

              <div className="flex items-center justify-between text-xs font-semibold">
                <span className={restartStage >= 3 ? "text-[#593622]" : "text-stone-400"}>
                  Bespoke CRM (Lead funnels & quotations)
                </span>
                {restartStage > 3 ? (
                  <Check size={14} className="text-green-600 font-extrabold" />
                ) : restartStage === 3 ? (
                  <Loader2 size={14} className="animate-spin text-[#593622]" />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full border border-stone-300" />
                )}
              </div>

              <div className="flex items-center justify-between text-xs font-semibold">
                <span className={restartStage >= 4 ? "text-[#593622]" : "text-stone-400"}>
                  Orders Pipeline
                </span>
                {restartStage > 4 ? (
                  <Check size={14} className="text-green-600 font-extrabold" />
                ) : restartStage === 4 ? (
                  <Loader2 size={14} className="animate-spin text-[#593622]" />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full border border-stone-300" />
                )}
              </div>

              <div className="flex items-center justify-between text-xs font-semibold">
                <span className={restartStage >= 5 ? "text-[#593622]" : "text-stone-400"}>
                  Customer Directory
                </span>
                {restartStage > 5 ? (
                  <Check size={14} className="text-green-600 font-extrabold" />
                ) : restartStage === 5 ? (
                  <Loader2 size={14} className="animate-spin text-[#593622]" />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full border border-stone-300" />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Simulation HUD (Sandbox Controls) */}
      {SHOW_DEBUG_HUD && (
        <SimulationHUD
          users={db.users}
          currentUser={currentUser}
          onUserChange={handleHUDUserSwitch}
          onReset={handleResetDB}
        />
      )}

      {/* Main Sandbox limits wrapper */}
      <div className="mx-auto w-full transition-all duration-300 flex-1 flex flex-col lg:flex-row" style={{ maxWidth: simWidth }}>
        
        {/* Responsive Side Menu Drawer */}
        <Sidebar
          currentUser={currentUser}
          currentTab={currentTab}
          onTabChange={(tab) => {
            setSelectedOrderId(null);
            setCurrentTab(tab);
          }}
          onLogout={handleLogout}
          notificationsCount={db.orders.filter(o => o.current_status === 'Pending').length}
        />

        {/* Dynamic Inner Application Page Canvas */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto pb-20 lg:pb-8">
          
          {/* Workshop Live Status Feed Header Row */}
          {currentTab !== 'profile' && (
            <div className="flex justify-between items-center bg-white border border-stone-200/80 rounded-2xl p-4 mb-6 shadow-xs gap-4 workshop-live-feed-header print:hidden">
              <div className="flex items-center gap-3 min-w-0">
                <div className="bg-amber-100 text-[#593622] p-2.5 rounded-xl hidden sm:flex items-center justify-center">
                  <ShieldCheck size={20} className="stroke-[2.5]" />
                </div>
                <div className="min-w-0 text-left">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-extrabold text-[#593622] text-xs uppercase tracking-wider leading-none">Workshop Live Feed</h4>
                    {firebaseConnected && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold font-mono tracking-wider uppercase bg-green-500/10 text-green-700 border border-green-500/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                        {firebaseSeeding ? "Seeding..." : "Cloud Sync Live"}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1 truncate">
                    Poller active: Monitoring assignments for <span className="font-semibold text-stone-800">{currentUser.name}</span> ({currentUser.role.replace('_', ' ')})
                  </p>
                </div>
              </div>
              
              <div className="shrink-0 flex items-center gap-3">
                <button
                  onClick={handleRestartApp}
                  title="Restart App"
                  className="bg-stone-50 border border-stone-200 hover:bg-stone-100 hover:text-[#593622] text-stone-600 p-2.5 rounded-xl flex items-center justify-center transition cursor-pointer shadow-2xs"
                >
                  <RefreshCw size={16} className="stroke-[2.5]" />
                </button>
                <NotificationCenter
                  orders={db.orders}
                  currentUser={currentUser}
                  users={db.users}
                  onViewOrder={handleViewOrder}
                  onUpdateOrder={handleUpdateOrder}
                />
              </div>
            </div>
          )}

          {/* TAB: DASHBOARD VIEW (Admin Only) */}
          {currentTab === 'dashboard' && hasPermission(currentUser.role, 'dashboard') && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <DashboardTab
                orders={db.orders}
                users={db.users}
                customers={db.customers}
                payments={db.payments}
                crmQuotations={db.crmQuotations}
                crmPayments={db.crmPayments}
                onNavigateTab={(tab) => setCurrentTab(tab)}
                onViewOrder={handleViewOrder}
                onQuickCrmAction={(action) => {
                  setCrmAction(action);
                  setCurrentTab('crm');
                }}
              />
            </motion.div>
          )}

          {/* TAB: CRM MODULE TAB (Admin Only) */}
          {currentTab === 'crm' && hasPermission(currentUser.role, 'crm') && (
            <motion.div
              key="crm"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <CRMTab
                db={db}
                onSaveCRMCustomer={handleSaveCRMCustomer}
                onDeleteCRMCustomer={handleDeleteCRMCustomer}
                onSaveCRMQuotation={handleSaveCRMQuotation}
                onDeleteCRMQuotation={handleDeleteCRMQuotation}
                onSaveCRMFollowUp={handleSaveCRMFollowUp}
                onDeleteCRMFollowUp={handleDeleteCRMFollowUp}
                onSaveCRMPayment={handleSaveCRMPayment}
                onDeleteCRMPayment={handleDeleteCRMPayment}
                onSaveCRMNote={handleSaveCRMNote}
                onDeleteCRMNote={handleDeleteCRMNote}
                onSaveCRMAttachment={handleSaveCRMAttachment}
                onDeleteCRMAttachment={handleDeleteCRMAttachment}
                onSaveCRMTimelineEvent={handleSaveCRMTimelineEvent}
                onSaveOrder={handleSaveOrder}
                currentUser={currentUser}
                users={db.users}
                onApproveQuotation={(quote) => {
                  setPreselectedQuotationId(quote.id);
                  setCurrentTab('detail_order_form');
                }}
                crmAction={crmAction}
                onResetCrmAction={() => setCrmAction(null)}
              />
            </motion.div>
          )}

          {/* TAB: ORDERS DIRECTORY LISTINGS (Admin & Manager) */}
          {currentTab === 'orders' && hasPermission(currentUser.role, 'orders') && (
            <motion.div
              key="orders"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <OrdersTab
                orders={db.orders}
                users={db.users}
                customers={db.customers}
                payments={db.payments}
                onViewOrder={handleViewOrder}
                onNavigateTab={(tab) => setCurrentTab(tab)}
                isAdmin={isAdmin}
                onDeleteOrder={handleDeleteOrder}
                isDeletingOrderId={isDeletingOrderId}
              />
            </motion.div>
          )}

          {/* TAB: CUSTOMER PROFILES PIPELINES & HISTORY (Admin Only) */}
          {currentTab === 'customers' && hasPermission(currentUser.role, 'customers') && (
            <motion.div
              key="customers"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <CustomersTab
                orders={db.orders}
                customers={db.customers}
                payments={db.payments}
                users={db.users}
                onViewOrder={handleViewOrder}
                crmQuotations={db.crmQuotations}
                onDeleteCustomer={handleDeleteCustomer}
                onSaveCustomer={handleSaveCustomerFromDirectory}
                currentUser={currentUser}
                onNavigateTab={(tab) => setCurrentTab(tab as any)}
              />
            </motion.div>
          )}
          {/* TAB: WOOD MANAGEMENT REQUIREMENT REQUESTS (Admin & Wood Tab Manager) */}
          {currentTab === 'wood_management' && hasPermission(currentUser.role, 'wood_management') && (
            <motion.div
              key="wood_management"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <WoodManagementTab
                orders={db.orders}
                customers={db.customers}
                onOrderUpdate={handleUpdateOrder}
              />
            </motion.div>
          )}

          {/* TAB: CREATE NEW CUSTOM SERIAL ORDER (Wizard Form, Admin Only) */}
          {currentTab === 'create_order' && hasPermission(currentUser.role, 'create_order') && (
            <motion.div
              key="create_order"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
               <OrderForm
                orders={db.orders}
                users={db.users}
                customers={db.customers}
                onSave={(newOrder, newCustomer) => {
                  handleSaveOrder(newOrder, newCustomer);
                  setWorkOrderDraft(null);
                }}
                onCancel={() => {
                  setWorkOrderDraft(null);
                  setCurrentTab('orders');
                }}
                initialDraft={workOrderDraft}
                onClearDraft={() => setWorkOrderDraft(null)}
              />
            </motion.div>
          )}

          {/* TAB: CALENDAR DEADLINES TRACKING (Admin Only) */}
          {currentTab === 'calendar' && hasPermission(currentUser.role, 'calendar') && (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <CalendarTab
                orders={db.orders}
                customers={db.customers}
                onViewOrder={handleViewOrder}
                onNavigateTab={(tab) => setCurrentTab(tab)}
              />
            </motion.div>
          )}

          {/* TAB: TEAM MEMBERS DIRECTORY ROSTERS (Admin Only) */}
          {currentTab === 'users' && hasPermission(currentUser.role, 'users') && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <UsersTab
                users={db.users}
                onAddUser={handleAddUser}
                onUpdateUser={handleUpdateUser}
                onDeleteUser={handleDeleteUser}
                currentUser={currentUser}
              />
            </motion.div>
          )}

          {/* TAB: CARPENTER REPORTS VIEW (Admin & Manager) */}
          {currentTab === 'carpenter-reports' && hasPermission(currentUser.role, 'carpenter-reports') && (
            <motion.div
              key="carpenter-reports"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="space-y-6"
            >
              <CarpenterReportsTab db={db} currentUser={currentUser!} />
            </motion.div>
          )}

          {/* TAB: SETTINGS & PARAMETERS (Simulated, Admin Only) */}
          {currentTab === 'settings' && hasPermission(currentUser.role, 'settings') && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="space-y-6 font-sans"
            >
              <div>
                <h1 className="text-2xl font-black text-stone-900 tracking-tight font-display">Staging Settings</h1>
                <p className="text-stone-500 text-xs">Configure custom furniture category templates and alert thresholds</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-stone-200 space-y-4">
                <strong className="text-stone-850 text-xs block font-bold uppercase tracking-wider">SMS & WhatsApp Alerts Gateway</strong>
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div>
                      <strong className="block text-stone-800 text-xs">On creation: Send welcome link</strong>
                      <span className="text-[10px] text-stone-400 block font-normal">Triggers private tracking URL automatically on WhatsApp</span>
                    </div>
                    <span className="h-5 w-9 bg-green-500 rounded-full flex items-center px-1 font-bold"><span className="h-4.5 w-4.5 bg-white rounded-full ml-auto" /></span>
                  </div>
                  <div className="flex items-center justify-between border-b pb-2">
                    <div>
                      <strong className="block text-stone-800 text-xs">On QC Failure: Alert technician</strong>
                      <span className="text-[10px] text-stone-400 block font-normal">Sends immediate SMS alerts to assigned carpenters containing notes</span>
                    </div>
                    <span className="h-5 w-9 bg-green-500 rounded-full flex items-center px-1 font-bold"><span className="h-4.5 w-4.5 bg-white rounded-full ml-auto" /></span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-stone-200 space-y-4">
                <strong className="text-[#593622] text-xs block font-extrabold uppercase tracking-wider">System Control & Refresh</strong>
                <p className="text-stone-500 text-xs">
                  Reload the application engine and reinitialize all primary interface modules, live feeds, and caches.
                </p>
                <div className="pt-2">
                  <button
                    onClick={handleRestartApp}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#593622] hover:bg-[#402414] active:scale-[0.98] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs transition cursor-pointer"
                  >
                    <RefreshCw size={13} className="animate-spin-slow" />
                    Restart App
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB: DETAIL ORDER FORM (Admin & Manager) */}
          {currentTab === 'detail_order_form' && hasPermission(currentUser.role, 'detail_order_form') && (
            <motion.div
              key="detail_order_form"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <DetailOrderFormTab
                orders={db.orders}
                customers={db.customers}
                users={db.users}
                payments={db.payments}
                crmQuotations={db.crmQuotations}
                crmCustomers={db.crmCustomers}
                crmAttachments={db.crmAttachments}
                preselectedQuotationId={preselectedQuotationId}
                onClearPreselectedQuotation={() => setPreselectedQuotationId(null)}
                onSendToWorkOrder={(draft) => {
                  setWorkOrderDraft(draft);
                  setCurrentTab('create_order');
                }}
              />
            </motion.div>
          )}

          {/* TAB: MATERIAL REQUIREMENT PLANNING (MRP) (Admin Only) */}
          {currentTab === 'mrp' && hasPermission(currentUser.role, 'mrp') && (
            <motion.div
              key="mrp"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <MaterialRequirementPlanning
                selectedOrderId={selectedOrderId || ''}
                orders={db.orders}
                customers={db.customers}
                onOrderUpdate={handleUpdateOrder}
              />
            </motion.div>
          )}

          {/* TAB: WORKER ASSIGNED WORKBENCH (Carpenter, Polish Person, QC Staff) */}
          {currentTab === 'my_orders' && hasPermission(currentUser.role, 'my_orders') && (
            <motion.div
              key="my_orders"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <WorkerDashboard
                currentUser={currentUser}
                orders={db.orders}
                customers={db.customers}
                statusLogs={db.statusLogs}
                onUpdateOrder={handleUpdateOrder}
              />
            </motion.div>
          )}

          {/* TAB: PROFILE PAGE (Carpenter / Worker Profile Dashboard) */}
          {currentTab === 'profile' && hasPermission(currentUser.role, 'profile') && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <CarpenterProfileDashboard
                currentUser={currentUser}
                users={db.users}
                orders={db.orders}
                customers={db.customers}
                statusLogs={db.statusLogs}
                onRefresh={() => {
                  syncFirestore(
                    (remoteData) => {
                      setDb((prev) => ({ ...prev, ...remoteData }));
                    },
                    (err) => console.error(err)
                  );
                }}
              />
            </motion.div>
          )}

          {/* SUB-VIEW TAB: FULL SPEC SHEET & DETAILS */}
          {currentTab === 'order_details' && selectedOrderId && hasPermission(currentUser.role, 'order_details') && (
            <motion.div
              key="order_details"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <OrderDetailsView
                orderId={selectedOrderId}
                orders={db.orders}
                users={db.users}
                customers={db.customers}
                statusLogs={db.statusLogs}
                payments={db.payments}
                onBack={() => {
                  setSelectedOrderId(null);
                  setCurrentTab(getDefaultTabForRole(currentUser.role));
                }}
                onUpdateOrder={handleUpdateOrder}
                onAddPayment={handleAddPayment}
                currentUser={currentUser}
              />
            </motion.div>
          )}

          {/* FALLBACK / ACCESS DENIED SCREEN */}
          {!hasPermission(currentUser.role, currentTab) && currentTab !== 'order_details' && (
            <motion.div
              key="access_denied"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl border border-rose-200 p-8 text-center space-y-4 max-w-lg mx-auto my-12 shadow-sm"
            >
              <div className="h-14 w-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
                <ShieldAlert size={28} />
              </div>
              <div>
                <h3 className="text-lg font-black text-stone-900 font-display">Access Restricted</h3>
                <p className="text-stone-500 text-xs mt-1">
                  Your role (<strong className="text-stone-800 uppercase">{getRoleDisplayName(currentUser.role)}</strong>) does not have permission to access the requested module.
                </p>
              </div>
              <button
                onClick={() => setCurrentTab(getDefaultTabForRole(currentUser.role))}
                className="bg-[#593622] hover:bg-[#402414] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow transition cursor-pointer"
              >
                Go to Authorized Workspace
              </button>
            </motion.div>
          )}

        </main>
      </div>
    </div>
  );
}
