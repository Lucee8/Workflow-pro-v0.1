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
  saveCustomerToFirebase,
  saveStatusLogToFirebase,
  savePaymentToFirebase,
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
import UsersTab from './components/UsersTab';
import WorkerDashboard from './components/WorkerDashboard';
import NotificationCenter from './components/NotificationCenter';
import CustomersTab from './components/CustomersTab';
import DetailOrderFormTab from './components/DetailOrderFormTab';
import MaterialRequirementPlanning from './components/MaterialRequirementPlanning';
import CRMTab from './components/CRMTab';

// Utility icons
import { HardHat, SlidersHorizontal, Settings as SettingsIcon, ShieldCheck } from 'lucide-react';

export default function App() {
  // Database store loader state (with local cache load)
  const [db, setDb] = React.useState<AppState>(() => loadState());
  const [currentTab, setCurrentTab] = React.useState<string>('dashboard');
  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(null);
  const [preselectedQuotationId, setPreselectedQuotationId] = React.useState<string | null>(null);
  const [workOrderDraft, setWorkOrderDraft] = React.useState<any>(null);

  // Active simulated user session (start as null to show login page by default)
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);

  // Firebase connection and sync states
  const [firebaseConnected, setFirebaseConnected] = React.useState<boolean>(false);
  const [firebaseSeeding, setFirebaseSeeding] = React.useState<boolean>(false);

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

  // Save database shifts on mutations
  const updateDbState = (newDb: AppState) => {
    setDb(newDb);
    saveState(newDb);
  };

  // Wire automatic login bypasses when role-swapping in HUD
  const handleHUDUserSwitch = (user: User) => {
    setCurrentUser(user);
    // Automatically navigate to correct tab
    if (user.role === 'admin') {
      setCurrentTab('dashboard');
    } else {
      setCurrentTab('my_orders');
    }
    setSelectedOrderId(null);
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
    const dateString = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    const updatedUser: User = {
      ...matched,
      last_seen: `Today, ${timeString} (${dateString})`
    };

    saveUserToFirebase(updatedUser).catch((err) => {
      console.error("Failed to update last_seen in Firestore:", err);
    });

    setCurrentUser(updatedUser);
    if (matched.role === 'admin') {
      setCurrentTab('dashboard');
    } else {
      setCurrentTab('my_orders');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentTab('dashboard');
  };

  // Staging CRUD updates actions
  const handleSaveOrder = (newOrder: Order, newCustomer?: Customer) => {
    const updatedOrders = [newOrder, ...db.orders];
    let updatedCusts = [...db.customers];
    if (newCustomer) {
      updatedCusts = [newCustomer, ...db.customers];
    }

    // Auto log creations phase
    const log: StatusLog = {
      id: 'log_' + Math.random().toString(36).substring(2, 9),
      order_id: newOrder.id,
      stage: 'Pending',
      changed_by: currentUser?.id || 'admin',
      changed_by_name: currentUser?.name || 'Admin',
      changed_by_role: currentUser?.role || 'admin',
      timestamp: new Date().toISOString(),
      note: `Bespoke furniture order registered. Previewing Article Code: ${newOrder.article_no}.`,
    };

    const updatedLogs = [log, ...db.statusLogs];

    updateDbState({
      ...db,
      orders: updatedOrders,
      customers: updatedCusts,
      statusLogs: updatedLogs,
    });

    // Write to Firestore asynchronously
    saveOrderToFirebase(newOrder);
    if (newCustomer) {
      saveCustomerToFirebase(newCustomer);
    }
    saveStatusLogToFirebase(log);

    setCurrentTab('orders'); // Jump back to listings tab
    alert(`Success: Order registered! Article NO is ${newOrder.article_no}`);
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

    // Write to Firestore asynchronously
    saveOrderToFirebase(updatedOrder);
    if (newLog) {
      saveStatusLogToFirebase(newLog);
    }
  };

  const handleDeleteOrder = (orderId: string) => {
    if (!window.confirm("Are you sure you want to cancel and permanently delete this order? This action cannot be undone.")) return;
    const updated = db.orders.filter((o) => o.id !== orderId);
    updateDbState({
      ...db,
      orders: updated
    });
    deleteOrderFromFirebase(orderId);
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
    updateDbState({ ...db, crmCustomers: updated });
    saveCRMCustomerToFirebase(cust);
  };

  const handleDeleteCRMCustomer = (id: string) => {
    const updated = db.crmCustomers.filter(c => c.id !== id);
    updateDbState({ ...db, crmCustomers: updated });
    deleteCRMCustomerFromFirebase(id);
  };

  const handleSaveCRMQuotation = (quote: CRMQuotation) => {
    const exists = db.crmQuotations.some(q => q.id === quote.id);
    const updated = exists
      ? db.crmQuotations.map(q => q.id === quote.id ? quote : q)
      : [quote, ...db.crmQuotations];
    updateDbState({ ...db, crmQuotations: updated });
    saveCRMQuotationToFirebase(quote);
  };

  const handleDeleteCRMQuotation = (id: string) => {
    const updated = db.crmQuotations.filter(q => q.id !== id);
    updateDbState({ ...db, crmQuotations: updated });
    deleteCRMQuotationFromFirebase(id);
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
            
            <div className="shrink-0">
              <NotificationCenter
                orders={db.orders}
                currentUser={currentUser}
                users={db.users}
                onViewOrder={handleViewOrder}
                onUpdateOrder={handleUpdateOrder}
              />
            </div>
          </div>

          {/* TAB: DASHBOARD VIEW (Admin Only) */}
          {currentTab === 'dashboard' && isAdmin && (
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
                onNavigateTab={(tab) => setCurrentTab(tab)}
                onViewOrder={handleViewOrder}
              />
            </motion.div>
          )}

          {/* TAB: CRM MODULE TAB (Admin & Manager Only) */}
          {currentTab === 'crm' && (isAdmin || isManager) && (
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
              />
            </motion.div>
          )}

          {/* TAB: ORDERS DIRECTORY LISTINGS (Admin Only) */}
          {currentTab === 'orders' && isAdmin && (
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
              />
            </motion.div>
          )}

          {/* TAB: CUSTOMER PROFILES PIPELINES & HISTORY (Admin Only) */}
          {currentTab === 'customers' && isAdmin && (
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
              />
            </motion.div>
          )}

          {/* TAB: CREATE NEW CUSTOM SERIAL ORDER (Wizard Form, Admin Only) */}
          {currentTab === 'create_order' && isAdmin && (
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
          {currentTab === 'calendar' && isAdmin && (
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
          {currentTab === 'users' && isAdmin && (
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

          {/* TAB: REPORTS GRAPHS VIEW (Simulated, Admin Only) */}
          {currentTab === 'reports' && isAdmin && (
            <motion.div
              key="reports"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-2xl font-black text-stone-900 tracking-tight font-display">Workshop Reports</h1>
                <p className="text-stone-500 text-xs">Deep dive monthly volume logs and staff workload capacities</p>
              </div>
              <div className="bg-white p-12 text-center rounded-2xl border border-stone-200">
                <SlidersHorizontal size={28} className="mx-auto text-stone-300 mb-2" />
                <p className="text-xs font-bold text-stone-550">Analytical dashboards are loaded automatically inside the workshop database.</p>
                <button onClick={() => setCurrentTab('dashboard')} className="mt-4 px-4 py-1.5 bg-[#593622] hover:bg-[#402414] text-white font-bold text-xs rounded-xl">
                  Go back to Dashboard
                </button>
              </div>
            </motion.div>
          )}

          {/* TAB: SETTINGS & PARAMETERS (Simulated, Admin Only) */}
          {currentTab === 'settings' && isAdmin && (
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
            </motion.div>
          )}

          {/* TAB: DETAIL ORDER FORM (Admin Only) */}
          {currentTab === 'detail_order_form' && isAdmin && (
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
          {currentTab === 'mrp' && isAdmin && (
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

          {/* TAB: WORKER ASSIGNED WORKBENCH (Carpenter or Polish Person Only) */}
          {currentTab === 'my_orders' && !isAdmin && (
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

          {/* TAB: PROFILE PAGE (Carpenter or Polish Person Only) */}
          {currentTab === 'profile' && !isAdmin && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-2xl font-black text-stone-900 tracking-tight font-display">My Team Member Settings</h1>
                <p className="text-stone-500 text-xs">Review personal workload, telephone details, and workshop credentials</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-stone-250 max-w-sm space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-amber-500 font-extrabold text-[#1a110a] text-sm tracking-wide rounded-full flex items-center justify-center">
                    {currentUser.initials}
                  </div>
                  <div>
                    <strong className="text-stone-900 text-xs text-sm block font-bold">{currentUser.name}</strong>
                    <span className="text-[10px] uppercase font-mono text-stone-450 block font-black">{currentUser.role.replace('_', ' ')}</span>
                  </div>
                </div>
                <div className="text-xs space-y-1 text-stone-500 border-t pt-3 font-sans">
                  <div className="flex justify-between">
                    <span>Active Level:</span>
                    <strong className="text-green-600">ACTIVE</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Contact Line:</span>
                    <strong className="text-stone-800">{currentUser.phone || '—'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Assigned Serial initials:</span>
                    <strong className="text-stone-900 font-mono">{currentUser.initials}</strong>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* SUB-VIEW TAB (Admin Only / Deep view): FULL SPEC SHEET & DETAILS */}
          {currentTab === 'order_details' && selectedOrderId && (
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
                  setCurrentTab(isAdmin ? 'orders' : 'my_orders');
                }}
                onUpdateOrder={handleUpdateOrder}
                onAddPayment={handleAddPayment}
                currentUser={currentUser}
              />
            </motion.div>
          )}

        </main>
      </div>
    </div>
  );
}
